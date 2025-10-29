// --- START OF FILE AssetLoader.js ---

class AssetLoader {
    constructor() {
        this.assets = {
            textures: {},
            models: {},
            sounds: {}
        };

        this.textureLoader = new THREE.TextureLoader();
        this.audioLoader = new THREE.AudioLoader();
        
        // --- MODIFIED: Check if OBJLoader exists and initialize with better error handling ---
        if (typeof THREE.OBJLoader === 'undefined') {
            console.error("FATAL: THREE.OBJLoader is not defined! Make sure OBJLoader.js is loaded correctly.");
            // Create a placeholder to prevent errors, but it won't actually work
            this.objLoader = {
                load: function() { 
                    console.error("Cannot load OBJ models - OBJLoader not defined"); 
                    return null; 
                }
            };
        } else {
            console.log("Initializing THREE.OBJLoader...");
            this.objLoader = new THREE.OBJLoader();
        }
        // ---

        // --- MODIFIED: Define OBJ model paths with better organization ---
        this.objModelPaths = {
            barrel: 'models/Z5PU59NTBTOB7SMAZCZ0EK3X0.obj',
            bear: 'models/model.obj',
            chicken: 'models/NQYSRFAH2DLRRCXYATRL10XFG.obj',
		    cougar: 'models/model.obj',
            deer: 'models/Q0HMFCFEKGQFQLM3B7BMHPP0R.obj',
            wolf: 'models/4RSQ3II5DSI4Y3MOJW5UU2HK8.obj',
            rabbit: 'models/MMETFK9NM4XAP3FED5C6VMHNW.obj'
        };
        // --- END MODIFIED ---

        try {
             this.createDefaultTextures();
         } catch (error) {
             console.error("Error during createDefaultTextures:", error);
         }
         try {
             this.createPrimitiveModels();
         } catch(error) {
              console.error("Error creating primitive models during AssetLoader construction:", error);
         }
    }

    createDefaultTextures() {
        // ... (texture creation code remains the same) ...
        const canvas = document.createElement('canvas'); canvas.width = 1; canvas.height = 1;
        const ctx = canvas.getContext('2d'); if (!ctx) { throw new Error("Failed to get 2D context for default texture"); }
        ctx.fillStyle = '#FFFFFF'; ctx.fillRect(0, 0, 1, 1);
        const defaultTexture = new THREE.CanvasTexture(canvas);
        defaultTexture.wrapS = THREE.RepeatWrapping; defaultTexture.wrapT = THREE.RepeatWrapping; defaultTexture.name = 'default';
        this.assets.textures['default'] = defaultTexture;

        const colors = { 'wood': '#8B4513', 'stone': '#808080', 'dirt': '#9B7653', 'grass': '#567D46', 'leaves': '#2D4F2D', 'tree_bark': '#614126', 'water': '#0077BE', 'inventory_bg': '#333333', 'slot': '#555555', 'quickbar': '#444444' };

        for (const [name, color] of Object.entries(colors)) {
             if (this.assets.textures[name]) continue;
            const colorCanvas = document.createElement('canvas'); colorCanvas.width = 4; colorCanvas.height = 4;
            const colorCtx = colorCanvas.getContext('2d'); if (!colorCtx) { console.error(`Failed context for texture '${name}'`); continue; }
            colorCtx.fillStyle = color; colorCtx.fillRect(0, 0, 4, 4);
             try { /* Add subtle patterns if desired */ } catch (patternError) { console.error(`Error adding pattern to '${name}':`, patternError); }
            const colorTexture = new THREE.CanvasTexture(colorCanvas);
            colorTexture.wrapS = THREE.RepeatWrapping; colorTexture.wrapT = THREE.RepeatWrapping;
            colorTexture.magFilter = THREE.NearestFilter; colorTexture.minFilter = THREE.NearestFilter; colorTexture.name = name;
            this.assets.textures[name] = colorTexture;
        }
    }

    createPrimitiveModels() {
        console.log("Creating primitive models (excluding potential OBJ overrides)...");
        if (typeof Constants === 'undefined') {
             console.error("FATAL: Constants not defined! Cannot create models correctly.");
             this.assets.models.default = new THREE.BoxGeometry(1, 1, 1);
             return;
         }

        try {
             // Tree model (still primitive)
             this.assets.models.tree = {
                 trunk: new THREE.CylinderGeometry(0.5, 0.8, 5, 8),
                 leaves: new THREE.ConeGeometry(3, 6, 8)
             };

             // Rock model (still primitive)
             this.assets.models.rock = new THREE.DodecahedronGeometry(1, 0);

             // Plant model (still primitive)
             this.assets.models.plant = new THREE.CylinderGeometry(0.1, 0.5, 1, 4, 1, true);
             this.assets.models.cloth = new THREE.PlaneGeometry(0.5, 0.5);

             // Crate Model (still primitive)
             this.assets.models.crate = new THREE.BoxGeometry(1, 1, 1);

             // Barrel: Define scale, but geometry will be overridden by OBJ if loaded
             this.assets.models.barrel = { scale: 1.0 }; // Default scale

             // Building components (still primitive)
             this.assets.models.foundation = new THREE.BoxGeometry(Constants.BUILDING.FOUNDATION_SIZE, 0.5, Constants.BUILDING.FOUNDATION_SIZE);
             this.assets.models.wall = new THREE.BoxGeometry(Constants.BUILDING.FOUNDATION_SIZE, Constants.BUILDING.WALL_HEIGHT, 0.2);
             this.assets.models.window = new THREE.BoxGeometry(Constants.BUILDING.FOUNDATION_SIZE, Constants.BUILDING.WALL_HEIGHT, 0.2);
             this.assets.models.ceiling = new THREE.BoxGeometry(Constants.BUILDING.FOUNDATION_SIZE, 0.3, Constants.BUILDING.FOUNDATION_SIZE);

             // Items (still primitive)
             this.assets.models.axe = new THREE.BoxGeometry(0.2, 0.6, 0.1);
             this.assets.models.pickaxe = new THREE.BoxGeometry(0.2, 0.6, 0.1);
             this.assets.models.knife = new THREE.BoxGeometry(0.1, 0.4, 0.05);
             this.assets.models.canteen = new THREE.CylinderGeometry(0.15, 0.15, 0.4, 8);
             this.assets.models.rifle = new THREE.BoxGeometry(0.1, 0.1, 1.0);

             // --- Define Animal Scales (Geometry will be overridden by OBJ if loaded) ---
             Constants.ANIMALS.TYPES.forEach(animal => {
                 let scale = 1.0;
                 switch (animal.id) {
                     case 'chicken': scale = 0.6; break;
                     case 'rabbit': scale = 0.7; break;
                     case 'deer': scale = 1.2; break;
                     case 'wolf': scale = 0.9; break;
                     case 'bear': scale = 1.5; break;
                     case 'cougar': scale = 1.0; break;
                 }
                 // Store scale, objGroup will be added later for OBJ types
                 this.assets.models[animal.id] = { scale: scale };
             });

             console.log("Primitive models defined.");

         } catch (error) {
             console.error("Error explicitly within createPrimitiveModels:", error);
             if (!this.assets.models.default) {
                 this.assets.models.default = new THREE.BoxGeometry(1, 1, 1);
             }
         }
    }

    // --- MODIFIED: Improved OBJ loading with better error handling ---
    async loadAssets() {
        console.log("Initializing assets...");
        await this.loadTextures(); // Wait for procedural textures
        await this.loadSounds(); // Wait for sounds (placeholder)

        // --- Check if OBJLoader is available before attempting to load models ---
        if (typeof THREE.OBJLoader === 'undefined') {
            console.error("THREE.OBJLoader is not defined. OBJ models will not be loaded.");
            console.log("Asset initialization finished (without OBJ models).");
            return true; // Continue with the game using primitive models
        }

        // --- Load OBJ Models with better error handling ---
        console.log("Loading OBJ models...");
        const modelPromises = [];
        const modelKeys = Object.keys(this.objModelPaths);

        for (const key of modelKeys) {
             // Check if this model type exists in the initial assets (has scale defined)
             if (!this.assets.models[key]) {
                 console.warn(`AssetLoader: Scale definition missing for OBJ model '${key}' in createPrimitiveModels. Defaulting scale to 1.0.`);
                 this.assets.models[key] = { scale: 1.0 }; // Add default scale if missing
             }

             const path = this.objModelPaths[key];
             console.log(`Attempting to load OBJ model '${key}' from path: '${path}'`);

             const promise = new Promise((resolve) => {
                 // Wrap in try-catch to handle any synchronous errors
                 try {
                     this.objLoader.load(
                         path,
                         (loadedObject) => { // onLoad callback (loadedObject is typically THREE.Group)
                             console.log(`Successfully loaded ${key} (contains ${loadedObject.children.length} meshes)`);
                             // Store the loaded group along with the existing scale factor
                             this.assets.models[key] = {
                                 ...this.assets.models[key], // Keep existing scale etc.
                                 objGroup: loadedObject // Store the THREE.Group
                             };
                             resolve(); // Resolve the promise for this model
                         },
                         (progressEvent) => { // onProgress callback 
                             if (progressEvent.lengthComputable) {
                                 const percentComplete = Math.round((progressEvent.loaded / progressEvent.total) * 100);
                                 if (percentComplete % 25 === 0) { // Log at 25%, 50%, 75%, 100%
                                     console.log(`OBJ model ${key} loading: ${percentComplete}%`);
                                 }
                             }
                         },
                         (error) => { // onError callback
                             console.error(`Failed to load OBJ model ${key} from ${path}:`, error);
                             console.log(`Model path details - Base URL: ${window.location.href}, Relative Path: ${path}`);
                             // Keep existing data (scale) but mark loading as failed
                             this.assets.models[key].objGroup = null; // Indicate loading failed
                             this.assets.models[key].loadError = error.message || "Unknown loading error"; // Store error
                             // Don't reject the main promise, allow others to load
                             resolve(); // Resolve even on error to not break Promise.all
                         }
                     );
                 } catch (err) {
                     console.error(`Synchronous error during OBJ load attempt for ${key}:`, err);
                     this.assets.models[key].objGroup = null;
                     this.assets.models[key].loadError = err.message || "Synchronous load error";
                     resolve(); // Resolve to continue with other models
                 }
             });
             modelPromises.push(promise);
        }

        try {
             await Promise.all(modelPromises);
             console.log("All requested OBJ models processed (loaded or failed).");
             
             // Log summary of loaded models
             let loadedCount = 0;
             let failedCount = 0;
             for (const key of modelKeys) {
                 if (this.assets.models[key]?.objGroup) {
                     loadedCount++;
                 } else {
                     failedCount++;
                     console.warn(`Model '${key}' failed to load: ${this.assets.models[key]?.loadError || 'Unknown reason'}`);
                 }
             }
             console.log(`OBJ Loading Summary: ${loadedCount} successful, ${failedCount} failed`);
        } catch (error) {
            console.error("Error during bulk OBJ model loading (Promise.all):", error);
        }
        // --- End OBJ Loading ---

        // Final check if *any* models exist (primitive or OBJ placeholder)
        if (Object.keys(this.assets.models).length === 0) {
             console.error("FATAL: No models (primitive or placeholders) were created.");
             return false; // Indicate failure
        }

        console.log("Asset initialization finished.");
        return true; // Indicate success
    }
    // --- END MODIFIED OBJ LOADING ---

    async loadTextures() {
        // ... (texture loading/confirmation remains the same) ...
        if (Object.keys(this.assets.textures).length === 0) {
            console.warn("Procedural textures not found, attempting creation again.");
            try { this.createDefaultTextures(); } catch (error) { console.error("Failed to create procedural textures during loadTextures:", error); }
        }
        return Promise.resolve();
    }

    async loadSounds() {
        // ... (sound loading remains the same - placeholder) ...
        return Promise.resolve(true);
    }

    getTexture(name) {
        // ... (getTexture remains the same) ...
         if (this.assets.textures[name]) { return this.assets.textures[name]; }
        if (name === 'tree_bark' && this.assets.textures['wood']) { return this.assets.textures['wood']; }
        if (name === 'leaves' && this.assets.textures['grass']) { return this.assets.textures['grass']; }
        if (this.assets.textures['default']) { return this.assets.textures['default']; }
        else {
             console.error(`Default texture missing! Creating emergency texture for '${name}'.`);
             const canvas = document.createElement('canvas'); canvas.width=1;canvas.height=1; const ctx=canvas.getContext('2d'); if(ctx){ctx.fillStyle='#F0F';ctx.fillRect(0,0,1,1);} // Magenta fallback
             const emergencyTexture = new THREE.CanvasTexture(canvas); emergencyTexture.name = 'emergency_default'; return emergencyTexture;
         }
    }

    // --- MODIFIED: Improved getModel with better fallback handling ---
    getModel(name) {
        const modelData = this.assets.models[name];

        if (!modelData) {
            console.warn(`Model data placeholder for '${name}' not found, returning default cube.`);
            return new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: 0xff00ff })); // Return a MESH for fallback
        }

        try {
            // --- Handle OBJ Models ---
            if (modelData.objGroup) {
                // It's a loaded OBJ model
                const clonedGroup = modelData.objGroup.clone(); // CLONE the group

                // Check if this is an animal expecting the specific return structure
                const isAnimal = Constants.ANIMALS.TYPES.some(a => a.id === name);

                if (isAnimal) {
                    // Return the structure Animal.js expects
                    return {
                        modelGroup: clonedGroup,
                        scale: modelData.scale || 1.0 // Use stored scale or default
                    };
                } else {
                    // For other OBJs (like barrel), return the cloned group directly
                    return clonedGroup;
                }
            }
            // --- Handle Primitives IF OBJ failed or wasn't requested ---
            else if (modelData.body instanceof THREE.BufferGeometry && modelData.head instanceof THREE.BufferGeometry) {
                 // Handle primitive animal structure (remains unchanged)
                 const bodyMesh = new THREE.Mesh(modelData.body.clone());
                 const headMesh = new THREE.Mesh(modelData.head.clone());
                 headMesh.position.y = (modelData.baseBodyRadius + modelData.baseHeadRadius * 0.8) * modelData.scale;
                 headMesh.position.z = -modelData.baseBodyRadius * modelData.scale * 0.2;
                 const group = new THREE.Group();
                 group.add(bodyMesh);
                 group.add(headMesh);
                 return {
                     modelGroup: group,
                     scale: modelData.scale
                 };
            }
            else if (modelData.trunk instanceof THREE.BufferGeometry && modelData.leaves instanceof THREE.BufferGeometry) {
                // Handle tree structure (remains unchanged)
                return {
                    trunk: modelData.trunk.clone(),
                    leaves: modelData.leaves.clone()
                };
            }
            else if (modelData instanceof THREE.BufferGeometry) {
                // Handle single primitive geometry (remains unchanged)
                return modelData.clone(); // Return cloned GEOMETRY
            }
            // --- Handle case where placeholder exists but OBJ hasn't loaded yet or failed ---
            else if (modelData.scale && !modelData.objGroup && !modelData.body) {
                // Log more details about model failure if we know it was supposed to be an OBJ
                if (this.objModelPaths[name]) {
                    console.warn(`OBJ model '${name}' failed to load (${modelData.loadError || 'unknown error'}). Using fallback cube.`);
                } else {
                    console.warn(`Model '${name}' is defined but OBJ is not loaded or is primitive-only. Returning default cube.`);
                }
                
                // Create appropriate fallback based on model type
                if (Constants.ANIMALS.TYPES.some(a => a.id === name)) {
                    // For animals, return the expected structure
                    const cubeGeo = new THREE.BoxGeometry(1, 0.6, 1.5); // More animal-like proportions
                    const cubeMesh = new THREE.Mesh(cubeGeo, new THREE.MeshStandardMaterial({ color: 0xff00ff }));
                    const group = new THREE.Group();
                    group.add(cubeMesh);
                    return {
                        modelGroup: group,
                        scale: modelData.scale || 1.0
                    };
                } else {
                    // For non-animals, return a simple colored cube
                    return new THREE.Mesh(
                        new THREE.BoxGeometry(1, 1, 1), 
                        new THREE.MeshStandardMaterial({ color: 0xff00ff })
                    );
                }
            }
            // --- Fallback for any other unexpected structure ---
            else {
                console.warn(`Model structure for '${name}' is unexpected. Type: ${typeof modelData}. Returning default cube.`);
                return new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: 0xff00ff }));
            }
        } catch (error) {
             console.error(`Error cloning/assembling model for '${name}':`, error);
             return new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshStandardMaterial({ color: 0xff00ff })); // Fallback MESH on error
         }
    }
    // --- END MODIFIED getModel ---
}
// --- END OF FILE AssetLoader.js ---