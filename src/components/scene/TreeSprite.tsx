import { memo, useMemo } from 'react';
import type { Tree, GrowthEvent } from '../../types';
import { CATEGORIES } from '../../types';
import { generateTreeVisual, goldenLeafCount, hashSeed, mulberry32 } from '../../lib/treeGen';

const LEAF_PATH = 'M0,-8 C5,-4 5,4 0,8 C-5,4 -5,-4 0,-8 Z';

interface Props {
  tree: Tree;
  events: GrowthEvent[];
  birthYear: number;
  selected: boolean;
  idPrefix: string;
  interactive: boolean;
  onSelect: (id: string) => void;
}

function scallops(cx: number, cy: number, r: number, n: number, phase: number) {
  return Array.from({ length: n }, (_, i) => {
    const a = phase + (i / n) * Math.PI * 2;
    return { x: cx + Math.cos(a) * r * 0.98, y: cy + Math.sin(a) * r * 0.94, r: r * (0.24 + (i % 3) * 0.045) };
  });
}

function TreeSpriteInner({ tree, events, birthYear, selected, idPrefix, interactive, onSelect }: Props) {
  const visual = useMemo(() => generateTreeVisual(tree.seed, birthYear), [tree.seed, birthYear]);
  const micro = useMemo(() => {
    const rnd = mulberry32(hashSeed(tree.seed) ^ 0x9e3779b9);
    return Array.from({ length: 30 }, (_, i) => {
      const blob = visual.canopy[i % visual.canopy.length];
      const a = rnd() * Math.PI * 2;
      const f = 0.25 + rnd() * 0.72;
      return {
        x: blob.cx + Math.cos(a) * blob.r * f,
        y: blob.cy + Math.sin(a) * blob.r * f * 0.9,
        rot: rnd() * 360,
        s: 0.5 + rnd() * 0.5,
        light: rnd() > 0.45,
      };
    });
  }, [visual, tree.seed]);
  const done = events.filter((e) => e.completedAt).length;
  const golden = goldenLeafCount(visual.leaves.length, done, events.length);
  const accent = CATEGORIES[tree.category].color;
  const swayDelay = (hashSeed(tree.seed) % 600) / 100;
  const labelW = tree.title.length * 15 + 44;
  const main = visual.canopy[0];
  const crownTop = main.cy - main.r;
  const ageYears = Math.round((Date.now() - new Date(tree.plantedAt).getTime()) / 31557600000);
  const ageLabel = ageYears > 0 ? `${ageYears}岁` : '新芽';
  const badgeW = ageLabel.length * 15 + 40;
  const phase = (hashSeed(tree.seed) % 100) / 16;

  return (
    <g
      transform={`translate(${tree.x},${tree.y}) scale(${tree.scale})`}
      className={`tree ${selected ? 'tree-selected' : ''} ${interactive ? 'tree-interactive' : ''}`}
      onClick={
        interactive
          ? (e) => {
              e.stopPropagation();
              onSelect(tree.id);
            }
          : undefined
      }
      onKeyDown={
        interactive
          ? (e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onSelect(tree.id);
              }
            }
          : undefined
      }
      tabIndex={interactive ? 0 : undefined}
      role={interactive ? 'button' : undefined}
      aria-label={interactive ? `查看树木：${tree.title}` : undefined}
    >
      {selected && (
        <ellipse cx={main.cx} cy={main.cy} rx={main.r * 2.1} ry={main.r * 1.9} fill={`url(#${idPrefix}-glow)`} />
      )}
      <ellipse cx="0" cy="9" rx={main.r * 1.15} ry={main.r * 0.26} fill={`url(#${idPrefix}-shadow)`} />
      <g className="tree-hover">
        <g className="tree-sway" style={{ animationDelay: `${swayDelay}s` }}>
          {/* 树干 */}
          {visual.branches.map((b, i) => (
            <path key={i} d={b} stroke={`url(#${idPrefix}-bark)`} strokeWidth={5 + visual.stage} strokeLinecap="round" fill="none" />
          ))}
          <path d={visual.trunkPath} fill={`url(#${idPrefix}-bark)`} stroke="#5a381e" strokeOpacity="0.45" strokeWidth="1.1" />
          <path d={visual.trunkShade} fill="#4a2d15" opacity="0.3" />
          <path
            d={`M ${-main.r * 0.3},7 C ${-main.r * 0.16},3 ${-main.r * 0.1},-2 ${-main.r * 0.08},-10 M ${main.r * 0.3},7 C ${main.r * 0.16},3 ${main.r * 0.1},-2 ${main.r * 0.08},-10`}
            stroke={`url(#${idPrefix}-bark)`}
            strokeWidth="5"
            strokeLinecap="round"
            fill="none"
          />
          <path d={`M ${-main.r * 0.05},-14 l 2,-12 M ${main.r * 0.06},-30 l -2,-10`} stroke="#4a2d15" strokeWidth="1.2" opacity="0.4" fill="none" />
          <path
            d={`M ${-visual.canopy[0].r * 0.06},${-visual.height * 0.2} C ${-visual.canopy[0].r * 0.1},${-visual.height * 0.5} ${-visual.canopy[0].r * 0.05},${-visual.height * 0.75} ${-visual.canopy[0].r * 0.02},${-visual.height * 0.95}`}
            stroke="#c99a66"
            strokeWidth="2.2"
            strokeLinecap="round"
            opacity="0.55"
            fill="none"
          />
          {/* 树冠：渐变体积 + 叶簇轮廓 */}
          {visual.canopy.map((blob, i) => (
            <g key={i}>
              {scallops(blob.cx, blob.cy, blob.r, 9, phase + i).map((s, j) => (
                <circle key={j} cx={s.x} cy={s.y} r={s.r} fill={`url(#${idPrefix}-can${blob.tone})`} />
              ))}
              <circle cx={blob.cx} cy={blob.cy} r={blob.r} fill={`url(#${idPrefix}-can${blob.tone})`} />
            </g>
          ))}
          {/* 冠底暗部与顶光 */}
          <ellipse cx={main.cx + main.r * 0.1} cy={main.cy + main.r * 0.62} rx={main.r * 0.85} ry={main.r * 0.4} fill={`url(#${idPrefix}-canshade)`} />
          <ellipse cx={main.cx - main.r * 0.34} cy={main.cy - main.r * 0.42} rx={main.r * 0.5} ry={main.r * 0.32} fill={`url(#${idPrefix}-canlight)`} />
          {/* 叶簇细节 */}
          {visual.canopy.slice(0, 3).map((blob, i) =>
            [0.35, 0.62, 0.85].map((f, j) => {
              const a = phase + i * 2 + j * 2.1;
              const cx = blob.cx + Math.cos(a) * blob.r * f * 0.7;
              const cy = blob.cy + Math.sin(a) * blob.r * f * 0.6;
              return (
                <g key={`${i}-${j}`} opacity="0.5">
                  <circle cx={cx} cy={cy} r={blob.r * 0.1} fill={`url(#${idPrefix}-canlight)`} />
                  <circle cx={cx + blob.r * 0.09} cy={cy + blob.r * 0.05} r={blob.r * 0.07} fill={`url(#${idPrefix}-canlight)`} />
                </g>
              );
            }),
          )}
          {/* 冠内细叶纹理 */}
          {micro.map((m, i) => (
            <path
              key={`m${i}`}
              d={LEAF_PATH}
              transform={`translate(${m.x},${m.y}) rotate(${m.rot}) scale(${m.s})`}
              fill={m.light ? '#d6f0b0' : '#2f6e33'}
              opacity={m.light ? 0.5 : 0.22}
            />
          ))}
          {/* 叶片 */}
          {visual.leaves.map((leaf, i) => {
            const isGolden = i < golden;
            return (
              <g key={i} transform={`translate(${leaf.x},${leaf.y}) rotate(${leaf.rot}) scale(${leaf.s})`}>
                <path
                  className={`leaf ${isGolden ? 'leaf-golden' : ''}`}
                  d={LEAF_PATH}
                  fill={isGolden ? `url(#${idPrefix}-gold)` : `url(#${idPrefix}-leafgreen)`}
                  stroke={isGolden ? '#c07f10' : '#3f8a3a'}
                  strokeOpacity={isGolden ? 0.8 : 0.45}
                  strokeWidth="0.9"
                  style={{ transitionDelay: isGolden ? `${i * 45}ms` : '0ms' }}
                />
                <path d="M0,-5.5 L0,5.5" stroke={isGolden ? '#c07f10' : '#3f8a3a'} strokeWidth="0.7" opacity="0.55" />
              </g>
            );
          })}
          {/* 花 */}
          {visual.blossoms.map((b, i) => (
            <g key={i} transform={`translate(${b.x},${b.y}) scale(${b.s})`}>
              {[0, 72, 144, 216, 288].map((deg) => (
                <ellipse key={deg} cx="0" cy="-3.4" rx="2.1" ry="3.2" fill={accent} transform={`rotate(${deg})`} opacity="0.95" />
              ))}
              <circle r="1.7" fill="#fff8e7" />
            </g>
          ))}
        </g>
      </g>
      {interactive && (
        <g className="tree-label" transform="translate(0,26)">
          <rect x={-labelW / 2} y="-13" width={labelW} height="26" rx="13" fill="#fffdf5" fillOpacity="0.94" stroke="#3f8a3a" strokeWidth="1.6" />
          <circle cx={-labelW / 2 + 14} cy="0" r="4.5" fill={accent} />
          <text x="8" y="5" textAnchor="middle" fontSize="14" fill="#274232" fontWeight="600">
            {tree.title}
          </text>
          {events.length > 0 && (
            <g transform={`translate(${labelW / 2 - 2},-12)`}>
              <circle r="10" fill={done === events.length ? '#f2b134' : '#3f8a3a'} stroke="#fffdf5" strokeWidth="1.6" />
              <text y="3.5" textAnchor="middle" fontSize="9.5" fill="#fffdf5" fontWeight="700">
                {done}/{events.length}
              </text>
            </g>
          )}
        </g>
      )}
      {selected && (
        <g className="tree-age-badge" transform={`translate(${main.cx},${crownTop - 34})`}>
          <path d="M -7,14 L 0,24 L 7,14 Z" fill="#fffdf5" stroke="#f2b134" strokeWidth="2" />
          <rect x={-badgeW / 2} y="-16" width={badgeW} height="32" rx="16" fill="#fffdf5" stroke="#f2b134" strokeWidth="2.4" />
          <path d="M -10,-8 C -3,-4 -1,2 -10,9 C -19,2 -17,-4 -10,-8 Z" fill="#5aa845" transform="translate(2,0) scale(0.8)" />
          <text x="10" y="5" textAnchor="middle" fontSize="15" fill="#274232" fontWeight="700">
            {ageLabel}
          </text>
        </g>
      )}
      {selected && (
        <path
          className="tree-sparkle"
          d={`M ${-main.r - 14},${crownTop + 10} l 4,10 10,4 -10,4 -4,10 -4,-10 -10,-4 10,-4 Z`}
          fill="#ffd76a"
        />
      )}
    </g>
  );
}

export const TreeSprite = memo(TreeSpriteInner);