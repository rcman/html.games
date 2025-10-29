class AIHunter {
    constructor(game, position) {
        this.game = game;
        
        // Hunter properties
        this.id = `hunter_${Date.now()}_${Math.floor(Math.random() * 1000)}`;
        this.type = 'hunter';
        this.name = 'Hunter';
        this.health = Constants.HUNTERS.HEALTH;
        this.maxHealth = Constants.HUNTERS.HEALTH;
        this.damage = Constants.HUNTERS.DAMAGE;
        this.speed = Constants.HUNTERS.SPEED;
        this.sightRange = Constants.HUNTERS.SIGHT_RANGE;
        this.attackRange = Constants.HUNTERS.ATTACK_RANGE;
        this.patrolRadius = Constants.HUNTERS.PATROL_RADIUS;
        this.drops = Constants.HUNTERS.DROPS;
        
        // Position and movement
        this.position = new THREE.Vector3(position.x, position.y, position.z);
        this.spawnPosition = new THREE.Vector3(position.x, position.y, position.z);
        this.rotation = 0;
        this.velocity = new THREE.Vector3(0, 0, 0);
        this.targetPosition = null;
        
        // Combat properties
        this.weapon = {
            type: 'rifle',
            damage: 15,
            range: 30,
            cooldown: 2,
            lastFired: 0
        };
        
        // State
        this.state = 'patrol';
        this.stateTimer = 0;
        this.stateData = {};
        this.isAlive = true;
        this.onGround = false;
        
        // Pathing
        this.patrolPoints = [];
        this.currentPatrolPoint = 0;
        this.generatePatrolPath();
        
        // Visual representation
        this.model = null;
        this.createModel();
    }
    
    createModel() {
        // Create a simple hunter model
        // Base human shape
        const bodyGeometry = new THREE.CylinderGeometry(0.5, 0.5, 1.8, 8);
        const headGeometry = new THREE.SphereGeometry(0.3, 8, 8);
        const armGeometry = new THREE.CylinderGeometry(0.1, 0.1, 0.8, 8);
        const legGeometry = new THREE.CylinderGeometry(0.15, 0.15, 0.9, 8);
        
        // Materials
        const bodyMaterial = new THREE.MeshStandardMaterial({
            color: 0x885511,  // Brown for clothing
            roughness: 0.9,
            metalness: 0.1
        });
        
        const headMaterial = new THREE.MeshStandardMaterial({
            color: 0xe0ac69,  // Skin tone
            roughness: 0.9,
            metalness: 0.1
        });
        
        const weaponMaterial = new THREE.MeshStandardMaterial({
            color: 0x222222,  // Dark for weapon
            roughness: 0.5,
            metalness: 0.7
        });
        
        // Create meshes
        this.model = new THREE.Group();
        
        // Body
        const body = new THREE.Mesh(bodyGeometry, bodyMaterial);
        body.position.y = 0.9;
        body.castShadow = true;
        this.model.add(body);
        
        // Head
        const head = new THREE.Mesh(headGeometry, headMaterial);
        head.position.y = 2;
        head.castShadow = true;
        this.model.add(head);
        
        // Arms
        const leftArm = new THREE.Mesh(armGeometry, bodyMaterial);
        leftArm.position.set(0.6, 1.2, 0);
        leftArm.rotation.z = -Math.PI / 6;
        leftArm.castShadow = true;
        this.model.add(leftArm);
        
        const rightArm = new THREE.Mesh(armGeometry, bodyMaterial);
        rightArm.position.set(-0.6, 1.2, 0);
        rightArm.rotation.z = Math.PI / 6;
        rightArm.castShadow = true;
        this.model.add(rightArm);
        
        // Legs
        const leftLeg = new THREE.Mesh(legGeometry, bodyMaterial);
        leftLeg.position.set(0.3, 0.45, 0);
        leftLeg.castShadow = true;
        this.model.add(leftLeg);
        
        const rightLeg = new THREE.Mesh(legGeometry, bodyMaterial);
        rightLeg.position.set(-0.3, 0.45, 0);
        rightLeg.castShadow = true;
        this.model.add(rightLeg);
        
        // Weapon (rifle)
        const rifleBody = new THREE.BoxGeometry(0.1, 0.1, 1.2);
        const rifle = new THREE.Mesh(rifleBody, weaponMaterial);
        rifle.position.set(-0.6, 1.3, 0.5);
        rifle.rotation.x = Math.PI / 2;
        this.model.add(rifle);
        
        // Position model at spawn location
        this.model.position.copy(this.position);
        
        // Store reference to all meshes
        this.meshes = [body, head, leftArm, rightArm, leftLeg, rightLeg, rifle];
        
        // Add to scene
        this.game.scene.add(this.model);
    }
    
    generatePatrolPath() {
        // Generate a patrol path around spawn point
        const numPoints = Utils.random(3, 6);
        
        for (let i = 0; i < numPoints; i++) {
            const angle = (i / numPoints) * Math.PI * 2;
            const radius = Utils.randomFloat(this.patrolRadius * 0.5, this.patrolRadius);
            
            const x = this.spawnPosition.x + Math.cos(angle) * radius;
            const z = this.spawnPosition.z + Math.sin(angle) * radius;
            const y = this.game.terrain.getHeightAt(x, z);
            
            this.patrolPoints.push(new THREE.Vector3(x, y, z));
        }
    }
    
    update(deltaTime) {
        if (!this.isAlive) return;
        
        // Update state
        this.updateState(deltaTime);
        
        // Update movement
        this.updateMovement(deltaTime);
        
        // Update model position and rotation
        this.updateModel();
        
        // Check for terrain collisions
        this.checkTerrainCollisions();
    }
    
    updateState(deltaTime) {
        // Update state timer
        this.stateTimer -= deltaTime;
        
        // Check if state should change
        if (this.stateTimer <= 0) {
            this.chooseNewState();
        }
        
        // Handle different states
        switch (this.state) {
            case 'patrol':
                // Move to patrol points
                if (!this.targetPosition || this.hasReachedTarget()) {
                    // Move to next patrol point
                    this.currentPatrolPoint = (this.currentPatrolPoint + 1) % this.patrolPoints.length;
                    this.targetPosition = this.patrolPoints[this.currentPatrolPoint].clone();
                }
                break;
                
            case 'chase':
                // Chase the target (player)
                if (this.stateData.target) {
                    // Update target position to follow the player
                    this.targetPosition = new THREE.Vector3(
                        this.stateData.target.position.x,
                        this.stateData.target.position.y,
                        this.stateData.target.position.z
                    );
                    
                    // Check if we're close enough to attack
                    const distToTarget = Utils.distanceVector(
                        this.position,
                        this.stateData.target.position
                    );
                    
                    if (distToTarget < this.attackRange) {
                        // Stop and attack
                        this.state = 'attack';
                        this.stateTimer = 1;
                        this.targetPosition = null;
                    }
                    
                    // If lost sight of target, go back to search
                    if (distToTarget > this.sightRange) {
                        this.state = 'search';
                        this.stateTimer = 10; // Search for 10 seconds
                        this.stateData.lastKnownPosition = this.targetPosition.clone();
                    }
                } else {
                    // No target anymore, go back to patrol
                    this.state = 'patrol';
                    this.stateTimer = 0;
                }
                break;
                
            case 'attack':
                // Check if we can attack
                if (this.stateData.target) {
                    const now = Date.now();
                    const distToTarget = Utils.distanceVector(
                        this.position,
                        this.stateData.target.position
                    );
                    
                    // If target moved out of range, chase again
                    if (distToTarget > this.attackRange) {
                        this.state = 'chase';
                        this.stateTimer = 0;
                        break;
                    }
                    
                    // Attack if cooldown expired
                    if (now - this.weapon.lastFired > this.weapon.cooldown * 1000) {
                        this.attackTarget(this.stateData.target);
                        this.weapon.lastFired = now;
                    }
                    
                    // Face the target
                    this.faceTarget(this.stateData.target.position);
                    
                    // Stay in attack state
                    this.stateTimer = 1;
                } else {
                    // No target anymore, go back to patrol
                    this.state = 'patrol';
                    this.stateTimer = 0;
                }
                break;
                
            case 'search':
                // Search for lost target
                if (!this.targetPosition || this.hasReachedTarget()) {
                    // Generate a new search position near last known position
                    if (this.stateData.lastKnownPosition) {
                        const searchRadius = 10;
                        const angle = Math.random() * Math.PI * 2;
                        const distance = Math.random() * searchRadius;
                        
                        const searchX = this.stateData.lastKnownPosition.x + Math.cos(angle) * distance;
                        const searchZ = this.stateData.lastKnownPosition.z + Math.sin(angle) * distance;
                        const searchY = this.game.terrain.getHeightAt(searchX, searchZ);
                        
                        this.targetPosition = new THREE.Vector3(searchX, searchY, searchZ);
                    } else {
                        // No last known position, go back to patrol
                        this.state = 'patrol';
                        this.stateTimer = 0;
                    }
                }
                
                // If search time expired, go back to patrol
                if (this.stateTimer <= 0) {
                    this.state = 'patrol';
                    this.stateTimer = 0;
                }
                break;
                
            case 'idle':
                // Do nothing while idle
                break;
        }
        
        // Check for player
        this.checkForPlayer();
    }
    
    chooseNewState() {
        // Default to patrol if no other state is chosen
        this.state = 'patrol';
        this.stateTimer = Utils.randomFloat(5, 10);
    }
    
    updateMovement(deltaTime) {
        // Only move if we have a target and are not in attack state
        if (!this.targetPosition || this.state === 'attack') {
            this.velocity.x *= 0.9; // Apply friction
            this.velocity.z *= 0.9;
            return;
        }
        
        // Calculate direction to target
        const direction = new THREE.Vector3(
            this.targetPosition.x - this.position.x,
            0,
            this.targetPosition.z - this.position.z
        ).normalize();
        
        // Calculate speed based on state
        let speed = this.speed;
        if (this.state === 'chase') {
            speed = this.speed * 1.3; // Chase faster
        }
        
        // Apply movement
        this.velocity.x = direction.x * speed;
        this.velocity.z = direction.z * speed;
        
        // Apply gravity
        if (!this.onGround) {
            this.velocity.y -= 9.8 * deltaTime;
        } else {
            this.velocity.y = 0;
        }
        
        // Update position
        this.position.x += this.velocity.x * deltaTime;
        this.position.y += this.velocity.y * deltaTime;
        this.position.z += this.velocity.z * deltaTime;
        
        // Update rotation to face movement direction
        if (Math.abs(this.velocity.x) > 0.1 || Math.abs(this.velocity.z) > 0.1) {
            this.rotation = Math.atan2(this.velocity.x, this.velocity.z);
        }
    }
    
    updateModel() {
        if (!this.model) return;
        
        // Update position
        this.model.position.copy(this.position);
        
        // Update rotation
        this.model.rotation.y = this.rotation;
        
        // Add simple walking animation
        if (this.state === 'patrol' || this.state === 'chase' || this.state === 'search') {
            // Get the left and right leg meshes
            const leftLeg = this.model.children[4];
            const rightLeg = this.model.children[5];
            
            // Simple walking animation
            const walkSpeed = 5;
            const walkAmount = 0.2;
            leftLeg.rotation.x = Math.sin(Date.now() * 0.01 * walkSpeed) * walkAmount;
            rightLeg.rotation.x = -Math.sin(Date.now() * 0.01 * walkSpeed) * walkAmount;
        }
    }
    
    checkTerrainCollisions() {
        // Check if we're on the ground
        const terrainHeight = this.game.terrain.getHeightAt(this.position.x, this.position.z);
        
        if (this.position.y <= terrainHeight) {
            this.position.y = terrainHeight;
            this.onGround = true;
        } else {
            this.onGround = false;
        }
        
        // Check for water
        const isUnderwater = this.game.terrain.isUnderwater(
            this.position.x, 
            this.position.y, 
            this.position.z
        );
        
        if (isUnderwater) {
            // Hunters will try to get out of water
            // Find several potential positions and check which ones are not underwater
            for (let i = 0; i < 8; i++) {
                const angle = i * Math.PI / 4;
                const testX = this.position.x + Math.cos(angle) * 10;
                const testZ = this.position.z + Math.sin(angle) * 10;
                const testY = this.game.terrain.getHeightAt(testX, testZ);
                
                if (!this.game.terrain.isUnderwater(testX, testY, testZ)) {
                    // Found a non-water position
                    this.targetPosition = new THREE.Vector3(testX, testY, testZ);
                    break;
                }
            }
        }
    }
    
    checkForPlayer() {
        // Get player position
        const player = this.game.playerController;
        const distToPlayer = Utils.distanceVector(
            this.position,
            player.position
        );
        
        // Check if player is within sight range
        if (distToPlayer <= this.sightRange) {
            // Check if player is visible (no obstacles between)
            const isVisible = this.isTargetVisible(player.position);
            
            if (isVisible) {
                // Switch to chase state
                this.state = 'chase';
                this.stateTimer = 10; // Chase for at least 10 seconds
                this.stateData.target = player;
                
                // If within attack range, switch to attack
                if (distToPlayer <= this.attackRange) {
                    this.state = 'attack';
                    this.stateTimer = 1;
                }
            }
        }
    }
    
    isTargetVisible(targetPosition) {
        // Cast a ray from hunter to target to check visibility
        const direction = new THREE.Vector3(
            targetPosition.x - this.position.x,
            targetPosition.y - this.position.y,
            targetPosition.z - this.position.z
        ).normalize();
        
        const raycaster = new THREE.Raycaster(
            this.position.clone(),
            direction,
            0,
            Utils.distanceVector(this.position, targetPosition)
        );
        
        // Check for obstacles
        // In a real game, we would check for terrain and other obstacles
        // For simplicity, assume the target is always visible if in range
        return true;
    }
    
    faceTarget(targetPosition) {
        // Calculate direction to target
        const dx = targetPosition.x - this.position.x;
        const dz = targetPosition.z - this.position.z;
        
        // Update rotation to face target
        this.rotation = Math.atan2(dx, dz);
    }
    
    attackTarget(target) {
        // Perform attack animation
        this.playAttackAnimation();
        
        // Deal damage to target
        if (target === this.game.playerController) {
            // Damage player
            this.game.characterStats.takeDamage(this.damage, 'hunter');
            console.log(`Hunter attacked player for ${this.damage} damage`);
        }
    }
    
    playAttackAnimation() {
        // Simple attack animation - weapon recoil
        if (this.model && this.model.children.length >= 7) {
            const weapon = this.model.children[6];
            
            // Reset any previous animation
            weapon.position.z = 0.5;
            
            // Animate recoil
            const startZ = 0.5;
            const recoilZ = 0.3;
            const duration = 200; // ms
            const startTime = Date.now();
            
            const animateRecoil = () => {
                const elapsed = Date.now() - startTime;
                const t = Math.min(elapsed / duration, 1);
                
                if (t < 0.5) {
                    // Recoil back
                    weapon.position.z = startZ - (t * 2) * (startZ - recoilZ);
                } else {
                    // Return to position
                    weapon.position.z = recoilZ + ((t - 0.5) * 2) * (startZ - recoilZ);
                }
                
                if (t < 1) {
                    requestAnimationFrame(animateRecoil);
                }
            };
            
            animateRecoil();
        }
    }
    
    hasReachedTarget() {
        if (!this.targetPosition) return true;
        
        // Check distance to target
        const distance = Utils.distanceVector(this.position, this.targetPosition);
        return distance < 1; // Within 1 unit is considered "reached"
    }
    
    takeDamage(amount, source) {
        // Reduce health
        this.health -= amount;
        
        // Check if dead
        if (this.health <= 0) {
            this.die();
            return true;
        }
        
        // If attacked by player, chase and attack
        if (source === 'player') {
            this.state = 'chase';
            this.stateTimer = 15; // Chase for longer if attacked
            this.stateData.target = this.game.playerController;
        }
        
        return false;
    }
    
    die() {
        if (!this.isAlive) return;
        
        this.isAlive = false;
        console.log('Hunter died');
        
        // Spawn drops
        this.spawnDrops();
        
        // Remove model from scene
        this.game.scene.remove(this.model);
        
        // Cleanup resources
        if (this.model) {
            this.model.traverse(child => {
                if (child.geometry) child.geometry.dispose();
                if (child.material) {
                    if (Array.isArray(child.material)) {
                        child.material.forEach(mat => mat.dispose());
                    } else {
                        child.material.dispose();
                    }
                }
            });
        }
        
        // Notify entity manager
        this.game.entityManager.removeEntity(this.id);
    }
    
    spawnDrops() {
        // Spawn drops based on probabilities
        this.drops.forEach(drop => {
            // Check chance to drop
            if (Math.random() <= drop.chance) {
                // Calculate random amount within range
                let amount;
                if (Array.isArray(drop.amount)) {
                    amount = Utils.random(drop.amount[0], drop.amount[1]);
                } else {
                    amount = drop.amount;
                }
                
                // Add item to player inventory
                this.game.inventory.addItem(drop.id, amount);
            }
        });
    }
}