// --- START OF FILE Animal.js ---

class Animal {
    constructor(game, type, position) {
        this.game = game;

        // Find animal definition from constants
        let animalDef = null;
        if (typeof Constants !== 'undefined' && Constants.ANIMALS && Constants.ANIMALS.TYPES) {
             animalDef = Constants.ANIMALS.TYPES.find(a => a.id === type);
         }

        if (!animalDef) {
            console.error(`Unknown or undefined animal type in Constants: ${type}`);
            const fallbackType = 'rabbit'; // Or another default
             animalDef = Constants?.ANIMALS?.TYPES?.find(a => a.id === fallbackType) || {
                 id: 'unknown', name: 'Unknown Animal', health: 10, damage: 0, speed: 1, drops: [], aggressive: false, scale: 1.0 // Add scale
             };
             console.warn(`Using fallback definition: ${animalDef.name}`);
             this.type = animalDef.id;
        } else {
             this.type = type;
        }


        // Set properties from definition
        this.name = animalDef.name;
        this.health = animalDef.health;
        this.maxHealth = animalDef.health;
        this.damage = animalDef.damage;
        this.speed = animalDef.speed;
        this.drops = animalDef.drops || [];
        this.isAggressive = animalDef.aggressive || false;

        this.id = `animal_${Date.now()}_${Math.floor(Math.random() * 1000)}`;

        // Position and movement state
        this.position = new THREE.Vector3(position.x, position.y, position.z);
        this.rotation = Math.random() * Math.PI * 2;
        this.velocity = new THREE.Vector3(0, 0, 0);
        this.targetPosition = null;
        this.onGround = false;

        // AI State
        this.state = 'idle';
        this.stateTimer = Utils.randomFloat(2, 7);
        this.stateData = {};
        this.isAlive = true;

        // Perception settings
        this.sightRange = 20;
        this.aggroRange = this.isAggressive ? 15 : 0;
        this.fleeRange = 8;

        // Visuals
        this.model = null; // Will be the THREE.Group
        this.meshes = []; // Keep track of meshes within the group if needed for raycasting

        try {
            console.log(`Creating model for animal: ${this.type} (${this.id})`);
            this.createModel();
        } catch (error) {
            console.error(`Error creating model for animal ${this.type} (${this.id}):`, error);
            // Ensure cleanup if model creation fails partially
            if (this.model && this.model.parent) {
                 this.game.scene.remove(this.model);
            }
            this.model = null;
            this.meshes = [];
        }
    }

    // --- MODIFIED TO BETTER HANDLE OBJ MODELS AND ADD DEBUGGING ---
    createModel() {
        console.log(`Getting model data for ${this.type}...`);
        // Get model data (expecting { modelGroup, scale } from OBJ or primitive)
        const animalModelData = this.game.assetLoader.getModel(this.type);
        console.log(`Received model data for ${this.type}:`, animalModelData);

        // --- Check if the returned data is valid ---
        // It should be { modelGroup: Group, scale: number } or a fallback Mesh
        const isValidData = animalModelData && animalModelData.modelGroup instanceof THREE.Group && typeof animalModelData.scale === 'number';
        const isFallbackMesh = animalModelData instanceof THREE.Mesh;

        if (!isValidData && !isFallbackMesh) {
            console.error(`Model data is invalid or missing for animal type: ${this.type}. Received:`, animalModelData);
            // Fallback placeholder model - MAKE IT HIGHLY VISIBLE for debugging
            const fallbackGeo = new THREE.BoxGeometry(1, 0.8, 1.5); // More animal-like proportions
            const fallbackMat = new THREE.MeshBasicMaterial({ color: 0xff00ff, wireframe: true });
            this.model = new THREE.Mesh(fallbackGeo, fallbackMat);
            this.meshes = [this.model];
            const fallbackScale = Constants?.ANIMALS?.TYPES?.find(a => a.id === this.type)?.scale ?? 1.0;
            this.model.scale.setScalar(fallbackScale);
            console.log(`Created fallback model for ${this.type} with scale ${fallbackScale}`);

        } else if (isFallbackMesh) {
             console.warn(`Using fallback mesh for animal type: ${this.type}`);
             this.model = animalModelData; // Assign the fallback mesh
             this.meshes = [this.model];
             const fallbackScale = Constants?.ANIMALS?.TYPES?.find(a => a.id === this.type)?.scale ?? 1.0;
             if (this.model.scale.x === 1) this.model.scale.setScalar(fallbackScale);
             // Make fallback mesh more visible for debugging
             if (this.model.material) {
                 this.model.material.color.set(0xff7700); // Bright orange
                 this.model.material.needsUpdate = true;
             }
             console.log(`Using fallback mesh for ${this.type} with scale ${fallbackScale}`);

        } else { // It's a valid structure (from OBJ or primitive assembly)
            console.log(`Valid model data found for ${this.type}`);
            this.model = animalModelData.modelGroup; // Assign the THREE.Group
            const modelScale = animalModelData.scale;
            this.model.scale.set(modelScale, modelScale, modelScale); // Apply scale
            
            // Log children count to verify model structure
            let meshCount = 0;
            this.model.traverse(child => {
                if (child.isMesh) meshCount++;
            });
            console.log(`Model for ${this.type} contains ${meshCount} meshes`);

            // --- Material application (Override OBJ materials) ---
            let bodyColor;
            switch (this.type) {
                 case 'chicken': bodyColor = 0xffffff; break;
                 case 'rabbit': bodyColor = 0xa67b5b; break;
                 case 'deer': bodyColor = 0x80561b; break;
                 case 'wolf': bodyColor = 0x444444; break;
                 case 'bear': bodyColor = 0x472b1e; break;
                 case 'cougar': bodyColor = 0xbda064; break;
                 default: bodyColor = 0xaaaaaa;
             }
            // Create ONE material instance
            const bodyMaterial = new THREE.MeshBasicMaterial({ // Changed to MeshBasicMaterial for better visibility
                color: bodyColor,
                // wireframe: true, // Uncomment for debugging geometry
            });

            this.meshes = []; // Reset meshes array
            this.model.traverse((child) => {
                if (child.isMesh) {
                    // Apply the created material to all meshes within the loaded group
                    child.material = bodyMaterial;
                    // Set shadows
                    child.castShadow = true;
                    child.receiveShadow = true;
                    this.meshes.push(child); // Keep track of meshes
                }
            });
            // --- End Material Application ---
        }

        // Position model and add to scene (same as before)
        if (!this.model) {
             console.error("Model is null after creation attempt for", this.type);
             return; // Stop if model failed entirely
        }
        
        // Calculate bounding box to verify model dimensions
        const bbox = new THREE.Box3().setFromObject(this.model);
        const size = new THREE.Vector3();
        bbox.getSize(size);
        console.log(`Model dimensions for ${this.type}: width=${size.x.toFixed(2)}, height=${size.y.toFixed(2)}, depth=${size.z.toFixed(2)}`);
        
        this.model.position.copy(this.position);
        this.model.rotation.y = this.rotation;
        
        // ADD A HELPER OBJECT to make position visible
        const helper = new THREE.AxesHelper(2); // 2 unit long axes
        this.model.add(helper);
        
        this.game.scene.add(this.model);
        console.log(`Added ${this.type} model to scene at position:`, this.position);

        // Ensure initial position is valid (same as before)
        this.checkTerrainCollisions(0.01);
        if (!this.onGround) {
             const initialHeight = this.game.terrain?.getHeightAt(this.position.x, this.position.z);
             if (initialHeight !== undefined && initialHeight !== null) {
                 this.position.y = initialHeight + 0.5; // Increased offset to make sure it's visible above terrain
                 this.model.position.y = this.position.y;
                 console.log(`Adjusted ${this.type} height to ${this.position.y.toFixed(2)} (terrain height: ${initialHeight.toFixed(2)})`);
             } else {
                 this.position.y = (this.game.terrain?.waterLevel ?? 2) + 1.0;
                 this.model.position.y = this.position.y;
                 console.log(`No terrain height found, set ${this.type} height to ${this.position.y.toFixed(2)}`);
             }
        }
    }
    // --- END MODEL MODIFICATION ---

    // --- UPDATE METHODS ---
    update(deltaTime) {
        if (!this.isAlive) return;
        // Gracefully handle if model creation failed
        if (!this.model) {
             console.warn(`Update called for animal ${this.id} (${this.type}) with no model.`);
             return;
        }
        this.updateState(deltaTime);
        this.updateMovement(deltaTime);
        this.checkTerrainCollisions(deltaTime);
        this.updateModel();
    }

    updateState(deltaTime) {
        this.stateTimer -= deltaTime;
        this.checkPerception();
        if (this.stateTimer <= 0 && this.state !== 'chase' && this.state !== 'flee' && this.state !== 'attack') {
            this.chooseNewState();
        }
        switch (this.state) {
            case 'idle': this.velocity.x *= 0.8; this.velocity.z *= 0.8; break;
            case 'wander': if (this.hasReachedTarget()) { this.targetPosition = null; this.chooseNewState(); } else if (!this.targetPosition) { this.setRandomTargetPosition(); } break;
            case 'flee':
                if (this.stateData.threat) {
                    const fleeDir = new THREE.Vector3().subVectors(this.position, this.stateData.threat.position).normalize(); fleeDir.y = 0;
                    if (this.stateTimer <= 0 || !this.targetPosition) { const d = 20; this.targetPosition = new THREE.Vector3().addVectors(this.position, fleeDir.multiplyScalar(d)); this.stateTimer = 1.0; }
                    const dist = Utils.distanceVector(this.position, this.stateData.threat.position);
                    if (dist > this.sightRange * 1.5) { this.state = 'wander'; this.stateTimer = Utils.randomFloat(5, 10); this.stateData = {}; this.targetPosition = null; }
                } else { this.state = 'wander'; this.stateTimer = Utils.randomFloat(5, 10); this.stateData = {}; this.targetPosition = null; } break;
            case 'chase':
                if (this.stateData.target) {
                    this.targetPosition = this.stateData.target.position.clone(); const dist = Utils.distanceVector(this.position, this.stateData.target.position);
                    const range = 2.0 * (this.model ? this.model.scale.x : 1.0); // Attack range based on model scale
                    if (dist < range) { this.attack(this.stateData.target); }
                    else if (dist > this.sightRange * 1.2) { this.state = 'wander'; this.stateTimer = Utils.randomFloat(5, 10); this.stateData = {}; this.targetPosition = null; }
                } else { this.state = 'wander'; this.stateTimer = Utils.randomFloat(5, 10); this.stateData = {}; this.targetPosition = null; } break;
            case 'attack':
                 if (this.stateData.target) { this.faceTarget(this.stateData.target.position); this.velocity.x *= 0.5; this.velocity.z *= 0.5; }
                 if (this.stateTimer <= 0) {
                    if (this.stateData.target) { const dist = Utils.distanceVector(this.position, this.stateData.target.position); const range = 2.0 * (this.model ? this.model.scale.x : 1.0); this.state = (dist > range * 1.2) ? 'chase' : 'attack'; this.stateTimer = (dist > range * 1.2) ? 0.5 : 0.2; } // Re-evaluate chase/attack
                    else { this.state = 'wander'; this.stateTimer = Utils.randomFloat(5, 10); this.stateData = {}; this.targetPosition = null; }
                 } break;
        }
    }

    chooseNewState() {
        if (Math.random() < 0.7) { this.state = 'wander'; this.stateTimer = Utils.randomFloat(8, 15); this.setRandomTargetPosition(); }
        else { this.state = 'idle'; this.stateTimer = Utils.randomFloat(3, 8); this.targetPosition = null; }
        this.stateData = {};
    }

    setRandomTargetPosition() {
        const radius = 20; const angle = Math.random() * Math.PI * 2; const dist = Utils.randomFloat(5, radius);
        const tX = this.position.x + Math.cos(angle) * dist; const tZ = this.position.z + Math.sin(angle) * dist;
        const size = (typeof Constants !== 'undefined' && Constants.WORLD) ? Constants.WORLD.SIZE : 1000;
        const half = size / 2 - 5; const cX = Math.max(-half, Math.min(half, tX)); const cZ = Math.max(-half, Math.min(half, tZ));
        let tY = this.position.y;
        if (this.game.terrain?.getHeightAt) {
             tY = this.game.terrain.getHeightAt(cX, cZ);
              // Check if target is significantly underwater compared to terrain height
              if (tY < (Constants?.WORLD?.WATER_LEVEL ?? 2) - 0.5) { // If target terrain height is well below water
                 this.targetPosition = null; this.state = 'idle'; this.stateTimer = 0.5; return; // Don't wander into deep water
             }
        }
        this.targetPosition = new THREE.Vector3(cX, tY, cZ);
    }


    hasReachedTarget() { if (!this.targetPosition) return true; const dx = this.position.x - this.targetPosition.x; const dz = this.position.z - this.targetPosition.z; return (dx * dx + dz * dz) < 1.0; }

    updateMovement(deltaTime) {
        const targetSpeed = this.calculateTargetSpeed();

        if (this.targetPosition && this.state !== 'idle' && this.state !== 'attack') {
            const dir = new THREE.Vector3(this.targetPosition.x - this.position.x, 0, this.targetPosition.z - this.position.z);
            if (dir.lengthSq() > 0.1) {
                dir.normalize();
                const accel = 15.0;
                this.velocity.x += dir.x * accel * deltaTime;
                this.velocity.z += dir.z * accel * deltaTime;

                 const speedSq = this.velocity.x * this.velocity.x + this.velocity.z * this.velocity.z;
                 if (targetSpeed > 0 && speedSq > targetSpeed * targetSpeed) {
                     const f = targetSpeed / Math.sqrt(speedSq);
                     this.velocity.x *= f; this.velocity.z *= f;
                 }
            } else {
                 this.velocity.x *= (1 - 10 * deltaTime);
                 this.velocity.z *= (1 - 10 * deltaTime);
            }
             if (Math.abs(this.velocity.x) > 0.05 || Math.abs(this.velocity.z) > 0.05) {
                 const targetRotation = Math.atan2(this.velocity.x, this.velocity.z);
                 let deltaRot = targetRotation - this.rotation;
                 while (deltaRot > Math.PI) deltaRot -= Math.PI * 2; while (deltaRot < -Math.PI) deltaRot += Math.PI * 2;
                 this.rotation += deltaRot * 8.0 * deltaTime;
             }
        } else {
            this.velocity.x *= (1 - 8 * deltaTime);
            this.velocity.z *= (1 - 8 * deltaTime);
        }

        if (Math.abs(this.velocity.x) < 0.01) this.velocity.x = 0;
        if (Math.abs(this.velocity.z) < 0.01) this.velocity.z = 0;

        this.position.x += this.velocity.x * deltaTime;
        this.position.z += this.velocity.z * deltaTime;
    }

    calculateTargetSpeed() {
        switch (this.state) {
            case 'flee': return this.speed * 1.5;
            case 'chase': return this.speed * 1.2;
            case 'wander': return this.speed * 0.8;
            case 'attack': return 0;
            case 'idle': return 0;
            default: return this.speed;
        }
    }

    updateModel() {
        if (!this.model) return; // Check if model exists
        this.model.position.copy(this.position);
        while (this.rotation > Math.PI) this.rotation -= Math.PI * 2;
        while (this.rotation < -Math.PI) this.rotation += Math.PI * 2;
        this.model.rotation.y = this.rotation;

        // Fallback simple animation (bobbing)
        if (this.state === 'wander' || this.state === 'chase' || this.state === 'flee') {
            const speedSq = this.velocity.x*this.velocity.x + this.velocity.z*this.velocity.z;
            if (speedSq > 0.1) {
                const freq = 8 * Math.sqrt(speedSq);
                const amount = 0.1 * (this.model.scale?.y ?? 1.0); // Use scale if available
                const time = this.game.elapsedTime || 0;
                this.model.position.y += Math.sin(time*freq)*amount * 0.1; // Subtle bob
            }
        }
    }

    checkTerrainCollisions(deltaTime) {
        if (!this.isAlive) return;

        const gravity = Constants?.WORLD?.GRAVITY ?? 9.8;
        let terrainHeight = this.position.y - 1.0;
        let isOverWater = true;

        if (this.game.terrain?.getHeightAt) {
             try {
                 terrainHeight = this.game.terrain.getHeightAt(this.position.x, this.position.z);
                 isOverWater = terrainHeight < (Constants?.WORLD?.WATER_LEVEL ?? 2);
             } catch (e) { console.error(`Error getting terrain height for ${this.id} at ${this.position.x.toFixed(1)}, ${this.position.z.toFixed(1)}:`, e); }
         }

        const groundCheckOffset = 0.1;
        let landedThisFrame = false;

        if (!this.onGround || (this.onGround && this.position.y > terrainHeight + groundCheckOffset)) {
            this.velocity.y -= gravity * deltaTime;
            this.onGround = false;
        }

        this.position.y += this.velocity.y * deltaTime;

        if (this.position.y <= terrainHeight + groundCheckOffset) {
            if (!this.onGround || this.velocity.y < -0.1) { landedThisFrame = true; }
             this.position.y = terrainHeight;
             this.velocity.y = 0;
             this.onGround = true;
        } else {
            this.onGround = false;
        }

         const feetUnderwater = this.position.y < (Constants?.WORLD?.WATER_LEVEL ?? 2);
         if (feetUnderwater && !isOverWater && this.state !== 'flee') {
            console.log(`${this.id} entered water, fleeing.`); // DEBUG
            this.state = 'flee'; this.stateTimer = 5; let bestTarget = null; let minDistSq = Infinity;
            for (let i = 0; i < 8; i++) {
                const angle = i * Math.PI / 4; const dist = 15;
                const tX = this.position.x + Math.cos(angle) * dist; const tZ = this.position.z + Math.sin(angle) * dist;
                if (this.game.terrain) {
                    const tY = this.game.terrain.getHeightAt(tX, tZ);
                     if (tY !== undefined && tY !== null && tY >= (Constants?.WORLD?.WATER_LEVEL ?? 2)) {
                         const dx = tX - this.position.x; const dz = tZ - this.position.z; const dSq = dx * dx + dz * dz;
                         if (dSq < minDistSq) { minDistSq = dSq; bestTarget = new THREE.Vector3(tX, tY, tZ); }
                     }
                 }
            }
            if (bestTarget) { this.targetPosition = bestTarget; } else { this.setRandomTargetPosition(); }
         }
    }

    checkPerception() {
         if (!this.isAlive) return;
        if (this.state === 'flee' && this.stateData.threat) { const dist = Utils.distanceVector(this.position, this.stateData.threat.position); if (dist > this.sightRange * 1.5) { this.state = 'wander'; this.stateTimer = Utils.randomFloat(5, 10); this.stateData = {}; this.targetPosition = null; } return; }
         if (this.state === 'attack') return;
        if (!this.game.playerController) return; const player = this.game.playerController; const dist = Utils.distanceVector(this.position, player.position);
        if (dist <= this.sightRange) { const canSeePlayer = true; if (canSeePlayer) { if (this.isAggressive && dist <= this.aggroRange) { if (this.state !== 'chase') { this.state = 'chase'; this.stateTimer = 15; this.stateData.target = player; } } else if (!this.isAggressive && dist <= this.fleeRange) { if (this.state !== 'flee') { this.state = 'flee'; this.stateTimer = 8; this.stateData.threat = player; this.targetPosition = null; } } } }
        else { if (this.state === 'chase' && this.stateData.target === player) { this.state = 'wander'; this.stateTimer = Utils.randomFloat(5, 10); this.stateData = {}; this.targetPosition = null; } }
    }


    faceTarget(targetPosition) {
        if (!targetPosition) return; const targetRotation = Math.atan2( targetPosition.x - this.position.x, targetPosition.z - this.position.z ); let deltaRot=targetRotation-this.rotation; while(deltaRot>Math.PI)deltaRot-=Math.PI*2; while(deltaRot<-Math.PI)deltaRot+=Math.PI*2; this.rotation+=deltaRot*10*0.016;
    }

    attack(target) {
        if (!this.isAlive || this.state === 'attack') return; this.state = 'attack'; this.stateTimer = 1.0; this.stateData.target = target; this.targetPosition = null; this.velocity.set(0,this.velocity.y,0); this.faceTarget(target.position);
        setTimeout(() => { if (!this.isAlive || this.state !== 'attack' || this.stateData.target !== target || !target) return; const dist = Utils.distanceVector(this.position, target.position); const range = 2.5 * (this.model?.scale.x ?? 1.0); if (dist < range) { if (target === this.game.playerController && this.game.characterStats) { this.game.characterStats.takeDamage(this.damage, this.type); } } else { this.state = 'chase'; this.stateTimer = 0.1; } }, 200);
    }

    takeDamage(amount, source) {
        if (!this.isAlive) return false; this.health -= amount; if (this.health <= 0) { this.die(source); return true; }
        if (source === 'player' || source === 'hunter') { const attacker = (source === 'player') ? this.game.playerController : this.game.entityManager?.getEntity(source); if (this.isAggressive && attacker) { if (this.state !== 'chase') { this.state = 'chase'; this.stateTimer = 20; this.stateData.target = attacker; this.targetPosition = null; } } else if (attacker) { if (this.state !== 'flee') { this.state = 'flee'; this.stateTimer = 10; this.stateData.threat = attacker; this.targetPosition = null; } } } return false;
    }

    die(source = 'unknown') {
        if (!this.isAlive) return;
        this.isAlive = false; this.state = 'dead'; this.velocity.set(0, 0, 0);
        console.log(`${this.name} (${this.id}) died (killed by ${source})`);

        if (this.model) {
             const duration = 0.5; let elapsed = 0; const startRotX = this.model.rotation.x; const targetRotX = -Math.PI / 2;
             const animate = (timestamp) => {
                 const now = performance.now(); const dt = this._lastDieAnimTime ? (now - this._lastDieAnimTime) / 1000 : (1/60); this._lastDieAnimTime = now;
                 if (!this.model || !(this.game?.running ?? true)) { if(this.model) this.model.rotation.x = targetRotX; delete this._lastDieAnimTime; return; }
                 elapsed += dt; const progress = Math.min(elapsed / duration, 1); this.model.rotation.x = startRotX + (targetRotX - startRotX) * progress;
                 if (progress < 1) { requestAnimationFrame(animate); } else { delete this._lastDieAnimTime; }
             };
             this._lastDieAnimTime = performance.now(); requestAnimationFrame(animate);
        }

        if (this.game.inventory) { this.spawnDrops(); } else { console.warn("Inventory system not available for drops."); }

        setTimeout(() => {
             if (this.model) {
                 this.game.scene.remove(this.model);
                 this.model.traverse(child => {
                     if (child.isMesh) {
                         child.geometry?.dispose();
                         if (Array.isArray(child.material)) { child.material.forEach(mat => mat?.dispose()); } else { child.material?.dispose(); }
                     }
                 });
                 this.model = null; this.meshes = [];
             }
             this.game.entityManager?.removeEntity(this.id); // Notify manager AFTER delay
         }, 5000);
    }

    spawnDrops() {
        if (!this.drops || !this.game.inventory) return;
        this.drops.forEach(drop => {
             if(!drop || !drop.id || !drop.amount) return; let amount = 0;
             if (Array.isArray(drop.amount)) { const min = Number(drop.amount[0]) || 0; const max = Number(drop.amount[1]) || min; amount = Utils.random(min, Math.max(min, max)); }
             else { amount = Number(drop.amount) || 0; }
             if (amount > 0) { this.game.inventory.addItem(drop.id, amount); }
        });
    }
}

// --- END OF FILE Animal.js ---