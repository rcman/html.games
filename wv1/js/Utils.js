// --- START OF FILE Utils.js ---

// Simple noise implementation for terrain generation
class SimplexNoise {
    // ... (SimplexNoise code remains unchanged) ...
    constructor() {
        this.p = new Uint8Array(256);
        for (let i = 0; i < 256; i++) {
            this.p[i] = i;
        }

        // Fisher-Yates shuffle
        for (let i = 255; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [this.p[i], this.p[j]] = [this.p[j], this.p[i]];
        }

        // Duplicate the permutation array
        this.perm = new Uint8Array(512);
        this.permMod12 = new Uint8Array(512);
        for (let i = 0; i < 512; i++) {
            this.perm[i] = this.p[i & 255];
            this.permMod12[i] = this.perm[i] % 12;
        }
    }

    // 2D Simplex noise
    noise2D(xin, yin) {
        // Noise contributions from the three corners
        let n0, n1, n2;

        // Skew the input space to determine which simplex cell we're in
        const F2 = 0.5 * (Math.sqrt(3.0) - 1.0);
        const s = (xin + yin) * F2;
        const i = Math.floor(xin + s);
        const j = Math.floor(yin + s);

        const G2 = (3.0 - Math.sqrt(3.0)) / 6.0;
        const t = (i + j) * G2;
        const X0 = i - t;
        const Y0 = j - t;
        const x0 = xin - X0;
        const y0 = yin - Y0;

        // Determine which simplex we're in
        let i1, j1;
        if (x0 > y0) {
            i1 = 1;
            j1 = 0;
        } else {
            i1 = 0;
            j1 = 1;
        }

        // Offsets for middle corner in (x,y) coords
        const x1 = x0 - i1 + G2;
        const y1 = y0 - j1 + G2;

        // Offsets for last corner in (x,y) coords
        const x2 = x0 - 1.0 + 2.0 * G2;
        const y2 = y0 - 1.0 + 2.0 * G2;

        // Work out the hashed gradient indices of the three simplex corners
        const ii = i & 255;
        const jj = j & 255;

        // Calculate the contribution from the three corners
        let t0 = 0.5 - x0 * x0 - y0 * y0;
        if (t0 < 0) {
            n0 = 0.0;
        } else {
            t0 *= t0;
            n0 = t0 * t0 * this.grad2D(this.perm[ii + this.perm[jj]], x0, y0);
        }

        let t1 = 0.5 - x1 * x1 - y1 * y1;
        if (t1 < 0) {
            n1 = 0.0;
        } else {
            t1 *= t1;
            n1 = t1 * t1 * this.grad2D(this.perm[ii + i1 + this.perm[jj + j1]], x1, y1);
        }

        let t2 = 0.5 - x2 * x2 - y2 * y2;
        if (t2 < 0) {
            n2 = 0.0;
        } else {
            t2 *= t2;
            n2 = t2 * t2 * this.grad2D(this.perm[ii + 1 + this.perm[jj + 1]], x2, y2);
        }

        // Add contributions from each corner to get the final noise value
        // The result is scaled to return values in the interval [-1,1]
        return 70.0 * (n0 + n1 + n2);
    }

    // Grad functions for 2D
    grad2D(hash, x, y) {
        const h = hash & 7;
        let u = h < 4 ? x : y;
        let v = h < 4 ? y : x;
        return ((h & 1) ? -u : u) + ((h & 2) ? -2.0 * v : 2.0 * v);
    }
}


// Utility functions for the game
const Utils = {
    // Generate a random number between min and max (inclusive)
    random: function(min, max) {
        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.floor(Math.random() * (max - min + 1)) + min;
    },

    // Generate a random float between min and max
    randomFloat: function(min, max) {
        return Math.random() * (max - min) + min;
    },

    // Calculate distance between two points (x1,z1) and (x2,z2)
    distance: function(x1, z1, x2, z2) {
        const dx = x2 - x1;
        const dz = z2 - z1;
        return Math.sqrt(dx * dx + dz * dz);
    },

    // Calculate distance between two THREE.Vector3 points
    distanceVector: function(v1, v2) {
         if (!v1 || !v2) return Infinity; // Handle null/undefined vectors
        return v1.distanceTo(v2);
    },

    // Generate a random position within the world boundaries
    randomPosition: function(margin = 10) {
        const size = typeof Constants !== 'undefined' ? Constants.WORLD.SIZE : 1000; // Use Constant if available
        const halfSize = size / 2;
        return {
            x: Utils.randomFloat(-halfSize + margin, halfSize - margin),
            z: Utils.randomFloat(-halfSize + margin, halfSize - margin)
        };
    },

    // Terrain-related functions
    terrain: {
        // Simplex noise for terrain generation
        noise: new SimplexNoise(),

        // Get height at a specific point using bilinear interpolation
        getHeightAt: function(x, z, terrain) {
            if (!terrain || !terrain.heightData || terrain.resolution <= 0) {
                // console.warn("getHeightAt: Invalid terrain data provided.");
                return undefined; // Indicate error or invalid input
            }

            const worldSize = terrain.size;
            const resolution = terrain.resolution;

            // Convert world coordinates to terrain grid coordinates (normalized 0 to res-1)
            const gridXf = ((x + worldSize / 2) / worldSize) * (resolution - 1);
            const gridZf = ((z + worldSize / 2) / worldSize) * (resolution - 1);

            // Get integer grid coordinates
            const gridX0 = Math.floor(gridXf);
            const gridZ0 = Math.floor(gridZf);

            // Clamp coordinates to be within the valid grid range [0, resolution-1]
            const clampedX0 = Math.max(0, Math.min(gridX0, resolution - 1));
            const clampedZ0 = Math.max(0, Math.min(gridZ0, resolution - 1));
            const clampedX1 = Math.max(0, Math.min(clampedX0 + 1, resolution - 1)); // Ensure X1 doesn't exceed bounds
            const clampedZ1 = Math.max(0, Math.min(clampedZ0 + 1, resolution - 1)); // Ensure Z1 doesn't exceed bounds

            // Check if the original floating point coords were out of bounds BEFORE clamping
            // This prevents interpolation from edges pulling height from non-existent data
            if (gridXf < 0 || gridXf > resolution - 1 || gridZf < 0 || gridZf > resolution - 1) {
                 // Return height at the nearest edge if out of bounds
                 // console.warn(`getHeightAt: Position (${x.toFixed(1)}, ${z.toFixed(1)}) is outside terrain bounds.`);
                 const edgeIndex = clampedZ0 * resolution + clampedX0;
                 if (edgeIndex < 0 || edgeIndex >= terrain.heightData.length) return undefined; // Further safety check
                 return terrain.heightData[edgeIndex];
            }


            // Calculate indices for the four corners
            const idx00 = clampedZ0 * resolution + clampedX0;
            const idx10 = clampedZ0 * resolution + clampedX1;
            const idx01 = clampedZ1 * resolution + clampedX0;
            const idx11 = clampedZ1 * resolution + clampedX1;

            // Ensure indices are valid before accessing heightData
             if (idx00 < 0 || idx00 >= terrain.heightData.length ||
                 idx10 < 0 || idx10 >= terrain.heightData.length ||
                 idx01 < 0 || idx01 >= terrain.heightData.length ||
                 idx11 < 0 || idx11 >= terrain.heightData.length) {
                  console.error(`getHeightAt: Calculated indices out of bounds for position (${x.toFixed(1)}, ${z.toFixed(1)}) -> Grid (${gridXf.toFixed(1)}, ${gridZf.toFixed(1)})`);
                 return undefined; // Indicate error
             }


            // Get heights of the four corners
            const h00 = terrain.heightData[idx00];
            const h10 = terrain.heightData[idx10];
            const h01 = terrain.heightData[idx01];
            const h11 = terrain.heightData[idx11];

            // Calculate interpolation weights (fractional part of grid coordinates)
            const tx = gridXf - gridX0;
            const tz = gridZf - gridZ0;

            // Interpolate along the Z axis for both X columns
            const h0 = h00 + (h10 - h00) * tx; // Interpolated height at (gridXf, gridZ0)
            const h1 = h01 + (h11 - h01) * tx; // Interpolated height at (gridXf, gridZ1)

            // Interpolate along the X axis using the results from the Z interpolation
            const finalHeight = h0 + (h1 - h0) * tz; // Interpolated height at (gridXf, gridZf)

            return finalHeight;
        },


        // Generate terrain heightmap using multiple octaves of simplex noise
        // --- MODIFIED: Accept heightFactor ---
        generateHeightmap: function(resolution, heightFactor = 1.0) {
            console.log(`Generating heightmap with factor: ${heightFactor}`); // <<-- ADDED LOG
            const heightmap = new Float32Array(resolution * resolution);

            // Noise parameters
            const octaves = 6;
            const persistence = 0.5;
            const scale = 0.01; // Base scale for noise
            const baseHeightScale = 20; // Base multiplier for noise result


            for (let z = 0; z < resolution; z++) {
                for (let x = 0; x < resolution; x++) {
                    let amplitude = 1.0;
                    let frequency = scale;
                    let noiseHeight = 0;
                    let normalization = 0;

                    // Sum multiple octaves of noise
                    for (let o = 0; o < octaves; o++) {
                        const sampleX = x * frequency;
                        const sampleZ = z * frequency;

                        // noise2D returns value roughly in [-1, 1]
                        noiseHeight += this.noise.noise2D(sampleX, sampleZ) * amplitude;
                        normalization += amplitude;

                        amplitude *= persistence;
                        frequency *= 2;
                    }

                    // Normalize the result to roughly [-1, 1]
                    if (normalization > 0) {
                         noiseHeight /= normalization;
                     } else {
                         noiseHeight = 0; // Avoid division by zero if somehow normalization is 0
                     }


                    // Scale and offset the noise
                    // Map [-1, 1] range to positive range and scale
                    let finalHeight = (noiseHeight + 1) / 2; // Shift to [0, 1] range
                    finalHeight *= baseHeightScale * heightFactor; // Apply scaling


                    // Optional: Add a base level if needed
                    // finalHeight += someBaseLevel;

                    // Store in heightmap
                    heightmap[z * resolution + x] = finalHeight;
                }
            }

            return heightmap;
        }
        // --- END MODIFICATION ---
    },

    // UI Helper functions
    ui: {
        // Create DOM element with class and optional attributes
        createElem: function(tag, className, attributes = {}) {
            const elem = document.createElement(tag);
            if (className) {
                elem.className = className;
            }

            for (const [key, value] of Object.entries(attributes)) {
                elem.setAttribute(key, value);
            }

            return elem;
        },

        // Update a stat bar in the UI
        updateStatBar: function(id, value, max = 100) {
            if (max <= 0) max = 1; // Prevent division by zero or negative max
            const percentage = (value / max) * 100;
            const statBar = document.getElementById(id);
            if (statBar) {
                statBar.style.width = `${Math.max(0, Math.min(100, percentage))}%`; // Clamp value [0, 100]
            } else {
                // console.warn(`UI element with ID '${id}' not found for stat bar update.`);
            }
        }
    },

    // Vector and direction helpers
    vector: {
        // Create a normalized direction vector from point a to point b
        direction: function(a, b) {
            // Ensure THREE is available and vectors are valid
            if (typeof THREE === 'undefined' || !a || !b) return null;
            return new THREE.Vector3().subVectors(b, a).normalize();
        },

        // Create a random direction vector (horizontal plane)
        randomDirection: function() {
             if (typeof THREE === 'undefined') return null;
            const theta = Math.random() * Math.PI * 2;
            return new THREE.Vector3(
                Math.cos(theta),
                0,
                Math.sin(theta)
            );
        }
    },

    // Item and inventory helpers
    items: {
        // Get item definition by ID
        getItemById: function(id) {
            // Ensure Constants are loaded
            if (typeof Constants === 'undefined' || !Constants.ITEMS) {
                console.error("Constants.ITEMS is not defined!");
                return null;
            }
            // Search through all item types
            const categories = [
                Constants.ITEMS.TOOLS,
                Constants.ITEMS.RESOURCES,
                Constants.ITEMS.PROCESSED, // Added Processed
                Constants.ITEMS.AMMO,      // Added Ammo
                Constants.ITEMS.CRAFTABLES,
                Constants.ITEMS.WORKBENCH_CRAFTABLES,
                Constants.ITEMS.FORGE_CRAFTABLES
                // Consider adding armor/placeables if they are separate categories
            ];

            for (const category of categories) {
                // Check if category exists and is an array
                if (category && Array.isArray(category)) {
                    const item = category.find(item => item && item.id === id); // Add check for item existence
                    if (item) return item;
                }
            }

            // console.warn(`Item definition with ID '${id}' not found in Constants.ITEMS`);
            return null;
        },

        // Check if item is craftable
        isCraftable: function(id) {
            const item = this.getItemById(id);
            // Check if requirements exist and is a non-empty array
            return item && item.requirements && Array.isArray(item.requirements) && item.requirements.length > 0;
        },

        // Get requirements for crafting an item
        getCraftingRequirements: function(id) {
            const item = this.getItemById(id);
            // Ensure requirements is an array before returning
            return (item && item.requirements && Array.isArray(item.requirements)) ? item.requirements : [];
        }
    },

    // Building helpers
    building: {
        // Get building component by ID
        getComponentById: function(id) {
            if (typeof Constants === 'undefined' || !Constants.BUILDING || !Constants.BUILDING.COMPONENTS) {
                 console.error("Constants.BUILDING.COMPONENTS is not defined!");
                 return null;
            }
            // Ensure components is an array
            if (!Array.isArray(Constants.BUILDING.COMPONENTS)) {
                 console.error("Constants.BUILDING.COMPONENTS is not an array!");
                 return null;
            }
            return Constants.BUILDING.COMPONENTS.find(comp => comp && comp.id === id);
        },

        // isValidBuildPosition is complex and depends heavily on game rules,
        // it's better handled within BuildingSystem. Leaving the stub here is okay
        // or remove it if BuildingSystem handles it entirely.
        // isValidBuildPosition: function(position, componentId, rotation, scene) {
        //     // This is a simplified version, actual implementation would do proper collision detection
        //     return true;
        // }
    }
};