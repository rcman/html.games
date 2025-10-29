// --- START OF FILE ResourceManager.js ---

class ResourceManager {
    constructor(game) {
        this.game = game;
        this.resources = {
            trees: [],
            stones: [],
            plants: [], // Includes cloth patches now
            animals: [], // Keep if tracking dead harvestable animals
            buildings: [],
            crafting: [],
            // --- ADDED CATEGORIES ---
            crates: [],
            barrels: [],
            // <<-- ADDED -->>
            structures: []
            // ---
        };
        this.resourceMap = new Map(); // Maps resource.id to resource
        this.spatialMap = new Map(); // Maps grid cell 'x,z' to Set of resource ids
        this.gridSize = 20; // Cell size for spatial partitioning
        this.respawnQueue = []; // For plants/cloth
    }

    // --- UPDATED: getResourceCategory includes new types ---
    getResourceCategory(type) {
        if (!type) return null;
        if (type === 'tree') return 'trees';
        if (type === 'stone' || type === 'iron' || type === 'copper' || type === 'zinc') return 'stones';
        // --- Cloth is grouped with plants for generation/respawn ---
        if (type === 'fiber' || type === 'blueberry' || type === 'carrot' || type === 'onion' || type === 'medicinalherb' || type === 'cloth') return 'plants';
        // ---
        if (type === 'animal') return 'animals'; // Usually handled by EntityManager, but keep for potential dead bodies
        if (type === 'building') return 'buildings';
        if (type === 'workbench' || type === 'forge' || type === 'campfire') return 'crafting';
        // --- Add new container types ---
        if (type === 'crate') return 'crates';
        if (type === 'barrel') return 'barrels';
        // <<-- ADDED -->>
        if (type === 'structure') return 'structures';
        // ---
        // console.warn(`Resource type "${type}" does not have a dedicated category.`);
        return null; // Return null if no category matches
    }
    // --- END UPDATE ---

    registerResource(resource) {
        if (!resource || !resource.id || !resource.type || !resource.position) {
             console.error("Invalid resource object passed to registerResource:", resource);
             return;
         }
        if (this.resourceMap.has(resource.id)) {
             // console.warn(`Resource ID ${resource.id} already registered. Skipping.`);
             return; // Avoid duplicates
        }

        const category = this.getResourceCategory(resource.type);
        if (category) {
            if (this.resources[category]) {
                this.resources[category].push(resource);
            } else {
                console.warn(`Resource category array "${category}" not initialized! Creating.`);
                this.resources[category] = [resource]; // Create if missing (shouldn't happen ideally)
            }
        } else {
            console.warn(`Resource type "${resource.type}" (ID: ${resource.id}) has no category mapping.`);
        }


        this.resourceMap.set(resource.id, resource);
        this.addToSpatialMap(resource);
    }


    removeResource(resourceId) {
        const resource = this.resourceMap.get(resourceId);
        if (!resource) return;

        // Remove mesh from scene and dispose geometry/material
        if (resource.meshes) {
            resource.meshes.forEach(mesh => {
                if (mesh) {
                    // Safely remove from parent (likely the scene)
                    mesh.parent?.remove(mesh);
                    mesh.traverse(child => { // Ensure disposal for all children too
                        if (child.geometry) child.geometry.dispose();
                        if (child.material) {
                            if (Array.isArray(child.material)) {
                                child.material.forEach(mat => { mat?.map?.dispose(); mat?.dispose(); });
                            } else {
                                child.material?.map?.dispose();
                                child.material?.dispose();
                            }
                        }
                    });
                }
            });
            resource.meshes = []; // Clear meshes array
        }

        // Remove from category list
        const category = this.getResourceCategory(resource.type);
        if (category && this.resources[category]) {
            const index = this.resources[category].findIndex(r => r && r.id === resourceId);
            if (index !== -1) {
                this.resources[category].splice(index, 1);
            }
        }

        this.removeFromSpatialMap(resource); // Remove before deleting from map
        this.resourceMap.delete(resourceId); // Remove from main ID map

        // Queue for respawn if applicable (plants/cloth)
        // Check category name from the helper function for consistency
        if (resource.regrowTime && this.getResourceCategory(resource.type) === 'plants') {
             this.scheduleRespawn(resource); // Pass the original (now removed) object data
        }
    }


    addToSpatialMap(resource) {
        if (!resource || !resource.position || !resource.id) return; // Safety checks
        const gridX = Math.floor(resource.position.x / this.gridSize);
        const gridZ = Math.floor(resource.position.z / this.gridSize);
        const cellKey = `${gridX},${gridZ}`;
        if (!this.spatialMap.has(cellKey)) {
            this.spatialMap.set(cellKey, new Set()); // Use a Set for efficient add/delete
        }
        this.spatialMap.get(cellKey).add(resource.id);
    }

    removeFromSpatialMap(resource) {
         if (!resource || !resource.position || !resource.id) return; // Safety checks
        const gridX = Math.floor(resource.position.x / this.gridSize);
        const gridZ = Math.floor(resource.position.z / this.gridSize);
        const cellKey = `${gridX},${gridZ}`;
        if (this.spatialMap.has(cellKey)) {
            const cell = this.spatialMap.get(cellKey);
            cell.delete(resource.id); // Remove ID from the Set
            if (cell.size === 0) { // If Set is empty, remove the cell key
                this.spatialMap.delete(cellKey);
            }
        }
    }

    scheduleRespawn(originalResourceData) {
        const respawnDelay = originalResourceData.regrowTime || (Constants.RESOURCES.PLANT_REGROW_TIME * 60 * 1000);
        const now = Date.now();

        const respawnData = {
            id: originalResourceData.id,
            type: originalResourceData.type,
            name: originalResourceData.name,
            position: { ...originalResourceData.position }, // Deep copy position
            scale: originalResourceData.scale,
            resources: originalResourceData.resources ? { ...originalResourceData.resources } : {}, // Deep copy resources
            maxHealth: originalResourceData.maxHealth || 10,
            regrowTime: originalResourceData.regrowTime,
            respawnAt: now + respawnDelay
        };

        this.respawnQueue.push(respawnData);
        // console.log(`[RM Respawn] Scheduled ${respawnData.type} (ID: ${respawnData.id}) for ${new Date(respawnData.respawnAt).toLocaleTimeString()}`);
    }


    processRespawns() {
        const now = Date.now();
        let i = this.respawnQueue.length;
        while (i--) {
            const item = this.respawnQueue[i];
            if (now >= item.respawnAt) {
                this.respawnResource(item);
                this.respawnQueue.splice(i, 1);
            }
        }
    }

    // --- MODIFIED: respawnResource handles cloth ---
    respawnResource(respawnData) {
        // console.log(`[RM Respawn] Attempting to respawn ${respawnData.type} (ID: ${respawnData.id})`);
        if (this.resourceMap.has(respawnData.id)) {
             // console.warn(`[RM Respawn] Resource ${respawnData.id} already exists. Aborting respawn.`);
             return;
         }

        const newResource = {
            id: respawnData.id,
            type: respawnData.type,
            name: respawnData.name,
            health: respawnData.maxHealth,
            maxHealth: respawnData.maxHealth,
            position: { ...respawnData.position },
            scale: respawnData.scale,
            meshes: [],
            resources: respawnData.resources ? { ...respawnData.resources } : {},
            regrowTime: respawnData.regrowTime
        };

        let meshCreated = false;
        // Handle plants and cloth (ensure category check uses the correct function)
        if (this.getResourceCategory(newResource.type) === 'plants') {
             try {
                 let geo;
                 let color = 0x556b2f; // Default
                 let posYOffset = 0;

                 if (newResource.type === 'cloth') {
                     geo = this.game.assetLoader.getModel('cloth'); // Get cloth geometry
                     if (!geo) throw new Error("Cloth model not found");
                     color = 0xFFFAF0;
                     posYOffset = 0.05; // Place slightly above ground
                 } else {
                     geo = this.game.assetLoader.getModel('plant'); // Get plant geometry
                     if (!geo) throw new Error("Plant model not found");
                     // ... (get color for other plants as before) ...
                     const plantTypeDef = Constants.ITEMS.RESOURCES.find(p => p && p.id === newResource.type);
                     if (plantTypeDef?.color) color = plantTypeDef.color;
                 }

                 const material = new THREE.MeshStandardMaterial({ color: color, roughness: 0.9, metalness: 0.1, side: THREE.DoubleSide });
                 const mesh = new THREE.Mesh(geo, material);
                 mesh.position.set(newResource.position.x, newResource.position.y + posYOffset, newResource.position.z);
                 mesh.scale.set(newResource.scale, newResource.scale, newResource.scale);
                 mesh.rotation.y = Utils.randomFloat(0, Math.PI * 2);
                  // Rotate cloth flat
                  if(newResource.type === 'cloth') mesh.rotation.x = -Math.PI / 2;

                 mesh.castShadow = false;
                 mesh.receiveShadow = true;

                 newResource.meshes = [mesh];
                 this.game.scene.add(mesh);
                 meshCreated = true;
             } catch(error) {
                  console.error(`[RM Respawn] Error creating mesh for ${respawnData.type}:`, error);
             }
         }
        // Add logic for trees/stones here if they respawn

        if (meshCreated) {
            this.registerResource(newResource); // Register the newly created resource
            // console.log(`[RM Respawn] Successfully respawned ${newResource.type} (ID: ${newResource.id})`);
        } else {
             console.warn(`[RM Respawn] Could not recreate mesh for ${respawnData.type} (ID: ${respawnData.id})`);
        }
    }
    // --- END MODIFICATION ---


    getResourcesNear(position, radius) {
        const nearbyResources = [];
         if (!position) return nearbyResources;
        const checkedIds = new Set();
        const radiusSq = radius * radius;
        const minGridX = Math.floor((position.x - radius) / this.gridSize);
        const maxGridX = Math.floor((position.x + radius) / this.gridSize);
        const minGridZ = Math.floor((position.z - radius) / this.gridSize);
        const maxGridZ = Math.floor((position.z + radius) / this.gridSize);

        for (let gridX = minGridX; gridX <= maxGridX; gridX++) {
            for (let gridZ = minGridZ; gridZ <= maxGridZ; gridZ++) {
                const cellKey = `${gridX},${gridZ}`;
                if (this.spatialMap.has(cellKey)) {
                    const resourceIds = this.spatialMap.get(cellKey);
                    for (const id of resourceIds) {
                        if (checkedIds.has(id)) continue;

                        const resource = this.resourceMap.get(id);
                        if (!resource || !resource.position) continue; // Check resource and position exist

                        // Precise distance check (XZ plane)
                        const dx = resource.position.x - position.x;
                        const dz = resource.position.z - position.z;
                        const distSq = dx*dx + dz*dz;

                        if (distSq <= radiusSq) {
                            nearbyResources.push(resource);
                        }
                        checkedIds.add(id); // Mark as checked
                    }
                }
            }
        }
        return nearbyResources;
    }


    getResource(id) {
        return this.resourceMap.get(id);
    }

    // --- UPDATED: harvestResource handles cloth and destructible buildings/structures ---
    harvestResource(resourceId, player) {
        const resource = this.resourceMap.get(resourceId);
        if (!resource || resource.health <= 0 || !player) return null; // Added player check

        const tool = player.getSelectedTool(); // Get tool from player controller

        const inRange = this.isInHarvestRange(player.position, resource.position);
        // console.log(`[RM Harvest] Resource: ${resourceId}, In Range: ${inRange}`); // DEBUG

        if (!inRange) {
            // console.log("[RM Harvest] Resource not in range"); // DEBUG
            return null;
        }

        let damage = 1;
        let harvestMultiplier = 1;
        let toolBroke = false; // Flag if tool breaks during harvest

        // Determine required tool
        let requiredTool = player.getRequiredTool(resource.type);
        if (resource.type === 'building' || resource.type === 'structure') {
            requiredTool = 'axe'; // Assume axe for destroying wood structures
        }

        if (tool) {
             if (tool.id === requiredTool) {
                 const itemDef = this.game.inventory.getItemById(tool.id);
                 damage = itemDef?.damage || 5;
                 harvestMultiplier = itemDef?.harvestMultiplier || 1.5;
                 // console.log(`[RM Harvest] Using tool ${tool.id}. Dmg: ${damage}, Mult: ${harvestMultiplier}`); // DEBUG

                 // --- Durability Handling ---
                 const quickBarIndex = player.game.inventory.selectedSlot;
                 const inventorySlotIndex = player.game.inventory.quickBarSlots[quickBarIndex];
                  // Ensure the item in the slot matches the tool we checked
                 if (inventorySlotIndex !== null && player.game.inventory.inventorySlots[inventorySlotIndex]?.id === tool.id) {
                     const inventoryTool = player.game.inventory.inventorySlots[inventorySlotIndex];
                     if (typeof inventoryTool.durability === 'number') {
                          inventoryTool.durability -= 1;
                          // console.log(`[RM Harvest] Tool durability: ${inventoryTool.durability}`); // DEBUG
                          if (inventoryTool.durability <= 0) {
                              const toolName = inventoryTool.name;
                              player.game.inventory.removeItem(tool.id, 1); // Use inventory method to remove
                              this.game.uiManager?.showNotification(`${toolName} broke!`, 2500);
                              console.log(`${toolName} broke!`);
                              toolBroke = true; // Set flag
                           }
                           this.game.uiManager?.updateInventoryUI(player.game.inventory); // Update UI regardless
                      }
                  } else { /* console.warn("[RM Harvest] Tool mismatch for durability check."); */ } // DEBUG
                 // --- End Durability ---

             } else { /* console.log(`[RM Harvest] Wrong tool (${tool.id}). Base dmg.`);*/ } // DEBUG
        } else {
             // Check if resource can be harvested by hand
             if (resource.type === 'cloth' || resource.type === 'fiber' || resource.type === 'medicinalherb' || ['blueberry', 'carrot', 'onion'].includes(resource.type)) { // Expand hand-harvestable types
                 damage = 5; // Allow hand harvesting with decent speed
                 harvestMultiplier = 1;
             } else {
                 // Can't harvest trees/rocks/buildings by hand
                 if (requiredTool) {
                     this.game.uiManager?.showNotification(`Need a ${requiredTool} to harvest ${resource.name || resource.type}!`, 2000);
                 } else {
                      this.game.uiManager?.showNotification(`Cannot harvest ${resource.name || resource.type} by hand!`, 2000);
                 }
                 return null;
             }
        }

        // Apply damage only if the tool didn't just break
        if (!toolBroke) {
             resource.health -= damage;
             // console.log(`[RM Harvest] Resource ${resourceId} health: ${resource.health} (Dmg: ${damage})`); // DEBUG

             // Visual feedback (e.g., slight shake) - Optional
             if (resource.meshes && resource.meshes[0]) {
                 // Simple shake effect
                 const mesh = resource.meshes[0];
                 const shakeIntensity = 0.05;
                 const originalPos = mesh.position.clone();
                 mesh.position.x += (Math.random() - 0.5) * shakeIntensity;
                 mesh.position.z += (Math.random() - 0.5) * shakeIntensity;
                 setTimeout(() => { if(mesh) mesh.position.copy(originalPos); }, 50); // Reset position quickly
             }
        }


        if (resource.health <= 0) {
            // console.log(`[RM Harvest] Resource ${resourceId} depleted.`); // DEBUG
            const harvestedResources = {};
            const baseResources = resource.resources || {};

             if (Object.keys(baseResources).length === 0 && !['crate', 'barrel', 'building', 'structure', 'crafting'].includes(resource.type)) {
                 console.warn(`[RM Harvest] Resource ${resource.type} (ID: ${resourceId}) has no 'resources' defined! Defaulting yield.`);
                 // Define default yield based on type if 'resources' is missing
                 if (resource.type === 'cloth') baseResources.cloth = 1;
                 else if (resource.type === 'fiber') baseResources.fiber = 1;
                 else if (resource.type === 'tree') baseResources.wood = 1;
                 else if (resource.type === 'stone') baseResources.stone = 1;
                 else if (resource.type === 'iron') baseResources.ironore = 1;
                 // Add other defaults...
             }

            for (const [resourceType, baseAmount] of Object.entries(baseResources)) {
                 if (!resourceType || baseAmount === undefined) continue; // Skip invalid entries
                const validBaseAmount = (typeof baseAmount === 'number' && baseAmount > 0) ? baseAmount : 1;
                const actualAmount = Math.max(1, Math.floor(validBaseAmount * harvestMultiplier));
                harvestedResources[resourceType] = actualAmount;
                const added = this.game.inventory.addItem(resourceType, actualAmount); // Add to player inventory
                if (!added) {
                    console.warn(`[RM Harvest] Inventory full? Failed add ${actualAmount} ${resourceType}.`);
                    // TODO: Implement dropping items on the ground if inventory is full
                 }
            }

            this.removeResource(resourceId); // Remove from world

            // console.log(`[RM Harvest] Harvested ${resource.type}, Gained:`, harvestedResources); // DEBUG
            return harvestedResources;
        }

        return {}; // Return empty object if not fully depleted
    }
    // --- END UPDATE ---

    // --- UPDATED METHOD: searchResource includes barrels ---
    searchResource(resourceId, player) {
        const resource = this.resourceMap.get(resourceId);
        // <<-- MODIFIED: Allow searching 'barrel' type -->>
        if (!resource || !['crate', 'barrel'].includes(resource.type) || !player) {
            // console.warn(`Attempted to search invalid resource or no player: ${resourceId} (${resource?.type})`); // Less verbose
            return null;
        }

        if (resource.searched) {
            this.game.uiManager?.showNotification("Already Searched", 1500);
            return null;
        }

        const inRange = this.isInHarvestRange(player.position, resource.position);
        if (!inRange) {
            // console.log("[RM Search] Container not in range");
            return null;
        }

        // Mark as searched immediately
        resource.searched = true;

        // Change appearance (e.g., make slightly transparent or change texture)
        if (resource.meshes && resource.meshes[0] && resource.meshes[0].material) {
            // Clone material before modifying if it might be shared
             const originalMaterial = resource.meshes[0].material;
             resource.meshes[0].material = originalMaterial.clone();
             resource.meshes[0].material.opacity = 0.6;
             resource.meshes[0].material.transparent = true;
             resource.meshes[0].material.needsUpdate = true; // Important after changing transparency
             // Consider disposing the original material if it's unique and no longer needed
             // originalMaterial.dispose(); // Be careful with this if materials are shared
        }

        // Determine loot
        const lootTableName = resource.lootTable || (resource.type === 'crate' ? 'CRATE_COMMON' : (resource.type === 'barrel' ? 'BARREL_COMMON' : null)); // <<-- MODIFIED: Select barrel table
        if (!lootTableName) {
             console.error(`Could not determine loot table for resource type: ${resource.type}`);
             return null;
         }
        const lootTable = Constants.LOOT_TABLES?.[lootTableName]; // Use optional chaining
        if (!lootTable) {
            console.error(`Loot table '${lootTableName}' not found in Constants!`);
            return null;
        }

        const obtainedLoot = {};
        const itemsToAdd = []; // Collect items to add at the end

        // Roll for items in the table
        lootTable.forEach(itemEntry => {
             if (!itemEntry || typeof itemEntry.chance !== 'number' || !itemEntry.id || itemEntry.amount === undefined) {
                 console.warn("Skipping invalid loot table entry:", itemEntry);
                 return;
             }
            if (Math.random() <= itemEntry.chance) {
                let amount = 1;
                if (Array.isArray(itemEntry.amount)) {
                     const min = Number(itemEntry.amount[0]) || 1;
                     const max = Number(itemEntry.amount[1]) || min;
                    amount = Utils.random(min, Math.max(min, max));
                } else {
                    amount = Number(itemEntry.amount) || 1;
                }
                if (amount > 0) {
                    itemsToAdd.push({ id: itemEntry.id, amount: amount });
                }
            }
        });

        // Add items to inventory and track what was obtained
        let lootAdded = false;
        itemsToAdd.forEach(item => {
             const added = this.game.inventory.addItem(item.id, item.amount);
             if (added) {
                 obtainedLoot[item.id] = (obtainedLoot[item.id] || 0) + item.amount;
                 lootAdded = true;
             } else {
                 console.warn(`Inventory full, could not add ${item.amount}x ${item.id} from ${resource.type}`);
             }
         });

        console.log(`Searched ${resource.name}, Found:`, obtainedLoot);
        // Show UI notification for loot
        if (lootAdded) {
             const text = Object.entries(obtainedLoot).map(([id, amt]) => {
                 const i = this.game.inventory?.getItemById(id);
                 return `${i?.name ?? id} x${amt}`;
             }).join(', ');
             this.game.uiManager?.showNotification(`Found: ${text}`);
        } else {
            this.game.uiManager?.showNotification(`${resource.name} is empty`);
        }

        // Containers are typically not removed, just marked searched / visually changed
        // If you want them removed after searching:
        // setTimeout(() => this.removeResource(resourceId), 1000); // Remove after 1 sec

        return obtainedLoot;
    }
    // --- END NEW METHOD ---

    isInHarvestRange(playerPos, resourcePos) {
         if (!playerPos || !resourcePos) return false;
        const range = Constants?.PLAYER?.INTERACTION_RANGE ?? 3;
        const rangeSq = range * range;
        const dx = playerPos.x - resourcePos.x;
        const dz = playerPos.z - resourcePos.z;
        // Optional: Consider Y distance too? Usually interaction range is cylindrical.
        // const dy = playerPos.y - resourcePos.y;
        // const distSq = dx*dx + dy*dy + dz*dz;
        const distSq = dx * dx + dz * dz; // XZ distance check
        return distSq <= rangeSq;
    }


    update(deltaTime) {
        this.processRespawns();
        // Other periodic updates for resource manager if needed
    }
}