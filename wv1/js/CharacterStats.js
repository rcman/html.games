// --- START OF FILE CharacterStats.js ---

class CharacterStats {
    constructor(game) {
        this.game = game;

        // Use constants for max values
        this.maxHealth = Constants?.PLAYER?.MAX_HEALTH ?? 100;
        this.maxHunger = Constants?.PLAYER?.MAX_HUNGER ?? 100;
        this.maxStamina = Constants?.PLAYER?.MAX_STAMINA ?? 100;

        // Initialize stats
        this.health = this.maxHealth;
        this.hunger = this.maxHunger;
        this.stamina = this.maxStamina;

        // Rates from constants or defaults
        this.hungerRate = (Constants?.PLAYER?.HUNGER_RATE ?? 0.5) / 60; // Per second
        this.staminaRegen = Constants?.PLAYER?.STAMINA_REGEN ?? 10; // Per second
        this.staminaSprintDrain = Constants?.PLAYER?.STAMINA_SPRINT_DRAIN ?? 5; // Per second

        // Status effects
        this.isBleeding = false; this.isWet = false; this.isOverheated = false; this.isFreezing = false;
        this.statusEffectTimers = { bleeding: 0, wet: 0, overheated: 0, freezing: 0 };
    }

    // Helper to set all stats to max
    setToMax() {
        this.health = this.maxHealth;
        this.hunger = this.maxHunger;
        this.stamina = this.maxStamina;
        this.updateUI(); // Ensure UI reflects the change
    }

    update(deltaTime) {
        // --- MODIFIED: God Mode Check ---
        if (this.game.isGodMode) {
             let needsUpdate = false;
             if (this.health < this.maxHealth) { this.health = this.maxHealth; needsUpdate = true; }
             if (this.hunger < this.maxHunger) { this.hunger = this.maxHunger; needsUpdate = true; }
             if (this.stamina < this.maxStamina) { this.stamina = this.maxStamina; needsUpdate = true; }
             // Optionally clear negative status effects instantly
             if(this.isBleeding){this.removeStatusEffect('bleeding'); needsUpdate=true;}
             if(this.isFreezing){this.removeStatusEffect('freezing'); needsUpdate=true;}
             if(this.isOverheated){this.removeStatusEffect('overheated'); needsUpdate=true;}
             if (needsUpdate) this.updateUI();
             return; // Skip normal updates
         }
         // --- END MODIFICATION ---

        // --- Normal Updates (only run if not in God Mode) ---
        this.updateHunger(deltaTime);
        this.updateStamina(deltaTime);
        this.updateHealth(deltaTime);
        this.updateStatusEffects(deltaTime);
        this.updateUI();
    }

    updateHunger(deltaTime) { this.hunger = Math.max(0, this.hunger - (this.hungerRate * deltaTime)); }

    updateStamina(deltaTime) {
        const isSprinting = this.game.playerController?.isSprinting && this.game.playerController?.isMoving;
        if (isSprinting) { this.stamina = Math.max(0, this.stamina - (this.staminaSprintDrain * deltaTime)); }
        else if (this.stamina < this.maxStamina) { this.stamina = Math.min(this.maxStamina, this.stamina + (this.staminaRegen * deltaTime)); }
    }

    updateHealth(deltaTime) {
         let passiveDamage = 0;
         if (this.hunger <= 0) { passiveDamage += 0.5 * deltaTime; }
         if (this.isBleeding) { passiveDamage += 2 * deltaTime; }
         if (this.isFreezing) { passiveDamage += 1 * deltaTime; }
         if (this.isOverheated) { passiveDamage += 1 * deltaTime; }
         if (passiveDamage > 0) { this.takeDamage(passiveDamage, "environment"); } // Use takeDamage for god mode check
         if (this.isOverheated) { this.useStamina(2 * deltaTime); } // useStamina checks god mode
    }

    updateStatusEffects(deltaTime) { for (const effect in this.statusEffectTimers) { if (this.statusEffectTimers[effect] > 0) { this.statusEffectTimers[effect] -= deltaTime; if (this.statusEffectTimers[effect] <= 0) { this.removeStatusEffect(effect); } } } this.checkWaterStatus(); this.checkTemperatureStatus(); }

    checkWaterStatus() { const p=this.game.playerController?.position; if(!p)return; const water=this.game.terrain?.isUnderwater(p.x,p.y,p.z); if(water && !this.isWet) this.addStatusEffect('wet', 60); }
    checkTemperatureStatus() { const time=this.game.dayNightCycle; const p=this.game.playerController?.position; if(!p)return; const biome=this.game.terrain?.getBiomeAt(p.x, p.z); const night=(time<0.25||time>0.75); const freezingBiome=(biome===4); if(night&&freezingBiome&&!this.isFreezing) this.addStatusEffect('freezing', 10); else if((!night||!freezingBiome)&&this.isFreezing) this.removeStatusEffect('freezing'); const day=(time>0.3&&time<0.7); const hotBiome=(biome===1); if(day&&hotBiome&&!this.isOverheated) this.addStatusEffect('overheated', 10); else if((!day||!hotBiome)&&this.isOverheated) this.removeStatusEffect('overheated'); }

    addStatusEffect(effect, duration) { switch(effect){ case 'bleeding':this.isBleeding=true;break; case 'wet':this.isWet=true;break; case 'overheated':this.isOverheated=true;break; case 'freezing':this.isFreezing=true;break; } this.statusEffectTimers[effect]=duration; this.game.uiManager?.showStatusEffect(effect, true); }
    removeStatusEffect(effect) { switch(effect){ case 'bleeding':this.isBleeding=false;break; case 'wet':this.isWet=false;break; case 'overheated':this.isOverheated=false;break; case 'freezing':this.isFreezing=false;break; } this.statusEffectTimers[effect]=0; this.game.uiManager?.showStatusEffect(effect, false); }

    updateUI() { Utils.ui.updateStatBar('health-fill',this.health,this.maxHealth); Utils.ui.updateStatBar('hunger-fill',this.hunger,this.maxHunger); Utils.ui.updateStatBar('stamina-fill',this.stamina,this.maxStamina); }
    heal(amount) { this.health = Math.min(this.maxHealth, this.health + amount); this.updateUI(); }
    feed(amount) { this.hunger = Math.min(this.maxHunger, this.hunger + amount); this.updateUI(); }
    restoreStamina(amount) { this.stamina = Math.min(this.maxStamina, this.stamina + amount); this.updateUI(); }

    useStamina(amount) {
        if (this.game.isGodMode) return; // Don't use stamina in God Mode
        this.stamina = Math.max(0, this.stamina - amount); this.updateUI();
    }

    takeDamage(amount, source) {
        if (this.game.isGodMode) return; // Invincible!
        this.health = Math.max(0, this.health - amount);
        if (['animal','hunter','fall','environment'].includes(source)){if(Math.random()<0.3&&!this.isBleeding)this.addStatusEffect('bleeding',30);}
        this.updateUI(); this.game.uiManager?.showDamageIndicator(amount);
        if (this.health <= 0) { this.onDeath(); }
    }

    onDeath() { console.log("Player died!"); this.game.uiManager?.showDeathScreen(); this.game.pause(); }
    respawn() { this.setToMax(); this.isBleeding=false;this.isWet=false;this.isOverheated=false;this.isFreezing=false; Object.keys(this.statusEffectTimers).forEach(e=>this.statusEffectTimers[e]=0); this.updateUI(); const safePos=this.findSafeRespawnPosition(); this.game.playerController.position.copy(safePos); this.game.playerController.velocity.set(0,0,0); this.game.resume(); }
    findSafeRespawnPosition() { let x,z,h,a=0,safe=false; const s=Constants?.WORLD?.SIZE??1000; const hs=s/2; while(!safe&&a<100){x=Utils.randomFloat(-hs*.8,hs*.8); z=Utils.randomFloat(-hs*.8,hs*.8); h=this.game.terrain?.getHeightAt(x,z)+1||1; const biome=this.game.terrain?.getBiomeAt(x,z); const water=biome===0; const near=this.game.entityManager?.getEntitiesNear({x,y:h,z},20)??[]; const enemies=near.some(e=>e.isAggressive||e.type==='hunter'); if(!water&&!enemies){safe=true;} a++;} if(!safe){x=0;z=0;h=this.game.terrain?.getHeightAt(0,0)+1||1;} return new THREE.Vector3(x,h,z); }
}

// --- END OF FILE CharacterStats.js ---