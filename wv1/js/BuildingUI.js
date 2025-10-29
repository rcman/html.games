class BuildingUI {
    constructor(game, uiManager) {
        this.game = game;
        this.uiManager = uiManager;
        
        // UI elements
        this.buildMenuElement = document.getElementById('build-menu');
        
        // Initialize UI
        this.init();
    }
    
    init() {
        // Create building item elements
        this.updateBuildMenu();
    }
    
    updateBuildMenu() {
        if (!this.buildMenuElement) return;
        
        // Get building components
        const components = this.game.buildingSystem.getBuildingComponents();
        
        // Get items container or create it if it doesn't exist
        let itemsContainer = this.buildMenuElement.querySelector('.build-items');
        
        if (!itemsContainer) {
            // Create container if it doesn't exist
            const header = this.buildMenuElement.querySelector('h3');
            itemsContainer = document.createElement('div');
            itemsContainer.className = 'build-items';
            
            if (header) {
                // Insert after header
                header.insertAdjacentElement('afterend', itemsContainer);
            } else {
                // Just append to build menu
                this.buildMenuElement.appendChild(itemsContainer);
            }
        } else {
            // Clear existing items
            itemsContainer.innerHTML = '';
        }
        
        // Create new items
        components.forEach(component => {
            const itemElement = document.createElement('div');
            itemElement.className = 'build-item';
            itemElement.dataset.item = component.id;
            itemsContainer.appendChild(itemElement);
            
            // Add click handler
            itemElement.addEventListener('click', () => {
                this.game.playerController.setBuildItem(component.id);
            });
            
            // Check if player has resources for this component
            const canBuild = this.game.buildingSystem.canBuildComponent(component.id);
            
            // Update item appearance
            itemElement.textContent = component.name;
            itemElement.title = this.createComponentTooltip(component);
            
            if (canBuild) {
                itemElement.classList.remove('unavailable');
            } else {
                itemElement.classList.add('unavailable');
            }
        });
    }
    
    createComponentTooltip(component) {
        let tooltip = component.name;
        
        // Add requirements
        if (component.requirements && component.requirements.length > 0) {
            tooltip += '\nRequirements:';
            
            component.requirements.forEach(req => {
                // Safely get item information
                let itemName = req.id;
                let count = 0;
                
                try {
                    // Try to get item directly without using Utils
                    if (this.game.inventory && typeof this.game.inventory.getItemCount === 'function') {
                        count = this.game.inventory.getItemCount(req.id);
                    }
                    
                    // Try to get a formatted name
                    const categories = [
                        Constants.ITEMS.TOOLS,
                        Constants.ITEMS.RESOURCES,
                        Constants.ITEMS.CRAFTABLES,
                        Constants.ITEMS.WORKBENCH_CRAFTABLES,
                        Constants.ITEMS.FORGE_CRAFTABLES
                    ];
                    
                    // Find the item in the categories
                    for (const category of categories) {
                        if (!category) continue;
                        const item = category.find(item => item.id === req.id);
                        if (item) {
                            itemName = item.name || req.id;
                            break;
                        }
                    }
                } catch (error) {
                    console.warn(`Error getting item information for ${req.id}:`, error);
                }
                
                tooltip += `\n- ${itemName} x${req.amount} (${count} available)`;
            });
        } else {
            tooltip += '\nNo requirements';
        }
        
        return tooltip;
    }
    
    // Update UI to reflect current build mode
    updateBuildMode(isActive, selectedComponent) {
        if (!this.buildMenuElement) return;
        
        // Highlight selected component
        const items = this.buildMenuElement.querySelectorAll('.build-item');
        
        items.forEach(item => {
            if (item.dataset.item === selectedComponent) {
                item.classList.add('selected');
            } else {
                item.classList.remove('selected');
            }
        });
    }
}