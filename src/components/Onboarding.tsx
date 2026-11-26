import { useState, type FormEvent } from 'react';
import { STAGE_NAMES, ageOf, stageForAge } from '../types';

interface Props {
  nickname: string;
  birthYear: number;
  onCreate: (name: string) => Promise<unknown>;
}

export function Onboarding({ nickname, birthYear, onCreate }: Props) {
  const [name, setName] = useState(`${nickname}的幸运森林`);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const age = ageOf(birthYear);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!name.trim() || busy) return;
    setBusy(true);
    setError('');
    try {
      await onCreate(name.trim());
    } catch (err) {
      setError(err instanceof Error ? err.message : '创建失败，请重试');
      setBusy(false);
    }
  };

  return (
    <div className="modal-scrim">
      <div className="modal-card onboarding-card" role="dialog" aria-modal="true" aria-label="创建你的森林">
        <div className="onboarding-art" aria-hidden>
          <svg viewBox="0 0 200 120" width="200" height="120">
            <ellipse cx="100" cy="104" rx="88" ry="12" fill="#5aa845" opacity="0.4" />
            <path d="M100 104 L100 62" stroke="#8a5a33" strokeWidth="9" strokeLinecap="round" />
            <circle cx="100" cy="46" r="30" fill="#63b350" />
            <circle cx="76" cy="58" r="19" fill="#4f9a41" />
            <circle cx="124" cy="58" r="19" fill="#79c257" />
            <path d="M92 38 C96 34 100 34 104 38" stroke="#b8e986" strokeWidth="4" strokeLinecap="round" fill="none" />
            <path d="M150 96 L150 78" stroke="#8a5a33" strokeWidth="5" strokeLinecap="round" />
            <circle cx="150" cy="70" r="14" fill="#79c257" />
            <path d="M52 98 L52 88" stroke="#8a5a33" strokeWidth="4" strokeLinecap="round" />
            <circle cx="52" cy="82" r="9" fill="#a8e06a" />
            <circle cx="160" cy="30" r="3" fill="#f2b134" />
            <circle cx="40" cy="24" r="2.4" fill="#ef7fae" />
          </svg>
        </div>
        <h2 className="modal-title">开辟你的幸运森林</h2>
        <p className="modal-subtitle">
          {nickname}，今年 {age} 岁的你将在这里种下第一棵「生命之树」——
          它是一棵{STAGE_NAMES[stageForAge(age)]}。之后每段经历、每个目标，都会长成一棵独立的树。
        </p>
        <form className="form" onSubmit={submit}>
          <label className="field">
            <span className="field-label">森林名字</span>
            <input className="input" value={name} onChange={(e) => setName(e.target.value)} maxLength={24} autoFocus />
          </label>
          {error && <p className="form-error" role="alert">{error}</p>}
          <button className="btn btn-primary btn-block" type="submit" disabled={busy || !name.trim()}>
            {busy ? '正在开垦土地…' : '创建森林，种下生命之树'}
          </button>
        </form>
      </div>
    </div>
  );
}