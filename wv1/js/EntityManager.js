// --- START OF FILE EntityManager.js ---

class EntityManager {
    constructor(game) {
        this.game = game;
        this.entities = new Map();
        this.animals = [];
        this.hunters = [];
        this.spatialGrid = new Map();
        this.cellSize = 20;

        // --- Use settings for max counts ---
        // Use ?? operator for defaults if settings are missing
        this.maxAnimals = this.game.settings?.maxAnimals ?? 600;
        this.maxHunters = this.game.settings?.maxHunters ?? 5;
        // ---

        this.animalRespawnTimer = 0;
        this.animalRespawnRate = Constants?.RESOURCES?.ANIMAL_SPAWN_RATE ?? 60; // Use constant for rate
        this.hunterRespawnTimer = 0;
        this.hunterRespawnRate = Constants?.RESOURCES?.HUNTER_SPAWN_RATE ?? 300; // Use constant for rate

         console.log(`EntityManager Initialized: Max Animals = ${this.maxAnimals}, Max Hunters = ${this.maxHunters}`);
    }

    update(deltaTime) {
        // Update all entities
        for (const entity of this.entities.values()) {
            if (entity && typeof entity.update === 'function') {
                 entity.update(deltaTime);
            }
        }

        // Update animal respawn timer
        this.animalRespawnTimer += deltaTime;
        if (this.animalRespawnTimer >= this.animalRespawnRate) {
            this.animalRespawnTimer = 0;
            // --- Check against dynamic maxAnimals ---
            if (this.animals.length < this.maxAnimals) {
                this.spawnRandomAnimal();
            }
            // ---
        }

        // Update hunter respawn timer
        this.hunterRespawnTimer += deltaTime;
        if (this.hunterRespawnTimer >= this.hunterRespawnRate) {
            this.hunterRespawnTimer = 0;
            // --- Check against dynamic maxHunters ---
            if (this.hunters.length < this.maxHunters) {
                this.spawnRandomHunter();
            }
            // ---
        }

        this.updateSpatialGrid();
    }

    registerEntity(entity) {
        if (!entity || !entity.id) {
            console.error("Attempted to register invalid entity:", entity);
            return null;
        }
        // Add to main entities map
        this.entities.set(entity.id, entity);

        // Add to appropriate collection
        if (entity instanceof Animal) {
            this.animals.push(entity);
        } else if (entity instanceof AIHunter) {
            this.hunters.push(entity);
        }

        // Add to spatial grid
        this.addToSpatialGrid(entity);

        return entity;
    }


    removeEntity(entityId) {
        const entity = this.entities.get(entityId);
        if (!entity) return false;

        // Remove from main entities map
        this.entities.delete(entityId);

        // Remove from appropriate collection
        if (entity instanceof Animal) {
            const index = this.animals.findIndex(a => a && a.id === entityId);
            if (index !== -1) {
                this.animals.splice(index, 1);
            }
        } else if (entity instanceof AIHunter) {
            const index = this.hunters.findIndex(h => h && h.id === entityId);
            if (index !== -1) {
                this.hunters.splice(index, 1);
            }
        }

        // Remove from spatial grid
        this.removeFromSpatialGrid(entity);

        return true;
    }


    getEntity(entityId) {
        return this.entities.get(entityId);
    }

    // Spatial grid management
    getCellKey(position) {
        if (!position) return '0,0'; // Fallback key
        const cellX = Math.floor(position.x / this.cellSize);
        const cellZ = Math.floor(position.z / this.cellSize);
        return `${cellX},${cellZ}`;
    }

    addToSpatialGrid(entity) {
        if (!entity || !entity.position || !entity.id) return; // Safety checks
        const cellKey = this.getCellKey(entity.position);

        if (!this.spatialGrid.has(cellKey)) {
            this.spatialGrid.set(cellKey, new Set()); // Use Set for easier management
        }

        this.spatialGrid.get(cellKey).add(entity.id);
    }

    removeFromSpatialGrid(entity) {
         if (!entity || !entity.position || !entity.id) return; // Safety checks
        const cellKey = this.getCellKey(entity.position);

        if (this.spatialGrid.has(cellKey)) {
            const cell = this.spatialGrid.get(cellKey);
            cell.delete(entity.id); // Remove from Set

            // Remove cell if empty
            if (cell.size === 0) {
                this.spatialGrid.delete(cellKey);
            }
        }
    }


    updateSpatialGrid() {
        // Optimize: Instead of clear/rebuild, update only moved entities
        // For simplicity, clear/rebuild is kept for now.
        this.spatialGrid.clear();

        // Rebuild grid with current positions
        for (const entity of this.entities.values()) {
            if (entity && entity.position && entity.id && entity.isAlive !== false) { // Check if alive
                 this.addToSpatialGrid(entity);
             }
        }
    }


    getEntitiesNear(position, radius) {
        const nearbyEntities = [];
        if (!position) return nearbyEntities; // Safety check

        const radiusSq = radius * radius; // Use squared distance for efficiency

        // Get grid cells that overlap the search radius
        const minCellX = Math.floor((position.x - radius) / this.cellSize);
        const maxCellX = Math.floor((position.x + radius) / this.cellSize);
        const minCellZ = Math.floor((position.z - radius) / this.cellSize);
        const maxCellZ = Math.floor((position.z + radius) / this.cellSize);

        const checkedIds = new Set(); // Prevent duplicates if entity spans cells

        // Check each cell
        for (let cellX = minCellX; cellX <= maxCellX; cellX++) {
            for (let cellZ = minCellZ; cellZ <= maxCellZ; cellZ++) {
                const cellKey = `${cellX},${cellZ}`;

                if (this.spatialGrid.has(cellKey)) {
                    const entityIds = this.spatialGrid.get(cellKey);

                    // Check each entity in the cell
                    for (const id of entityIds) {
                         if (checkedIds.has(id)) continue; // Already processed

                        const entity = this.entities.get(id);

                        if (!entity || !entity.position) continue;

                        // Calculate actual squared distance and check against radiusSq
                        const dx = entity.position.x - position.x;
                        const dz = entity.position.z - position.z; // Check XZ plane distance
                        const distSq = dx * dx + dz * dz;

                        if (distSq <= radiusSq) {
                            nearbyEntities.push(entity);
                        }
                         checkedIds.add(id); // Mark as processed
                    }
                }
            }
        }

        return nearbyEntities;
    }

    // --- Modify initial spawn counts if needed, or keep using percentage ---
    async spawnInitialAnimals() {
        console.log("Spawning initial animals...");
        const animalTypes = Constants?.ANIMALS?.TYPES ?? [];
        if (animalTypes.length === 0) {
             console.warn("No animal types defined in Constants. Cannot spawn animals.");
             return false;
        }
        const worldSize = this.game.settings?.worldSize || Constants.WORLD.SIZE;
        const halfSize = worldSize / 2;


        // Distribution (can be adjusted)
        const distribution = {
            'chicken': 0.3, 'rabbit': 0.3, 'deer': 0.2,
            'wolf': 0.1, 'bear': 0.05, 'cougar': 0.05
        };

        // Start with a percentage of the *configured* max
        const initialCount = Math.max(0, Math.floor(this.maxAnimals * 0.7)); // Ensure count is not negative
        let animalsSpawned = 0;
        let totalAttempts = 0;
        const maxTotalAttempts = initialCount * 50; // Limit total attempts

        while (animalsSpawned < initialCount && totalAttempts < maxTotalAttempts) {
            totalAttempts++;
            // Choose random type based on distribution
            const roll = Math.random();
            let cumulativeProbability = 0;
            let chosenType = animalTypes[0].id; // Fallback to first type

            for (const [type, probability] of Object.entries(distribution)) {
                 // Ensure the type exists in the constants before checking probability
                 if (animalTypes.some(at => at.id === type)) {
                     cumulativeProbability += probability;
                     if (roll < cumulativeProbability) {
                         chosenType = type;
                         break;
                     }
                 }
            }


            // Find a valid spawn position
            let spawnPos = null;
            let posAttempts = 0;
            const playerPos = this.game.playerController?.position;

            while (!spawnPos && posAttempts < 50) {
                posAttempts++;
                const x = Utils.randomFloat(-halfSize * 0.9, halfSize * 0.9);
                const z = Utils.randomFloat(-halfSize * 0.9, halfSize * 0.9);
                const y = this.game.terrain?.getHeightAt(x, z);

                if (y === undefined || y === null) continue; // Terrain height failed

                // Check validity
                const isInWater = y < (Constants.WORLD.WATER_LEVEL ?? 2);
                const distToPlayerSq = playerPos ? (x - playerPos.x)**2 + (z - playerPos.z)**2 : Infinity;
                const biome = this.game.terrain?.getBiomeAt(x, z);
                let biomeIsSuitable = false;

                // Biome suitability logic (ensure type exists in Constants)
                const animalDef = animalTypes.find(a => a.id === chosenType);
                if (animalDef) { // Simplified check: avoid water (biome 0)
                    biomeIsSuitable = (biome !== 0);
                    // Add more specific biome checks here if needed based on animalDef
                }

                if (!isInWater && distToPlayerSq > 30*30 && biomeIsSuitable) {
                    spawnPos = { x, y: y + 0.5, z }; // Spawn slightly above ground
                }
            }

            if (spawnPos) {
                try {
                     const animal = new Animal(this.game, chosenType, spawnPos);
                     this.registerEntity(animal);
                     animalsSpawned++;
                 } catch (error) {
                     console.error(`Failed to create/register animal ${chosenType}:`, error);
                 }
            }
        }

        console.log(`Spawned ${animalsSpawned} initial animals (Max Allowed: ${this.maxAnimals}, Attempts: ${totalAttempts})`);
        return true;
    }


    async spawnInitialHunters() {
        console.log("Spawning initial hunters...");
        const worldSize = this.game.settings?.worldSize || Constants.WORLD.SIZE;
        const halfSize = worldSize / 2;
        // Start with a percentage of the *configured* max
        const initialCount = Math.max(0, Math.floor(this.maxHunters * 0.5)); // Ensure not negative
        let huntersSpawned = 0;
        let totalAttempts = 0;
        const maxTotalAttempts = initialCount * 50;

        while (huntersSpawned < initialCount && totalAttempts < maxTotalAttempts) {
             totalAttempts++;
            // Find a valid spawn position
            let spawnPos = null;
            let posAttempts = 0;
            const playerPos = this.game.playerController?.position;

            while (!spawnPos && posAttempts < 50) {
                 posAttempts++;
                // Prefer edges
                let x, z;
                if (Math.random() < 0.7) { // Edge spawn
                    const edge = Math.floor(Math.random() * 4);
                    switch (edge) {
                        case 0: x = Utils.randomFloat(-halfSize * 0.9, halfSize * 0.9); z = -halfSize * 0.9; break; // North
                        case 1: x = halfSize * 0.9; z = Utils.randomFloat(-halfSize * 0.9, halfSize * 0.9); break; // East
                        case 2: x = Utils.randomFloat(-halfSize * 0.9, halfSize * 0.9); z = halfSize * 0.9; break; // South
                        case 3: x = -halfSize * 0.9; z = Utils.randomFloat(-halfSize * 0.9, halfSize * 0.9); break; // West
                    }
                } else { // Random inner spawn
                    x = Utils.randomFloat(-halfSize * 0.8, halfSize * 0.8);
                    z = Utils.randomFloat(-halfSize * 0.8, halfSize * 0.8);
                }

                const y = this.game.terrain?.getHeightAt(x, z);
                if (y === undefined || y === null) continue;

                // Check validity
                const isInWater = y < (Constants.WORLD.WATER_LEVEL ?? 2);
                 const distToPlayerSq = playerPos ? (x - playerPos.x)**2 + (z - playerPos.z)**2 : Infinity;


                if (!isInWater && distToPlayerSq > 50*50) {
                    spawnPos = { x, y: y + 1.0, z }; // Spawn slightly above ground
                }
            }

            if (spawnPos) {
                 try {
                     const hunter = new AIHunter(this.game, spawnPos);
                     this.registerEntity(hunter);
                     huntersSpawned++;
                 } catch (error) {
                     console.error(`Failed to create/register hunter:`, error);
                 }
            }
        }

        console.log(`Spawned ${huntersSpawned} initial hunters (Max Allowed: ${this.maxHunters}, Attempts: ${totalAttempts})`);
        return true;
    }


    // Spawn a random animal in the world
    spawnRandomAnimal() {
        if (this.animals.length >= this.maxAnimals) return null;

        const animalTypes = Constants?.ANIMALS?.TYPES ?? [];
         if (animalTypes.length === 0) return null;

        const typeIndex = Math.floor(Math.random() * animalTypes.length);
        const animalType = animalTypes[typeIndex].id;
        const worldSize = this.game.settings?.worldSize || Constants.WORLD.SIZE;
        const halfSize = worldSize / 2;
        let spawnPos = null;
        let attempts = 0;
        const playerPos = this.game.playerController?.position;

        while (!spawnPos && attempts < 20) {
             attempts++;
            const x = Utils.randomFloat(-halfSize * 0.9, halfSize * 0.9);
            const z = Utils.randomFloat(-halfSize * 0.9, halfSize * 0.9);
            const y = this.game.terrain?.getHeightAt(x, z);
             if (y === undefined || y === null) continue;

            // Check validity
            const isInWater = y < (Constants.WORLD.WATER_LEVEL ?? 2);
            const distToPlayerSq = playerPos ? (x - playerPos.x)**2 + (z - playerPos.z)**2 : Infinity;
            const biome = this.game.terrain?.getBiomeAt(x, z);
            let biomeIsSuitable = (biome !== 0); // Not in water

            if (!isInWater && distToPlayerSq > 50*50 && biomeIsSuitable) {
                spawnPos = { x, y: y + 0.5, z };
            }
        }

        if (spawnPos) {
             try {
                 const animal = new Animal(this.game, animalType, spawnPos);
                 this.registerEntity(animal);
                 console.log(`Spawned new ${animalType} at (${spawnPos.x.toFixed(1)}, ${spawnPos.z.toFixed(1)})`);
                 return animal;
             } catch (error) {
                 console.error(`Failed to spawn random animal ${animalType}:`, error);
                 return null;
             }
        }
        return null;
    }

    // Spawn a random hunter in the world
    spawnRandomHunter() {
        if (this.hunters.length >= this.maxHunters) return null;

        const worldSize = this.game.settings?.worldSize || Constants.WORLD.SIZE;
        const halfSize = worldSize / 2;
        let spawnPos = null;
        let attempts = 0;
        const playerPos = this.game.playerController?.position;

        while (!spawnPos && attempts < 20) {
            attempts++;
            // Random position at edge of world
            let x, z;
            const edge = Math.floor(Math.random() * 4);
             switch (edge) {
                 case 0: x = Utils.randomFloat(-halfSize * 0.9, halfSize * 0.9); z = -halfSize * 0.9; break; // North
                 case 1: x = halfSize * 0.9; z = Utils.randomFloat(-halfSize * 0.9, halfSize * 0.9); break; // East
                 case 2: x = Utils.randomFloat(-halfSize * 0.9, halfSize * 0.9); z = halfSize * 0.9; break; // South
                 case 3: x = -halfSize * 0.9; z = Utils.randomFloat(-halfSize * 0.9, halfSize * 0.9); break; // West
             }

            const y = this.game.terrain?.getHeightAt(x, z);
            if (y === undefined || y === null) continue;

            // Check validity
            const isInWater = y < (Constants.WORLD.WATER_LEVEL ?? 2);
            const distToPlayerSq = playerPos ? (x - playerPos.x)**2 + (z - playerPos.z)**2 : Infinity;

            if (!isInWater && distToPlayerSq > 70*70) {
                spawnPos = { x, y: y + 1.0, z };
            }
        }

        if (spawnPos) {
            try {
                 const hunter = new AIHunter(this.game, spawnPos);
                 this.registerEntity(hunter);
                 console.log(`Spawned new hunter at (${spawnPos.x.toFixed(1)}, ${spawnPos.z.toFixed(1)})`);
                 return hunter;
             } catch (error) {
                 console.error(`Failed to spawn random hunter:`, error);
                 return null;
             }
        }
        return null;
    }

    // Get all entities of a specific type
    getEntitiesByType(type) {
        switch (type) {
            case 'animal':
                return this.animals.filter(a => a && a.isAlive); // Filter null/dead animals
            case 'hunter':
                return this.hunters.filter(h => h && h.isAlive); // Filter null/dead hunters
            default:
                return Array.from(this.entities.values()).filter(e => e && e.type === type && e.isAlive !== false); // General filter
        }
    }

    // Get number of entities by type
    getEntityCount(type) {
        return this.getEntitiesByType(type).length;
    }
}

// --- END OF FILE EntityManager.js ---

