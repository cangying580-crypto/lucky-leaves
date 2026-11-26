import { useState, type CSSProperties, type FormEvent } from 'react';
import type { Tree, TreeCategory } from '../../types';
import { CATEGORIES, CATEGORY_KEYS, STAGE_NAMES, ageOf, stageForAge } from '../../types';
import { Modal } from '../ui/Modal';
import { TreeSprite } from '../scene/TreeSprite';

interface Props {
  birthYear: number;
  onClose: () => void;
  onSubmit: (title: string, category: TreeCategory) => Promise<Tree>;
}

export function PlantTreeModal({ birthYear, onClose, onSubmit }: Props) {
  const [title, setTitle] = useState('');
  const [category, setCategory] = useState<TreeCategory>('growth');
  const [seed] = useState(() => crypto.randomUUID());
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const age = ageOf(birthYear);
  const stage = stageForAge(age);

  const previewTree: Tree = {
    id: 'preview',
    forestId: 'preview',
    userId: 'preview',
    title: title || '新树',
    category,
    x: 0,
    y: 0,
    scale: 1,
    seed,
    plantedAt: new Date().toISOString(),
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('给这棵树起个名字吧');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await onSubmit(title.trim(), category);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : '种树失败，请重试');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title="种下一棵新树" subtitle={`按你的年龄（${age} 岁），它将长成一棵${STAGE_NAMES[stage]}`} onClose={onClose} wide>
      <form className="form plant-form" onSubmit={submit}>
        <div className="plant-preview" aria-hidden>
          <svg viewBox="-130 -356 260 400" width="170" height="260">
            <defs>
              <linearGradient id="pt-bark" x1="0" y1="0" x2="1" y2="0">
                <stop offset="0" stopColor="#9a6a3d" />
                <stop offset="1" stopColor="#6d4426" />
              </linearGradient>
              <linearGradient id="pt-gold" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#ffe08a" />
                <stop offset="0.55" stopColor="#f2b134" />
                <stop offset="1" stopColor="#d9820f" />
              </linearGradient>
              <linearGradient id="pt-leafgreen" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0" stopColor="#a5d97f" />
                <stop offset="1" stopColor="#4f9a41" />
              </linearGradient>
              {[
                ['#4f9a41', '#63b350', '#8fce6f'],
                ['#3f8a6a', '#57ab8b', '#7fc9a4'],
                ['#5aa845', '#79c257', '#a5d97f'],
              ].map(([dark, mid, light], i) => (
                <radialGradient key={i} id={`pt-can${i}`} cx="0.36" cy="0.3" r="0.85">
                  <stop offset="0" stopColor={light} />
                  <stop offset="0.55" stopColor={mid} />
                  <stop offset="1" stopColor={dark} />
                </radialGradient>
              ))}
              <radialGradient id="pt-canshade" cx="0.5" cy="0.5" r="0.5">
                <stop offset="0" stopColor="#2f6e33" stopOpacity="0.34" />
                <stop offset="1" stopColor="#2f6e33" stopOpacity="0" />
              </radialGradient>
              <radialGradient id="pt-canlight" cx="0.5" cy="0.5" r="0.5">
                <stop offset="0" stopColor="#eaf7c8" stopOpacity="0.42" />
                <stop offset="1" stopColor="#eaf7c8" stopOpacity="0" />
              </radialGradient>
              <radialGradient id="pt-shadow" cx="0.5" cy="0.5" r="0.5">
                <stop offset="0" stopColor="#2f6e33" stopOpacity="0.32" />
                <stop offset="0.7" stopColor="#2f6e33" stopOpacity="0.14" />
                <stop offset="1" stopColor="#2f6e33" stopOpacity="0" />
              </radialGradient>
            </defs>
            <TreeSprite tree={previewTree} events={[]} birthYear={birthYear} selected={false} idPrefix="pt" interactive={false} onSelect={() => undefined} />
          </svg>
        </div>
        <div className="plant-fields">
          <label className="field">
            <span className="field-label">树木名字（一段经历或一个目标）</span>
            <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="例如：学会游泳" maxLength={20} autoFocus />
          </label>
          <div className="field">
            <span className="field-label">类别</span>
            <div className="cat-grid">
              {CATEGORY_KEYS.map((key) => (
                <button
                  key={key}
                  type="button"
                  className={`cat-option ${category === key ? 'cat-option-on' : ''}`}
                  style={{ '--cat': CATEGORIES[key].color } as CSSProperties}
                  onClick={() => setCategory(key)}
                  aria-pressed={category === key}
                >
                  <span className="cat-dot" />
                  {CATEGORIES[key].label}
                </button>
              ))}
            </div>
          </div>
          {error && <p className="form-error" role="alert">{error}</p>}
          <div className="form-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              取消
            </button>
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy ? '种树中…' : '种下这棵树'}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
}