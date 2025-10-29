// --- START OF FILE Constants.js ---

// Game constants
const Constants = {
    // World generation & Environment
    WORLD: {
        SIZE: 1000, // Size of the world map (square units, e.g., 1000x1000)
        TERRAIN_RESOLUTION: 256, // Resolution of the terrain heightmap grid (e.g., 256x256)
        WATER_LEVEL: 2, // Height coordinate below which is considered water
        TREE_DENSITY: 0.75, // Target percentage coverage for trees (0.0 to 1.0)
        STONE_DENSITY: 0.7, // Target percentage coverage for stones/ores
        FIBER_DENSITY: 0.8, // Target percentage coverage for basic plants
        MAX_TREES: 1000, // Absolute maximum trees allowed (density applied to this)
        MAX_STONES: 800, // Absolute maximum stones/ores allowed
        MAX_FIBER_PLANTS: 1500, // Absolute maximum basic plants allowed
        MAX_ANIMALS: 600, // Increased max animals
        MAX_HUNTERS: 5,  // Reduced max hunters
        DAY_LENGTH: 1200, // Duration of a full day-night cycle in seconds (20 minutes)
        GRAVITY: 9.8,     // Standard gravity acceleration
        // --- CAVE SETTINGS ---
        CAVE_COUNT: 25, // How many caves to attempt generating
        CAVE_ENTRANCE_RADIUS: 8, // Approx radius of the entrance depression
        CAVE_ENTRANCE_DEPTH: 15, // How far down to depress the terrain
        CAVE_ORE_SPAWN_RADIUS: 25, // Radius around entrance center to spawn ores
        CAVE_ORE_DENSITY: 0.8, // Density of ore nodes within the cave radius (relative)
        MAX_CAVE_ORES: 50, // Max ore nodes per cave
        // --- END CAVE ---
        DAY_NIGHT_CYCLE_VISUALS: {
            MIN_SUN_Y_FACTOR: -0.2,  // How far below horizon sun visually dips (relative to distance)
            BASE_SUN_INTENSITY: 1.2,
            MAX_SUN_INTENSITY: 1.2,
            MIN_AMBIENT_INTENSITY: 0.9,
            MAX_AMBIENT_INTENSITY: 0.8,
            DAWN_DUSK_PHASE: 0.1     // % of cycle for dawn/dusk transition
        }
    },

    // Player Settings
    PLAYER: {
        MOVE_SPEED: 5,          // Base movement speed units/sec
        SPRINT_SPEED: 8,        // Sprinting speed units/sec
        JUMP_FORCE: 7,          // Initial upward velocity for jumping
        CAM_HEIGHT: 1.8,        // Camera height offset from player base
        INTERACTION_RANGE: 3,   // Max distance player can interact with objects
        RELOAD_TIME: 2.0,       // Seconds it takes to reload the rifle
        // --- FLASHLIGHT ---
        FLASHLIGHT_RANGE: 15, // Range of the player's light
        FLASHLIGHT_INTENSITY: 1.5, // Brightness of the player's light
        FLASHLIGHT_ANGLE: Math.PI / 4, // Spotlight cone angle
        FLASHLIGHT_PENUMBRA: 0.2, // Spotlight softness
        // --- END FLASHLIGHT ---
        // Player Stats
        MAX_HEALTH: 100,
        MAX_HUNGER: 100,
        MAX_STAMINA: 100,
        HUNGER_RATE: 0.5,       // Hunger points decrease per minute
        STAMINA_REGEN: 10,      // Stamina points increase per second when not sprinting/jumping
        STAMINA_SPRINT_DRAIN: 5, // Stamina points decrease per second while sprinting
        STAMINA_JUMP_COST: 10   // Stamina cost per jump
    },

    // Resource Properties
    RESOURCES: {
        TREE_HEALTH: 50,        // Hits needed to fell a tree (depends on tool damage)
        STONE_HEALTH: 80,       // Hits needed to break a stone/ore node
        ANIMAL_SPAWN_RATE: 60,  // Seconds between attempts to spawn a new animal (if below max)
        HUNTER_SPAWN_RATE: 300, // Seconds between attempts to spawn a new hunter (if below max)
        PLANT_REGROW_TIME: 5    // Minutes for harvested plants to respawn
    },

    // Item Definitions
    ITEMS: {
        // Tools & Weapons
        TOOLS: [
            { id: 'axe', name: 'Stone Axe', durability: 100, damage: 10, harvestMultiplier: 2, type: 'tool' },
            { id: 'pickaxe', name: 'Stone Pickaxe', durability: 100, damage: 8, harvestMultiplier: 2, type: 'tool' },
            { id: 'knife', name: 'Stone Knife', durability: 50, damage: 15, harvestMultiplier: 1.5, type: 'tool' },
            { id: 'canteen', name: 'Waterskin', capacity: 1000, current: 0, type: 'tool' },
            { id: 'fishingrod', name: 'Wooden Fishing Rod', durability: 30, type: 'tool' },
            { id: 'bow', name: 'Simple Bow', durability: 50, damage: 20, type: 'weapon' },
            { id: 'rifle', name: 'Hunting Rifle', durability: 150, damage: 40, range: 150, fireRate: 0.8, magazineSize: 5, type: 'weapon' }
        ],

        // Basic Resources (Gathered)
        RESOURCES: [
            { id: 'wood', name: 'Wood', stackSize: 50, type: 'resource' },
            { id: 'fiber', name: 'Fiber', stackSize: 100, type: 'resource', color: 0x556b2f }, // Added color hint
            { id: 'stone', name: 'Stone', stackSize: 50, type: 'resource' },
            { id: 'ironore', name: 'Iron Ore', stackSize: 30, type: 'resource' },
            { id: 'copperore', name: 'Copper Ore', stackSize: 30, type: 'resource' },
            { id: 'zincore', name: 'Zinc Ore', stackSize: 30, type: 'resource' },
            { id: 'leather', name: 'Leather', stackSize: 20, type: 'resource' },
            { id: 'meat', name: 'Raw Meat', stackSize: 10, spoilTime: 30, type: 'food', hungerRestore: 15 },
            { id: 'fat', name: 'Animal Fat', stackSize: 20, type: 'resource' },
            { id: 'feather', name: 'Feather', stackSize: 50, type: 'resource' },
            { id: 'medicinalherb', name: 'Medicinal Herb', stackSize: 20, type: 'resource', color: 0x00ff7f }, // Added color hint
            { id: 'veggie', name: 'Wild Vegetable', stackSize: 15, spoilTime: 60, type: 'food', hungerRestore: 10 }, // Generic fallback
            { id: 'blueberry', name: 'Blueberry', stackSize: 15, spoilTime: 60, type: 'food', hungerRestore: 8, color: 0x4169e1 }, // Specific food/resource
            { id: 'carrot', name: 'Carrot', stackSize: 15, spoilTime: 60, type: 'food', hungerRestore: 12, color: 0xed9121 }, // Specific food/resource
            { id: 'onion', name: 'Wild Onion', stackSize: 15, spoilTime: 60, type: 'food', hungerRestore: 5, color: 0x9370db }, // Specific food/resource
            { id: 'metalscrap', name: 'Metal Scrap', stackSize: 30, type: 'resource' },
            // <<-- ADDED: Barrel Definition (as a resource type for searching) -->>
            { id: 'barrel', name: 'Barrel', stackSize: 1, type: 'resource' } // Treat like a crate for loot
        ],

        // Processed Resources / Intermediate Crafting Components
        PROCESSED: [
            { id: 'ironingot', name: 'Iron Ingot', stackSize: 20, type: 'resource' },
            { id: 'copperingot', name: 'Copper Ingot', stackSize: 20, type: 'resource' },
            { id: 'zincingot', name: 'Zinc Ingot', stackSize: 20, type: 'resource' },
            { id: 'nail', name: 'Nail', stackSize: 100, type: 'resource' },
            { id: 'rope', name: 'Rope', stackSize: 20, type: 'resource' },
            { id: 'woodplanks', name: 'Wood Planks', stackSize: 50, type: 'resource' }
            // { id: 'copperwire', name: 'Copper Wire', stackSize: 50, type: 'resource' } // Needed for Base Controller
        ],

        // Ammunition Category
        AMMO: [
            { id: 'arrow', name: 'Arrow', stackSize: 30, damage: 15, type: 'ammo' },
            { id: 'rifleround', name: 'Rifle Round', stackSize: 30, type: 'ammo' },
            { id: '9mm', name: '9mm Bullet', stackSize: 50, type: 'ammo' },
            { id: 'shotgunshell', name: 'Shotgun Shell', stackSize: 20, type: 'ammo' }
        ],

        // Basic Crafting (No Station Required)
        CRAFTABLES: [
            { id: 'bandage', name: 'Bandage', requirements: [ { id: 'fiber', amount: 5 } ], type: 'medical', healAmount: 15 },
            { id: 'campfire', name: 'Campfire', requirements: [ { id: 'stone', amount: 10 }, { id: 'wood', amount: 5 } ], type: 'placeable' },
            { id: 'rope', name: 'Rope', requirements: [ { id: 'fiber', amount: 10 } ], type: 'resource', craftAmount: 1 },
            { id: 'woodplanks', name: 'Wood Planks', requirements: [ { id: 'wood', amount: 1 } ], type: 'resource', craftAmount: 2 }
        ],

        // Workbench Crafting
        WORKBENCH_CRAFTABLES: [
            { id: 'axe', name: 'Stone Axe', requirements: [ { id: 'wood', amount: 5 }, { id: 'stone', amount: 3 }, { id: 'fiber', amount: 2 } ], type: 'tool'},
            { id: 'pickaxe', name: 'Stone Pickaxe', requirements: [ { id: 'wood', amount: 5 }, { id: 'stone', amount: 5 }, { id: 'fiber', amount: 2 } ], type: 'tool'},
            { id: 'knife', name: 'Stone Knife', requirements: [ { id: 'wood', amount: 1 }, { id: 'stone', amount: 2 }, { id: 'fiber', amount: 1 } ], type: 'tool'},
            { id: 'bow', name: 'Simple Bow', requirements: [ { id: 'wood', amount: 10 }, { id: 'rope', amount: 1 } ], type: 'weapon'},
            { id: 'arrow', name: 'Arrow', requirements: [ { id: 'wood', amount: 1 }, { id: 'feather', amount: 1 }, { id: 'stone', amount: 1 } ], type: 'ammo', craftAmount: 5 },
            { id: 'nail', name: 'Nail', requirements: [ { id: 'metalscrap', amount: 1 } ], type: 'resource', craftAmount: 10 },
            { id: 'firstaidkit', name: 'First Aid Kit', requirements: [ { id: 'bandage', amount: 3 }, { id: 'medicinalherb', amount: 5 }, { id: 'rope', amount: 1 } ], type: 'medical', healAmount: 50 },
            { id: 'workbench', name: 'Workbench', requirements: [ { id: 'woodplanks', amount: 10 }, { id: 'nail', amount: 6 } ], type: 'placeable' },
            { id: 'forge', name: 'Forge', requirements: [ { id: 'stone', amount: 20 }, { id: 'metalscrap', amount: 10 } ], type: 'placeable' },
            { id: 'lockpick', name: 'Lock Pick', requirements: [ { id: 'metalscrap', amount: 1 } ], type: 'tool', stackSize: 5, craftAmount: 2 },
            { id: 'rifleround', name: 'Rifle Round', requirements: [ { id: 'copperingot', amount: 1 }, { id: 'zincingot', amount: 1 } ], type: 'ammo', craftAmount: 5 },
            { id: '9mm', name: '9mm Bullet', requirements: [ { id: 'copperingot', amount: 1 }, { id: 'zincingot', amount: 1 } ], type: 'ammo', craftAmount: 10 },
            { id: 'shotgunshell', name: 'Shotgun Shell', requirements: [ { id: 'copperingot', amount: 1 }, { id: 'zincingot', amount: 1 }, { id: 'metalscrap', amount: 1 } ], type: 'ammo', craftAmount: 3 },
            // <<-- ADDED: Base Controller Recipe -->>
            // { id: 'base_controller', name: 'Base Controller', requirements: [ { id: 'ironingot', amount: 5 }, { id: 'copperwire', amount: 10 }, { id: 'metalscrap', amount: 15 } ], type: 'placeable'}, // Assuming copperwire exists or is added
            // <<-- ADDED: Cold Gear Recipes -->>
            // { id: 'fur_coat', name: 'Fur Coat', requirements: [ { id: 'leather', amount: 10 }, { id: 'fat', amount: 5 }, { id: 'rope', amount: 2 } ], type: 'clothing', coldResistance: 15 },
            // { id: 'fur_boots', name: 'Fur Boots', requirements: [ { id: 'leather', amount: 6 }, { id: 'fat', amount: 2 }, { id: 'rope', amount: 1 } ], type: 'clothing', coldResistance: 5 },
            // { id: 'fur_pants', name: 'Fur Pants', requirements: [ { id: 'leather', amount: 8 }, { id: 'fat', amount: 3 }, { id: 'rope', amount: 1 } ], type: 'clothing', coldResistance: 10 },
            // <<-- ADDED: Armor Recipes -->>
            // { id: 'body_armor', name: 'Metal Body Armor', requirements: [ { id: 'ironingot', amount: 15 }, { id: 'leather', amount: 5 }, { id: 'rope', amount: 3 } ], type: 'armor', damageResistance: 25 },
            // { id: 'metal_helmet', name: 'Metal Helmet', requirements: [ { id: 'ironingot', amount: 8 }, { id: 'leather', amount: 2 } ], type: 'armor', damageResistance: 15 },
            // { id: 'armored_pants', name: 'Reinforced Pants', requirements: [ { id: 'leather', amount: 10 }, { id: 'ironingot', amount: 5 }, { id: 'rope', amount: 2 } ], type: 'armor', damageResistance: 10 }
        ], // NOTE: Item definitions for clothing/armor types themselves need to be added if not already present

        // Forge Crafting (Smelting)
        FORGE_CRAFTABLES: [
            { id: 'ironingot', name: 'Iron Ingot', requirements: [ { id: 'ironore', amount: 2 } ], type: 'resource', craftAmount: 1 },
            { id: 'copperingot', name: 'Copper Ingot', requirements: [ { id: 'copperore', amount: 2 } ], type: 'resource', craftAmount: 1 },
            { id: 'zincingot', name: 'Zinc Ingot', requirements: [ { id: 'zincore', amount: 2 } ], type: 'resource', craftAmount: 1 },
            { id: 'metalscrap', name: 'Metal Scrap', requirements: [ { id: 'ironore', amount: 1 } ], type: 'resource', craftAmount: 1 }
            // { id: 'copperwire', name: 'Copper Wire', requirements: [ { id: 'copperingot', amount: 1 } ], type: 'resource', craftAmount: 5 } // Recipe for copper wire if needed
        ]
        // <<-- ADDED: Clothing/Armor Definitions (Placeholder) -->>
        // CLOTHING: [
        //     { id: 'fur_coat', name: 'Fur Coat', type: 'clothing', slot: 'chest', coldResistance: 15 },
        //     { id: 'fur_boots', name: 'Fur Boots', type: 'clothing', slot: 'feet', coldResistance: 5 },
        //     { id: 'fur_pants', name: 'Fur Pants', type: 'clothing', slot: 'legs', coldResistance: 10 },
        // ],
        // ARMOR: [
        //     { id: 'body_armor', name: 'Metal Body Armor', type: 'armor', slot: 'chest', damageResistance: 25 },
        //     { id: 'metal_helmet', name: 'Metal Helmet', type: 'armor', slot: 'head', damageResistance: 15 },
        //     { id: 'armored_pants', name: 'Reinforced Pants', type: 'armor', slot: 'legs', damageResistance: 10 }
        // ]
    },

    // Building System
    BUILDING: {
        FOUNDATION_SIZE: 4,     // Width/Depth of foundation/ceiling pieces
        WALL_HEIGHT: 3,         // Height of wall pieces
        SNAP_DISTANCE: 0.5,     // Max distance for snapping points to connect
        GRID_SIZE: 4,           // Grid size for foundation placement (should match FOUNDATION_SIZE)
        COMPONENTS: [
            // <<-- ADDED: Health and resources on destruction -->>
            { id: 'foundation', name: 'Wood Foundation', requirements: [ { id: 'woodplanks', amount: 6 }, { id: 'nail', amount: 4 } ], health: 300, resources: { woodplanks: 3, nail: 2 } },
            { id: 'wall', name: 'Wood Wall', requirements: [ { id: 'woodplanks', amount: 4 }, { id: 'nail', amount: 2 } ], health: 200, resources: { woodplanks: 2, nail: 1 } },
            { id: 'window', name: 'Wood Window Wall', requirements: [ { id: 'woodplanks', amount: 3 }, { id: 'nail', amount: 3 } ], health: 150, resources: { woodplanks: 1, nail: 1 } }, // Less health/resources
            { id: 'ceiling', name: 'Wood Ceiling', requirements: [ { id: 'woodplanks', amount: 6 }, { id: 'nail', amount: 4 } ], health: 250, resources: { woodplanks: 3, nail: 2 } }
            // <<-- END ADD -->>
        ]
    },

    // Animal Definitions
    ANIMALS: {
        TYPES: [
            { id: 'chicken', name: 'Chicken', health: 10, damage: 0, speed: 2, drops: [ { id: 'meat', amount: [1, 2] }, { id: 'feather', amount: [3, 6] } ], aggressive: false },
            { id: 'rabbit', name: 'Rabbit', health: 15, damage: 0, speed: 4, drops: [ { id: 'meat', amount: [1, 3] }, { id: 'leather', amount: [1, 2] } ], aggressive: false },
            { id: 'deer', name: 'Deer', health: 50, damage: 5, speed: 6, drops: [ { id: 'meat', amount: [4, 8] }, { id: 'leather', amount: [2, 4] } ], aggressive: false },
            { id: 'wolf', name: 'Wolf', health: 60, damage: 15, speed: 7, drops: [ { id: 'meat', amount: [2, 4] }, { id: 'leather', amount: [1, 3] } ], aggressive: true },
            { id: 'bear', name: 'Bear', health: 120, damage: 25, speed: 5, drops: [ { id: 'meat', amount: [6, 10] }, { id: 'leather', amount: [4, 6] }, { id: 'fat', amount: [3, 5] } ], aggressive: true },
            { id: 'cougar', name: 'Cougar', health: 80, damage: 20, speed: 8, drops: [ { id: 'meat', amount: [3, 6] }, { id: 'leather', amount: [2, 4] } ], aggressive: true }
        ]
    },

    // AI Hunter Definitions
    HUNTERS: {
        HEALTH: 100,
        DAMAGE: 20,           // Base damage per shot
        SPEED: 4,             // Base movement speed
        SIGHT_RANGE: 50,      // How far they can see the player
        ATTACK_RANGE: 30,     // Max range for shooting
        PATROL_RADIUS: 100,   // Radius around spawn/base they patrol
        WEAPON_COOLDOWN: 2.0, // Seconds between shots
        AVOID_CAVE_ENTRANCE_RADIUS: 20, // <<-- ADDED: Hunters might avoid getting too close
        DROPS: [ // Items dropped on death
            { id: 'rifleround', amount: [5, 15], chance: 0.7 },
            { id: '9mm', amount: [5, 15], chance: 0.5 },
            { id: 'shotgunshell', amount: [3, 8], chance: 0.3 },
            { id: 'metalscrap', amount: [1, 5], chance: 0.8 },
            { id: 'medicinalherb', amount: [1, 3], chance: 0.4 },
            { id: 'bandage', amount: [1, 2], chance: 0.5 }
        ]
    },

    // Weather System
    WEATHER: {
        TYPES: ['clear', 'cloudy', 'fog'], // Possible weather states
        CHANGE_INTERVAL: 20 // Base interval in minutes for weather change check
    },

    // <<-- ADDED: Loot Tables -->>
    LOOT_TABLES: {
        CRATE_COMMON: [
            { id: 'metalscrap', amount: [1, 5], chance: 0.6 },
            { id: 'bandage', amount: [1, 2], chance: 0.4 },
            { id: 'rope', amount: [1, 1], chance: 0.3 },
            { id: 'nail', amount: [5, 15], chance: 0.5 },
            { id: '9mm', amount: [3, 10], chance: 0.2 },
            { id: 'rifleround', amount: [2, 8], chance: 0.15 },
        ],
        BARREL_COMMON: [
            { id: 'metalscrap', amount: [2, 6], chance: 0.7 },
            { id: 'fat', amount: [1, 3], chance: 0.4 }, // Barrels might have fat/fuel?
            { id: 'fiber', amount: [5, 10], chance: 0.3 },
            { id: 'stone', amount: [3, 8], chance: 0.2 },
            { id: 'woodplanks', amount: [1, 4], chance: 0.2 },
            { id: 'canteen', amount: 1, chance: 0.05 }, // Chance for a canteen
        ],
        BUILDING_CACHE: [ // Loot for the containers inside generated buildings
             { id: 'metalscrap', amount: [5, 15], chance: 0.8 },
             { id: 'nail', amount: [10, 30], chance: 0.7 },
             { id: 'rope', amount: [1, 3], chance: 0.5 },
             { id: 'bandage', amount: [2, 4], chance: 0.6 },
             { id: 'firstaidkit', amount: 1, chance: 0.1 },
             { id: 'rifleround', amount: [5, 20], chance: 0.3 },
             { id: '9mm', amount: [10, 30], chance: 0.4 },
             { id: 'canteen', amount: 1, chance: 0.1 },
             { id: 'lockpick', amount: [1, 3], chance: 0.2 },
        ]
    }
    // <<-- END ADD -->>
};