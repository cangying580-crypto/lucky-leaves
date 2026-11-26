import { stageForAge, ageOf, type TreeStage, type TreeCategory } from '../types';

export function hashSeed(str: string): number {
  let h = 2166136261;
  for (let i = 0; i < str.length; i++) {
    h ^= str.charCodeAt(i);
    h = Math.imul(h, 16777619);
  }
  return h >>> 0;
}

export function mulberry32(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export interface CanopyBlob {
  cx: number;
  cy: number;
  r: number;
  tone: number;
}

export interface LeafSpec {
  x: number;
  y: number;
  rot: number;
  s: number;
}

export interface TreeVisual {
  stage: TreeStage;
  height: number;
  trunkW: number;
  lean: number;
  trunkPath: string;
  trunkShade: string;
  branches: string[];
  canopy: CanopyBlob[];
  leaves: LeafSpec[];
  blossoms: LeafSpec[];
}

const STAGE_HEIGHT = [72, 112, 152, 186, 214];
const STAGE_RADIUS = [36, 48, 60, 72, 82];
const STAGE_TRUNK_W = [7, 10, 13, 16, 19];

export function generateTreeVisual(seed: string, birthYear: number): TreeVisual {
  const stage = stageForAge(ageOf(birthYear));
  const rnd = mulberry32(hashSeed(seed));
  const H = STAGE_HEIGHT[stage] * (0.94 + rnd() * 0.12);
  const R = STAGE_RADIUS[stage] * (0.92 + rnd() * 0.16);
  const w = STAGE_TRUNK_W[stage];
  const lean = (rnd() - 0.5) * 14;

  const trunkPath =
    `M ${-w},4 C ${-w * 0.9},${-H * 0.3} ${-w * 0.55 + lean * 0.4},${-H * 0.66} ${-w * 0.34 + lean},${-H} ` +
    `L ${w * 0.34 + lean},${-H} C ${w * 0.55 + lean * 0.4},${-H * 0.66} ${w * 0.9},${-H * 0.3} ${w},4 ` +
    `C ${w * 0.5},7 ${-w * 0.5},7 ${-w},4 Z`;

  const trunkShade =
    `M ${w * 0.15 + lean},${-H} L ${w * 0.34 + lean},${-H} C ${w * 0.55 + lean * 0.4},${-H * 0.66} ${w * 0.9},${-H * 0.3} ${w},4 ` +
    `C ${w * 0.6},6 ${w * 0.3},6 ${w * 0.2},4 C ${w * 0.4},${-H * 0.35} ${w * 0.3},${-H * 0.7} ${w * 0.15 + lean},${-H} Z`;

  const branches: string[] = [];
  const branchCount = stage >= 2 ? 2 : 1;
  for (let i = 0; i < branchCount; i++) {
    const by = -H * (0.72 + i * 0.18);
    const dir = i % 2 === 0 ? 1 : -1;
    const len = R * (0.55 + rnd() * 0.3);
    branches.push(
      `M ${lean * 0.5},${by} Q ${dir * len * 0.5},${by - len * 0.25} ${dir * len},${by - len * 0.55}`,
    );
  }

  const canopy: CanopyBlob[] = [];
  const topY = -H - R * 0.35;
  canopy.push({ cx: lean, cy: topY, r: R, tone: 1 });
  const sideCount = 2 + Math.min(2, stage);
  for (let i = 0; i < sideCount; i++) {
    const ang = Math.PI * (0.15 + (0.7 * i) / Math.max(1, sideCount - 1)) + (rnd() - 0.5) * 0.2;
    const dist = R * (0.62 + rnd() * 0.2);
    canopy.push({
      cx: lean + Math.cos(ang) * dist * (i % 2 === 0 ? 1 : -1),
      cy: topY + Math.sin(ang) * dist * 0.55 + R * 0.18,
      r: R * (0.55 + rnd() * 0.22),
      tone: i % 3,
    });
  }
  if (stage >= 3) {
    canopy.push({ cx: lean - R * 0.3, cy: topY - R * 0.55, r: R * 0.5, tone: 2 });
    canopy.push({ cx: lean + R * 0.35, cy: topY - R * 0.45, r: R * 0.46, tone: 0 });
  }

  const leafCount = 12 + stage * 5;
  const leaves: LeafSpec[] = [];
  for (let i = 0; i < leafCount; i++) {
    const blob = canopy[Math.floor(rnd() * canopy.length)];
    const ang = rnd() * Math.PI * 2;
    const dist = Math.sqrt(rnd()) * blob.r * 0.86;
    leaves.push({
      x: blob.cx + Math.cos(ang) * dist,
      y: blob.cy + Math.sin(ang) * dist * 0.92,
      rot: rnd() * 360,
      s: 0.8 + rnd() * 0.55,
    });
  }

  const blossoms: LeafSpec[] = [];
  const blossomCount = 3 + Math.floor(rnd() * 3);
  for (let i = 0; i < blossomCount; i++) {
    const blob = canopy[Math.floor(rnd() * canopy.length)];
    const ang = rnd() * Math.PI * 2;
    const dist = Math.sqrt(rnd()) * blob.r * 0.7;
    blossoms.push({
      x: blob.cx + Math.cos(ang) * dist,
      y: blob.cy + Math.sin(ang) * dist * 0.9,
      rot: rnd() * 360,
      s: 0.7 + rnd() * 0.5,
    });
  }

  return { stage, height: H, trunkW: w, lean, trunkPath, trunkShade, branches, canopy, leaves, blossoms };
}

export function goldenLeafCount(total: number, done: number, all: number): number {
  if (all <= 0 || done <= 0) return 0;
  return Math.min(total, Math.round((done / all) * total));
}

export interface Slot {
  x: number;
  y: number;
  s: number;
}

export const TREE_SLOTS: Slot[] = [
  { x: 480, y: 306, s: 0.8 },
  { x: 800, y: 252, s: 0.74 },
  { x: 1120, y: 306, s: 0.8 },
  { x: 178, y: 436, s: 0.95 },
  { x: 1422, y: 436, s: 0.95 },
  { x: 72, y: 588, s: 1.02 },
  { x: 1528, y: 588, s: 1.02 },
  { x: 250, y: 640, s: 1.12 },
  { x: 1294, y: 620, s: 1.12 },
  { x: 250, y: 742, s: 1.24 },
  { x: 1350, y: 742, s: 1.24 },
  { x: 450, y: 430, s: 1.05 },
  { x: 1162, y: 788, s: 1.22 },
  { x: 560, y: 780, s: 1.18 },
  { x: 1040, y: 780, s: 1.18 },
  { x: 800, y: 872, s: 1.34 },
];

export function nextSlot(occupied: { x: number; y: number }[], seed: string): Slot {
  for (const slot of TREE_SLOTS) {
    if (!occupied.some((o) => Math.hypot(o.x - slot.x, o.y - slot.y) < 70)) return slot;
  }
  const rnd = mulberry32(hashSeed(seed));
  return { x: 100 + rnd() * 1400, y: 300 + rnd() * 560, s: 0.85 + rnd() * 0.45 };
}

export function categoryAccent(category: TreeCategory): string {
  const map: Record<TreeCategory, string> = {
    growth: '#f2b134',
    study: '#4aa3df',
    career: '#e8604c',
    health: '#58b368',
    dream: '#a06cd5',
    relation: '#ef7fae',
  };
  return map[category];
}