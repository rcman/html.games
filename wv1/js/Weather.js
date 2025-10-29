class Weather {
    constructor(game) {
        this.game = game;
        
        // Current weather state
        this.currentWeather = 'clear';
        this.transitionProgress = 0;
        this.transitionDuration = 10; // seconds for weather to transition
        
        // Weather effects
        this.rainEffect = null;
        this.fogEffect = null;
        this.cloudEffect = null;
        
        // Weather change timer
        this.weatherChangeTimer = 0;
        this.weatherChangeDuration = Constants.WEATHER.CHANGE_INTERVAL * 60; // Convert minutes to seconds
        
        // Set initial weather
        this.setRandomWeather();
    }
    
    setRandomWeather() {
        // Get a different weather type than the current one
        let newWeather;
        do {
            const weatherIndex = Math.floor(Math.random() * Constants.WEATHER.TYPES.length);
            newWeather = Constants.WEATHER.TYPES[weatherIndex];
        } while (newWeather === this.currentWeather);
        
        this.setWeather(newWeather);
    }
    
    setWeather(weatherType) {
        // Start transition to new weather
        this.previousWeather = this.currentWeather;
        this.currentWeather = weatherType;
        this.transitionProgress = 0;
        
        console.log(`Weather changed to: ${weatherType}`);
    }
    
    createRainEffect() {
        try {
            // Create rain particle system
            const rainCount = 5000;
            const rainGeometry = new THREE.BufferGeometry();
            const rainPositions = new Float32Array(rainCount * 3);
            
            // Create rain drops in a large area above the player
            for (let i = 0; i < rainCount * 3; i += 3) {
                // Random position in a box above the player
                rainPositions[i] = (Math.random() - 0.5) * 100; // x
                rainPositions[i + 1] = Math.random() * 50 + 20; // y (above player)
                rainPositions[i + 2] = (Math.random() - 0.5) * 100; // z
            }
            
            rainGeometry.setAttribute('position', new THREE.BufferAttribute(rainPositions, 3));
            
            // Rain material - simple lines
            const rainMaterial = new THREE.LineBasicMaterial({ 
                color: 0x9999AA, 
                transparent: true, 
                opacity: 0.4
            });
            
            // Each raindrop is a small line segment
            const rainVertices = [];
            for (let i = 0; i < rainCount; i++) {
                // Starting point
                const x = rainPositions[i * 3];
                const y = rainPositions[i * 3 + 1];
                const z = rainPositions[i * 3 + 2];
                
                // End point (slightly lower)
                rainVertices.push(x, y, z);
                rainVertices.push(x, y - 0.8, z);
            }
            
            const rainLines = new THREE.BufferGeometry();
            rainLines.setAttribute('position', new THREE.Float32BufferAttribute(rainVertices, 3));
            
            // Create the rain effect
            this.rainEffect = new THREE.LineSegments(rainLines, rainMaterial);
            this.game.scene.add(this.rainEffect);
            
            // Store original positions for animation
            this.rainOriginalPositions = rainPositions.slice();
            
        } catch (error) {
            console.error('Utils is not defined. Cannot create rain effect.', error);
        }
    }
    
    removeRainEffect() {
        if (this.rainEffect) {
            this.game.scene.remove(this.rainEffect);
            this.rainEffect.geometry.dispose();
            this.rainEffect.material.dispose();
            this.rainEffect = null;
        }
    }
    
    updateRainEffect(deltaTime) {
        if (!this.rainEffect) return;
        
        // Move rain drops down
        const positions = this.rainEffect.geometry.attributes.position.array;
        const speed = 20 * deltaTime; // Adjust speed as needed
        
        for (let i = 0; i < positions.length; i += 6) {
            // Update first point (top of raindrop)
            positions[i + 1] -= speed;
            
            // Update second point (bottom of raindrop)
            positions[i + 4] -= speed;
            
            // Reset drops that go below the ground
            if (positions[i + 1] < 0) {
                // Get original position
                const originalIndex = Math.floor(i / 6) * 3;
                const origX = this.rainOriginalPositions[originalIndex];
                const origY = this.rainOriginalPositions[originalIndex + 1];
                const origZ = this.rainOriginalPositions[originalIndex + 2];
                
                // Reset to original position with some randomness
                const offsetX = (Math.random() - 0.5) * 20;
                const offsetZ = (Math.random() - 0.5) * 20;
                
                positions[i] = origX + offsetX;
                positions[i + 1] = origY;
                positions[i + 2] = origZ + offsetZ;
                
                positions[i + 3] = origX + offsetX;
                positions[i + 4] = origY - 0.8;
                positions[i + 5] = origZ + offsetZ;
            }
        }
        
        this.rainEffect.geometry.attributes.position.needsUpdate = true;
    }
    
    createCloudEffect() {
        try {
            // Create cloud particle system
            const cloudCount = 20;
            const cloudGeometry = new THREE.BufferGeometry();
            const cloudPositions = new Float32Array(cloudCount * 3);
            const cloudSizes = new Float32Array(cloudCount);
            
            // Create clouds in a large area
            for (let i = 0; i < cloudCount; i++) {
                cloudPositions[i * 3] = (Math.random() - 0.5) * 500; // x
                cloudPositions[i * 3 + 1] = 50 + Math.random() * 30; // y
                cloudPositions[i * 3 + 2] = (Math.random() - 0.5) * 500; // z
                
                cloudSizes[i] = 10 + Math.random() * 15; // Random cloud size
            }
            
            cloudGeometry.setAttribute('position', new THREE.BufferAttribute(cloudPositions, 3));
            cloudGeometry.setAttribute('size', new THREE.BufferAttribute(cloudSizes, 1));
            
            // Cloud material
            const cloudTexture = new THREE.CanvasTexture(this.generateCloudTexture());
            const cloudMaterial = new THREE.PointsMaterial({
                size: 20,
                map: cloudTexture,
                transparent: true,
                opacity: 0.6,
                depthWrite: false,
                blending: THREE.NormalBlending,
                sizeAttenuation: true
            });
            
            // Create the cloud effect
            this.cloudEffect = new THREE.Points(cloudGeometry, cloudMaterial);
            this.game.scene.add(this.cloudEffect);
            
            // Store original positions for animation
            this.cloudOriginalPositions = cloudPositions.slice();
            
        } catch (error) {
            console.error('Utils is not defined. Cannot create cloud effect.', error);
        }
    }
    
    generateCloudTexture() {
        // Create a canvas to draw the cloud texture
        const canvas = document.createElement('canvas');
        canvas.width = 64;
        canvas.height = 64;
        
        const context = canvas.getContext('2d');
        
        // Draw a cloud
        context.fillStyle = 'white';
        context.beginPath();
        context.arc(32, 32, 16, 0, Math.PI * 2, true);
        context.fill();
        
        // Add some more circles to make it cloud-like
        context.beginPath();
        context.arc(25, 25, 12, 0, Math.PI * 2, true);
        context.fill();
        
        context.beginPath();
        context.arc(39, 25, 10, 0, Math.PI * 2, true);
        context.fill();
        
        context.beginPath();
        context.arc(25, 39, 11, 0, Math.PI * 2, true);
        context.fill();
        
        context.beginPath();
        context.arc(39, 39, 13, 0, Math.PI * 2, true);
        context.fill();
        
        return canvas;
    }
    
    removeCloudEffect() {
        if (this.cloudEffect) {
            this.game.scene.remove(this.cloudEffect);
            this.cloudEffect.geometry.dispose();
            this.cloudEffect.material.dispose();
            this.cloudEffect = null;
        }
    }
    
    updateCloudEffect(deltaTime) {
        if (!this.cloudEffect) return;
        
        // Move clouds slowly
        const positions = this.cloudEffect.geometry.attributes.position.array;
        const windSpeed = 2 * deltaTime; // Adjust speed as needed
        
        for (let i = 0; i < positions.length; i += 3) {
            positions[i] += windSpeed;
            
            // Wrap clouds around when they go too far
            if (positions[i] > 250) {
                positions[i] = -250;
            }
        }
        
        this.cloudEffect.geometry.attributes.position.needsUpdate = true;
    }
    
    createFogEffect() {
        // Add fog to the scene
        this.game.scene.fog = new THREE.FogExp2(0x9999AA, 0.005);
    }
    
    removeFogEffect() {
        // Remove fog from scene
        this.game.scene.fog = null;
    }
    
    updateFogEffect(deltaTime, intensity = 1) {
        if (!this.game.scene.fog) return;
        
        // Adjust fog density based on intensity
        this.game.scene.fog.density = 0.005 * intensity;
    }
    
    updateWeatherEffects(deltaTime) {
        // Update weather transition
        if (this.transitionProgress < 1) {
            this.transitionProgress += deltaTime / this.transitionDuration;
            if (this.transitionProgress > 1) this.transitionProgress = 1;
        }
        
        // Update weather effects based on current weather
        switch (this.currentWeather) {
            case 'rain':
                if (!this.rainEffect) this.createRainEffect();
                this.updateRainEffect(deltaTime);
                
                if (!this.cloudEffect) this.createCloudEffect();
                this.updateCloudEffect(deltaTime);
                
                // Darken the scene during rain
                this.game.scene.background = new THREE.Color(0x333344);
                break;
                
            case 'cloudy':
                if (!this.cloudEffect) this.createCloudEffect();
                this.updateCloudEffect(deltaTime);
                
                // Remove rain if transitioning from rain
                if (this.previousWeather === 'rain' && this.rainEffect) {
                    this.removeRainEffect();
                }
                
                // Set cloudy sky color
                this.game.scene.background = new THREE.Color(0x667788);
                break;
                
            case 'fog':
                if (!this.fogEffect) this.createFogEffect();
                this.updateFogEffect(deltaTime, this.transitionProgress);
                
                // Remove clouds if transitioning from cloudy
                if ((this.previousWeather === 'cloudy' || this.previousWeather === 'rain') && this.cloudEffect) {
                    this.removeCloudEffect();
                }
                
                // Set foggy sky color
                this.game.scene.background = new THREE.Color(0x999999);
                break;
                
            case 'storm':
                if (!this.rainEffect) this.createRainEffect();
                this.updateRainEffect(deltaTime);
                
                if (!this.cloudEffect) this.createCloudEffect();
                this.updateCloudEffect(deltaTime);
                
                if (!this.fogEffect) this.createFogEffect();
                this.updateFogEffect(deltaTime, 0.5);
                
                // Very dark scene during storm
                this.game.scene.background = new THREE.Color(0x222233);
                
                // TODO: Add lightning effect
                break;
                
            case 'clear':
            default:
                // Remove all weather effects
                if (this.rainEffect) this.removeRainEffect();
                if (this.cloudEffect) this.removeCloudEffect();
                if (this.fogEffect) this.removeFogEffect();
                
                // Set clear sky color
                this.game.scene.background = new THREE.Color(0x87CEEB);
                break;
        }
    }
    
    update(deltaTime) {
        // Update weather effects
        this.updateWeatherEffects(deltaTime);
        
        // Update weather change timer
        this.weatherChangeTimer += deltaTime;
        
        // Change weather randomly after a certain time
        if (this.weatherChangeTimer >= this.weatherChangeDuration) {
            this.weatherChangeTimer = 0;
            this.setRandomWeather();
        }
    }
}