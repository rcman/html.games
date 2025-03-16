
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Donkey Kong Clone</title>
    <style>
        body {
            margin: 0;
            padding: 0;
            overflow: hidden;
            background-color: #000;
            font-family: 'Courier New', monospace;
        }
        
        #game-container {
            position: relative;
            width: 800px;
            height: 600px;
            margin: 20px auto;
            background-color: #000;
            overflow: hidden;
        }
        
        .platform {
            position: absolute;
            height: 20px;
            background-color: #994C00;
        }
        
        .ladder {
            position: absolute;
            width: 30px;
            background-color: #FFFFFF;
            border-left: 5px solid #FFCC00;
            border-right: 5px solid #FFCC00;
        }
        
        #player {
            position: absolute;
            width: 30px;
            height: 40px;
            background-color: #FF0000;
            border-radius: 5px;
        }
        
        .hammer {
            position: absolute;
            width: 25px;
            height: 25px;
            background-color: #555555;
            border-radius: 5px;
            border: 3px solid #333333;
        }
        
        .player-hammer {
            position: absolute;
            width: 16px;
            height: 25px;
            background-color: #555555;
            border-radius: 2px;
            top: -15px;
            right: -15px;
            display: none;
        }
        
        #donkey {
            position: absolute;
            width: 60px;
            height: 60px;
            background-color: #8B4513;
            border-radius: 10px;
            top: 60px;
            left: 100px;
        }
        
        .barrel {
            position: absolute;
            width: 25px;
            height: 25px;
            background-color: #FFCC00;
            border-radius: 50%;
        }
        
        #princess {
            position: absolute;
            width: 30px;
            height: 40px;
            background-color: #FFB6C1;
            border-radius: 5px;
            top: 60px;
            right: 100px;
        }
        
        #score-display {
            position: absolute;
            top: 10px;
            left: 10px;
            color: white;
            font-size: 20px;
        }
        
        #lives-display {
            position: absolute;
            top: 10px;
            right: 10px;
            color: white;
            font-size: 20px;
        }
        
        #game-over {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            color: white;
            font-size: 40px;
            text-align: center;
            display: none;
        }
        
        #win-screen {
            position: absolute;
            top: 50%;
            left: 50%;
            transform: translate(-50%, -50%);
            color: white;
            font-size: 40px;
            text-align: center;
            display: none;
        }
        
        button {
            background-color: #FF0000;
            color: white;
            border: none;
            padding: 10px 20px;
            font-size: 16px;
            cursor: pointer;
            margin-top: 20px;
        }
    </style>
</head>
<body>
    <div id="game-container">
        <div id="score-display">Score: 0</div>
        <div id="lives-display">Lives: 3</div>
        <div id="donkey"></div>
        <div id="princess"></div>
        <div id="player">
            <div id="player-hammer" class="player-hammer"></div>
        </div>
        <div id="game-over">
            <h2>GAME OVER</h2>
            <button id="restart-button">Play Again</button>
        </div>
        <div id="win-screen">
            <h2>YOU WIN!</h2>
            <p>You rescued the princess!</p>
            <button id="play-again-button">Play Again</button>
        </div>
    </div>

    <script>
        // Game variables
        let score = 0;
        let lives = 3;
        let gameOver = false;
        let playerWon = false;
        let platforms = [];
        let ladders = [];
        let barrels = [];
        let hammers = [];
        let player = {
            x: 50,
            y: 520,
            width: 30,
            height: 40,
            speed: 5,
            jumping: false,
            climbing: false,
            onLadder: false,
            velocityY: 0,
            hasHammer: false,
            hammerTime: 0,
            hammerDuration: 10000 // 10 seconds
        };
        
        const gravity = 0.5;
        const jumpStrength = 12;
        let barrelSpawnInterval;
        
        // Game elements
        const gameContainer = document.getElementById('game-container');
        const playerElement = document.getElementById('player');
        const scoreDisplay = document.getElementById('score-display');
        const livesDisplay = document.getElementById('lives-display');
        const gameOverScreen = document.getElementById('game-over');
        const winScreen = document.getElementById('win-screen');
        const restartButton = document.getElementById('restart-button');
        const playAgainButton = document.getElementById('play-again-button');
        
        // Create hammer power-ups
        function createHammers() {
            const hammerData = [
                { x: 650, y: 440 },
                { x: 150, y: 240 },
                { x: 500, y: 140 }
            ];
            
            hammerData.forEach(data => {
                const hammer = document.createElement('div');
                hammer.className = 'hammer';
                hammer.style.left = data.x + 'px';
                hammer.style.top = data.y + 'px';
                gameContainer.appendChild(hammer);
                
                hammers.push({
                    x: data.x,
                    y: data.y,
                    width: 25,
                    height: 25,
                    element: hammer,
                    active: true
                });
            });
        }
        
        // Create platforms
        function createPlatforms() {
            const platformData = [
                { x: 0, y: 560, width: 800 },
                { x: 0, y: 460, width: 700 },
                { x: 100, y: 360, width: 700 },
                { x: 0, y: 260, width: 700 },
                { x: 100, y: 160, width: 700 }
            ];
            
            platformData.forEach(data => {
                const platform = document.createElement('div');
                platform.className = 'platform';
                platform.style.left = data.x + 'px';
                platform.style.top = data.y + 'px';
                platform.style.width = data.width + 'px';
                gameContainer.appendChild(platform);
                
                platforms.push({
                    x: data.x,
                    y: data.y,
                    width: data.width,
                    height: 20
                });
            });
        }
        
        // Create ladders
        function createLadders() {
            const ladderData = [
                { x: 150, y: 460, height: 100 },
                { x: 600, y: 360, height: 100 },
                { x: 200, y: 260, height: 100 },
                { x: 550, y: 160, height: 100 }
            ];
            
            ladderData.forEach(data => {
                const ladder = document.createElement('div');
                ladder.className = 'ladder';
                ladder.style.left = data.x + 'px';
                ladder.style.top = (data.y - data.height) + 'px';
                ladder.style.height = data.height + 'px';
                gameContainer.appendChild(ladder);
                
                ladders.push({
                    x: data.x,
                    y: data.y - data.height,
                    width: 30,
                    height: data.height
                });
            });
        }
        
        // Spawn barrels
        function spawnBarrel() {
            if (gameOver || playerWon) return;
            
            const barrel = document.createElement('div');
            barrel.className = 'barrel';
            gameContainer.appendChild(barrel);
            
            const barrelObj = {
                x: 160,
                y: 120,
                width: 25,
                height: 25,
                velocityX: 3,
                element: barrel
            };
            
            barrels.push(barrelObj);
            updateBarrelPosition(barrelObj);
        }
        
        // Update barrel position
        function updateBarrelPosition(barrel) {
            barrel.element.style.left = barrel.x + 'px';
            barrel.element.style.top = barrel.y + 'px';
        }
        
        // Update player position
        function updatePlayerPosition() {
            playerElement.style.left = player.x + 'px';
            playerElement.style.top = player.y + 'px';
        }
        
        // Check collision between two objects
        function checkCollision(obj1, obj2) {
            return (
                obj1.x < obj2.x + obj2.width &&
                obj1.x + obj1.width > obj2.x &&
                obj1.y < obj2.y + obj2.height &&
                obj1.y + obj1.height > obj2.y
            );
        }
        
        // Check if player is on a platform
        function isOnPlatform() {
            for (let platform of platforms) {
                if (
                    player.y + player.height <= platform.y + 5 &&
                    player.y + player.height >= platform.y - 5 &&
                    player.x + player.width > platform.x &&
                    player.x < platform.x + platform.width
                ) {
                    return platform;
                }
            }
            return null;
        }
        
        // Check if player is on a ladder
        function isOnLadder() {
            for (let ladder of ladders) {
                if (
                    player.x + player.width > ladder.x &&
                    player.x < ladder.x + ladder.width &&
                    player.y + player.height > ladder.y &&
                    player.y < ladder.y + ladder.height
                ) {
                    return ladder;
                }
            }
            return null;
        }
        
        // Initialize game
        function initGame() {
            createPlatforms();
            createLadders();
            createHammers();
            updatePlayerPosition();
            barrelSpawnInterval = setInterval(spawnBarrel, 3000);
            gameLoop();
        }
        
        // Reset game
        function resetGame() {
            // Clear all barrels
            barrels.forEach(barrel => {
                if (barrel.element && barrel.element.parentNode) {
                    barrel.element.parentNode.removeChild(barrel.element);
                }
            });
            barrels = [];
            
            // Clear all hammers
            hammers.forEach(hammer => {
                if (hammer.element && hammer.element.parentNode) {
                    hammer.element.parentNode.removeChild(hammer.element);
                }
            });
            hammers = [];
            
            // Reset player
            player.x = 50;
            player.y = 520;
            player.jumping = false;
            player.climbing = false;
            player.onLadder = false;
            player.velocityY = 0;
            player.hasHammer = false;
            player.hammerTime = 0;
            
            // Reset hammer visibility
            document.getElementById('player-hammer').style.display = 'none';
            
            // Create new hammers
            createHammers();
            
            // Reset game state
            score = 0;
            lives = 3;
            gameOver = false;
            playerWon = false;
            
            // Update displays
            scoreDisplay.textContent = 'Score: ' + score;
            livesDisplay.textContent = 'Lives: ' + lives;
            gameOverScreen.style.display = 'none';
            winScreen.style.display = 'none';
            
            // Restart barrel spawning
            clearInterval(barrelSpawnInterval);
            barrelSpawnInterval = setInterval(spawnBarrel, 3000);
        }
        
        // Game loop
        function gameLoop() {
            if (!gameOver && !playerWon) {
                // Apply gravity if not climbing and not on platform
                if (!player.climbing) {
                    player.velocityY += gravity;
                    player.y += player.velocityY;
                    
                    const platform = isOnPlatform();
                    if (platform) {
                        player.y = platform.y - player.height;
                        player.velocityY = 0;
                        player.jumping = false;
                    }
                }
                
                // Check ladder interaction
                const ladder = isOnLadder();
                player.onLadder = !!ladder;
                
                // Check barrel collisions
                for (let i = barrels.length - 1; i >= 0; i--) {
                    const barrel = barrels[i];
                    
                    // Move barrels
                    barrel.y += 2;
                    
                    // Check if barrel is on a platform
                    let barrelOnPlatform = false;
                    for (let platform of platforms) {
                        if (
                            barrel.y + barrel.height >= platform.y &&
                            barrel.y + barrel.height <= platform.y + 5 &&
                            barrel.x + barrel.width > platform.x &&
                            barrel.x < platform.x + platform.width
                        ) {
                            barrel.y = platform.y - barrel.height;
                            barrelOnPlatform = true;
                            
                            // Move horizontally on platforms
                            barrel.x += barrel.velocityX;
                            
                            // Reverse direction if at edge
                            if (barrel.x <= platform.x || barrel.x + barrel.width >= platform.x + platform.width) {
                                barrel.velocityX *= -1;
                            }
                            
                            break;
                        }
                    }
                    
                    // Remove barrels that fall off the screen
                    if (barrel.y > 600) {
                        gameContainer.removeChild(barrel.element);
                        barrels.splice(i, 1);
                        score += 10;
                        scoreDisplay.textContent = 'Score: ' + score;
                        continue;
                    }
                    
                    // Update barrel position
                    updateBarrelPosition(barrel);
                    
                    // Check collision with player
                    if (checkCollision(player, barrel)) {
                        if (player.hasHammer) {
                            // Smash the barrel and gain points
                            gameContainer.removeChild(barrel.element);
                            barrels.splice(i, 1);
                            score += 50;
                            scoreDisplay.textContent = 'Score: ' + score;
                        } else {
                            // Remove barrel
                            gameContainer.removeChild(barrel.element);
                            barrels.splice(i, 1);
                            
                            // Lose a life
                            lives--;
                            livesDisplay.textContent = 'Lives: ' + lives;
                            
                            if (lives <= 0) {
                                gameOver = true;
                                gameOverScreen.style.display = 'block';
                                clearInterval(barrelSpawnInterval);
                            }
                        }
                    }
                }
                
                // Handle hammer power-up
                if (player.hasHammer) {
                    const currentTime = Date.now();
                    if (currentTime - player.hammerTime > player.hammerDuration) {
                        player.hasHammer = false;
                        document.getElementById('player-hammer').style.display = 'none';
                    }
                }
                
                // Check for hammer pickups
                for (let i = hammers.length - 1; i >= 0; i--) {
                    const hammer = hammers[i];
                    if (hammer.active && checkCollision(player, hammer)) {
                        // Picked up a hammer
                        player.hasHammer = true;
                        player.hammerTime = Date.now();
                        document.getElementById('player-hammer').style.display = 'block';
                        
                        // Hide the hammer
                        hammer.active = false;
                        hammer.element.style.display = 'none';
                        
                        // Add points
                        score += 25;
                        scoreDisplay.textContent = 'Score: ' + score;
                        
                        // After hammer duration, respawn the hammer
                        setTimeout(() => {
                            if (!gameOver && !playerWon) {
                                hammer.active = true;
                                hammer.element.style.display = 'block';
                            }
                        }, player.hammerDuration + 5000); // Respawn after duration + 5 seconds
                    }
                }
                
                // Check if player reached the princess
                const princess = document.getElementById('princess');
                const princessRect = {
                    x: parseInt(princess.style.left || '730'),
                    y: parseInt(princess.style.top || '60'),
                    width: 30,
                    height: 40
                };
                
                if (checkCollision(player, princessRect)) {
                    playerWon = true;
                    winScreen.style.display = 'block';
                    clearInterval(barrelSpawnInterval);
                }
                
                // Boundary checks
                if (player.x < 0) player.x = 0;
                if (player.x + player.width > 800) player.x = 800 - player.width;
                if (player.y < 0) player.y = 0;
                if (player.y + player.height > 600) {
                    player.y = 600 - player.height;
                    player.velocityY = 0;
                    player.jumping = false;
                }
                
                updatePlayerPosition();
            }
            
            requestAnimationFrame(gameLoop);
        }
        
        // Keyboard controls
        document.addEventListener('keydown', function(e) {
            if (gameOver || playerWon) return;
            
            switch (e.key) {
                case 'ArrowLeft':
                    player.x -= player.speed;
                    break;
                case 'ArrowRight':
                    player.x += player.speed;
                    break;
                case 'ArrowUp':
                    if (player.onLadder) {
                        player.climbing = true;
                        player.y -= player.speed;
                    } else if (!player.jumping) {
                        player.jumping = true;
                        player.velocityY = -jumpStrength;
                    }
                    break;
                case 'ArrowDown':
                    if (player.onLadder) {
                        player.climbing = true;
                        player.y += player.speed;
                    }
                    break;
                case ' ':
                    if (!player.jumping) {
                        player.jumping = true;
                        player.velocityY = -jumpStrength;
                    }
                    break;
            }
        });
        
        document.addEventListener('keyup', function(e) {
            if (e.key === 'ArrowUp' || e.key === 'ArrowDown') {
                player.climbing = false;
            }
        });
        
        // Event listeners for buttons
        restartButton.addEventListener('click', resetGame);
        playAgainButton.addEventListener('click', resetGame);
        
        // Start the game
        initGame();
    </script>
</body>
</html>
