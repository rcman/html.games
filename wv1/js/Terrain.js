// --- START OF FILE Terrain.js ---

class Terrain {
    constructor(game) {
        this.game = game;
        this.size = Constants.WORLD.SIZE;
        this.resolution = Constants.WORLD.TERRAIN_RESOLUTION;
        this.waterLevel = Constants.WORLD.WATER_LEVEL;
        this.heightData = null;
        this.biomeData = null;
        this.caveEntrances = [];
        this.terrainMesh = null;
        this.waterMesh = null;
    }

    generate() {
        console.log("Generating terrain...");
        // <<-- MODIFIED: Pass height factor from game settings -->>
        const heightFactor = this.game.settings?.mapHeightFactor ?? 1.0;
        this.heightData = Utils.terrain.generateHeightmap(this.resolution, heightFactor);
        // <<-- END MODIFICATION -->>
        this.generateBiomes(); // Generate biomes BEFORE cave depression
        this.findAndDepressCaveEntrances(); // Depress AFTER biome data exists

        const geometry = new THREE.PlaneGeometry(this.size, this.size, this.resolution - 1, this.resolution - 1);
        geometry.rotateX(-Math.PI / 2);

        const vertices = geometry.attributes.position.array;
        for (let i = 0; i < vertices.length; i += 3) {
            const xIndex = (i / 3) % this.resolution;
            const zIndex = Math.floor((i / 3) / this.resolution);
            const dataIndex = zIndex * this.resolution + xIndex;
             if (dataIndex >= 0 && dataIndex < this.heightData.length) { // Bounds check
                 vertices[i + 1] = this.heightData[dataIndex];
             } else {
                 console.warn(`Height data index out of bounds: ${dataIndex}`);
                 vertices[i+1] = 0; // Fallback height
             }
        }
        geometry.attributes.position.needsUpdate = true;
        geometry.computeVertexNormals();

        this.applyVertexColors(geometry); // Apply colors AFTER final height/normals

        const material = geometry.getAttribute('color')
            ? new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, metalness: 0.2 })
            : new THREE.MeshStandardMaterial({color: 0xaaaaaa, roughness: 0.8, metalness: 0.2}); // Fallback grey material

        this.terrainMesh = new THREE.Mesh(geometry, material);
        this.terrainMesh.receiveShadow = true;
        this.game.scene.add(this.terrainMesh);

        this.generateWater();

        console.log("Terrain generation complete");
        return true;
    }

    findAndDepressCaveEntrances() {
        this.caveEntrances = [];
        const worldSize = Constants.WORLD.SIZE; const halfSize = worldSize / 2;
        const targetCount = Constants.WORLD.CAVE_COUNT; const entranceRadius = Constants.WORLD.CAVE_ENTRANCE_RADIUS;
        const depressionDepth = Constants.WORLD.CAVE_ENTRANCE_DEPTH; const resolution = this.resolution;
        let attempts = 0; const maxAttempts = targetCount * 50;

        while (this.caveEntrances.length < targetCount && attempts < maxAttempts) {
            attempts++;
            const x = Utils.randomFloat(-halfSize * 0.8, halfSize * 0.8);
            const z = Utils.randomFloat(-halfSize * 0.8, halfSize * 0.8);
            const originalHeight = Utils.terrain.getHeightAtRaw(x, z, this.heightData, this.resolution, this.size);
            const biome = this.getBiomeAt(x, z); // Uses initial biome data

            const isMountain = (biome === 4);
            const isTooClose = this.caveEntrances.some(entrance => Utils.distance(x, z, entrance.x, entrance.z) < entranceRadius * 5 );

            if (originalHeight > this.waterLevel + 5 && isMountain && !isTooClose) {
                const entrance = { x, y: originalHeight, z, radius: entranceRadius };
                this.caveEntrances.push(entrance);

                const gridX = Math.floor((x + halfSize) / worldSize * resolution);
                const gridZ = Math.floor((z + halfSize) / worldSize * resolution);
                const gridRadius = Math.ceil(entranceRadius / (worldSize / resolution));

                for (let dz = -gridRadius; dz <= gridRadius; dz++) {
                    for (let dx = -gridRadius; dx <= gridRadius; dx++) {
                        const curX = gridX + dx; const curZ = gridZ + dz;
                        if (curX >= 0 && curX < resolution && curZ >= 0 && curZ < resolution) {
                            const distSq = dx * dx + dz * dz;
                            if (distSq < gridRadius * gridRadius) {
                                const index = curZ * resolution + curX;
                                const curH = this.heightData[index];
                                const depressionFactor = Math.cos((Math.sqrt(distSq) / gridRadius) * Math.PI * 0.5);
                                const targetH = originalHeight - depressionDepth * depressionFactor;
                                this.heightData[index] = Math.min(curH, THREE.MathUtils.lerp(curH, targetH, 0.9));
                            }
                        }
                    }
                }
            }
        }
        console.log(`Found and generated ${this.caveEntrances.length} cave entrances.`);
    }

    generateBiomes() {
        if (!this.heightData) {
            console.error("generateBiomes called before heightData generation!");
            this.heightData = Utils.terrain.generateHeightmap(this.resolution);
        }
        this.biomeData = new Uint8Array(this.resolution * this.resolution);
        const moistureNoise = new SimplexNoise();
        for (let z = 0; z < this.resolution; z++) {
            for (let x = 0; x < this.resolution; x++) {
                const index = z * this.resolution + x;
                 if (index < 0 || index >= this.heightData.length) continue; // Bounds check
                const height = this.heightData[index];
                const moisture = moistureNoise.noise2D(x * 0.005, z * 0.005) * 0.5 + 0.5;
                let biome;
                if (height < this.waterLevel) biome = 0;
                else if (height < this.waterLevel + 0.5) biome = 1;
                else if (height < 8) biome = (moisture > 0.6) ? 3 : 2;
                else biome = 4;
                if (index >= 0 && index < this.biomeData.length) { // Bounds check
                    this.biomeData[index] = biome;
                }
            }
        }
         console.log("Biome data generated.");
    }

    // --- applyVertexColors with Correction ---
    applyVertexColors(geometry) {
         if (!this.biomeData) {
             console.error("applyVertexColors called before biomeData generation! Generating fallback.");
             this.generateBiomes();
             if (!this.biomeData) { console.error("Fallback biome generation failed."); return; }
         }
         if (!geometry.attributes.position) { console.error("Geometry missing position attribute."); return; }

        const colors = [];
        const vertices = geometry.attributes.position.array;
        const vertexCount = vertices.length / 3;
        const biomeColors = [
            new THREE.Color(0x0077be), // 0: Water
            new THREE.Color(0xc2b280), // 1: Beach
            new THREE.Color(0x7cfc00), // 2: Plains
            new THREE.Color(0x228b22), // 3: Forest
            new THREE.Color(0x808080)  // 4: Mountains
        ];
        const fallbackColor = new THREE.Color(0xff00ff); // Magenta fallback

        for (let i = 0; i < vertexCount; i++) {
            const vertexIndex = i * 3;
            const xCoord = Math.floor(i % this.resolution);
            const zCoord = Math.floor(i / this.resolution);
            const dataIndex = zCoord * this.resolution + xCoord;

            let biome = 0; // Default biome
            // Check if index is valid for biomeData
             if (dataIndex >= 0 && dataIndex < this.biomeData.length) {
                biome = this.biomeData[dataIndex];
            } else {
                 console.warn(`Biome data index out of bounds: ${dataIndex} for vertex ${i}`);
            }

            // --- CORRECTED PART ---
            // Get the base color, provide fallback if index is invalid
            let baseColor = biomeColors[biome];
            if (!baseColor) {
                // console.warn(`Invalid biome index ${biome} at vertex ${i}. Using fallback color.`); // Less verbose
                baseColor = fallbackColor;
            }
            let finalColor = baseColor.clone(); // Clone the valid baseColor or fallbackColor
            // --- END CORRECTION ---


            // Darken color inside cave areas
            const vertexY = vertices[vertexIndex + 1];
            const vertexX = vertices[vertexIndex];
            const vertexZ = vertices[vertexIndex + 2];

            for (const entrance of this.caveEntrances) {
                 const dx = vertexX - entrance.x; const dz = vertexZ - entrance.z;
                 const distSq = dx * dx + dz * dz;
                 // Check if vertex is within horizontal radius AND below original surface height
                 if (distSq < entrance.radius * entrance.radius && vertexY < entrance.y - 0.5) {
                      finalColor.multiplyScalar(0.5); // Make it darker (modify the cloned color)
                      break; // Apply darkening only once per vertex
                 }
             }
            colors.push(finalColor.r, finalColor.g, finalColor.b);
        }
        geometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
        console.log("Vertex colors applied.");
    }
    // --- End applyVertexColors ---


    generateWater() {
        // ... (generateWater code remains the same) ...
        const waterGeometry = new THREE.PlaneGeometry(this.size, this.size);
        waterGeometry.rotateX(-Math.PI / 2);
        const waterMaterial = new THREE.MeshStandardMaterial({ color: 0x0077be, transparent: true, opacity: 0.7, roughness: 0.1, metalness: 0.6 });
        this.waterMesh = new THREE.Mesh(waterGeometry, waterMaterial);
        this.waterMesh.position.y = this.waterLevel;
        this.waterMesh.receiveShadow = true;
        this.game.scene.add(this.waterMesh);
    }

    getHeightAt(x, z) {
        if (!this.heightData) return 0;
        return Utils.terrain.getHeightAt(x, z, this);
    }

    getBiomeAt(x, z) {
        if (!this.biomeData) return 0; // Return default biome if data not ready
        const worldSize = this.size; const resolution = this.resolution;
        const gridX = Math.floor((x + worldSize / 2) / worldSize * resolution);
        const gridZ = Math.floor((z + worldSize / 2) / worldSize * resolution);
        // Bounds check for grid coordinates
        if (gridX < 0 || gridX >= resolution || gridZ < 0 || gridZ >= resolution) return 0;
        const index = gridZ * resolution + gridX;
        // Bounds check for the data array itself
         if (index < 0 || index >= this.biomeData.length) {
            // console.warn(`Biome index out of bounds in getBiomeAt: ${index}`); // Less verbose
             return 0;
         }
        return this.biomeData[index];
    }

    isUnderwater(x, y, z) { return y < this.waterLevel; }

    isInsideCave(position) {
        if(!this.caveEntrances) return false;
        const checkRadiusMultiplier = 1.2;
        for (const entrance of this.caveEntrances) {
            const dx = position.x - entrance.x; const dz = position.z - entrance.z;
            const distSq = dx * dx + dz * dz;
            const checkRadiusSq = entrance.radius * entrance.radius * checkRadiusMultiplier * checkRadiusMultiplier;
            if (distSq < checkRadiusSq && position.y < entrance.y - 2.0) { return true; }
        }
        return false;
    }

    update(deltaTime) {
        if (!this.waterMesh) return;
        const time = this.game.elapsedTime || 0;
        const waveHeight = Math.sin(time * 0.5) * 0.1;
        this.waterMesh.position.y = this.waterLevel + waveHeight;
    }
}

// Ensure Utils.terrain.getHeightAtRaw exists
if (Utils && Utils.terrain && typeof Utils.terrain.getHeightAtRaw === 'undefined') {
    Utils.terrain.getHeightAtRaw = function(x, z, heightData, resolution, worldSize) {
        if (!heightData) return 0;
        const gridX = Math.floor((x + worldSize / 2) / worldSize * resolution);
        const gridZ = Math.floor((z + worldSize / 2) / worldSize * resolution);
        if (gridX < 0 || gridX >= resolution || gridZ < 0 || gridZ >= resolution) { return 0; }
        const index = gridZ * resolution + gridX;
        if (index < 0 || index >= heightData.length) return 0;
        return heightData[index];
    };
}