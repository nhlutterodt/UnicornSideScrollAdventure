'use strict';

import { Hazard } from './Hazard.js';

export class LavaGeyser extends Hazard {
    constructor(x, y) {
        super(x, y, 50, 80, 'lava_geyser');
        this.animTimer = 0;
    }
    
    update(dt, context) {
        super.update(dt, context);
        this.animTimer += dt * 5;
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        
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
    constructor(x, y) {
        // Skinny, tall
        super(x, y, 30, 90, 'ice_spike');
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        
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
    constructor(x, y) {
        super(x, y, 20, 100, 'neon_barrier');
    }

    draw(ctx) {
        ctx.save();
        ctx.translate(this.x, this.y);
        
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
