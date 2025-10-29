// --- START OF FILE InventoryUI.js ---

class InventoryUI {
    constructor(game, uiManager) {
        this.game = game;
        this.uiManager = uiManager;

        // UI elements
        this.inventoryGridElement = document.getElementById('inventory-grid');
        this.quickBarElement = document.getElementById('quick-bar');

        // Setup event handlers
        this.setupEventHandlers();

        // Initialize UI
        this.initializeUI();
    }

    setupEventHandlers() {
        // Inventory slot click
        if (this.inventoryGridElement) {
            this.inventoryGridElement.addEventListener('click', (e) => {
                const slotElement = e.target.closest('.inventory-slot');
                if (slotElement) {
                    const slotIndex = parseInt(slotElement.dataset.slot);
                    this.onInventorySlotClick(slotIndex);
                }
            });

            // Inventory drag and drop
            this.setupDragAndDrop();
        }

        // Quickbar slot click (to select) - Add if not handled elsewhere
        if (this.quickBarElement) {
            this.quickBarElement.addEventListener('click', (e) => {
                 const slotElement = e.target.closest('.quick-slot');
                 if (slotElement) {
                     const slotIndex = parseInt(slotElement.dataset.slot);
                     this.game.inventory?.selectQuickBarSlot(slotIndex);
                 }
            });
        }
    }

    setupDragAndDrop() {
        let draggedSlot = null; // Tracks the inventory slot index being dragged

        // --- Drag FROM Inventory Grid ---
        this.inventoryGridElement.addEventListener('dragstart', (e) => {
            const slotElement = e.target.closest('.inventory-slot');
            // Only allow dragging if the slot actually contains an item
            if (slotElement && this.game.inventory.inventorySlots[parseInt(slotElement.dataset.slot)]) {
                draggedSlot = parseInt(slotElement.dataset.slot);
                e.dataTransfer.effectAllowed = 'move';
                // Optional: Add visual feedback
                slotElement.classList.add('dragging');

                // Minimal drag image to hide default browser preview
                const dragImage = document.createElement('div');
                dragImage.style.width = '1px'; dragImage.style.height = '1px'; dragImage.style.opacity = '0';
                document.body.appendChild(dragImage);
                e.dataTransfer.setDragImage(dragImage, 0, 0);
                setTimeout(() => document.body.removeChild(dragImage), 0); // Clean up drag image
            } else {
                e.preventDefault(); // Prevent dragging empty slots
            }
        });

        // --- Drag OVER Inventory Grid Slots ---
        this.inventoryGridElement.addEventListener('dragover', (e) => {
            e.preventDefault(); // Necessary to allow dropping
            const slotElement = e.target.closest('.inventory-slot');
            if (slotElement && draggedSlot !== null) {
                e.dataTransfer.dropEffect = 'move';
                slotElement.classList.add('drag-over'); // Visual feedback
            }
        });

        // --- Drag LEAVE Inventory Grid Slots ---
        this.inventoryGridElement.addEventListener('dragleave', (e) => {
            const slotElement = e.target.closest('.inventory-slot');
            if (slotElement) {
                slotElement.classList.remove('drag-over');
            }
        });

        // --- Drop ON Inventory Grid Slot ---
        this.inventoryGridElement.addEventListener('drop', (e) => {
            e.preventDefault();
            const slotElement = e.target.closest('.inventory-slot');
            if (slotElement && draggedSlot !== null) {
                slotElement.classList.remove('drag-over');
                const targetSlot = parseInt(slotElement.dataset.slot);
                if (draggedSlot !== targetSlot) {
                    this.game.inventory.moveItemInInventory(draggedSlot, targetSlot);
                }
            }
            // Clean up in case dragend doesn't fire reliably
             const draggingElement = this.inventoryGridElement.querySelector('.dragging');
             if (draggingElement) draggingElement.classList.remove('dragging');
             draggedSlot = null;
        });

        // --- Drag END (anywhere) ---
        // Use document to catch dragend even if outside the grid
        document.addEventListener('dragend', (e) => {
            // Check if the original target was within the inventory grid
            const wasDraggingFromInventory = this.inventoryGridElement?.contains(e.target.closest('.inventory-slot'));

            if (wasDraggingFromInventory) {
                 // Clean up visuals regardless of drop success
                 const draggingElement = this.inventoryGridElement.querySelector('.dragging');
                 if (draggingElement) draggingElement.classList.remove('dragging');
                 const dragOverElements = this.inventoryGridElement.querySelectorAll('.drag-over');
                 dragOverElements.forEach(el => el.classList.remove('drag-over'));
                 // Also clean up quickbar drag-over
                 const quickDragOver = this.quickBarElement.querySelectorAll('.drag-over');
                 quickDragOver.forEach(el => el.classList.remove('drag-over'));
            }
             // Reset dragged slot regardless of source
             draggedSlot = null;
        }, false); // Use capture phase might not be necessary here

        // --- Drag OVER Quickbar Slots ---
        this.quickBarElement.addEventListener('dragover', (e) => {
            e.preventDefault();
            const slotElement = e.target.closest('.quick-slot');
            if (slotElement && draggedSlot !== null) {
                e.dataTransfer.dropEffect = 'move';
                slotElement.classList.add('drag-over');
            }
        });

        // --- Drag LEAVE Quickbar Slots ---
        this.quickBarElement.addEventListener('dragleave', (e) => {
            const slotElement = e.target.closest('.quick-slot');
            if (slotElement) {
                slotElement.classList.remove('drag-over');
            }
        });

        // --- Drop ON Quickbar Slot ---
        this.quickBarElement.addEventListener('drop', (e) => {
            e.preventDefault();
            const slotElement = e.target.closest('.quick-slot');
            if (slotElement && draggedSlot !== null) {
                slotElement.classList.remove('drag-over');
                const quickSlotIndex = parseInt(slotElement.dataset.slot);
                this.game.inventory.moveToQuickBar(draggedSlot, quickSlotIndex);
            }
             // Clean up in case dragend doesn't fire reliably
             const draggingElement = this.inventoryGridElement.querySelector('.dragging');
             if (draggingElement) draggingElement.classList.remove('dragging');
             draggedSlot = null;
        });
    }


    initializeUI() {
        // Create inventory slots
        if (this.inventoryGridElement) {
            this.inventoryGridElement.innerHTML = '';

            for (let i = 0; i < this.game.inventory.inventorySize; i++) {
                const slotElement = document.createElement('div');
                slotElement.className = 'inventory-slot';
                slotElement.dataset.slot = i;
                slotElement.draggable = true; // Make slots draggable

                this.inventoryGridElement.appendChild(slotElement);
            }
        }
         // Create quickbar slots (if not hardcoded in HTML)
         if (this.quickBarElement && !this.quickBarElement.querySelector('.quick-slot')) {
             this.quickBarElement.innerHTML = '';
             for (let i = 0; i < this.game.inventory.quickBarSize; i++) {
                 const quickSlotElement = document.createElement('div');
                 quickSlotElement.className = 'quick-slot';
                 quickSlotElement.dataset.slot = i;
                 this.quickBarElement.appendChild(quickSlotElement);
             }
         }
    }

    onInventorySlotClick(slotIndex) {
        const inventory = this.game.inventory;
        const item = inventory.inventorySlots[slotIndex];

        if (!item) return; // Clicked empty slot

        // Handle Right-Click (split stack)
        // Note: Context menu might interfere, might need preventDefault on 'contextmenu' event
        // if (event.button === 2) { // Assuming 'event' is passed or accessible
        //     inventory.splitStack(slotIndex);
        //     return;
        // }

        // Handle Left-Click (use or quickbar assign)
        if (item.type === 'food' || item.type === 'medical') {
            inventory.useItem(slotIndex);
        }
        // Simple assignment to first available quickbar slot
        else {
            const currentQuickbarIndex = inventory.quickBarSlots.findIndex(invIdx => invIdx === slotIndex);
            if (currentQuickbarIndex !== -1) {
                // Item is already on quickbar, maybe unassign? Or do nothing on simple click.
                 inventory.moveFromQuickBar(currentQuickbarIndex); // Example: Unassign on click
            } else {
                // Assign to first empty slot
                 const emptyQuickSlot = inventory.quickBarSlots.findIndex(invIdx => invIdx === null);
                 if (emptyQuickSlot !== -1) {
                     inventory.moveToQuickBar(slotIndex, emptyQuickSlot);
                 } else {
                     // Optional: Notify user quickbar is full
                     this.uiManager?.showNotification("Quickbar full!", 1500);
                 }
            }
        }
    }

    // --- Helper Function to Render Item ---
    // Assumes itemElement and item are VALID when called
    _renderItemElement(itemElement, item) {
        // --- Use background image ---
        const iconFilename = item.id + '.png'; // Assumes filenames match item IDs
        // *** IMPORTANT: Adjust the path '/images/icons/' if your folder structure is different ***
        itemElement.style.backgroundImage = `url(images/icons/${iconFilename})`;
        itemElement.style.backgroundSize = 'contain'; // Or 'cover'
        itemElement.style.backgroundRepeat = 'no-repeat';
        itemElement.style.backgroundPosition = 'center center';
        itemElement.innerHTML = ''; // Clear any previous text/elements

        // Set item name for potential styling/debugging
        itemElement.dataset.name = item.name;

        // Add amount if stackable (and more than 1)
        if (item.stackSize > 1 && item.amount > 1) { // Only show if amount > 1
            let amountElement = document.createElement('div');
            amountElement.className = 'item-amount';
            amountElement.textContent = item.amount;
            itemElement.appendChild(amountElement);
        }

        // Add durability bar for tools/weapons that have durability
        // Check if durability exists and is less than max (assuming 100 is max for display)
        const itemDef = this.game.inventory.getItemById(item.id);
        const maxDurability = itemDef?.durability; // Get max durability from definition
        if (typeof item.durability === 'number' && typeof maxDurability === 'number' && item.durability < maxDurability) {
            let durabilityElement = document.createElement('div');
            durabilityElement.className = 'item-durability';

            const durabilityFill = document.createElement('div');
            durabilityFill.className = 'durability-fill';
            const durabilityPercent = Math.max(0, (item.durability / maxDurability) * 100); // Use maxDurability
            durabilityFill.style.width = `${durabilityPercent}%`;

            // Color based on durability
            if (durabilityPercent > 60) durabilityFill.style.backgroundColor = '#4CAF50'; // Green
            else if (durabilityPercent > 30) durabilityFill.style.backgroundColor = '#FFC107'; // Yellow
            else durabilityFill.style.backgroundColor = '#F44336'; // Red

            durabilityElement.appendChild(durabilityFill);
            itemElement.appendChild(durabilityElement);
        }

        // Add tooltip with item info
        itemElement.title = this.createItemTooltip(item);
    }


    updateInventory(inventory) {
        if (!this.inventoryGridElement) return;

        const slots = this.inventoryGridElement.querySelectorAll('.inventory-slot');
        slots.forEach((slotElement, i) => {
            const item = inventory.inventorySlots[i];
            let itemDisplayElement = slotElement.querySelector('.inventory-item');

            if (item) {
                // Item exists in data
                if (!itemDisplayElement) {
                    // Create the DOM element if it's missing
                    itemDisplayElement = document.createElement('div');
                    itemDisplayElement.className = 'inventory-item';
                    slotElement.appendChild(itemDisplayElement);
                }
                // Update the content of the existing or newly created element
                this._renderItemElement(itemDisplayElement, item);
                slotElement.draggable = true; // Make draggable since it has an item
            } else {
                // Item does NOT exist in data
                if (itemDisplayElement) {
                    // Remove the DOM element if it exists
                    slotElement.removeChild(itemDisplayElement);
                }
                slotElement.draggable = false; // Make non-draggable empty slot
                slotElement.title = ''; // Clear tooltip
            }
        });

        // Update quickbar as well, as inventory changes might affect it
        this.updateQuickBar(inventory);
    }


    updateQuickBar(inventory) {
        if (!this.quickBarElement) return;

        const quickSlots = this.quickBarElement.querySelectorAll('.quick-slot');
        quickSlots.forEach((slotElement, i) => {
            const inventorySlotIndex = inventory.quickBarSlots[i];
            const item = (inventorySlotIndex !== null) ? inventory.inventorySlots[inventorySlotIndex] : null;
            let itemDisplayElement = slotElement.querySelector('.inventory-item');

            if (item) {
                // Item exists
                if (!itemDisplayElement) {
                    itemDisplayElement = document.createElement('div');
                    itemDisplayElement.className = 'inventory-item';
                    slotElement.appendChild(itemDisplayElement);
                }
                this._renderItemElement(itemDisplayElement, item);
            } else {
                // Item does NOT exist
                if (itemDisplayElement) {
                    slotElement.removeChild(itemDisplayElement);
                }
                 slotElement.title = ''; // Clear tooltip for empty quick slot
            }
        });

        // Update selection highlight
        this.updateQuickBarSelection();
    }

    updateQuickBarSelection() {
        if (!this.quickBarElement) return;

        const quickSlots = this.quickBarElement.querySelectorAll('.quick-slot');
        quickSlots.forEach((slot, i) => {
            if (i === this.game.inventory.selectedSlot) {
                slot.classList.add('selected');
            } else {
                slot.classList.remove('selected');
            }
        });
    }

    createItemTooltip(item) {
        let tooltip = item.name;
        const itemDef = this.game.inventory.getItemById(item.id);
        const maxDurability = itemDef?.durability;

        // Stack info
        if (item.stackSize > 1) {
            tooltip += ` (${item.amount}/${item.stackSize})`;
        }

        // Durability info
        if (typeof item.durability === 'number' && typeof maxDurability === 'number') {
            tooltip += `\nDurability: ${item.durability}/${maxDurability}`;
        }

        // Ammo info for weapons
        if (item.type === 'weapon' && typeof item.currentAmmo === 'number') {
            const magSize = itemDef?.magazineSize ?? '?';
            tooltip += `\nAmmo: ${item.currentAmmo}/${magSize}`;
        }

        // Damage for weapons/tools
        if (itemDef?.damage) {
            tooltip += `\nDamage: ${itemDef.damage}`;
        }

        // Effects for consumables
        if (item.type === 'medical' && itemDef?.healAmount) {
            tooltip += `\nHeals: ${itemDef.healAmount} HP`;
        }
        if (item.type === 'food' && itemDef?.hungerRestore) {
            tooltip += `\nRestores: ${itemDef.hungerRestore} Hunger`;
            if (itemDef?.healthRestore) tooltip += ` (+${itemDef.healthRestore} HP)`;
        }

        return tooltip;
    }
}

// --- END OF FILE InventoryUI.js ---