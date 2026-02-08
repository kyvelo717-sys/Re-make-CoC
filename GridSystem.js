import * as THREE from 'three';
import { CONFIG } from './config.js';

export class GridSystem {
    constructor(scene) {
        this.scene = scene;
        this.gridSize = CONFIG.GRID.SIZE;
        this.cellSize = CONFIG.GRID.CELL_SIZE;
        this.buildings = [];
        this.grid = Array(this.gridSize).fill().map(() => Array(this.gridSize).fill(null));

        this.initVisuals();
    }

    initVisuals() {
        // Create single expansive grassland ground with wind animation
        const loader = new THREE.TextureLoader();
        const grassTex = loader.load('https://rosebud.ai/assets/grassland.png?jr44');
        grassTex.wrapS = THREE.RepeatWrapping;
        grassTex.wrapT = THREE.RepeatWrapping;
        grassTex.repeat.set(80, 80);
        
        // Large seamless ground plane with custom shader for wind
        const groundSize = 400;
        const groundGeo = new THREE.PlaneGeometry(groundSize, groundSize, 100, 100);
        
        // Custom shader material for wind animation
        const groundMat = new THREE.ShaderMaterial({
            uniforms: {
                grassTexture: { value: grassTex },
                time: { value: 0 },
                windStrength: { value: 0.3 },
                windSpeed: { value: 0.5 }
            },
            vertexShader: `
                uniform float time;
                uniform float windStrength;
                uniform float windSpeed;
                varying vec2 vUv;
                
                void main() {
                    vUv = uv;
                    vec3 pos = position;
                    
                    // Create gentle wave effect
                    float wave = sin(pos.x * 0.1 + time * windSpeed) * cos(pos.y * 0.1 + time * windSpeed * 0.7);
                    pos.z += wave * windStrength * 0.1;
                    
                    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
                }
            `,
            fragmentShader: `
                uniform sampler2D grassTexture;
                varying vec2 vUv;
                
                void main() {
                    vec4 texColor = texture2D(grassTexture, vUv);
                    gl_FragColor = texColor;
                }
            `
        });
        
        this.ground = new THREE.Mesh(groundGeo, groundMat);
        this.ground.rotation.x = -Math.PI / 2;
        this.ground.receiveShadow = true;
        this.groundMaterial = groundMat; // Store reference for animation
        this.scene.add(this.ground);
        
        // Add scattered rocks on the battlefield
        this.createScatteredRocks();
        
        // Add grass tufts and vegetation
        this.createVegetation();
        
        // Add distant hills/terrain features
        this.createDistantTerrain();
        // Preview mesh for placement
        this.previewGeo = new THREE.PlaneGeometry(this.cellSize, this.cellSize);
        this.previewMat = new THREE.MeshBasicMaterial({ 
            color: CONFIG.COLORS.VALID, 
            transparent: true, 
            opacity: 0.5 
        });
        this.preview = new THREE.Mesh(this.previewGeo, this.previewMat);
        this.preview.rotation.x = -Math.PI / 2;
        this.preview.position.y = 0.1;
        this.preview.visible = false;
        this.scene.add(this.preview);
    }
    
    createScatteredRocks() {
        // Add decorative rocks scattered around the playable area
        const rockCount = 40;
        const playableRadius = (this.gridSize * this.cellSize) / 2 + 5;
        
        for (let i = 0; i < rockCount; i++) {
            const rockGroup = new THREE.Group();
            
            // Create irregular rock shape by combining spheres
            const rockParts = 2 + Math.floor(Math.random() * 3);
            
            for (let j = 0; j < rockParts; j++) {
                const size = 0.3 + Math.random() * 0.6;
                const rockGeo = new THREE.SphereGeometry(size, 6, 5);
                const rockMat = new THREE.MeshStandardMaterial({
                    color: 0x808080,
                    roughness: 0.9,
                    flatShading: true
                });
                const rockPart = new THREE.Mesh(rockGeo, rockMat);
                
                // Offset parts to create irregular shape
                rockPart.position.set(
                    (Math.random() - 0.5) * 0.5,
                    (Math.random() - 0.5) * 0.3,
                    (Math.random() - 0.5) * 0.5
                );
                
                // Random slight squash
                rockPart.scale.y = 0.6 + Math.random() * 0.4;
                rockPart.castShadow = true;
                rockPart.receiveShadow = true;
                
                rockGroup.add(rockPart);
            }
            
            // Position rocks around the playable area
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * playableRadius;
            
            rockGroup.position.x = Math.cos(angle) * distance;
            rockGroup.position.z = Math.sin(angle) * distance;
            rockGroup.position.y = 0;
            
            // Random rotation
            rockGroup.rotation.y = Math.random() * Math.PI * 2;
            
            // Slight random tilt
            rockGroup.rotation.x = (Math.random() - 0.5) * 0.2;
            rockGroup.rotation.z = (Math.random() - 0.5) * 0.2;
            
            // Random scale variation
            const scale = 0.8 + Math.random() * 0.8;
            rockGroup.scale.setScalar(scale);
            
            this.scene.add(rockGroup);
        }
    }
    
    createVegetation() {
        // Add various vegetation elements to make the ground more abundant
        const playableRadius = (this.gridSize * this.cellSize) / 2;
        
        // Grass tufts - small clumps of taller grass
        const grassTuftCount = 60;
        for (let i = 0; i < grassTuftCount; i++) {
            const tuftGroup = new THREE.Group();
            
            // Create several blades of grass
            const bladeCount = 5 + Math.floor(Math.random() * 5);
            for (let j = 0; j < bladeCount; j++) {
                const bladeHeight = 0.4 + Math.random() * 0.3;
                const bladeGeo = new THREE.ConeGeometry(0.05, bladeHeight, 3);
                const bladeMat = new THREE.MeshStandardMaterial({
                    color: 0x4caf50,
                    roughness: 0.9,
                    flatShading: true
                });
                const blade = new THREE.Mesh(bladeGeo, bladeMat);
                
                // Offset and rotate each blade slightly
                blade.position.set(
                    (Math.random() - 0.5) * 0.3,
                    bladeHeight / 2,
                    (Math.random() - 0.5) * 0.3
                );
                blade.rotation.z = (Math.random() - 0.5) * 0.3;
                
                tuftGroup.add(blade);
            }
            
            // Random position within playable area
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * playableRadius * 0.9;
            
            tuftGroup.position.x = Math.cos(angle) * distance;
            tuftGroup.position.z = Math.sin(angle) * distance;
            tuftGroup.position.y = 0;
            
            this.scene.add(tuftGroup);
        }
        
        // Small bushes
        const bushCount = 30;
        for (let i = 0; i < bushCount; i++) {
            const bushGroup = new THREE.Group();
            
            // Create bush from multiple spheres
            const partCount = 3 + Math.floor(Math.random() * 3);
            for (let j = 0; j < partCount; j++) {
                const size = 0.2 + Math.random() * 0.25;
                const bushGeo = new THREE.SphereGeometry(size, 6, 5);
                const bushMat = new THREE.MeshStandardMaterial({
                    color: 0x2e7d32,
                    roughness: 0.9,
                    flatShading: true
                });
                const bushPart = new THREE.Mesh(bushGeo, bushMat);
                
                bushPart.position.set(
                    (Math.random() - 0.5) * 0.3,
                    size * 0.7,
                    (Math.random() - 0.5) * 0.3
                );
                
                bushPart.castShadow = true;
                bushPart.receiveShadow = true;
                
                bushGroup.add(bushPart);
            }
            
            // Random position
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * playableRadius * 0.85;
            
            bushGroup.position.x = Math.cos(angle) * distance;
            bushGroup.position.z = Math.sin(angle) * distance;
            bushGroup.position.y = 0;
            
            // Random scale
            const scale = 0.7 + Math.random() * 0.6;
            bushGroup.scale.setScalar(scale);
            
            this.scene.add(bushGroup);
        }
        
        // Wildflowers - small colorful dots
        const flowerCount = 50;
        const flowerColors = [0xffeb3b, 0xff9800, 0xe91e63, 0x9c27b0, 0xffffff];
        
        for (let i = 0; i < flowerCount; i++) {
            const flowerGroup = new THREE.Group();
            
            // Flower head
            const flowerGeo = new THREE.SphereGeometry(0.08, 6, 6);
            const flowerMat = new THREE.MeshStandardMaterial({
                color: flowerColors[Math.floor(Math.random() * flowerColors.length)],
                emissive: flowerColors[Math.floor(Math.random() * flowerColors.length)],
                emissiveIntensity: 0.2,
                roughness: 0.7
            });
            const flower = new THREE.Mesh(flowerGeo, flowerMat);
            flower.position.y = 0.25;
            flowerGroup.add(flower);
            
            // Stem
            const stemGeo = new THREE.CylinderGeometry(0.02, 0.02, 0.25, 4);
            const stemMat = new THREE.MeshStandardMaterial({
                color: 0x388e3c,
                roughness: 0.9
            });
            const stem = new THREE.Mesh(stemGeo, stemMat);
            stem.position.y = 0.125;
            flowerGroup.add(stem);
            
            // Random position
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * playableRadius * 0.8;
            
            flowerGroup.position.x = Math.cos(angle) * distance;
            flowerGroup.position.z = Math.sin(angle) * distance;
            flowerGroup.position.y = 0;
            
            // Slight random rotation
            flowerGroup.rotation.y = Math.random() * Math.PI * 2;
            flowerGroup.rotation.z = (Math.random() - 0.5) * 0.2;
            
            this.scene.add(flowerGroup);
        }
        
        // Small pebbles
        const pebbleCount = 80;
        for (let i = 0; i < pebbleCount; i++) {
            const pebbleGeo = new THREE.SphereGeometry(0.08 + Math.random() * 0.1, 5, 4);
            const pebbleMat = new THREE.MeshStandardMaterial({
                color: 0x9e9e9e,
                roughness: 0.95,
                flatShading: true
            });
            const pebble = new THREE.Mesh(pebbleGeo, pebbleMat);
            
            // Random position
            const angle = Math.random() * Math.PI * 2;
            const distance = Math.random() * playableRadius * 0.95;
            
            pebble.position.x = Math.cos(angle) * distance;
            pebble.position.z = Math.sin(angle) * distance;
            pebble.position.y = 0.05;
            
            // Squash vertically for flat pebble look
            pebble.scale.y = 0.4 + Math.random() * 0.3;
            
            pebble.castShadow = true;
            pebble.receiveShadow = true;
            
            this.scene.add(pebble);
        }
    }
    
    createDistantTerrain() {
        // Create gentle rolling hills in the distance for atmosphere
        const hillCount = 20;
        
        for (let i = 0; i < hillCount; i++) {
            const hillSize = 15 + Math.random() * 25;
            const hillHeight = 5 + Math.random() * 10;
            
            const hillGeo = new THREE.SphereGeometry(hillSize, 8, 8);
            const hillMat = new THREE.MeshStandardMaterial({ 
                color: 0x6fa35e,
                roughness: 0.95,
                flatShading: true
            });
            const hill = new THREE.Mesh(hillGeo, hillMat);
            
            // Position hills in a circle around the playable area
            const angle = (i / hillCount) * Math.PI * 2;
            const distance = 80 + Math.random() * 40;
            
            hill.position.x = Math.cos(angle) * distance;
            hill.position.z = Math.sin(angle) * distance;
            hill.position.y = -hillSize * 0.6; // Sink into ground
            
            hill.scale.y = hillHeight / hillSize;
            hill.receiveShadow = true;
            hill.castShadow = false;
            
            this.scene.add(hill);
        }
        
        // Add scattered tree-like shapes far in distance
        const treeCount = 30;
        
        for (let i = 0; i < treeCount; i++) {
            const treeGroup = new THREE.Group();
            
            // Trunk
            const trunkGeo = new THREE.CylinderGeometry(0.3, 0.5, 4, 6);
            const trunkMat = new THREE.MeshStandardMaterial({ 
                color: 0x654321,
                roughness: 0.9
            });
            const trunk = new THREE.Mesh(trunkGeo, trunkMat);
            trunk.position.y = 2;
            treeGroup.add(trunk);
            
            // Foliage
            const foliageGeo = new THREE.SphereGeometry(2, 6, 6);
            const foliageMat = new THREE.MeshStandardMaterial({ 
                color: 0x2d5016,
                roughness: 0.9
            });
            const foliage = new THREE.Mesh(foliageGeo, foliageMat);
            foliage.position.y = 5;
            foliage.scale.y = 1.3;
            treeGroup.add(foliage);
            
            // Random position in distance
            const angle = Math.random() * Math.PI * 2;
            const distance = 60 + Math.random() * 80;
            
            treeGroup.position.x = Math.cos(angle) * distance;
            treeGroup.position.z = Math.sin(angle) * distance;
            treeGroup.position.y = 0;
            
            // Random scale
            const scale = 0.8 + Math.random() * 0.6;
            treeGroup.scale.setScalar(scale);
            
            treeGroup.castShadow = false;
            treeGroup.receiveShadow = false;
            
            this.scene.add(treeGroup);
        }
    }

    worldToGrid(point) {
        const x = Math.floor((point.x + (this.gridSize * this.cellSize) / 2) / this.cellSize);
        const z = Math.floor((point.z + (this.gridSize * this.cellSize) / 2) / this.cellSize);
        return { x, z };
    }

    gridToWorld(x, z, size = 1) {
        const wx = (x * this.cellSize) - (this.gridSize * this.cellSize) / 2 + (size * this.cellSize) / 2;
        const wz = (z * this.cellSize) - (this.gridSize * this.cellSize) / 2 + (size * this.cellSize) / 2;
        return new THREE.Vector3(wx, 0, wz);
    }

    canPlace(x, z, size) {
        if (x < 0 || z < 0 || x + size > this.gridSize || z + size > this.gridSize) return false;
        for (let i = x; i < x + size; i++) {
            for (let j = z; j < z + size; j++) {
                if (this.grid[i][j] !== null) return false;
            }
        }
        return true;
    }

    placeBuilding(building, x, z) {
        const size = building.size;
        for (let i = x; i < x + size; i++) {
            for (let j = z; j < z + size; j++) {
                this.grid[i][j] = building;
            }
        }
        const pos = this.gridToWorld(x, z, size);
        building.position.copy(pos);
        this.buildings.push(building);
        this.scene.add(building);
    }

    removeBuilding(building) {
        const index = this.buildings.indexOf(building);
        if (index > -1) {
            this.buildings.splice(index, 1);
            // Clear from grid
            for (let i = 0; i < this.gridSize; i++) {
                for (let j = 0; j < this.gridSize; j++) {
                    if (this.grid[i][j] === building) this.grid[i][j] = null;
                }
            }
            this.scene.remove(building);
        }
    }

    updatePreview(point, size) {
        const { x, z } = this.worldToGrid(point);
        const isValid = this.canPlace(x, z, size);
        
        this.preview.scale.set(size, size, 1);
        const pos = this.gridToWorld(x, z, size);
        this.preview.position.x = pos.x;
        this.preview.position.z = pos.z;
        this.preview.material.color.setHex(isValid ? CONFIG.COLORS.VALID : CONFIG.COLORS.INVALID);
        this.preview.visible = true;

        return { x, z, isValid };
    }
    
    update(deltaTime) {
        // Update wind animation
        if (this.groundMaterial && this.groundMaterial.uniforms) {
            this.groundMaterial.uniforms.time.value += deltaTime;
        }
    }
}
