// --- START OF FILE BuildingSystem.js ---

class BuildingSystem {
    constructor(game) {
        this.game = game;

        // Building components from Constants
        this.buildingComponents = Constants.BUILDING.COMPONENTS;
        if (!this.buildingComponents || !Array.isArray(this.buildingComponents)) {
            console.error("FATAL: Constants.BUILDING.COMPONENTS is missing or invalid!");
            this.buildingComponents = []; // Prevent errors later
        }

        // List of all placed buildings in the world
        this.buildings = []; // Stores { id, type, buildingType, position, rotation, health, maxHealth, meshes, resources }

        // Snapping distance from Constants
        this.snapDistance = Constants.BUILDING.SNAP_DISTANCE || 0.5;

        // Grid size for snapping (usually foundation size) from Constants
        this.gridSize = Constants.BUILDING.GRID_SIZE || 4;
    }

    // Get all defined building component types
    getBuildingComponents() {
        return this.buildingComponents;
    }

    // Get a specific building component definition by its ID
    getBuildingComponent(componentId) {
        return this.buildingComponents.find(comp => comp && comp.id === componentId);
    }

    // Check if the player has enough resources in their inventory for a component
    canBuildComponent(componentId) {
        const component = this.getBuildingComponent(componentId);
        if (!component) return false;
        // Delegate the check to the inventory system
        const canAfford = this.game.inventory?.checkResources(component.requirements);
        // console.log(`canBuildComponent (${componentId}): ${canAfford}. Req: ${JSON.stringify(component.requirements)}. Inv Check: ${/* Log inventory counts if needed */}`); // DEBUG
        return canAfford ?? false; // Return false if inventory doesn't exist
    }

    // Create a visual preview mesh for a building component
    createBuildingPreview(componentId) {
        const component = this.getBuildingComponent(componentId);
        if (!component) {
            console.error(`Building component not found: ${componentId}`);
            return null;
        }

        // Get geometry from AssetLoader (should handle cloning)
        let geometry = this.game.assetLoader?.getModel(componentId); // Use optional chaining
        if (!geometry || !(geometry instanceof THREE.BufferGeometry)) { // Check it's valid geometry
            console.error(`Preview geometry for ${componentId} not found or invalid! Using fallback.`);
            geometry = new THREE.BoxGeometry(1, 1, 1); // Fallback cube
            // Attempt to size fallback based on expected size
            const expectedSize = this.getComponentSize(componentId); // Get size even if model failed
            geometry.scale(expectedSize.x, expectedSize.y, expectedSize.z);
        }

        // Create a semi-transparent material for the preview
        const material = new THREE.MeshStandardMaterial({
            color: 0x00ff00, // Default green (valid placement)
            transparent: true,
            opacity: 0.6,    // Make it see-through
            metalness: 0.1,
            roughness: 0.8,
            depthWrite: false // Prevents z-fighting issues
        });

        const previewMesh = new THREE.Mesh(geometry, material);
        previewMesh.name = `preview_${componentId}`; // Add name for debugging
        return previewMesh;
    }

     // Helper to get approximate size of a component based on its geometry
     getComponentSize(componentId) {
        if (!this.game.assetLoader) return new THREE.Vector3(1, 1, 1); // Fallback if assetLoader missing

        const geometryOrObject = this.game.assetLoader.getModel(componentId);
        let size = new THREE.Vector3();

        if (!geometryOrObject) {
            // If model data missing, try getting size from Constants definition (less accurate)
            if (componentId === 'foundation' || componentId === 'ceiling') {
                size.set(this.gridSize, 0.5, this.gridSize); // Use constants
            } else if (componentId === 'wall' || componentId === 'window') {
                size.set(this.gridSize, Constants.BUILDING.WALL_HEIGHT, 0.2); // Use constants
            } else {
                size.set(1, 1, 1); // Absolute fallback
            }
            // console.warn(`Geometry missing for ${componentId}, using estimated size:`, size);
            return size;
        }

        try {
            let targetGeometry = null;
            let objectScale = new THREE.Vector3(1, 1, 1);

            if (geometryOrObject instanceof THREE.BufferGeometry) {
                targetGeometry = geometryOrObject;
            } else if (geometryOrObject instanceof THREE.Mesh) {
                targetGeometry = geometryOrObject.geometry;
                objectScale = geometryOrObject.scale;
            } else if (geometryOrObject instanceof THREE.Group) {
                // For groups, calculate bounding box of the whole group
                 const box = new THREE.Box3().setFromObject(geometryOrObject);
                 box.getSize(size);
                 // Group scale is usually applied internally, so we use the calculated size directly
                 size.x = Math.max(0.1, size.x); size.y = Math.max(0.1, size.y); size.z = Math.max(0.1, size.z);
                 return size;
            } else {
                 console.warn(`Unknown object type for getComponentSize: ${componentId}`);
                 return new THREE.Vector3(1, 1, 1);
            }

            if (targetGeometry && typeof targetGeometry.computeBoundingBox === 'function') {
                targetGeometry.computeBoundingBox();
                if (targetGeometry.boundingBox) {
                    targetGeometry.boundingBox.getSize(size);
                    size.multiply(objectScale); // Apply scale if it was a Mesh
                } else {
                    console.warn(`Failed computeBoundingBox for ${componentId}`);
                    size.set(1, 1, 1); // Fallback
                }
            } else {
                 size.set(1, 1, 1); // Fallback
            }

        } catch (error) {
            console.error(`Error in getComponentSize for ${componentId}:`, error);
            size.set(1, 1, 1); // Fallback on error
        }

        // Return a minimum size to prevent zero dimensions
        size.x = Math.max(0.1, size.x);
        size.y = Math.max(0.1, size.y);
        size.z = Math.max(0.1, size.z);
        return size;
    }

    // Find the most likely snapping point based on raycast hit and nearby buildings
    findSnappingPoint(position, componentId, rotation, hitObject = null) {
        // --- Foundation Grid Snapping (Revised Y calculation) ---
        if (componentId === 'foundation') {
            const snappedX = Math.round(position.x / this.gridSize) * this.gridSize;
            const snappedZ = Math.round(position.z / this.gridSize) * this.gridSize;
            let snappedY;
            const foundationSize = this.getComponentSize('foundation'); // Get size once

            const terrainHeightAtSnap = this.game.terrain?.getHeightAt(snappedX, snappedZ);

            if (terrainHeightAtSnap !== undefined) {
                 snappedY = Math.max(terrainHeightAtSnap, this.game.terrain.waterLevel + 0.05);
                 snappedY += foundationSize.y / 2; // Adjust for center origin
                 // console.log(`Foundation Snap: Grid (${snappedX}, ${snappedZ}), Terrain H: ${terrainHeightAtSnap.toFixed(2)}, Final Y: ${snappedY.toFixed(2)}`); // DEBUG
            } else {
                 // Fallback: Use hit point Y (less reliable for grid snap) + offset
                 snappedY = position.y + foundationSize.y / 2;
                 console.warn(`Foundation Snap: Terrain height failed at (${snappedX}, ${snappedZ}). Using fallback Y.`); // DEBUG
            }

            return new THREE.Vector3(snappedX, snappedY, snappedZ);
        }

        // --- Wall/Ceiling Snapping (Revised Logic) ---
        let closestSnapPoint = position.clone(); // Default to original position if no snap
        let minDistanceSq = this.snapDistance * this.snapDistance;
        let snapped = false;
        let snappedToBuilding = null; // Track which building we snapped to

        // Prioritize snapping to the object directly hit, if applicable
        let hitBuilding = null;
        if (hitObject) {
             let current = hitObject;
             while (current && !hitBuilding) {
                 // Check if the mesh belongs to a building in our list
                 hitBuilding = this.buildings.find(b => b.meshes && b.meshes.includes(current));
                 current = current.parent;
             }
        }
        // console.log("Hit Object belongs to building:", hitBuilding?.id); // DEBUG

        // Iterate through potential target buildings (prioritize hit one)
        const potentialTargets = hitBuilding ? [hitBuilding, ...this.buildings.filter(b => b !== hitBuilding)] : [...this.buildings];

        for (const building of potentialTargets) {
            // Basic checks
            if (!building || !building.meshes || !building.meshes[0] || !building.position || building.health <= 0) continue; // Skip invalid/destroyed

            // Check if this building is a valid snap target type for the component being placed
            let isValidTargetType = false;
            if ((componentId === 'wall' || componentId === 'window') && ['foundation', 'wall', 'window', 'ceiling'].includes(building.buildingType)) isValidTargetType = true;
            if (componentId === 'ceiling' && ['wall', 'window', 'ceiling'].includes(building.buildingType)) isValidTargetType = true;
            // Add rules for other components if necessary
            if (!isValidTargetType) continue;

            // Generate potential snap points ON the existing building
            const snapPoints = this.generateSnapPoints(building, componentId, rotation);
            // console.log(`Checking ${snapPoints.length} snap points on ${building.id} (${building.buildingType})`); // DEBUG

            // Find the closest valid snap point on this building to the cursor position
            for (const pointData of snapPoints) { // generateSnapPoints now returns { position, normal }
                const point = pointData.position;
                const distSq = point.distanceToSquared(position); // Check distance to cursor hit point

                if (distSq < minDistanceSq) {
                    // Basic distance check passed.
                    // Refine check: ensure rotations align reasonably? (Optional for now)
                    // Example: Walls should generally align parallel or perpendicular

                    minDistanceSq = distSq;
                    closestSnapPoint = point.clone(); // Store the position
                    snapped = true;
                    snappedToBuilding = building; // Remember what we snapped to
                    // console.log(`   New best snap point found on ${building.id} at (${point.x.toFixed(1)}, ${point.y.toFixed(1)}, ${point.z.toFixed(1)})`); // DEBUG
                }
            }
            // If we snapped to the building the ray hit, we likely found the best spot
            if (snapped && building === hitBuilding) break;
        }

        // --- Final Position Adjustment ---
        if (snapped && snappedToBuilding) {
             // If snapped, adjust the CENTER position of the new component based on its own size.
             // The 'closestSnapPoint' is the point ON THE SURFACE of the existing building.
             const targetSize = this.getComponentSize(componentId);

             // We need the normal of the surface we snapped to, to offset correctly.
             // For simplicity now, assume snapping happens mostly top/bottom/sides aligned with axes.
             // A more robust solution involves getting the normal from generateSnapPoints or raycasting again.

             // Simplified Adjustment: Assumes snapping primarily happens on top/bottom surfaces
             // This needs to be more sophisticated based on generateSnapPoints results
             if ((componentId === 'wall' || componentId === 'window') && ['foundation', 'ceiling'].includes(snappedToBuilding.buildingType)) {
                 closestSnapPoint.y += targetSize.y / 2; // Wall on top of foundation/ceiling
             } else if (componentId === 'ceiling' && ['wall', 'window'].includes(snappedToBuilding.buildingType)) {
                 closestSnapPoint.y += targetSize.y / 2; // Ceiling on top of wall
             }
             // Add logic for side-by-side snapping if needed
              // console.log(`Adjusted Final Snap Y: ${closestSnapPoint.y.toFixed(2)}`); // DEBUG

        } else if (!snapped) {
             // If no snap occurred, place on terrain height (for components that allow it, maybe not walls/ceilings?)
             if (componentId === 'foundation') { // Foundations MUST be on terrain if not snapped
                 const terrainHeight = this.game.terrain?.getHeightAt(position.x, position.z);
                 if (terrainHeight !== undefined) {
                     closestSnapPoint.y = terrainHeight + this.getComponentSize(componentId).y / 2;
                 } else {
                      // Cannot place foundation if terrain height fails and no snap target
                      console.warn("Cannot place foundation: No snap target and terrain height failed.");
                      // Return original position? Or null to indicate failure? For now, return original.
                 }
             } else {
                 // Walls/Ceilings generally require snapping, so if no snap, return original position
                 // which will likely fail validation.
                  // console.log("No snap target found for wall/ceiling, returning original position."); // DEBUG
             }
        }

        return closestSnapPoint; // Return the calculated position
    }

    // Generate potential snap points ON an existing building structure
    generateSnapPoints(existingBuilding, targetComponentId, targetRotation) {
        const pointsData = []; // Store { position: Vector3, normal: Vector3 }
        const pos = new THREE.Vector3(existingBuilding.position.x, existingBuilding.position.y, existingBuilding.position.z); // Use Vector3
        const bldgRot = existingBuilding.rotation || 0;
        const bldgType = existingBuilding.buildingType;
        const bldgSize = this.getComponentSize(bldgType);
        const targetSize = this.getComponentSize(targetComponentId); // Needed? Maybe not directly here.

        // Use actual component dimensions for offsets
        const halfSizeX = bldgSize.x / 2;
        const halfSizeY = bldgSize.y / 2;
        const halfSizeZ = bldgSize.z / 2;

        // Pre-calculate rotated basis vectors for the existing building
        const forward = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), bldgRot);
        const right = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), bldgRot);
        const up = new THREE.Vector3(0, 1, 0);

        // Helper to add point and its surface normal relative to existing building center
        const addPoint = (offsetX, offsetY, offsetZ, normal) => {
            const relativePos = new THREE.Vector3(offsetX, offsetY, offsetZ);
            // Rotate the offset by the building's rotation
            relativePos.applyAxisAngle(up, bldgRot);
            const worldPos = pos.clone().add(relativePos); // Add rotated offset to world center
            // Rotate the normal as well
            const worldNormal = normal.clone().applyAxisAngle(up, bldgRot).normalize();
            pointsData.push({ position: worldPos, normal: worldNormal });
        };

        switch (bldgType) {
            case 'foundation':
                if (targetComponentId === 'wall' || targetComponentId === 'window') {
                    // Snap points centered ON the top edges of the foundation
                    const wallAttachY = halfSizeY; // Top surface Y offset from center
                    const norm = up; // Normal is pointing up
                    addPoint(halfSizeX, wallAttachY, 0, norm);    // +X Edge Center
                    addPoint(-halfSizeX, wallAttachY, 0, norm);   // -X Edge Center
                    addPoint(0, wallAttachY, halfSizeZ, norm);    // +Z Edge Center
                    addPoint(0, wallAttachY, -halfSizeZ, norm);   // -Z Edge Center
                }
                break;

            case 'wall':
            case 'window':
                if (targetComponentId === 'ceiling') {
                    // Snap point centered ON the top surface of the wall
                    const ceilAttachY = halfSizeY;
                    addPoint(0, ceilAttachY, 0, up);
                } else if (targetComponentId === 'wall' || targetComponentId === 'window') {
                    // Adjacent walls: Snap points centered on the vertical side edges
                    // Note: Assumes wall geometry X-axis is along its length
                    const sideAttachY = 0; // Center Y of the existing wall
                    addPoint(halfSizeX, sideAttachY, 0, right); // +Local X edge center, normal points right
                    addPoint(-halfSizeX, sideAttachY, 0, right.clone().negate()); // -Local X edge center, normal points left
                    // Stacking walls: Snap point centered ON the top surface
                    const topAttachY = halfSizeY;
                    addPoint(0, topAttachY, 0, up); // Normal points up
                }
                break;

            case 'ceiling':
                 if (targetComponentId === 'wall' || targetComponentId === 'window') {
                     // Place walls on edges BELOW ceiling
                     const wallAttachY = -halfSizeY; // Bottom surface Y offset
                     const norm = up.clone().negate(); // Normal points down
                     addPoint(halfSizeX, wallAttachY, 0, norm);  // +X Edge Center
                     addPoint(-halfSizeX, wallAttachY, 0, norm); // -X Edge Center
                     addPoint(0, wallAttachY, halfSizeZ, norm);  // +Z Edge Center
                     addPoint(0, wallAttachY, -halfSizeZ, norm); // -Z Edge Center
                 } else if (targetComponentId === 'ceiling') {
                      // Adjacent ceilings: Snap points centered on the vertical side edges
                      const ceilAttachY = 0; // Same level Y center
                      addPoint(halfSizeX, ceilAttachY, 0, right); // +Local X edge center
                      addPoint(-halfSizeX, ceilAttachY, 0, right.clone().negate()); // -Local X edge center
                      addPoint(0, ceilAttachY, halfSizeZ, forward.clone().negate()); // +Local Z edge center (Normal points backward)
                      addPoint(0, ceilAttachY, -halfSizeZ, forward); // -Local Z edge center (Normal points forward)
                 }
                 break;
        }

        return pointsData; // Return array of { position, normal } objects
    }


    // Check if a given position is valid for placing a specific component
    isValidBuildPosition(position, componentId, rotation) {
        const component = this.getBuildingComponent(componentId);
        if (!component || !position) {
            console.warn(`isValidBuildPosition: Invalid component (${componentId}) or position.`);
            return false;
        }

        // 1. Basic Y check (above water)
        if (position.y < (this.game.terrain?.waterLevel ?? Constants.WORLD.WATER_LEVEL) + 0.1) {
            // console.log("Validation FAILED: Underwater"); // DEBUG
            return false;
        }

        // 2. Calculate Preview Bounds
        const previewSize = this.getComponentSize(componentId);
        const previewCenter = position.clone(); // Use the provided position (already snapped)
        // Create Box3 rotated correctly - more complex but accurate
        // For simplicity, using Axis-Aligned Bounding Box (AABB) centered at position.
        // This is less accurate for rotated objects but simpler to implement collision checks.
        // TODO: Implement Oriented Bounding Box (OBB) intersection if AABB is insufficient.
        const previewBoundsAABB = new THREE.Box3().setFromCenterAndSize(previewCenter, previewSize);


        // 3. Check Intersection with existing player buildings
        for (const building of this.buildings) {
            if (!building || !building.meshes || !building.meshes[0] || building.health <= 0) continue; // Skip invalid/destroyed
            const existingMesh = building.meshes[0];
            existingMesh.updateMatrixWorld(true);
            const existingBoundsAABB = new THREE.Box3().setFromObject(existingMesh);

            if (previewBoundsAABB.intersectsBox(existingBoundsAABB)) {
                const intersection = previewBoundsAABB.clone().intersect(existingBoundsAABB);
                const intersectionSize = intersection.getSize(new THREE.Vector3());
                // Allow very minor overlaps (e.g., 0.01 units) for numerical stability
                if (intersectionSize.x > 0.01 || intersectionSize.y > 0.01 || intersectionSize.z > 0.01) {
                     // console.log(`Validation FAILED: Intersects with building ${building.id}`); // DEBUG
                    return false;
                }
            }
        }

        // 4. Check Intersection with generated structures/resources
        const checkRadius = Math.max(previewSize.x, previewSize.z, previewSize.y) / 2 + 1.0; // Check radius based on size
        const nearbyResources = this.game.resourceManager?.getResourcesNear(position, checkRadius) || [];
        for (const resource of nearbyResources) {
             // Ignore plants/fiber and self (if buildings are resources)
             if (!resource || !resource.meshes || !resource.meshes[0] || ['plant', 'fiber'].includes(resource.type) || this.buildings.some(b => b.id === resource.id)) continue;

             const resMesh = resource.meshes[0];
             resMesh.updateMatrixWorld(true);
             const resourceBoundsAABB = new THREE.Box3().setFromObject(resMesh);
             if (previewBoundsAABB.intersectsBox(resourceBoundsAABB)) {
                  const intersection = previewBoundsAABB.clone().intersect(resourceBoundsAABB);
                  const intersectionSize = intersection.getSize(new THREE.Vector3());
                  if (intersectionSize.x > 0.1 || intersectionSize.y > 0.1 || intersectionSize.z > 0.1) { // Slightly larger tolerance for resources
                      // console.log(`Validation FAILED: Intersects with resource ${resource.id} (${resource.type})`); // DEBUG
                       return false;
                  }
             }
        }


        // 5. Component-specific Validation
        if (componentId === 'foundation') {
            // Check slope (using corner heights) - More important for foundations
            const halfGridX = previewSize.x / 2;
            const halfGridZ = previewSize.z / 2;
            const corners = [
                this.game.terrain?.getHeightAt(position.x - halfGridX, position.z - halfGridZ),
                this.game.terrain?.getHeightAt(position.x + halfGridX, position.z - halfGridZ),
                this.game.terrain?.getHeightAt(position.x - halfGridX, position.z + halfGridZ),
                this.game.terrain?.getHeightAt(position.x + halfGridX, position.z + halfGridZ)
            ];
            if (corners.some(h => h === undefined)) {
                 // console.log("Validation FAILED: Foundation corner height undefined."); // DEBUG
                 return false;
            }
            const minH = Math.min(...corners);
            const maxH = Math.max(...corners);
            if (maxH - minH > 1.0) { // Allow up to 1 unit height difference across foundation
                 // console.log(`Validation FAILED: Foundation slope too steep (${(maxH - minH).toFixed(2)})`); // DEBUG
                 return false;
            }
             // Check foundation isn't floating too high (bottom surface check)
             const foundationBottomY = position.y - previewSize.y / 2;
             const avgCornerHeight = corners.reduce((a, b) => a + b, 0) / corners.length;
             if (foundationBottomY > avgCornerHeight + 0.3) { // Allow slight float (e.g., 0.3 units)
                  // console.log(`Validation FAILED: Foundation too high (Bottom: ${foundationBottomY.toFixed(2)}, AvgGround: ${avgCornerHeight.toFixed(2)})`); // DEBUG
                  return false;
             }
             // Check foundation isn't sunk too deep
             if (foundationBottomY < avgCornerHeight - 0.5) { // Allow slight sinking
                  // console.log(`Validation FAILED: Foundation too low`); // DEBUG
                  return false;
             }
        } else {
            // For walls/ceilings, check if snapped position is reasonably close to *some* existing building part.
            // This prevents placing floating walls if snapping somehow failed but position was returned.
            let foundSupport = false;
            const supportCheckRadiusSq = (this.snapDistance * 1.5) ** 2; // Slightly larger than snap distance
            for (const building of this.buildings) {
                if (!building || !building.position || building.health <= 0) continue;
                if (position.distanceToSquared(building.position) < supportCheckRadiusSq) {
                    foundSupport = true;
                    break;
                }
            }
            if (!foundSupport) {
                // console.log("Validation FAILED: Wall/Ceiling has no nearby support structure."); // DEBUG
                return false;
            }
        }

        // If all checks passed
        // console.log("Validation PASSED"); // DEBUG
        return true;
    }


    // Build a component at the specified position
    buildComponent(componentId, position, rotation) {
        // position ARGUMENT is the final, snapped, validated position.

        console.log(`BuildingSystem.buildComponent: Attempting ${componentId} at final pos: (${position.x.toFixed(1)}, ${position.y.toFixed(1)}, ${position.z.toFixed(1)}) Rot: ${rotation.toFixed(2)}`); // DEBUG

        const component = this.getBuildingComponent(componentId);
        if (!component) { console.error(`Build failed: Component def not found: ${componentId}`); return false; }

        // 1. Final Resource Check (Redundant if preview was accurate, but safe)
        if (!this.canBuildComponent(componentId)) {
            console.log(`Build failed: Not enough resources for ${component.name} (Final Check)`);
            this.game.uiManager?.showNotification("Not enough resources!", 2000);
            return false;
        }

        // 2. Consume Resources
        console.log('Consuming resources:', component.requirements);
        let consumptionSuccess = true;
        if (component.requirements && Array.isArray(component.requirements)) {
            component.requirements.forEach(req => {
                if (!this.game.inventory?.removeItem(req.id, req.amount)) {
                    console.error(`Build failed: Failed to consume ${req.amount} of ${req.id}! Inventory inconsistency?`);
                    consumptionSuccess = false;
                    // Attempt to refund already consumed items? Complex. Best to rely on canBuildComponent check.
                }
            });
        }
        if (!consumptionSuccess) {
            console.error("Build failed due to resource consumption error.");
             this.game.uiManager?.showNotification("Build Error (Resources)!", 2000);
            return false; // Stop if consumption failed
        }
        // console.log('Resources consumed.'); // DEBUG

        // 3. Create Mesh
        let geometry = this.game.assetLoader?.getModel(componentId);
        if (!geometry || !(geometry instanceof THREE.BufferGeometry || geometry instanceof THREE.Object3D) ) { // Check for geometry OR Object3D (Group)
            console.error(`Build failed: Geometry/Model not found or invalid for ${componentId}`);
            // TODO: Refund resources?
            return false;
        }

        // Use a standard material (could be based on component type later)
        const material = new THREE.MeshStandardMaterial({
            map: this.game.assetLoader?.getTexture('wood'), // Assuming wood for now
            roughness: 0.8, metalness: 0.2
        });

        let buildingMesh;
        if (geometry instanceof THREE.BufferGeometry) {
             buildingMesh = new THREE.Mesh(geometry, material);
        } else { // Assumed to be Object3D (Group/Mesh from loader)
             buildingMesh = geometry; // Use the loaded object directly (it should be cloned by AssetLoader)
             // Apply standard material to all sub-meshes if it's a group
             buildingMesh.traverse(child => {
                 if (child.isMesh) {
                     child.material = material;
                     child.castShadow = true;
                     child.receiveShadow = true;
                 }
             });
        }

        buildingMesh.position.copy(position);
        buildingMesh.rotation.y = rotation || 0;
        buildingMesh.castShadow = true;
        buildingMesh.receiveShadow = true;
        buildingMesh.name = `${componentId}_${this.buildings.length}`; // Assign name

        // 4. Add to Scene
        try {
            this.game.scene.add(buildingMesh);
            // console.log("Mesh added to scene."); // DEBUG
        } catch (sceneError) {
            console.error("Build failed: Error adding mesh to scene:", sceneError);
             // TODO: Refund resources?
            return false;
        }

        // 5. Create Building Data Object
        const newBuilding = {
            id: `building_${Date.now()}_${this.buildings.length}`,
            type: 'building', // Consistent type for category/destruction?
            buildingType: componentId, // Specific type
            position: { x: position.x, y: position.y, z: position.z }, // Store plain object for saving
            rotation: rotation || 0,
            meshes: [buildingMesh], // Store reference to the main mesh/group
            // Assign health/resources if defined in Constants
            health: component.health || 100, // Default health if not specified
            maxHealth: component.health || 100,
            resources: component.resources ? { ...component.resources } : {} // Resources dropped on destruction
        };

        // 6. Add to Internal List & Register if Destructible
        this.buildings.push(newBuilding);
        // Register with resource manager ONLY if it's meant to be destructible/harvestable
        if (component.health > 0 && component.resources && Object.keys(component.resources).length > 0) {
             this.game.resourceManager?.registerResource(newBuilding); // Register using the building data object
             // console.log(`Registered destructible building ${newBuilding.id} with ResourceManager.`); // DEBUG
        }

        console.log(`Successfully built ${component.name} at (${position.x.toFixed(1)}, ${position.y.toFixed(1)}, ${position.z.toFixed(1)})`);
        // Update UI after successful build and resource consumption
        this.game.uiManager?.buildingUI?.updateBuildMenu();
        // Inventory updates implicitly via removeItem

        return true;
    }


    // Remove a building (e.g., by player action or integrity check)
    removeBuilding(buildingId) {
        const index = this.buildings.findIndex(b => b && b.id === buildingId);
        if (index === -1) {
            // console.warn(`Building not found for removal: ${buildingId}`); // Less verbose
            return false;
        }
        const building = this.buildings[index];

        // If registered as a resource (destructible), remove it via ResourceManager
        // This handles mesh removal/disposal and spatial map updates for resources.
        if (this.game.resourceManager?.getResource(buildingId)) {
            this.game.resourceManager.removeResource(buildingId); // Let RM handle scene removal
        } else if (building.meshes) {
            // If not registered as resource, remove meshes manually
            building.meshes.forEach(mesh => {
                if (mesh) {
                    mesh.parent?.remove(mesh);
                    // Dispose geometry/material (important!)
                    mesh.traverse(child => {
                        if (child.isMesh) {
                            child.geometry?.dispose();
                            if (child.material) {
                                if (Array.isArray(child.material)) child.material.forEach(m => m?.dispose());
                                else child.material?.dispose();
                            }
                        }
                    });
                }
            });
        }

        // Remove from internal list
        this.buildings.splice(index, 1);

        console.log(`Removed building: ${buildingId}`);

        // Optionally trigger integrity check after removal (can be heavy)
        // requestAnimationFrame(() => this.checkBuildingIntegrity());

        return true;
    }

    // Get all currently placed building objects
    getAllBuildings() {
        return this.buildings;
    }

    // Get placed buildings of a specific type (e.g., 'wall')
    getBuildingsByType(type) {
        return this.buildings.filter(b => b && b.buildingType === type);
    }

    // Check structural integrity (placeholder/basic)
    checkBuildingIntegrity() {
        // This requires a more complex graph traversal (BFS/DFS) starting from grounded foundations.
        // For now, this is a placeholder. A full implementation is non-trivial.
        console.warn("checkBuildingIntegrity() is not fully implemented.");

        // Simple Example Idea (Not robust):
        // 1. Find all grounded foundations.
        // 2. Iteratively find all pieces connected to grounded/stable pieces.
        // 3. Remove any pieces not found in the stable set.
    }

    // Helper for integrity check (placeholder)
    findSupportStructure(building, allowedSupportTypes, relation, stableSet) {
         // Placeholder - requires actual geometric checks based on 'relation'
         // console.warn("findSupportStructure() placeholder called.");
         return true; // Assume supported for now
    }


    // Update method called each frame (optional)
    update(deltaTime) {
        // Potential future use: Animate building parts, check integrity periodically
    }
}

// --- END OF FILE BuildingSystem.js ---
