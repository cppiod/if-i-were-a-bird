import Phaser from 'phaser';
import type { FlightResult, Landscape } from '../core/types.ts';

type FlightMode = 'learn' | 'forage' | 'migrate';
interface Speck { x: number; y: number; kind: 'food' | 'gust'; hit: boolean }
export interface SkyControl {
  setLandscape: (landscape: Landscape, night?: boolean) => void;
  beginFlight: (mode: FlightMode, seed: number, done: (result: FlightResult) => void) => void;
  pause: (paused: boolean) => void;
  reduceMotion: (value: boolean) => void;
  assist: () => void;
  destroy: () => void;
}

export function mountSky(parent: HTMLElement, onTick: (left: number, insects: number, paused: boolean) => void): SkyControl {
  let scene: SkyScene | undefined;
  let wantedLandscape: Landscape = 'city', wantedNight = false, wantedPaused = false;
  let motionReduced = false;
  let queuedFlight: (() => void) | undefined;
  let destroyed = false;
  class SkyScene extends Phaser.Scene {
    private ink!: Phaser.GameObjects.Graphics;
    private timePassed = 0;
    private flightTime = 0;
    private y = 320;
    private keys!: Phaser.Types.Input.Keyboard.CursorKeys;
    private items: Speck[] = [];
    private food = 0;
    private gusts = 0;
    private paused = false;
    private activeFlight = false;
    private callback?: (result: FlightResult) => void;
    private targetY: number | null = null;
    private lastTick = -1;
    private lastPaused = false;
    constructor() { super('sky'); }
    create() {
      scene = this;
      this.paused = wantedPaused;
      this.ink = this.add.graphics();
      this.keys = this.input.keyboard!.createCursorKeys();
      this.input.keyboard!.clearCaptures();
      this.input.on('pointerdown', (p: Phaser.Input.Pointer) => { if (this.activeFlight) this.targetY = p.y; });
      this.input.on('pointermove', (p: Phaser.Input.Pointer) => { if (this.activeFlight && p.isDown) this.targetY = p.y; });
      this.input.on('pointerup', () => { this.targetY = null; });
      this.input.on('pointerupoutside', () => { this.targetY = null; });
      queuedFlight?.(); queuedFlight = undefined;
      parent.querySelector('canvas')?.setAttribute('aria-label', '插画天空。飞行时使用方向键上下移动，也可按住画面调整高度。');
    }
    startFlight(mode: FlightMode, seed: number, done: (result: FlightResult) => void) {
      this.activeFlight = true; this.callback = done; this.paused = false;
      this.flightTime = 0; this.y = 320; this.food = 0; this.gusts = 0;
      this.targetY = null; this.lastTick = -1;
      let r = seed || 1;
      const rand = () => { r = (Math.imul(1664525, r) + 1013904223) >>> 0; return r / 4294967296; };
      this.items = Array.from({ length: 24 }, (_, i) => ({ x: 700 + i * 190, y: 125 + rand() * 335,
        kind: mode !== 'learn' && i % 5 === 4 ? 'gust' : 'food', hit: false }));
      parent.classList.add('flying');
      parent.querySelector('canvas')?.setAttribute('tabindex', '0');
      (parent.querySelector('canvas') as HTMLCanvasElement | null)?.focus({ preventScroll: true });
    }
    setPaused(value: boolean) { this.paused = value; if (value) this.targetY = null; }
    finish(assisted: boolean) {
      if (!this.activeFlight) return;
      this.activeFlight = false; this.targetY = null; this.items = [];
      parent.classList.remove('flying');
      parent.querySelector('canvas')?.removeAttribute('tabindex');
      const callback = this.callback; this.callback = undefined;
      callback?.({ insects: this.food, gusts: this.gusts, assisted });
    }
    update(_time: number, delta: number) {
      const dt = Math.min(delta, 50) / 1000;
      if (!this.paused) this.timePassed += dt;
      if (this.activeFlight && !this.paused) {
        this.flightTime += dt;
        if (this.keys.up.isDown) { this.y -= 255 * dt; this.targetY = null; }
        if (this.keys.down.isDown) { this.y += 255 * dt; this.targetY = null; }
        if (this.targetY !== null) this.y += Math.max(-255 * dt, Math.min(255 * dt, this.targetY - this.y));
        this.y = Phaser.Math.Clamp(this.y, 100, 480);
        for (const item of this.items) {
          item.x -= 155 * dt;
          if (!item.hit && Math.abs(item.x - 310) < 32 && Math.abs(item.y - this.y) < (item.kind === 'food' ? 34 : 42)) {
            item.hit = true;
            if (item.kind === 'food') this.food++; else this.gusts++;
          }
        }
        if (this.flightTime >= 30) this.finish(false);
      }
      if (this.activeFlight && (Math.ceil(this.flightTime) !== this.lastTick || this.paused !== this.lastPaused)) {
        this.lastTick = Math.ceil(this.flightTime); this.lastPaused = this.paused;
        onTick(Math.max(0, Math.ceil(30 - this.flightTime)), this.food, this.paused);
      }
      this.draw();
    }
    private bird(x: number, y: number, scale: number, phase: number, color = 0x203c3a) {
      const g = this.ink;
      const flex = Math.sin(phase) * 9;
      const points = [ [22, 0], [5, -5], [-5, -12], [-42, -42 + flex], [-27, -10], [-9, 3],
        [-24, 13], [-9, 9], [0, 4], [3, 12], [5, 5], [20, 22 - flex], [11, 1] ];
      g.fillStyle(color, 1);
      g.fillPoints(points.map(([px, py]) => new Phaser.Geom.Point(x + px * scale, y + py * scale)), true);
    }
    private polygon(points: number[][], color: number, alpha = 1) {
      this.ink.fillStyle(color, alpha).fillPoints(points.map(([x, y]) => new Phaser.Geom.Point(x, y)), true);
    }
    private draw() {
      const g = this.ink, t = motionReduced ? 0 : this.timePassed, landscape = wantedLandscape;
      const night = wantedNight;
      g.clear();
      const skyTop = night ? 0x152c3d : landscape === 'desert' ? 0xd4bda0 : 0xc7dcd6;
      g.fillStyle(skyTop).fillRect(0, 0, 1200, 650);
      for (let i = 0; i < 12; i++) {
        g.fillStyle(night ? 0x6c8790 : 0xf5edda, 0.025 + i * 0.004).fillRect(0, 180 + i * 38, 1200, 40);
      }
      g.fillStyle(night ? 0xf3e9d0 : 0xfff5d7, 0.8).fillCircle(870, 150, night ? 30 : 48);
      if (night) {
        for (let i = 0; i < 45; i++) g.fillStyle(0xf8f2d8, 0.4 + (i % 4) * 0.15).fillCircle((i * 137 + 57) % 1200, 30 + (i * 61) % 330, i % 5 ? 1 : 2);
      }
      for (let i = 0; i < 5; i++) {
        const x = ((i * 290 - t * (5 + i) + 300) % 1600 + 1600) % 1600 - 200;
        g.fillStyle(night ? 0xc0d5d3 : 0xffffff, night ? 0.035 : 0.22);
        g.fillEllipse(x, 100 + i * 43, 290 + i * 20, 20 + i * 6);
      }
      const hill = (base: number, amplitude: number, color: number, offset: number) => {
        const p: number[][] = [[0, 650]];
        for (let x = 0; x <= 1200; x += 15) p.push([x, base + Math.sin(x / 150 + offset) * amplitude + Math.cos(x / 63 + offset) * amplitude / 3]);
        p.push([1200, 650]); this.polygon(p, color);
      };
      if (landscape === 'nest') {
        this.polygon([[0, 0], [1200, 0], [1200, 100], [650, 170], [0, 85]], 0x303d35);
        this.polygon([[0, 0], [160, 0], [230, 650], [0, 650]], 0x414536);
        this.polygon([[1200, 0], [1100, 0], [1010, 650], [1200, 650]], 0x414536);
        this.polygon([[690, 180], [800, 160], [1100, 650], [550, 650]], 0xffe6a1, 0.12);
        hill(540, 17, 0x727964, 0);
        g.fillStyle(0x574d36).fillEllipse(540, 550, 390, 100);
        for (let i = 0; i < 35; i++) {
          g.lineStyle(1, i % 2 ? 0xbaa578 : 0x837653, 0.7);
          g.lineBetween(350 + (i * 61) % 340, 520 + (i * 31) % 70, 400 + (i * 37) % 290, 530 + (i * 13) % 65);
        }
        g.fillStyle(0x3d4439).fillEllipse(510, 515, 62, 42).fillEllipse(562, 520, 55, 38);
        g.fillStyle(0xd9bc80).fillTriangle(530, 508, 548, 511, 534, 519);
        this.bird(775, 250 + Math.sin(t) * 7, 1.15, t * 3);
      } else {
        hill(430, 32, night ? 0x304956 : 0x9cb7aa, 1);
        hill(505, 40, night ? 0x243e48 : landscape === 'desert' ? 0xb69d7f : 0x78988b, 3);
        hill(570, 20, night ? 0x1d3540 : 0x526f64, 5);
        if (landscape === 'city') {
          for (let i = 0; i < 10; i++) {
            const x = i * 145 - 50, y = 480 + (i * 23) % 95;
            g.fillStyle(0x65786a).fillRect(x, y, 120, 170);
            this.polygon([[x - 16, y + 3], [x + 60, y - 31], [x + 136, y + 3], [x + 118, y + 13], [x + 2, y + 13]], 0x435a50);
            g.lineStyle(2, 0xc5bfa0, 0.4).lineBetween(x + 2, y + 3, x + 118, y + 3);
          }
        }
        if (landscape === 'sea') {
          g.fillStyle(0x789f9a).fillRect(0, 410, 1200, 240);
          for (let i = 0; i < 35; i++) {
            const x = (i * 173 + t * 15) % 1250;
            g.lineStyle(1, 0xe5e8cd, 0.35).lineBetween(x, 430 + (i * 31) % 200, x + 30 + i % 45, 430 + (i * 31) % 200);
          }
        }
        if (landscape === 'savanna') {
          for (let i = 0; i < 5; i++) {
            const x = 100 + i * 260, y = 553 + i % 3 * 20;
            g.fillStyle(night ? 0x192f36 : 0x425e50).fillRect(x, y - 30, 5, 75).fillEllipse(x, y - 24, 100, 20);
          }
        }
        for (let i = 0; i < 6; i++) this.bird(120 + i * 175 + Math.sin(t / 3 + i) * 30, 200 + i % 3 * 48, 0.23 + i % 3 * 0.08, t * 2 + i, night ? 0xa6bab5 : 0x49655d);
        if (this.activeFlight) {
          for (const item of this.items) {
            if (item.hit || item.x < -60 || item.x > 1260) continue;
            if (item.kind === 'food') {
              g.fillStyle(0xffe5a0, 0.15).fillCircle(item.x, item.y, 24);
              for (let j = 0; j < 5; j++) g.fillStyle(0x806439).fillCircle(item.x + Math.cos(j * 2) * 10, item.y + Math.sin(j * 2) * 10, 2);
            } else {
              g.lineStyle(2, 0xe9ede1, 0.9).strokeEllipse(item.x, item.y, 64, 44);
              g.lineBetween(item.x - 40, item.y - 10, item.x + 30, item.y - 10);
              g.lineBetween(item.x - 30, item.y + 8, item.x + 40, item.y + 8);
            }
          }
          this.bird(310, this.y, 1.3, t * 8);
        } else this.bird(410 + Math.sin(t / 4) * 35, 295 + Math.sin(t / 2) * 16, 1.6, t * 3);
      }
      g.lineStyle(1, 0xffffff, 0.1);
      for (let y = 0; y < 650; y += 5) g.lineBetween(0, y, 1200, y);
    }
  }
  const game = new Phaser.Game({
    type: Phaser.AUTO, parent, width: 1200, height: 650, transparent: true,
    scale: { mode: Phaser.Scale.ENVELOP, autoCenter: Phaser.Scale.CENTER_BOTH },
    scene: SkyScene, audio: { noAudio: true },
    render: { antialias: true }, banner: false,
  });
  return {
    setLandscape(landscape, night = false) { wantedLandscape = landscape; wantedNight = night; },
    beginFlight(mode, seed, done) {
      const begin = () => { if (!destroyed) scene!.startFlight(mode, seed, done); };
      if (scene) begin(); else queuedFlight = begin;
    },
    pause(paused) { wantedPaused = paused; scene?.setPaused(paused); },
    reduceMotion(value) { motionReduced = value; },
    assist() { scene?.finish(true); },
    destroy() { destroyed = true; game.destroy(true); },
  };
}
