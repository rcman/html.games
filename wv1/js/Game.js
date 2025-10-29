// --- START OF FILE Game.js ---

class Game {
    constructor() {
        this.clock = new THREE.Clock();
        this.running = false;
        this.deltaTime = 1 / 60; // Initial default
        this.elapsedTime = 0;
        this.dayNightCycle = 0.5; // 0-1 representing time of day (0 = midnight, 0.5 = noon)
        this.isGodMode = false;
        this.saveSlot = 'saveGameData'; // Key for localStorage

        // Systems
        this.renderer = null; this.scene = null; this.camera = null;
        this.sunLight = null; this.ambientLight = null;
        this.assetLoader = null; this.terrain = null; this.resourceManager = null;
        this.entityManager = null; this.playerController = null; this.characterStats = null;
        this.inventory = null; this.craftingSystem = null; this.buildingSystem = null;
        this.weather = null; this.networkManager = null; this.worldGenerator = null;
        this.uiManager = null;

        // Use settings passed from main.js (ensure main.js sets window.gameSettings)
        this.settings = window.gameSettings || {}; // Use provided settings or empty object

        this.initialize().catch(error => {
            console.error("FATAL: Failed to initialize game:", error);
            alert("Failed to initialize game. Check console (F12) for errors.");
            document.body.innerHTML = `<div style="color: red; font-size: 20px; padding: 40px;">Failed to initialize game: ${error.message}. Check console (F12) for details.</div>`;
        });
    }

    toggleGodMode() {
        this.isGodMode = !this.isGodMode;
        console.log(`God Mode ${this.isGodMode ? 'ENABLED' : 'DISABLED'}`);
        this.uiManager?.showNotification(`God Mode ${this.isGodMode ? 'ON' : 'OFF'}`, 1500);
        if (this.isGodMode) {
            this.characterStats?.setToMax();
            if (this.playerController) this.playerController.weaponCooldownTimer = 0;
            const weapon = this.inventory?.getSelectedItem();
            if (weapon && weapon.type === 'weapon') {
                const magSize = this.inventory.getMagazineSizeForItem(weapon.id);
                if (magSize > 0) {
                    weapon.currentAmmo = magSize;
                    this.uiManager?.updateWeaponUI(weapon);
                }
            }
        }
    }


    async initialize() {
        console.log("Initializing game...");

        // Renderer, Scene, Camera, Lights (as before)
        this.renderer = new THREE.WebGLRenderer({ canvas: document.getElementById('game-canvas'), antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(window.devicePixelRatio);
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

        this.scene = new THREE.Scene();
        this.scene.background = new THREE.Color(0x87CEEB);

        this.camera = new THREE.PerspectiveCamera( 75, window.innerWidth / window.innerHeight, 0.1, (Constants?.WORLD?.SIZE ?? 1000) * 1.5 );
        this.camera.position.set(0, 10, 10);

        this.ambientLight = new THREE.AmbientLight(0x606060, 0.8); this.scene.add(this.ambientLight);
        this.sunLight = new THREE.DirectionalLight(0xffffff, 1.2);
        this.sunLight.position.set(50, 150, 75); this.sunLight.castShadow = true;
        this.scene.add(this.sunLight); this.scene.add(this.sunLight.target);
        this.sunLight.shadow.mapSize.width = 2048; this.sunLight.shadow.mapSize.height = 2048;
        this.sunLight.shadow.camera.near = 1; this.sunLight.shadow.camera.far = 500;
        const shadowCamSize = (Constants?.WORLD?.SIZE ?? 1000) * 0.2;
        this.sunLight.shadow.camera.left = -shadowCamSize; this.sunLight.shadow.camera.right = shadowCamSize;
        this.sunLight.shadow.camera.top = shadowCamSize; this.sunLight.shadow.camera.bottom = -shadowCamSize;
        this.sunLight.shadow.bias = -0.001;

        // Load Assets
        this.assetLoader = new AssetLoader(); await this.assetLoader.loadAssets(); console.log("Assets loaded/initialized.");

        // Initialize Game Systems
        this.setupSystems(); console.log("Game systems setup.");

        // Generate World Content (includes terrain, resources, entities)
        if (this.worldGenerator) { console.log("Starting world generation..."); await this.worldGenerator.generateWorld(); console.log("World generation process completed."); }
        else { throw new Error("WorldGenerator failed to initialize."); }

        // Set Player Spawn Position
        if (this.playerController && this.terrain) {
            const spawnX = 0; const spawnZ = 0; const spawnY = typeof this.terrain.getHeightAt==='function' ? this.terrain.getHeightAt(spawnX,spawnZ)+1.0 : 10.0;
            this.playerController.position.set(spawnX, spawnY, spawnZ); this.playerController.velocity.set(0,0,0);
            // Update camera immediately after setting player position
            this.playerController.updateCamera();
            console.log(`Player spawned at ${spawnX.toFixed(2)}, ${spawnY.toFixed(2)}, ${spawnZ.toFixed(2)}`);
        } else { throw new Error("Player/Terrain failed to initialize."); }

        // Add Starting Inventory Items (as before)
         if (this.inventory?.addItem) {
             console.log("Adding starting items...");
             try {
                  this.inventory.addItem('axe', 1);
                  this.inventory.addItem('pickaxe', 1);
                  this.inventory.addItem('knife', 1);
                  this.inventory.addItem('canteen', 1);
                  this.inventory.addItem('rifle', 1);
                  this.inventory.addItem('rifleround', 100);
                  this.inventory.addItem('woodplanks', 100);
                  this.inventory.addItem('nail', 100);
                  this.inventory.addItem('rope', 100);
                  this.inventory.addItem('fiber', 100);
                  // Move to quickbar
                  await new Promise(resolve => setTimeout(resolve, 10)); // Small delay to ensure UI updates can catch up if needed
                  const findSlot = (id) => this.inventory.inventorySlots.findIndex(item => item?.id === id);
                  const axe=findSlot('axe'), pick=findSlot('pickaxe'), rifle=findSlot('rifle'), knife=findSlot('knife'), canteen=findSlot('canteen');
                  if(axe!==-1)this.inventory.moveToQuickBar(axe,0);
                  if(pick!==-1)this.inventory.moveToQuickBar(pick,1);
                  if(knife!==-1)this.inventory.moveToQuickBar(knife,2);
                  if(rifle!==-1)this.inventory.moveToQuickBar(rifle,3);
                  if(canteen!==-1)this.inventory.moveToQuickBar(canteen,4);
                  console.log("Starting items added & equipped.");
             } catch (itemError) { console.error("Error adding starting item:", itemError); }
         } else { console.error("Inventory system not available for starting items."); }

        // Initialize UI Manager
         if (this.uiManager) {
             if (typeof this.uiManager.init === 'function') { this.uiManager.init(); }
             this.uiManager.updateInventoryUI(this.inventory);
             this.uiManager.updateQuickBarUI(this.inventory);
             this.uiManager.updateQuickBarSelection();
             this.uiManager.updateCraftingMenu(); // Initial update might show empty if basic recipes need resources
             if (this.uiManager.buildingUI?.updateBuildMenu) this.uiManager.buildingUI.updateBuildMenu();
             else console.warn("UIManager/BuildingUI/updateBuildMenu missing.");
             console.log("UIManager initialized & initial UI updated.");
         } else { console.error("UIManager not initialized."); }

        // Setup Event Listeners (UIManager does its own, PlayerController does its own)
        window.addEventListener('resize', () => this.onWindowResize());

        // --- ADDED: Request initial pointer lock ---
        // Give the browser a moment after UI setup before requesting lock
        setTimeout(() => {
            if (this.renderer && this.renderer.domElement && !document.pointerLockElement) {
                console.log("Requesting initial pointer lock...");
                this.renderer.domElement.requestPointerLock();
            } else {
                 console.log("Initial pointer lock not requested (already locked or renderer missing).");
            }
        }, 500); // 500ms delay, adjust if needed
        // --- END ADDED ---

        // Start Game Loop
        console.log("Starting game loop..."); this.startGameLoop();
        console.log("Game initialization sequence completed successfully.");
    }

    setupSystems() {
        // Order matters for dependencies
        this.terrain = new Terrain(this);
        this.resourceManager = new ResourceManager(this);
        this.entityManager = new EntityManager(this);
        this.inventory = new Inventory(this); // Needs Constants
        this.characterStats = new CharacterStats(this); // Needs Constants
        this.craftingSystem = new CraftingSystem(this); // Needs Inventory, Constants
        this.buildingSystem = new BuildingSystem(this); // Needs Inventory, AssetLoader, Constants
        this.weather = new Weather(this); // Needs Constants
        this.networkManager = new NetworkManager(this);
        this.uiManager = new UIManager(this); // Needs game instance, potentially other systems later
        this.playerController = new PlayerController(this); // Needs Camera, Terrain, Stats, Inventory, UIManager, Constants
        this.worldGenerator = new WorldGenerator(this); // Needs Terrain, RM, EM, AssetLoader, Constants
    }

    startGameLoop() {
        if (this.running) return; this.running = true; this.clock.start();
        const gameLoopFn = () => {
            if (!this.running) return; requestAnimationFrame(gameLoopFn);
            this.deltaTime = Math.min(this.clock.getDelta(), 0.1);
            this.elapsedTime += this.deltaTime; // Keep tracking elapsed time

            // --- MODIFIED: Only update dayNightCycle if debug menu isn't controlling it ---
            // We let the slider directly modify this.dayNightCycle now.
            const dayLen = Constants?.WORLD?.DAY_LENGTH ?? 1200;
            if (!(this.uiManager?.isDebugMenuOpen)) { // Only advance time if debug menu isn't open
                 this.dayNightCycle = (this.elapsedTime % dayLen) / dayLen;
             }
             // --- END MODIFICATION ---

            this.updateDayNightCycle(); // Update lighting using the current this.dayNightCycle
            this.update(this.deltaTime); // Update game logic

            if (this.renderer && this.scene && this.camera) { this.renderer.render(this.scene, this.camera); }
        }; gameLoopFn();
    }


    update(deltaTime) {
        // Update order can matter
        this.weather?.update(deltaTime);
        this.entityManager?.update(deltaTime);
        this.resourceManager?.update(deltaTime); // Process respawns
        this.playerController?.update(deltaTime); // Player movement/actions
        this.characterStats?.update(deltaTime); // Update player stats based on actions/environment
        this.inventory?.update(deltaTime); // Check spoiling items
        this.buildingSystem?.update(deltaTime); // Check integrity?
        this.networkManager?.update(deltaTime);
        this.uiManager?.update(deltaTime); // <<< Let UIManager update its stuff (like debug values)
        this.terrain?.update(deltaTime); // Update water animation
    }


    updateDayNightCycle() {
        if (!this.sunLight || !this.ambientLight || !this.scene) return;

        // --- MODIFIED: Directly use this.dayNightCycle and manually set intensities from sliders ---
        // The sliders now directly control the light intensities.
        // This function now primarily handles sun POSITION based on this.dayNightCycle
        // and fallback intensity/color calculation if sliders aren't active.

        const angle = this.dayNightCycle * Math.PI * 2;
        const sunDist = (Constants?.WORLD?.SIZE ?? 1000) * 0.8;
        const visuals = Constants?.WORLD?.DAY_NIGHT_CYCLE_VISUALS ?? { MIN_SUN_Y_FACTOR: -0.2, BASE_SUN_INTENSITY: 0.1, MAX_SUN_INTENSITY: 1.2, MIN_AMBIENT_INTENSITY: 0.2, MAX_AMBIENT_INTENSITY: 0.8, DAWN_DUSK_PHASE: 0.1 };


        // Calculate sun position based on the current cycle value
        this.sunLight.position.set(0, Math.sin(angle) * sunDist, Math.cos(angle) * sunDist);
        this.sunLight.position.y = Math.max(sunDist * visuals.MIN_SUN_Y_FACTOR, this.sunLight.position.y);
        this.sunLight.target.position.set(0, 0, 0);
        this.sunLight.target.updateMatrixWorld();

        // --- Intensity and color logic ---
        const sunRatio = Math.max(0, Math.sin(angle)); // Ratio based on sun height
        let currentSunIntensity, currentAmbientIntensity;
        let useCalculatedColors = true; // Assume we calculate unless in cave

        // Use slider values if debug menu is open, otherwise calculate
        if (this.uiManager?.isDebugMenuOpen) {
            currentSunIntensity = this.sunLight.intensity; // Value is set by slider listener
            currentAmbientIntensity = this.ambientLight.intensity; // Value is set by slider listener
        } else {
            // Calculate based on time of day if debug menu is closed
            currentSunIntensity = visuals.BASE_SUN_INTENSITY + sunRatio * (visuals.MAX_SUN_INTENSITY - visuals.BASE_SUN_INTENSITY);
            currentAmbientIntensity = visuals.MIN_AMBIENT_INTENSITY + sunRatio * (visuals.MAX_AMBIENT_INTENSITY - visuals.MIN_AMBIENT_INTENSITY);
            // Apply calculated intensities
            this.sunLight.intensity = currentSunIntensity;
            this.ambientLight.intensity = currentAmbientIntensity;
        }


        // Cave Darkness Check (overrides intensities)
        let insideCave = false;
        if (this.playerController && this.terrain && typeof this.terrain.isInsideCave === 'function') {
            insideCave = this.terrain.isInsideCave(this.playerController.position);
            if (insideCave) {
                // Inside a cave - drastically reduce global light, overriding sliders/calculations for this frame
                this.sunLight.intensity = currentSunIntensity * 0.05; // Override calculated/slider value
                this.ambientLight.intensity = currentAmbientIntensity * 0.1; // Override calculated/slider value
                useCalculatedColors = false; // Don't update skybox color

                // Add cave-specific fog if not already present
                 if (!(this.scene.fog instanceof THREE.Fog)) {
                     this.scene.fog = new THREE.Fog(0x050508, 5, Constants.PLAYER.FLASHLIGHT_RANGE * 1.2);
                 }
             } else {
                 // Outside cave - remove cave fog if it exists
                 if (this.scene.fog instanceof THREE.Fog) {
                      this.scene.fog = null;
                 }
             }
        }
        // <<-- END MODIFICATION -->>

        // Update sky color ONLY if needed and not overridden by weather/cave
        if (useCalculatedColors && this.weather && (this.weather.currentWeather === 'clear' || this.weather.currentWeather === 'cloudy')) {
             // <<-- MODIFIED: Make Day/Noon colors more blue -->>
            const nightC = new THREE.Color(0x080D1A);
            const dawnDuskC = new THREE.Color(0xFF8C69); // Orange/Pink sunrise/sunset
            const dayC = new THREE.Color(0x60AFFF); // Brighter blue for daytime
            const noonC = new THREE.Color(0x7BC8F6); // Slightly lighter blue for noon
            // <<-- END MODIFICATION -->>

            let skyC = new THREE.Color(); const phase = visuals.DAWN_DUSK_PHASE;
            // Adjusted lerp ranges for smoother transition with new colors
            if(sunRatio<=0){skyC.copy(nightC);}else if(sunRatio<phase){skyC.lerpColors(nightC,dawnDuskC,sunRatio/phase);}else if(sunRatio<(0.5-phase)){skyC.lerpColors(dawnDuskC,dayC,(sunRatio-phase)/(0.5-2*phase));}else if(sunRatio<=0.5){skyC.lerpColors(dayC,noonC,(sunRatio-(0.5-phase))/phase);}else if(sunRatio<(0.5+phase)){skyC.lerpColors(noonC,dayC,(sunRatio-0.5)/phase);}else if(sunRatio<(1.0-phase)){skyC.lerpColors(dayC,dawnDuskC,(sunRatio-(0.5+phase))/(0.5-2*phase));} else {skyC.lerpColors(dawnDuskC,nightC,Math.max(0,(sunRatio-(1.0-phase))/phase));}


            if (!this.scene.background || !this.scene.background.equals(skyC)) {
                this.scene.background = skyC;
            }
            // Handle weather fog (FogExp2) if it exists and is not cave fog
            if (this.scene.fog instanceof THREE.FogExp2) {
                 this.scene.fog.color.copy(skyC);
             }
        } else if (!insideCave && this.scene.fog instanceof THREE.Fog) {
             // Ensure cave fog is removed if sky color isn't updating (e.g., due to weather)
             this.scene.fog = null;
         }
    }


    onWindowResize() {
        if(!this.camera||!this.renderer)return;
        this.camera.aspect=window.innerWidth/window.innerHeight;
        this.camera.updateProjectionMatrix();
        this.renderer.setSize(window.innerWidth,window.innerHeight);
    }
    pause() {
        if(!this.running)return;
        // --- ADDED: Ensure pointer lock is exited on pause ---
        if (document.pointerLockElement === this.renderer?.domElement) {
            console.log("Exiting pointer lock due to pause.");
            document.exitPointerLock();
        }
        // --- END ADDED ---
        this.running=false; this.clock.stop();
        console.log("Game paused"); this.uiManager?.showPauseMenu();
    }
    resume() {
        if(this.running)return;
        // --- ADDED: Request pointer lock on resume IF no menus are open ---
         if (this.renderer && this.renderer.domElement && !this.uiManager?.isInventoryOpen && !this.uiManager?.isBuildMenuOpen && !this.uiManager?.isCraftingMenuOpen && !this.uiManager?.isDebugMenuOpen) {
             console.log("Requesting pointer lock on resume.");
             this.renderer.domElement.requestPointerLock();
         }
         // --- END ADDED ---
        this.running=true; this.clock.start();
        this.startGameLoop(); console.log("Game resumed"); this.uiManager?.hidePauseMenu();
    }

    // --- ADDED: Basic Save/Load Functions ---
    saveGame() {
        if (!this.playerController || !this.characterStats || !this.inventory || !this.entityManager || !this.resourceManager || !this.buildingSystem) {
             console.error("Cannot save game: Core systems not initialized.");
             this.uiManager?.showNotification("Save Failed: Systems not ready", 3000);
             return false;
         }

        try {
             const saveData = {
                 version: 1, // Save format version
                 timestamp: Date.now(),
                 elapsedTime: this.elapsedTime,
                 dayNightCycle: this.dayNightCycle,
                 weather: this.weather?.currentWeather ?? 'clear',
                 isGodMode: this.isGodMode,
                 player: {
                     position: this.playerController.position.toArray(),
                     rotation: this.playerController.rotation,
                     pitch: this.playerController.pitch,
                 },
                 stats: {
                     health: this.characterStats.health,
                     hunger: this.characterStats.hunger,
                     stamina: this.characterStats.stamina,
                     isBleeding: this.characterStats.isBleeding,
                     // Save other status effects if needed
                 },
                 inventory: {
                     slots: this.inventory.inventorySlots.map(item => item ? { id: item.id, amount: item.amount, durability: item.durability, currentAmmo: item.currentAmmo } : null),
                     quickBar: this.inventory.quickBarSlots,
                     selectedSlot: this.inventory.selectedSlot,
                 },
                 entities: Array.from(this.entityManager.entities.values()).map(e => ({
                     id: e.id,
                     type: e.type,
                     position: e.position.toArray(),
                     rotation: e.rotation,
                     health: e.health,
                     state: e.state,
                     isAlive: e.isAlive,
                     // Animal/Hunter specific data if needed (e.g., target)
                 })),
                 resources: Array.from(this.resourceManager.resourceMap.values())
                     .filter(r => !r.regrowTime) // Don't save respawning plants (they regrow naturally)
                     .map(r => ({
                         id: r.id,
                         type: r.type,
                         position: [r.position.x, r.position.y, r.position.z],
                         scale: r.scale,
                         health: r.health,
                         // Save 'searched' state for containers
                         searched: r.searched,
                         lootTable: r.lootTable,
                     })),
                 buildings: this.buildingSystem.buildings.map(b => ({
                     id: b.id,
                     type: b.buildingType,
                     position: [b.position.x, b.position.y, b.position.z],
                     rotation: b.rotation,
                     health: b.health, // Assuming buildings have health now
                 })),
                 // Save respawn queue state for plants that were harvested? Optional, complex.
             };

             const jsonData = JSON.stringify(saveData);
             localStorage.setItem(this.saveSlot, jsonData);
             console.log(`Game saved successfully to slot '${this.saveSlot}'. Size: ${(jsonData.length / 1024).toFixed(2)} KB`);
             return true;

         } catch (error) {
             console.error("Error during game save:", error);
             this.uiManager?.showNotification("Save Failed! Check console.", 3000);
             return false;
         }
    }

    loadGame() {
         const jsonData = localStorage.getItem(this.saveSlot);
         if (!jsonData) {
             console.warn("No save data found in slot:", this.saveSlot);
             this.uiManager?.showNotification("No save data found!", 3000);
             return false;
         }

         console.log("Loading game from slot:", this.saveSlot);
         this.pause(); // Pause game during load

         try {
             const saveData = JSON.parse(jsonData);

             // --- PRE-LOAD RESET ---
             // Clear existing dynamic objects
             this.entityManager.entities.forEach(entity => {
                 if (entity.model) this.scene.remove(entity.model);
             });
             this.entityManager.entities.clear();
             this.entityManager.animals = [];
             this.entityManager.hunters = [];
             this.entityManager.spatialGrid.clear();

             this.resourceManager.resourceMap.forEach(resource => {
                 if (resource.meshes) resource.meshes.forEach(m => this.scene.remove(m));
             });
             this.resourceManager.resourceMap.clear();
             this.resourceManager.resources = { trees: [], stones: [], plants: [], animals: [], buildings: [], crafting: [], crates: [], barrels: [], structures: [] }; // Reset categories
             this.resourceManager.spatialMap.clear();
             this.resourceManager.respawnQueue = [];

             this.buildingSystem.buildings.forEach(building => {
                 if (building.meshes) building.meshes.forEach(m => this.scene.remove(m));
             });
             this.buildingSystem.buildings = [];
             // --- END RESET ---


             // Restore Game State
             this.elapsedTime = saveData.elapsedTime ?? 0;
             this.dayNightCycle = saveData.dayNightCycle ?? 0.5;
             this.weather?.setWeather(saveData.weather ?? 'clear');
             this.isGodMode = saveData.isGodMode ?? false;

             // Restore Player
             this.playerController.position.fromArray(saveData.player.position);
             this.playerController.rotation = saveData.player.rotation;
             this.playerController.pitch = saveData.player.pitch;
             this.playerController.velocity.set(0, 0, 0); // Reset velocity
             this.playerController.updateCamera(); // Update camera immediately

             // Restore Stats
             this.characterStats.health = saveData.stats.health;
             this.characterStats.hunger = saveData.stats.hunger;
             this.characterStats.stamina = saveData.stats.stamina;
             if (saveData.stats.isBleeding) this.characterStats.addStatusEffect('bleeding', 30); // Restore with default duration? Or save duration?
             // Restore other effects...

             // Restore Inventory
             this.inventory.inventorySlots = saveData.inventory.slots.map(itemData => {
                 if (!itemData) return null;
                 const itemDef = this.inventory.getItemById(itemData.id);
                 if (!itemDef) return null;
                 return {
                     ...itemData, // id, amount, durability, currentAmmo
                     name: itemDef.name,
                     type: itemDef.type,
                     stackSize: itemDef.stackSize || 1,
                     createdTime: Date.now() // Or save/load this too?
                 };
             });
             this.inventory.quickBarSlots = saveData.inventory.quickBar;
             this.inventory.selectedSlot = saveData.inventory.selectedSlot;

             // Restore Entities
             saveData.entities.forEach(entityData => {
                 if (!entityData.isAlive) return; // Don't load dead entities
                 const pos = new THREE.Vector3().fromArray(entityData.position);
                 let entity = null;
                 try {
                      if (Constants.ANIMALS.TYPES.some(a => a.id === entityData.type)) {
                           entity = new Animal(this, entityData.type, pos);
                       } else if (entityData.type === 'hunter') {
                           entity = new AIHunter(this, pos);
                       }
                     if (entity) {
                          // Restore state (carefully, ID might clash if not handled)
                          // entity.id = entityData.id; // Usually let constructor handle ID?
                          entity.rotation = entityData.rotation;
                          entity.health = entityData.health;
                          entity.state = entityData.state;
                          this.entityManager.registerEntity(entity); // Register with new ID
                      }
                  } catch (e) { console.error("Error recreating entity on load:", e); }
             });

             // Restore Resources (Non-respawning ones)
             saveData.resources.forEach(resData => {
                 const pos = new THREE.Vector3().fromArray(resData.position);
                 // Recreate mesh based on type (simplified - needs more robust logic)
                 let mesh = null; let geo, mat;
                  try {
                       if (resData.type === 'crate' || resData.type === 'barrel') {
                            geo = this.assetLoader.getModel('rock'); // Placeholder
                            mat = new THREE.MeshStandardMaterial({ map: this.assetLoader.getTexture('wood')}); // Placeholder
                            if (resData.type === 'barrel') mat.color.setHex(0x8B4513);
                       } else if (['stone', 'iron', 'copper', 'zinc'].includes(resData.type)) {
                            geo = this.assetLoader.getModel('rock');
                            mat = new THREE.MeshStandardMaterial({ map: this.assetLoader.getTexture('stone') });
                            // Add color tints for ores if needed
                       } else if (resData.type === 'tree') {
                            // Trees have multiple meshes - skip simple restore for now
                           return;
                       }
                     if (geo && mat) {
                          mesh = new THREE.Mesh(geo, mat);
                          mesh.position.copy(pos);
                          mesh.scale.setScalar(resData.scale || 1);
                          mesh.castShadow = true; mesh.receiveShadow = true;
                          this.scene.add(mesh);
                      }
                 } catch(e) { console.error("Error recreating resource mesh on load:", e); }

                 const resource = {
                      id: resData.id,
                      type: resData.type,
                      name: resData.type.charAt(0).toUpperCase() + resData.type.slice(1), // Basic name
                      position: {x:pos.x, y:pos.y, z:pos.z},
                      scale: resData.scale,
                      health: resData.health,
                      maxHealth: resData.type === 'tree' ? Constants.RESOURCES.TREE_HEALTH : Constants.RESOURCES.STONE_HEALTH,
                      meshes: mesh ? [mesh] : [],
                      resources: {}, // Should be based on type/scale
                      regrowTime: null,
                      searched: resData.searched,
                      lootTable: resData.lootTable,
                 };
                 this.resourceManager.registerResource(resource);
             });

             // Restore Buildings
             saveData.buildings.forEach(bldgData => {
                  const pos = new THREE.Vector3().fromArray(bldgData.position);
                  // Recreate mesh
                  let mesh = null; let geo, mat;
                  try {
                       geo = this.assetLoader.getModel(bldgData.type);
                       mat = new THREE.MeshStandardMaterial({ map: this.assetLoader.getTexture('wood') });
                       if (geo && mat) {
                            mesh = new THREE.Mesh(geo, mat);
                            mesh.position.copy(pos);
                            mesh.rotation.y = bldgData.rotation;
                            mesh.castShadow = true; mesh.receiveShadow = true;
                            this.scene.add(mesh);
                       }
                  } catch(e) { console.error("Error recreating building mesh on load:", e); }

                  const building = {
                       id: bldgData.id,
                       type: 'building',
                       buildingType: bldgData.type,
                       position: {x:pos.x, y:pos.y, z:pos.z},
                       rotation: bldgData.rotation,
                       health: bldgData.health,
                       maxHealth: Constants.BUILDING.COMPONENTS.find(c=>c.id===bldgData.type)?.health || 100,
                       meshes: mesh ? [mesh] : [],
                  };
                  this.buildingSystem.buildings.push(building);
                  // Re-register if it was destructible
                  if (building.health < (building.maxHealth || 100)) {
                       this.resourceManager.registerResource(building);
                  }
             });


             // Update UI
             this.uiManager?.updateInventoryUI(this.inventory);
             this.uiManager?.updateQuickBarUI(this.inventory);
             this.uiManager?.updateQuickBarSelection();
             this.uiManager?.updateCraftingMenu();
             this.uiManager?.buildingUI?.updateBuildMenu();
             this.characterStats?.updateUI();

             console.log("Game loaded successfully.");
             return true;

         } catch (error) {
             console.error("Error loading game:", error);
             alert("Failed to load save game. Save data might be corrupted. Check console.");
             // Attempt to recover or restart?
             // For now, just log the error.
             return false;
         }
    }
    // --- END Save/Load ---
}