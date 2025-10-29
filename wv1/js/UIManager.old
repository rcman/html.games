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
        this.isDebugMenuOpen = false; // <<< ADDED Debug menu state
        this.currentCraftingStation = 'basic';

        // Core UI element references
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

        // <<< ADDED Debug Control References >>>
        this.debugControlsElement = document.getElementById('debug-controls');
        this.debugTimeSlider = document.getElementById('debug-time-of-day');
        this.debugTimeValue = document.getElementById('debug-time-value');
        this.debugSunSlider = document.getElementById('debug-sun-intensity');
        this.debugSunValue = document.getElementById('debug-sun-value');
        this.debugAmbientSlider = document.getElementById('debug-ambient-intensity');
        this.debugAmbientValue = document.getElementById('debug-ambient-value');
        // <<< END ADDED >>>

        // Notification management
        this.notificationTimeout = null;

        // NOTE: init() is called from Game.js *after* systems are ready
    }

    init() {
        console.log("Initializing UIManager...");
        if (!this.interactionPromptElement) console.error("Interaction prompt element not found!");
        if (!this.notificationElement) console.error("Notification element not found!");
        if (!this.debugControlsElement) console.error("Debug controls element not found!"); // Check debug elements
        if (!this.pauseMenuElement) console.error("Pause menu element not found!");
        if (!this.deathScreenElement) console.error("Death screen element not found!");


        // Initialize inventory UI
        if (typeof InventoryUI !== 'undefined') {
             this.inventoryUI = new InventoryUI(this.game, this);
         } else { console.error("InventoryUI class not found."); }

        // Initialize building UI
        if (typeof BuildingUI !== 'undefined') {
             this.buildingUI = new BuildingUI(this.game, this);
         } else { console.error("BuildingUI class not found."); }

        // Setup event listeners managed by UIManager itself
        this.setupEventListeners();

        // Initial update for weapon UI (likely shows nothing initially)
        this.updateWeaponUI(null);
        console.log("UIManager Initialized.");
    }

    setupEventListeners() {
        document.addEventListener('keydown', (e) => {
            // --- Debug Log (Keep this) ---
            console.log(`Keydown event: Key='${e.key}', Code='${e.code}', ActiveElement=${document.activeElement?.tagName}, PointerLocked=${!!document.pointerLockElement}`);
            // --- End Debug Log ---

            // Ensure we are not typing in an input field
             if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
                // Allow Escape key even when input focused, but maybe not others?
                if (e.key === 'Escape') {
                    // Find which menu is open and close it
                    if (this.isInventoryOpen) this.toggleInventory();
                    else if (this.isBuildMenuOpen) this.game.playerController?.toggleBuildMode();
                    else if (this.isCraftingMenuOpen) this.closeCraftingMenu();
                    else if (this.isDebugMenuOpen) this.toggleDebugMenu(); // Close debug with Escape too
                    else if (this.isPauseMenuOpen) this.game.resume();
                    document.activeElement.blur(); // Remove focus from input
                }
                return; // Don't process other game keys when typing
             }


            if (e.key >= '1' && e.key <= '8') {
                 // Only change quickbar if no major UI panel is open
                if (!this.isInventoryOpen && !this.isCraftingMenuOpen && !this.isBuildMenuOpen && !this.isPauseMenuOpen && !this.isDebugMenuOpen) { // Check debug menu too
                     const slotIndex = parseInt(e.key) - 1;
                     this.game.inventory?.selectQuickBarSlot(slotIndex);
                 }
            }
            // Close menus with Escape key
             else if (e.key === 'Escape') {
                  // Prioritize closing open menus
                 if (this.isInventoryOpen) this.toggleInventory();
                 else if (this.isBuildMenuOpen) this.game.playerController?.toggleBuildMode(); // Use toggle to clean up preview
                 else if (this.isCraftingMenuOpen) this.closeCraftingMenu();
                 else if (this.isDebugMenuOpen) this.toggleDebugMenu(); // Close debug menu
                 else if (this.isPauseMenuOpen) this.game.resume(); // Resume game from pause menu
                 else if (document.pointerLockElement) document.exitPointerLock(); // Release pointer lock if no menus open
                 else if (this.game.running) this.game.pause(); // Pause if game running and pointer unlocked
             }
             // Added inventory toggle key 'I'
             else if (e.key.toLowerCase() === 'i') {
                 // --- Debug Log (Keep this) ---
                 console.log("Detected 'i' key press, calling toggleInventory...");
                 // --- End Debug Log ---
                 this.toggleInventory();
             }
             // Added build menu toggle key 'B' (handled in PlayerController, but UI needs to react)
             // Added crafting menu toggle key 'C'
             else if (e.key.toLowerCase() === 'c') {
                 if (this.isCraftingMenuOpen) this.closeCraftingMenu();
                 else this.openCraftingMenu('basic'); // Open basic crafting
             }
             // <<< ADDED: Toggle Debug Menu Key (Backtick `) >>>
             else if (e.key === '`') {
                 this.toggleDebugMenu();
             }
             // <<< END ADDED >>>
        });


        // Crafting menu button clicks
        if (this.craftingItemsElement) {
             this.craftingItemsElement.addEventListener('click', (e) => {
                 const craftButton = e.target.closest('.craft-button'); // Find closest button
                 if (craftButton && !craftButton.disabled) { // Check if button exists and is not disabled
                     const itemElement = craftButton.closest('.crafting-item');
                     if (itemElement) {
                         const itemId = itemElement.dataset.item;
                         if (itemId) {
                             const success = this.game.craftingSystem?.craftItem(itemId, 1, this.currentCraftingStation);
                             if(success) {
                                this.updateCraftingMenu(); // Refresh list after successful craft
                                this.inventoryUI?.updateInventory(this.game.inventory); // Update main inventory view too
                                this.buildingUI?.updateBuildMenu(); // Update build menu costs
                             }
                         }
                     }
                 }
             });
         } else { console.error("Crafting items element not found for event listener setup."); }

        // Other listeners (like quickbar clicks) are likely handled within InventoryUI/BuildingUI

         // <<< ADDED: Debug Slider Listeners >>>
         if (this.debugTimeSlider) {
            this.debugTimeSlider.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                this.game.dayNightCycle = value; // Directly set game time cycle
                if(this.debugTimeValue) this.debugTimeValue.textContent = value.toFixed(2);
                // Force update visuals (optional, update loop should catch it)
                // this.game.updateDayNightCycle();
            });
         }
         if (this.debugSunSlider) {
            this.debugSunSlider.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                if(this.game.sunLight) this.game.sunLight.intensity = value;
                if(this.debugSunValue) this.debugSunValue.textContent = value.toFixed(2);
            });
         }
         if (this.debugAmbientSlider) {
            this.debugAmbientSlider.addEventListener('input', (e) => {
                const value = parseFloat(e.target.value);
                if(this.game.ambientLight) this.game.ambientLight.intensity = value;
                if(this.debugAmbientValue) this.debugAmbientValue.textContent = value.toFixed(2);
            });
         }
         // <<< END ADDED >>>

         // Pause Menu Buttons
         const resumeButton = document.getElementById('resume-button');
         const saveButton = document.getElementById('save-button');
         const loadButton = document.getElementById('load-button');
         const mainMenuButton = document.getElementById('main-menu-button'); // If you have one

         if(resumeButton) resumeButton.addEventListener('click', () => this.game.resume());
         if(saveButton) saveButton.addEventListener('click', () => {
             if (typeof this.game.saveGame === 'function') {
                 this.game.saveGame();
                 this.showNotification("Game Saved!", 2000);
             } else { console.error("Game.saveGame() not found"); }
         });
         if(loadButton) loadButton.addEventListener('click', () => {
              if (confirm("Load last save? Any unsaved progress will be lost.")) {
                  if (typeof this.game.loadGame === 'function') {
                      this.game.loadGame();
                      this.showNotification("Game Loaded!", 2000);
                      // Resume game after load?
                      this.game.resume();
                  } else { console.error("Game.loadGame() not found"); }
              }
          });
         // if(mainMenuButton) mainMenuButton.addEventListener('click', () => { /* Add logic to return to main menu */ window.location.reload(); });

         // Death Screen Button
         const respawnButton = document.getElementById('respawn-button');
         if (respawnButton) {
             respawnButton.addEventListener('click', () => {
                 if (this.game.characterStats && typeof this.game.characterStats.respawn === 'function') {
                     this.game.characterStats.respawn();
                     this.hideDeathScreen();
                     this.game.resume(); // Resume game on respawn
                 } else { console.error("CharacterStats.respawn() not found."); }
             });
         }

        // Quick Save/Load Buttons (Optional, outside menus)
        const quickSaveButton = document.getElementById('quick-save-button');
        const quickLoadButton = document.getElementById('quick-load-button');
        if(quickSaveButton) quickSaveButton.addEventListener('click', () => {
             if (typeof this.game.saveGame === 'function') {
                 this.game.saveGame();
                 this.showNotification("Game Saved!", 2000);
             } else { console.error("Game.saveGame() not found"); }
         });
        if(quickLoadButton) quickLoadButton.addEventListener('click', () => {
              if (confirm("Load last quick save? Any unsaved progress will be lost.")) {
                  if (typeof this.game.loadGame === 'function') {
                      this.game.loadGame();
                      this.showNotification("Game Loaded!", 2000);
                      if(!this.isPauseMenuOpen) this.game.resume(); // Resume if not paused
                  } else { console.error("Game.loadGame() not found"); }
              }
         });

    }

    update(deltaTime) {
        // Update UI elements that need continuous updates (e.g., timers, animations)
        // Update debug UI values if open
        if (this.isDebugMenuOpen) {
            if (this.game.sunLight && this.debugSunValue) {
                this.debugSunValue.textContent = this.game.sunLight.intensity.toFixed(2);
                if(this.debugSunSlider && parseFloat(this.debugSunSlider.value) !== this.game.sunLight.intensity) { // Sync slider if changed elsewhere
                    this.debugSunSlider.value = this.game.sunLight.intensity;
                }
            }
            if (this.game.ambientLight && this.debugAmbientValue) {
                this.debugAmbientValue.textContent = this.game.ambientLight.intensity.toFixed(2);
                 if(this.debugAmbientSlider && parseFloat(this.debugAmbientSlider.value) !== this.game.ambientLight.intensity) {
                    this.debugAmbientSlider.value = this.game.ambientLight.intensity;
                }
            }
            if (this.debugTimeValue) {
                this.debugTimeValue.textContent = this.game.dayNightCycle.toFixed(2);
                if(this.debugTimeSlider && parseFloat(this.debugTimeSlider.value) !== this.game.dayNightCycle) {
                   this.debugTimeSlider.value = this.game.dayNightCycle;
               }
            }
        }
    }

    // --- Menu Toggles & Management ---

    // <<< ADDED: Toggle Debug Menu >>>
    toggleDebugMenu() {
        this.isDebugMenuOpen = !this.isDebugMenuOpen;
        if (this.debugControlsElement) this.debugControlsElement.style.display = this.isDebugMenuOpen ? 'block' : 'none';

        if (this.isDebugMenuOpen) {
            // Close other menus
            if (this.isInventoryOpen) this.toggleInventory();
            if (this.isBuildMenuOpen) this.game.playerController?.toggleBuildMode();
            if (this.isCraftingMenuOpen) this.closeCraftingMenu();
            if (this.isPauseMenuOpen) this.hidePauseMenu();
            // Sync slider values to current game state when opening
            this.update(0); // Force update of debug values display

            if(document.pointerLockElement) document.exitPointerLock();
        } else {
            // Attempt re-lock pointer only if no other menus are open
            if (!this.isInventoryOpen && !this.isCraftingMenuOpen && !this.isBuildMenuOpen && !this.isPauseMenuOpen) {
                this.game.renderer?.domElement.requestPointerLock();
            }
        }
    }
    // <<< END ADDED >>>

    toggleInventory() {
        // --- Debug Log (Keep this) ---
        console.log("toggleInventory called. Current state:", this.isInventoryOpen);
        console.log("Inventory Element:", this.inventoryElement); // Check if this is null
        // --- End Debug Log ---

        this.isInventoryOpen = !this.isInventoryOpen;
        if (this.inventoryElement) {
            // --- Use setProperty for potential specificity/!important test ---
            // this.inventoryElement.style.setProperty('display', this.isInventoryOpen ? 'flex' : 'none', 'important'); // Temporary test
            this.inventoryElement.style.display = this.isInventoryOpen ? 'flex' : 'none'; // Revert if !important wasn't needed
             // --- Debug Log (Keep this) ---
             console.log("Set inventory display to:", this.inventoryElement.style.display);
             // --- End Debug Log ---
        } else {
            console.error("Inventory element reference is missing in UIManager!"); // Important log
        }

        if (this.isInventoryOpen) {
            this.updateInventoryUI(this.game.inventory); // Update content when opening
            // Close other potentially conflicting menus
            if (this.isBuildMenuOpen) this.game.playerController?.toggleBuildMode(); // Use controller toggle
            this.closeCraftingMenu();
            if (this.isPauseMenuOpen) this.hidePauseMenu(); // Close pause menu if opening inventory
            if (this.isDebugMenuOpen) this.toggleDebugMenu(); // Close debug menu

            if(document.pointerLockElement) {
                console.log("Exiting pointer lock because inventory is opening."); // Log exit reason
                document.exitPointerLock(); // Release mouse
            }
        } else {
             // Attempt to re-lock pointer only if no other menus are open
             if (!this.isCraftingMenuOpen && !this.isBuildMenuOpen && !this.isPauseMenuOpen && !this.isDebugMenuOpen) { // check debug
                 console.log("Requesting pointer lock because inventory is closing and no other menus are open."); // Log request reason
                 this.game.renderer?.domElement.requestPointerLock();
             }
        }
    }


    openBuildMenu() {
        // This is primarily controlled by PlayerController.toggleBuildMode now
        // UIManager just handles the visual display part
        if (!this.isBuildMenuOpen) {
            this.isBuildMenuOpen = true;
            if(this.buildMenuElement) this.buildMenuElement.style.display = 'flex'; // Use flex
            this.buildingUI?.updateBuildMenu(); // Update content
            // Ensure other menus are closed
            this.closeCraftingMenu();
            if (this.isInventoryOpen) this.toggleInventory();
            if (this.isPauseMenuOpen) this.hidePauseMenu();
            if (this.isDebugMenuOpen) this.toggleDebugMenu(); // Close debug menu


            if(document.pointerLockElement) document.exitPointerLock();
        }
    }

    closeBuildMenu() {
        // This is primarily controlled by PlayerController.toggleBuildMode now
        if (this.isBuildMenuOpen) {
            this.isBuildMenuOpen = false;
            if(this.buildMenuElement) this.buildMenuElement.style.display = 'none';
             // Attempt re-lock pointer if closing the last menu
             if (!this.isCraftingMenuOpen && !this.isInventoryOpen && !this.isPauseMenuOpen && !this.isDebugMenuOpen) { // check debug
                 this.game.renderer?.domElement.requestPointerLock();
             }
        }
    }

    openCraftingMenu(stationType = 'basic') {
        this.isCraftingMenuOpen = true;
        this.currentCraftingStation = stationType;
        if(this.craftingMenuElement) this.craftingMenuElement.style.display = 'flex'; // Use flex for column layout
        if(this.craftingTitleElement) {
            switch (stationType) {
                case 'workbench': this.craftingTitleElement.textContent = 'Workbench'; break;
                case 'forge': this.craftingTitleElement.textContent = 'Forge'; break;
                case 'campfire': this.craftingTitleElement.textContent = 'Campfire'; break;
                default: this.craftingTitleElement.textContent = 'Crafting';
            }
        }
        this.updateCraftingMenu(); // Update content
        // Ensure other menus are closed
        if (this.isBuildMenuOpen) this.game.playerController?.toggleBuildMode();
        if (this.isInventoryOpen) this.toggleInventory();
        if (this.isPauseMenuOpen) this.hidePauseMenu();
        if (this.isDebugMenuOpen) this.toggleDebugMenu(); // Close debug menu


        if(document.pointerLockElement) document.exitPointerLock();
    }
    // Specific station openers
    openWorkbenchMenu() { this.openCraftingMenu('workbench'); }
    openForgeMenu() { this.openCraftingMenu('forge'); }
    openCookingMenu() { this.openCraftingMenu('campfire'); } // Assuming campfire uses 'campfire' type

    closeCraftingMenu() {
        if (this.isCraftingMenuOpen) {
            this.isCraftingMenuOpen = false;
            if(this.craftingMenuElement) this.craftingMenuElement.style.display = 'none';
             // Attempt re-lock pointer if closing the last menu
             if (!this.isBuildMenuOpen && !this.isInventoryOpen && !this.isPauseMenuOpen && !this.isDebugMenuOpen) { // check debug
                 this.game.renderer?.domElement.requestPointerLock();
             }
        }
    }

     // Pause Menu
     showPauseMenu() {
         if (this.pauseMenuElement) {
             this.isPauseMenuOpen = true;
             this.pauseMenuElement.style.display = 'block';
             // Ensure other menus are closed when pausing
             if (this.isInventoryOpen) this.toggleInventory();
             if (this.isBuildMenuOpen) this.game.playerController?.toggleBuildMode();
             if (this.isCraftingMenuOpen) this.closeCraftingMenu();
             if (this.isDebugMenuOpen) this.toggleDebugMenu(); // Close debug menu

             // Release pointer lock when showing pause menu
             if (document.pointerLockElement) document.exitPointerLock();
         } else { console.error("Pause menu element not found."); }
     }

     hidePauseMenu() {
         if (this.pauseMenuElement) {
             this.isPauseMenuOpen = false;
             this.pauseMenuElement.style.display = 'none';
             // Attempt to re-lock pointer when resuming IF no other menu is open
             if (!this.isInventoryOpen && !this.isBuildMenuOpen && !this.isCraftingMenuOpen && !this.isDebugMenuOpen) { // check debug
                  this.game.renderer?.domElement.requestPointerLock();
              }
         }
     }

      // Death Screen
      showDeathScreen() {
          if (this.deathScreenElement) {
              this.deathScreenElement.style.display = 'flex';
              // Ensure other menus are closed
               if (this.isInventoryOpen) this.toggleInventory();
               if (this.isBuildMenuOpen) this.game.playerController?.toggleBuildMode();
               if (this.isCraftingMenuOpen) this.closeCraftingMenu();
               if (this.isPauseMenuOpen) this.hidePauseMenu();
               if (this.isDebugMenuOpen) this.toggleDebugMenu(); // Close debug menu

              if(document.pointerLockElement) document.exitPointerLock();
          } else { console.error("Death screen element not found."); }
      }

      hideDeathScreen() {
          if (this.deathScreenElement) {
              this.deathScreenElement.style.display = 'none';
               // Re-lock pointer might happen automatically on respawn/resume
               // Attempt re-lock pointer when resuming IF no other menu is open
               if (!this.isInventoryOpen && !this.isBuildMenuOpen && !this.isCraftingMenuOpen && !this.isDebugMenuOpen) { // check debug
                    this.game.renderer?.domElement.requestPointerLock();
                }
          }
      }

    // --- UI Updates ---
    updateInventoryUI(inventory) { this.inventoryUI?.updateInventory(inventory); }
    updateQuickBarUI(inventory) { this.inventoryUI?.updateQuickBar(inventory); }
    updateQuickBarSelection() { this.inventoryUI?.updateQuickBarSelection(); }
    updateBuildMode(isActive, selectedComponent) { this.buildingUI?.updateBuildMode(isActive, selectedComponent); }

    updateCraftingMenu() {
        if(!this.craftingItemsElement || !this.game.craftingSystem || !this.game.inventory) return;

        this.craftingItemsElement.innerHTML = ''; // Clear previous items
        const recipes = this.game.craftingSystem.getRecipes(this.currentCraftingStation);

        if (recipes.length === 0) {
             this.craftingItemsElement.innerHTML = '<p style="text-align: center; color: #888;">No recipes available for this station.</p>';
             return;
         }

        recipes.forEach(recipe => {
            if (!recipe || !recipe.id || !recipe.name) return; // Skip invalid recipes

            const canCraft = this.game.craftingSystem.canCraftRecipe(recipe);
            const elem = document.createElement('div');
            elem.className = `crafting-item ${canCraft ? 'available' : 'unavailable'}`;
            elem.dataset.item = recipe.id; // Store item ID for crafting

            const craftAmountText = (recipe.craftAmount ?? 1) > 1 ? ` (x${recipe.craftAmount})` : '';

            elem.innerHTML = `
                <div class="item-name">${recipe.name}${craftAmountText}</div>
                <div class="item-requirements" title="${this.formatRequirementsTooltip(recipe.requirements)}">
                    Req: ${this.formatRequirements(recipe.requirements)}
                </div>
                <button class="craft-button" ${!canCraft ? 'disabled' : ''}>Craft</button>
            `;
            this.craftingItemsElement.appendChild(elem);
        });
    }
    // Helper to format requirements for display
    formatRequirements(reqs){
        if(!reqs || reqs.length === 0) return 'None';
        // Show first 2-3 requirements concisely
        return reqs.slice(0, 2).map(r => {
            const itemInfo = Utils.items.getItemById(r.id);
            return `${itemInfo?.name ?? r.id} x${r.amount}`;
        }).join(', ') + (reqs.length > 2 ? '...' : '');
    }
    // Helper to format requirements for tooltip
    formatRequirementsTooltip(reqs){
        if(!reqs || reqs.length === 0) return 'No requirements';
        return reqs.map(r => {
            const itemInfo = Utils.items.getItemById(r.id);
            const count = this.game.inventory?.getItemCount(r.id) ?? 0; // Get current count
            return `- ${itemInfo?.name ?? r.id} x${r.amount} (${count} held)`;
        }).join('\n');
    }

    // --- Weapon UI ---
    updateWeaponUI(weaponItem, isReloading = false) {
        if (!this.weaponStatsElement) return;

        if (weaponItem && weaponItem.type === 'weapon') {
            this.weaponStatsElement.style.display = 'block'; // Show the element

            const currentAmmo = weaponItem.currentAmmo ?? 0; // Default to 0 if undefined
            const magazineSize = this.game.inventory?.getMagazineSizeForItem(weaponItem.id) ?? '?'; // Use helper

            // Determine ammo type ID based on weapon ID
            let ammoTypeId = null;
            if (weaponItem.id === 'rifle') ammoTypeId = 'rifleround';
            // else if (weaponItem.id === 'pistol') ammoTypeId = '9mm'; // Add other mappings

            const totalAmmo = ammoTypeId ? (this.game.inventory?.getItemCount(ammoTypeId) ?? 0) : 0;

            if (isReloading) {
                 this.weaponStatsElement.innerHTML = `<span>${weaponItem.name}</span> <span style="color: #ffcc00;">Reloading...</span>`;
             } else {
                 const magText = (magazineSize > 0 && typeof magazineSize === 'number') ? ` / ${magazineSize}` : ''; // Don't show /0 or /? for melee etc.
                 const ammoColor = currentAmmo === 0 && magazineSize > 0 && typeof magazineSize === 'number' ? '#ff6666' : '#ffffff'; // Red if empty magazine weapon
                 this.weaponStatsElement.innerHTML = `
                     <span>${weaponItem.name}</span>
                     <span style="color: ${ammoColor};">${currentAmmo}${magText}</span>
                     ${ammoTypeId ? `<span> | ${totalAmmo}</span>` : ''}
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
        if (!this.notificationElement) return; // Don't create if missing from HTML
        this.notificationElement.textContent = message;
        this.notificationElement.style.opacity = '1';
        this.notificationElement.style.display = 'block'; // Ensure it's block

        // Clear existing timeout if any
        if (this.notificationTimeout) clearTimeout(this.notificationTimeout);

        // Set new timeout to hide
        this.notificationTimeout = setTimeout(() => {
             if (this.notificationElement) this.notificationElement.style.opacity = '0';
             // Optionally set display to none after transition:
             setTimeout(() => { if (this.notificationElement) this.notificationElement.style.display = 'none'; }, 500); // Hide after fade
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
        // Styles applied via CSS are generally better, but fallback inline styles:
        elem.style.position = 'fixed';
        elem.style.top = '45%';
        elem.style.left = '50%';
        // elem.style.transform = 'translateX(-50%) translateY(-100%)'; // Start slightly higher - Now handled in transition
        elem.style.color = '#ff4444';
        elem.style.fontSize = '24px';
        elem.style.fontWeight = 'bold';
        elem.style.textShadow = '0 0 3px black, 0 0 3px black'; // Thicker shadow
        elem.style.pointerEvents = 'none';
        elem.style.zIndex = '1001';
        elem.style.transition = 'opacity 0.8s ease-out, transform 0.8s ease-out'; // Use transform for movement
        elem.style.opacity = '1'; // Start visible
        elem.style.transform = 'translateX(-50%) translateY(0)'; // Start at initial position
        document.body.appendChild(elem);

        // Animate upwards and fade out
        requestAnimationFrame(() => {
             // Ensure style changes happen in the next frame after appending
             requestAnimationFrame(() => {
                 elem.style.opacity = '0';
                 elem.style.transform = 'translateX(-50%) translateY(-100px)'; // Move up further using transform
             });
        });

        // Remove after animation completes (using transitionend is more reliable)
        elem.addEventListener('transitionend', () => {
            // Check if the element still has a parent before removing
            if (elem.parentNode) {
                 elem.remove();
            }
        }, { once: true }); // Use once: true to automatically remove listener

        // Fallback removal timer in case transitionend doesn't fire (e.g., element removed early)
        setTimeout(() => {
             if (elem.parentNode) {
                 elem.remove();
             }
         }, 900); // Slightly longer than transition
    }


    showSpoiledItemsNotification(spoiledItemNames) {
         if (!spoiledItemNames || spoiledItemNames.length === 0) return;
         let msg;
         if (spoiledItemNames.length === 1) {
             msg = `Your ${spoiledItemNames[0]} spoiled!`;
         } else {
             msg = `${spoiledItemNames.length} items spoiled!`;
             // Optional: List first few items in tooltip or console
             // console.log("Spoiled items:", spoiledItemNames.join(', '));
         }
         this.showNotification(msg, 5000); // Show for longer
     }

}