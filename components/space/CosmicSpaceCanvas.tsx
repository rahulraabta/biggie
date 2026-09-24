'use client';

import React, { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  radius: number;
  color: string;
  alpha: number;
  vx: number;
  vy: number;
  pulseSpeed: number;
  phase: number;
}

export const CosmicSpaceCanvas: React.FC = () => {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let width = (canvas.width = window.innerWidth);
    let height = (canvas.height = window.innerHeight);

    let mouseX = width / 2;
    let mouseY = height / 2;

    const handleMouseMove = (e: MouseEvent) => {
      mouseX = e.clientX;
      mouseY = e.clientY;
    };

    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = window.innerWidth;
      height = canvas.height = window.innerHeight;
    };

    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('resize', handleResize);

    // Color Palette: Cinematic Emerald / Solar Gold (tuned for deep-space dark ground)
    const particleColors = [
      '#34d399', // Mint Emerald
      '#10b981', // Signal Emerald
      '#6ee7b7', // Pale Mint
      '#fbbf24', // Solar Gold
      '#2dd4bf', // Teal Flare
    ];

    const particlesCount = 110;
    const particles: Particle[] = [];

    for (let i = 0; i < particlesCount; i++) {
      particles.push({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: Math.random() * 2 + 1,
        color: particleColors[Math.floor(Math.random() * particleColors.length)],
        alpha: Math.random() * 0.5 + 0.25,
        vx: (Math.random() - 0.5) * 0.3,
        vy: (Math.random() - 0.5) * 0.3,
        pulseSpeed: Math.random() * 0.02 + 0.008,
        phase: Math.random() * Math.PI * 2,
      });
    }

    let time = 0;
    const render = () => {
      time += 0.01;
      ctx.clearRect(0, 0, width, height);

      // Cinematic Emerald & Solar Ambient Nebulae (deep-space tonality)
      const grad1 = ctx.createRadialGradient(
        width * 0.2,
        height * 0.25,
        40,
        width * 0.2,
        height * 0.25,
        width * 0.45
      );
      grad1.addColorStop(0, 'rgba(16, 185, 129, 0.08)'); // Emerald Nebula Glow
      grad1.addColorStop(1, 'transparent');
      ctx.fillStyle = grad1;
      ctx.fillRect(0, 0, width, height);

      const grad2 = ctx.createRadialGradient(
        width * 0.8,
        height * 0.75,
        50,
        width * 0.8,
        height * 0.75,
        width * 0.5
      );
      grad2.addColorStop(0, 'rgba(245, 158, 11, 0.06)'); // Solar Amber Flare
      grad2.addColorStop(1, 'transparent');
      ctx.fillStyle = grad2;
      ctx.fillRect(0, 0, width, height);

      // Render Connection Lines
      ctx.lineWidth = 0.5;
      for (let i = 0; i < particles.length; i++) {
        for (let j = i + 1; j < particles.length; j++) {
          const dx = particles[i].x - particles[j].x;
          const dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 100) {
            const lineAlpha = (1 - dist / 100) * 0.18 * particles[i].alpha;
            ctx.strokeStyle = `rgba(52, 211, 153, ${lineAlpha})`;
            ctx.beginPath();
            ctx.moveTo(particles[i].x, particles[i].y);
            ctx.lineTo(particles[j].x, particles[j].y);
            ctx.stroke();
          }
        }
      }

      // Render Particles & Interactive Mouse Gravitational Attraction
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;

        if (p.x < 0) p.x = width;
        if (p.x > width) p.x = 0;
        if (p.y < 0) p.y = height;
        if (p.y > height) p.y = 0;

        const dx = mouseX - p.x;
        const dy = mouseY - p.y;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < 160) {
          const force = (160 - dist) / 160;
          p.x += (dx / dist) * force * 0.5;
          p.y += (dy / dist) * force * 0.5;
        }

        p.phase += p.pulseSpeed;
        const currentAlpha = Math.max(0.15, Math.min(0.85, p.alpha + Math.sin(p.phase) * 0.25));

        // Glow halo: larger, soft translucent disc behind the core
        ctx.fillStyle = p.color;
        ctx.globalAlpha = currentAlpha * 0.25;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius * 3, 0, Math.PI * 2);
        ctx.fill();

        // Bright core
        ctx.globalAlpha = currentAlpha;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.radius, 0, Math.PI * 2);
        ctx.fill();
      });

      ctx.globalAlpha = 1;
      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('resize', handleResize);
      cancelAnimationFrame(animationFrameId);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none z-0 opacity-70 transition-opacity duration-1000"
      aria-hidden="true"
    />
  );
};
