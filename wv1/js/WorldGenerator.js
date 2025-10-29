// --- START OF FILE WorldGenerator.js ---

class WorldGenerator {
    constructor(game) {
        this.game = game;
        this.terrain = game.terrain;
        this.resourceManager = null; // Will be assigned in generateWorld
    }

    async generateWorld() {
        // ... (rest of generateWorld remains the same) ...
        console.log("Generating world...");
        await this.terrain.generate();
        this.resourceManager = this.game.resourceManager;
        await this.generateCaveResources();
        await this.generateTrees();
        await this.generateStones();
        await this.generatePlants();
        // --- Call MODIFIED barrel generation ---
        await this.generateBarrels();
        // ---
        await this.generateSimpleBuildings();
        await this.game.entityManager.spawnInitialAnimals();
        await this.game.entityManager.spawnInitialHunters();
        console.log("World generation complete");
        return true;
    }

    async generateCaveResources() {
        // ... (generateCaveResources remains the same) ...
         console.log("Generating cave resources...");
        if (!this.terrain.caveEntrances || this.terrain.caveEntrances.length === 0) { console.log("No cave entrances found to populate."); return; }
        const oreTypes = ['iron', 'copper', 'zinc'];
        const oreModelGeo = this.game.assetLoader.getModel('rock'); if (!oreModelGeo) { console.error("Rock geometry failed to load for cave ores."); return; } // Safety check
        const oreMaterials = { 'iron': new THREE.MeshStandardMaterial({ map: this.game.assetLoader.getTexture('stone'), color: 0xa19d94, roughness: 0.8, metalness: 0.3 }), 'copper': new THREE.MeshStandardMaterial({ map: this.game.assetLoader.getTexture('stone'), color: 0xb87333, roughness: 0.8, metalness: 0.4 }), 'zinc': new THREE.MeshStandardMaterial({ map: this.game.assetLoader.getTexture('stone'), color: 0xd3d4d5, roughness: 0.7, metalness: 0.5 }) };
        let totalCaveOres = 0;
        for (const entrance of this.terrain.caveEntrances) {
            const oresInThisCave = Math.floor(Constants.WORLD.MAX_CAVE_ORES * Constants.WORLD.CAVE_ORE_DENSITY); let spawnedInCave = 0; const spawnRadius = Constants.WORLD.CAVE_ORE_SPAWN_RADIUS;
            for (let i = 0; i < oresInThisCave; i++) {
                let oreX, oreZ, oreY, attempts = 0; let placeable = false;
                while (attempts < 30 && !placeable) {
                    attempts++; const angle = Math.random() * Math.PI * 2; const radius = Utils.randomFloat(entrance.radius * 0.5, spawnRadius); oreX = entrance.x + Math.cos(angle) * radius; oreZ = entrance.z + Math.sin(angle) * radius; oreY = this.terrain.getHeightAt(oreX, oreZ);
                    if (oreY !== undefined && oreY < entrance.y - 1.5 && oreY > this.terrain.waterLevel + 0.5) { placeable = true; }
                }
                if (placeable) {
                    const scale = Utils.randomFloat(0.6, 1.8); const oreType = oreTypes[Math.floor(Math.random() * oreTypes.length)]; const oreMesh = new THREE.Mesh(oreModelGeo.clone(), oreMaterials[oreType]); oreMesh.position.set(oreX, oreY + scale * 0.2, oreZ); oreMesh.scale.set(scale, scale, scale); oreMesh.rotation.set(Math.random()*Math.PI, Math.random()*Math.PI*2, Math.random()*Math.PI); oreMesh.castShadow = true; oreMesh.receiveShadow = true; this.game.scene.add(oreMesh);
                    const oreResource = { id: `cave_ore_${totalCaveOres}`, type: oreType, name: `${oreType.charAt(0).toUpperCase() + oreType.slice(1)} Node (Cave)`, health: Constants.RESOURCES.STONE_HEALTH, maxHealth: Constants.RESOURCES.STONE_HEALTH, position: { x: oreX, y: oreY + scale * 0.2, z: oreZ }, scale: scale, meshes: [oreMesh], resources: { stone: Math.max(1, Math.floor(Utils.random(1, 3) * scale)), [`${oreType}ore`]: Math.max(1, Math.floor(Utils.random(2, 5) * scale)) }, regrowTime: null, isCaveResource: true };
                    this.resourceManager.registerResource(oreResource); spawnedInCave++; totalCaveOres++;
                }
            }
            console.log(`Spawned ${spawnedInCave} ore nodes in cave near ${entrance.x.toFixed(0)}, ${entrance.z.toFixed(0)}`);
        }
        console.log(`Generated ${totalCaveOres} total cave ore nodes.`);
    }

    async generateTrees() {
        // ... (generateTrees remains the same) ...
         console.log("Generating trees...");
        const worldSize = Constants.WORLD.SIZE; const maxTrees = Constants.WORLD.MAX_TREES; const treeDensity = Constants.WORLD.TREE_DENSITY; const treesToSpawn = Math.floor(maxTrees * treeDensity);
        const treeModel = this.game.assetLoader.getModel('tree'); if (!treeModel || !treeModel.trunk || !treeModel.leaves) { console.error("Tree model geometry not loaded correctly."); return; } const trunkGeo = treeModel.trunk; const leavesGeo = treeModel.leaves; const barkTexture = this.game.assetLoader.getTexture('tree_bark'); const leafTexture = this.game.assetLoader.getTexture('leaves'); const trunkMaterial = new THREE.MeshStandardMaterial({ map: barkTexture, roughness: 0.9, metalness: 0.1 }); const leavesMaterial = new THREE.MeshStandardMaterial({ map: leafTexture, roughness: 0.8, metalness: 0.1, side: THREE.DoubleSide, alphaTest: 0.5 }); const halfSize = worldSize / 2; let spawnedCount = 0;
        for (let i = 0; i < treesToSpawn; i++) {
            let x, z, biome, height, attempts = 0;
            do { x = Utils.randomFloat(-halfSize, halfSize); z = Utils.randomFloat(-halfSize, halfSize); height = this.terrain.getHeightAt(x, z); if (height === undefined) { attempts++; continue; } biome = this.terrain.getBiomeAt(x, z); attempts++; if (attempts > 100) break; } while (biome < 2 || height < this.terrain.waterLevel + 0.5);
            if (attempts > 100) continue; const scale = Utils.randomFloat(0.8, 1.5); const rotation = Utils.randomFloat(0, Math.PI * 2); const trunk = new THREE.Mesh(trunkGeo.clone(), trunkMaterial); trunk.position.set(x, height, z); trunk.scale.set(scale, scale, scale); trunk.castShadow = true; trunk.receiveShadow = true; const leaves = new THREE.Mesh(leavesGeo.clone(), leavesMaterial); leaves.position.set(x, height + 5 * scale, z); leaves.scale.set(scale, scale, scale); leaves.rotation.y = rotation; leaves.castShadow = true; this.game.scene.add(trunk); this.game.scene.add(leaves);
            const treeResource = { id: `tree_${spawnedCount}`, type: 'tree', name: 'Tree', health: Constants.RESOURCES.TREE_HEALTH, maxHealth: Constants.RESOURCES.TREE_HEALTH, position: { x, y: height, z }, scale: scale, meshes: [trunk, leaves], resources: { wood: Math.max(1, Math.floor(Utils.random(3, 6) * scale)), fiber: Math.max(0, Math.floor(Utils.random(0, 2) * scale)) }, regrowTime: null };
            this.resourceManager.registerResource(treeResource); spawnedCount++;
        }
        console.log(`Generated ${spawnedCount} trees`);
    }

    async generateStones() {
        // ... (generateStones remains the same) ...
        console.log("Generating surface stones...");
        const worldSize = Constants.WORLD.SIZE; const maxStones = Constants.WORLD.MAX_STONES; const stoneDensity = Constants.WORLD.STONE_DENSITY; const stonesToSpawn = Math.floor(maxStones * stoneDensity);
        const stoneGeo = this.game.assetLoader.getModel('rock'); if (!stoneGeo) { console.error("Rock model geometry not loaded."); return; } const stoneTexture = this.game.assetLoader.getTexture('stone'); const stoneMaterials = { 'stone': new THREE.MeshStandardMaterial({ map: stoneTexture, roughness: 0.9, metalness: 0.1 }), 'iron': new THREE.MeshStandardMaterial({ map: stoneTexture, color: 0xa19d94, roughness: 0.8, metalness: 0.3 }), 'copper': new THREE.MeshStandardMaterial({ map: stoneTexture, color: 0xb87333, roughness: 0.8, metalness: 0.4 }), 'zinc': new THREE.MeshStandardMaterial({ map: stoneTexture, color: 0xd3d4d5, roughness: 0.7, metalness: 0.5 }) }; const halfSize = worldSize / 2; let spawnedCount = 0; const checkRadiusSq = Constants.WORLD.CAVE_ENTRANCE_RADIUS * Constants.WORLD.CAVE_ENTRANCE_RADIUS;
        for (let i = 0; i < stonesToSpawn; i++) {
            let x, z, biome, height, attempts = 0; let tooCloseToCave = false;
            do { x = Utils.randomFloat(-halfSize, halfSize); z = Utils.randomFloat(-halfSize, halfSize); height = this.terrain.getHeightAt(x, z); if (height === undefined) { attempts++; continue; } biome = this.terrain.getBiomeAt(x, z); attempts++; if (attempts > 100) break; tooCloseToCave = this.terrain.caveEntrances.some(entrance => { const dx = x - entrance.x; const dz = z - entrance.z; return (dx * dx + dz * dz < checkRadiusSq * 1.5); }); } while (biome === 0 || height < this.terrain.waterLevel || tooCloseToCave);
            if (attempts > 100 || tooCloseToCave) continue; const scale = Utils.randomFloat(0.5, 2.5); const rotation = Utils.randomFloat(0, Math.PI * 2); const posY = height + (scale * 0.2); let stoneType = 'stone'; const oreChance = biome === 4 ? 0.5 : 0.2; if (Math.random() < oreChance) { const oreRoll = Math.random(); if (oreRoll < 0.6) stoneType = 'iron'; else if (oreRoll < 0.85) stoneType = 'copper'; else stoneType = 'zinc'; }
            const stoneMesh = new THREE.Mesh(stoneGeo.clone(), stoneMaterials[stoneType]); stoneMesh.position.set(x, posY, z); stoneMesh.scale.set(scale, scale, scale); stoneMesh.rotation.set(Utils.randomFloat(0, 0.3), rotation, Utils.randomFloat(0, 0.3)); stoneMesh.castShadow = true; stoneMesh.receiveShadow = true; this.game.scene.add(stoneMesh);
            const stoneResource = { id: `stone_${spawnedCount}`, type: stoneType, name: `${stoneType.charAt(0).toUpperCase() + stoneType.slice(1)} Node`, health: Constants.RESOURCES.STONE_HEALTH, maxHealth: Constants.RESOURCES.STONE_HEALTH, position: { x, y: posY, z }, scale: scale, meshes: [stoneMesh], resources: {}, regrowTime: null }; const stoneYield = Math.max(1, Math.floor(Utils.random(2, 5) * scale)); stoneResource.resources.stone = stoneYield; if (stoneType === 'iron') stoneResource.resources.ironore = Math.max(1, Math.floor(Utils.random(1, 3) * scale)); else if (stoneType === 'copper') stoneResource.resources.copperore = Math.max(1, Math.floor(Utils.random(1, 3) * scale)); else if (stoneType === 'zinc') stoneResource.resources.zincore = Math.max(1, Math.floor(Utils.random(1, 3) * scale));
            this.resourceManager.registerResource(stoneResource); spawnedCount++;
        }
        console.log(`Generated ${spawnedCount} surface stones/ore nodes`);
    }

    async generatePlants() {
        // ... (generatePlants remains the same) ...
        console.log("Generating plants...");
        const worldSize = Constants.WORLD.SIZE; const maxPlants = Constants.WORLD.MAX_FIBER_PLANTS; const plantDensity = Constants.WORLD.FIBER_DENSITY; const plantsToSpawn = Math.floor(maxPlants * plantDensity);
        const plantGeo = this.game.assetLoader.getModel('plant'); if (!plantGeo) { console.error("Plant model geometry not loaded."); return; } const plantTypes = Constants.ITEMS.RESOURCES.filter(item => item && ['fiber', 'blueberry', 'carrot', 'onion', 'medicinalherb'].includes(item.id) ); if (plantTypes.length === 0) { console.warn("No plant types defined for generation."); return; } const plantMaterials = {}; plantTypes.forEach(type => { let color = 0x556b2f; if (type.color) { color = type.color; } plantMaterials[type.id] = new THREE.MeshStandardMaterial({ color: color, roughness: 0.9, metalness: 0.1 }); }); const halfSize = worldSize / 2; let spawnedCount = 0; const checkRadiusSq = Constants.WORLD.CAVE_ENTRANCE_RADIUS * Constants.WORLD.CAVE_ENTRANCE_RADIUS;
        for (let i = 0; i < plantsToSpawn; i++) {
            let x, z, biome, height, attempts = 0; let tooCloseToCave = false;
            do { x = Utils.randomFloat(-halfSize, halfSize); z = Utils.randomFloat(-halfSize, halfSize); height = this.terrain.getHeightAt(x, z); if (height === undefined) { attempts++; continue; } biome = this.terrain.getBiomeAt(x, z); attempts++; if (attempts > 100) break; tooCloseToCave = this.terrain.caveEntrances.some(entrance => { const dx = x - entrance.x; const dz = z - entrance.z; return (dx * dx + dz * dz < checkRadiusSq); }); } while (biome === 0 || height < this.terrain.waterLevel || tooCloseToCave);
            if (attempts > 100 || tooCloseToCave) continue; let plantTypeDef = plantTypes.find(p => p.id === 'fiber') || plantTypes[0]; const roll = Math.random(); if (biome === 1) { plantTypeDef = plantTypes.find(p=>p.id==='fiber') || plantTypes[0]; } else if (biome === 2) { if (roll < 0.6) plantTypeDef = plantTypes.find(p=>p.id==='fiber') || plantTypes[0]; else if (roll < 0.8) plantTypeDef = plantTypes.find(p=>p.id==='carrot') || plantTypes[0]; else plantTypeDef = plantTypes.find(p=>p.id==='onion') || plantTypes[0]; } else if (biome === 3) { if (roll < 0.5) plantTypeDef = plantTypes.find(p=>p.id==='fiber') || plantTypes[0]; else if (roll < 0.7) plantTypeDef = plantTypes.find(p=>p.id==='blueberry') || plantTypes[0]; else plantTypeDef = plantTypes.find(p=>p.id==='medicinalherb') || plantTypes[0]; } else { if (roll < 0.7) plantTypeDef = plantTypes.find(p=>p.id==='fiber') || plantTypes[0]; else plantTypeDef = plantTypes.find(p=>p.id==='medicinalherb') || plantTypes[0]; } if (!plantTypeDef) plantTypeDef = plantTypes[0];
            const scale = Utils.randomFloat(0.3, 0.8); const plantMaterial = plantMaterials[plantTypeDef.id] || plantMaterials[plantTypes[0].id]; if (!plantMaterial) { console.warn(`No material for plant type ${plantTypeDef.id}`); continue; }
            const plantMesh = new THREE.Mesh(plantGeo.clone(), plantMaterial); plantMesh.position.set(x, height, z); plantMesh.scale.set(scale, scale, scale); plantMesh.rotation.y = Utils.randomFloat(0, Math.PI * 2); plantMesh.castShadow = false; plantMesh.receiveShadow = true; this.game.scene.add(plantMesh);
            const plantResource = { id: `plant_${spawnedCount}`, type: plantTypeDef.id, name: plantTypeDef.name, health: 10, maxHealth: 10, position: { x, y: height, z }, scale: scale, meshes: [plantMesh], resources: {}, regrowTime: Constants.RESOURCES.PLANT_REGROW_TIME * 60 * 1000 }; if (plantTypeDef.id === 'fiber') plantResource.resources.fiber = Utils.random(1, 3); else if (['blueberry', 'carrot', 'onion'].includes(plantTypeDef.id)) { plantResource.resources[plantTypeDef.id] = Utils.random(1, 2); if (Math.random() < 0.5) plantResource.resources.fiber = 1; } else if (plantTypeDef.id === 'medicinalherb') { plantResource.resources.medicinalherb = Utils.random(1, 2); if (Math.random() < 0.3) plantResource.resources.fiber = 1; }
            this.resourceManager.registerResource(plantResource); spawnedCount++;
        }
        console.log(`Generated ${spawnedCount} plants`);
    }

    // --- MODIFIED: generateBarrels uses OBJ ---
    async generateBarrels() {
        console.log("Generating barrels...");
        const worldSize = Constants.WORLD.SIZE;
        const maxBarrels = 150;
        const barrelDensity = 0.6;
        const barrelsToSpawn = Math.floor(maxBarrels * barrelDensity);

        // --- Get Barrel Model from AssetLoader ---
        // getModel('barrel') should now return the cloned THREE.Group from the OBJ
        const barrelModelGroup = this.game.assetLoader.getModel('barrel');
        if (!barrelModelGroup || !(barrelModelGroup instanceof THREE.Object3D)) {
             console.error("Barrel OBJ model not loaded correctly or not found in AssetLoader.");
             return;
         }
         // We'll clone this group inside the loop for each instance

        // --- Define a standard material to apply ---
        const barrelMaterial = new THREE.MeshStandardMaterial({
            map: this.game.assetLoader.getTexture('wood'), // Use wood texture
            color: 0x8B4513, // Brown color tint
            roughness: 0.8,
            metalness: 0.2
        });
        // ---

        const halfSize = worldSize / 2;
        let spawnedCount = 0;
        const checkRadiusSq = Constants.WORLD.CAVE_ENTRANCE_RADIUS * Constants.WORLD.CAVE_ENTRANCE_RADIUS;

        for (let i = 0; i < barrelsToSpawn; i++) {
            let x, z, biome, height, attempts = 0;
            let tooCloseToCave = false;
            let onSteepSlope = false;
            do {
                x = Utils.randomFloat(-halfSize, halfSize);
                z = Utils.randomFloat(-halfSize, halfSize);
                height = this.terrain.getHeightAt(x, z);
                attempts++; if (attempts > 100) break;

                if (height === undefined || height < this.terrain.waterLevel + 0.1) continue;
                biome = this.terrain.getBiomeAt(x, z);

                tooCloseToCave = this.terrain.caveEntrances.some(entrance => {
                    const dx = x - entrance.x; const dz = z - entrance.z;
                    return (dx * dx + dz * dz < checkRadiusSq);
                });

                 const heightDx = this.terrain.getHeightAt(x + 0.1, z);
                 const heightDz = this.terrain.getHeightAt(x, z + 0.1);
                 if (heightDx === undefined || heightDz === undefined) continue;
                 const slope = Math.abs(heightDx - height) + Math.abs(heightDz - height);
                 onSteepSlope = slope > 0.3;

            } while (biome === 0 || tooCloseToCave || onSteepSlope);

            if (attempts > 100) continue;

            // --- Clone the loaded OBJ group for this instance ---
            const barrelInstance = barrelModelGroup.clone();
            // ---

            const scale = Utils.randomFloat(0.8, 1.2);
            // Set position - Assuming OBJ origin is at the base. Adjust if needed.
            barrelInstance.position.set(x, height, z);
            barrelInstance.scale.set(scale, scale, scale);
            barrelInstance.rotation.y = Utils.randomFloat(0, Math.PI * 2);

            // --- Set shadows and apply standard material recursively ---
            barrelInstance.traverse(child => {
                if (child.isMesh) {
                    child.castShadow = true;
                    child.receiveShadow = true;
                    child.material = barrelMaterial; // Override OBJ materials
                }
            });
            // ---
            this.game.scene.add(barrelInstance);

            const barrelResource = {
                id: `barrel_${spawnedCount}`,
                type: 'barrel',
                name: 'Barrel',
                health: 10, maxHealth: 10,
                position: barrelInstance.position.clone(),
                scale: scale,
                meshes: [barrelInstance], // Store the group as the primary mesh reference
                resources: {},
                regrowTime: null,
                lootTable: 'BARREL_COMMON',
                searched: false
            };
            this.resourceManager.registerResource(barrelResource);
            spawnedCount++;
        }
        console.log(`Generated ${spawnedCount} barrels`);
    }
    // --- END MODIFICATION ---

    async generateSimpleBuildings() {
        // ... (generateSimpleBuildings remains the same) ...
        console.log("Generating simple buildings...");
        const worldSize = Constants.WORLD.SIZE; const buildingCount = 30; const buildingSize = Constants.BUILDING.FOUNDATION_SIZE; const halfSize = worldSize / 2; let buildingsSpawned = 0;
        const wallMaterial = new THREE.MeshStandardMaterial({ map: this.game.assetLoader.getTexture('wood'), roughness: 0.8, metalness: 0.2 }); const wallGeo = this.game.assetLoader.getModel('wall'); if (!wallGeo) { console.error("Wall geometry not loaded for buildings."); return; } const containerGeo = this.game.assetLoader.getModel('crate'); if (!containerGeo) { console.error("Crate geometry not loaded for buildings."); return; } const containerMaterial = new THREE.MeshStandardMaterial({ map: this.game.assetLoader.getTexture('wood'), color: 0xCD853F, roughness: 0.8 });
        for (let i = 0; i < buildingCount; i++) {
            let attempts = 0; let placeable = false; let centerX, centerZ, avgHeight;
            while(attempts < 100 && !placeable) {
                attempts++; centerX = Utils.randomFloat(-halfSize * 0.8, halfSize * 0.8); centerZ = Utils.randomFloat(-halfSize * 0.8, halfSize * 0.8); const corners = [ {x: centerX - buildingSize/2, z: centerZ - buildingSize/2}, {x: centerX + buildingSize/2, z: centerZ - buildingSize/2}, {x: centerX - buildingSize/2, z: centerZ + buildingSize/2}, {x: centerX + buildingSize/2, z: centerZ + buildingSize/2}, {x: centerX, z: centerZ} ]; let minH = Infinity, maxH = -Infinity; let totalH = 0; let validHeights = true;
                for (const corner of corners) { const h = this.terrain.getHeightAt(corner.x, corner.z); if (h === undefined || h < this.terrain.waterLevel + 0.2) { validHeights = false; break; } minH = Math.min(minH, h); maxH = Math.max(maxH, h); totalH += h; } if (!validHeights) continue; const heightDiff = maxH - minH;
                const tooCloseToCave = this.terrain.caveEntrances.some(entrance => { const dx = centerX - entrance.x; const dz = centerZ - entrance.z; return (dx*dx + dz*dz < (Constants.WORLD.CAVE_ENTRANCE_RADIUS * 3)**2); });
                if (heightDiff < 1.0 && !tooCloseToCave) { placeable = true; avgHeight = totalH / corners.length; }
            }
            if (placeable) {
                const doorSideIndex = Utils.random(0, 3); const wallPositions = [ { side: 'N', x: centerX, z: centerZ - buildingSize / 2, rot: 0 }, { side: 'S', x: centerX, z: centerZ + buildingSize / 2, rot: Math.PI }, { side: 'E', x: centerX + buildingSize / 2, z: centerZ, rot: Math.PI / 2 }, { side: 'W', x: centerX - buildingSize / 2, z: centerZ, rot: -Math.PI / 2 } ]; const structureMeshes = []; let doorPosition = null;
                for (const [index, wPos] of wallPositions.entries()) { if (index === doorSideIndex) { doorPosition = wPos; continue; } const wallMesh = new THREE.Mesh(wallGeo.clone(), wallMaterial.clone()); const wallY = avgHeight + Constants.BUILDING.WALL_HEIGHT / 2; wallMesh.position.set(wPos.x, wallY, wPos.z); wallMesh.rotation.y = wPos.rot; wallMesh.castShadow = true; wallMesh.receiveShadow = true; this.game.scene.add(wallMesh); structureMeshes.push(wallMesh); }
                let crateOffsetX = 0; let crateOffsetZ = 0; if (doorPosition) { if (doorPosition.side === 'N') crateOffsetZ = 0.8; if (doorPosition.side === 'S') crateOffsetZ = -0.8; if (doorPosition.side === 'E') crateOffsetX = -0.8; if (doorPosition.side === 'W') crateOffsetX = 0.8; }
                const containerScale = Utils.randomFloat(0.8, 1.2); const containerMesh = new THREE.Mesh(containerGeo.clone(), containerMaterial.clone()); containerMesh.position.set(centerX + crateOffsetX, avgHeight + containerScale * 0.5, centerZ + crateOffsetZ); containerMesh.scale.set(containerScale, containerScale, containerScale); containerMesh.castShadow = true; containerMesh.receiveShadow = true; this.game.scene.add(containerMesh);
                 const containerResource = { id: `building_cache_${buildingsSpawned}`, type: 'crate', name: 'Storage Crate', health: 10, maxHealth: 10, position: containerMesh.position.clone(), scale: containerScale, meshes: [containerMesh], resources: {}, regrowTime: null, lootTable: 'BUILDING_CACHE', searched: false }; this.resourceManager.registerResource(containerResource);
                 const structureResource = { id: `simple_building_${buildingsSpawned}`, type: 'structure', name: 'Abandoned Shack', position: { x: centerX, y: avgHeight, z: centerZ }, meshes: structureMeshes, health: 200, maxHealth: 200, resources: { wood: Utils.random(5, 15), metalscrap: Utils.random(1, 5) }, regrowTime: null }; this.resourceManager.registerResource(structureResource);
                buildingsSpawned++;
            }
        }
        console.log(`Generated ${buildingsSpawned} simple buildings.`);
    }
}

// --- END OF FILE WorldGenerator.js ---