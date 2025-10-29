class CraftingSystem {
    constructor(game) {
        this.game = game;
        
        // Recipe categories
        this.recipeCategories = {
            basic: Constants.ITEMS.CRAFTABLES,
            workbench: Constants.ITEMS.WORKBENCH_CRAFTABLES,
            forge: Constants.ITEMS.FORGE_CRAFTABLES
        };
        
        // Crafting station being used (null for basic crafting)
        this.currentStation = null;
    }
    
    // Get recipes for a specific category
    getRecipes(category = 'basic') {
        return this.recipeCategories[category] || [];
    }
    
    // Check if a recipe can be crafted
    canCraftRecipe(recipe) {
        // Check if player has required resources
        return this.game.inventory.checkResources(recipe.requirements);
    }
    
    // Get craftable recipes based on current station and available resources
    getCraftableRecipes(stationType = 'basic') {
        const recipes = this.getRecipes(stationType);
        return recipes.filter(recipe => this.canCraftRecipe(recipe));
    }
    
    // Craft an item
    craftItem(itemId, quantity = 1, stationType = 'basic') {
        // Find the recipe
        const recipes = this.getRecipes(stationType);
        const recipe = recipes.find(r => r.id === itemId);
        
        if (!recipe) {
            console.error(`Recipe not found for item: ${itemId}`);
            return false;
        }
        
        // Check if player has required resources
        const hasResources = this.game.inventory.checkResources(recipe.requirements);
        
        if (!hasResources) {
            console.log(`Not enough resources to craft ${recipe.name}`);
            this.game.uiManager.showNotification(`Not enough resources to craft ${recipe.name}`);
            return false;
        }
        
        // Consume resources
        recipe.requirements.forEach(req => {
            this.game.inventory.removeItem(req.id, req.amount * quantity);
        });
        
        // Add crafted item to inventory
        const added = this.game.inventory.addItem(itemId, quantity);
        
        if (added) {
            console.log(`Crafted ${quantity} ${recipe.name}`);
            this.game.uiManager.showNotification(`Crafted ${quantity} ${recipe.name}`);
            
            // Play crafting sound if available
            // this.game.audio.playSfx('craft');
        } else {
            // If could not add to inventory (full), refund resources
            recipe.requirements.forEach(req => {
                this.game.inventory.addItem(req.id, req.amount * quantity);
            });
            
            console.log("Inventory full! Could not craft item.");
            this.game.uiManager.showNotification("Inventory full! Could not craft item.");
            return false;
        }
        
        return true;
    }
    
    // Set current crafting station
    setCraftingStation(stationType) {
        this.currentStation = stationType;
    }
    
    // Craft an item at the current station
    craftAtCurrentStation(itemId, quantity = 1) {
        const stationType = this.currentStation || 'basic';
        return this.craftItem(itemId, quantity, stationType);
    }
    
    // Get requirements for a specific recipe
    getRecipeRequirements(itemId, stationType = 'basic') {
        const recipes = this.getRecipes(stationType);
        const recipe = recipes.find(r => r.id === itemId);
        
        if (!recipe) {
            return [];
        }
        
        return recipe.requirements || [];
    }
    
    // Check if player has a specific crafting station
    hasStation(stationType) {
        // For basic crafting, always return true
        if (stationType === 'basic') {
            return true;
        }
        
        // Check if player has built this station
        const stations = this.game.resourceManager.resources.crafting;
        return stations.some(station => station.type === stationType);
    }
    
    // Find the nearest crafting station of a type
    findNearestStation(stationType) {
        if (stationType === 'basic') {
            return { position: this.game.playerController.position };
        }
        
        const stations = this.game.resourceManager.resources.crafting.filter(
            station => station.type === stationType
        );
        
        if (stations.length === 0) {
            return null;
        }
        
        // Find the closest one
        const playerPos = this.game.playerController.position;
        
        let nearest = null;
        let minDistance = Infinity;
        
        stations.forEach(station => {
            const distance = Utils.distance(
                playerPos.x, playerPos.z,
                station.position.x, station.position.z
            );
            
            if (distance < minDistance) {
                nearest = station;
                minDistance = distance;
            }
        });
        
        return nearest;
    }
    
    // Check if player is near a crafting station
    isNearStation(stationType) {
        if (stationType === 'basic') {
            return true; // Basic crafting can be done anywhere
        }
        
        const nearestStation = this.findNearestStation(stationType);
        
        if (!nearestStation) {
            return false;
        }
        
        // Check if player is within range
        const playerPos = this.game.playerController.position;
        const distance = Utils.distance(
            playerPos.x, playerPos.z,
            nearestStation.position.x, nearestStation.position.z
        );
        
        return distance <= Constants.PLAYER.INTERACTION_RANGE;
    }
    
    // Place a crafted station in the world
    placeStation(stationType, position) {
        // Create station mesh based on type
        let stationGeometry, stationMaterial;
        
        switch (stationType) {
            case 'workbench':
                stationGeometry = new THREE.BoxGeometry(1.5, 0.8, 1);
                stationMaterial = new THREE.MeshStandardMaterial({
                    map: this.game.assetLoader.getTexture('wood'),
                    roughness: 0.8,
                    metalness: 0.2
                });
                break;
                
            case 'forge':
                stationGeometry = new THREE.CylinderGeometry(0.7, 1, 0.8, 8);
                stationMaterial = new THREE.MeshStandardMaterial({
                    map: this.game.assetLoader.getTexture('stone'),
                    roughness: 0.9,
                    metalness: 0.3
                });
                break;
                
            case 'campfire':
                stationGeometry = new THREE.CylinderGeometry(0.5, 0.8, 0.3, 8);
                stationMaterial = new THREE.MeshStandardMaterial({
                    map: this.game.assetLoader.getTexture('stone'),
                    roughness: 0.9,
                    metalness: 0.1
                });
                break;
                
            default:
                console.error(`Unknown station type: ${stationType}`);
                return false;
        }
        
        // Create mesh
        const stationMesh = new THREE.Mesh(stationGeometry, stationMaterial);
        stationMesh.position.copy(position);
        stationMesh.castShadow = true;
        stationMesh.receiveShadow = true;
        
        // Add to scene
        this.game.scene.add(stationMesh);
        
        // Create station object
        const station = {
            id: `${stationType}_${Date.now()}`,
            type: stationType,
            position: {
                x: position.x,
                y: position.y,
                z: position.z
            },
            meshes: [stationMesh],
            health: 100
        };
        
        // Register with resource manager
        this.game.resourceManager.registerResource(station);
        
        console.log(`Placed ${stationType} at`, position);
        return true;
    }
}