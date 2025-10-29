// main.js - Entry point for the game

// Global settings object
window.gameSettings = {
    mapHeightFactor: 1.0,
    maxHunters: 5,
    maxAnimals: 600,
    maxTrees: 1000,
    maxRocks: 800,
    maxFiber: 1500,
    alwaysSunny: false,
    rainChance: 20 // Percentage
};

function startGame() {
    console.log("Starting game with settings:", window.gameSettings);
    document.getElementById('settings-menu').style.display = 'none'; // Hide settings

    try {
        if (typeof Game === 'undefined') {
            console.error("FATAL: Game class is not defined. Check script loading order in index.html.");
            alert("Error: Game class not found.");
            document.body.innerHTML = '<div style="color: red; font-size: 20px; padding: 40px;">Failed to load game components. Check console (F12).</div>';
            return;
        }

        // Instantiate the Game class, passing settings
        window.game = new Game(window.gameSettings); // Pass settings here
        console.log("Game instance created successfully.");

    } catch (error) {
        console.error("FATAL: Failed to initialize game:", error);
        alert("An error occurred while starting the game. Check console (F12).");
        document.body.innerHTML = `<div style="color: red; font-size: 20px; padding: 40px;">Error: ${error.message}. Check console (F12).</div>`;
    }
}

document.addEventListener('DOMContentLoaded', () => {
    console.log("DOM fully loaded. Settings menu ready.");

    const settingsMenu = document.getElementById('settings-menu');
    const startButton = document.getElementById('start-game-button');
    const mapHeightInput = document.getElementById('setting-map-height');
    const huntersInput = document.getElementById('setting-hunters');
    const animalsInput = document.getElementById('setting-animals');
    const treesInput = document.getElementById('setting-trees');
    const rocksInput = document.getElementById('setting-rocks');
    const fiberInput = document.getElementById('setting-fiber');
    const sunnyInput = document.getElementById('setting-always-sunny');
    const rainInput = document.getElementById('setting-rain-chance');

    // Add listener to the start button
    startButton.addEventListener('click', () => {
        // Read settings from inputs and store them
        window.gameSettings.mapHeightFactor = parseFloat(mapHeightInput.value);
        window.gameSettings.maxHunters = parseInt(huntersInput.value);
        window.gameSettings.maxAnimals = parseInt(animalsInput.value);
        window.gameSettings.maxTrees = parseInt(treesInput.value);
        window.gameSettings.maxRocks = parseInt(rocksInput.value);
        window.gameSettings.maxFiber = parseInt(fiberInput.value);
        window.gameSettings.alwaysSunny = sunnyInput.checked;
        window.gameSettings.rainChance = parseInt(rainInput.value);

        // Disable rain chance input if always sunny is checked
        rainInput.disabled = sunnyInput.checked;

        // Call the function to actually start the game
        startGame();
    });

    // Optional: Update rain chance input based on checkbox
    sunnyInput.addEventListener('change', () => {
        rainInput.disabled = sunnyInput.checked;
    });

});
