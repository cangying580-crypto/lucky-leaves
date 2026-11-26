import { mulberry32 } from '../../lib/treeGen';

/* 低多边形树冠色阶：深 → 亮，光源固定在左上 */
export const POLY_TONES: [string, string, string, string, string][] = [
  ['#33702c', '#4f9a41', '#63b350', '#8fce6f', '#b6e795'],
  ['#2c6b52', '#3f8a6a', '#57ab8b', '#7fc9a4', '#a8e2c4'],
  ['#3d7a2e', '#5aa845', '#79c257', '#a5d97f', '#c8ecab'],
];

const LIGHT = { x: -0.55, y: -0.83 };

function mix(a: string, b: string, t: number): string {
  const pa = [1, 3, 5].map((i) => parseInt(a.slice(i, i + 2), 16));
  const pb = [1, 3, 5].map((i) => parseInt(b.slice(i, i + 2), 16));
  return `#${pa.map((v, i) => Math.round(v + (pb[i] - v) * t).toString(16).padStart(2, '0')).join('')}`;
}

export interface Facet {
  d: string;
  fill: string;
  opacity?: number;
}

export interface PolyBlob {
  outline: string;
  facets: Facet[];
  rim: string;
  under: string;
}

function shadeIndex(d: number, jitter: number): number {
  const v = d + jitter;
  if (v > 0.66) return 4;
  if (v > 0.24) return 3;
  if (v > -0.24) return 2;
  if (v > -0.66) return 1;
  return 1;
}

/* 以不规则多边形 + 三角面片取代圆形渐变，形成 low-poly 体积 */
export function polyBlob(cx: number, cy: number, r: number, tone: number, seed: number, n = 12, blend = 0.3): PolyBlob {
  const rnd = mulberry32(seed >>> 0);
  const phase = rnd() * Math.PI * 2;
  const tones = POLY_TONES[tone % 3];
  const verts = Array.from({ length: n }, (_, i) => {
    const a = phase + (i / n) * Math.PI * 2;
    /* 起伏的团块轮廓：保留叶簇感，面片负责体积 */
    const rr = r * (0.94 + Math.sin(i * 2.4 + phase * 3) * 0.07 + rnd() * 0.06);
    return { x: cx + Math.cos(a) * rr, y: cy + Math.sin(a) * rr * 0.94 };
  });
  const inner = { x: cx - r * 0.16, y: cy - r * 0.2 };
  const facets: Facet[] = [];
  let rim = '';
  for (let i = 0; i < n; i++) {
    const a = verts[i];
    const b = verts[(i + 1) % n];
    const mx = (a.x + b.x) / 2 - cx;
    const my = (a.y + b.y) / 2 - cy;
    const ml = Math.hypot(mx, my) || 1;
    const d = (mx / ml) * LIGHT.x + (my / ml) * LIGHT.y;
    const idx = shadeIndex(d, (rnd() - 0.5) * 0.3);
    facets.push({
      d: `M ${inner.x.toFixed(1)},${inner.y.toFixed(1)} L ${a.x.toFixed(1)},${a.y.toFixed(1)} L ${b.x.toFixed(1)},${b.y.toFixed(1)} Z`,
      fill: mix(tones[idx], tones[2], blend),
      opacity: 0.9,
    });
    if (d > 0.5) rim += `M ${a.x.toFixed(1)},${a.y.toFixed(1)} L ${b.x.toFixed(1)},${b.y.toFixed(1)} `;
  }
  /* 内部碎面：靠近顶光的几块亮片，增强几何细节 */
  for (let i = 0; i < 3; i++) {
    const a = phase + rnd() * Math.PI * 2;
    const f = 0.3 + rnd() * 0.4;
    const px = cx + Math.cos(a) * r * f - r * 0.14;
    const py = cy + Math.sin(a) * r * f * 0.9 - r * 0.18;
    const s = r * (0.14 + rnd() * 0.12);
    facets.push({
      d: `M ${px.toFixed(1)},${(py - s).toFixed(1)} L ${(px + s).toFixed(1)},${(py + s * 0.7).toFixed(1)} L ${(px - s).toFixed(1)},${(py + s * 0.6).toFixed(1)} Z`,
      fill: mix(tones[3 + (i % 2)], tones[2], blend + 0.15),
      opacity: 0.3,
    });
  }
  const outline = `M ${verts.map((v) => `${v.x.toFixed(1)},${v.y.toFixed(1)}`).join(' L ')} Z`;
  const under = `M ${(cx - r * 0.78).toFixed(1)},${(cy + r * 0.34).toFixed(1)} L ${(cx - r * 0.3).toFixed(1)},${(cy + r * 0.86).toFixed(1)} L ${(cx + r * 0.42).toFixed(1)},${(cy + r * 0.8).toFixed(1)} L ${(cx + r * 0.82).toFixed(1)},${(cy + r * 0.28).toFixed(1)} L ${(cx + r * 0.3).toFixed(1)},${(cy + r * 0.56).toFixed(1)} L ${(cx - r * 0.24).toFixed(1)},${(cy + r * 0.6).toFixed(1)} Z`;
  return { outline, facets, rim, under };
}

/* 石块：六边轮廓 + 顶亮面 + 侧暗面 */
export function polyStone(seed: number): { base: string; top: string; side: string } {
  const rnd = mulberry32(seed >>> 0);
  const j = () => (rnd() - 0.5) * 3;
  const pts = [
    [-15 + j(), 2 + j()],
    [-11 + j(), -6 + j()],
    [-2 + j(), -10 + j()],
    [8 + j(), -8 + j()],
    [15 + j(), -1 + j()],
    [11 + j(), 7 + j()],
    [-6 + j(), 9 + j()],
  ];
  const base = `M ${pts.map((p) => `${p[0].toFixed(1)},${p[1].toFixed(1)}`).join(' L ')} Z`;
  const top = `M ${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)} L ${pts[1][0].toFixed(1)},${pts[1][1].toFixed(1)} L ${pts[2][0].toFixed(1)},${pts[2][1].toFixed(1)} L ${pts[3][0].toFixed(1)},${pts[3][1].toFixed(1)} L ${pts[4][0].toFixed(1)},${pts[4][1].toFixed(1)} L 4,0 L -6,1 Z`;
  const side = `M ${pts[4][0].toFixed(1)},${pts[4][1].toFixed(1)} L ${pts[5][0].toFixed(1)},${pts[5][1].toFixed(1)} L ${pts[6][0].toFixed(1)},${pts[6][1].toFixed(1)} L ${pts[0][0].toFixed(1)},${pts[0][1].toFixed(1)} L -6,1 L 4,0 Z`;
  return { base, top, side };
}