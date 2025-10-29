class NetworkManager {
    constructor(game) {
        this.game = game;
        
        // Network state
        this.isConnected = false;
        this.isHost = false;
        this.socket = null;
        this.clientId = null;
        this.players = new Map();
        
        // Configuration
        this.updateRate = 0.1; // Seconds between updates
        this.updateTimer = 0;
        
        // Websocket server URL (would be configured in production)
        this.serverUrl = null; // "ws://localhost:8080" for local testing
        
        // Message handlers
        this.messageHandlers = {
            'connect': this.handleConnect.bind(this),
            'disconnect': this.handleDisconnect.bind(this),
            'playerJoined': this.handlePlayerJoined.bind(this),
            'playerLeft': this.handlePlayerLeft.bind(this),
            'playerUpdate': this.handlePlayerUpdate.bind(this),
            'entityUpdate': this.handleEntityUpdate.bind(this),
            'resourceUpdate': this.handleResourceUpdate.bind(this),
            'chatMessage': this.handleChatMessage.bind(this)
        };
    }
    
    // Connect to the server
    connect(serverUrl) {
        if (this.isConnected) {
            console.log("Already connected");
            return;
        }
        
        // Store server URL
        this.serverUrl = serverUrl;
        
        // Create WebSocket connection
        try {
            this.socket = new WebSocket(this.serverUrl);
            
            // Setup event handlers
            this.socket.onopen = this.onConnect.bind(this);
            this.socket.onclose = this.onDisconnect.bind(this);
            this.socket.onerror = this.onError.bind(this);
            this.socket.onmessage = this.onMessage.bind(this);
            
            console.log("Connecting to server...");
        } catch (error) {
            console.error("Failed to connect:", error);
        }
    }
    
    // Disconnect from the server
    disconnect() {
        if (!this.isConnected || !this.socket) return;
        
        this.socket.close();
    }
    
    // Send a message to the server
    sendMessage(type, data) {
        if (!this.isConnected || !this.socket) return;
        
        const message = {
            type,
            data
        };
        
        this.socket.send(JSON.stringify(message));
    }
    
    // Connection event handlers
    onConnect(event) {
        console.log("Connected to server");
        this.isConnected = true;
        
        // Send initial player data
        this.sendPlayerData();
    }
    
    onDisconnect(event) {
        console.log("Disconnected from server");
        this.isConnected = false;
        this.clientId = null;
        this.players.clear();
        
        // Show disconnection message
        this.game.uiManager.showNotification("Disconnected from server");
    }
    
    onError(error) {
        console.error("WebSocket error:", error);
        this.game.uiManager.showNotification("Connection error");
    }
    
    onMessage(event) {
        try {
            const message = JSON.parse(event.data);
            
            // Handle message based on type
            if (message.type && this.messageHandlers[message.type]) {
                this.messageHandlers[message.type](message.data);
            } else {
                console.warn("Unknown message type:", message.type);
            }
        } catch (error) {
            console.error("Error parsing message:", error);
        }
    }
    
    // Message handlers
    handleConnect(data) {
        this.clientId = data.clientId;
        this.isHost = data.isHost;
        
        console.log(`Connected with ID: ${this.clientId}, Host: ${this.isHost}`);
        
        // Notify player
        this.game.uiManager.showNotification("Connected to server");
    }
    
    handleDisconnect(data) {
        // Already handled by onDisconnect
    }
    
    handlePlayerJoined(data) {
        console.log(`Player joined: ${data.playerId}`);
        
        // Add player to the list
        this.players.set(data.playerId, {
            id: data.playerId,
            name: data.playerName,
            position: new THREE.Vector3(data.position.x, data.position.y, data.position.z),
            rotation: data.rotation,
            model: null
        });
        
        // Create player model
        this.createPlayerModel(data.playerId);
        
        // Notify player
        this.game.uiManager.showNotification(`${data.playerName} joined the game`);
    }
    
    handlePlayerLeft(data) {
        console.log(`Player left: ${data.playerId}`);
        
        // Remove player model
        const player = this.players.get(data.playerId);
        if (player && player.model) {
            this.game.scene.remove(player.model);
            
            // Dispose resources
            if (player.model.geometry) player.model.geometry.dispose();
            if (player.model.material) {
                if (Array.isArray(player.model.material)) {
                    player.model.material.forEach(m => m.dispose());
                } else {
                    player.model.material.dispose();
                }
            }
        }
        
        // Remove from players list
        this.players.delete(data.playerId);
        
        // Notify player
        this.game.uiManager.showNotification(`${data.playerName} left the game`);
    }
    
    handlePlayerUpdate(data) {
        // Update player position and rotation
        const player = this.players.get(data.playerId);
        if (player) {
            player.position.set(data.position.x, data.position.y, data.position.z);
            player.rotation = data.rotation;
            
            // Update model position and rotation
            if (player.model) {
                player.model.position.copy(player.position);
                player.model.rotation.y = player.rotation;
            }
        }
    }
    
    handleEntityUpdate(data) {
        // Update entity state (position, health, etc.)
        const entity = this.game.entityManager.getEntity(data.entityId);
        if (entity) {
            // Update position
            entity.position.set(data.position.x, data.position.y, data.position.z);
            
            // Update rotation
            entity.rotation = data.rotation;
            
            // Update health
            if (data.health !== undefined) {
                entity.health = data.health;
                
                // Handle entity death
                if (data.health <= 0 && entity.isAlive) {
                    entity.die();
                }
            }
            
            // Update state
            if (data.state !== undefined) {
                entity.state = data.state;
                entity.stateTimer = data.stateTimer || 0;
            }
        }
    }
    
    handleResourceUpdate(data) {
        // Update resource state (health, harvested, etc.)
        const resource = this.game.resourceManager.getResource(data.resourceId);
        if (resource) {
            // Update health
            if (data.health !== undefined) {
                resource.health = data.health;
                
                // If resource depleted, remove it
                if (data.health <= 0) {
                    this.game.resourceManager.removeResource(data.resourceId);
                }
            }
        }
    }
    
    handleChatMessage(data) {
        // Display chat message
        this.game.uiManager.showNotification(`${data.playerName}: ${data.message}`, 5000);
    }
    
    // Player model management
    createPlayerModel(playerId) {
        const player = this.players.get(playerId);
        if (!player) return;
        
        // Create a simple player model (similar to local player)
        const geometry = new THREE.BoxGeometry(0.6, 1.8, 0.6);
        const material = new THREE.MeshStandardMaterial({ color: 0x0000ff }); // Blue for other players
        
        player.model = new THREE.Mesh(geometry, material);
        player.model.castShadow = true;
        player.model.receiveShadow = true;
        
        // Position model
        player.model.position.copy(player.position);
        player.model.rotation.y = player.rotation;
        
        // Add to scene
        this.game.scene.add(player.model);
    }
    
    // Data sending methods
    sendPlayerData() {
        if (!this.isConnected) return;
        
        const playerController = this.game.playerController;
        
        // Send player position and rotation
        this.sendMessage('playerUpdate', {
            position: {
                x: playerController.position.x,
                y: playerController.position.y,
                z: playerController.position.z
            },
            rotation: playerController.rotation
        });
    }
    
    sendEntityAction(entityId, action, data = {}) {
        if (!this.isConnected) return;
        
        this.sendMessage('entityAction', {
            entityId,
            action,
            ...data
        });
    }
    
    sendResourceAction(resourceId, action, data = {}) {
        if (!this.isConnected) return;
        
        this.sendMessage('resourceAction', {
            resourceId,
            action,
            ...data
        });
    }
    
    sendChatMessage(message) {
        if (!this.isConnected || !message) return;
        
        this.sendMessage('chatMessage', { message });
    }
    
    // World synchronization for host
    syncWorld() {
        if (!this.isConnected || !this.isHost) return;
        
        // Send entity updates
        const entities = this.game.entityManager.getEntities();
        const entityUpdates = entities.map(entity => ({
            entityId: entity.id,
            type: entity.type,
            position: {
                x: entity.position.x,
                y: entity.position.y,
                z: entity.position.z
            },
            rotation: entity.rotation,
            health: entity.health,
            state: entity.state
        }));
        
        this.sendMessage('worldSync', { entities: entityUpdates });
    }
    
    // Host server locally (for co-op play)
    hostLocalServer() {
        // This would typically connect to a local server module
        // For simplicity, we'll just show a notification that this feature is not implemented
        this.game.uiManager.showNotification("Local hosting not implemented in this version");
    }
    
    // Update method called each frame
    update(deltaTime) {
        if (!this.isConnected) return;
        
        // Update timer
        this.updateTimer += deltaTime;
        
        // Send updates at the configured rate
        if (this.updateTimer >= this.updateRate) {
            this.updateTimer = 0;
            
            // Send player update
            this.sendPlayerData();
            
            // If host, sync world
            if (this.isHost) {
                this.syncWorld();
            }
        }
    }
}