// --- START OF FILE Inventory.js ---

class Inventory {
    constructor(game) {
        this.game = game;
        this.inventorySize = 32;
        this.quickBarSize = 8;
        this.inventorySlots = Array(this.inventorySize).fill(null);
        this.quickBarSlots = Array(this.quickBarSize).fill(null);
        this.selectedSlot = 0;
        this.spoilableItems = new Map();
        this._spoilCheckTimer = 0; // Internal timer for checking spoils
    }

    // Add an item to inventory
    addItem(itemId, amount = 1) {
        const itemDef = this.getItemById(itemId);
        if (!itemDef) { console.error(`Inventory.addItem: Unknown item ID '${itemId}'`); return false; }

        let remainingAmount = amount;
        const isWeapon = itemDef.type === 'weapon'; // Check if it's a weapon

        // --- Handle Non-Stackable or Weapon Items (stackSize = 1 or isWeapon) ---
        if (!itemDef.stackSize || itemDef.stackSize === 1 || isWeapon) {
            for (let i = 0; i < amount; i++) { // Add each individually
                const emptySlot = this.findEmptyInventorySlot();
                if (emptySlot !== -1) {
                    this.inventorySlots[emptySlot] = {
                        id: itemId,
                        name: itemDef.name,
                        type: itemDef.type,
                        amount: 1,
                        stackSize: 1, // Force stack size 1 for weapons too
                        durability: itemDef.durability,
                        // --- ADDED: Initialize currentAmmo for weapons ---
                        currentAmmo: isWeapon ? 0 : undefined, // Start empty, requires reload
                        // --- END ADDITION ---
                        createdTime: Date.now()
                    };
                } else {
                    console.warn("Inventory full! Could not add item:", itemId);
                    this.updateUI();
                    return i > 0; // Return true if at least one was added
                }
            }
            this.updateUI();
            return true; // All items added
        }

        // --- Handle Stackable Items (Non-Weapons) ---
        // 1. Add to existing stacks
        for (let i = 0; i < this.inventorySize && remainingAmount > 0; i++) {
            const slot = this.inventorySlots[i];
            if (slot && slot.id === itemId && slot.amount < slot.stackSize) {
                const canAdd = slot.stackSize - slot.amount;
                const amountToAdd = Math.min(canAdd, remainingAmount);
                slot.amount += amountToAdd;
                remainingAmount -= amountToAdd;
                if (itemDef.spoilTime) this.trackSpoilableItem(i);
            }
        }
        // 2. Add to new slots
        while (remainingAmount > 0) {
            const emptySlot = this.findEmptyInventorySlot();
            if (emptySlot !== -1) {
                const amountToAdd = Math.min(itemDef.stackSize, remainingAmount);
                this.inventorySlots[emptySlot] = {
                    id: itemId, name: itemDef.name, type: itemDef.type,
                    amount: amountToAdd, stackSize: itemDef.stackSize,
                    createdTime: Date.now()
                };
                remainingAmount -= amountToAdd;
                if (itemDef.spoilTime) this.trackSpoilableItem(emptySlot);
            } else {
                console.warn("Inventory full! Could not add all stackable items:", itemId, "Remaining:", remainingAmount);
                this.updateUI();
                return amount > remainingAmount; // true if some were added
            }
        }
        this.updateUI();
        return true;
    }

    // Get item definition by ID from Constants
    getItemById(id) {
        if (typeof Constants === 'undefined' || !Constants.ITEMS) { console.error("Constants.ITEMS is not defined!"); return null; }
        // --- UPDATED: Search includes AMMO category ---
        const categories = [
            Constants.ITEMS.TOOLS, Constants.ITEMS.RESOURCES, Constants.ITEMS.PROCESSED,
            Constants.ITEMS.AMMO, // Added Ammo
            Constants.ITEMS.CRAFTABLES, Constants.ITEMS.WORKBENCH_CRAFTABLES, Constants.ITEMS.FORGE_CRAFTABLES
        ];
        // --- END UPDATE ---
        for (const category of categories) {
            if (category && Array.isArray(category)) {
                const item = category.find(item => item && item.id === id);
                if (item) return item;
            }
        }
        console.warn(`Item definition with ID '${id}' not found in Constants.ITEMS`);
        return null;
    }

    // --- ADDED: Helper to get magazine size ---
    getMagazineSizeForItem(itemId) {
        const itemDef = this.getItemById(itemId);
        if (itemDef && itemDef.type === 'weapon' && typeof itemDef.magazineSize === 'number') {
            return itemDef.magazineSize;
        }
        return 0; // Return 0 if not applicable or not defined
    }
    // --- END ADDITION ---


    // Find first empty inventory slot index
    findEmptyInventorySlot() { return this.inventorySlots.findIndex(slot => slot === null); }

    // Remove a specified amount of an item
    removeItem(itemId, amount = 1) {
        let remainingToRemove = amount;
        for (let i = this.inventorySize - 1; i >= 0 && remainingToRemove > 0; i--) {
            const slot = this.inventorySlots[i];
            if (slot && slot.id === itemId) {
                const amountToRemoveFromSlot = Math.min(slot.amount, remainingToRemove);
                slot.amount -= amountToRemoveFromSlot;
                remainingToRemove -= amountToRemoveFromSlot;
                if (slot.amount <= 0) {
                    this.inventorySlots[i] = null;
                    this.untrackSpoilableItem(i);
                    this.updateQuickBarReference(i, null); // Clear quickbar ref if this slot was removed
                }
            }
        }
        this.updateUI();
        return remainingToRemove <= 0; // True if full amount removed
    }

    // Get total count of an item
    getItemCount(itemId) {
        let count = 0;
        for (const slot of this.inventorySlots) {
            if (slot && slot.id === itemId) { count += slot.amount; }
        }
        return count;
    }

    // Check if player has resources
    checkResources(requirements) {
        if (!requirements || !Array.isArray(requirements)) { return true; }
        for (const req of requirements) {
            if (!req?.id || !req.amount) { continue; }
            if (this.getItemCount(req.id) < req.amount) { return false; }
        }
        return true;
    }

    // Get item in selected quickbar slot
    getSelectedItem() {
        const inventorySlotIndex = this.quickBarSlots[this.selectedSlot];
        if (inventorySlotIndex !== null && inventorySlotIndex >= 0 && inventorySlotIndex < this.inventorySize) {
            return this.inventorySlots[inventorySlotIndex];
        }
        return null;
    }

    // Select a quickbar slot
    selectQuickBarSlot(slotIndex) {
        if (slotIndex >= 0 && slotIndex < this.quickBarSize) {
            if (this.selectedSlot !== slotIndex) {
                 this.selectedSlot = slotIndex;
                 this.updateUI(); // Update selection highlight
                 this.game.uiManager?.updateWeaponUI(this.getSelectedItem()); // Update weapon display
            }
            return true;
        }
        return false;
    }

    // Track spoilable item
    trackSpoilableItem(slotIndex) { const item = this.inventorySlots[slotIndex]; if (!item) return; const itemDef = this.getItemById(item.id); if (itemDef?.spoilTime) { const ms = itemDef.spoilTime*60*1000; this.spoilableItems.set(slotIndex,{spoilsAt:Date.now()+ms}); } }
    // Untrack spoilable item
    untrackSpoilableItem(slotIndex) { this.spoilableItems.delete(slotIndex); }
    // Update UI via UIManager
    updateUI() { this.game.uiManager?.updateInventoryUI(this); }

    // Assign inventory slot to quickbar slot
    moveToQuickBar(inventorySlotIndex, quickBarSlotIndex) {
        if (inventorySlotIndex<0||inventorySlotIndex>=this.inventorySize||quickBarSlotIndex<0||quickBarSlotIndex>=this.quickBarSize){return false;}
        for(let i=0; i<this.quickBarSize; i++){if(this.quickBarSlots[i]===inventorySlotIndex && i!==quickBarSlotIndex){this.quickBarSlots[i]=null;}}
        if(this.quickBarSlots[quickBarSlotIndex] === inventorySlotIndex){return true;}
        this.quickBarSlots[quickBarSlotIndex]=inventorySlotIndex; this.updateUI();
        if(quickBarSlotIndex === this.selectedSlot){ this.game.uiManager?.updateWeaponUI(this.getSelectedItem()); }
        return true;
    }
    // Remove item reference from quickbar
    moveFromQuickBar(quickBarSlotIndex) {
        if(quickBarSlotIndex<0||quickBarSlotIndex>=this.quickBarSize){return false;}
        if(this.quickBarSlots[quickBarSlotIndex]!==null){ const wasSel = (quickBarSlotIndex===this.selectedSlot); this.quickBarSlots[quickBarSlotIndex]=null; this.updateUI(); if(wasSel)this.game.uiManager?.updateWeaponUI(null); return true; } return false;
    }
    // Move item between inventory slots
    moveItemInInventory(from, to) {
        if(from<0||from>=this.inventorySize||to<0||to>=this.inventorySize||from===to){return false;}
        const fromI=this.inventorySlots[from]; const toI=this.inventorySlots[to];
        if(!toI){ this.inventorySlots[to]=fromI; this.inventorySlots[from]=null; this.updateQuickBarReference(from,to); this.moveSpoilTracking(from,to); }
        else if(fromI&&toI&&fromI.id===toI.id&&toI.amount<toI.stackSize&&fromI.type !== 'weapon'){ const space=toI.stackSize-toI.amount; const moveAmt=Math.min(space,fromI.amount); toI.amount+=moveAmt; fromI.amount-=moveAmt; if(this.spoilableItems.has(from))this.trackSpoilableItem(to); if(fromI.amount<=0){this.inventorySlots[from]=null; this.updateQuickBarReference(from,null); this.untrackSpoilableItem(from);}}
        else{ this.inventorySlots[to]=fromI; this.inventorySlots[from]=toI; this.swapQuickBarReferences(from,to); this.swapSpoilTracking(from,to); }
        this.updateUI(); const selSlot=this.quickBarSlots[this.selectedSlot]; if(selSlot===from||selSlot===to){this.game.uiManager?.updateWeaponUI(this.getSelectedItem());} return true;
    }

    // Helper methods for moveItemInInventory
    updateQuickBarReference(oldIdx, newIdx){for(let i=0; i<this.quickBarSize; i++){if(this.quickBarSlots[i]===oldIdx){this.quickBarSlots[i]=newIdx; break;}}}
    swapQuickBarReferences(idxA, idxB){let qA=-1, qB=-1; for(let i=0; i<this.quickBarSize; i++){if(this.quickBarSlots[i]===idxA)qA=i; if(this.quickBarSlots[i]===idxB)qB=i;} if(qA!==-1&&qB!==-1){this.quickBarSlots[qA]=idxB; this.quickBarSlots[qB]=idxA;} else if(qA!==-1){this.quickBarSlots[qA]=idxB;} else if(qB!==-1){this.quickBarSlots[qB]=idxA;}}
    moveSpoilTracking(from, to){if(this.spoilableItems.has(from)){const d=this.spoilableItems.get(from); this.spoilableItems.delete(from); this.spoilableItems.set(to,d);}}
    swapSpoilTracking(idxA, idxB){const dA=this.spoilableItems.get(idxA); const dB=this.spoilableItems.get(idxB); if(dA)this.spoilableItems.set(idxB,dA); else this.spoilableItems.delete(idxB); if(dB)this.spoilableItems.set(idxA,dB); else this.spoilableItems.delete(idxA);}

    // Split a stack
    splitStack(slotIndex){ if(slotIndex<0||slotIndex>=this.inventorySize)return false; const item=this.inventorySlots[slotIndex]; if(!item||item.amount<=1||item.type==='weapon')return false; const empty=this.findEmptyInventorySlot(); if(empty===-1)return false; const moveAmt=Math.floor(item.amount/2); const keepAmt=item.amount-moveAmt; item.amount=keepAmt; this.inventorySlots[empty]={...item,amount:moveAmt}; if(this.spoilableItems.has(slotIndex)){this.trackSpoilableItem(empty); this.trackSpoilableItem(slotIndex);} this.updateUI(); return true; }

    // Use an item from inventory
    useItem(slotIndex){ if(slotIndex<0||slotIndex>=this.inventorySize)return false; const item=this.inventorySlots[slotIndex]; if(!item)return false; const itemDef=this.getItemById(item.id); if(!itemDef)return false; let consumed=false;
        if(item.type==='food'){this.game.characterStats?.feed(itemDef.hungerRestore||0); this.game.characterStats?.heal(itemDef.healthRestore||0); consumed=true;}
        else if(item.type==='medical'){this.game.characterStats?.heal(itemDef.healAmount||0); if((itemDef.id==='bandage'||itemDef.id==='firstaidkit') && this.game.characterStats?.isBleeding){this.game.characterStats.removeStatusEffect('bleeding');} consumed=true;}
        else if(item.type==='placeable'){if(this.game.playerController){if(this.game.playerController.buildMode&&this.game.playerController.selectedBuildItem===item.id){this.game.playerController.toggleBuildMode();}else{this.game.playerController.setBuildItem(item.id); if(!this.game.playerController.buildMode)this.game.playerController.toggleBuildMode();}}}
        else{return false;}
        if(consumed){ item.amount--; if(item.amount<=0){this.inventorySlots[slotIndex]=null; this.untrackSpoilableItem(slotIndex); this.updateQuickBarReference(slotIndex,null);} this.updateUI(); return true; } return false;
    }

    // Check for spoiled items
    checkSpoiledItems(){ const now=Date.now(); let changed=false; const names=[]; this.spoilableItems.forEach((data,idx)=>{if(now>=data.spoilsAt){const item=this.inventorySlots[idx]; if(item){names.push(item.name); this.inventorySlots[idx]=null; changed=true; this.updateQuickBarReference(idx,null);} this.spoilableItems.delete(idx);}}); if(changed){ this.updateUI(); if(this.game.uiManager?.showNotification){ let msg; if(names.length>1){msg=`${names.length} items spoiled!`;}else if(names.length===1){msg=`${names[0]} spoiled!`;} if(msg)this.game.uiManager.showNotification(msg, 4000); } } }

    // Update method called by Game loop
    update(deltaTime){ this._spoilCheckTimer+=deltaTime; if(this._spoilCheckTimer>=5.0){ this._spoilCheckTimer=0; this.checkSpoiledItems(); } }
}

// --- END OF FILE Inventory.js ---