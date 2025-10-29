// --- START OF FILE PlayerController.js ---

class PlayerController {
    constructor(game) {
        this.game = game;
        this.camera = game.camera;
        this.position = new THREE.Vector3(0, 10, 0); // Initial position
        this.velocity = new THREE.Vector3(0, 0, 0);
        this.rotation = 0; // Radians, around Y axis
        this.pitch = 0; // Radians, camera up/down
        this.moveSpeed = Constants.PLAYER.MOVE_SPEED;
        this.sprintSpeed = Constants.PLAYER.SPRINT_SPEED;
        this.jumpForce = Constants.PLAYER.JUMP_FORCE;
        this.interactionRange = Constants.PLAYER.INTERACTION_RANGE;
        this.cameraHeight = Constants.PLAYER.CAM_HEIGHT;
        this.reloadTime = Constants.PLAYER.RELOAD_TIME;

        // Movement state
        this.moveForward = false;
        this.moveBackward = false;
        this.moveLeft = false;
        this.moveRight = false;
        this.isSprinting = false;
        this.isJumping = false;
        this.onGround = false;
        this.isMoving = false; // Track if any movement key is pressed

        // Interaction/Building state
        this.buildMode = false;
        this.selectedBuildItem = null;
        this.buildPreview = null;
        this.buildRotation = 0; // Y-axis rotation for build preview

        // Weapon state
        this.weaponCooldownTimer = 0;
        this.isReloading = false;
        this.reloadTimer = 0;

        // Flashlight State
        this.flashlight = null;
        this.isFlashlightOn = false;

        // Debug Ray Helper
        this.rayHelper = null;

        // Player model (using Cylinder as a fallback)
        this.playerModel = null;
        this.createPlayerModel(); // Create the model representation

        this.setupInputHandlers();
    }

    createPlayerModel() {
        // --- USING CylinderGeometry as a fallback for older THREE versions ---
        const radius = 0.4;
        const height = 1.8; // Total height desired
        const cylinderHeight = Math.max(0.1, height - (radius * 2)); // Adjust for caps visual
        const geo = new THREE.CylinderGeometry(radius, radius, cylinderHeight, 8);
        // --- END FALLBACK ---

        // const geo = new THREE.CapsuleGeometry(0.4, 1.0, 4, 8); // Use this if you update three.js

        const mat = new THREE.MeshStandardMaterial({ color: 0xff0000, wireframe: true, visible: false }); // Initially invisible
        this.playerModel = new THREE.Mesh(geo, mat);
        this.playerModel.position.copy(this.position);
        // Adjust Y position based on Cylinder origin (center)
        this.playerModel.position.y += height / 2;
        // this.game.scene.add(this.playerModel); // Optional: add to scene for debugging visibility
    }

    setupInputHandlers() {
        document.addEventListener('keydown', (e) => {
            // Check if typing in an input field FIRST
            if (document.activeElement?.tagName === 'INPUT' || document.activeElement?.tagName === 'TEXTAREA') {
                 // Allow Escape even when focused
                 if (e.key === 'Escape') {
                     if (this.game.uiManager?.isInventoryOpen) this.game.uiManager.toggleInventory();
                     else if (this.game.uiManager?.isBuildMenuOpen) this.toggleBuildMode(); // Use own toggle
                     else if (this.game.uiManager?.isCraftingMenuOpen) this.game.uiManager.closeCraftingMenu();
                     else if (this.game.uiManager?.isDebugMenuOpen) this.game.uiManager.toggleDebugMenu();
                     else if (this.game.uiManager?.isPauseMenuOpen) this.game.resume();
                     document.activeElement.blur();
                 }
                return; // Block other keys if typing
            }

            // Check if any UI menu is open to block game actions
            const blockGameActions = this.game.uiManager?.isInventoryOpen
                                    || this.game.uiManager?.isCraftingMenuOpen
                                    || this.game.uiManager?.isBuildMenuOpen
                                    || this.game.uiManager?.isPauseMenuOpen
                                    || this.game.uiManager?.isDebugMenuOpen; // Include debug menu

            switch (e.key.toLowerCase()) {
                // Movement and Action keys - Blocked if any menu is open
                case 'w': if (!blockGameActions) this.moveForward = true; break;
                case 's': if (!blockGameActions) this.moveBackward = true; break;
                case 'a': if (!blockGameActions) this.moveLeft = true; break;
                case 'd': if (!blockGameActions) this.moveRight = true; break;
                case ' ': if (!blockGameActions && this.onGround && !this.isJumping) this.jump(); break;
                case 'shift': if (!blockGameActions) this.isSprinting = true; break;
                case 'e': if (!blockGameActions) this.interact(); break;
                case 'r':
                     if (!blockGameActions) { // Check block here for 'r'
                        if (!this.buildMode) this.reloadWeapon();
                        else this.rotateBuildPreview();
                     }
                     break;
                case 'f': if (!blockGameActions) this.toggleFlashlight(); break;
                case 'g': if (!blockGameActions) this.game.toggleGodMode(); break;

                // UI Toggle Keys - Handled by PlayerController directly or UIManager
                case 'b': this.toggleBuildMode(); break; // Build toggle stays here

                // 'i' and 'c' are handled by UIManager now
            }

            // Update isMoving only if game actions aren't blocked
            if (!blockGameActions) {
                this.isMoving = this.moveForward || this.moveBackward || this.moveLeft || this.moveRight;
            } else {
                this.isMoving = false; // Ensure isMoving is false if menus are open
            }
        });

        document.addEventListener('keyup', (e) => {
            // Check if any UI menu is open to block game actions for keyup
             const blockGameActions = this.game.uiManager?.isInventoryOpen
                                    || this.game.uiManager?.isCraftingMenuOpen
                                    || this.game.uiManager?.isBuildMenuOpen
                                    || this.game.uiManager?.isPauseMenuOpen
                                    || this.game.uiManager?.isDebugMenuOpen; // Include debug menu

             // Only process keyup for movement/action keys if not blocked
             if (!blockGameActions) {
                 switch (e.key.toLowerCase()) {
                     case 'w': this.moveForward = false; break;
                     case 's': this.moveBackward = false; break;
                     case 'a': this.moveLeft = false; break;
                     case 'd': this.moveRight = false; break;
                     case 'shift': this.isSprinting = false; break;
                 }
                 this.isMoving = this.moveForward || this.moveBackward || this.moveLeft || this.moveRight;
             } else {
                 // If menus are open, ensure movement flags are false on keyup just in case
                 if (e.key.toLowerCase() === 'w') this.moveForward = false;
                 if (e.key.toLowerCase() === 's') this.moveBackward = false;
                 if (e.key.toLowerCase() === 'a') this.moveLeft = false;
                 if (e.key.toLowerCase() === 'd') this.moveRight = false;
                 if (e.key.toLowerCase() === 'shift') this.isSprinting = false;
                 this.isMoving = false;
             }
        });

        document.addEventListener('mousemove', (e) => {
            // Only rotate camera if pointer is locked
            if (document.pointerLockElement === this.game.renderer.domElement) {
                this.rotation -= e.movementX * 0.002;
                this.pitch -= e.movementY * 0.002;
                this.pitch = Math.max(-Math.PI / 2 + 0.01, Math.min(Math.PI / 2 - 0.01, this.pitch));
            }
        });

        document.addEventListener('mousedown', (e) => {
             // Check if UI is blocking interaction or if pointer lock needs requesting
             const anyMenuOpen = this.game.uiManager?.isInventoryOpen
                                || this.game.uiManager?.isCraftingMenuOpen
                                || this.game.uiManager?.isBuildMenuOpen
                                || this.game.uiManager?.isPauseMenuOpen
                                || this.game.uiManager?.isDebugMenuOpen; // Include debug menu

             if (anyMenuOpen) {
                 // Check if click is outside the open menu (prevent interacting with canvas "through" menu)
                 const clickedOutside = !e.target.closest('#inventory')
                                     && !e.target.closest('#crafting-menu')
                                     && !e.target.closest('#build-menu')
                                     && !e.target.closest('#pause-menu')
                                     && !e.target.closest('#debug-controls'); // Check debug controls too
                 if (clickedOutside) {
                     e.preventDefault(); // Prevent interaction with the canvas behind the menu
                     return;
                 }
                 // Allow clicks *inside* the menu to proceed (e.g., button clicks)
             } else {
                 // No major menu is open, request pointer lock if not already locked
                 if (document.pointerLockElement !== this.game.renderer.domElement) {
                     this.game.renderer.domElement.requestPointerLock();
                     // Action processing will happen *after* lock is acquired (on subsequent clicks or if lock already held)
                 }
             }

            // Only process game actions (shoot/build) if pointer IS locked
            if (document.pointerLockElement === this.game.renderer.domElement) {
                if (e.button === 0) { // Left mouse
                    if (this.buildMode && this.selectedBuildItem && this.buildPreview?.visible) {
                        this.build();
                    } else if (!this.buildMode) {
                        this.shoot(); // Handles both shooting entities and harvesting resources
                    }
                } else if (e.button === 2) { // Right mouse
                    if (this.buildMode) {
                        this.toggleBuildMode(); // Exit build mode on right click
                    } else {
                        // Aim down sights? Currently no action.
                    }
                }
            }
        });

         document.addEventListener('pointerlockchange', () => {
             if (document.pointerLockElement === this.game.renderer?.domElement) {
                 console.log("Pointer LOCK successful.");
             } else {
                 console.log("Pointer UNLOCK successful.");
                 // When pointer unlocks, stop player movement flags to prevent drifting
                 this.moveForward = false;
                 this.moveBackward = false;
                 this.moveLeft = false;
                 this.moveRight = false;
                 this.isSprinting = false;
                 this.isMoving = false;
             }
         }, false);
         document.addEventListener('pointerlockerror', () => console.error('Pointer Lock Error'), false);
    }


    createFlashlight() {
        if (!this.flashlight) {
            this.flashlight = new THREE.SpotLight( 0xffffe0, 0, Constants.PLAYER.FLASHLIGHT_RANGE, Constants.PLAYER.FLASHLIGHT_ANGLE, Constants.PLAYER.FLASHLIGHT_PENUMBRA, 1.5 );
            this.flashlight.castShadow = true;
            this.flashlight.shadow.mapSize.width = 512; this.flashlight.shadow.mapSize.height = 512;
            this.flashlight.shadow.camera.near = 0.5; this.flashlight.shadow.camera.far = Constants.PLAYER.FLASHLIGHT_RANGE;
            this.flashlight.shadow.bias = -0.002;

            this.camera.add(this.flashlight);
            this.flashlight.position.set(0.2, -0.3, 0.1); // Position relative to camera
            this.flashlight.target.position.set(0, 0, -1); // Point forward from camera
            this.camera.add(this.flashlight.target); // Add target to camera so it moves with it
        }
    }

    toggleFlashlight() {
        if (!this.flashlight) { this.createFlashlight(); }
        if (this.flashlight) {
             this.isFlashlightOn = !this.isFlashlightOn;
             this.flashlight.intensity = this.isFlashlightOn ? Constants.PLAYER.FLASHLIGHT_INTENSITY : 0;
             this.game.uiManager?.showNotification(`Flashlight ${this.isFlashlightOn ? 'ON' : 'OFF'}`, 1000);
         } else { console.error("Failed to create flashlight."); }
    }

    update(deltaTime) {
        if (!deltaTime || deltaTime <= 0) return;

        // Update timers only if game is running (not paused)
        if (this.game.running) {
            if (this.weaponCooldownTimer > 0) { this.weaponCooldownTimer -= deltaTime; }
            if (this.isReloading) {
                this.reloadTimer -= deltaTime;
                if (this.reloadTimer <= 0) {
                    this.isReloading = false;
                    this.game.uiManager?.updateWeaponUI(this.getSelectedTool());
                }
            }
        }

        // Physics and collision should update even if paused? Maybe not velocity application.
        // Let's only update physics if the game is running.
        if (this.game.running) {
            this.updatePhysics(deltaTime);
            this.checkWorldCollisions(deltaTime); // Check terrain collision *after* applying Y velocity
            // Object collisions are handled within applyMovementWithCollision now
        }

        // Camera and model should always update to reflect current state
        this.updateCamera();
        this.updatePlayerModel();

        // Build preview updates only when game is running and in build mode
        if (this.game.running && this.buildMode && this.selectedBuildItem) {
            this.updateBuildPreview(deltaTime);
        } else {
            // Ensure preview is hidden if not in build mode or paused
            if (this.buildPreview) this.buildPreview.visible = false;
            if (this.rayHelper) this.rayHelper.visible = false;
        }
    }


    updatePhysics(deltaTime) {
        const currentMoveSpeed = (this.isSprinting && this.game.characterStats.stamina > 0) ? this.sprintSpeed : this.moveSpeed;
        const effectiveSpeed = this.game.isGodMode ? this.sprintSpeed * 1.5 : currentMoveSpeed;

        let moveDirection = new THREE.Vector3(0, 0, 0);
        if (this.moveForward) moveDirection.z -= 1; if (this.moveBackward) moveDirection.z += 1;
        if (this.moveLeft) moveDirection.x -= 1; if (this.moveRight) moveDirection.x += 1;

        if (moveDirection.lengthSq() > 0) {
            moveDirection.normalize().applyAxisAngle(new THREE.Vector3(0, 1, 0), this.rotation);
            this.velocity.x = moveDirection.x * effectiveSpeed;
            this.velocity.z = moveDirection.z * effectiveSpeed;
            if (this.isSprinting && !this.game.isGodMode) {
                 this.game.characterStats?.useStamina(Constants.PLAYER.STAMINA_SPRINT_DRAIN * deltaTime);
                 if (this.game.characterStats.stamina <= 0) { this.isSprinting = false; }
            }
        } else {
            // Apply friction only when on ground, less friction in air
            const friction = this.onGround ? 15.0 : 1.0;
            this.velocity.x *= (1 - friction * deltaTime);
            this.velocity.z *= (1 - friction * deltaTime);
            // Stop completely if velocity is very low
            if (Math.abs(this.velocity.x) < 0.01) this.velocity.x = 0;
            if (Math.abs(this.velocity.z) < 0.01) this.velocity.z = 0;
        }

        // Apply gravity if not on the ground
        if (!this.onGround) {
            this.velocity.y -= Constants.WORLD.GRAVITY * deltaTime;
        }

        // Apply movement with collision checks
        this.applyMovementWithCollision(deltaTime);
    }


    checkWorldCollisions(deltaTime) {
         if (!this.game.terrain) return;
         const terrainHeight = this.game.terrain.getHeightAt(this.position.x, this.position.z);

         // Check if terrain height is valid before using it
         if (terrainHeight === undefined) {
             // console.warn("Terrain height undefined at player position, skipping ground check.");
             this.onGround = false; // Assume not on ground if height is invalid
             return;
         }

         const groundCheckOffset = 0.1; // How close to terrain to be considered grounded

         // If we are falling or standing still AND close to or below terrain level
         if (this.velocity.y <= 0 && this.position.y <= terrainHeight + groundCheckOffset) {
             // Check for fall damage only if falling speed is significant BEFORE resetting velocity
             if (!this.onGround && this.velocity.y < -15) { // Only trigger on landing
                 const fallDamage = Math.abs(this.velocity.y + 15) * 2; // Calculate damage based on impact speed
                 this.game.characterStats?.takeDamage(fallDamage, 'fall');
             }
             // Land on ground
             this.position.y = terrainHeight; // Snap to terrain height
             this.velocity.y = 0; // Stop vertical velocity
             this.onGround = true;
             this.isJumping = false; // Can jump again
         } else {
             // If significantly above ground level, we are not on the ground
             this.onGround = false;
         }

         // Prevent falling through world edges (Boundary check)
         const worldLimit = (Constants.WORLD.SIZE / 2) - 1;
         this.position.x = Math.max(-worldLimit, Math.min(worldLimit, this.position.x));
         this.position.z = Math.max(-worldLimit, Math.min(worldLimit, this.position.z));

         // Prevent going too low (e.g., below water level if terrain check somehow fails)
         // This is a safety net. Ideally, terrain check prevents this.
         const absoluteMinY = -50; // Or derive from water level / kill plane
         if (this.position.y < absoluteMinY) {
            console.warn("Player fell below minimum Y level. Resetting...");
            // Implement a reset mechanism or teleportation if needed
            this.position.y = terrainHeight !== undefined ? terrainHeight : 10; // Reset to terrain or default height
            this.velocity.y = 0;
            this.onGround = true;
         }
    }

    applyMovementWithCollision(deltaTime) {
        const originalPos = this.position.clone();
        const playerHalfHeight = Constants.PLAYER.CAM_HEIGHT / 2; // Approximate half-height
        const playerRadius = 0.4;     // Approximate radius

        // Calculate potential new positions based on current velocity
        const moveStep = this.velocity.clone().multiplyScalar(deltaTime);
        // const potentialPos = originalPos.clone().add(moveStep); // Not used in axis-by-axis check

        // Get nearby potential colliders (barrels, structures, buildings)
        const collisionCheckRadius = Math.max(playerRadius * 2, moveStep.length()) + 1.0; // Dynamic check radius
        const nearbyResources = this.game.resourceManager?.getResourcesNear(this.position, collisionCheckRadius)
            .filter(res => res && ['barrel', 'structure', 'building'].includes(res.type) && res.meshes && res.meshes.length > 0) || [];

        const nearbyPlayerBuildings = this.game.buildingSystem?.buildings
            .filter(bldg => bldg && bldg.meshes && bldg.meshes.length > 0 && Utils.distanceVector(this.position, bldg.position) < collisionCheckRadius) || [];

        // Combine and deduplicate potential colliders
        const checkedIds = new Set();
        const collisionCandidates = [];
        [...nearbyResources, ...nearbyPlayerBuildings].forEach(obj => {
            if (obj && !checkedIds.has(obj.id)) {
                collisionCandidates.push(obj);
                checkedIds.add(obj.id);
            }
        });

        // --- Iterative Collision Resolution (Check axes separately) ---

        // Check X
        this.position.x += moveStep.x;
        let collisionX = false;
        for (const obj of collisionCandidates) {
             if (this.checkCollisionWithObject(obj)) {
                 this.position.x = originalPos.x; // Revert X movement
                 this.velocity.x = 0; // Stop X velocity
                 collisionX = true;
                 break;
             }
         }

        // Check Z (using potentially updated X position if no X collision)
        this.position.z += moveStep.z;
        let collisionZ = false;
        for (const obj of collisionCandidates) {
            if (this.checkCollisionWithObject(obj)) {
                 this.position.z = originalPos.z; // Revert Z movement
                 this.velocity.z = 0; // Stop Z velocity
                 collisionZ = true;
                 break;
             }
        }

         // Check Y (using potentially updated X and Z positions)
         this.position.y += moveStep.y;
         let collisionY = false;
         for (const obj of collisionCandidates) {
              if (this.checkCollisionWithObject(obj)) {
                  // More nuanced Y collision: check if landing ON or bumping INTO
                  obj.meshes[0].updateMatrixWorld(true);
                  const objBounds = new THREE.Box3().setFromObject(obj.meshes[0]);

                  if (moveStep.y < 0 && originalPos.y >= objBounds.max.y - 0.1) { // Landing on top?
                      this.position.y = objBounds.max.y; // Place player on top
                      this.velocity.y = 0;
                      this.onGround = true; // Consider landed on object
                      this.isJumping = false;
                  } else if (moveStep.y > 0 && originalPos.y + Constants.PLAYER.CAM_HEIGHT <= objBounds.min.y + 0.1) { // Jumping into bottom?
                       this.position.y = objBounds.min.y - Constants.PLAYER.CAM_HEIGHT - 0.01; // Place below
                       this.velocity.y = 0; // Stop upward momentum
                  } else {
                       // Side collision during vertical movement - revert Y
                       this.position.y = originalPos.y;
                       // Don't necessarily stop Y velocity unless it was a head bump
                       if (moveStep.y > 0) this.velocity.y = 0;
                  }
                  collisionY = true;
                  break;
              }
         }

        // Clean up near-zero velocities after collision checks
        if (Math.abs(this.velocity.x) < 0.01) this.velocity.x = 0;
        if (Math.abs(this.velocity.z) < 0.01) this.velocity.z = 0;
        // Y velocity handled by checks above and checkWorldCollisions
    }

    // Helper for collision check
    checkCollisionWithObject(obj) {
        if (!obj || !obj.meshes || !obj.meshes[0]) return false;

        const playerHeight = Constants.PLAYER.CAM_HEIGHT; // Use consistent height
        const playerRadius = 0.4;

        // Create player bounding box based on current this.position
        // Box centered at feet level for easier Y collision checks
        const playerBounds = new THREE.Box3(
            new THREE.Vector3(this.position.x - playerRadius, this.position.y, this.position.z - playerRadius),
            new THREE.Vector3(this.position.x + playerRadius, this.position.y + playerHeight, this.position.z + playerRadius)
        );

        obj.meshes[0].updateMatrixWorld(true); // Ensure object matrix is updated
        const objBounds = new THREE.Box3().setFromObject(obj.meshes[0]);

        return playerBounds.intersectsBox(objBounds);
    }

     // Helper to get size (copy from BuildingSystem or centralize)
     getComponentSize(componentType) {
         return this.game.buildingSystem?.getComponentSize(componentType) ?? new THREE.Vector3(1, 1, 1);
     }
    // --- END Collision Logic ---


    updateCamera() {
        // Ensure camera follows player position + height offset
        this.camera.position.set(
            this.position.x,
            this.position.y + this.cameraHeight,
            this.position.z
        );
        // Apply rotations
        this.camera.rotation.order = 'YXZ'; // Common order for FPS cameras
        this.camera.rotation.y = this.rotation;
        this.camera.rotation.x = this.pitch;
        this.camera.rotation.z = 0; // Usually no roll
        this.camera.updateMatrixWorld(true); // Important for raycasting
    }

    updatePlayerModel() {
        if (this.playerModel) {
            this.playerModel.position.copy(this.position);
            // Adjust Y based on model geometry origin (assuming origin is at the base/center of the cylinder)
            this.playerModel.position.y += Constants.PLAYER.CAM_HEIGHT / 2; // Example adjustment for centered origin
            this.playerModel.rotation.y = this.rotation;
        }
    }

    jump() {
        if (!this.onGround) return; // Can only jump if on ground
        const staminaCost = Constants.PLAYER.STAMINA_JUMP_COST;
        if (!this.game.isGodMode && this.game.characterStats.stamina < staminaCost) {
             this.game.uiManager?.showNotification("Not enough stamina to jump!", 1500); return;
        }
        this.isJumping = true;
        this.onGround = false; // We are leaving the ground
        this.velocity.y = this.jumpForce;
        if (!this.game.isGodMode) {
            this.game.characterStats?.useStamina(staminaCost);
        }
    }

    interact() {
        // Prevent interaction if menus are open
        if (this.game.uiManager?.isInventoryOpen || this.game.uiManager?.isCraftingMenuOpen || this.game.uiManager?.isBuildMenuOpen || this.game.uiManager?.isPauseMenuOpen || this.game.uiManager?.isDebugMenuOpen) {
             return;
         }

        const interactionRay = new THREE.Raycaster( this.camera.position, this.camera.getWorldDirection(new THREE.Vector3()) );
        interactionRay.far = this.interactionRange;
        let interactTarget = null;
        let promptText = null;

        // Gather all potential interactable meshes
        let potentialTargets = [];
        const checkedIds = new Set(); // To avoid adding meshes multiple times if they belong to multiple categories

        // Resources (Trees, Rocks, Plants, Crates, Barrels, Stations, Structures, Buildings)
        const nearbyResources = this.game.resourceManager?.getResourcesNear(this.position, this.interactionRange + 2) || [];
        nearbyResources.forEach(res => {
            if (res && res.meshes && res.meshes.length > 0 && !checkedIds.has(res.id)) {
                 res.meshes.forEach(mesh => {
                     if(mesh) {
                         mesh.traverse(child => {
                             if(child.isMesh) {
                                 // Assign data for identification - overwrite if needed, last one wins
                                 child.userData.resourceId = res.id;
                                 child.userData.resourceType = res.type;
                                 child.userData.resourceName = res.name;
                                 child.userData.isSearchable = ['crate', 'barrel'].includes(res.type);
                                 child.userData.isHarvestable = !child.userData.isSearchable && !['workbench', 'forge', 'campfire', 'structure', 'building'].includes(res.type); // Exclude structure/building from 'harvest' via E
                                 child.userData.isStation = ['workbench', 'forge', 'campfire'].includes(res.type);
                             }
                         });
                         potentialTargets.push(mesh);
                     }
                 });
                 checkedIds.add(res.id); // Mark resource ID as processed
            }
        });

        // Player Buildings (might already be included if registered in RM, but add for certainty)
        this.game.buildingSystem?.buildings.forEach(bldg => {
            if (bldg && bldg.meshes && bldg.meshes[0] && !checkedIds.has(bldg.id)) {
                bldg.meshes.forEach(mesh => {
                    if (mesh) {
                        mesh.traverse(child => {
                             if(child.isMesh) {
                                 child.userData.buildingId = bldg.id; // Use different userData key?
                                 child.userData.resourceType = 'building'; // Generic type for interaction check
                                 child.userData.resourceName = bldg.name || 'Building';
                                 // Set flags based on building type if needed
                                 // child.userData.isDoor = ...;
                             }
                        });
                        potentialTargets.push(mesh);
                    }
                });
                 checkedIds.add(bldg.id);
            }
        });

        // Raycast against combined list
        const hits = interactionRay.intersectObjects(potentialTargets, true);

        if (hits.length > 0) {
             const hitObj = hits[0].object;
             const dist = hits[0].distance;

             // Traverse up to find the mesh with relevant userData
             let parentWithData = hitObj;
             let userData = parentWithData.userData || {};
             while(parentWithData && !userData.resourceId && !userData.buildingId) { // Check for buildingId too
                 parentWithData = parentWithData.parent;
                 if (parentWithData) userData = parentWithData.userData || {};
             }

             // --- Interaction Logic based on userData ---
             if (userData.isStation && userData.resourceType) { // Check resourceType for stations
                  promptText = `[E] Open ${userData.resourceName || userData.resourceType}`;
                  interactTarget = { type: 'station', stationType: userData.resourceType, id: userData.resourceId };
             } else if (userData.isSearchable && userData.resourceId) {
                  const resource = this.game.resourceManager.getResource(userData.resourceId);
                  if (resource && !resource.searched) {
                       promptText = `[E] Search ${userData.resourceName || userData.resourceType}`;
                       interactTarget = { type: 'searchable', resourceId: userData.resourceId };
                  } else if (resource && resource.searched) {
                       promptText = `${userData.resourceName || userData.resourceType} (Searched)`;
                       // No E-key interact target if already searched
                  }
             } else if (userData.isHarvestable && userData.resourceId) {
                  // Display prompt for LMB harvesting, but don't set interactTarget for E key
                  const resource = this.game.resourceManager.getResource(userData.resourceId);
                  if (resource) {
                       const toolNeeded = this.getRequiredTool(userData.resourceType);
                       const toolText = toolNeeded ? ` (Requires ${toolNeeded})` : ' (Hand)';
                       promptText = `[LMB] Harvest ${userData.resourceName || userData.resourceType}${toolText}`;
                  }
             } else if (userData.buildingId || userData.resourceType === 'building' || userData.resourceType === 'structure') {
                 // Buildings/structures might be harvestable with LMB (handled in shoot)
                 // Or have specific E interactions (like doors)
                 const toolNeeded = this.getRequiredTool(userData.resourceType || 'building'); // Assume building type if specific is missing
                 if (toolNeeded) {
                    promptText = `[LMB] Attack ${userData.resourceName || 'Structure'}`; // Prompt for LMB
                 }
                 // Example: Check for a door interaction
                 // if (userData.isDoor) {
                 //     promptText = "[E] Open Door";
                 //     interactTarget = { type: 'door', buildingId: userData.buildingId };
                 // }
             }
         }

        // Show/Hide Prompt
        if (promptText) {
            this.game.uiManager?.showInteractionPrompt(promptText);
        } else {
            this.game.uiManager?.hideInteractionPrompt();
        }

        // Handle E key press if a target was identified for E interaction
        if (interactTarget) {
             switch (interactTarget.type) {
                 case 'station':
                      // Use specific station type from target data
                      if (interactTarget.stationType === 'workbench') this.game.uiManager?.openWorkbenchMenu();
                      else if (interactTarget.stationType === 'forge') this.game.uiManager?.openForgeMenu();
                      else if (interactTarget.stationType === 'campfire') this.game.uiManager?.openCookingMenu();
                      break;
                 case 'searchable':
                      this.game.resourceManager?.searchResource(interactTarget.resourceId, this);
                      // Hide prompt immediately after searching
                      this.game.uiManager?.hideInteractionPrompt();
                      break;
                 // Add cases for doors, etc.
                 // case 'door':
                 //     this.game.buildingSystem.toggleDoor(interactTarget.buildingId);
                 //     break;
             }
         }
    }


     // Handles shooting entities and harvesting resources with LMB
     shoot() {
         // Prevent action if menus are open or reloading/cooldown
         if (this.buildMode || this.game.uiManager?.isInventoryOpen || this.game.uiManager?.isCraftingMenuOpen || this.game.uiManager?.isPauseMenuOpen || this.game.uiManager?.isDebugMenuOpen) return;
         if (!this.game.isGodMode && (this.isReloading || this.weaponCooldownTimer > 0)) return;

         const equippedItem = this.getSelectedTool(); // Gets weapon OR tool
         const raycaster = new THREE.Raycaster(this.camera.position, this.camera.getWorldDirection(new THREE.Vector3()));
         const interactionRange = Constants.PLAYER.INTERACTION_RANGE; // Base range for harvesting/melee
         const weaponRange = (equippedItem?.type === 'weapon') ? (this.game.inventory.getItemById(equippedItem.id)?.range ?? interactionRange) : interactionRange;
         raycaster.far = weaponRange; // Use weapon range if applicable, else interaction range

         let didHitSomething = false; // Track if any action was performed

         // 1. Check Entities (Animals/Hunters) - Only if holding a weapon
         if (equippedItem && equippedItem.type === 'weapon') {
             const entityTargets = [];
             const entityList = [...(this.game.entityManager?.animals || []), ...(this.game.entityManager?.hunters || [])];
             entityList.forEach(e => {
                 if (e?.model && e.isAlive) {
                      e.model.traverse(c => { if(c.isMesh) c.userData.entity = e; });
                      entityTargets.push(e.model);
                 }
             });
             const entityHits = raycaster.intersectObjects(entityTargets, true);

             if (entityHits.length > 0 && entityHits[0].distance <= weaponRange) { // Check against weapon range
                  let hitEntity = null; let cur = entityHits[0].object;
                  while(cur && !hitEntity) { hitEntity = cur.userData.entity; cur = cur.parent; }

                  if (hitEntity && typeof hitEntity.takeDamage === 'function') {
                       const weaponDef = this.game.inventory.getItemById(equippedItem.id); if (!weaponDef) return;

                       // Check ammo
                       if (this.game.isGodMode || (equippedItem.currentAmmo != null && equippedItem.currentAmmo > 0)) {
                            if (!this.game.isGodMode) { equippedItem.currentAmmo -= 1; }

                            this.weaponCooldownTimer = this.game.isGodMode ? 0.05 : (weaponDef.fireRate || 0.5);
                            hitEntity.takeDamage(weaponDef.damage || 10, 'player');
                            this.game.uiManager?.updateWeaponUI(equippedItem); // Update ammo display

                            // TODO: Play shot sound, muzzle flash effect
                            // Example: this.game.audioManager.playSound('shoot_rifle', this.position);

                            didHitSomething = true; // Entity was shot
                       } else {
                            this.game.uiManager?.showNotification("Reload needed! (Press R)", 2000);
                            didHitSomething = true; // Register the attempt even if out of ammo
                       }
                  }
             }
         }

         // 2. Check Resources (Harvestable or Destructible Buildings/Structures) if no entity was shot
         if (!didHitSomething) {
              // Reset raycaster range specifically for harvesting/attacking non-entities
              raycaster.far = interactionRange;

              let resourceTargets = [];
              const checkedIds = new Set(); // Avoid duplicate checks if object is in multiple lists

              // Gather resource meshes (excluding already searched containers and non-harvestable stations)
              const nearbyResources = this.game.resourceManager?.getResourcesNear(this.position, interactionRange + 2) || [];
              nearbyResources.forEach(res => {
                  if (res && res.meshes && res.meshes.length > 0 && res.health > 0 && !checkedIds.has(res.id)) {
                       // Exclude stations and already searched items from LMB interaction targets
                       if (!['workbench', 'forge', 'campfire'].includes(res.type) && !res.searched) {
                           res.meshes.forEach(mesh => {
                               if (mesh) {
                                   mesh.traverse((child) => {
                                       if (child.isMesh) {
                                           child.userData.resourceId = res.id;
                                           child.userData.resourceType = res.type;
                                           child.userData.resourceName = res.name;
                                       }
                                   });
                                   resourceTargets.push(mesh);
                               }
                           });
                           checkedIds.add(res.id);
                       }
                  }
              });

               // Gather player building meshes
               this.game.buildingSystem?.buildings.forEach(bldg => {
                   if (bldg && bldg.meshes && bldg.meshes[0] && !checkedIds.has(bldg.id)) { // Use bldg.id
                       bldg.meshes.forEach(mesh => {
                           if (mesh) {
                               mesh.traverse(child => {
                                    if(child.isMesh) {
                                        child.userData.resourceId = bldg.id; // Use building ID as resource ID for harvesting
                                        child.userData.resourceType = 'building'; // Treat as resource type 'building'
                                        child.userData.resourceName = bldg.name || 'Building';
                                    }
                               });
                               resourceTargets.push(mesh);
                           }
                       });
                       checkedIds.add(bldg.id);
                   }
               });

              const resourceHits = raycaster.intersectObjects(resourceTargets, true);

              if (resourceHits.length > 0 && resourceHits[0].distance <= interactionRange) { // Check interaction range
                   const hitMesh = resourceHits[0].object;
                   let resourceId = null; let resourceType = null; let resourceName = null;
                   let cur = hitMesh;
                   // Traverse up to find the data
                   while (cur && (!resourceId || !resourceType)) {
                       if (!resourceId) resourceId = cur.userData.resourceId;
                       if (!resourceType) resourceType = cur.userData.resourceType;
                       if (!resourceName) resourceName = cur.userData.resourceName;
                       cur = cur.parent;
                   }

                   if (resourceId && resourceType) {
                        // Get the resource/building object (check both RM and BuildingSystem)
                        const resource = this.game.resourceManager.getResource(resourceId) || this.game.buildingSystem.buildings.find(b=>b.id === resourceId);

                        if (resource && resource.health > 0) { // Ensure it has health
                             const requiredTool = this.getRequiredTool(resourceType);
                             const canHarvest = !requiredTool || (equippedItem && equippedItem.id === requiredTool); // Hand harvest if no tool needed

                             if (canHarvest) {
                                  // --- Call harvestResource (which handles damage/durability/removal) ---
                                  const harvestedItems = this.game.resourceManager.harvestResource(resourceId, this);
                                  // ---

                                  if (harvestedItems && Object.keys(harvestedItems).length > 0) {
                                       this.game.uiManager?.showHarvestNotification(harvestedItems);
                                  }
                                  // Apply cooldown based on tool/action speed
                                  let cooldown = 0.5; // Default hand/melee speed
                                  if (equippedItem) {
                                      cooldown = this.game.inventory.getItemById(equippedItem.id)?.fireRate ?? 0.5;
                                  }
                                  this.weaponCooldownTimer = cooldown;
                                  didHitSomething = true;

                                  // TODO: Play harvest sound effect based on resource type and tool
                                  // Example: this.game.audioManager.playSound('hit_wood', this.position);
                             } else {
                                  // Show "Wrong tool" message only if trying to hit something that requires a tool
                                  if (requiredTool) {
                                       this.game.uiManager?.showNotification(`Need a ${requiredTool} for ${resourceName || resourceType}!`, 2000);
                                       didHitSomething = true; // Register the failed attempt
                                  }
                                  // Don't show message if trying to punch something unharvestable by hand
                             }
                        }
                   }
              }
         }

         // 3. Punch if nothing else hit (basic cooldown)
         if (!didHitSomething) {
              // console.log("Punch!"); // Optional: empty swing sound
              this.weaponCooldownTimer = 0.5; // Cooldown for empty swing
         }
     }


    getRequiredTool(resourceType) {
        switch (resourceType) {
            case 'tree': return 'axe';
            case 'stone': case 'iron': case 'copper': case 'zinc': return 'pickaxe';
            case 'building': case 'structure': return 'axe'; // Assume axe for destroying wood structures/buildings
            case 'crate': case 'barrel': return 'axe'; // Make containers breakable with axe? Or hands? Decide interaction. For now, axe.
            case 'fiber': return null; // Hand harvestable
            case 'blueberry': case 'carrot': case 'onion': case 'medicinalherb': return null; // Hand harvestable
            case 'animal': return 'knife'; // For harvesting dead animals
            default: return null; // Default to hand harvestable or non-harvestable
        }
    }

    // --- Building Methods ---
    toggleBuildMode() {
        this.buildMode = !this.buildMode;
        if (this.buildMode) {
            this.game.uiManager?.openBuildMenu();
            // Select first item only if build menu just opened AND nothing was selected previously
            if (!this.selectedBuildItem && this.game.buildingSystem?.getBuildingComponents().length > 0) {
                 this.setBuildItem(this.game.buildingSystem.getBuildingComponents()[0].id);
            } else if(this.selectedBuildItem) {
                 this.createBuildPreview(); // Recreate preview if toggling back on with item selected
            }
        } else {
            this.game.uiManager?.closeBuildMenu();
            this.removeBuildPreview();
            this.selectedBuildItem = null; // Clear selection when exiting build mode
        }
        // Update UI state indicator if needed (e.g., BuildingUI)
         this.game.uiManager?.updateBuildMode(this.buildMode, this.selectedBuildItem);
    }

    setBuildItem(itemId) {
        // No need to toggle build mode here, openBuildMenu in UIManager handles it if called from UI
        const component = this.game.buildingSystem.getBuildingComponent(itemId);
        if (component) {
            // Only change if different or if entering build mode
             if (this.selectedBuildItem !== itemId || !this.buildMode) {
                 this.selectedBuildItem = itemId;
                 this.createBuildPreview(); // Create/update preview for newly selected item
                 if (!this.buildMode) this.toggleBuildMode(); // Enter build mode if not already in it
                 else this.game.uiManager?.updateBuildMode(this.buildMode, this.selectedBuildItem); // Update highlight if already in build mode
             }
         }
        else { console.warn("Invalid build item selected:", itemId); }
    }

    createBuildPreview() {
        this.removeBuildPreview(); // Clear previous preview first
        if (!this.selectedBuildItem) return;
        this.buildPreview = this.game.buildingSystem.createBuildingPreview(this.selectedBuildItem);
        if (this.buildPreview) {
             this.game.scene.add(this.buildPreview);
             this.buildPreview.visible = false; // Hide until raycast hits something valid
        } else {
             console.error("Failed to create build preview for:", this.selectedBuildItem);
        }
    }

    removeBuildPreview() {
        if (this.buildPreview) {
            this.game.scene.remove(this.buildPreview);
            // Safely dispose geometry and material
            this.buildPreview.traverse(child => {
                 if (child.isMesh) {
                     child.geometry?.dispose();
                     if (child.material) {
                         if (Array.isArray(child.material)) {
                              child.material.forEach(m => m?.dispose());
                          } else {
                              child.material?.dispose();
                          }
                      }
                  }
             });
            this.buildPreview = null;
        }
        // Remove ray helper if it exists
        if (this.rayHelper) {
            this.game.scene.remove(this.rayHelper);
            this.rayHelper.geometry?.dispose();
            this.rayHelper.material?.dispose();
            this.rayHelper = null;
        }
    }

    updateBuildPreview(deltaTime) {
        if (!this.buildMode || !this.selectedBuildItem || !this.buildPreview) {
            if (this.buildPreview) this.buildPreview.visible = false; // Hide if mode off
            if (this.rayHelper) this.rayHelper.visible = false; // Hide helper too
            return;
        }

        // Raycast from camera to find placement position
        const rayOrigin = this.camera.position;
        const rayDirection = this.camera.getWorldDirection(new THREE.Vector3());
        const buildRay = new THREE.Raycaster(rayOrigin, rayDirection);
        buildRay.far = this.interactionRange * 2.5; // Building range
        const rayLength = buildRay.far;

        // Update or create debug ray helper
        if (!this.rayHelper) {
             this.rayHelper = new THREE.ArrowHelper(rayDirection, rayOrigin, rayLength, 0xff0000, 0.2, 0.1); // Red default
             this.game.scene.add(this.rayHelper);
        } else {
             this.rayHelper.position.copy(rayOrigin);
             this.rayHelper.setDirection(rayDirection);
             this.rayHelper.setLength(rayLength, 0.2, 0.1);
             this.rayHelper.visible = true; // Make sure it's visible
        }

        // --- MODIFIED: Raycast Targets ---
        let targets = [];
        // ALWAYS include terrain mesh if it exists
        if (this.game.terrain?.terrainMesh) {
            targets.push(this.game.terrain.terrainMesh);
        } else {
            console.warn("Build Preview: Terrain mesh not found!");
        }

        // Add meshes from existing *player-built* buildings
        // Use BuildingSystem's list as the source of truth for player buildings
        this.game.buildingSystem?.buildings.forEach(bldg => {
            if (bldg && bldg.meshes) { // Check if bldg and meshes exist
                bldg.meshes.forEach(mesh => {
                    if (mesh) targets.push(mesh); // Add each mesh individually
                });
            }
        });

        // Add meshes from generated structures (if they exist and are distinct)
        this.game.resourceManager?.resources?.structures?.forEach(struct => {
            if (struct && struct.meshes) { // Check if struct and meshes exist
                struct.meshes.forEach(mesh => {
                    if (mesh) targets.push(mesh); // Add each mesh individually
                });
            }
        });
        // --- END MODIFICATION ---

        // Ensure targets array is not empty
        if (targets.length === 0) {
            console.warn("Build Preview: No valid raycast targets found (terrain or buildings).");
            if (this.buildPreview) this.buildPreview.visible = false;
            if (this.rayHelper) this.rayHelper.setColor(0xffa500); // Orange ray if no targets
            return;
        }

        const hits = buildRay.intersectObjects(targets, true); // Recursive check remains fine

        if (hits.length > 0) {
             if(this.rayHelper) this.rayHelper.setColor(0x00ff00); // Green ray on hit
             const hitPoint = hits[0].point;
             const hitObject = hits[0].object; // The specific mesh hit

             // --- ADDED: Logging ---
             // console.log(`Build Ray Hit: Point=(${hitPoint.x.toFixed(1)}, ${hitPoint.y.toFixed(1)}, ${hitPoint.z.toFixed(1)}), Object=${hitObject.name || hitObject.type || 'Unknown'}`);
             // ---

             this.buildPreview.visible = true;

             // Find the snapping point based on the hit location
             let buildPos = this.game.buildingSystem.findSnappingPoint(hitPoint, this.selectedBuildItem, this.buildRotation, hitObject); // Pass hitObject for context

             // --- ADDED: Logging ---
             // console.log(`Calculated Snap Point: (${buildPos.x.toFixed(1)}, ${buildPos.y.toFixed(1)}, ${buildPos.z.toFixed(1)})`);
             // ---

             // Set preview position and rotation
             this.buildPreview.position.copy(buildPos);
             this.buildPreview.rotation.y = this.buildRotation;
             this.buildPreview.updateMatrixWorld(true); // Update matrix for validation

             // Validate the snapped position
             const isValid = this.game.buildingSystem.isValidBuildPosition(buildPos, this.selectedBuildItem, this.buildRotation);
             const canAfford = this.game.buildingSystem.canBuildComponent(this.selectedBuildItem);

             // --- ADDED: Logging ---
             // console.log(`Validation: isValid=${isValid}, canAfford=${canAfford}`);
             // ---

             // Update preview material color based on validity and cost
             let previewColor = 0xff0000; // Red = Invalid position
             if (isValid) {
                  previewColor = canAfford ? 0x00ff00 : 0xffff00; // Green = Can build, Yellow = Can't afford
              }

             // Apply color to material(s)
             const applyColor = (mat) => {
                  if (mat && mat.color) { mat.color.setHex(previewColor); }
                  if (mat && mat.opacity) { mat.opacity = 0.6; } // Ensure opacity
                  if (mat) mat.needsUpdate = true;
              };

             if (Array.isArray(this.buildPreview.material)) {
                  this.buildPreview.material.forEach(applyColor);
              } else {
                  applyColor(this.buildPreview.material);
              }

        } else {
            // No hit, hide preview
             if(this.rayHelper) this.rayHelper.setColor(0xff0000); // Red ray on miss
             this.buildPreview.visible = false;
             // console.log("Build Ray Miss"); // DEBUG
        }
    }

    rotateBuildPreview() {
        if (!this.buildMode || !this.selectedBuildItem) return;
        this.buildRotation = (this.buildRotation + Math.PI / 2) % (Math.PI * 2); // Cycle through 4 rotations
        // Preview position might need re-snapping after rotation
        // Force an update of the preview logic immediately
        this.updateBuildPreview(0); // Pass 0 deltaTime to trigger update without waiting for next frame
    }

    build() {
        // Prevent building if menus open, etc.
        if (!this.buildMode || !this.selectedBuildItem || !this.buildPreview || !this.buildPreview.visible || this.game.uiManager?.isInventoryOpen || this.game.uiManager?.isCraftingMenuOpen || this.game.uiManager?.isPauseMenuOpen || this.game.uiManager?.isDebugMenuOpen) {
             // console.log("Build check failed: Preview not visible or UI open.");
             return;
        }

        const buildPos = this.buildPreview.position.clone(); // Use the preview's current snapped position
        const isValid = this.game.buildingSystem.isValidBuildPosition(buildPos, this.selectedBuildItem, this.buildRotation);
        const canAfford = this.game.buildingSystem.canBuildComponent(this.selectedBuildItem);

        // console.log(`Build Attempt: Item=${this.selectedBuildItem}, Pos=${buildPos.x.toFixed(1)},${buildPos.y.toFixed(1)},${buildPos.z.toFixed(1)}, Valid=${isValid}, Affordable=${canAfford}`);

        if (isValid && canAfford) {
             // console.log("Calling BuildingSystem.buildComponent...");
             const success = this.game.buildingSystem.buildComponent(this.selectedBuildItem, buildPos, this.buildRotation);
             if (success) {
                  // Update relevant UI after successful build
                  this.game.uiManager?.buildingUI?.updateBuildMenu(); // Update costs display
                  // Inventory UI update happens implicitly when items are removed by buildComponent->removeItem
             } else {
                  this.game.uiManager?.showNotification("Failed to build (Internal Error)", 2000);
             }
         } else if (isValid && !canAfford) {
             this.game.uiManager?.showNotification("Not enough resources!", 2000);
         } else { // Not valid position
             this.game.uiManager?.showNotification("Cannot build here!", 2000);
         }
    }

    // --- Weapon Methods ---
     getSelectedTool() {
        const item = this.game.inventory?.getSelectedItem();
        // Return item only if it's explicitly a tool or weapon
        if (item && (item.type === 'tool' || item.type === 'weapon')) {
             return item;
        }
        return null; // Return null if hands are empty or item is not a tool/weapon
    }

    // shoot() function is consolidated above

    reloadWeapon() {
        if (this.isReloading || this.buildMode || this.game.uiManager?.isInventoryOpen || this.game.uiManager?.isCraftingMenuOpen || this.game.isGodMode) return;

        const equippedWeapon = this.getSelectedTool();
        if (!equippedWeapon || equippedWeapon.type !== 'weapon') {
            // console.log("Cannot reload: No weapon equipped.");
            return;
        }

        const weaponDef = this.game.inventory.getItemById(equippedWeapon.id);
        if (!weaponDef?.magazineSize || weaponDef.magazineSize <= 0) {
            // console.log(`Cannot reload: Weapon ${equippedWeapon.id} has no magazine size defined.`);
            return; // Not a reloadable weapon (like melee)
        }

        const magSize = weaponDef.magazineSize;
        const curAmmo = equippedWeapon.currentAmmo ?? 0; // Default to 0 if undefined
        const needed = magSize - curAmmo;

        if (needed <= 0) {
            this.game.uiManager?.showNotification("Magazine full", 1500);
            return;
        }

        // Determine required ammo type
        let ammoTypeId = null;
        if (equippedWeapon.id === 'rifle') ammoTypeId = 'rifleround';
        // Add mappings for other weapons here:
        // else if (equippedWeapon.id === 'pistol') ammoTypeId = '9mm';
        // else if (equippedWeapon.id === 'shotgun') ammoTypeId = 'shotgunshell';

        if (!ammoTypeId) {
            console.warn("Cannot determine ammo type for weapon:", equippedWeapon.id);
            this.game.uiManager?.showNotification("Cannot reload this weapon", 2000);
            return;
        }

        const availableAmmo = this.game.inventory.getItemCount(ammoTypeId);
        if (availableAmmo <= 0) {
            this.game.uiManager?.showNotification(`No ${ammoTypeId} ammo!`, 2000);
            return;
        }

        const amountToReload = Math.min(needed, availableAmmo);

        // Find the inventory slot corresponding to the quickbar item
        const quickBarIdx = this.game.inventory.selectedSlot;
        const invSlotIdx = this.game.inventory.quickBarSlots[quickBarIdx];

        // Ensure the item reference in inventory matches and exists
        if (invSlotIdx !== null && this.game.inventory.inventorySlots[invSlotIdx]?.id === equippedWeapon.id) {
            const inventoryWeapon = this.game.inventory.inventorySlots[invSlotIdx];

            // Try to remove the ammo first
            if (this.game.inventory.removeItem(ammoTypeId, amountToReload)) {
                 this.isReloading = true;
                 this.reloadTimer = this.reloadTime;

                 // Add ammo to the weapon's count (initialize if needed)
                 inventoryWeapon.currentAmmo = (inventoryWeapon.currentAmmo ?? 0) + amountToReload;

                 this.game.uiManager?.showNotification("Reloading...", this.reloadTime * 1000 - 100);
                 this.game.uiManager?.updateWeaponUI(inventoryWeapon, true); // Show reloading status

                 // TODO: Play reload sound
                 // Example: this.game.audioManager.playSound('reload_rifle', this.position);

            } else {
                 console.error("[Reload] Failed to remove ammo from inventory! Count mismatch?");
                 this.game.uiManager?.showNotification("Reload Error! (Ammo)", 2000);
            }
         } else {
             console.error("[Reload] Inventory sync error for weapon in quickbar slot", quickBarIdx, "-> inv slot", invSlotIdx);
             this.game.uiManager?.showNotification("Reload Error! (Sync)", 2000);
         }
    }
}

// --- END OF FILE PlayerController.js ---
