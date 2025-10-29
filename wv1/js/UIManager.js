// --- START OF FILE UIManager.js ---

class UIManager {
    constructor(game) {
        this.game = game;

        // UI components (sub-managers)
        this.inventoryUI = null;
        this.buildingUI = null;

        // UI state
        this.isInventoryOpen = false;
        this.isBuildMenuOpen = false;
        this.isCraftingMenuOpen = false;
        this.isPauseMenuOpen = false;
        this.isDebugMenuOpen = false; // Debug menu state
        this.currentCraftingStation = 'basic'; // Track which station's recipes to show

        // Core UI element references (ensure these IDs match your HTML)
        this.inventoryElement = document.getElementById('inventory');
        this.quickBarElement = document.getElementById('quick-bar');
        this.buildMenuElement = document.getElementById('build-menu');
        this.craftingMenuElement = document.getElementById('crafting-menu');
        this.craftingTitleElement = document.getElementById('crafting-title');
        this.craftingItemsElement = document.getElementById('crafting-items');
        this.pauseMenuElement = document.getElementById('pause-menu');
        this.deathScreenElement = document.getElementById('death-screen');
        this.notificationElement = document.getElementById('notification');
        this.interactionPromptElement = document.getElementById('interaction-prompt');
        this.weaponStatsElement = document.getElementById('weapon-stats');

        // Debug Control References
        this.debugControlsElement = document.getElementById('debug-controls');
        this.debugTimeSlider = document.getElementById('debug-time-of-day');
        this.debugTimeValue = document.getElementById('debug-time-value');
        this.debugSunSlider = document.getElementById('debug-sun-intensity');
        this.debugSunValue = document.getElementById('debug-sun-value');
        this.debugAmbientSlider = document.getElementById('debug-ambient-intensity');
        this.debugAmbientValue = document.getElementById('debug-ambient-value');

        // Notification management
        this.notificationTimeout = null;

        // NOTE: init() is called from Game.js *after* systems are ready
    }

    init() {
        console.log("Initializing UIManager...");
        // Verify core elements exist
        if (!this.inventoryElement) console.error("Inventory element not found!");
        if (!this.quickBarElement) console.error("Quick bar element not found!");
        if (!this.buildMenuElement) console.error("Build menu element not found!");
        if (!this.craftingMenuElement) console.error("Crafting menu element not found!");
        if (!this.pauseMenuElement) console.error("Pause menu element not found!");
        if (!this.deathScreenElement) console.error("Death screen element not found!");
        if (!this.notificationElement) console.error("Notification element not found!");
        if (!this.interactionPromptElement) console.error("Interaction prompt element not found!");
        if (!this.weaponStatsElement) console.error("Weapon stats element not found!");
        if (!this.debugControlsElement) console.error("Debug controls element not found!");


        // Initialize inventory UI
        if (typeof InventoryUI !== 'undefined' && this.game.inventory) {
             this.inventoryUI = new InventoryUI(this.game, this);
         } else { console.error("InventoryUI class not found or game.inventory missing."); }

        // Initialize building UI
        if (typeof BuildingUI !== 'undefined' && this.game.buildingSystem) {
             this.buildingUI = new BuildingUI(this.game, this);
         } else { console.error("BuildingUI class not found or game.buildingSystem missing."); }

        // Setup event listeners managed by UIManager itself
        this.setupEventListeners();

        // Initial update for weapon UI (likely shows nothing initially)
        this.updateWeaponUI(null);
        console.log("UIManager Initialized.");
    }

    setupEventListeners() {
        // --- Keyboard Input for UI Toggles ---
        document.addEventListener('keydown', (e) => {
            // 1. Ignore if typing in an input field (allow Escape)
            const isTyping = document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA';
            if (isTyping && e.key !== 'Escape') {
                return;
            }

            // Handle Escape Key (always highest priority after typing)
            if (e.key === 'Escape') {
                 if (isTyping) {
                     document.activeElement.blur(); // Just blur input on first escape
                 } else if (this.isInventoryOpen) this.toggleInventory();
                 else if (this.isBuildMenuOpen) this.game.playerController?.toggleBuildMode(); // Use player controller toggle
                 else if (this.isCraftingMenuOpen) this.closeCraftingMenu();
                 else if (this.isDebugMenuOpen) this.toggleDebugMenu();
                 else if (this.isPauseMenuOpen) this.game.resume(); // Resume game
                 else if (document.pointerLockElement) document.exitPointerLock(); // Release pointer lock if nothing else open
                 else if (this.game.running) this.game.pause(); // Pause game as last resort
                 return; // Escape handled, don't process other keys
            }

            // 2. Handle UI Toggle Keys (I, C, `, 1-8) - Not blocked by menus
            if (e.key >= '1' && e.key <= '8') {
                 const slotIndex = parseInt(e.key) - 1;
                 this.game.inventory?.selectQuickBarSlot(slotIndex);
                 return; // Handled
            }
            else if (e.key.toLowerCase() === 'i') {
                 this.toggleInventory();
                 return; // Handled
            }
            else if (e.key.toLowerCase() === 'c') {
                 if (this.isCraftingMenuOpen) this.closeCraftingMenu();
                 else this.openCraftingMenu('basic'); // Open basic crafting
                 return; // Handled
            }
            else if (e.key === '`') {
                 this.toggleDebugMenu();
                 return; // Handled
            }

            // 3. Other keys (like movement, interact 'E', build 'B') are handled
            //    by PlayerController, which now checks the UI state itself.
        });


        // --- Crafting Menu Button Clicks ---
        if (this.craftingItemsElement) {
             this.craftingItemsElement.addEventListener('click', (e) => {
                 const craftButton = e.target.closest('.craft-button');
                 if (craftButton && !craftButton.disabled) {
                     const itemElement = craftButton.closest('.crafting-item');
                     if (itemElement) {
                         const itemId = itemElement.dataset.item;
                         if (itemId && this.game.craftingSystem) {
                             // Attempt to craft
                             const success = this.game.craftingSystem.craftItem(itemId, 1, this.currentCraftingStation);
                             if(success) {
                                // Refresh UI elements that might have changed
                                this.updateCraftingMenu();
                                this.inventoryUI?.updateInventory(this.game.inventory);
                                this.buildingUI?.updateBuildMenu(); // Update build costs too
                             }
                         }
                     }
                 }
             });
         } else { console.error("Crafting items element not found for event listener setup."); }


         // --- Debug Slider Listeners ---
         if (this.debugTimeSlider) {
            this.debugTimeSlider.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                this.game.dayNightCycle = value; // Directly set game time cycle
                if(this.debugTimeValue) this.debugTimeValue.textContent = value.toFixed(2);
                // No need to manually call updateDayNightCycle, the game loop will handle it
            });
         } else { console.warn("Debug time slider not found."); }

         if (this.debugSunSlider) {
            this.debugSunSlider.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                if(this.game.sunLight) this.game.sunLight.intensity = value;
                if(this.debugSunValue) this.debugSunValue.textContent = value.toFixed(2);
            });
         } else { console.warn("Debug sun slider not found."); }

         if (this.debugAmbientSlider) {
            this.debugAmbientSlider.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                if(this.game.ambientLight) this.game.ambientLight.intensity = value;
                if(this.debugAmbientValue) this.debugAmbientValue.textContent = value.toFixed(2);
            });
         } else { console.warn("Debug ambient slider not found."); }


         // --- Pause Menu Buttons ---
         const resumeButton = document.getElementById('resume-button');
         const saveButton = document.getElementById('save-button');
         const loadButton = document.getElementById('load-button');
         const mainMenuButton = document.getElementById('main-menu-button');

         if(resumeButton) resumeButton.addEventListener('click', () => this.game.resume());
         else console.warn("Resume button not found.");

         if(saveButton) saveButton.addEventListener('click', () => {
             if (typeof this.game.saveGame === 'function') {
                 if(this.game.saveGame()) {
                     this.showNotification("Game Saved!", 2000);
                 } else {
                     this.showNotification("Save Failed!", 3000);
                 }
             } else { console.error("Game.saveGame() not found"); }
         });
         else console.warn("Save button not found.");

         if(loadButton) loadButton.addEventListener('click', () => {
              if (confirm("Load last save? Any unsaved progress will be lost.")) {
                  if (typeof this.game.loadGame === 'function') {
                      if (this.game.loadGame()) {
                           this.showNotification("Game Loaded!", 2000);
                           this.hidePauseMenu(); // Hide pause menu after load
                           // Game class handles resuming after load success
                      } else {
                           this.showNotification("Load Failed!", 3000);
                      }
                  } else { console.error("Game.loadGame() not found"); }
              }
          });
         else console.warn("Load button not found.");

         if(mainMenuButton) mainMenuButton.addEventListener('click', () => {
             // Simple reload for now, could be more sophisticated
             if (confirm("Return to main menu? Unsaved progress will be lost.")) {
                 window.location.reload();
             }
         });
         // else console.warn("Main menu button not found.");


         // --- Death Screen Button ---
         const respawnButton = document.getElementById('respawn-button');
         if (respawnButton) {
             respawnButton.addEventListener('click', () => {
                 if (this.game.characterStats && typeof this.game.characterStats.respawn === 'function') {
                     this.game.characterStats.respawn(); // Handles stat reset and player repositioning
                     this.hideDeathScreen();
                     // Game should be resumed by respawn function or Game class logic
                 } else { console.error("CharacterStats.respawn() not found."); }
             });
         } else { console.error("Respawn button not found."); }


        // --- Quick Save/Load Buttons ---
        const quickSaveButton = document.getElementById('quick-save-button');
        const quickLoadButton = document.getElementById('quick-load-button');
        if(quickSaveButton) quickSaveButton.addEventListener('click', () => {
             if (typeof this.game.saveGame === 'function') {
                 if (this.game.saveGame()) {
                     this.showNotification("Game Saved!", 2000);
                 } else {
                     this.showNotification("Save Failed!", 3000);
                 }
             } else { console.error("Game.saveGame() not found"); }
         });
         else console.warn("Quick save button not found.");

        if(quickLoadButton) quickLoadButton.addEventListener('click', () => {
              if (confirm("Load last quick save? Any unsaved progress will be lost.")) {
                  if (typeof this.game.loadGame === 'function') {
                      if(this.game.loadGame()) {
                          this.showNotification("Game Loaded!", 2000);
                          // Ensure menus are closed after load
                          if(this.isPauseMenuOpen) this.hidePauseMenu();
                          if(this.isInventoryOpen) this.toggleInventory();
                          // etc.
                          // Game class handles resuming
                      } else {
                           this.showNotification("Load Failed!", 3000);
                      }
                  } else { console.error("Game.loadGame() not found"); }
              }
         });
         else console.warn("Quick load button not found.");

    }

    // Central check if *any* blocking UI is open
    isAnyMenuOpen() {
        return this.isInventoryOpen || this.isBuildMenuOpen || this.isCraftingMenuOpen || this.isPauseMenuOpen || this.isDebugMenuOpen;
    }

    // Attempt to lock pointer if conditions allow
    requestPointerLockIfNeeded() {
        // Only request if game is running and no menus are open
        if (this.game.running && !this.isAnyMenuOpen() && document.pointerLockElement !== this.game.renderer.domElement) {
             console.log("Requesting pointer lock..."); // Log request reason
             this.game.renderer?.domElement.requestPointerLock();
         }
    }

    // Exit pointer lock if it's currently held
    exitPointerLockIfNeeded() {
        if (document.pointerLockElement === this.game.renderer?.domElement) {
            document.exitPointerLock();
        }
    }

    update(deltaTime) {
        // Update UI elements that need continuous updates (e.g., timers, animations)
        // Update debug UI values if open
        if (this.isDebugMenuOpen) {
            // Sync sliders TO game state if not actively being dragged
            if (this.game.sunLight && this.debugSunValue && this.debugSunSlider && document.activeElement !== this.debugSunSlider) {
                this.debugSunValue.textContent = this.game.sunLight.intensity.toFixed(2);
                this.debugSunSlider.value = this.game.sunLight.intensity;
            }
            if (this.game.ambientLight && this.debugAmbientValue && this.debugAmbientSlider && document.activeElement !== this.debugAmbientSlider) {
                this.debugAmbientValue.textContent = this.game.ambientLight.intensity.toFixed(2);
                 this.debugAmbientSlider.value = this.game.ambientLight.intensity;
            }
            if (this.debugTimeValue && this.debugTimeSlider && document.activeElement !== this.debugTimeSlider) {
                this.debugTimeValue.textContent = this.game.dayNightCycle.toFixed(2);
               this.debugTimeSlider.value = this.game.dayNightCycle;
           }
        }
    }

    // --- Menu Toggles & Management ---

    toggleDebugMenu() {
        this.isDebugMenuOpen = !this.isDebugMenuOpen;
        if (this.debugControlsElement) {
            this.debugControlsElement.style.display = this.isDebugMenuOpen ? 'block' : 'none';
        }

        if (this.isDebugMenuOpen) {
            this.closeConflictingMenus('debug'); // Close others
            this.exitPointerLockIfNeeded(); // Release mouse
            this.update(0); // Sync slider values display
        } else {
            this.requestPointerLockIfNeeded(); // Attempt re-lock if closing last menu
        }
    }

    toggleInventory() {
        this.isInventoryOpen = !this.isInventoryOpen;
        if (this.inventoryElement) {
            this.inventoryElement.style.display = this.isInventoryOpen ? 'flex' : 'none';
        } else {
            console.error("Inventory element reference is missing in UIManager!");
        }

        if (this.isInventoryOpen) {
            this.updateInventoryUI(this.game.inventory); // Update content when opening
            this.closeConflictingMenus('inventory');
            this.exitPointerLockIfNeeded();
        } else {
            this.requestPointerLockIfNeeded();
        }
    }

    // Called by PlayerController when build mode starts
    openBuildMenu() {
        if (!this.isBuildMenuOpen) {
            this.isBuildMenuOpen = true;
            if(this.buildMenuElement) this.buildMenuElement.style.display = 'flex';
            this.buildingUI?.updateBuildMenu(); // Update content
            this.closeConflictingMenus('build');
            this.exitPointerLockIfNeeded();
        }
    }

    // Called by PlayerController when build mode ends
    closeBuildMenu() {
        if (this.isBuildMenuOpen) {
            this.isBuildMenuOpen = false;
            if(this.buildMenuElement) this.buildMenuElement.style.display = 'none';
            this.requestPointerLockIfNeeded();
        }
    }

    openCraftingMenu(stationType = 'basic') {
        this.isCraftingMenuOpen = true;
        this.currentCraftingStation = stationType;
        if(this.craftingMenuElement) this.craftingMenuElement.style.display = 'flex';
        if(this.craftingTitleElement) {
            // Set title based on station
            let title = 'Crafting';
            const stationInfo = Constants.ITEMS.WORKBENCH_CRAFTABLES.find(s => s.id === stationType) // Check if it's a placeable station
                             || Constants.ITEMS.FORGE_CRAFTABLES.find(s => s.id === stationType)
                             || Constants.ITEMS.CRAFTABLES.find(s => s.id === stationType);
            if (stationInfo && stationInfo.name) title = stationInfo.name;
            else if (stationType === 'workbench') title = 'Workbench';
            else if (stationType === 'forge') title = 'Forge';
            else if (stationType === 'campfire') title = 'Campfire';
            this.craftingTitleElement.textContent = title;
        }
        this.updateCraftingMenu(); // Update content
        this.closeConflictingMenus('crafting');
        this.exitPointerLockIfNeeded();
    }

    // Specific station openers
    openWorkbenchMenu() { this.openCraftingMenu('workbench'); }
    openForgeMenu() { this.openCraftingMenu('forge'); }
    openCookingMenu() { this.openCraftingMenu('campfire'); }

    closeCraftingMenu() {
        if (this.isCraftingMenuOpen) {
            this.isCraftingMenuOpen = false;
            if(this.craftingMenuElement) this.craftingMenuElement.style.display = 'none';
            this.requestPointerLockIfNeeded();
        }
    }

     showPauseMenu() {
         if (this.pauseMenuElement && !this.isPauseMenuOpen) {
             this.isPauseMenuOpen = true;
             this.pauseMenuElement.style.display = 'block';
             this.closeConflictingMenus('pause');
             this.exitPointerLockIfNeeded();
         } else if (!this.pauseMenuElement) { console.error("Pause menu element not found."); }
     }

     hidePauseMenu() {
         if (this.pauseMenuElement && this.isPauseMenuOpen) {
             this.isPauseMenuOpen = false;
             this.pauseMenuElement.style.display = 'none';
             this.requestPointerLockIfNeeded();
         }
     }

      showDeathScreen() {
          if (this.deathScreenElement) {
              this.deathScreenElement.style.display = 'flex';
              this.closeConflictingMenus('death'); // Ensure all other menus are closed
              this.exitPointerLockIfNeeded();
          } else { console.error("Death screen element not found."); }
      }

      hideDeathScreen() {
          if (this.deathScreenElement) {
              this.deathScreenElement.style.display = 'none';
              // Pointer lock usually requested on resume/respawn
          }
      }

     // Helper to close other menus when one opens
     closeConflictingMenus(menuToKeep) {
        if (menuToKeep !== 'inventory' && this.isInventoryOpen) this.toggleInventory();
        if (menuToKeep !== 'build' && this.isBuildMenuOpen) this.game.playerController?.toggleBuildMode(); // Use controller toggle
        if (menuToKeep !== 'crafting' && this.isCraftingMenuOpen) this.closeCraftingMenu();
        if (menuToKeep !== 'pause' && this.isPauseMenuOpen) this.hidePauseMenu();
        if (menuToKeep !== 'debug' && this.isDebugMenuOpen) this.toggleDebugMenu();
        // Death screen usually overrides everything anyway
     }


    // --- UI Updates ---
    updateInventoryUI(inventory) {
        if (inventory) this.inventoryUI?.updateInventory(inventory);
        // Also update quickbar since inventory changes affect it
        this.updateQuickBarUI(inventory);
    }
    updateQuickBarUI(inventory) {
        if(inventory) this.inventoryUI?.updateQuickBar(inventory);
        // Update weapon UI if the change affected the selected slot
        this.updateWeaponUI(this.game.inventory?.getSelectedItem());
    }
    updateQuickBarSelection() {
        this.inventoryUI?.updateQuickBarSelection();
         // Update weapon UI when selection changes
        this.updateWeaponUI(this.game.inventory?.getSelectedItem());
    }
    updateBuildMode(isActive, selectedComponent) {
        this.buildingUI?.updateBuildMode(isActive, selectedComponent);
        // Show/hide build menu element based on PlayerController state
        if (isActive && !this.isBuildMenuOpen) this.openBuildMenu();
        else if (!isActive && this.isBuildMenuOpen) this.closeBuildMenu();
    }

    updateCraftingMenu() {
        if(!this.craftingItemsElement || !this.game.craftingSystem || !this.game.inventory) return;

        this.craftingItemsElement.innerHTML = ''; // Clear previous items
        const recipes = this.game.craftingSystem.getRecipes(this.currentCraftingStation);

        if (recipes.length === 0) {
             this.craftingItemsElement.innerHTML = '<p style="text-align: center; color: #888;">No recipes available here.</p>';
             return;
         }

        recipes.forEach(recipe => {
            if (!recipe || !recipe.id || !recipe.name) return; // Skip invalid recipes

            const canCraft = this.game.craftingSystem.canCraftRecipe(recipe);
            const elem = document.createElement('div');
            elem.className = `crafting-item ${canCraft ? 'available' : 'unavailable'}`;
            elem.dataset.item = recipe.id; // Store item ID for crafting

            const craftAmountText = (recipe.craftAmount ?? 1) > 1 ? ` (x${recipe.craftAmount})` : '';

            // Tooltip now shows current held amount vs required
            elem.innerHTML = `
                <div class="item-name">${recipe.name}${craftAmountText}</div>
                <div class. = "item-requirements" title = "${this.formatRequirementsTooltip(recipe.requirements)}">
                    Req: ${this.formatRequirements(recipe.requirements)}
                </div>
                <button class="craft-button" ${!canCraft ? 'disabled' : ''}>Craft</button>
            `;
            this.craftingItemsElement.appendChild(elem);
        });
    }
    // Helper to format requirements for display (concise)
    formatRequirements(reqs){
        if(!reqs || reqs.length === 0) return 'None';
        return reqs.slice(0, 2).map(r => {
            const itemInfo = Utils.items.getItemById(r.id); // Use central Utils
            return `${itemInfo?.name ?? r.id} x${r.amount}`;
        }).join(', ') + (reqs.length > 2 ? '...' : '');
    }
    // Helper to format requirements for tooltip (detailed with held count)
    formatRequirementsTooltip(reqs){
        if(!reqs || reqs.length === 0) return 'No requirements';
        return reqs.map(r => {
            const itemInfo = Utils.items.getItemById(r.id); // Use central Utils
            const count = this.game.inventory?.getItemCount(r.id) ?? 0; // Get current count
            return `- ${itemInfo?.name ?? r.id} x${r.amount} (${count} held)`;
        }).join('\n');
    }

    // --- Weapon UI ---
    updateWeaponUI(weaponItem, isReloading = false) {
        if (!this.weaponStatsElement) return;

        if (weaponItem && weaponItem.type === 'weapon') {
            this.weaponStatsElement.style.display = 'block'; // Show the element

            const weaponDef = this.game.inventory?.getItemById(weaponItem.id);
            const currentAmmo = weaponItem.currentAmmo ?? 0;
            const magazineSize = weaponDef?.magazineSize; // May be undefined for melee

            // Determine ammo type ID based on weapon ID (should be in Constants or weaponDef ideally)
            let ammoTypeId = null;
            if (weaponItem.id === 'rifle') ammoTypeId = 'rifleround';
            // else if (weaponItem.id === 'pistol') ammoTypeId = '9mm'; // Add other mappings

            const totalAmmoInInventory = ammoTypeId ? (this.game.inventory?.getItemCount(ammoTypeId) ?? 0) : 0;

            if (isReloading) {
                 this.weaponStatsElement.innerHTML = `<span>${weaponItem.name}</span> <span style="color: #ffcc00;">Reloading...</span>`;
             } else {
                 let magText = '';
                 if (typeof magazineSize === 'number' && magazineSize > 0) {
                     magText = ` / ${magazineSize}`;
                 }
                 // Red if empty and *is* a magazine weapon
                 const ammoColor = (currentAmmo === 0 && typeof magazineSize === 'number' && magazineSize > 0) ? '#ff6666' : '#ffffff';
                 this.weaponStatsElement.innerHTML = `
                     <span>${weaponItem.name}</span>
                     ${magText ? `<span style="color: ${ammoColor};">${currentAmmo}${magText}</span>` : ''}
                     ${ammoTypeId ? `<span> | ${totalAmmoInInventory}</span>` : ''}
                 `;
             }
        } else {
            // Hide the UI if no weapon or invalid item selected
            this.weaponStatsElement.style.display = 'none';
        }
    }


    // --- Interaction Prompt ---
    showInteractionPrompt(text) {
        if (this.interactionPromptElement) {
            this.interactionPromptElement.textContent = text;
            this.interactionPromptElement.style.display = 'block';
        }
    }

    hideInteractionPrompt() {
        if (this.interactionPromptElement) {
            this.interactionPromptElement.style.display = 'none';
        }
    }

    // --- Notifications & Indicators ---
    showNotification(message, duration = 3000) {
        if (!this.notificationElement) {
            console.warn("Notification element not found, cannot display:", message);
            return;
        }
        // Use textContent for security
        this.notificationElement.textContent = message;
        this.notificationElement.style.display = 'block'; // Make sure it's visible
        // Force reflow to ensure transition starts
        void this.notificationElement.offsetWidth;
        this.notificationElement.style.opacity = '1';


        // Clear existing timeout if any
        if (this.notificationTimeout) clearTimeout(this.notificationTimeout);

        // Set new timeout to fade out
        this.notificationTimeout = setTimeout(() => {
             if (this.notificationElement) {
                 this.notificationElement.style.opacity = '0';
                 // Use transitionend to set display none for smoother fade out
                 const transitionEndHandler = () => {
                      if (this.notificationElement) this.notificationElement.style.display = 'none';
                      this.notificationElement.removeEventListener('transitionend', transitionEndHandler);
                 };
                 this.notificationElement.addEventListener('transitionend', transitionEndHandler);
                 // Fallback timeout in case transitionend doesn't fire
                 setTimeout(() => {
                     if (this.notificationElement && this.notificationElement.style.opacity === '0') {
                         this.notificationElement.style.display = 'none';
                     }
                 }, 600); // Slightly longer than CSS transition (0.5s)
             }
        }, duration);
    }


    showHarvestNotification(resources) {
        if (!resources || Object.keys(resources).length === 0) return;
        const text = Object.entries(resources).map(([id, amt]) => {
            const itemInfo = Utils.items.getItemById(id);
            return `${itemInfo?.name ?? id} x${amt}`;
        }).join(', ');
        if(text) this.showNotification(`Harvested: ${text}`);
    }

    showStatusEffect(effect, isActive) {
        let msg;
        switch(effect){
            case 'bleeding': msg = isActive ? 'Bleeding!' : 'Bleeding stopped'; break;
            case 'wet': msg = isActive ? 'Wet' : 'Dried off'; break;
            case 'overheated': msg = isActive ? 'Overheating!' : 'Temperature normal'; break;
            case 'freezing': msg = isActive ? 'Freezing!' : 'Warmed up'; break;
            default: msg = isActive ? `Status: ${effect}` : `Ended: ${effect}`;
        }
        this.showNotification(msg);
        // Optionally update a dedicated status effect UI area
    }

    showDamageIndicator(amount) {
        if (!amount || amount <= 0) return; // Don't show for 0 damage
        const elem = document.createElement('div');
        elem.className = 'damage-indicator'; // Use class for styling
        elem.textContent = `-${Math.round(amount)}`; // Round damage for display

        document.body.appendChild(elem); // Append first

        // Position near center top after appending
        const rect = elem.getBoundingClientRect();
        elem.style.top = `40%`; // Adjust starting vertical position
        elem.style.left = `calc(50% - ${rect.width / 2}px)`; // Center horizontally

        // Trigger animation (uses CSS transitions defined in styles.css)
        requestAnimationFrame(() => {
             requestAnimationFrame(() => { // Double requestAnimationFrame ensures style application
                 elem.style.opacity = '0';
                 elem.style.transform = 'translateY(-80px)'; // Move up using transform
             });
        });

        // Remove after animation completes
        elem.addEventListener('transitionend', () => {
            if (elem.parentNode) elem.remove();
        }, { once: true });

        // Fallback removal timer
        setTimeout(() => {
             if (elem.parentNode) elem.remove();
         }, 900); // Slightly longer than transition (0.8s)
    }


    showSpoiledItemsNotification(spoiledItemNames) {
         if (!spoiledItemNames || spoiledItemNames.length === 0) return;
         let msg;
         if (spoiledItemNames.length === 1) {
             msg = `Your ${spoiledItemNames[0]} spoiled!`;
         } else {
             msg = `${spoiledItemNames.length} items spoiled!`;
         }
         this.showNotification(msg, 5000); // Show for longer
     }

}

// --- END OF FILE UIManager.js ---
