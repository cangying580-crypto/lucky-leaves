import { useMemo, useState } from 'react';
import type { GrowthEvent, Tree } from '../../types';
import { CATEGORIES } from '../../types';
import { Modal } from '../ui/Modal';

interface Props {
  trees: Tree[];
  events: GrowthEvent[];
  onClose: () => void;
}

type Filter = 'all' | 'pending' | 'done';

export function JournalModal({ trees, events, onClose }: Props) {
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');

  const treeMap = useMemo(() => new Map(trees.map((t) => [t.id, t])), [trees]);

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    return events
      .filter((e) => (filter === 'all' ? true : filter === 'done' ? !!e.completedAt : !e.completedAt))
      .filter((e) => {
        if (!q) return true;
        const tree = treeMap.get(e.treeId);
        return (
          e.title.toLowerCase().includes(q) ||
          e.note.toLowerCase().includes(q) ||
          (tree?.title.toLowerCase().includes(q) ?? false)
        );
      })
      .sort((a, b) => (b.completedAt ?? b.createdAt).localeCompare(a.completedAt ?? a.createdAt));
  }, [events, filter, query, treeMap]);

  const doneCount = events.filter((e) => e.completedAt).length;

  return (
    <Modal title="成长记录" subtitle={`共 ${events.length} 件事 · 已完成 ${doneCount} 件`} onClose={onClose} wide>
      <div className="journal-tools">
        <input
          className="input"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="搜索事件、备注或树木…"
          aria-label="搜索成长记录"
        />
        <div className="journal-tabs" role="tablist">
          {(
            [
              ['all', '全部'],
              ['pending', '进行中'],
              ['done', '已完成'],
            ] as [Filter, string][]
          ).map(([key, label]) => (
            <button
              key={key}
              role="tab"
              aria-selected={filter === key}
              className={`journal-tab ${filter === key ? 'journal-tab-on' : ''}`}
              onClick={() => setFilter(key)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      <div className="journal-list">
        {rows.length === 0 && <p className="journal-empty">没有匹配的记录</p>}
        {rows.map((ev) => {
          const tree = treeMap.get(ev.treeId);
          const cat = tree ? CATEGORIES[tree.category] : null;
          return (
            <div key={ev.id} className={`journal-row ${ev.completedAt ? 'journal-row-done' : ''}`}>
              <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden className="journal-leaf">
                <path
                  d="M12 2.5 C18.5 6.5 20.5 13 12 21.5 C3.5 13 5.5 6.5 12 2.5 Z"
                  fill={ev.completedAt ? '#f2b134' : '#d8e4c8'}
                  stroke={ev.completedAt ? '#c07f10' : '#b9c9a6'}
                  strokeWidth="1.6"
                />
                {ev.completedAt && <path d="M8.5 12 L11 14.5 L15.5 9.5" stroke="#fdf6e3" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />}
              </svg>
              <div className="journal-body">
                <span className="journal-title">{ev.title}</span>
                {ev.note && <span className="journal-note">{ev.note}</span>}
              </div>
              {tree && cat && (
                <span className="journal-tree" style={{ borderColor: cat.color }}>
                  <i style={{ background: cat.color }} />
                  {tree.title}
                </span>
              )}
              <span className="journal-date">
                {ev.completedAt
                  ? `${new Date(ev.completedAt).toLocaleDateString('zh-CN')} 完成`
                  : new Date(ev.createdAt).toLocaleDateString('zh-CN')}
              </span>
            </div>
          );
        })}
      </div>
    </Modal>
  );
}