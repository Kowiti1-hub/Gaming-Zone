
import React, { useRef, useEffect, useState } from 'react';
import { GameState, TerrainType, RoadType, WeatherType, IndicatorType, GearType } from '../types';
import { CANVAS_WIDTH, CANVAS_HEIGHT, TRAFFIC_LIGHT_DISTANCE, TRAFFIC_LIGHT_CYCLE } from '../constants';

// Helper functions moved outside component for performance and cleaner scope
const seed = (s: number) => Math.abs(Math.sin(s) * 10000);

const drawTrafficLight = (ctx: CanvasRenderingContext2D, x: number, y: number, z: number, lightIdx: number) => {
  const scale = z * 2.5;
  const cycleTime = (Date.now() + lightIdx * 5000) % TRAFFIC_LIGHT_CYCLE;
  
  let activeBulb = 2; // 0: Red, 1: Yellow, 2: Green
  if (cycleTime < 6000) activeBulb = 0;
  else if (cycleTime < 8000) activeBulb = 1;

  ctx.save();
  ctx.fillStyle = '#2d3748';
  ctx.fillRect(x - 2 * scale, y - 90 * scale, 4 * scale, 90 * scale);
  ctx.fillStyle = '#0f172a';
  ctx.fillRect(x - 8 * scale, y - 95 * scale, 16 * scale, 40 * scale);
  
  const drawBulb = (bulbIdx: number, color: string, isActive: boolean) => {
    const bulbY = y - 95 * scale + (bulbIdx * 11 * scale) + 9 * scale;
    ctx.fillStyle = isActive ? color : '#000';
    if (isActive) {
      ctx.shadowBlur = 20 * scale;
      ctx.shadowColor = color;
    }
    ctx.beginPath();
    ctx.arc(x, bulbY, 4 * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.shadowBlur = 0;
  };

  drawBulb(0, '#ef4444', activeBulb === 0);
  drawBulb(1, '#f59e0b', activeBulb === 1);
  drawBulb(2, '#10b981', activeBulb === 2);
  ctx.restore();
};

const drawPassengers = (ctx: CanvasRenderingContext2D, x: number, y: number, z: number, isFull: boolean) => {
  const scale = z * 2.5;
  for (let i = 0; i < 3; i++) {
    const px = x + (i * 12 * scale);
    const py = y - (2 * scale);
    ctx.fillStyle = isFull ? '#4a5568' : '#ed8936';
    ctx.beginPath(); ctx.arc(px, py - 18 * scale, 5 * scale, 0, Math.PI * 2); ctx.fill();
    ctx.fillRect(px - 4 * scale, py - 15 * scale, 8 * scale, 15 * scale);
  }
};

const draw3DProp = (ctx: CanvasRenderingContext2D, x: number, y: number, z: number, terrain: TerrainType, s: number, weather: WeatherType) => {
  const scale = z * 2.5;
  ctx.save();
  if (weather === WeatherType.FOG) ctx.globalAlpha = Math.max(0, z * 2 - 0.5);

  if (terrain === TerrainType.CITY) {
    const type = Math.floor(s) % 16;
    
    if (type < 3) {
      const colors = ['#2d3748', '#1a202c', '#4a5568'];
      const h = (140 + (s % 400)) * scale;
      const w = (70 + (s % 100)) * scale;
      ctx.fillStyle = colors[type];
      ctx.fillRect(x - w/2, y - h, w, h);
      ctx.fillStyle = '#f6e05e';
      const oldAlpha = ctx.globalAlpha;
      for (let row = 0; row < 6; row++) {
        for (let col = 0; col < 3; col++) {
          if ((s + row * 10 + col) % 5 > 2) {
             ctx.globalAlpha = oldAlpha * 0.4;
             ctx.fillRect(x - w/3 + (col * w/4), y - h + (row * h/8) + 12*scale, w/8, h/12);
          }
        }
      }
      ctx.globalAlpha = oldAlpha;
    } 
    else if (type === 3) {
      const h = 100 * scale;
      ctx.fillStyle = '#2d3748';
      ctx.fillRect(x - 3 * scale, y - h, 6 * scale, h);
      ctx.fillRect(x - 3 * scale, y - h, 25 * scale, 4 * scale);
      const bulbX = x + 22 * scale;
      const bulbY = y - h + 2 * scale;
      const lampGlow = ctx.createRadialGradient(bulbX, bulbY, 0, bulbX, bulbY, 30 * scale);
      lampGlow.addColorStop(0, 'rgba(254, 252, 191, 0.4)');
      lampGlow.addColorStop(1, 'rgba(254, 252, 191, 0)');
      ctx.fillStyle = lampGlow;
      ctx.beginPath(); ctx.arc(bulbX, bulbY, 30 * scale, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#fff9c4';
      ctx.beginPath(); ctx.arc(bulbX, bulbY, 5 * scale, 0, Math.PI * 2); ctx.fill();
    } 
    else if (type === 4) {
      const h = 70 * scale;
      ctx.fillStyle = '#718096';
      ctx.fillRect(x - 2 * scale, y - h, 4 * scale, h);
      const signRadius = 14 * scale;
      const signY = y - h - signRadius;
      const signType = Math.floor(s) % 4;
      if (signType === 0) {
        ctx.fillStyle = '#fff'; ctx.strokeStyle = '#e53e3e'; ctx.lineWidth = 3 * scale;
        ctx.beginPath(); ctx.arc(x, signY, signRadius, 0, Math.PI * 2); ctx.fill(); ctx.stroke();
        ctx.fillStyle = '#000'; ctx.font = `bold ${Math.round(11 * scale)}px sans-serif`; ctx.textAlign = 'center';
        ctx.fillText("60", x, signY + 4 * scale);
      } else if (signType === 1) {
        ctx.fillStyle = '#e53e3e'; ctx.beginPath();
        for(let a=0; a<8; a++) {
          const angle = (a * Math.PI) / 4 + Math.PI/8;
          const px = x + Math.cos(angle) * signRadius;
          const py = signY + Math.sin(angle) * signRadius;
          if(a===0) ctx.moveTo(px, py); else ctx.lineTo(px, py);
        }
        ctx.closePath(); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.font = `bold ${Math.round(6 * scale)}px sans-serif`; ctx.textAlign = 'center';
        ctx.fillText("STOP", x, signY + 3 * scale);
      } else if (signType === 2) {
        ctx.fillStyle = '#e53e3e'; ctx.beginPath(); ctx.arc(x, signY, signRadius, 0, Math.PI * 2); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.fillRect(x - signRadius + 4*scale, signY - 2*scale, signRadius*2 - 8*scale, 4*scale);
      } else {
        ctx.fillStyle = '#3182ce'; ctx.fillRect(x - signRadius, signY - signRadius, signRadius*2, signRadius*2);
        ctx.fillStyle = '#fff'; ctx.beginPath();
        ctx.moveTo(x - signRadius + 4*scale, signY); ctx.lineTo(x + signRadius - 4*scale, signY);
        ctx.lineTo(x + signRadius - 8*scale, signY - 4*scale); ctx.moveTo(x + signRadius - 4*scale, signY);
        ctx.lineTo(x + signRadius - 8*scale, signY + 4*scale); ctx.stroke();
      }
    } 
    else if (type === 5) {
      const sw = 60 * scale;
      const sh = 45 * scale;
      ctx.fillStyle = '#2d3748';
      ctx.fillRect(x - sw/2, y - sh, sw, 3 * scale);
      ctx.fillRect(x - sw/2, y - sh, 4 * scale, sh);
      ctx.fillRect(x + sw/2 - 4 * scale, y - sh, 4 * scale, sh);
      ctx.fillStyle = 'rgba(144, 205, 244, 0.3)';
      ctx.fillRect(x - sw/2 + 4 * scale, y - sh + 3 * scale, sw - 8 * scale, sh - 3 * scale);
      ctx.fillStyle = '#fff';
      ctx.fillRect(x - sw/2 + 6 * scale, y - sh + 8 * scale, 12 * scale, 20 * scale);
      ctx.fillStyle = '#3182ce';
      ctx.fillRect(x - sw/2 + 8 * scale, y - sh + 10 * scale, 8 * scale, 2 * scale);
      ctx.fillStyle = '#744210';
      ctx.fillRect(x - sw/2.5, y - 12 * scale, sw / 1.25, 3 * scale);
    } 
    else if (type === 6) {
      const tw = 12 * scale;
      const th = 18 * scale;
      ctx.fillStyle = '#4a5568';
      ctx.beginPath(); ctx.roundRect(x - tw/2, y - th, tw, th, 2*scale); ctx.fill();
      ctx.fillStyle = '#1a202c';
      ctx.fillRect(x - tw/2 + 2*scale, y - th + 2*scale, tw - 4*scale, 2*scale);
    } 
    else if (type === 7) {
      const hw = 8 * scale;
      const hh = 15 * scale;
      ctx.fillStyle = '#e53e3e';
      ctx.fillRect(x - hw/2, y - hh, hw, hh);
      ctx.beginPath(); ctx.arc(x, y - hh, hw/2, 0, Math.PI * 2); ctx.fill();
      ctx.fillStyle = '#c53030';
      ctx.fillRect(x - hw/2 - 2*scale, y - hh + 4*scale, 2*scale, 3*scale);
      ctx.fillRect(x + hw/2, y - hh + 4*scale, 2*scale, 3*scale);
    } 
    else if (type === 8) {
      const bw = 100 * scale;
      const bh = 50 * scale;
      const bY = y - 90 * scale;
      ctx.fillStyle = '#4a5568';
      ctx.fillRect(x - bw/3, y - 90*scale, 5 * scale, 90 * scale);
      ctx.fillRect(x + bw/3 - 5*scale, y - 90*scale, 5 * scale, 90 * scale);
      ctx.fillStyle = '#2d3748';
      ctx.fillRect(x - bw/2, bY - bh, bw, bh);
      const adColors = ['#f6ad55', '#4fd1c5', '#63b3ed'];
      ctx.fillStyle = adColors[Math.floor(s) % 3];
      ctx.fillRect(x - bw/2 + 5*scale, bY - bh + 5*scale, bw - 10*scale, bh - 10*scale);
      ctx.fillStyle = '#fff';
      ctx.font = `bold ${Math.round(12 * scale)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText("EXPRESS", x, bY - bh/2 + 5*scale);
    } 
    else if (type === 9) {
      const pw = 30 * scale;
      const ph = 10 * scale;
      ctx.fillStyle = '#a0aec0';
      ctx.fillRect(x - pw/2, y - ph, pw, ph);
      ctx.fillStyle = '#2f855a';
      ctx.beginPath();
      ctx.arc(x - pw/4, y - ph - 2*scale, 6*scale, 0, Math.PI*2);
      ctx.arc(x + pw/4, y - ph - 2*scale, 6*scale, 0, Math.PI*2);
      ctx.arc(x, y - ph - 4*scale, 8*scale, 0, Math.PI*2);
      ctx.fill();
    }
    else if (type === 10) {
      const mw = 14 * scale;
      const mh = 22 * scale;
      const isRed = (s % 10) > 7;
      ctx.fillStyle = isRed ? '#e53e3e' : '#3182ce';
      ctx.beginPath(); ctx.roundRect(x - mw/2, y - mh, mw, mh, 2*scale); ctx.fill();
      ctx.fillStyle = '#000';
      ctx.fillRect(x - mw/2 + 2*scale, y - mh + 4*scale, mw - 4*scale, 1.5*scale);
      ctx.fillStyle = 'rgba(255,255,255,0.2)';
      ctx.fillRect(x - mw/2 + 3*scale, y - mh + 8*scale, mw - 6*scale, 8*scale);
    }
    else if (type === 11) {
      const bw = 6 * scale;
      const bh = 14 * scale;
      ctx.fillStyle = '#4a5568';
      ctx.fillRect(x - bw/2, y - bh, bw, bh);
      ctx.fillStyle = '#f6e05e'; 
      ctx.fillRect(x - bw/2, y - bh + 2*scale, bw, 2*scale);
      ctx.fillStyle = '#1a202c';
      ctx.beginPath(); ctx.arc(x, y - bh, bw/2, 0, Math.PI * 2); ctx.fill(); 
    }
    else if (type === 12) {
      const nw = 16 * scale;
      const nh = 25 * scale;
      ctx.fillStyle = '#2d3748';
      ctx.fillRect(x - nw/2, y - nh, nw, nh);
      ctx.fillStyle = '#fff';
      ctx.fillRect(x - nw/2 + 2*scale, y - nh + 2*scale, nw - 4*scale, nh - 10*scale);
      ctx.fillStyle = '#000';
      ctx.font = `bold ${Math.round(4 * scale)}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText("NEWS", x, y - nh + 8*scale);
    }
    else if (type === 13) {
      const rw = 40 * scale;
      const rh = 18 * scale;
      ctx.strokeStyle = '#cbd5e0';
      ctx.lineWidth = 2.5 * scale;
      for (let i = 0; i < 4; i++) {
        const ox = x - rw/2 + (i * rw/3);
        ctx.beginPath(); ctx.moveTo(ox, y);
        ctx.quadraticCurveTo(ox, y - rh*1.5, ox + 4*scale, y - rh*1.5);
        ctx.lineTo(ox + 4*scale, y);
        ctx.stroke();
      }
    }
    else {
      const bw = 45 * scale;
      const bh = 15 * scale;
      ctx.fillStyle = '#2d3748';
      ctx.fillRect(x - bw/2.5, y - bh, 3 * scale, bh);
      ctx.fillRect(x + bw/2.5 - 3 * scale, y - bh, 3 * scale, bh);
      ctx.fillStyle = (type === 14) ? '#744210' : '#2d3748';
      ctx.fillRect(x - bw/2, y - bh, bw, 4 * scale);
      ctx.fillRect(x - bw/2, y - bh - 12 * scale, bw, 5 * scale);
    }
  } else {
    const type = Math.floor(s) % 10;
    if (type === 0 || type === 1) {
      ctx.fillStyle = '#4a2c10'; 
      ctx.fillRect(x - 3*scale, y - 25*scale, 6*scale, 25*scale);
      ctx.fillStyle = '#22543d'; 
      ctx.beginPath(); ctx.arc(x, y - 45*scale, 30*scale, 0, Math.PI*2); ctx.fill();
    } else if (type === 2) {
      ctx.fillStyle = '#8b4513'; 
      ctx.fillRect(x - 22*scale, y - 32*scale, 44*scale, 32*scale);
      ctx.fillStyle = '#3e2723';
      ctx.fillRect(x - 6*scale, y - 20*scale, 12*scale, 20*scale);
      ctx.fillStyle = '#d69e2e'; 
      ctx.beginPath(); ctx.moveTo(x - 28*scale, y - 32*scale); ctx.lineTo(x, y - 60*scale); ctx.lineTo(x + 28*scale, y - 32*scale); ctx.fill();
    } else if (type === 3) {
      ctx.fillStyle = '#4a5568'; 
      ctx.fillRect(x - 20*scale, y - 35*scale, 40*scale, 35*scale);
      ctx.fillStyle = '#718096'; 
      ctx.beginPath(); ctx.moveTo(x - 22*scale, y - 35*scale); ctx.lineTo(x + 22*scale, y - 42*scale); ctx.lineTo(x + 22*scale, y - 35*scale); ctx.fill();
    } else if (type === 4) {
       ctx.fillStyle = '#9b2c2c'; 
       ctx.fillRect(x - 25*scale, y - 50*scale, 50*scale, 50*scale);
       ctx.strokeStyle = '#fff'; ctx.lineWidth = 1 * scale;
       ctx.strokeRect(x - 15*scale, y - 35*scale, 30*scale, 35*scale);
       ctx.beginPath(); ctx.moveTo(x - 15*scale, y - 35*scale); ctx.lineTo(x + 15*scale, y); ctx.stroke();
       ctx.beginPath(); ctx.moveTo(x + 15*scale, y - 35*scale); ctx.lineTo(x - 15*scale, y); ctx.stroke();
       ctx.fillStyle = '#742a2a';
       ctx.beginPath(); ctx.moveTo(x - 28*scale, y - 50*scale); ctx.lineTo(x, y - 75*scale); ctx.lineTo(x + 28*scale, y - 50*scale); ctx.fill();
    } else if (type === 5) {
      const fw = 60 * scale;
      const fh = 20 * scale;
      ctx.fillStyle = '#5d4037';
      ctx.fillRect(x - fw/2, y - fh, 3*scale, fh);
      ctx.fillRect(x, y - fh, 3*scale, fh);
      ctx.fillRect(x + fw/2 - 3*scale, y - fh, 3*scale, fh);
      ctx.fillRect(x - fw/2, y - fh + 5*scale, fw, 2*scale);
      ctx.fillRect(x - fw/2, y - 5*scale, fw, 2*scale);
    } else if (type === 6) {
      const bw = 15 * scale;
      const bh = 12 * scale;
      ctx.fillStyle = '#f6e05e';
      ctx.beginPath(); ctx.ellipse(x, y - bh/2, bw, bh, 0, 0, Math.PI*2); ctx.fill();
      ctx.strokeStyle = '#d69e2e'; ctx.lineWidth = 0.5 * scale;
      ctx.beginPath(); ctx.ellipse(x, y - bh/2, bw*0.7, bh*0.7, 0, 0, Math.PI*2); ctx.stroke();
      ctx.beginPath(); ctx.ellipse(x + 10*scale, y - bh/2, bw, bh, 0, 0, Math.PI*2); ctx.fill();
    } else if (type === 7) {
      const tw = 25 * scale;
      const th = 20 * scale;
      ctx.fillStyle = '#1a202c';
      ctx.beginPath(); ctx.arc(x - 8*scale, y - 10*scale, 10*scale, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(x + 12*scale, y - 5*scale, 5*scale, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#e53e3e';
      ctx.fillRect(x - 5*scale, y - 25*scale, 25*scale, 15*scale);
      ctx.fillRect(x - 10*scale, y - 18*scale, 10*scale, 10*scale);
      ctx.fillStyle = '#2d3748';
      ctx.fillRect(x + 12*scale, y - 35*scale, 2*scale, 10*scale);
    } else if (type === 8) {
      const cw = 30 * scale;
      const ch = 12 * scale;
      ctx.fillStyle = '#4a5568';
      ctx.beginPath(); ctx.arc(x - 10*scale, y - 5*scale, 5*scale, 0, Math.PI*2); ctx.fill();
      ctx.beginPath(); ctx.arc(x + 10*scale, y - 5*scale, 5*scale, 0, Math.PI*2); ctx.fill();
      ctx.fillStyle = '#795548';
      ctx.fillRect(x - 15*scale, y - 18*scale, cw, ch);
      ctx.fillRect(x + 15*scale, y - 12*scale, 15*scale, 2*scale);
    } else {
      const tw = 40 * scale;
      const th = 10 * scale;
      ctx.fillStyle = '#a0aec0';
      ctx.fillRect(x - tw/2, y - th, tw, th);
      ctx.fillStyle = '#4299e1';
      ctx.fillRect(x - tw/2 + 2*scale, y - th + 2*scale, tw - 4*scale, th - 4*scale);
      ctx.fillStyle = 'rgba(255,255,255,0.3)';
      ctx.fillRect(x - tw/2 + 5*scale, y - th + 3*scale, 10*scale, 2*scale);
    }
  }
  ctx.restore();
};

const SHIFTER_X = CANVAS_WIDTH - 150;
const SHIFTER_Y = CANVAS_HEIGHT - 60;
const SHIFTER_RADIUS = 50;

const HANDBRAKE_X = 120;
const HANDBRAKE_Y = CANVAS_HEIGHT - 50;

const GEAR_POSITIONS: Record<GearType, {dx: number, dy: number}> = {
  [GearType.PARK]: { dx: -18, dy: -28 },
  [GearType.REVERSE]: { dx: -18, dy: 18 },
  [GearType.NEUTRAL]: { dx: 18, dy: -28 },
  [GearType.DRIVE]: { dx: 18, dy: 18 }
};

const drawBusInterior = (ctx: CanvasRenderingContext2D, state: GameState, isDraggingShifter: boolean, dragOffset: { x: number, y: number }) => {
  ctx.save();
  
  const dashHeight = 120;
  ctx.fillStyle = '#1a202c';
  ctx.beginPath();
  ctx.moveTo(0, CANVAS_HEIGHT);
  ctx.lineTo(CANVAS_WIDTH, CANVAS_HEIGHT);
  ctx.lineTo(CANVAS_WIDTH, CANVAS_HEIGHT - dashHeight);
  ctx.quadraticCurveTo(CANVAS_WIDTH / 2, CANVAS_HEIGHT - dashHeight - 40, 0, CANVAS_HEIGHT - dashHeight);
  ctx.closePath();
  ctx.fill();
  
  const grad = ctx.createLinearGradient(0, CANVAS_HEIGHT - 100, 0, CANVAS_HEIGHT);
  grad.addColorStop(0, 'rgba(255,255,255,0.05)');
  grad.addColorStop(1, 'rgba(0,0,0,0.4)');
  ctx.fillStyle = grad;
  ctx.fill();

  // --- Gear Shifter Assembly ---
  // Base plate
  ctx.fillStyle = '#2d3748';
  ctx.beginPath(); ctx.ellipse(SHIFTER_X, SHIFTER_Y, SHIFTER_RADIUS, 35, 0, 0, Math.PI * 2); ctx.fill();
  ctx.strokeStyle = '#4a5568'; ctx.lineWidth = 3; ctx.stroke();
  
  // Chrome ring
  ctx.strokeStyle = '#cbd5e0'; ctx.lineWidth = 1;
  ctx.beginPath(); ctx.ellipse(SHIFTER_X, SHIFTER_Y, SHIFTER_RADIUS - 5, 30, 0, 0, Math.PI * 2); ctx.stroke();

  // Gates Visuals
  ctx.strokeStyle = 'rgba(0,0,0,0.3)';
  ctx.lineWidth = 8;
  ctx.lineCap = 'round';
  ctx.beginPath();
  // Left slot
  ctx.moveTo(SHIFTER_X - 18, SHIFTER_Y - 28); ctx.lineTo(SHIFTER_X - 18, SHIFTER_Y + 18);
  // Right slot
  ctx.moveTo(SHIFTER_X + 18, SHIFTER_Y - 28); ctx.lineTo(SHIFTER_X + 18, SHIFTER_Y + 18);
  // Cross slot
  ctx.moveTo(SHIFTER_X - 18, SHIFTER_Y); ctx.lineTo(SHIFTER_X + 18, SHIFTER_Y);
  ctx.stroke();

  // Labels
  ctx.fillStyle = '#718096'; ctx.font = 'bold 12px sans-serif'; ctx.textAlign = 'center';
  ctx.fillText("P", SHIFTER_X - 35, SHIFTER_Y - 25);
  ctx.fillText("R", SHIFTER_X - 35, SHIFTER_Y + 25);
  ctx.fillText("N", SHIFTER_X + 35, SHIFTER_Y - 25);
  ctx.fillText("D", SHIFTER_X + 35, SHIFTER_Y + 25);

  // Lever Position
  const snappedPos = GEAR_POSITIONS[state.gear];
  const leverX = isDraggingShifter ? dragOffset.x : snappedPos.dx;
  const leverY = isDraggingShifter ? dragOffset.y : snappedPos.dy;

  // Lever Shadow
  ctx.fillStyle = 'rgba(0,0,0,0.5)';
  ctx.beginPath(); ctx.arc(SHIFTER_X + leverX + 5, SHIFTER_Y + leverY + 5, 12, 0, Math.PI * 2); ctx.fill();

  // Lever Stem
  ctx.strokeStyle = '#718096'; ctx.lineWidth = 10; ctx.lineCap = 'round';
  ctx.beginPath(); ctx.moveTo(SHIFTER_X, SHIFTER_Y); ctx.lineTo(SHIFTER_X + leverX, SHIFTER_Y + leverY); ctx.stroke();
  
  // Knob
  const knobGrad = ctx.createRadialGradient(SHIFTER_X + leverX - 4, SHIFTER_Y + leverY - 4, 0, SHIFTER_X + leverX, SHIFTER_Y + leverY, 15);
  knobGrad.addColorStop(0, '#4a5568');
  knobGrad.addColorStop(1, '#1a202c');
  ctx.fillStyle = knobGrad;
  ctx.beginPath(); ctx.arc(SHIFTER_X + leverX, SHIFTER_Y + leverY, 15, 0, Math.PI * 2); ctx.fill();
  
  // Highlight on knob
  ctx.fillStyle = 'rgba(255,255,255,0.1)';
  ctx.beginPath(); ctx.arc(SHIFTER_X + leverX - 5, SHIFTER_Y + leverY - 5, 5, 0, Math.PI * 2); ctx.fill();

  // Current Gear indicator on knob
  if (!isDraggingShifter) {
    ctx.fillStyle = '#90cdf4'; ctx.font = 'bold 11px monospace'; ctx.textAlign = 'center';
    ctx.fillText(state.gear, SHIFTER_X + leverX, SHIFTER_Y + leverY + 4);
  }

  // --- Handbrake Lever ---
  const brakeAngle = state.handbrakeActive ? -Math.PI / 4 : 0;
  ctx.save();
  ctx.translate(HANDBRAKE_X, HANDBRAKE_Y);
  ctx.rotate(brakeAngle);
  ctx.fillStyle = '#2d3748';
  ctx.fillRect(-6, -40, 12, 45);
  ctx.fillStyle = '#000';
  ctx.fillRect(-7, -45, 14, 15);
  ctx.fillStyle = state.handbrakeActive ? '#ef4444' : '#e53e3e';
  ctx.beginPath(); ctx.arc(0, -45, 4, 0, Math.PI * 2); ctx.fill();
  ctx.restore();

  // --- Radio Interface ---
  const radioX = CANVAS_WIDTH / 2 - 80;
  const radioY = CANVAS_HEIGHT - 80;
  const radioW = 160;
  const radioH = 45;
  ctx.fillStyle = '#2d3748';
  ctx.beginPath(); ctx.roundRect(radioX, radioY, radioW, radioH, 5); ctx.fill();
  ctx.strokeStyle = '#1a202c'; ctx.lineWidth = 2; ctx.stroke();
  ctx.fillStyle = '#064e3b'; 
  ctx.fillRect(radioX + 10, radioY + 8, radioW - 60, radioH - 16);
  const scrollOffset = (Date.now() / 50) % 200;
  ctx.save();
  ctx.beginPath(); ctx.rect(radioX + 12, radioY + 10, radioW - 65, radioH - 20); ctx.clip();
  ctx.fillStyle = '#10b981'; ctx.font = 'bold 10px monospace';
  ctx.fillText("CHANNEL 01 - FM DISPATCH SERVICE - ENJOY YOUR JOURNEY - ", radioX + 150 - scrollOffset, radioY + 23);
  ctx.restore();
  for(let i=0; i<3; i++) {
    ctx.fillStyle = '#1a202c';
    ctx.beginPath(); ctx.arc(radioX + radioW - 25, radioY + 12 + i*10, 3, 0, Math.PI*2); ctx.fill();
  }
  ctx.fillStyle = '#4a5568';
  ctx.beginPath(); ctx.arc(radioX + radioW - 15, radioY + radioH / 2, 8, 0, Math.PI*2); ctx.fill();

  ctx.restore();
};

interface GameCanvasProps {
  state: GameState;
  onGearChange: (gear: GearType) => void;
  onHandbrakeToggle: () => void;
}

const GameCanvas: React.FC<GameCanvasProps> = ({ state, onGearChange, onHandbrakeToggle }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rainParticles = useRef<{ x: number, y: number, speed: number, length: number }[]>([]);
  const [isDraggingShifter, setIsDraggingShifter] = useState(false);
  const [dragOffset, setDragOffset] = useState({ x: 0, y: 0 });

  useEffect(() => {
    rainParticles.current = Array.from({ length: 1000 }, () => ({
      x: Math.random() * CANVAS_WIDTH,
      y: Math.random() * CANVAS_HEIGHT,
      speed: 10 + Math.random() * 10,
      length: 8 + Math.random() * 10
    }));
  }, []);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;

    const render = () => {
      ctx.clearRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);
      const horizon = CANVAS_HEIGHT * 0.45;
      
      draw3DEnvironment(ctx, state, horizon);
      drawHeadlightBeams(ctx, state);
      drawWeatherEffects(ctx, state);
      draw3DBus(ctx, state);
      drawSideMirrors(ctx, state);
      drawWindshieldEffects(ctx, state);
      drawBusInterior(ctx, state, isDraggingShifter, dragOffset);
      
      animationFrameId = window.requestAnimationFrame(render);
    };

    render();
    return () => window.cancelAnimationFrame(animationFrameId);
  }, [state, isDraggingShifter, dragOffset]);

  const handleMouseDown = (e: React.MouseEvent) => {
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Check Shifter
    const distShifter = Math.sqrt(Math.pow(x - SHIFTER_X, 2) + Math.pow(y - SHIFTER_Y, 2));
    if (distShifter < SHIFTER_RADIUS) {
      setIsDraggingShifter(true);
      setDragOffset({ x: x - SHIFTER_X, y: y - SHIFTER_Y });
      return;
    }

    // Check Handbrake
    if (x > HANDBRAKE_X - 25 && x < HANDBRAKE_X + 25 && y > HANDBRAKE_Y - 60 && y < HANDBRAKE_Y + 10) {
      onHandbrakeToggle();
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingShifter) return;
    const rect = canvasRef.current?.getBoundingClientRect();
    if (!rect) return;
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    const dx = x - SHIFTER_X;
    const dy = y - SHIFTER_Y;

    // Limit drag to shifter radius
    const dist = Math.sqrt(dx*dx + dy*dy);
    const scale = dist > SHIFTER_RADIUS ? SHIFTER_RADIUS / dist : 1;
    const boundedDx = dx * scale;
    const boundedDy = dy * scale;

    setDragOffset({ x: boundedDx, y: boundedDy });

    // Snap logic
    let newGear: GearType = state.gear;
    if (boundedDx < -10) {
      if (boundedDy < -10) newGear = GearType.PARK;
      else if (boundedDy > 10) newGear = GearType.REVERSE;
    } else if (boundedDx > 10) {
      if (boundedDy < -10) newGear = GearType.NEUTRAL;
      else if (boundedDy > 10) newGear = GearType.DRIVE;
    }

    if (newGear !== state.gear) {
      onGearChange(newGear);
    }
  };

  const handleMouseUp = () => {
    setIsDraggingShifter(false);
  };

  const drawSideMirrors = (ctx: CanvasRenderingContext2D, state: GameState) => {
    const mirrorW = 100;
    const mirrorH = 180;
    const padding = 20;
    drawMirror(ctx, state, padding, CANVAS_HEIGHT / 3, mirrorW, mirrorH, true);
    drawMirror(ctx, state, CANVAS_WIDTH - mirrorW - padding, CANVAS_HEIGHT / 3, mirrorW, mirrorH, false);
  };

  const drawMirror = (ctx: CanvasRenderingContext2D, state: GameState, x: number, y: number, w: number, h: number, isLeft: boolean) => {
    ctx.save();
    ctx.fillStyle = '#1a202c';
    ctx.beginPath();
    ctx.roundRect(x - 4, y - 4, w + 8, h + 8, 15);
    ctx.fill();
    ctx.strokeStyle = '#4a5568';
    ctx.lineWidth = 2;
    ctx.stroke();

    ctx.beginPath();
    ctx.roundRect(x, y, w, h, 12);
    ctx.clip();

    const mirrorHorizon = h * 0.4;
    const skyGrad = ctx.createLinearGradient(x, y, x, y + mirrorHorizon);
    if (state.weather === WeatherType.RAIN) {
      skyGrad.addColorStop(0, '#1a202c'); skyGrad.addColorStop(1, '#4a5568');
    } else {
      skyGrad.addColorStop(0, '#2b6cb0'); skyGrad.addColorStop(1, '#bee3f8');
    }
    ctx.fillStyle = skyGrad;
    ctx.fillRect(x, y, w, h);

    const segments = 15;
    let curveAccumulator = 0;
    const roadBaseColor = state.terrain === TerrainType.CITY ? '#171923' : '#1c4532';

    for (let i = 0; i < segments; i++) {
      const z = 1 - (i / segments);
      const nextZ = 1 - ((i + 1) / segments);
      const ry = y + mirrorHorizon + (1 - z) * (h - mirrorHorizon);
      const nextRy = y + mirrorHorizon + (1 - nextZ) * (h - mirrorHorizon);
      const rw = 20 + (z * z * 150);
      const nextRw = 20 + (nextZ * nextZ * 150);
      curveAccumulator -= state.roadCurve * (1 - z);
      const steerShift = state.steeringAngle * 0.5 * (isLeft ? 1 : -1);
      const rx = x + (w / 2) + (curveAccumulator * 100 * z) + steerShift;
      const nextRx = x + (w / 2) + ((curveAccumulator - state.roadCurve * (1 - nextZ)) * 100 * nextZ) + steerShift;
      const isAlt = Math.floor((state.currentDistance - i * 40) / 40) % 2 === 0;
      ctx.fillStyle = isAlt ? roadBaseColor : '#2d3748';
      ctx.fillRect(x, ry, w, nextRy - ry + 1);
      ctx.fillStyle = state.road === RoadType.PAVED ? (isAlt ? '#2d3748' : '#111') : '#5c2d0b';
      ctx.beginPath();
      ctx.moveTo(rx - rw / 2, ry); ctx.lineTo(rx + rw / 2, ry);
      ctx.lineTo(nextRx + nextRw / 2, nextRy); ctx.lineTo(nextRx - nextRw / 2, nextRy);
      ctx.fill();
    }
    const glassGrad = ctx.createLinearGradient(x, y, x + w, y + h);
    glassGrad.addColorStop(0, 'rgba(255, 255, 255, 0.1)');
    glassGrad.addColorStop(1, 'rgba(255, 255, 255, 0.05)');
    ctx.fillStyle = glassGrad;
    ctx.fillRect(x, y, w, h);
    ctx.fillStyle = state.selectedBus.color;
    const busEdgeX = isLeft ? x : x + w - 15;
    ctx.fillRect(busEdgeX, y + h * 0.4, 15, h * 0.6);
    ctx.restore();
  };

  const drawHeadlightBeams = (ctx: CanvasRenderingContext2D, state: GameState) => {
    if (!state.headlightsOn) return;
    const { selectedBus, steeringAngle, weather } = state;
    const centerX = CANVAS_WIDTH / 2 + steeringAngle * 2.5;
    const busY = CANVAS_HEIGHT - 30;
    let busW = 280;
    if (selectedBus.size === 'Medium') busW = 340;
    if (selectedBus.size === 'Large') busW = 400;
    const beamLength = weather === WeatherType.FOG ? 150 : 350;
    const beamWidth = weather === WeatherType.FOG ? 250 : 200;
    ctx.save();
    ctx.globalCompositeOperation = 'screen';
    const drawBeam = (startX: number) => {
      const grad = ctx.createLinearGradient(startX, busY - 40, startX, busY - 40 - beamLength);
      const alpha = weather === WeatherType.FOG ? 0.6 : 0.4;
      grad.addColorStop(0, "rgba(255, 255, 255, " + alpha + ")");
      grad.addColorStop(1, 'rgba(255, 255, 255, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.moveTo(startX - 20, busY - 40);
      ctx.lineTo(startX - beamWidth, busY - 40 - beamLength);
      ctx.lineTo(startX + beamWidth, busY - 40 - beamLength);
      ctx.lineTo(startX + 20, busY - 40);
      ctx.fill();
    };
    drawBeam(centerX - busW/2 + 50);
    drawBeam(centerX + busW/2 - 50);
    ctx.restore();
  };

  const draw3DEnvironment = (ctx: CanvasRenderingContext2D, state: GameState, horizon: number) => {
    const { currentDistance, roadCurve, weather, terrain, road: roadType } = state;
    const skyGrad = ctx.createLinearGradient(0, 0, 0, horizon);
    if (weather === WeatherType.RAIN) { skyGrad.addColorStop(0, '#1a202c'); skyGrad.addColorStop(1, '#4a5568'); }
    else if (weather === WeatherType.FOG) { skyGrad.addColorStop(0, '#718096'); skyGrad.addColorStop(1, '#cbd5e0'); }
    else { skyGrad.addColorStop(0, '#2b6cb0'); skyGrad.addColorStop(1, '#bee3f8'); }
    ctx.fillStyle = skyGrad;
    ctx.fillRect(0, 0, CANVAS_WIDTH, horizon);

    let groundBaseColor = terrain === TerrainType.CITY ? '#171923' : (terrain === TerrainType.VILLAGE ? '#744210' : '#1c4532');
    if (weather === WeatherType.RAIN) groundBaseColor = '#0d0d12';

    const segments = 60;
    let curveAccumulator = 0;
    const fogColor = weather === WeatherType.FOG ? '#cbd5e0' : (weather === WeatherType.RAIN ? '#4a5568' : null);

    for (let i = segments; i > 0; i--) {
      const z = i / segments;
      const nextZ = (i - 1) / segments;
      const y = horizon + (1 - z) * (CANVAS_HEIGHT - horizon);
      const nextY = horizon + (1 - nextZ) * (CANVAS_HEIGHT - horizon);
      const w = 40 + (z * z * 600);
      const nextW = 40 + (nextZ * nextZ * 600);
      curveAccumulator += roadCurve * (1 - z);
      const x = (CANVAS_WIDTH / 2) + curveAccumulator * 300 * z;
      const nextX = (CANVAS_WIDTH / 2) + (curveAccumulator + roadCurve * (1-nextZ)) * 300 * nextZ;
      const segWorldDist = currentDistance + (segments - i) * 20;
      const isAlt = Math.floor(segWorldDist / 40) % 2 === 0;
      ctx.fillStyle = isAlt ? groundBaseColor : (terrain === TerrainType.CITY ? '#2d3748' : '#276749');
      ctx.beginPath(); ctx.moveTo(0, y); ctx.lineTo(CANVAS_WIDTH, y); ctx.lineTo(CANVAS_WIDTH, nextY); ctx.lineTo(0, nextY); ctx.fill();
      ctx.fillStyle = roadType === RoadType.PAVED ? (isAlt ? '#2d3748' : '#1a202c') : (isAlt ? '#8b4513' : '#5c2d0b');
      ctx.beginPath(); ctx.moveTo(x - w / 2, y); ctx.lineTo(x + w / 2, y); ctx.lineTo(nextX + nextW / 2, nextY); ctx.lineTo(nextX - nextW / 2, nextY); ctx.fill();
      if (roadType === RoadType.PAVED && isAlt) { ctx.fillStyle = '#f6e05e'; ctx.fillRect(x - (1 * z), y, 2 * z, nextY - y + 1); }
      if (fogColor) { ctx.fillStyle = fogColor; ctx.globalAlpha = Math.pow(1 - z, 3); ctx.fillRect(0, y, CANVAS_WIDTH, nextY - y + 1); ctx.globalAlpha = 1.0; }
      if (terrain === TerrainType.CITY) {
        const lightIdx = Math.round(segWorldDist / TRAFFIC_LIGHT_DISTANCE);
        if (Math.abs(segWorldDist - (lightIdx * TRAFFIC_LIGHT_DISTANCE)) < 10) drawTrafficLight(ctx, x + w/2 + 30 * z, y, z, lightIdx);
      }
      
      if (i % (terrain === TerrainType.CITY ? 4 : 6) === 0) {
        const side = (seed(i + Math.floor(currentDistance/1000)) % 2 === 0) ? 1 : -1;
        draw3DProp(ctx, x + (w/2 + 50*z) * side, y, z, terrain, seed(i), weather);
        
        if (terrain === TerrainType.CITY && seed(i + 123) % 10 > 6) {
           draw3DProp(ctx, x - (w/2 + 50*z) * side, y, z, terrain, seed(i + 456), weather);
        }
      }
      if (Math.abs(z - (1 - (state.nextStopDistance - currentDistance) / 1000)) < 0.02) drawPassengers(ctx, x + (w/2 + 15*z), y, z, state.isFull);
    }
  };

  const draw3DBus = (ctx: CanvasRenderingContext2D, state: GameState) => {
    const { selectedBus, steeringAngle, headlightsOn, indicatorStatus, bodyRoll, bodyPitch, suspensionY } = state;
    const busY = CANVAS_HEIGHT - 30;
    let busW = 280, busH = 160;
    if (selectedBus.size === 'Medium') { busW = 340; busH = 190; }
    if (selectedBus.size === 'Large') { busW = 400; busH = 220; }
    
    ctx.save();
    ctx.translate(CANVAS_WIDTH / 2 + steeringAngle * 2.5, busY + suspensionY);
    ctx.rotate(bodyRoll);
    ctx.transform(1, 0, bodyPitch * 0.5, 1, 0, 0);

    ctx.save();
    ctx.translate(0, -suspensionY); 
    ctx.fillStyle = 'rgba(0,0,0,0.4)';
    ctx.beginPath(); ctx.ellipse(0, 10, busW/2, 25, 0, 0, Math.PI*2); ctx.fill();
    ctx.restore();

    ctx.fillStyle = selectedBus.color;
    ctx.beginPath(); ctx.roundRect(-busW/2, -busH, busW, busH, 20); ctx.fill();
    ctx.fillStyle = '#1a202c'; ctx.fillRect(-busW/2 + 10, -busH + 10, busW - 20, busH/1.4);
    const blink = Math.floor(Date.now() / 400) % 2 === 0;
    const lightColor = headlightsOn ? '#fff' : '#f6e05e';
    ctx.fillStyle = lightColor;
    ctx.beginPath(); ctx.arc(-busW/2 + 50, -40, 25, 0, Math.PI*2); ctx.fill();
    ctx.beginPath(); ctx.arc(busW/2 - 50, -40, 25, 0, Math.PI*2); ctx.fill();
    
    if (indicatorStatus === IndicatorType.LEFT && blink) { 
      ctx.fillStyle = '#f59e0b'; ctx.beginPath(); ctx.arc(-busW/2 + 20, -busH + 30, 15, 0, Math.PI*2); ctx.fill(); 
    }
    if (indicatorStatus === IndicatorType.RIGHT && blink) { 
      ctx.fillStyle = '#f59e0b'; ctx.beginPath(); ctx.arc(busW/2 - 20, -busH + 30, 15, 0, Math.PI*2); ctx.fill(); 
    }
    
    ctx.restore();
  };

  const drawWeatherEffects = (ctx: CanvasRenderingContext2D, state: GameState) => {
    if (state.weather === WeatherType.RAIN) {
      const { rainIntensity } = state;
      ctx.save(); 
      ctx.strokeStyle = `rgba(174, 194, 224, ${0.1 + rainIntensity * 0.4})`;
      ctx.lineWidth = 1 + rainIntensity * 1.5;
      const particleCount = Math.floor(rainParticles.current.length * rainIntensity);
      for (let i = 0; i < particleCount; i++) {
        const p = rainParticles.current[i];
        const effectiveSpeed = p.speed * (0.8 + rainIntensity * 0.4);
        const effectiveLength = p.length * (0.7 + rainIntensity * 0.6);
        ctx.beginPath(); 
        ctx.moveTo(p.x, p.y); 
        ctx.lineTo(p.x + 1, p.y + effectiveLength); 
        ctx.stroke();
        p.y += effectiveSpeed; 
        if (p.y > CANVAS_HEIGHT) p.y = -effectiveLength;
      }
      ctx.restore();
    }
  };

  const drawWindshieldEffects = (ctx: CanvasRenderingContext2D, state: GameState) => {
    const { weather, wipersActive, selectedBus, steeringAngle, rainIntensity, suspensionY } = state;
    if (weather !== WeatherType.RAIN && weather !== WeatherType.FOG) return;
    const centerX = CANVAS_WIDTH / 2 + steeringAngle * 2.5;
    const busY = CANVAS_HEIGHT - 30 + suspensionY;
    let busW = 280, busH = 160;
    if (selectedBus.size === 'Medium') { busW = 340; busH = 190; }
    if (selectedBus.size === 'Large') { busW = 400; busH = 220; }
    const glassX = centerX - busW/2 + 15, glassY = busY - busH + 15, glassW = busW - 30, glassH = busH/1.5;
    
    ctx.save();
    if (weather === WeatherType.FOG) { 
      ctx.fillStyle = 'rgba(203, 213, 224, 0.15)'; 
      ctx.fillRect(glassX, glassY, glassW, glassH); 
    } else if (weather === WeatherType.RAIN) {
      ctx.fillStyle = `rgba(174, 194, 224, ${rainIntensity * 0.1})`;
      ctx.fillRect(glassX, glassY, glassW, glassH);
    }
    if (wipersActive) {
      const wiperSpeed = 300 - (rainIntensity * 100);
      const wiperAngle = Math.sin(Date.now() / wiperSpeed) * 1.2;
      ctx.strokeStyle = '#2d3748'; ctx.lineWidth = 4; ctx.lineCap = 'round';
      const drawWiper = (pivotX: number) => {
        ctx.beginPath(); ctx.moveTo(pivotX, glassY + glassH);
        ctx.lineTo(pivotX + Math.sin(wiperAngle) * glassH * 0.9, glassY + glassH - Math.cos(wiperAngle) * glassH * 0.9);
        ctx.stroke();
      };
      drawWiper(glassX + glassW * 0.25); drawWiper(glassX + glassW * 0.75);
    }
    ctx.restore();
  };

  return (
    <canvas 
      ref={canvasRef} 
      width={CANVAS_WIDTH} 
      height={CANVAS_HEIGHT} 
      onMouseDown={handleMouseDown}
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
      className="rounded-2xl shadow-[0_0_100px_rgba(0,0,0,0.8)] border-8 border-slate-900 bg-slate-950 cursor-crosshair" 
    />
  );
};

export default GameCanvas;
