

import * as THREE from 'three';

export class Projectile extends THREE.Group {
    constructor(start, target, type = 'stone') {
        super();
        
        this.target = target;
        this.speed = 15;
        this.active = true;
        
        // Create projectile visual based on type
        if (type === 'stone') {
            // Stone for rabbits and bears
            const geometry = new THREE.SphereGeometry(0.15, 8, 8);
            const material = new THREE.MeshStandardMaterial({ 
                color: 0x808080,
                roughness: 0.9 
            });
            this.mesh = new THREE.Mesh(geometry, material);
        } else if (type === 'arrow') {
            // Arrow for penguins and towers
            const geometry = new THREE.ConeGeometry(0.1, 0.5, 8);
            const material = new THREE.MeshStandardMaterial({ 
                color: 0x8B4513,
                roughness: 0.7 
            });
            this.mesh = new THREE.Mesh(geometry, material);
            this.mesh.rotation.x = Math.PI / 2;
        }
        
        this.mesh.castShadow = true;
        this.add(this.mesh);
        
        // Position at start
        this.position.copy(start);
        this.position.y += 1; // Launch from above ground
        
        // Calculate direction
        this.direction = new THREE.Vector3()
            .subVectors(target.position, start)
            .normalize();
        
        // Point projectile toward target (for arrows)
        if (type === 'arrow') {
            const angle = Math.atan2(this.direction.x, this.direction.z);
            this.mesh.rotation.y = -angle;
        }
    }
    
    update(deltaTime) {
        if (!this.active) return false;
        
        // Move toward target
        const movement = this.direction.clone().multiplyScalar(this.speed * deltaTime);
        this.position.add(movement);
        
        // Check if reached target
        const targetPos = this.target.position.clone();
        targetPos.y = this.position.y; // Compare at same height
        const distance = this.position.distanceTo(targetPos);
        
        if (distance < 0.5) {
            this.active = false;
            return true; // Hit!
        }
        
        // Check if target is destroyed
        if (this.target.hp <= 0) {
            this.active = false;
            return false;
        }
        
        return false;
    }
}

