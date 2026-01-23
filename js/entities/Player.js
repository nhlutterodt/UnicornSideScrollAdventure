import { Entity } from '../core/Entity.js';
import { AssetPipeline } from '../systems/AssetPipeline.js';
import { CollisionLayers } from '../utils/PhysicsUtils.js';
import { BeamEffect } from '../systems/EffectSystem.js';

/**
 * PLAYER.js
 * The Unicorn! Handles physics and jumping.
 */
export class Player extends Entity {
    constructor(outfit = null) {
        super(80, 0, 50, 50, 'player');
        this.vy = 0;
        this.isGrounded = false;
        this.rotation = 0;

        // Collision Setup
        this.collisionLayer = CollisionLayers.PLAYER;
        this.collisionMask = CollisionLayers.OBSTACLE | CollisionLayers.PLATFORM | CollisionLayers.POWERUP;
        this.collisionPadding = 10;

        // Visual properties from asset pipeline
        this.outfit = outfit || { body: 'pink', mane: 'gold', accessory: 'none', trail: 'rainbow' };
        this.appearance = AssetPipeline.resolveUnicornColors(this.outfit);
        
        this.onGameOver = null; // Callback for Game class

        // Power-up System
        this.abilities = [];
        this.currentAbilityIndex = -1;
    }

    update(dt, context) {
        const { config, logicalHeight, platforms } = context;
        
        // Update Abilities (Time-based constraints)
        this.updateAbilities(dt);
        
        const oldY = this.y;
        
        if (!this.isGrounded) {
            this.vy += config.GRAVITY * dt;
            this.rotation = Math.min(Math.PI / 8, this.vy * 0.002);
        } else {
            this.rotation = 0;
            // Check if we walked off a platform or ground
            const groundY = logicalHeight - config.GROUND_HEIGHT - this.height;
            
            if (this.y < groundY - 5) { // If above ground
                let stillOnPlatform = false;
                if (platforms) {
                    for (const p of platforms) {
                        if (this.x < p.x + p.width && this.x + this.width > p.x && Math.abs(this.y + this.height - p.y) < 5) {
                            stillOnPlatform = true;
                            break;
                        }
                    }
                }
                if (!stillOnPlatform) {
                    this.isGrounded = false;
                }
            }
        }

        this.y += this.vy * dt;

        // Ground check (centralized)
        const currentGroundY = logicalHeight - config.GROUND_HEIGHT - this.height;
        if (this.y >= currentGroundY) {
            this.y = currentGroundY;
            this.vy = 0;
            this.isGrounded = true;
        }
    }

    onCollision(other, particles) {
        if (other.entityType === 'obstacle') {
            if (this.onGameOver) {
                if (particles) particles.play('IMPACT_SPARK', { x: this.x + this.width, y: this.y + this.height / 2 });
                this.onGameOver();
            }
        }

        if (other.entityType === 'platform') {
            // Semi-solid platform logic (only block if falling)
            if (this.vy >= 0 && (this.y + this.height - other.y) < 20) {
                this.y = other.y - this.height;
                this.vy = 0;
                this.isGrounded = true;
            }
        }
    }

    // --- Ability System ---

    addAbility(abilityData) {
        // Check for existing ability of the same type to avoid "foolish" duplication
        const existing = this.abilities.find(a => a.id === abilityData.id);
        
        if (existing) {
            // Refresh time or uses on pickup (Standard game behavior)
            if (abilityData.duration) existing.remainingTime = abilityData.duration;
            if (abilityData.uses) existing.remainingUses = (existing.remainingUses || 0) + abilityData.uses;
            return;
        }

        const ability = {
            ...abilityData,
            remainingTime: abilityData.duration || (abilityData.duration === 0 ? 0 : null),
            remainingUses: abilityData.uses || (abilityData.uses === 0 ? 0 : null),
            cooldownTimer: 0
        };
        
        this.abilities.push(ability);
        
        // Auto-select first ability if none selected
        if (this.currentAbilityIndex === -1) {
            this.currentAbilityIndex = 0;
        }
    }

    updateAbilities(dt) {
        for (let i = this.abilities.length - 1; i >= 0; i--) {
            const ability = this.abilities[i];
            
            // Update cooldowns
            if (ability.cooldownTimer > 0) {
                ability.cooldownTimer -= dt;
            }

            // Time-based depletion
            if (ability.remainingTime !== null) {
                ability.remainingTime -= dt;
                if (ability.remainingTime <= 0) {
                    this.removeAbility(i);
                    continue;
                }
            }
        }
    }

    removeAbility(index) {
        this.abilities.splice(index, 1);
        
        // Adjust index
        if (this.abilities.length === 0) {
            this.currentAbilityIndex = -1;
        } else if (this.currentAbilityIndex >= this.abilities.length) {
            this.currentAbilityIndex = this.abilities.length - 1;
        } else if (this.currentAbilityIndex === index) {
            // If we removed the current one, stay on the same index but wrap if needed
            if (this.currentAbilityIndex >= this.abilities.length) {
                this.currentAbilityIndex = 0;
            }
        }
    }

    cycleAbility(direction) {
        if (this.abilities.length <= 1) return;
        
        this.currentAbilityIndex += direction;
        
        if (this.currentAbilityIndex >= this.abilities.length) {
            this.currentAbilityIndex = 0;
        } else if (this.currentAbilityIndex < 0) {
            this.currentAbilityIndex = this.abilities.length - 1;
        }
    }

    useAbility(effectSystem, context) {
        if (this.currentAbilityIndex === -1) return;
        
        const ability = this.abilities[this.currentAbilityIndex];
        
        // Guard: Check cooldown before execution
        if (ability.cooldownTimer > 0) return;

        // Execute ability logic using the EffectSystem
        if (effectSystem) {
            if (ability.id.startsWith('lasers')) {
                const color = ability.effectConfig?.color || ability.color || '#ff0000';
                effectSystem.trigger('LASER', { color });
                effectSystem.addContinuousEffect(new BeamEffect(this, color, 0.2));
            } else if (ability.id === 'roar') {
                const radius = ability.effectConfig?.radius || 300;
                effectSystem.trigger('ROAR', { 
                    x: this.x + this.width / 2, 
                    y: this.y + this.height / 2,
                    radius: radius,
                    registry: context?.registry
                });
            }
        }
        
        // Mark as used for cooldown tracking
        ability.cooldownTimer = ability.cooldown || 0;

        // Use-based depletion
        if (ability.remainingUses !== null) {
            ability.remainingUses--;
            if (ability.remainingUses <= 0) {
                this.removeAbility(this.currentAbilityIndex);
            }
        }
    }

    get currentAbility() {
        if (this.currentAbilityIndex === -1) return null;
        return this.abilities[this.currentAbilityIndex];
    }

    jump(config, onJump) {
        if (this.isGrounded) {
            this.vy = config.JUMP_FORCE;
            this.isGrounded = false;
            // Pass color info for particles
            const particleColor = this.appearance.trail.colors[0];
            if (onJump) onJump(this.x + 10, this.y + this.height, particleColor);
        }
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
        ctx.rotate(this.rotation);

        // Draw shadow
        ctx.fillStyle = 'rgba(0,0,0,0.1)';
        ctx.beginPath();
        ctx.ellipse(0, 25, 20, 5, 0, 0, Math.PI * 2);
        ctx.fill();

        // Draw Body (simplified unicorn shape)
        ctx.fillStyle = this.appearance.body;
        
        // Main Body
        ctx.beginPath();
        ctx.roundRect(-20, -15, 35, 25, 10);
        ctx.fill();

        // Head/Neck
        ctx.beginPath();
        ctx.moveTo(5, -10);
        ctx.lineTo(15, -30);
        ctx.lineTo(25, -25);
        ctx.lineTo(15, 0);
        ctx.closePath();
        ctx.fill();

        // Mane
        ctx.fillStyle = this.appearance.mane;
        ctx.beginPath();
        ctx.arc(8, -25, 6, 0, Math.PI * 2);
        ctx.fill();
        ctx.beginPath();
        ctx.arc(4, -15, 5, 0, Math.PI * 2);
        ctx.fill();

        // Tail
        ctx.beginPath();
        ctx.arc(-22, 0, 8, 0, Math.PI * 2);
        ctx.fill();

        // Horn
        ctx.fillStyle = '#ffd700'; // Gold horn
        ctx.beginPath();
        ctx.moveTo(18, -30);
        ctx.lineTo(25, -45);
        ctx.lineTo(22, -28);
        ctx.fill();

        // Eye
        ctx.fillStyle = '#333';
        ctx.beginPath();
        ctx.arc(20, -25, 2, 0, Math.PI * 2);
        ctx.fill();

        // Accessory
        if (this.appearance.accessory) {
            ctx.font = '20px serif';
            ctx.fillText(this.appearance.accessory, 15, -40);
        }

        ctx.restore();
    }
}
