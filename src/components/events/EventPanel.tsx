import { useMemo, useState, type FormEvent } from 'react';
import type { GrowthEvent, Tree } from '../../types';
import { CATEGORIES } from '../../types';

interface Props {
  tree: Tree;
  events: GrowthEvent[];
  onClose: () => void;
  onToggle: (id: string) => void;
  onDelete: (id: string) => void;
  onQuickAdd: (title: string) => Promise<unknown>;
  onRemoveTree: (id: string) => void;
}

function formatDue(due: string): string {
  const [, m, d] = due.split('-');
  return `${Number(m)}月${Number(d)}日`;
}

function isOverdue(ev: GrowthEvent): boolean {
  if (!ev.dueDate || ev.completedAt) return false;
  const today = new Date();
  const local = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  return ev.dueDate < local;
}

export function EventPanel({ tree, events, onClose, onToggle, onDelete, onQuickAdd, onRemoveTree }: Props) {
  const [quickTitle, setQuickTitle] = useState('');
  const [adding, setAdding] = useState(false);
  const [confirmRemove, setConfirmRemove] = useState(false);
  const cat = CATEGORIES[tree.category];
  const done = events.filter((e) => e.completedAt).length;
  const rate = events.length ? done / events.length : 0;

  const sorted = useMemo(() => {
    const pending = events
      .filter((e) => !e.completedAt)
      .sort((a, b) => (a.dueDate ?? '9999').localeCompare(b.dueDate ?? '9999') || a.createdAt.localeCompare(b.createdAt));
    const finished = events
      .filter((e) => e.completedAt)
      .sort((a, b) => (b.completedAt ?? '').localeCompare(a.completedAt ?? ''));
    return [...pending, ...finished];
  }, [events]);

  const submitQuick = async (e: FormEvent) => {
    e.preventDefault();
    const title = quickTitle.trim();
    if (!title || adding) return;
    setAdding(true);
    try {
      await onQuickAdd(title);
      setQuickTitle('');
    } finally {
      setAdding(false);
    }
  };

  return (
    <aside className="event-panel" aria-label={`树木「${tree.title}」的事件`}>
      <div className="panel-head" style={{ borderLeftColor: cat.color }}>
        <div className="panel-head-row">
          <span className="cat-chip" style={{ background: cat.color }}>
            {cat.label}
          </span>
          <button className="icon-btn" aria-label="关闭事件面板" onClick={onClose}>
            <svg viewBox="0 0 24 24" width="18" height="18">
              <path d="M6 6 L18 18 M18 6 L6 18" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
            </svg>
          </button>
        </div>
        <h2 className="panel-title">{tree.title}</h2>
        <p className="panel-meta">
          种于 {new Date(tree.plantedAt).toLocaleDateString('zh-CN')} · {done}/{events.length} 件事已完成
        </p>
        <div className="panel-progress" role="progressbar" aria-valuenow={Math.round(rate * 100)} aria-valuemin={0} aria-valuemax={100}>
          <div className="panel-progress-fill" style={{ width: `${rate * 100}%` }} />
        </div>
        <p className="panel-hint">每完成一件事，就有一片叶子染上金色</p>
      </div>

      <div className="panel-list">
        {sorted.length === 0 && (
          <div className="panel-empty">
            <svg viewBox="0 0 64 64" width="52" height="52" aria-hidden>
              <path d="M32 6 C48 15 55 33 32 58 C9 33 16 15 32 6 Z" fill="#d8e4c8" />
              <path d="M32 12 L32 52" stroke="#fdf6e3" strokeWidth="2.6" strokeLinecap="round" />
            </svg>
            <p>这棵树还没有事件</p>
            <p className="panel-empty-sub">在下方写下第一个目标，让它开始生长</p>
          </div>
        )}
        {sorted.map((ev) => (
          <div key={ev.id} className={`event-item ${ev.completedAt ? 'event-done' : ''}`}>
            <button
              className={`leaf-check ${ev.completedAt ? 'leaf-check-on' : ''}`}
              onClick={() => onToggle(ev.id)}
              aria-label={ev.completedAt ? `标记「${ev.title}」为未完成` : `标记「${ev.title}」为完成`}
              aria-pressed={!!ev.completedAt}
            >
              <svg viewBox="0 0 24 24" width="20" height="20">
                <path d="M12 2.5 C18.5 6.5 20.5 13 12 21.5 C3.5 13 5.5 6.5 12 2.5 Z" fill={ev.completedAt ? '#f2b134' : 'none'} stroke={ev.completedAt ? '#c07f10' : '#5aa845'} strokeWidth="1.8" />
                {ev.completedAt && <path d="M8.5 12 L11 14.5 L15.5 9.5" stroke="#fdf6e3" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />}
              </svg>
            </button>
            <div className="event-body">
              <span className="event-title">{ev.title}</span>
              {ev.note && <span className="event-note">{ev.note}</span>}
              <span className="event-tags">
                {ev.dueDate && (
                  <span className={`due-chip ${isOverdue(ev) ? 'due-overdue' : ''}`}>
                    {isOverdue(ev) ? '已逾期 · ' : ''}
                    {formatDue(ev.dueDate)}
                  </span>
                )}
                {ev.completedAt && <span className="done-chip">{new Date(ev.completedAt).toLocaleDateString('zh-CN')} 完成</span>}
              </span>
            </div>
            <button className="icon-btn event-del" aria-label={`删除事件「${ev.title}」`} onClick={() => onDelete(ev.id)}>
              <svg viewBox="0 0 24 24" width="16" height="16" fill="none">
                <path d="M5 7 L19 7 M10 7 L10 5 L14 5 L14 7 M8 7 L9 20 L15 20 L16 7" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" />
              </svg>
            </button>
          </div>
        ))}
      </div>

      <form className="panel-quickadd" onSubmit={submitQuick}>
        <input
          className="input"
          value={quickTitle}
          onChange={(e) => setQuickTitle(e.target.value)}
          placeholder="快速添加事件，回车确认"
          maxLength={60}
          aria-label="快速添加事件"
        />
        <button className="btn btn-primary btn-sm" type="submit" disabled={!quickTitle.trim() || adding}>
          {adding ? '添加中' : '添加'}
        </button>
      </form>

      <div className="panel-foot">
        {confirmRemove ? (
          <span className="remove-confirm">
            移除后事件一并删除：
            <button className="btn btn-danger btn-xs" onClick={() => onRemoveTree(tree.id)}>
              确认移除
            </button>
            <button className="btn btn-ghost btn-xs" onClick={() => setConfirmRemove(false)}>
              取消
            </button>
          </span>
        ) : (
          <button className="link-danger" onClick={() => setConfirmRemove(true)}>
            移除这棵树
          </button>
        )}
      </div>
    </aside>
  );
}