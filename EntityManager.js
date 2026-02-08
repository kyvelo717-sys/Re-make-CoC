import * as THREE from 'three';
import { CONFIG } from './config.js';
import { Projectile } from './Projectile.js';
// Sound system for troops
const audioLoader = new THREE.AudioLoader();
const listener = new THREE.AudioListener();
let arrowSound = null;
let whooshSound = null;
let rabbitSound = null;
// Load arrow sound for penguin archer
audioLoader.load('https://rosebud.ai/assets/djartmusic-arrow-swish_03-306040.mp3?jIxI', (buffer) => {
    arrowSound = buffer;
});
// Load whoosh sound for bear
audioLoader.load('https://rosebud.ai/assets/freesound_community-swinging-staff-whoosh-strong-08-44658.mp3?8iQb', (buffer) => {
    whooshSound = buffer;
});
// Load sword hit sound for rabbit
audioLoader.load('https://rosebud.ai/assets/freesound_community-sword-hit-7160.mp3?0dsH', (buffer) => {
    rabbitSound = buffer;
});

export class Building extends THREE.Group {
    constructor(type, config, isEnemy = false) {
        super();
        this.type = type;
        this.config = config;
        this.isEnemy = isEnemy;
        this.hp = config.hp;
        this.maxHp = config.hp;
        this.size = config.size;
        
        // Tower properties
        this.damage = config.damage || 0;
        this.range = config.range || 0;
        this.attackSpeed = config.attackSpeed || 1000;
        this.target = null;
        this.lastAttack = 0;
        // Training queues (for barracks) - separate queue for each troop type
        this.trainingQueue = {
            BEAR: [],
            RABBIT: [],
            PENGUIN: []
        };
        this.currentTraining = {
            BEAR: null,
            RABBIT: null,
            PENGUIN: null
        };

        // Visual - Create unique shapes for each building type
        let geometry;
        let meshYPosition;
        
        if (type === 'MINE') {
            // Gold Mine - large gold ingot as main visual
            const group = new THREE.Group();
            
            const loader = new THREE.TextureLoader();
            const texture = loader.load(config.texture);
            const tintColor = isEnemy ? 0xff6666 : 0xffffff;
            
            const baseWidth = config.size * CONFIG.GRID.CELL_SIZE * 0.9;
            
            // Platform base
            const platformGeo = new THREE.CylinderGeometry(baseWidth * 0.5, baseWidth * 0.5, 0.2, 8);
            const platformMat = new THREE.MeshStandardMaterial({ 
                color: 0x8B7355,
                roughness: 0.9
            });
            const platform = new THREE.Mesh(platformGeo, platformMat);
            platform.position.y = 0.1;
            platform.castShadow = true;
            platform.receiveShadow = true;
            group.add(platform);
            
            // Main gold ingot sprite (billboard)
            const spriteMaterial = new THREE.SpriteMaterial({ 
                map: texture,
                color: tintColor
            });
            const sprite = new THREE.Sprite(spriteMaterial);
            sprite.scale.set(1.8, 1.8, 1);
            sprite.position.y = 1.2;
            group.add(sprite);
            
            // Golden glow effect
            const glowGeo = new THREE.SphereGeometry(0.6, 16, 16);
            const glowMat = new THREE.MeshBasicMaterial({ 
                color: 0xFFD700,
                transparent: true,
                opacity: 0.3
            });
            const glow = new THREE.Mesh(glowGeo, glowMat);
            glow.position.y = 1.2;
            group.add(glow);
            
            // Small gold nuggets around base
            const nuggetGeo = new THREE.SphereGeometry(0.15, 8, 8);
            const nuggetMat = new THREE.MeshStandardMaterial({ 
                color: 0xFFD700,
                roughness: 0.3,
                metalness: 0.8,
                emissive: 0xFFD700,
                emissiveIntensity: 0.3
            });
            
            for (let i = 0; i < 5; i++) {
                const angle = (i / 5) * Math.PI * 2;
                const radius = baseWidth * 0.4;
                const nugget = new THREE.Mesh(nuggetGeo, nuggetMat);
                nugget.position.set(
                    Math.cos(angle) * radius,
                    0.3,
                    Math.sin(angle) * radius
                );
                nugget.castShadow = true;
                group.add(nugget);
            }
            
            this.mesh = group;
            this.add(this.mesh);
            
        } else if (type === 'BARRACKS') {
            // Elixir Mine - large mine icon as main visual
            const group = new THREE.Group();
            
            const loader = new THREE.TextureLoader();
            const texture = loader.load(config.texture);
            const tintColor = isEnemy ? 0xff6666 : 0xffffff;
            
            const baseWidth = config.size * CONFIG.GRID.CELL_SIZE * 0.9;
            
            // Platform base with purple tint
            const platformGeo = new THREE.CylinderGeometry(baseWidth * 0.5, baseWidth * 0.5, 0.2, 8);
            const platformMat = new THREE.MeshStandardMaterial({ 
                color: 0x6a5a8c,
                roughness: 0.9
            });
            const platform = new THREE.Mesh(platformGeo, platformMat);
            platform.position.y = 0.1;
            platform.castShadow = true;
            platform.receiveShadow = true;
            group.add(platform);
            
            // Main mine/pickaxe sprite (billboard)
            const spriteMaterial = new THREE.SpriteMaterial({ 
                map: texture,
                color: tintColor
            });
            const sprite = new THREE.Sprite(spriteMaterial);
            sprite.scale.set(1.8, 1.8, 1);
            sprite.position.y = 1.2;
            group.add(sprite);
            
            // Purple elixir glow effect
            const glowGeo = new THREE.SphereGeometry(0.6, 16, 16);
            const glowMat = new THREE.MeshBasicMaterial({ 
                color: 0x9b59b6,
                transparent: true,
                opacity: 0.3
            });
            const glow = new THREE.Mesh(glowGeo, glowMat);
            glow.position.y = 1.2;
            group.add(glow);
            
            // Elixir drops around base
            const dropGeo = new THREE.SphereGeometry(0.12, 8, 8);
            const dropMat = new THREE.MeshStandardMaterial({ 
                color: 0x9b59b6,
                roughness: 0.2,
                metalness: 0.1,
                emissive: 0x9b59b6,
                emissiveIntensity: 0.5
            });
            
            for (let i = 0; i < 5; i++) {
                const angle = (i / 5) * Math.PI * 2;
                const radius = baseWidth * 0.4;
                const drop = new THREE.Mesh(dropGeo, dropMat);
                drop.position.set(
                    Math.cos(angle) * radius,
                    0.3,
                    Math.sin(angle) * radius
                );
                drop.castShadow = true;
                group.add(drop);
            }
            
            this.mesh = group;
            this.add(this.mesh);
            
        } else if (type === 'ARCHER_TOWER') {
            // Create tower shape
            const group = new THREE.Group();
            
            const loader = new THREE.TextureLoader();
            const texture = loader.load(config.texture);
            const tintColor = isEnemy ? 0xff6666 : 0xffffff;
            
            // Base cylinder
            const baseHeight = config.size * CONFIG.GRID.CELL_SIZE * 1.2;
            const baseRadius = config.size * CONFIG.GRID.CELL_SIZE * 0.4;
            const baseGeo = new THREE.CylinderGeometry(baseRadius, baseRadius, baseHeight, 8);
            const baseMat = new THREE.MeshStandardMaterial({ 
                map: texture,
                color: tintColor,
                roughness: 0.7,
                metalness: 0.2
            });
            const base = new THREE.Mesh(baseGeo, baseMat);
            base.position.y = baseHeight / 2;
            base.castShadow = true;
            base.receiveShadow = true;
            group.add(base);
            
            // Top platform
            const topHeight = 0.3;
            const topRadius = baseRadius * 1.1;
            const topGeo = new THREE.CylinderGeometry(topRadius, topRadius, topHeight, 8);
            const topMat = new THREE.MeshStandardMaterial({ 
                color: tintColor === 0xff6666 ? 0xcc5555 : 0x8B4513,
                roughness: 0.8,
                metalness: 0.1
            });
            const top = new THREE.Mesh(topGeo, topMat);
            top.position.y = baseHeight + topHeight / 2;
            top.castShadow = true;
            top.receiveShadow = true;
            group.add(top);
            
            // Battlements (small blocks around the top)
            const battlementCount = 8;
            const battlementSize = 0.2;
            const battlementRadius = topRadius * 0.9;
            for (let i = 0; i < battlementCount; i++) {
                const angle = (i / battlementCount) * Math.PI * 2;
                const battlement = new THREE.Mesh(
                    new THREE.BoxGeometry(battlementSize, battlementSize * 1.5, battlementSize),
                    topMat
                );
                battlement.position.x = Math.cos(angle) * battlementRadius;
                battlement.position.z = Math.sin(angle) * battlementRadius;
                battlement.position.y = baseHeight + topHeight + battlementSize * 0.75;
                battlement.castShadow = true;
                group.add(battlement);
            }
            
            this.mesh = group;
            this.add(this.mesh);
            
        } else {
            // Town Hall - fortress style with towers
            const group = new THREE.Group();
            
            const loader = new THREE.TextureLoader();
            const texture = loader.load(config.texture);
            const tintColor = isEnemy ? 0xff6666 : 0xffffff;
            
            // Main castle body
            const bodyWidth = config.size * CONFIG.GRID.CELL_SIZE * 0.8;
            const bodyHeight = 1.5;
            const bodyGeo = new THREE.BoxGeometry(bodyWidth, bodyHeight, bodyWidth);
            const bodyMat = new THREE.MeshStandardMaterial({ 
                map: texture,
                color: tintColor,
                roughness: 0.7,
                metalness: 0.2
            });
            const body = new THREE.Mesh(bodyGeo, bodyMat);
            body.position.y = bodyHeight / 2;
            body.castShadow = true;
            body.receiveShadow = true;
            group.add(body);
            
            // Corner towers
            const towerRadius = 0.3;
            const towerHeight = 2.0;
            const towerGeo = new THREE.CylinderGeometry(towerRadius, towerRadius, towerHeight, 8);
            const towerMat = new THREE.MeshStandardMaterial({ 
                color: tintColor === 0xff6666 ? 0xcc5555 : 0x696969,
                roughness: 0.8,
                metalness: 0.2
            });
            
            const towerPositions = [
                [-bodyWidth/2 + 0.2, towerHeight/2, -bodyWidth/2 + 0.2],
                [bodyWidth/2 - 0.2, towerHeight/2, -bodyWidth/2 + 0.2],
                [-bodyWidth/2 + 0.2, towerHeight/2, bodyWidth/2 - 0.2],
                [bodyWidth/2 - 0.2, towerHeight/2, bodyWidth/2 - 0.2]
            ];
            
            towerPositions.forEach(pos => {
                const tower = new THREE.Mesh(towerGeo, towerMat);
                tower.position.set(pos[0], pos[1], pos[2]);
                tower.castShadow = true;
                group.add(tower);
                
                // Cone roof on each tower
                const roofGeo = new THREE.ConeGeometry(towerRadius * 1.2, 0.5, 8);
                const roofMat = new THREE.MeshStandardMaterial({ 
                    color: tintColor === 0xff6666 ? 0xaa3333 : 0x8B4513,
                    roughness: 0.7
                });
                const roof = new THREE.Mesh(roofGeo, roofMat);
                roof.position.set(pos[0], towerHeight + 0.25, pos[2]);
                roof.castShadow = true;
                group.add(roof);
            });
            
            // Main gate/door
            const gateGeo = new THREE.BoxGeometry(0.8, 1.0, 0.15);
            const gateMat = new THREE.MeshStandardMaterial({ 
                color: 0x4a3828,
                roughness: 0.9
            });
            const gate = new THREE.Mesh(gateGeo, gateMat);
            gate.position.set(0, 0.5, bodyWidth / 2 + 0.05);
            gate.castShadow = true;
            group.add(gate);
            
            this.mesh = group;
            this.add(this.mesh);
        }

        // HP Bar
        this.hpBar = this.createHPBar();
        this.add(this.hpBar);
        // Position HP bar higher for towers
        const hpBarHeight = type === 'ARCHER_TOWER' 
            ? config.size * CONFIG.GRID.CELL_SIZE * 1.8 
            : config.size * CONFIG.GRID.CELL_SIZE * 0.8;
        this.hpBar.position.y = hpBarHeight;
        this.hpBar.visible = false;
    }

    createHPBar() {
        const group = new THREE.Group();
        const bg = new THREE.Mesh(
            new THREE.PlaneGeometry(2, 0.3),
            new THREE.MeshBasicMaterial({ color: 0x000000, transparent: true, opacity: 0.7 })
        );
        const fg = new THREE.Mesh(
            new THREE.PlaneGeometry(2, 0.3),
            new THREE.MeshBasicMaterial({ color: 0x00ff00 })
        );
        fg.position.z = 0.01;
        this.hpFg = fg;
        group.add(bg);
        group.add(fg);
        return group;
    }

    takeDamage(amount) {
        this.hp -= amount;
        this.hpBar.visible = true;
        const healthPct = Math.max(0, this.hp / this.maxHp);
        this.hpFg.scale.x = healthPct;
        this.hpFg.position.x = (healthPct - 1) * 0.75;
        
        // Damage flash animation
        this.flashDamage();
        
        if (this.hp <= 0) {
            return true; // Destroyed
        }
        return false;
    }
    
    flashDamage() {
        // Flash effect for buildings - handle both single meshes and groups
        const flashMaterial = (obj) => {
            if (obj.material) {
                // Store original color
                const originalColor = obj.material.color ? obj.material.color.getHex() : 0xffffff;
                
                // Flash red
                if (obj.material.color) {
                    obj.material.color.setHex(0xff0000);
                }
                
                // Restore after short delay
                setTimeout(() => {
                    if (obj.material.color) {
                        obj.material.color.setHex(originalColor);
                    }
                }, 100);
            }
        };
        
        // Traverse through all children and flash them
        this.mesh.traverse((child) => {
            if (child.isMesh || child.isSprite) {
                flashMaterial(child);
            }
        });
    }
    // For defensive towers
    update(troops, onProjectileSpawn) {
        if (this.damage === 0) return; // Only towers with damage can attack
        
        // Always retarget to nearest enemy (prioritize closest threat)
        this.findTarget(troops);
        
        // Attack target if in range
        if (this.target) {
            const dist = this.position.distanceTo(this.target.position);
            if (dist <= this.range) {
                const now = Date.now();
                if (now - this.lastAttack >= this.attackSpeed) {
                    this.lastAttack = now;
                    
                    // Spawn arrow projectile
                    const projectile = new Projectile(this.position, this.target, 'arrow');
                    projectile.damage = this.damage;
                    if (onProjectileSpawn) {
                        onProjectileSpawn(projectile);
                    }
                }
            } else {
                this.target = null; // Out of range
            }
        }
    }
    findTarget(troops) {
        let minDist = Infinity;
        let nearest = null;
        
        troops.forEach(troop => {
            const dist = this.position.distanceTo(troop.position);
            if (dist <= this.range && dist < minDist) {
                minDist = dist;
                nearest = troop;
            }
        });
        
        this.target = nearest;
    }
    // For barracks - train troops
    trainTroop(troopType, troopConfig) {
        this.trainingQueue[troopType].push({
            type: troopType,
            config: troopConfig,
            timeRemaining: troopConfig.trainTime
        });
    }
    updateTraining(deltaTime) {
        if (this.type !== 'BARRACKS') return;
        
        const completedTroops = [];
        
        // Process training for each troop type independently
        ['BEAR', 'RABBIT', 'PENGUIN'].forEach(troopType => {
            // Start training if queue has items and nothing is currently training for this type
            if (!this.currentTraining[troopType] && this.trainingQueue[troopType].length > 0) {
                this.currentTraining[troopType] = this.trainingQueue[troopType].shift();
            }
            
            // Update current training for this troop type
            if (this.currentTraining[troopType]) {
                this.currentTraining[troopType].timeRemaining -= deltaTime;
                if (this.currentTraining[troopType].timeRemaining <= 0) {
                    // Training complete - add to completed troops array
                    completedTroops.push({
                        type: this.currentTraining[troopType].type,
                        config: this.currentTraining[troopType].config
                    });
                    this.currentTraining[troopType] = null;
                }
            }
        });
        
        // Return first completed troop (or null if none completed)
        return completedTroops.length > 0 ? completedTroops[0] : null;
    }
    getTrainingProgress(troopType) {
        if (!this.currentTraining[troopType]) return { progress: 0, total: 0 };
        const elapsed = this.currentTraining[troopType].config.trainTime - this.currentTraining[troopType].timeRemaining;
        return {
            progress: elapsed,
            total: this.currentTraining[troopType].config.trainTime,
            type: this.currentTraining[troopType].type
        };
    }
}
export class Troop extends THREE.Group {
    constructor(type, config) {
        super();
        this.type = type;
        this.config = config;
        this.hp = config.hp;
        this.maxHp = config.hp;
        this.damage = config.damage;
        this.speed = config.speed;
        this.range = config.range;
        this.target = null;
        this.isInSupportMode = false;

        // Visual: Billboard Sprite
        const loader = new THREE.TextureLoader();
        const texture = loader.load(config.texture);
        const spriteMaterial = new THREE.SpriteMaterial({ map: texture });
        this.sprite = new THREE.Sprite(spriteMaterial);
        this.sprite.scale.set(1.5, 1.5, 1.5);
        this.sprite.position.y = 0.75;
        this.add(this.sprite);
        // Support mode indicator (for penguins)
        if (type === 'PENGUIN') {
            this.supportIndicator = this.createSupportIndicator();
            this.add(this.supportIndicator);
            this.supportIndicator.visible = false;
            
            // Support beam to show connection to protected bear
            this.supportBeam = this.createSupportBeam();
            this.supportBeam.visible = false;
            this.supportedBear = null; // Track which bear is being supported
        }
        // HP Bar
        this.hpBar = this.createHPBar();
        this.add(this.hpBar);
        this.hpBar.position.y = 1.6;
        this.hpBar.visible = false;
    }
    
    createSupportIndicator() {
        const group = new THREE.Group();
        
        // Glowing green ring at the base
        const ringGeo = new THREE.RingGeometry(0.8, 1.0, 32);
        const ringMat = new THREE.MeshBasicMaterial({ 
            color: 0x00ff00,
            transparent: true,
            opacity: 0.6,
            side: THREE.DoubleSide
        });
        const ring = new THREE.Mesh(ringGeo, ringMat);
        ring.rotation.x = -Math.PI / 2;
        ring.position.y = 0.05;
        group.add(ring);
        
        // Upward glow cylinder
        const glowGeo = new THREE.CylinderGeometry(0.7, 0.9, 2, 16, 1, true);
        const glowMat = new THREE.MeshBasicMaterial({ 
            color: 0x00ff00,
            transparent: true,
            opacity: 0.2,
            side: THREE.DoubleSide
        });
        const glow = new THREE.Mesh(glowGeo, glowMat);
        glow.position.y = 1;
        group.add(glow);
        
        // Store materials for animation
        this.supportRingMat = ringMat;
        this.supportGlowMat = glowMat;
        this.supportAnimTime = 0;
        
        return group;
    }
    
    createSupportBeam() {
        // Create a line from penguin to bear it's supporting
        const points = [
            new THREE.Vector3(0, 0.8, 0), // Start at penguin position
            new THREE.Vector3(0, 0.8, 5)  // End point (will be updated)
        ];
        
        const geometry = new THREE.BufferGeometry().setFromPoints(points);
        const material = new THREE.LineBasicMaterial({
            color: 0x00ff00,
            linewidth: 3,
            transparent: true,
            opacity: 0.6
        });
        
        const line = new THREE.Line(geometry, material);
        
        // Store material and geometry for animation
        this.supportBeamMat = material;
        this.supportBeamGeo = geometry;
        
        return line;
    }
    createHPBar() {
        const group = new THREE.Group();
        const bg = new THREE.Mesh(
            new THREE.PlaneGeometry(1, 0.15),
            new THREE.MeshBasicMaterial({ color: 0x000000 })
        );
        const fg = new THREE.Mesh(
            new THREE.PlaneGeometry(1, 0.15),
            new THREE.MeshBasicMaterial({ color: 0x00ff00 })
        );
        fg.position.z = 0.01;
        this.hpFg = fg;
        group.add(bg);
        group.add(fg);
        return group;
    }

    takeDamage(amount) {
        this.hp -= amount;
        this.hpBar.visible = true;
        const healthPct = Math.max(0, this.hp / this.maxHp);
        this.hpFg.scale.x = healthPct;
        this.hpFg.position.x = (healthPct - 1) * 0.5;
        
        // Damage flash animation
        this.flashDamage();
        
        return this.hp <= 0;
    }
    
    flashDamage() {
        // Flash the sprite red
        const originalColor = this.sprite.material.color.getHex();
        this.sprite.material.color.setHex(0xff0000);
        
        // Shake animation
        const originalY = this.sprite.position.y;
        this.sprite.position.y += 0.2;
        
        setTimeout(() => {
            this.sprite.material.color.setHex(originalColor);
            this.sprite.position.y = originalY;
        }, 100);
    }
    update(buildings, troops, onProjectileSpawn) {
        // Special behavior for rabbits - seek protection from bears
        if (this.type === 'RABBIT') {
            // Find nearby bears
            const nearbyBears = troops.filter(t => 
                t.type === 'BEAR' && 
                t.hp > 0 &&
                this.position.distanceTo(t.position) < 8 // Within 8 units
            );
            
            if (nearbyBears.length > 0 && this.target) {
                // Find the bear that's closest to the target (the frontline bear)
                let frontlineBear = null;
                let minBearDistToTarget = Infinity;
                
                nearbyBears.forEach(bear => {
                    const bearDistToTarget = bear.position.distanceTo(this.target.position);
                    if (bearDistToTarget < minBearDistToTarget) {
                        minBearDistToTarget = bearDistToTarget;
                        frontlineBear = bear;
                    }
                });
                
                if (frontlineBear) {
                    const myDistToTarget = this.position.distanceTo(this.target.position);
                    const safeDistance = 2.0; // Stay at least 2 units behind the frontline bear
                    
                    // If we're closer to target than the frontline bear (or too close), retreat
                    if (myDistToTarget <= minBearDistToTarget + safeDistance) {
                        // Move backwards away from target (maintain distance behind bear)
                        const dirAwayFromTarget = new THREE.Vector3()
                            .subVectors(this.position, this.target.position)
                            .normalize();
                        
                        this.position.add(dirAwayFromTarget.multiplyScalar(this.speed * 0.3));
                        
                        // Don't continue with normal movement this frame
                        return;
                    }
                }
            }
        }
        
        // Special behavior for penguin archers - check for injured bears every frame
        if (this.type === 'PENGUIN') {
            // Find bears with HP below 50%
            const injuredBears = troops.filter(t => 
                t.type === 'BEAR' && 
                t.hp < t.maxHp * 0.5 && 
                t.hp > 0
            );
            
            // If there are injured bears, immediately switch to support mode
            if (injuredBears.length > 0) {
                // Find the nearest injured bear
                let nearestBear = null;
                let minBearDist = Infinity;
                
                injuredBears.forEach(bear => {
                    const dist = this.position.distanceTo(bear.position);
                    if (dist < minBearDist) {
                        minBearDist = dist;
                        nearestBear = bear;
                    }
                });
                
                // Force retarget to support the bear
                if (nearestBear) {
                    this.isInSupportMode = true;
                    this.supportedBear = nearestBear; // Track the bear being supported
                    
                    // If the bear has a target, help attack it
                    if (nearestBear.target && nearestBear.target.hp > 0) {
                        this.target = nearestBear.target;
                    } else {
                        // Find closest enemy building to the injured bear
                        let minDistToBear = Infinity;
                        let nearest = null;
                        buildings.forEach(b => {
                            if (b.isEnemy) {
                                const distToBear = nearestBear.position.distanceTo(b.position);
                                if (distToBear < minDistToBear) {
                                    minDistToBear = distToBear;
                                    nearest = b;
                                }
                            }
                        });
                        this.target = nearest;
                    }
                }
            } else {
                // No injured bears - use normal targeting
                this.isInSupportMode = false;
                this.supportedBear = null;
                if (!this.target || this.target.hp <= 0) {
                    this.findNewTarget(buildings, troops);
                }
            }
        } else {
            // Non-penguin troops use normal targeting
            if (!this.target || this.target.hp <= 0) {
                this.findNewTarget(buildings, troops);
            }
        }
        
        // Update support mode indicator animation for penguins
        if (this.type === 'PENGUIN' && this.supportIndicator) {
            this.supportIndicator.visible = this.isInSupportMode;
            this.supportBeam.visible = this.isInSupportMode && this.supportedBear;
            
            if (this.isInSupportMode) {
                // Pulse animation
                this.supportAnimTime += 0.05;
                const pulse = 0.4 + Math.sin(this.supportAnimTime) * 0.2;
                
                this.supportRingMat.opacity = pulse;
                this.supportGlowMat.opacity = pulse * 0.5;
                this.supportBeamMat.opacity = pulse * 0.8;
                
                // Gentle rotation
                this.supportIndicator.rotation.y += 0.02;
                
                // Update support beam to point to the bear being protected
                if (this.supportedBear && this.supportedBear.hp > 0) {
                    const startPos = new THREE.Vector3(0, 0.8, 0);
                    const endPos = this.supportedBear.position.clone().sub(this.position);
                    endPos.y = 0.8; // Keep beam at same height
                    
                    const points = [startPos, endPos];
                    this.supportBeamGeo.setFromPoints(points);
                    this.supportBeamGeo.attributes.position.needsUpdate = true;
                }
            }
        }
        if (this.target) {
            const dist = this.position.distanceTo(this.target.position);
            
            // For long-range units (like penguin archer), keep some distance
            const optimalRange = this.range > 5 ? this.range * 0.7 : this.range;
            
            if (dist > optimalRange) {
                // Move towards target until in optimal range
                const dir = new THREE.Vector3().subVectors(this.target.position, this.position).normalize();
                this.position.add(dir.multiplyScalar(this.speed));
            } else if (dist < this.range) {
                // In range - attack!
                if (!this.lastAttack || Date.now() - this.lastAttack > 1000) {
                    this.lastAttack = Date.now();
                    
                    // Determine projectile type based on troop
                    let projectileType = 'stone';
                    if (this.type === 'PENGUIN') {
                        projectileType = 'arrow';
                        
                        // Play arrow sound for penguin archer
                        if (arrowSound) {
                            const sound = new THREE.Audio(listener);
                            sound.setBuffer(arrowSound);
                            sound.setVolume(0.5);
                            sound.play();
                        }
                    } else if (this.type === 'BEAR') {
                        projectileType = 'stone';
                        
                        // Play whoosh sound for bear
                        if (whooshSound) {
                            const sound = new THREE.Audio(listener);
                            sound.setBuffer(whooshSound);
                            sound.setVolume(0.6);
                            sound.play();
                        }
                    } else if (this.type === 'RABBIT') {
                        projectileType = 'stone';
                        
                        // Play sword hit sound for rabbit
                        if (rabbitSound) {
                            const sound = new THREE.Audio(listener);
                            sound.setBuffer(rabbitSound);
                            sound.setVolume(0.5);
                            sound.play();
                        }
                    }
                    
                    // Spawn projectile
                    const projectile = new Projectile(this.position, this.target, projectileType);
                    projectile.damage = this.damage;
                    if (onProjectileSpawn) {
                        onProjectileSpawn(projectile);
                    }
                }
            }
        }
    }

    findNewTarget(buildings, troops) {
        let minDist = Infinity;
        let nearest = null;
        
        // Reset support mode flag
        this.isInSupportMode = false;
        
        // Special behavior for penguin archers - support injured bears
        if (this.type === 'PENGUIN') {
            // Find bears with HP below 50%
            const injuredBears = troops.filter(t => 
                t.type === 'BEAR' && 
                t.hp < t.maxHp * 0.5 && 
                t.hp > 0
            );
            
            if (injuredBears.length > 0) {
                // Find the nearest injured bear
                let nearestBear = null;
                let minBearDist = Infinity;
                
                injuredBears.forEach(bear => {
                    const dist = this.position.distanceTo(bear.position);
                    if (dist < minBearDist) {
                        minBearDist = dist;
                        nearestBear = bear;
                    }
                });
                
                // If we found an injured bear, prioritize targets near it
                if (nearestBear && nearestBear.target) {
                    // Target what the injured bear is targeting
                    this.target = nearestBear.target;
                    this.isInSupportMode = true;
                    return;
                } else if (nearestBear) {
                    // Find closest enemy building to the injured bear
                    let minDistToBear = Infinity;
                    buildings.forEach(b => {
                        if (b.isEnemy) {
                            const distToBear = nearestBear.position.distanceTo(b.position);
                            if (distToBear < minDistToBear) {
                                minDistToBear = distToBear;
                                nearest = b;
                            }
                        }
                    });
                    
                    if (nearest) {
                        this.target = nearest;
                        this.isInSupportMode = true;
                        return;
                    }
                }
            }
        }
        
        // Default behavior - find nearest enemy building
        buildings.forEach(b => {
            // Only target enemy buildings
            if (b.isEnemy) {
                const d = this.position.distanceTo(b.position);
                if (d < minDist) {
                    minDist = d;
                    nearest = b;
                }
            }
        });
        this.target = nearest;
    }
}
