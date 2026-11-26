import { useState, type FormEvent } from 'react';
import type { Tree } from '../../types';
import { CATEGORIES } from '../../types';
import { Modal } from '../ui/Modal';

interface Props {
  trees: Tree[];
  initialTreeId: string | null;
  onClose: () => void;
  onSubmit: (treeId: string, title: string, note: string, dueDate: string | null) => Promise<unknown>;
  onGoPlant: () => void;
}

export function EventForm({ trees, initialTreeId, onClose, onSubmit, onGoPlant }: Props) {
  const [treeId, setTreeId] = useState(initialTreeId ?? trees[0]?.id ?? '');
  const [title, setTitle] = useState('');
  const [note, setNote] = useState('');
  const [due, setDue] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setError('请填写事件标题');
      return;
    }
    if (!treeId) {
      setError('请选择一棵树');
      return;
    }
    setBusy(true);
    setError('');
    try {
      await onSubmit(treeId, title.trim(), note.trim(), due || null);
      onClose();
    } catch (err) {
      setError(err instanceof Error ? err.message : '添加失败，请重试');
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal title="添加成长事件" subtitle="每完成一件事，对应树木的叶片就会染上金色" onClose={onClose}>
      {trees.length === 0 ? (
        <div className="form-empty">
          <p>森林里还没有树，先种下一棵树吧。</p>
          <button className="btn btn-primary" onClick={onGoPlant}>
            去种树
          </button>
        </div>
      ) : (
        <form className="form" onSubmit={submit}>
          <label className="field">
            <span className="field-label">种在哪棵树上</span>
            <select className="input" value={treeId} onChange={(e) => setTreeId(e.target.value)}>
              {trees.map((t) => (
                <option key={t.id} value={t.id}>
                  {CATEGORIES[t.category].label} · {t.title}
                </option>
              ))}
            </select>
          </label>
          <label className="field">
            <span className="field-label">事件标题</span>
            <input className="input" value={title} onChange={(e) => setTitle(e.target.value)} placeholder="例如：读完《小王子》" maxLength={60} autoFocus />
          </label>
          <label className="field">
            <span className="field-label">备注（可选）</span>
            <textarea className="input" rows={2} value={note} onChange={(e) => setNote(e.target.value)} placeholder="写给这件事的一句话" maxLength={140} />
          </label>
          <label className="field">
            <span className="field-label">目标日期（可选）</span>
            <input className="input" type="date" value={due} onChange={(e) => setDue(e.target.value)} />
          </label>
          {error && <p className="form-error" role="alert">{error}</p>}
          <div className="form-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose}>
              取消
            </button>
            <button type="submit" className="btn btn-primary" disabled={busy}>
              {busy ? '添加中…' : '添加事件'}
            </button>
          </div>
        </form>
      )}
    </Modal>
  );
}