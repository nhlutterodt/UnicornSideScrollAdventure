'use strict';

import { Hazard } from './Hazard.js';

export class LavaGeyser extends Hazard {
    static poolable = true;

    constructor(x, y, width, height, yOffset = 0) {
        super(x, y, width || 50, height || 80, 'lava_geyser', yOffset);
        this.animTimer = 0;
    }

    revive(x, y, width, height, yOffset = 0) {
        const finalW = width || 50;
        const finalH = height || 80;
        this.reviveBase(x, y, finalW, finalH);
        this._configureHazard(yOffset);
        this.animTimer = 0;
    }

    update(dt, context) {
        super.update(dt, context);
        this.animTimer += dt * 5;
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
        if (this.rotation) ctx.rotate(this.rotation);
        ctx.translate(-this.width / 2, -this.height / 2);
        
        // Base volcano
        ctx.fillStyle = '#4b2e2e';
        ctx.beginPath();
        ctx.moveTo(0, 80);
        ctx.lineTo(25, 40);
        ctx.lineTo(50, 80);
        ctx.fill();

        // Pulsing Lava
        const pulse = Math.abs(Math.sin(this.animTimer)) * 20;
        ctx.fillStyle = '#ff5722';
        ctx.beginPath();
        ctx.ellipse(25, 40, 15, 20 + pulse, 0, 0, Math.PI * 2);
        ctx.fill();
        
        ctx.restore();
    }
}

export class IceSpike extends Hazard {
    static poolable = true;

    constructor(x, y, width, height, yOffset = 0) {
        // Skinny, tall
        super(x, y, width || 30, height || 90, 'ice_spike', yOffset);
    }

    revive(x, y, width, height, yOffset = 0) {
        const finalW = width || 30;
        const finalH = height || 90;
        this.reviveBase(x, y, finalW, finalH);
        this._configureHazard(yOffset);
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
        if (this.rotation) ctx.rotate(this.rotation);
        ctx.translate(-this.width / 2, -this.height / 2);
        
        ctx.fillStyle = '#82ccdd';
        ctx.beginPath();
        ctx.moveTo(15, 0); // Tip
        ctx.lineTo(30, 90);
        ctx.lineTo(0, 90);
        ctx.fill();
        
        // Shine/accent
        ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
        ctx.beginPath();
        ctx.moveTo(15, 10);
        ctx.lineTo(20, 90);
        ctx.lineTo(15, 90);
        ctx.fill();
        
        ctx.restore();
    }
}

export class NeonBarrier extends Hazard {
    static poolable = true;

    constructor(x, y, width, height, yOffset = 0) {
        super(x, y, width || 20, height || 100, 'neon_barrier', yOffset);
    }

    revive(x, y, width, height, yOffset = 0) {
        const finalW = width || 20;
        const finalH = height || 100;
        this.reviveBase(x, y, finalW, finalH);
        this._configureHazard(yOffset);
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x + this.width / 2, this.y + this.height / 2);
        if (this.rotation) ctx.rotate(this.rotation);
        ctx.translate(-this.width / 2, -this.height / 2);
        
        // Cyber block
        ctx.fillStyle = '#1e272e';
        ctx.fillRect(0, 0, 20, 100);
        
        // Neon glow strip
        ctx.strokeStyle = '#00d2d3';
        ctx.lineWidth = 4;
        ctx.shadowBlur = 10;
        ctx.shadowColor = '#00d2d3';
        ctx.beginPath();
        ctx.moveTo(10, 5);
        ctx.lineTo(10, 95);
        ctx.stroke();
        
        ctx.restore();
    }
}
