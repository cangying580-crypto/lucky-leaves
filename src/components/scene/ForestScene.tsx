import {
  memo,
  useCallback,
  useEffect,
  useId,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type PointerEvent as ReactPointerEvent,
  type CSSProperties,
} from 'react';
import type { GrowthEvent, Tree } from '../../types';
import { generateTreeVisual, mulberry32, hashSeed } from '../../lib/treeGen';
import { TreeSprite } from './TreeSprite';
import { polyBlob, polyStone, POLY_TONES } from './lowpoly';

interface ViewBox {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface Burst {
  key: number;
  x: number;
  y: number;
}

interface Props {
  trees: Tree[];
  eventsByTree: Map<string, GrowthEvent[]>;
  birthYear: number;
  selectedTreeId: string | null;
  onSelect: (id: string | null) => void;
  burst: Burst | null;
  interactive?: boolean;
}

const SCENE_W = 1600;
const SCENE_H = 900;
const EMPTY_EVENTS: GrowthEvent[] = [];
const POND_D =
  'M 486,486 C 560,352 756,306 902,336 C 1042,364 1118,436 1128,484 C 1116,530 1018,606 878,626 C 716,648 560,606 486,486 Z';

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

/* 低多边形叶团：远景用 soft 降低对比，形成空气透视 */
function FacetBlob({ cx, cy, r, tone, seed, n = 12, soft = 0, p }: { cx: number; cy: number; r: number; tone: number; seed: number; n?: number; soft?: number; p: string }) {
  const pb = useMemo(() => polyBlob(cx, cy, r, tone, seed, n, 0.3 + soft * 0.4), [cx, cy, r, tone, seed, n, soft]);
  const tones = POLY_TONES[tone % 3];
  return (
    <g>
      <path d={pb.outline} fill={tones[2]} />
      {pb.facets.map((f, j) => (
        <path key={j} d={f.d} fill={f.fill} opacity={(f.opacity ?? 1) * (1 - soft * 0.55)} />
      ))}
      <path d={pb.under} fill={tones[0]} opacity={0.28 - soft * 0.16} />
      <circle cx={cx} cy={cy} r={r * 0.96} fill={`url(#${p}-can${tone % 3})`} opacity={0.34 - soft * 0.14} />
      <path d={pb.rim} fill="none" stroke={tones[4]} strokeWidth={r * 0.06} opacity={0.55 - soft * 0.3} />
    </g>
  );
}

/* ---------- 装饰树 ---------- */

const DECO_TONES: [string, string, string][] = [
  ['#4f9a41', '#63b350', '#8fce6f'],
  ['#3f8a6a', '#57ab8b', '#7fc9a4'],
  ['#5aa845', '#79c257', '#a5d97f'],
];

function DecoTree({ x, y, s, tone, p }: { x: number; y: number; s: number; tone: number; p: string }) {
  const seed = hashSeed(`deco-${x}-${y}`);
  const blobs = [
    { cx: -20, cy: -52, r: 24 },
    { cx: 20, cy: -52, r: 24 },
    { cx: 0, cy: -66, r: 30 },
    { cx: -8, cy: -78, r: 20 },
    { cx: 14, cy: -72, r: 15 },
  ];
  return (
    <g transform={`translate(${x},${y}) scale(${s})`}>
      <ellipse cx="0" cy="7" rx="48" ry="11" fill={`url(#${p}-shadow)`} />
      <path d="M -7,4 C -6,-16 -4,-30 -3,-44 L 3,-44 C 4,-30 6,-16 7,4 C 3,7 -3,7 -7,4 Z" fill={`url(#${p}-bark)`} />
      <path d="M -6,4 C -5,-16 -3,-30 -2.4,-44 L -0.6,-44 C -1.4,-28 -2.6,-14 -3.2,4 Z" fill="#c99a66" opacity="0.55" />
      <path d="M 2,-44 C 3,-30 5,-16 6.4,4 L 4.4,4 C 3.4,-14 2.4,-28 1.4,-44 Z" fill="#4a2d15" opacity="0.4" />
      <path d="M 0,-30 L -16,-44 M 0,-24 L 15,-38" stroke={`url(#${p}-bark)`} strokeWidth="4.5" strokeLinecap="round" />
      {blobs.map((b, i) => (
        <FacetBlob key={i} cx={b.cx} cy={b.cy} r={b.r} tone={tone % 3} seed={seed + i * 131} n={9} p={p} />
      ))}
    </g>
  );
}

const DECO_TREES: { x: number; y: number; s: number; t: number }[] = [
  { x: 350, y: 336, s: 0.82, t: 0 },
  { x: 1250, y: 336, s: 0.82, t: 1 },
  { x: 238, y: 502, s: 0.9, t: 2 },
  { x: 1362, y: 502, s: 0.9, t: 0 },
  { x: 560, y: 664, s: 0.85, t: 1 },
  { x: 1040, y: 664, s: 0.85, t: 2 },
  { x: 690, y: 300, s: 0.68, t: 2 },
  { x: 912, y: 300, s: 0.68, t: 0 },
  { x: 420, y: 560, s: 0.6, t: 1 },
  { x: 1180, y: 560, s: 0.6, t: 2 },
];

/* ---------- 静态背景 ---------- */

interface Stone {
  x: number;
  y: number;
  rot: number;
  s: number;
  tone: number;
}

const SceneBackdrop = memo(function SceneBackdrop({ p }: { p: string }) {
  const pondRef = useRef<SVGPathElement>(null);
  const [stones, setStones] = useState<Stone[]>([]);

  useLayoutEffect(() => {
    const path = pondRef.current;
    if (!path) return;
    const total = path.getTotalLength();
    const n = 64;
    const next: Stone[] = [];
    for (let i = 0; i < n; i++) {
      const l = (i / n) * total;
      const a = path.getPointAtLength(l);
      const b = path.getPointAtLength((l + 3) % total);
      const nx = a.x - 800;
      const ny = a.y - 480;
      const nl = Math.hypot(nx, ny) || 1;
      const off = 3 + ((i * 29) % 3) * 2.4;
      next.push({
        x: a.x + (nx / nl) * off,
        y: a.y + (ny / nl) * off,
        rot: (Math.atan2(b.y - a.y, b.x - a.x) * 180) / Math.PI + ((i % 5) - 2) * 7,
        s: 0.75 + ((i * 53) % 10) / 13,
        tone: i % 3 === 0 ? 1 : 0,
      });
    }
    setStones(next);
  }, []);

  const deco = useMemo(() => {
    const rnd = mulberry32(20261126);
    const borderBack = Array.from({ length: 34 }, (_, i) => ({
      x: -70 + i * 50 + rnd() * 18,
      y: 14 + rnd() * 40,
      r: 34 + rnd() * 18,
      t: Math.floor(rnd() * 3),
      ph: rnd() * 6,
    }));
    const borderFront = Array.from({ length: 26 }, (_, i) => ({
      x: -40 + i * 66 + rnd() * 24,
      y: 96 + rnd() * 30,
      r: 30 + rnd() * 20,
      t: Math.floor(rnd() * 3),
      ph: rnd() * 6,
    }));
    const sideLeft = Array.from({ length: 10 }, (_, i) => ({
      x: -24 + rnd() * 56,
      y: 190 + i * 70 + rnd() * 22,
      r: 30 + rnd() * 24,
      t: Math.floor(rnd() * 3),
      ph: rnd() * 6,
    }));
    const sideRight = Array.from({ length: 10 }, (_, i) => ({
      x: 1566 + rnd() * 56,
      y: 176 + i * 72 + rnd() * 22,
      r: 30 + rnd() * 24,
      t: Math.floor(rnd() * 3),
      ph: rnd() * 6,
    }));
    const patches = Array.from({ length: 20 }, () => ({
      x: 120 + rnd() * 1360,
      y: 250 + rnd() * 600,
      n: 6 + Math.floor(rnd() * 5),
      c: ['#fffdf5', '#ef7fae', '#f2b134', '#c9b6f2'][Math.floor(rnd() * 4)],
      spread: 26 + rnd() * 30,
      seed: rnd(),
    }));
    const rocks = Array.from({ length: 11 }, () => ({
      x: 100 + rnd() * 1400,
      y: 260 + rnd() * 600,
      s: 0.6 + rnd() * 0.9,
      rot: rnd() * 30 - 15,
    }));
    const mottle = Array.from({ length: 12 }, () => ({
      x: rnd() * 1600,
      y: 180 + rnd() * 680,
      rx: 130 + rnd() * 200,
      ry: 46 + rnd() * 70,
      light: rnd() > 0.5,
    }));
    const pollen = Array.from({ length: 12 }, () => ({
      x: rnd() * 1600,
      y: 220 + rnd() * 600,
      d: rnd() * 8,
      dur: 7 + rnd() * 8,
    }));
    const tufts = Array.from({ length: 240 }, () => ({
      x: 40 + rnd() * 1520,
      y: 230 + rnd() * 650,
      s: 0.9 + rnd() * 0.9,
      flip: rnd() > 0.5 ? 1 : -1,
      tone: Math.floor(rnd() * 3),
    }));
    const dots = Array.from({ length: 80 }, () => ({
      x: 60 + rnd() * 1480,
      y: 240 + rnd() * 640,
      r: 1.2 + rnd() * 1.6,
      c: rnd() > 0.6 ? '#fffdf5' : rnd() > 0.5 ? '#ffd76a' : '#f7c8dc',
    }));
    const tris = Array.from({ length: 34 }, () => {
      const x = rnd() * 1600;
      const y = 170 + rnd() * 720;
      const s = 60 + rnd() * 150;
      const a = rnd() * Math.PI * 2;
      const pt = (k: number) => {
        const aa = a + (k / 3) * Math.PI * 2 + rnd() * 0.5;
        const rr = s * (0.6 + rnd() * 0.6);
        return `${(x + Math.cos(aa) * rr).toFixed(0)},${(y + Math.sin(aa) * rr * 0.55).toFixed(0)}`;
      };
      return {
        d: `M ${pt(0)} L ${pt(1)} L ${pt(2)} Z`,
        fill: ['#8cc96b', '#6fb954', '#9ad478', '#5fae47', '#b6e795'][Math.floor(rnd() * 5)],
        op: 0.1 + rnd() * 0.14,
      };
    });
    return { borderBack, borderFront, sideLeft, sideRight, patches, rocks, mottle, pollen, tufts, dots, tris };
  }, []);

  const inPond = (x: number, y: number) => {
    const dx = (x - 800) / 360;
    const dy = (y - 480) / 170;
    return dx * dx + dy * dy < 1.3;
  };

  const fence = (x1: number, y1: number, x2: number, y2: number, posts: number) => {
    const items = [];
    for (let i = 0; i <= posts; i++) {
      const t = i / posts;
      const x = x1 + (x2 - x1) * t;
      const y = y1 + (y2 - y1) * t;
      items.push(
        <g key={i}>
          <ellipse cx={x} cy={y + 5} rx="9" ry="3" fill={`url(#${p}-shadow)`} />
          <rect x={x - 4} y={y - 26} width="8" height="30" rx="3" fill={`url(#${p}-wood)`} stroke="#8a5a33" strokeWidth="1.2" />
          <path d={`M ${x + 0.6},${y - 25} L ${x + 3.4},${y - 24} L ${x + 3.4},${y + 2} L ${x + 0.6},${y + 3} Z`} fill="#6d4426" opacity="0.35" />
          <path d={`M ${x - 3.4},${y - 25} L ${x + 3.4},${y - 25} L ${x + 1.6},${y - 27.4} L ${x - 1.8},${y - 27.4} Z`} fill="#e8c793" opacity="0.9" />
          <line x1={x - 1.4} y1={y - 22} x2={x - 1.4} y2={y - 2} stroke="#e8c793" strokeWidth="1.2" opacity="0.7" />
          <circle cx={x} cy={y - 17} r="1.1" fill="#6d4426" />
        </g>,
      );
    }
    return (
      <g>
        <line x1={x1} y1={y1 - 18} x2={x2} y2={y2 - 18} stroke="#c99a66" strokeWidth="5" strokeLinecap="round" />
        <line x1={x1} y1={y1 - 19.4} x2={x2} y2={y2 - 19.4} stroke="#e8c793" strokeWidth="1.4" strokeLinecap="round" opacity="0.8" />
        <line x1={x1} y1={y1 - 8} x2={x2} y2={y2 - 8} stroke="#b98a5a" strokeWidth="4.4" strokeLinecap="round" />
        {items}
      </g>
    );
  };

  const GRASS = ['#4f9a41', '#6db854', '#8fce6f'];

  return (
    <g>
      <defs>
        <radialGradient id={`${p}-meadow`} cx="0.5" cy="0.42" r="0.85">
          <stop offset="0" stopColor="#a3d473" />
          <stop offset="0.45" stopColor="#7fbf5e" />
          <stop offset="0.8" stopColor="#63b04a" />
          <stop offset="1" stopColor="#4c9a3e" />
        </radialGradient>
        <radialGradient id={`${p}-lake`} cx="0.45" cy="0.38" r="0.8">
          <stop offset="0" stopColor="#a8ecdd" />
          <stop offset="0.4" stopColor="#5cc9bc" />
          <stop offset="0.75" stopColor="#2ba39c" />
          <stop offset="1" stopColor="#14767c" />
        </radialGradient>
        <linearGradient id={`${p}-bark`} x1="0" y1="0" x2="1" y2="0">
          <stop offset="0" stopColor="#a9764a" />
          <stop offset="0.45" stopColor="#8a5a33" />
          <stop offset="1" stopColor="#5f3c20" />
        </linearGradient>
        <linearGradient id={`${p}-gold`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ffe08a" />
          <stop offset="0.55" stopColor="#f2b134" />
          <stop offset="1" stopColor="#d9820f" />
        </linearGradient>
        <linearGradient id={`${p}-leafgreen`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#a5d97f" />
          <stop offset="1" stopColor="#4f9a41" />
        </linearGradient>
        <radialGradient id={`${p}-glow`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#ffe9a3" stopOpacity="0.85" />
          <stop offset="0.7" stopColor="#ffd76a" stopOpacity="0.35" />
          <stop offset="1" stopColor="#ffd76a" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${p}-wood`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#e0b077" />
          <stop offset="0.5" stopColor="#c99a66" />
          <stop offset="1" stopColor="#a9764a" />
        </linearGradient>
        {DECO_TONES.map(([dark, mid, light], i) => (
          <radialGradient key={i} id={`${p}-can${i}`} cx="0.36" cy="0.3" r="0.85">
            <stop offset="0" stopColor={light} />
            <stop offset="0.55" stopColor={mid} />
            <stop offset="1" stopColor={dark} />
          </radialGradient>
        ))}
        <radialGradient id={`${p}-canshade`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#2f6e33" stopOpacity="0.34" />
          <stop offset="1" stopColor="#2f6e33" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${p}-canlight`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#eaf7c8" stopOpacity="0.42" />
          <stop offset="1" stopColor="#eaf7c8" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${p}-shadow`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#2f6e33" stopOpacity="0.32" />
          <stop offset="0.7" stopColor="#2f6e33" stopOpacity="0.14" />
          <stop offset="1" stopColor="#2f6e33" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${p}-patchlight`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#e8f7c0" stopOpacity="0.65" />
          <stop offset="1" stopColor="#e8f7c0" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${p}-patchdark`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#4f9a41" stopOpacity="0.3" />
          <stop offset="1" stopColor="#4f9a41" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${p}-stone`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ece2c8" />
          <stop offset="0.6" stopColor="#cfc4a8" />
          <stop offset="1" stopColor="#a89c7e" />
        </linearGradient>
        <linearGradient id={`${p}-stone2`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#ddd6c2" />
          <stop offset="0.6" stopColor="#bab29c" />
          <stop offset="1" stopColor="#948c76" />
        </linearGradient>
        <radialGradient id={`${p}-softcloud`} cx="0.5" cy="0.45" r="0.55">
          <stop offset="0" stopColor="#ffffff" stopOpacity="0.98" />
          <stop offset="0.65" stopColor="#ffffff" stopOpacity="0.85" />
          <stop offset="1" stopColor="#ffffff" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${p}-cloudshade`} cx="0.5" cy="0.5" r="0.5">
          <stop offset="0" stopColor="#cfe3f2" stopOpacity="0.75" />
          <stop offset="1" stopColor="#cfe3f2" stopOpacity="0" />
        </radialGradient>
        <linearGradient id={`${p}-haze`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#f4fbe8" stopOpacity="0.68" />
          <stop offset="1" stopColor="#f4fbe8" stopOpacity="0" />
        </linearGradient>
        <radialGradient id={`${p}-warm`} gradientUnits="userSpaceOnUse" cx="420" cy="140" r="980">
          <stop offset="0" stopColor="#fff3c4" stopOpacity="0.26" />
          <stop offset="1" stopColor="#fff3c4" stopOpacity="0" />
        </radialGradient>
        <radialGradient id={`${p}-vignette`} gradientUnits="userSpaceOnUse" cx="800" cy="460" r="1050">
          <stop offset="0" stopColor="#1d3a24" stopOpacity="0" />
          <stop offset="0.66" stopColor="#1d3a24" stopOpacity="0" />
          <stop offset="1" stopColor="#1d3a24" stopOpacity="0.24" />
        </radialGradient>
        <pattern id={`${p}-tooth`} width="26" height="26" patternUnits="userSpaceOnUse">
          <circle cx="4" cy="6" r="0.9" fill="#ffffff" opacity="0.06" />
          <circle cx="17" cy="14" r="0.8" fill="#ffffff" opacity="0.05" />
          <circle cx="9" cy="21" r="0.9" fill="#2f6e33" opacity="0.05" />
          <path d="M 20,3 l 3,2" stroke="#2f6e33" strokeWidth="0.7" opacity="0.05" />
        </pattern>
        <clipPath id={`${p}-pondclip`}>
          <path d={POND_D} />
        </clipPath>
        <linearGradient id={`${p}-reflectfade`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor="#22624f" stopOpacity="0.22" />
          <stop offset="0.7" stopColor="#22624f" stopOpacity="0.09" />
          <stop offset="1" stopColor="#22624f" stopOpacity="0" />
        </linearGradient>
        <filter id={`${p}-fgblur`} x="-40%" y="-40%" width="180%" height="180%">
          <feGaussianBlur stdDeviation="4.5" />
        </filter>
        <filter id={`${p}-refblur`} x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="2.2" />
        </filter>
      </defs>

      {/* 草甸 */}
      <rect x="-1400" y="-300" width="4400" height="1600" fill={`url(#${p}-meadow)`} />
      {deco.mottle.map((m, i) => (
        <ellipse key={i} cx={m.x} cy={m.y} rx={m.rx} ry={m.ry} fill={`url(#${p}-${m.light ? 'patchlight' : 'patchdark'})`} />
      ))}
      {/* 低多边形草地明暗面 */}
      {deco.tris.map((t, i) => (
        <path key={`tr${i}`} d={t.d} fill={t.fill} opacity={t.op} />
      ))}
      <path d="M -200,640 L 520,240 L 900,240 L 180,700 Z" fill="#e8f7c0" opacity="0.06" />
      <path d="M 700,900 L 1300,300 L 1560,300 L 1020,900 Z" fill="#e8f7c0" opacity="0.05" />
      <rect x="-1400" y="-300" width="4400" height="1600" fill={`url(#${p}-tooth)`} />

      {/* 远景丘陵 */}
      <path d="M -200,150 C 200,60 500,110 800,80 C 1100,50 1400,110 1800,70 L 1800,-300 L -200,-300 Z" fill="#bfe3a0" opacity="0.55" />
      <path d="M -200,196 C 300,124 700,164 1000,132 C 1300,102 1600,152 1800,122 L 1800,-300 L -200,-300 Z" fill="#a8d88c" opacity="0.5" />

      {/* 边界树林 */}
      {deco.borderBack.map((b, i) => (
        <g key={`b${i}`} opacity="0.85">
          <FacetBlob cx={b.x} cy={b.y} r={b.r} tone={b.t} seed={i * 97 + 11} n={10} soft={1} p={p} />
        </g>
      ))}
      <rect x="-1400" y="-300" width="4400" height="470" fill={`url(#${p}-haze)`} />
      {deco.borderFront.map((b, i) => (
        <FacetBlob key={`f${i}`} cx={b.x} cy={b.y} r={b.r} tone={b.t} seed={i * 131 + 5} n={11} soft={0.5} p={p} />
      ))}
      {[...deco.sideLeft, ...deco.sideRight].map((b, i) => (
        <FacetBlob key={`s${i}`} cx={b.x} cy={b.y} r={b.r} tone={b.t} seed={i * 173 + 29} n={11} soft={0.6} p={p} />
      ))}

      {/* 栅栏 */}
      {fence(70, 262, 430, 176, 8)}
      {fence(150, 842, 640, 878, 10)}
      {fence(960, 878, 1450, 842, 10)}

      {/* 草叶与细花 */}
      {deco.tufts.filter((t) => !inPond(t.x, t.y)).map((t, i) => (
        <g key={`t${i}`} transform={`translate(${t.x},${t.y}) scale(${t.s * t.flip},${t.s})`} opacity="0.75">
          <path d="M 0,0 C -1,-5 -3,-8 -6,-11" stroke={GRASS[t.tone]} strokeWidth="1.8" fill="none" strokeLinecap="round" />
          <path d="M 1,0 C 1,-6 1,-9 0,-13" stroke={GRASS[(t.tone + 1) % 3]} strokeWidth="1.8" fill="none" strokeLinecap="round" />
          <path d="M 2,0 C 3,-5 5,-8 8,-10" stroke={GRASS[t.tone]} strokeWidth="1.8" fill="none" strokeLinecap="round" />
          <path d="M -2,0 C -3,-4 -5,-6 -8,-7" stroke={GRASS[(t.tone + 2) % 3]} strokeWidth="1.6" fill="none" strokeLinecap="round" />
        </g>
      ))}
      {deco.dots.filter((d) => !inPond(d.x, d.y)).map((d, i) => (
        <circle key={`d${i}`} cx={d.x} cy={d.y} r={d.r} fill={d.c} opacity="0.8" />
      ))}

      {/* 石头 */}
      {deco.rocks.filter((r) => !inPond(r.x, r.y)).map((r, i) => {
        const sh = polyStone(i * 57 + 3);
        return (
          <g key={i} transform={`translate(${r.x},${r.y}) rotate(${r.rot}) scale(${r.s * 1.5})`}>
            <ellipse cx="0" cy="6" rx="20" ry="6" fill={`url(#${p}-shadow)`} />
            <path d={sh.base} fill={`url(#${p}-stone)`} stroke="#a89c7e" strokeWidth="1" />
            <path d={sh.top} fill="#f2ead2" opacity="0.8" />
            <path d={sh.side} fill="#8f8468" opacity="0.42" />
            <circle cx="9" cy="-3" r="2.4" fill="#79c257" opacity="0.7" />
            <circle cx="-8" cy="4" r="1.6" fill="#79c257" opacity="0.5" />
          </g>
        );
      })}

      {/* 花丛 */}
      {deco.patches.filter((f) => !inPond(f.x, f.y)).map((f, i) => {
        const rnd = mulberry32(Math.floor(f.seed * 1e9));
        return (
          <g key={i}>
            {Array.from({ length: f.n }, (_, j) => {
              const fx = f.x + (rnd() - 0.5) * f.spread * 2;
              const fy = f.y + (rnd() - 0.5) * f.spread;
              const s = 0.8 + rnd() * 0.7;
              return (
                <g key={j} transform={`translate(${fx},${fy}) scale(${s})`}>
                  <ellipse cx="0" cy="9" rx="6" ry="2" fill={`url(#${p}-shadow)`} />
                  <path d="M 0,8 C 0,4 0,2 0,0" stroke="#4f9a41" strokeWidth="1.6" fill="none" />
                  <path d="M 0,5 C -3,4 -5,3 -6,1" stroke="#5aa845" strokeWidth="1.4" fill="none" strokeLinecap="round" />
                  {[0, 72, 144, 216, 288].map((deg) => (
                    <ellipse key={deg} cx="0" cy="-3.4" rx="2.3" ry="3.4" fill={j % 3 === 0 ? '#fffdf5' : f.c} transform={`rotate(${deg})`} />
                  ))}
                  <circle r="1.9" fill="#f2b134" />
                  <circle cx="-0.5" cy="-0.6" r="0.7" fill="#fff8e7" />
                </g>
              );
            })}
          </g>
        );
      })}

      {/* 叶形湖 */}
      <g>
        <path d="M 486,486 C 462,468 442,448 420,420" stroke="#d9d0b0" strokeWidth="26" strokeLinecap="round" fill="none" />
        <path d="M 486,486 C 462,468 442,448 420,420" stroke="#2ba39c" strokeWidth="16" strokeLinecap="round" fill="none" />
        <path d={POND_D} fill="none" stroke="#d9d0b0" strokeWidth="30" strokeLinejoin="round" opacity="0.95" />
        <path ref={pondRef} d={POND_D} fill={`url(#${p}-lake)`} />
        {/* 水面 low-poly 光面 */}
        <g clipPath={`url(#${p}-pondclip)`} opacity="0.62">
          {[
            { d: 'M 486,486 L 700,330 L 820,470 Z', f: '#7fd8c8', o: 0.2 },
            { d: 'M 700,330 L 902,336 L 820,470 Z', f: '#a8ecdd', o: 0.22 },
            { d: 'M 902,336 L 1128,484 L 820,470 Z', f: '#4fc0b4', o: 0.18 },
            { d: 'M 486,486 L 820,470 L 700,620 Z', f: '#2ba39c', o: 0.16 },
            { d: 'M 820,470 L 1128,484 L 940,610 Z', f: '#1d8f90', o: 0.16 },
            { d: 'M 700,620 L 820,470 L 940,610 Z', f: '#5cc9bc', o: 0.18 },
            { d: 'M 560,420 L 760,380 L 680,470 Z', f: '#bff2e6', o: 0.16 },
            { d: 'M 860,400 L 1040,430 L 940,490 Z', f: '#bff2e6', o: 0.12 },
            { d: 'M 640,540 L 800,520 L 760,600 Z', f: '#14767c', o: 0.14 },
            { d: 'M 880,540 L 1040,520 L 960,600 Z', f: '#14767c', o: 0.12 },
          ].map((t, i) => (
            <path key={i} d={t.d} fill={t.f} opacity={t.o} />
          ))}
          <path d="M 486,470 L 1128,452 L 1128,478 L 486,498 Z" fill="#eafff5" opacity="0.1" />
        </g>
        <path d={POND_D} fill="none" stroke="#0f6b70" strokeWidth="10" opacity="0.22" />
        {/* 岸边树影倒映：镜像团块 + 垂直衰减 */}
        {[
          { cx: 700, cy: 372, rx: 66, ry: 26 },
          { cx: 890, cy: 360, rx: 56, ry: 22 },
          { cx: 1030, cy: 412, rx: 48, ry: 19 },
        ].map((r, i) => (
          <g key={i} filter={`url(#${p}-refblur)`}>
            <path
              d={`M ${r.cx - r.rx},${r.cy} L ${r.cx - r.rx * 0.72},${r.cy + r.ry * 0.7} L ${r.cx - r.rx * 0.36},${r.cy + r.ry * 0.5} L ${r.cx - r.rx * 0.08},${r.cy + r.ry * 1.25} L ${r.cx + r.rx * 0.22},${r.cy + r.ry * 0.75} L ${r.cx + r.rx * 0.56},${r.cy + r.ry * 1.05} L ${r.cx + r.rx * 0.82},${r.cy + r.ry * 0.55} L ${r.cx + r.rx},${r.cy} Z`}
              fill={`url(#${p}-reflectfade)`}
            />
            <path d={`M ${r.cx - r.rx * 0.6},${r.cy + r.ry * 0.5} L ${r.cx + r.rx * 0.5},${r.cy + r.ry * 0.42}`} stroke="#bff2e6" strokeWidth="1.6" opacity="0.35" fill="none" />
            <path d={`M ${r.cx - r.rx * 0.34},${r.cy + r.ry * 1.05} L ${r.cx + r.rx * 0.3},${r.cy + r.ry * 0.98}`} stroke="#bff2e6" strokeWidth="1.3" opacity="0.25" fill="none" />
          </g>
        ))}
        {/* 水光 */}
        <path d="M 512,486 C 700,474 950,474 1108,484" stroke="#eafff5" strokeWidth="2.6" opacity="0.45" fill="none" />
        {[
          'M 640,480 C 660,440 700,410 760,392',
          'M 780,478 C 800,442 850,414 918,400',
          'M 920,478 C 944,452 990,432 1044,424',
          'M 640,492 C 664,532 716,562 788,578',
          'M 790,492 C 816,528 872,556 946,568',
          'M 930,490 C 956,516 1000,536 1052,542',
        ].map((d, i) => (
          <path key={i} d={d} stroke="#eafff5" strokeWidth="2" opacity="0.3" fill="none" />
        ))}
        <path d="M 600,452 C 680,446 760,450 830,444" stroke="#bff2e6" strokeWidth="5" opacity="0.22" fill="none" strokeLinecap="round" />
        <path d="M 760,560 C 840,566 920,560 990,552" stroke="#bff2e6" strokeWidth="5" opacity="0.18" fill="none" strokeLinecap="round" />
        <ellipse className="lake-shimmer" cx="760" cy="430" rx="130" ry="26" fill="#eafff5" opacity="0.25" />
        <ellipse className="lake-shimmer lake-shimmer-2" cx="950" cy="540" rx="90" ry="18" fill="#eafff5" opacity="0.2" />
        {[
          { cx: 680, cy: 520, d: '0s' },
          { cx: 980, cy: 440, d: '2.4s' },
          { cx: 860, cy: 580, d: '4.2s' },
        ].map((r, i) => (
          <ellipse key={i} className="ripple" cx={r.cx} cy={r.cy} rx="26" ry="8" fill="none" stroke="#eafff5" strokeWidth="2" style={{ animationDelay: r.d }} />
        ))}
        {/* 睡莲 */}
        <g transform="translate(640,540)">
          <ellipse rx="24" ry="13" fill={`url(#${p}-can0)`} stroke="#33803f" strokeWidth="1.4" />
          <path d="M 0,0 L 18,-9 L 20,-2 Z" fill="#2ba39c" />
          <path d="M -14,-2 C -6,-6 6,-6 14,-2" stroke="#a5d97f" strokeWidth="1.2" fill="none" opacity="0.8" />
          <circle cx="4" cy="-8" r="5" fill="#ef7fae" />
          <circle cx="4" cy="-8" r="2" fill="#ffd76a" />
        </g>
        <g transform="translate(900,420) scale(0.8)">
          <ellipse rx="22" ry="12" fill={`url(#${p}-can2)`} stroke="#33803f" strokeWidth="1.4" />
          <path d="M 0,0 L -16,-8 L -18,-1 Z" fill="#2ba39c" />
        </g>
        {/* 锦鲤 */}
        <g>
          <g>
            <ellipse rx="13" ry="5.5" fill="#e8604c" />
            <path d="M 12,0 L 21,-5 L 21,5 Z" fill="#e8604c" />
            <path d="M -2,-4 C 2,-7 6,-7 9,-4" stroke="#fdf6e3" strokeWidth="1.4" fill="none" opacity="0.8" />
            <ellipse cx="-4" cy="-1" rx="4" ry="2.4" fill="#fdf6e3" opacity="0.85" />
            <animateMotion dur="22s" repeatCount="indefinite" rotate="auto" path="M 640,470 C 760,400 960,410 1040,470 C 960,540 760,550 640,470 Z" />
          </g>
          <g>
            <ellipse rx="10" ry="4.2" fill="#fdf6e3" />
            <path d="M 9,0 L 17,-4 L 17,4 Z" fill="#fdf6e3" />
            <ellipse cx="-2" cy="-1" rx="3.4" ry="2" fill="#e8604c" opacity="0.9" />
            <animateMotion dur="30s" begin="-9s" repeatCount="indefinite" rotate="auto" path="M 980,520 C 860,570 700,560 620,510 C 700,450 880,450 980,520 Z" />
          </g>
        </g>
        {/* 石砌岸：逐石采样 + low-poly 石面 */}
        {stones.map((s, i) => {
          const sh = polyStone(i * 31 + 7);
          return (
            <g key={i} transform={`translate(${s.x},${s.y}) rotate(${s.rot}) scale(${s.s})`}>
              <path d={sh.base} fill={`url(#${p}-${s.tone ? 'stone2' : 'stone'})`} stroke="#9a8f72" strokeWidth="1" />
              <path d={sh.top} fill="#f2ead2" opacity="0.75" />
              <path d={sh.side} fill="#8f8468" opacity="0.4" />
              {i % 4 === 0 && <circle cx="7" cy="3" r="2.2" fill="#79c257" opacity="0.65" />}
            </g>
          );
        })}
        {/* 木栈桥 */}
        <g transform="translate(1092,602) rotate(216)">
          <ellipse cx="36" cy="26" rx="52" ry="10" fill="#0f6b70" opacity="0.25" />
          <rect x="-8" y="-6" width="86" height="30" rx="4" fill={`url(#${p}-wood)`} stroke="#8a5a33" strokeWidth="1.8" />
          <rect x="-6" y="17" width="82" height="6" rx="3" fill="#6d4426" opacity="0.4" />
          <rect x="-6" y="-5" width="82" height="4" rx="2" fill="#e8c793" opacity="0.5" />
          {[8, 24, 40, 56, 72].map((x) => (
            <g key={x}>
              <line x1={x} y1="-4" x2={x} y2="22" stroke="#8a5a33" strokeWidth="1.4" opacity="0.7" />
              <line x1={x + 3} y1="-3" x2={x + 3} y2="21" stroke="#e8c793" strokeWidth="1" opacity="0.55" />
            </g>
          ))}
          <rect x="-4" y="22" width="7" height="14" rx="2" fill="#8a5a33" />
          <rect x="66" y="22" width="7" height="14" rx="2" fill="#8a5a33" />
        </g>
        {/* 木牌 */}
        <g transform="translate(1005,668)">
          <ellipse cx="0" cy="35" rx="14" ry="4" fill={`url(#${p}-shadow)`} />
          <rect x="-3" y="0" width="6" height="34" rx="2" fill={`url(#${p}-bark)`} />
          <rect x="-26" y="-20" width="52" height="24" rx="6" fill={`url(#${p}-wood)`} stroke="#8a5a33" strokeWidth="1.8" />
          <path d="M 18,-19 L 25,-17 L 25,1 L 18,3 Z" fill="#8a5a33" opacity="0.35" />
          <rect x="-24" y="-19" width="48" height="4" rx="2" fill="#e8c793" opacity="0.55" />
          <line x1="-20" y1="-16" x2="20" y2="-16" stroke="#e8c793" strokeWidth="1.2" opacity="0.7" />
          <circle cx="-20" cy="-8" r="1.2" fill="#6d4426" />
          <circle cx="20" cy="-8" r="1.2" fill="#6d4426" />
          <text x="0" y="-4" textAnchor="middle" fontSize="11" fill="#5a381e" fontWeight="700">
            幸运湖
          </text>
        </g>
      </g>

      {/* 草甸散点树 */}
      {DECO_TREES.map((d, i) => (
        <DecoTree key={i} x={d.x} y={d.y} s={d.s} tone={d.t} p={p} />
      ))}

      {/* 风车 */}
      <g transform="translate(210,772)">
        <ellipse cx="0" cy="47" rx="44" ry="10" fill={`url(#${p}-shadow)`} />
        <path d="M -22,46 L -13,-16 L 13,-16 L 22,46 Z" fill={`url(#${p}-stone)`} stroke="#a89c7e" strokeWidth="1.6" />
        <path d="M 5,-16 L 13,-16 L 22,46 L 10,46 Z" fill="#8f8468" opacity="0.45" />
        <path d="M -14,40 L -8,-12" stroke="#f2ead2" strokeWidth="2.4" opacity="0.8" />
        <path d="M -16,-16 L 0,-34 L 16,-16 Z" fill={`url(#${p}-wood)`} stroke="#8a5a33" strokeWidth="1.6" />
        <path d="M 0,-34 L 16,-16 L 0,-16 Z" fill="#8a5a33" opacity="0.5" />
        <rect x="-6" y="24" width="12" height="22" rx="5" fill="#8a5a33" />
        <circle cx="0" cy="30" r="1.2" fill="#e8c793" />
        <g transform="translate(0,-24)">
          <g className="windmill-spin">
            {[0, 90, 180, 270].map((deg) => (
              <g key={deg} transform={`rotate(${deg})`}>
                <rect x="-3.5" y="-52" width="7" height="52" rx="3" fill={`url(#${p}-wood)`} stroke="#8a5a33" strokeWidth="1.2" />
                <rect x="-8" y="-50" width="16" height="26" rx="4" fill="#fffdf5" opacity="0.9" stroke="#b98a5a" strokeWidth="1.1" />
                <line x1="-8" y1="-42" x2="8" y2="-42" stroke="#b98a5a" strokeWidth="0.9" opacity="0.7" />
                <line x1="-8" y1="-33" x2="8" y2="-33" stroke="#b98a5a" strokeWidth="0.9" opacity="0.7" />
              </g>
            ))}
            <circle r="5" fill="#8a5a33" />
            <circle r="2" fill="#e8c793" />
          </g>
        </g>
      </g>

      {/* 漂浮花粉 */}
      {deco.pollen.map((pt, i) => (
        <circle key={i} className="pollen" cx={pt.x} cy={pt.y} r="2.6" fill="#fff8d0" opacity="0.85" style={{ animationDelay: `${pt.d}s`, animationDuration: `${pt.dur}s` }} />
      ))}
    </g>
  );
});

/* ---------- 前景光晕与云 ---------- */

const ForeClouds = memo(function ForeClouds({ p }: { p: string }) {
  const cloud = (cx: number, cy: number, s: number, cls: string) => (
    <g transform={`translate(${cx},${cy}) scale(${s})`}>
      <g className={`cloud-bob ${cls}`}>
        <ellipse cx="0" cy="14" rx="86" ry="24" fill={`url(#${p}-cloudshade)`} />
        <ellipse cx="0" cy="0" rx="76" ry="34" fill={`url(#${p}-softcloud)`} />
        <ellipse cx="-54" cy="10" rx="50" ry="26" fill={`url(#${p}-softcloud)`} />
        <ellipse cx="56" cy="10" rx="54" ry="27" fill={`url(#${p}-softcloud)`} />
        <ellipse cx="10" cy="-20" rx="48" ry="28" fill={`url(#${p}-softcloud)`} />
        <ellipse cx="-24" cy="-8" rx="30" ry="18" fill="#ffffff" opacity="0.75" />
      </g>
    </g>
  );
  return (
    <g pointerEvents="none">
      <rect x="-1400" y="-300" width="4400" height="1600" fill={`url(#${p}-warm)`} />
      <rect x="-1400" y="-300" width="4400" height="1600" fill={`url(#${p}-vignette)`} />
      {cloud(-40, 500, 1.35, 'cb-a')}
      {cloud(1650, 340, 1.2, 'cb-b')}
      {cloud(70, 930, 1.5, 'cb-c')}
      {cloud(1440, 900, 1.4, 'cb-a')}
      {cloud(1490, -30, 1.0, 'cb-b')}
    </g>
  );
});

/* ---------- 前景草缘与虚化叶 ---------- */

const Foreground = memo(function Foreground({ p }: { p: string }) {
  const fringe = useMemo(() => {
    const rnd = mulberry32(777001);
    return Array.from({ length: 52 }, (_, i) => ({
      x: -30 + i * 32 + rnd() * 22,
      y: 874 + rnd() * 26,
      s: 1.5 + rnd() * 1.2,
      flip: rnd() > 0.5 ? 1 : -1,
      tone: Math.floor(rnd() * 3),
    }));
  }, []);
  const FG = ['#357a34', '#3f8a3e', '#4f9a41'];
  return (
    <g pointerEvents="none">
      {fringe.map((t, i) => (
        <g key={i} transform={`translate(${t.x},${t.y}) scale(${t.s * t.flip},${t.s})`} opacity="0.85">
          <path d="M 0,0 C -1,-6 -3,-10 -7,-14" stroke={FG[t.tone]} strokeWidth="2.4" fill="none" strokeLinecap="round" />
          <path d="M 1,0 C 1,-7 1,-11 0,-17" stroke={FG[(t.tone + 1) % 3]} strokeWidth="2.4" fill="none" strokeLinecap="round" />
          <path d="M 2,0 C 3,-6 6,-10 9,-13" stroke={FG[t.tone]} strokeWidth="2.2" fill="none" strokeLinecap="round" />
        </g>
      ))}
      <g filter={`url(#${p}-fgblur)`} opacity="0.55">
        <path d="M -30,880 C 10,850 40,856 62,884 C 30,906 -6,904 -30,880 Z" fill="#4f9a41" />
        <path d="M 20,900 C 50,872 84,878 104,906 C 74,926 40,924 20,900 Z" fill="#63b350" />
        <path d="M 1560,860 C 1596,836 1630,842 1650,870 C 1620,892 1584,890 1560,860 Z" fill="#4f9a41" />
        <path d="M 1500,900 C 1534,874 1568,880 1588,908 C 1558,928 1522,926 1500,900 Z" fill="#63b350" />
      </g>
    </g>
  );
});

/* ---------- 场景主体 ---------- */

export function ForestScene({ trees, eventsByTree, birthYear, selectedTreeId, onSelect, burst, interactive = true }: Props) {
  const rawId = useId();
  const p = `ll${rawId.replace(/[^a-zA-Z0-9]/g, '')}`;
  const containerRef = useRef<HTMLDivElement>(null);
  const [aspect, setAspect] = useState(16 / 9);
  const [vb, setVb] = useState<ViewBox>({ x: 0, y: 0, w: SCENE_W, h: SCENE_H });
  const vbRef = useRef(vb);
  vbRef.current = vb;
  const animRef = useRef(0);
  const panRef = useRef<{ id: number; startX: number; startY: number; origin: ViewBox; moved: boolean } | null>(null);
  const firstFit = useRef(true);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => {
      const rect = el.getBoundingClientRect();
      if (rect.width > 0 && rect.height > 0) setAspect(rect.width / rect.height);
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  const baseView = useCallback((): ViewBox => {
    const w = SCENE_H * aspect;
    const x = aspect < 1 ? 420 : SCENE_W / 2 - w / 2;
    return { x, y: 0, w, h: SCENE_H };
  }, [aspect]);

  const focusView = useCallback(
    (tree: Tree): ViewBox => {
      const visual = generateTreeVisual(tree.seed, birthYear);
      const canopyY = tree.y - (visual.height + visual.canopy[0].r * 0.4) * tree.scale;
      let w = Math.min(640, SCENE_H * aspect * 0.92);
      let h = w / aspect;
      if (h > 860) {
        h = 860;
        w = h * aspect;
      }
      const isNarrow = aspect < 1;
      let x = tree.x - w * (isNarrow ? 0.5 : 0.62);
      let y = canopyY - h * (isNarrow ? 0.3 : 0.42);
      x = Math.max(-240, Math.min(x, SCENE_W + 240 - w));
      y = Math.max(-40, Math.min(y, SCENE_H - h + 40));
      return { x, y, w, h };
    },
    [aspect, birthYear],
  );

  const animateTo = useCallback((target: ViewBox, duration = 720) => {
    cancelAnimationFrame(animRef.current);
    const from = { ...vbRef.current };
    const start = performance.now();
    const step = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      const e = easeInOutCubic(t);
      const next = {
        x: from.x + (target.x - from.x) * e,
        y: from.y + (target.y - from.y) * e,
        w: from.w + (target.w - from.w) * e,
        h: from.h + (target.h - from.h) * e,
      };
      vbRef.current = next;
      setVb(next);
      if (t < 1) animRef.current = requestAnimationFrame(step);
    };
    animRef.current = requestAnimationFrame(step);
  }, []);

  useEffect(() => {
    const selected = trees.find((t) => t.id === selectedTreeId);
    const target = selected ? focusView(selected) : baseView();
    if (firstFit.current) {
      firstFit.current = false;
      vbRef.current = target;
      setVb(target);
    } else {
      animateTo(target);
    }
    return () => cancelAnimationFrame(animRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTreeId, aspect, trees.length]);

  const onPointerDown = (e: ReactPointerEvent<SVGSVGElement>) => {
    if (!interactive) return;
    const target = e.target as Element;
    if (target.closest('.tree')) return;
    panRef.current = { id: e.pointerId, startX: e.clientX, startY: e.clientY, origin: { ...vbRef.current }, moved: false };
    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // 指针已释放时捕获会抛错，忽略即可
    }
  };

  const onPointerMove = (e: ReactPointerEvent<SVGSVGElement>) => {
    const pan = panRef.current;
    if (!pan || pan.id !== e.pointerId) return;
    if (e.pointerType === 'mouse' && e.buttons === 0) {
      panRef.current = null;
      return;
    }
    const rect = e.currentTarget.getBoundingClientRect();
    const scale = rect.width / vbRef.current.w;
    const dx = (e.clientX - pan.startX) / scale;
    const dy = (e.clientY - pan.startY) / scale;
    if (Math.abs(e.clientX - pan.startX) + Math.abs(e.clientY - pan.startY) > 8) pan.moved = true;
    if (!pan.moved) return;
    cancelAnimationFrame(animRef.current);
    const maxX = Math.max(pan.origin.x, SCENE_W + 240 - pan.origin.w);
    const minX = Math.min(pan.origin.x, -240);
    const next = {
      ...pan.origin,
      x: Math.max(minX, Math.min(maxX, pan.origin.x - dx)),
      y: Math.max(-40, Math.min(SCENE_H - pan.origin.h + 40, pan.origin.y - dy)),
    };
    vbRef.current = next;
    setVb(next);
  };

  const onPointerUp = (e: ReactPointerEvent<SVGSVGElement>) => {
    const pan = panRef.current;
    if (pan && pan.id === e.pointerId) {
      if (!pan.moved && interactive) onSelect(null);
      panRef.current = null;
    }
  };

  const sortedTrees = useMemo(() => [...trees].sort((a, b) => a.y - b.y), [trees]);

  return (
    <div className={`scene-container ${interactive ? '' : 'scene-ambient'}`} ref={containerRef}>
      <svg
        className="scene-svg"
        viewBox={`${vb.x} ${vb.y} ${vb.w} ${vb.h}`}
        preserveAspectRatio="xMidYMid slice"
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        role="img"
        aria-label="幸运森林场景：草甸、叶形湖与成长之树"
      >
        <SceneBackdrop p={p} />
        {sortedTrees.map((tree) => (
          <TreeSprite
            key={tree.id}
            tree={tree}
            events={eventsByTree.get(tree.id) ?? EMPTY_EVENTS}
            birthYear={birthYear}
            selected={tree.id === selectedTreeId}
            idPrefix={p}
            interactive={interactive}
            onSelect={(id) => onSelect(id)}
          />
        ))}
        {burst && (
          <g key={burst.key} transform={`translate(${burst.x},${burst.y})`}>
            {Array.from({ length: 8 }, (_, i) => {
              const ang = (i / 8) * Math.PI * 2;
              return (
                <path
                  key={i}
                  className="burst-leaf"
                  d="M0,-7 C4.5,-3.5 4.5,3.5 0,7 C-4.5,3.5 -4.5,-3.5 0,-7 Z"
                  fill={i % 2 === 0 ? '#f2b134' : '#ffd76a'}
                  stroke="#c07f10"
                  strokeWidth="0.8"
                  style={
                    {
                      '--dx': `${Math.cos(ang) * (55 + (i % 3) * 22)}px`,
                      '--dy': `${Math.sin(ang) * 30 - 46}px`,
                      '--rot': `${(i % 2 === 0 ? 1 : -1) * (160 + i * 30)}deg`,
                      animationDelay: `${i * 40}ms`,
                    } as CSSProperties
                  }
                />
              );
            })}
          </g>
        )}
        <Foreground p={p} />
        <ForeClouds p={p} />
      </svg>
    </div>
  );
}