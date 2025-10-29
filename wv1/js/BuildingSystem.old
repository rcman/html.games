// --- START OF FILE BuildingSystem.js ---

class BuildingSystem {
    constructor(game) {
        this.game = game;

        // Building components from Constants
        this.buildingComponents = Constants.BUILDING.COMPONENTS;

        // List of all placed buildings in the world
        this.buildings = [];

        // Snapping distance from Constants
        this.snapDistance = Constants.BUILDING.SNAP_DISTANCE;

        // Grid size for snapping (usually foundation size) from Constants
        this.gridSize = Constants.BUILDING.GRID_SIZE;
    }

    // Get all defined building component types
    getBuildingComponents() {
        return this.buildingComponents;
    }

    // Get a specific building component definition by its ID
    getBuildingComponent(componentId) {
        return this.buildingComponents.find(comp => comp.id === componentId);
    }

    // Check if the player has enough resources in their inventory for a component
    canBuildComponent(componentId) {
        const component = this.getBuildingComponent(componentId);
        if (!component) return false;
        // Delegate the check to the inventory system
        const canAfford = this.game.inventory.checkResources(component.requirements);
        // Optional detailed log:
        // console.log(`canBuildComponent (${componentId}): ${canAfford}. Req: ${JSON.stringify(component.requirements)}. Inv Check: ${/* Log inventory counts if needed */}`);
        return canAfford;
    }

    // Create a visual preview mesh for a building component
    createBuildingPreview(componentId) {
        const component = this.getBuildingComponent(componentId);
        if (!component) {
            console.error(`Building component not found: ${componentId}`);
            return null;
        }

        // Get geometry from AssetLoader (which should handle cloning)
        let geometry = this.game.assetLoader.getModel(componentId);
        if (!geometry) {
            console.error(`Preview geometry for ${componentId} not found! Using fallback.`);
            geometry = new THREE.BoxGeometry(1, 1, 1); // Fallback cube
        }

        // Create a semi-transparent material for the preview
        const material = new THREE.MeshStandardMaterial({
            color: 0x00ff00, // Default green (valid placement)
            transparent: true,
            opacity: 0.6,    // Make it see-through
            metalness: 0.1,
            roughness: 0.8,
            depthWrite: false // Prevents z-fighting issues with terrain/other previews
        });

        const previewMesh = new THREE.Mesh(geometry, material);
        return previewMesh;
    }

    // Check if a given position is valid for placing a specific component
    isValidBuildPosition(position, componentId, rotation) {
        const component = this.getBuildingComponent(componentId);
        if (!component || !position) return false;

        const terrainHeight = this.game.terrain.getHeightAt(position.x, position.z);
        const waterLevel = this.game.terrain.waterLevel;

        // Use a small tolerance for placement checks near water level
        if (position.y < waterLevel + 0.05) {
            console.log("isValidBuildPosition: FAILED - Position underwater"); // LOG
            return false;
        }

        // Check for intersections with existing buildings (Simplified bounding box check)
        const previewSize = this.getComponentSize(componentId);
        // Create bounds centered correctly (Box3 setFromCenterAndSize expects center)
        const previewCenter = position.clone();
        // Adjust center based on component geometry origin if needed (BoxGeometry is centered)
        const previewBounds = new THREE.Box3().setFromCenterAndSize(previewCenter, previewSize);

        for (const building of this.buildings) {
            if (!building.meshes || !building.meshes[0]) continue;
            const existingMesh = building.meshes[0];
            // Ensure matrix world is up to date for accurate bounding box
            existingMesh.updateMatrixWorld(true);
            const existingBounds = new THREE.Box3().setFromObject(existingMesh);

            if (previewBounds.intersectsBox(existingBounds)) {
                // Check how much they intersect
                const intersection = previewBounds.clone().intersect(existingBounds);
                const intersectionSize = intersection.getSize(new THREE.Vector3());
                // Allow very minor overlaps (e.g., for snapping), disallow larger ones
                if (intersectionSize.x > 0.1 || intersectionSize.y > 0.1 || intersectionSize.z > 0.1) {
                    console.log("isValidBuildPosition: FAILED - Intersection with existing building", building.id); // LOG
                    return false;
                }
            }
        }

        // --- Component-specific validation ---
        switch (componentId) {
            case 'foundation':
                // Foundation shouldn't be too high off the ground or too embedded
                if (terrainHeight === undefined || Math.abs(position.y - terrainHeight - (previewSize.y / 2)) > 0.6) {
                    console.log(`isValidBuildPosition: FAILED - Foundation height invalid (Pos Y: ${position.y.toFixed(2)}, Terrain H: ${terrainHeight?.toFixed(2)}, Size Y: ${previewSize.y.toFixed(2)})`); // LOG
                    return false;
                }
                // Check slope (more robust check)
                const halfGrid = this.gridSize / 2;
                const corners = [
                    this.game.terrain.getHeightAt(position.x - halfGrid, position.z - halfGrid),
                    this.game.terrain.getHeightAt(position.x + halfGrid, position.z - halfGrid),
                    this.game.terrain.getHeightAt(position.x - halfGrid, position.z + halfGrid),
                    this.game.terrain.getHeightAt(position.x + halfGrid, position.z + halfGrid)
                ];
                 if (corners.some(h => h === undefined)) { console.log("isValidBuildPosition: FAILED - Corner height invalid"); return false; } // LOG
                 const minH = Math.min(...corners);
                 const maxH = Math.max(...corners);
                 if (maxH - minH > 1.0) { console.log("isValidBuildPosition: FAILED - Slope too steep"); return false; } // LOG

                return true; // Passed foundation checks

            case 'wall':
            case 'window':
                 // Walls need valid support below or valid adjacent connection
                 const supportBelow = this.findSnapTarget(position, ['foundation', 'ceiling', 'wall', 'window'], 'below', rotation, componentId);
                 // Adjacent check might be less reliable depending on snap point generation
                 // const adjacentSupport = this.findSnapTarget(position, ['wall', 'window'], 'adjacent', rotation, componentId);
                 // Prioritize support below
                 if (!supportBelow) {
                     console.log("isValidBuildPosition: FAILED - Wall has no support below"); // LOG
                     return false;
                 }
                 return true; // Passed wall checks

            case 'ceiling':
                 // Ceiling needs valid support below (from walls/windows) or adjacent ceiling
                 const wallSupport = this.findSnapTarget(position, ['wall', 'window'], 'below', rotation, componentId);
                 // Adjacent ceiling check might be less reliable
                 // const adjacentCeiling = this.findSnapTarget(position, ['ceiling'], 'adjacent', rotation, componentId);
                 if (!wallSupport) {
                     console.log("isValidBuildPosition: FAILED - Ceiling has no wall support"); // LOG
                     return false;
                 }
                 return true; // Passed ceiling checks

            default:
                console.warn(`isValidBuildPosition: Unknown componentId ${componentId}`); // LOG
                return false; // Unknown component type
        }
    }

     // Find potential snapping targets near a position
     // relation: 'any', 'below', 'adjacent'
     // targetRotation/targetComponentId: Info about the piece being placed
    findSnapTarget(position, allowedTargetTypes, relation = 'any', targetRotation = 0, targetComponentId = null) {
        let bestTarget = null;
        let minDistanceSq = this.snapDistance * this.snapDistance;

        for (const building of this.buildings) {
            // Filter by allowed type
            if (!allowedTargetTypes.includes(building.buildingType)) continue;
            if (!building.meshes || !building.meshes[0]) continue; // Skip if mesh missing

            // Generate potential snap points ON the existing building where the NEW piece might attach
            const snapPoints = this.generateSnapPoints(building, targetComponentId, targetRotation);

            // Find the closest valid snap point on this building
            for (const point of snapPoints) {
                const dx = point.x - position.x;
                const dy = point.y - position.y;
                const dz = point.z - position.z;
                const distSq = dx * dx + dy * dy + dz * dz;

                if (distSq < minDistanceSq) {
                    // Basic proximity check passed, now check relation if specified
                    let relationMatch = false;
                    if (relation === 'any') {
                        relationMatch = true;
                    } else if (relation === 'below') {
                        // Check if the snap point 'point' is roughly below the placement 'position'
                        const yDifference = position.y - point.y;
                        const xzDistSq = dx*dx + dz*dz;
                        // Expect positive yDifference (position is above point)
                        // Check if XZ distance is small and Y difference is correct
                         let expectedYDiff = 0;
                         if (targetComponentId === 'wall' || targetComponentId === 'window') expectedYDiff = Constants.BUILDING.WALL_HEIGHT/2 + this.getComponentSize(building.buildingType).y/2; // Wall on foundation/ceiling
                         else if (targetComponentId === 'ceiling') expectedYDiff = 0.3/2 + Constants.BUILDING.WALL_HEIGHT/2; // Ceiling on wall

                         if (xzDistSq < 0.5*0.5 && Math.abs(yDifference - expectedYDiff) < 0.2) { // Allow small tolerance
                             relationMatch = true;
                         }

                    } else if (relation === 'adjacent') {
                        // Check if XZ distance matches grid size and Y is similar
                        const yDifference = Math.abs(position.y - point.y);
                        const xzDist = Math.sqrt(dx*dx + dz*dz);
                        if (yDifference < 0.5 && Math.abs(xzDist - this.gridSize) < 0.5) { // Allow tolerance
                            // TODO: Add stricter alignment check based on rotations?
                            relationMatch = true;
                        }
                    }

                    if (relationMatch) {
                         minDistanceSq = distSq;
                         bestTarget = building; // Return the building it snaps to
                    }
                }
            }
        }
        return bestTarget; // Return the building object found, or null
    }

    // Helper to get approximate size of a component based on its geometry
    getComponentSize(componentId) {
        const geometry = this.game.assetLoader.getModel(componentId);
        if (!geometry) return new THREE.Vector3(1, 1, 1); // Fallback
        geometry.computeBoundingBox();
        const size = new THREE.Vector3();
        geometry.boundingBox.getSize(size);
        return size;
    }


    // Check if there's a nearby building component (less specific than findSnapTarget)
    hasNearbyBuilding(position, type, distance) {
        const targetTypes = Array.isArray(type) ? type : [type];
        return !!this.findSnapTarget(position, targetTypes, 'any'); // Use findSnapTarget for proximity check
    }

    // Find the most likely snapping point based on raycast hit and nearby buildings
    findSnappingPoint(position, componentId, rotation) {
        // Special grid snapping for foundations
        if (componentId === 'foundation') {
            const snappedX = Math.round(position.x / this.gridSize) * this.gridSize;
            const snappedZ = Math.round(position.z / this.gridSize) * this.gridSize;
            let snappedY = position.y; // Start with raycast hit Y

            const terrainHeight = this.game.terrain.getHeightAt(snappedX, snappedZ);
            if (terrainHeight !== undefined) {
                 // Place slightly above terrain, but snap Y to increments (e.g., 0.5)
                 snappedY = Math.max(terrainHeight, this.game.terrain.waterLevel + 0.05);
                 // Adjust Y based on the foundation's own height (BoxGeometry origin is center)
                 snappedY += this.getComponentSize('foundation').y / 2;
                 // Optional: Snap Y coordinate relative to ground
                 // snappedY = Math.round(snappedY * 2) / 2;
            } else {
                 snappedY += this.getComponentSize('foundation').y / 2; // Adjust based on size even if terrain fails
            }

            return new THREE.Vector3(snappedX, snappedY, snappedZ);
        }

        // For other components, find the best snap point on existing structures
        let closestSnapPoint = position.clone(); // Default to original position if no snap
        let minDistanceSq = this.snapDistance * this.snapDistance;

        for (const building of this.buildings) {
            if (!building.meshes || !building.meshes[0]) continue; // Skip buildings without mesh

            // Check if this building is a valid snap target type for the component being placed
            let isValidTarget = false;
            if ((componentId === 'wall' || componentId === 'window') && ['foundation', 'wall', 'window', 'ceiling'].includes(building.buildingType)) isValidTarget = true;
            if (componentId === 'ceiling' && ['wall', 'window', 'ceiling'].includes(building.buildingType)) isValidTarget = true;
            // Add rules for other components if necessary

            if (!isValidTarget) continue;

            // Generate potential snap points ON the existing building
            const snapPoints = this.generateSnapPoints(building, componentId, rotation);

            // Find the closest valid snap point on this building to the cursor position
            for (const point of snapPoints) {
                const distSq = point.distanceToSquared(position);
                if (distSq < minDistanceSq) {
                    // Basic distance check passed, potentially refine with angle checks later if needed
                    minDistanceSq = distSq;
                    closestSnapPoint = point.clone(); // Found a better snap point
                }
            }
        }
        return closestSnapPoint; // Return the best snap point found, or original position
    }

    // Generate potential snap points ON an existing building structure
    // where a NEW component (targetComponentId) could attach.
    generateSnapPoints(existingBuilding, targetComponentId, targetRotation) {
        const points = [];
        const pos = existingBuilding.position; // Center position of the existing building mesh
        const bldgRot = existingBuilding.rotation || 0; // Rotation of existing building
        const bldgType = existingBuilding.buildingType;
        const bldgSize = this.getComponentSize(bldgType); // Size of the existing building part
        const targetSize = this.getComponentSize(targetComponentId); // Size of the NEW part being placed

        const halfGrid = this.gridSize / 2; // Assuming gridSize is relevant edge length
        const wallH = Constants.BUILDING.WALL_HEIGHT;

        // Helper to create a point relative to the existing building's center and rotation
        const addPoint = (offsetX, offsetY, offsetZ) => {
             const point = new THREE.Vector3(offsetX, offsetY, offsetZ);
             point.applyAxisAngle(new THREE.Vector3(0, 1, 0), bldgRot); // Rotate offset around Y axis
             point.add(pos); // Add offset to building's center position
             points.push(point);
        };

        switch (bldgType) {
            case 'foundation':
                 if (targetComponentId === 'wall' || targetComponentId === 'window') {
                     // Place walls on top edges of foundation
                     const wallY = bldgSize.y / 2 + targetSize.y / 2; // Foundation top + half wall height
                     addPoint(halfGrid, wallY, 0);  // +X Edge Center
                     addPoint(-halfGrid, wallY, 0); // -X Edge Center
                     addPoint(0, wallY, halfGrid);  // +Z Edge Center
                     addPoint(0, wallY, -halfGrid); // -Z Edge Center
                 }
                 break;

            case 'wall':
            case 'window':
                 if (targetComponentId === 'ceiling') {
                     // Place ceiling centered on top of wall
                     const ceilY = bldgSize.y / 2 + targetSize.y / 2; // Wall top + half ceiling height
                     addPoint(0, ceilY, 0);
                 } else if (targetComponentId === 'wall' || targetComponentId === 'window') {
                      // Place adjacent walls at the ends
                      const sideY = 0; // Walls are vertically centered, so Y offset is 0 relative to center
                      addPoint(halfGrid, sideY, 0); // +Local X end
                      addPoint(-halfGrid, sideY, 0); // -Local X end
                      // Also consider placing walls on TOP of this wall?
                      const topY = bldgSize.y / 2 + targetSize.y / 2;
                      addPoint(0, topY, 0); // Center Top
                 }
                 break;

            case 'ceiling':
                 if (targetComponentId === 'wall' || targetComponentId === 'window') {
                     // Place walls on edges below ceiling
                     const wallY = -bldgSize.y / 2 - targetSize.y / 2; // Ceiling bottom - half wall height
                     addPoint(halfGrid, wallY, 0);  // +X Edge Center
                     addPoint(-halfGrid, wallY, 0); // -X Edge Center
                     addPoint(0, wallY, halfGrid);  // +Z Edge Center
                     addPoint(0, wallY, -halfGrid); // -Z Edge Center
                 } else if (targetComponentId === 'ceiling') {
                      // Place adjacent ceilings
                      const ceilY = 0; // Same level
                      addPoint(this.gridSize, ceilY, 0);  // +X Adjacent Center // FIX: Use full grid size
                      addPoint(-this.gridSize, ceilY, 0); // -X Adjacent Center // FIX: Use full grid size
                      addPoint(0, ceilY, this.gridSize);  // +Z Adjacent Center // FIX: Use full grid size
                      addPoint(0, ceilY, -this.gridSize); // -Z Adjacent Center // FIX: Use full grid size
                 }
                 break;
        }

        return points;
    }


    // Build a component at the specified position
    buildComponent(componentId, position, rotation) {
        console.log(`Attempting to build ${componentId} at initial pos:`, position); // DEBUG

        const component = this.getBuildingComponent(componentId);
        if (!component) { console.error(`Build failed: Component def not found: ${componentId}`); return false; }

        // 1. Find Snapping Point
        const snapPos = this.findSnappingPoint(position, componentId, rotation);
        console.log(`Calculated snap position:`, snapPos); // DEBUG

        // 2. Validate Snapped Position
        if (!this.isValidBuildPosition(snapPos, componentId, rotation)) {
            console.log(`Build failed: Invalid snapped position for ${componentId}`);
            this.game.uiManager?.showNotification("Cannot build there!", 2000);
            return false;
        }

        // 3. Check Resources (Final Check)
        if (!this.canBuildComponent(componentId)) {
            console.log(`Build failed: Not enough resources for ${component.name}`);
            this.game.uiManager?.showNotification("Not enough resources!", 2000);
            return false;
        }

        // 4. Consume Resources
        console.log('Consuming resources:', component.requirements);
        let consumptionSuccess = true;
        component.requirements.forEach(req => {
            if (!this.game.inventory.removeItem(req.id, req.amount)) {
                console.error(`Build failed: Failed to consume ${req.amount} of ${req.id}! Inventory inconsistency?`);
                consumptionSuccess = false;
            }
        });
        if (!consumptionSuccess) {
            // Attempting to refund is complicated; better to prevent reaching here if checkResources was accurate.
            console.error("Build failed due to resource consumption error.");
            return false;
        }
        console.log('Resources consumed.');

        // 5. Create Mesh
        let geometry = this.game.assetLoader.getModel(componentId);
        if (!geometry) { console.error(`Build failed: Geometry not found for ${componentId}`); /* TODO: Refund resources? */ return false; }

        const material = new THREE.MeshStandardMaterial({
            map: this.game.assetLoader.getTexture('wood'), // Assuming wood for now
            roughness: 0.8, metalness: 0.2
        });

        const buildingMesh = new THREE.Mesh(geometry, material);
        buildingMesh.position.copy(snapPos);
        buildingMesh.rotation.y = rotation || 0;
        buildingMesh.castShadow = true;
        buildingMesh.receiveShadow = true;

        // 6. Add to Scene
        try {
            this.game.scene.add(buildingMesh);
            console.log("Mesh added to scene.");
        } catch (sceneError) {
            console.error("Build failed: Error adding mesh to scene:", sceneError);
             /* TODO: Refund resources? */
            return false;
        }

        // 7. Create Building Data Object
        const building = {
            id: `building_${Date.now()}_${this.buildings.length}`,
            type: 'building', // Consistent type for category/destruction?
            buildingType: componentId, // Specific type
            position: { x: snapPos.x, y: snapPos.y, z: snapPos.z }, // Store plain object for saving
            rotation: rotation || 0,
            meshes: [buildingMesh],
            // Assign health/resources if defined in Constants
            health: component.health || 100, // Default health if not specified
            maxHealth: component.health || 100,
            resources: component.resources || {} // Resources dropped on destruction
        };

        // 8. Add to Internal List & Register if Destructible
        this.buildings.push(building);
        if (component.health > 0) {
             this.game.resourceManager.registerResource(building);
             console.log(`Registered destructible building ${building.id} with ResourceManager.`);
        }

        console.log(`Successfully built ${component.name} at`, snapPos);
        this.game.uiManager?.buildingUI?.updateBuildMenu(); // Update UI resource counts
        this.game.uiManager?.updateCraftingMenu();
        return true;
    }


    // Remove a building (e.g., by player action or integrity check)
    removeBuilding(buildingId) {
        const index = this.buildings.findIndex(b => b.id === buildingId);
        if (index === -1) {
            console.warn(`Building not found for removal: ${buildingId}`);
            return false;
        }
        const building = this.buildings[index];

        // Remove from resource manager FIRST (handles mesh removal/disposal)
        this.game.resourceManager.removeResource(buildingId);

        // Remove from internal list
        this.buildings.splice(index, 1);

        console.log(`Removed building: ${buildingId}`);

        // Trigger integrity check after removal as structure might change
        // Debounce this or call it less frequently to avoid performance hits
        // requestAnimationFrame(() => this.checkBuildingIntegrity());

        return true;
    }

    // Get all currently placed building objects
    getAllBuildings() {
        return this.buildings;
    }

    // Get placed buildings of a specific type (e.g., 'wall')
    getBuildingsByType(type) {
        return this.buildings.filter(b => b.buildingType === type);
    }

    // Check structural integrity (e.g., remove floating pieces)
    checkBuildingIntegrity() {
        // More robust check needed - BFS/DFS from foundations?
        // Simple check for now: Remove floating non-foundations
        const buildingsToRemove = [];
        let changed = true; // Keep checking until no changes occur in a pass

         while(changed) {
             changed = false;
             const currentBuildings = [...this.buildings]; // Work on a snapshot
             const stableSet = new Set(currentBuildings.filter(b => b.buildingType === 'foundation').map(b => b.id)); // Start with foundations as stable

             let newlyStable = true;
             while (newlyStable) {
                 newlyStable = false;
                 for (const building of currentBuildings) {
                     if (stableSet.has(building.id)) continue; // Already known stable

                     let isSupported = false;
                     switch (building.buildingType) {
                         case 'wall': case 'window':
                              // Check for support below (foundation, ceiling, wall) or adjacent stable wall
                              if (this.findSupportStructure(building, ['foundation', 'ceiling', 'wall', 'window'], 'below', stableSet) ||
                                  this.findSupportStructure(building, ['wall', 'window'], 'adjacent', stableSet)) {
                                  isSupported = true;
                              }
                              break;
                         case 'ceiling':
                              // Check for support below (wall/window) or adjacent stable ceiling
                              if (this.findSupportStructure(building, ['wall', 'window'], 'below', stableSet) ||
                                  this.findSupportStructure(building, ['ceiling'], 'adjacent', stableSet)) {
                                  isSupported = true;
                              }
                              break;
                         default: // Foundations already handled
                              isSupported = true; break;
                     }

                     if (isSupported) {
                         stableSet.add(building.id);
                         newlyStable = true; // Found a newly stable piece, might stabilize others
                     }
                 }
             }

             // Identify buildings not in the stable set
             currentBuildings.forEach(b => {
                 if (b.buildingType !== 'foundation' && !stableSet.has(b.id)) {
                      if (!buildingsToRemove.includes(b.id)) {
                          buildingsToRemove.push(b.id);
                          changed = true; // Mark for removal, potentially need another pass
                      }
                 }
             });

             // Remove unstable buildings found in this pass
             if (changed) {
                 console.log("Integrity Check: Removing unstable buildings:", buildingsToRemove);
                 buildingsToRemove.forEach(id => this.removeBuilding(id)); // removeBuilding handles scene/RM removal
                 buildingsToRemove.length = 0; // Clear for potential next pass (though loop condition handles it)
             }
         }
    }

    // Helper for integrity check: Find if a building is supported by a stable structure
    findSupportStructure(building, allowedSupportTypes, relation, stableSet) {
         const checkPosition = new THREE.Vector3(building.position.x, building.position.y, building.position.z);

         for (const potentialSupport of this.buildings) {
             // Check if the potential support is stable and of the allowed type
             if (!stableSet.has(potentialSupport.id) || !allowedSupportTypes.includes(potentialSupport.buildingType)) {
                 continue;
             }

             // Check proximity and relationship (Simplified)
             const distSq = checkPosition.distanceToSquared(potentialSupport.position);
             const maxDist = (this.snapDistance + this.gridSize) * (this.snapDistance + this.gridSize); // Generous check radius

             if (distSq < maxDist) {
                  // Basic proximity is enough for this simplified check
                  // A more accurate check would verify relative positions based on 'relation'
                  return true; // Found a stable support nearby
             }
         }
         return false; // No stable support found
    }


    // Update method called each frame (optional)
    update(deltaTime) {
        // Periodically check building integrity (e.g., every few seconds)
        // if ((this.game.elapsedTime || 0) % 5 < deltaTime) { // Check roughly every 5 seconds
        //     this.checkBuildingIntegrity();
        // }
    }
}