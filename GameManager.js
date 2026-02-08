import * as THREE from 'three';
import { CONFIG } from './config.js';
import { GridSystem } from './GridSystem.js';
import { Building, Troop } from './EntityManager.js';
// Sound system for combat impacts
const audioLoader = new THREE.AudioLoader();
const listener = new THREE.AudioListener();
let hitSound = null;
let victorySound = null;
let bonusSound = null;
let failSound = null;
// Load sword hit sound
audioLoader.load('https://rosebud.ai/assets/freesound_community-sword-hit-7160.mp3?0dsH', (buffer) => {
    hitSound = buffer;
});
// Load victory/completion sound
audioLoader.load('https://rosebud.ai/assets/mixkit-game-level-completed-2059.wav?Ip1E', (buffer) => {
    victorySound = buffer;
});
// Load bonus/milestone sound for earning gold
audioLoader.load('https://rosebud.ai/assets/mixkit-bonus-earned-in-video-game-2058.wav?uOOV', (buffer) => {
    bonusSound = buffer;
});
// Load fail sound for defeat
audioLoader.load('https://rosebud.ai/assets/u_8g40a9z0la-fail-234710.mp3?Kn2a', (buffer) => {
    failSound = buffer;
});

export class GameManager {
    constructor() {
        this.gold = 500;
        this.elixir = 200;
        this.lastGoldMilestone = Math.floor(500 / 100) * 100; // Track last 100-gold milestone
        this.gameMode = CONFIG.GAME_MODES.HOME; // home or attack
        this.interactionMode = 'view'; // view, build-mine, build-barracks, deploy
        this.buildings = [];
        this.troops = [];
        this.projectiles = [];
        this.playerBase = []; // Save player's base
        this.selectedTroop = null; // For troop deployment
        this.battleTimeRemaining = 0;
        this.battleStartTime = 0;
        this.deployedTroopCost = 0; // Track elixir spent on deployed troops
        this.battleEnded = false; // Flag to prevent multiple result screens
        
        // Troop inventory
        this.trainedTroops = {
            BEAR: 0,
            RABBIT: 0,
            PENGUIN: 0
        };
        
        this.lastFrameTime = Date.now();
        
        this.initThree();
        this.gridSystem = new GridSystem(this.scene);
        
        // Initial Town Hall for player
        const th = new Building('TOWN_HALL', CONFIG.BUILDINGS.TOWN_HALL, false);
        this.gridSystem.placeBuilding(th, 9, 9);
        this.buildings.push(th);
        this.playerBase.push({ type: 'TOWN_HALL', x: 9, z: 9 });

        this.setupEventListeners();
        this.updateCurrencyUI();
        this.animate();

        // Income loop - collect every 2 seconds
        setInterval(() => this.collectIncome(), 2000);
    }

    initThree() {
        this.scene = new THREE.Scene();
        
        // Clear sky background
        this.scene.background = new THREE.Color(0x87ceeb); // Sky blue
        this.scene.fog = new THREE.Fog(0x87ceeb, 50, 200);

        this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 1000);
        this.camera.position.set(20, 20, 20);
        this.camera.lookAt(0, 0, 0);
        
        // Add audio listener to camera for sound playback
        this.camera.add(listener);

        this.renderer = new THREE.WebGLRenderer({ antialias: true });
        this.renderer.setSize(window.innerWidth, window.innerHeight);
        this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        this.renderer.shadowMap.enabled = true;
        this.renderer.shadowMap.type = THREE.BasicShadowMap;
        document.body.appendChild(this.renderer.domElement);

        // Lights
        const ambient = new THREE.AmbientLight(0xffffff, 0.6);
        this.scene.add(ambient);

        const sun = new THREE.DirectionalLight(0xffffff, 1.0);
        sun.position.set(10, 20, 10);
        sun.castShadow = true;
        sun.shadow.mapSize.width = 1024;
        sun.shadow.mapSize.height = 1024;
        this.scene.add(sun);

        window.addEventListener('resize', () => {
            this.camera.aspect = window.innerWidth / window.innerHeight;
            this.camera.updateProjectionMatrix();
            this.renderer.setSize(window.innerWidth, window.innerHeight);
        });

        this.raycaster = new THREE.Raycaster();
        this.mouse = new THREE.Vector2();
    }

    setupEventListeners() {
        let isDragging = false;
        let lastMouse = new THREE.Vector2();

        const onPointerDown = (e) => {
            isDragging = true;
            const x = (e.touches ? e.touches[0].clientX : e.clientX);
            const y = (e.touches ? e.touches[0].clientY : e.clientY);
            lastMouse.set(x, y);
        };

        const onPointerMove = (e) => {
            const x = (e.touches ? e.touches[0].clientX : e.clientX);
            const y = (e.touches ? e.touches[0].clientY : e.clientY);
            this.mouse.x = (x / window.innerWidth) * 2 - 1;
            this.mouse.y = -(y / window.innerHeight) * 2 + 1;

            if (isDragging && this.interactionMode === 'view') {
                const dx = x - lastMouse.x;
                const dy = y - lastMouse.y;
                
                // Pan camera
                const panSpeed = 0.05;
                const offset = new THREE.Vector3(-dx * panSpeed, 0, -dy * panSpeed);
                offset.applyQuaternion(this.camera.quaternion);
                offset.y = 0; // Keep on plane
                this.camera.position.add(offset);
                lastMouse.set(x, y);
            }

            if (this.interactionMode.startsWith('build')) {
                this.raycaster.setFromCamera(this.mouse, this.camera);
                const intersects = this.raycaster.intersectObject(this.gridSystem.ground);
                if (intersects.length > 0) {
                    let type = 'MINE';
                    if (this.interactionMode === 'build-barracks') type = 'BARRACKS';
                    else if (this.interactionMode === 'build-tower') type = 'ARCHER_TOWER';
                    this.gridSystem.updatePreview(intersects[0].point, CONFIG.BUILDINGS[type].size);
                }
            }
        };

        const onPointerUp = (e) => {
            if (!isDragging || this.interactionMode !== 'view') {
                if (this.interactionMode.startsWith('build')) {
                    this.raycaster.setFromCamera(this.mouse, this.camera);
                    const intersects = this.raycaster.intersectObject(this.gridSystem.ground);
                    if (intersects.length > 0) {
                        let type = 'MINE';
                        if (this.interactionMode === 'build-barracks') type = 'BARRACKS';
                        else if (this.interactionMode === 'build-tower') type = 'ARCHER_TOWER';
                        const config = CONFIG.BUILDINGS[type];
                        const { x, z, isValid } = this.gridSystem.updatePreview(intersects[0].point, config.size);
                        
                        if (isValid && this.gold >= config.cost) {
                            this.gold -= config.cost;
                            this.updateCurrencyUI();
                            const b = new Building(type, config, false);
                            this.gridSystem.placeBuilding(b, x, z);
                            this.buildings.push(b);
                            
                            // Save to player base
                            if (this.gameMode === CONFIG.GAME_MODES.HOME) {
                                this.playerBase.push({ type: type, x: x, z: z });
                            }
                            
                            this.showMessage(`Built ${config.label}!`);
                            this.setInteractionMode('view');
                        } else if (this.gold < config.cost) {
                            this.showMessage("Not enough gold!");
                        }
                    }
                } else if (this.interactionMode === 'deploy' && this.selectedTroop) {
                    this.raycaster.setFromCamera(this.mouse, this.camera);
                    const intersects = this.raycaster.intersectObject(this.gridSystem.ground);
                    if (intersects.length > 0) {
                        // Use trained troops from inventory
                        if (this.trainedTroops[this.selectedTroop] > 0) {
                            this.trainedTroops[this.selectedTroop]--;
                            this.updateTroopUI();
                            
                            // Track deployed troop cost
                            const troopConfig = CONFIG.TROOPS[this.selectedTroop];
                            this.deployedTroopCost += troopConfig.cost;
                            
                            this.spawnTroop(intersects[0].point, this.selectedTroop);
                        } else {
                            this.showMessage("No troops available! Train more at barracks.");
                        }
                    }
                }
            }
            isDragging = false;
        };

        window.addEventListener('mousedown', onPointerDown);
        window.addEventListener('touchstart', onPointerDown);
        window.addEventListener('mousemove', onPointerMove);
        window.addEventListener('touchmove', onPointerMove);
        window.addEventListener('mouseup', onPointerUp);
        window.addEventListener('touchend', onPointerUp);
    }

    setInteractionMode(mode) {
        this.interactionMode = mode;
        const modeText = document.getElementById('mode-text');
        const cancelBtn = document.getElementById('btn-cancel');
        
        // UI reset
        document.querySelectorAll('.btn').forEach(b => b.classList.remove('active'));
        cancelBtn.style.display = 'none';
        modeText.style.display = 'none';
        this.gridSystem.preview.visible = false;

        if (mode === 'build-mine') {
            document.getElementById('btn-mine').classList.add('active');
            modeText.innerText = 'Tap to place Gold Mine';
            modeText.style.display = 'block';
            cancelBtn.style.display = 'flex';
        } else if (mode === 'build-barracks') {
            document.getElementById('btn-barracks').classList.add('active');
            modeText.innerText = 'Tap to place Barracks';
            modeText.style.display = 'block';
            cancelBtn.style.display = 'flex';
        } else if (mode === 'build-tower') {
            document.getElementById('btn-tower').classList.add('active');
            modeText.innerText = 'Tap to place Archer Tower';
            modeText.style.display = 'block';
            cancelBtn.style.display = 'flex';
        } else if (mode === 'deploy') {
            modeText.innerText = 'Tap to deploy troops!';
            modeText.style.display = 'block';
        }
    }
    startAttack() {
        // Save current resource state
        this.preAttackGold = this.gold;
        this.preAttackElixir = this.elixir;
        
        // Reset deployed troop cost tracker
        this.deployedTroopCost = 0;
        this.battleEnded = false; // Reset battle ended flag
        
        // Start battle timer
        this.battleTimeRemaining = CONFIG.BATTLE_TIME;
        this.battleStartTime = Date.now();
        
        // Switch to attack mode
        this.gameMode = CONFIG.GAME_MODES.ATTACK;
        this.setInteractionMode('view');
        
        // Clear scene
        this.buildings.forEach(b => this.scene.remove(b));
        this.buildings = [];
        
        // Generate enemy base
        this.generateEnemyBase();
        
        // Update UI
        this.updateModeUI();
        this.updateTimerUI();
        this.updateAttackTroopUI();
        this.showMessage("ATTACK MODE! Deploy troops!");
    }
    updateAttackTroopUI() {
        document.getElementById('attack-bear-count').innerText = this.trainedTroops.BEAR;
        document.getElementById('attack-rabbit-count').innerText = this.trainedTroops.RABBIT;
        document.getElementById('attack-penguin-count').innerText = this.trainedTroops.PENGUIN;
    }
    showBattleResults(reason = 'timeout') {
        // Prevent showing results multiple times
        if (this.battleEnded) return;
        this.battleEnded = true;
        
        // Calculate destruction percentage
        const destroyedBuildings = this.initialEnemyBuildings - this.buildings.filter(b => b.isEnemy).length;
        const destructionPercent = Math.floor((destroyedBuildings / this.initialEnemyBuildings) * 100);
        
        // Calculate stars (0-3 based on destruction)
        let stars = 0;
        if (destructionPercent >= 50) stars = 1;
        if (destructionPercent >= 75) stars = 2;
        if (destructionPercent >= 100) stars = 3;
        
        // Calculate loot/loss based on reason
        let goldLoot, elixirLoot;
        
        if (reason === 'defeat') {
            // All troops dead - show resources LOST (negative)
            goldLoot = 0; // No gold gained
            elixirLoot = -this.deployedTroopCost; // Show negative elixir (cost of dead troops)
        } else {
            // Victory scenarios - calculate loot based on destruction percentage
            goldLoot = Math.floor(destroyedBuildings * 30);
            elixirLoot = Math.floor(destroyedBuildings * 20);
        }
        
        // Store results for display
        this.battleResults = {
            goldLoot,
            elixirLoot,
            destructionPercent,
            stars,
            reason
        };
        
        // Show results screen
        const resultsScreen = document.getElementById('results-screen');
        const resultsTitle = document.getElementById('results-title');
        const resultsStars = document.getElementById('results-stars');
        const resultsGold = document.getElementById('results-gold');
        const resultsElixir = document.getElementById('results-elixir');
        const resultsDestruction = document.getElementById('results-destruction');
        const resultsLootTitle = document.getElementById('results-loot-title');
        
        // Set victory/defeat title based on reason
        if (reason === 'defeat') {
            resultsTitle.innerText = 'DEFEAT';
            resultsTitle.style.color = '#ff4757';
        } else if (stars >= 1) {
            resultsTitle.innerText = 'VICTORY!';
            resultsTitle.style.color = '#ffd700';
        } else {
            resultsTitle.innerText = 'DEFEAT';
            resultsTitle.style.color = '#ff4757';
        }
        
        // Set stars display
        const starDisplay = '⭐'.repeat(stars) + '☆'.repeat(3 - stars);
        resultsStars.innerText = starDisplay;
        
        // Update loot title based on defeat/victory
        if (reason === 'defeat') {
            resultsLootTitle.innerText = 'RESOURCES LOST';
        } else {
            resultsLootTitle.innerText = 'LOOT EARNED';
        }
        
        // Set loot amounts (show negative values for defeats)
        resultsGold.innerText = goldLoot >= 0 ? goldLoot : goldLoot;
        resultsElixir.innerText = elixirLoot >= 0 ? elixirLoot : elixirLoot;
        resultsDestruction.innerText = `Destruction: ${destructionPercent}%`;
        
        // Show the results screen immediately for instant feedback
        resultsScreen.style.display = 'flex';
        
        // Play appropriate sound based on result
        requestAnimationFrame(() => {
            if (reason === 'defeat' && failSound) {
                // Play fail sound for defeats - clear and synchronized with screen
                const sound = new THREE.Audio(listener);
                sound.setBuffer(failSound);
                sound.setVolume(0.8);
                sound.play();
            } else if (reason !== 'defeat' && victorySound) {
                // Play victory sound for wins
                const sound = new THREE.Audio(listener);
                sound.setBuffer(victorySound);
                sound.setVolume(0.6);
                sound.play();
            }
        });
    }
    
    returnHomeFromResults() {
        // Hide results screen
        document.getElementById('results-screen').style.display = 'none';
        
        // Apply loot (can be negative for defeats)
        const oldGold = this.gold;
        this.gold = this.preAttackGold + this.battleResults.goldLoot;
        this.elixir = this.preAttackElixir + this.battleResults.elixirLoot;
        
        // Ensure resources don't go below 0
        this.gold = Math.max(0, this.gold);
        this.elixir = Math.max(0, this.elixir);
        
        // Check if we crossed a 100-gold milestone with the loot
        this.checkGoldMilestone(oldGold, this.gold);
        
        // Reset timer
        this.battleTimeRemaining = 0;
        
        // Switch back to home mode
        this.gameMode = CONFIG.GAME_MODES.HOME;
        this.setInteractionMode('view');
        
        // Clear troops, projectiles and enemy buildings
        this.troops.forEach(t => this.scene.remove(t));
        this.troops = [];
        this.projectiles.forEach(p => this.scene.remove(p));
        this.projectiles = [];
        this.buildings.forEach(b => this.scene.remove(b));
        this.buildings = [];
        
        // Restore player base
        this.restorePlayerBase();
        
        // Update UI
        this.updateCurrencyUI();
        this.updateModeUI();
    }
    
    returnHome() {
        // Legacy method - now just shows results
        this.showBattleResults('manual');
    }
    generateEnemyBase() {
        // Pick a random enemy base layout
        const baseIndex = Math.floor(Math.random() * CONFIG.ENEMY_BASES.length);
        const enemyBuildings = CONFIG.ENEMY_BASES[baseIndex];
        
        this.initialEnemyBuildings = enemyBuildings.length;
        
        enemyBuildings.forEach(eb => {
            const config = CONFIG.BUILDINGS[eb.type];
            const building = new Building(eb.type, config, true);
            this.gridSystem.placeBuilding(building, eb.x, eb.z);
            this.buildings.push(building);
        });
    }
    restorePlayerBase() {
        this.playerBase.forEach(pb => {
            const typeKey = pb.type.toUpperCase().replace('-', '_');
            const config = CONFIG.BUILDINGS[typeKey];
            const building = new Building(typeKey, config, false);
            this.gridSystem.placeBuilding(building, pb.x, pb.z);
            this.buildings.push(building);
        });
    }
    selectTroop(troopType) {
        this.selectedTroop = troopType;
        this.setInteractionMode('deploy');
        
        // Update UI
        document.querySelectorAll('.troop-btn').forEach(btn => btn.classList.remove('active'));
        document.getElementById(`troop-${troopType.toLowerCase()}`).classList.add('active');
    }
    spawnTroop(point, type) {
        const troop = new Troop(type, CONFIG.TROOPS[type]);
        troop.position.copy(point);
        troop.position.y = 0;
        this.troops.push(troop);
        this.scene.add(troop);
    }
    trainTroop(troopType) {
        const troopConfig = CONFIG.TROOPS[troopType];
        
        // Check if we have elixir
        if (this.elixir < troopConfig.cost) {
            this.showMessage("Not enough elixir!");
            return;
        }
        // Find a barracks to train from
        const barracks = this.buildings.find(b => b.type === 'BARRACKS' && !b.isEnemy);
        if (!barracks) {
            this.showMessage("Build a Barracks first!");
            return;
        }
        // Deduct cost and add to training queue
        this.elixir -= troopConfig.cost;
        this.updateCurrencyUI();
        barracks.trainTroop(troopType, troopConfig);
        this.showMessage(`Training ${troopConfig.label}...`);
    }
    updateTroopUI() {
        document.getElementById('troop-bear-count').innerText = this.trainedTroops.BEAR;
        document.getElementById('troop-rabbit-count').innerText = this.trainedTroops.RABBIT;
        document.getElementById('troop-penguin-count').innerText = this.trainedTroops.PENGUIN;
    }
    updateModeUI() {
        const homeUI = document.getElementById('home-mode-ui');
        const attackUI = document.getElementById('attack-mode-ui');
        const timerUI = document.getElementById('battle-timer');
        const trainingPanel = document.getElementById('training-panel');
        
        if (this.gameMode === CONFIG.GAME_MODES.HOME) {
            homeUI.style.display = 'flex';
            attackUI.style.display = 'none';
            timerUI.style.display = 'none';
            trainingPanel.style.display = 'flex';
        } else {
            homeUI.style.display = 'none';
            attackUI.style.display = 'flex';
            timerUI.style.display = 'block';
            trainingPanel.style.display = 'none';
        }
    }
    updateTimerUI() {
        const minutes = Math.floor(this.battleTimeRemaining / 60);
        const seconds = Math.floor(this.battleTimeRemaining % 60);
        const timeStr = `${minutes}:${seconds.toString().padStart(2, '0')}`;
        document.getElementById('timer-value').innerText = timeStr;
        
        // Change color when time is running out
        const timerEl = document.getElementById('battle-timer');
        if (this.battleTimeRemaining <= 30) {
            timerEl.style.background = 'rgba(231, 76, 60, 0.9)';
        } else {
            timerEl.style.background = 'rgba(0, 0, 0, 0.7)';
        }
    }

    collectIncome() {
        let goldIncome = 0;
        let elixirIncome = 0;
        
        this.buildings.forEach(b => {
            if (b.type === 'MINE' && b.config.goldRate) {
                goldIncome += b.config.goldRate;
            }
            if (b.type === 'BARRACKS' && b.config.elixirRate) {
                elixirIncome += b.config.elixirRate;
            }
        });
        
        if (goldIncome > 0 || elixirIncome > 0) {
            const oldGold = this.gold;
            this.gold += goldIncome;
            this.elixir += elixirIncome;
            
            // Check if we crossed a 100-gold milestone
            this.checkGoldMilestone(oldGold, this.gold);
            
            this.updateCurrencyUI();
        }
    }
    
    checkGoldMilestone(oldGold, newGold) {
        const oldMilestone = Math.floor(oldGold / 100);
        const newMilestone = Math.floor(newGold / 100);
        
        // If we crossed into a new 100-gold milestone, play bonus sound
        if (newMilestone > oldMilestone) {
            if (bonusSound) {
                const sound = new THREE.Audio(listener);
                sound.setBuffer(bonusSound);
                sound.setVolume(0.5);
                sound.play();
            }
            
            // Update the milestone tracker
            this.lastGoldMilestone = newMilestone * 100;
        }
    }
    
    updateCurrencyUI() {
        document.getElementById('gold-amount').innerText = this.gold;
        document.getElementById('elixir-amount').innerText = this.elixir;
    }

    showMessage(text) {
        const el = document.getElementById('message-overlay');
        el.innerText = text;
        el.style.display = 'block';
        setTimeout(() => el.style.display = 'none', 2000);
    }
    animate() {
        requestAnimationFrame(() => this.animate());
        // Calculate delta time
        const now = Date.now();
        const deltaTime = (now - this.lastFrameTime) / 1000;
        this.lastFrameTime = now;
        
        // Update wind animation on grass
        this.gridSystem.update(deltaTime);
        
        // Update training queues in home mode
        if (this.gameMode === CONFIG.GAME_MODES.HOME) {
            this.buildings.forEach(building => {
                const completedTroop = building.updateTraining(deltaTime);
                if (completedTroop) {
                    this.trainedTroops[completedTroop.type]++;
                    this.updateTroopUI();
                    this.showMessage(`${completedTroop.config.label} ready!`);
                }
            });
        }
        // Update battle timer
        if (this.gameMode === CONFIG.GAME_MODES.ATTACK && this.battleTimeRemaining > 0) {
            const elapsed = (Date.now() - this.battleStartTime) / 1000;
            this.battleTimeRemaining = Math.max(0, CONFIG.BATTLE_TIME - elapsed);
            this.updateTimerUI();
            
            // Time's up - show results
            if (this.battleTimeRemaining <= 0 && !this.battleEnded) {
                this.showMessage("TIME'S UP!");
                this.showBattleResults('timeout');
                return; // Stop processing battle after showing results
            }
        }
        // Update troops and HP bars
        const cameraQuaternion = this.camera.quaternion;
        for (let i = this.troops.length - 1; i >= 0; i--) {
            const troop = this.troops[i];
            troop.update(this.buildings, this.troops, (projectile) => {
                this.projectiles.push(projectile);
                this.scene.add(projectile);
            });
            
            // Billboard effect for hp bars
            troop.hpBar.quaternion.copy(cameraQuaternion);
            
            // Add support beam to scene if it exists and isn't already added
            if (troop.type === 'PENGUIN' && troop.supportBeam && !troop.supportBeam.parent) {
                this.scene.add(troop.supportBeam);
            }
            
            if (troop.hp <= 0) {
                // Remove support beam if troop is dying
                if (troop.supportBeam && troop.supportBeam.parent) {
                    this.scene.remove(troop.supportBeam);
                }
                this.scene.remove(troop);
                this.troops.splice(i, 1);
            }
        }
        // Update defensive towers
        this.buildings.forEach(building => {
            if (building.damage > 0) {
                building.update(this.troops, (projectile) => {
                    this.projectiles.push(projectile);
                    this.scene.add(projectile);
                });
            }
        });
        
        // Update projectiles
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const projectile = this.projectiles[i];
            const hit = projectile.update(deltaTime);
            
            if (hit) {
                // Apply damage to target
                projectile.target.takeDamage(projectile.damage);
                
                // Play hit sound effect
                if (hitSound) {
                    const sound = new THREE.Audio(listener);
                    sound.setBuffer(hitSound);
                    sound.setVolume(0.4);
                    sound.play();
                }
            }
            
            if (!projectile.active) {
                this.scene.remove(projectile);
                this.projectiles.splice(i, 1);
            }
        }
        // Cleanup destroyed buildings
        for (let i = this.buildings.length - 1; i >= 0; i--) {
            const b = this.buildings[i];
            b.hpBar.quaternion.copy(cameraQuaternion);
            if (b.hp <= 0) {
                this.gridSystem.removeBuilding(b);
                this.buildings.splice(i, 1);
                
                if (b.type === 'TOWN_HALL' && b.isEnemy && !this.battleEnded) {
                    this.showMessage("ENEMY TOWN HALL DESTROYED!");
                    setTimeout(() => this.showBattleResults('townhall'), 1000);
                }
            }
        }
        
        // Check if all troops are dead (defeat condition)
        if (this.gameMode === CONFIG.GAME_MODES.ATTACK && this.battleTimeRemaining > 0 && !this.battleEnded) {
            if (this.troops.length === 0 && this.deployedTroopCost > 0) {
                // All troops dead - immediate defeat
                this.showMessage("ALL TROOPS ELIMINATED!");
                setTimeout(() => this.showBattleResults('defeat'), 1000);
                return; // Stop processing after showing defeat
            }
        }
        
        // Check if all enemy buildings destroyed
        if (this.gameMode === CONFIG.GAME_MODES.ATTACK && this.battleTimeRemaining > 0 && !this.battleEnded) {
            const enemyCount = this.buildings.filter(b => b.isEnemy).length;
            if (enemyCount === 0 && this.initialEnemyBuildings > 0) {
                this.showMessage("All enemy buildings destroyed!");
                setTimeout(() => this.showBattleResults('complete'), 1000);
            }
        }

        this.renderer.render(this.scene, this.camera);
    }
}
