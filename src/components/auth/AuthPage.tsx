import { useMemo, useState, type FormEvent } from 'react';
import { useAuth } from '../../context/AuthContext';
import { isCloud } from '../../lib/backend';
import { ForestScene } from '../scene/ForestScene';
import type { GrowthEvent, Tree, TreeCategory } from '../../types';
import { TREE_SLOTS } from '../../lib/treeGen';

const AMBIENT_SPECS: { title: string; cat: TreeCategory; slot: number; seed: string; done: number; total: number }[] = [
  { title: '生命之树', cat: 'growth', slot: 13, seed: 'ambient-life', done: 3, total: 5 },
  { title: '考研之路', cat: 'study', slot: 1, seed: 'ambient-study', done: 2, total: 4 },
  { title: '晨跑计划', cat: 'health', slot: 7, seed: 'ambient-health', done: 1, total: 3 },
  { title: '环游世界', cat: 'dream', slot: 8, seed: 'ambient-dream', done: 0, total: 3 },
  { title: '第一份工作', cat: 'career', slot: 14, seed: 'ambient-career', done: 2, total: 2 },
  { title: '给家人的信', cat: 'relation', slot: 11, seed: 'ambient-relation', done: 1, total: 2 },
];

export function AuthPage() {
  const { signIn, signUp, demoLogin } = useAuth();
  const [tab, setTab] = useState<'login' | 'register'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [nickname, setNickname] = useState('');
  const [birthYear, setBirthYear] = useState(2000);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [notice, setNotice] = useState('');

  const { trees, eventsByTree } = useMemo(() => {
    const trees: Tree[] = AMBIENT_SPECS.map((s, i) => ({
      id: `ambient-${i}`,
      forestId: 'ambient',
      userId: 'ambient',
      title: s.title,
      category: s.cat,
      x: TREE_SLOTS[s.slot].x,
      y: TREE_SLOTS[s.slot].y,
      scale: TREE_SLOTS[s.slot].s,
      seed: s.seed,
      plantedAt: new Date().toISOString(),
    }));
    const map = new Map<string, GrowthEvent[]>();
    trees.forEach((t, i) => {
      const spec = AMBIENT_SPECS[i];
      map.set(
        t.id,
        Array.from({ length: spec.total }, (_, j) => ({
          id: `ae-${i}-${j}`,
          treeId: t.id,
          userId: 'ambient',
          title: '',
          note: '',
          dueDate: null,
          completedAt: j < spec.done ? new Date().toISOString() : null,
          createdAt: new Date().toISOString(),
        })),
      );
    });
    return { trees, eventsByTree: map };
  }, []);

  const switchTab = (t: 'login' | 'register') => {
    setTab(t);
    setError('');
    setNotice('');
  };

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (busy) return;
    setError('');
    setNotice('');
    if (!email.trim() || !password) {
      setError('请填写邮箱和密码');
      return;
    }
    setBusy(true);
    try {
      if (tab === 'login') {
        await signIn(email, password);
      } else {
        if (password.length < 6) {
          setError('密码至少需要 6 位');
          setBusy(false);
          return;
        }
        await signUp(email, password, nickname, birthYear);
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : '操作失败，请重试';
      if (msg.includes('确认链接')) setNotice(msg);
      else setError(msg);
      setBusy(false);
    }
  };

  const tryDemo = async () => {
    if (busy) return;
    setBusy(true);
    setError('');
    try {
      await demoLogin();
    } catch (err) {
      setError(err instanceof Error ? err.message : '演示登录失败');
      setBusy(false);
    }
  };

  const years = useMemo(() => {
    const now = new Date().getFullYear();
    return Array.from({ length: now - 3 - 1940 + 1 }, (_, i) => now - 3 - i);
  }, []);

  return (
    <div className="auth-page">
      <ForestScene trees={trees} eventsByTree={eventsByTree} birthYear={1996} selectedTreeId={null} onSelect={() => undefined} burst={null} interactive={false} />
      <div className="auth-scrim" />
      <div className="auth-card">
        <div className="auth-brand">
          <svg viewBox="0 0 64 64" width="52" height="52" aria-hidden>
            <path d="M32 4 C50 14 58 34 32 60 C6 34 14 14 32 4 Z" fill="#5aa845" />
            <path d="M32 10 L32 54 M32 24 L22 18 M32 24 L42 18 M32 36 L20 29 M32 36 L44 29 M32 47 L23 41 M32 47 L41 41" stroke="#fdf6e3" strokeWidth="2.6" strokeLinecap="round" fill="none" />
            <path d="M40 20 C46 24 48 30 44 36" stroke="#f2b134" strokeWidth="3" strokeLinecap="round" fill="none" />
          </svg>
          <h1 className="auth-title">Lucky Leaves <span>幸运叶子</span></h1>
          <p className="auth-tagline">把成长经历，种成一片森林</p>
        </div>

        <div className="auth-tabs" role="tablist">
          <button role="tab" aria-selected={tab === 'login'} className={`auth-tab ${tab === 'login' ? 'auth-tab-on' : ''}`} onClick={() => switchTab('login')}>
            登录
          </button>
          <button role="tab" aria-selected={tab === 'register'} className={`auth-tab ${tab === 'register' ? 'auth-tab-on' : ''}`} onClick={() => switchTab('register')}>
            注册
          </button>
        </div>

        <form className="form" onSubmit={submit}>
          {tab === 'register' && (
            <>
              <label className="field">
                <span className="field-label">昵称</span>
                <input className="input" value={nickname} onChange={(e) => setNickname(e.target.value)} placeholder="森林里怎么称呼你？" maxLength={16} />
              </label>
              <label className="field">
                <span className="field-label">出生年份（决定树木的形态）</span>
                <select className="input" value={birthYear} onChange={(e) => setBirthYear(Number(e.target.value))}>
                  {years.map((y) => (
                    <option key={y} value={y}>
                      {y} 年
                    </option>
                  ))}
                </select>
              </label>
            </>
          )}
          <label className="field">
            <span className="field-label">邮箱</span>
            <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@example.com" autoComplete="email" />
          </label>
          <label className="field">
            <span className="field-label">密码</span>
            <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} placeholder={tab === 'register' ? '至少 6 位' : '输入密码'} autoComplete={tab === 'login' ? 'current-password' : 'new-password'} />
          </label>
          {error && <p className="form-error" role="alert">{error}</p>}
          {notice && <p className="form-notice" role="status">{notice}</p>}
          <button className="btn btn-primary btn-block" type="submit" disabled={busy}>
            {busy ? '请稍候…' : tab === 'login' ? '进入森林' : '注册并进入森林'}
          </button>
        </form>

        {!isCloud && (
          <>
            <div className="auth-divider"><span>或</span></div>
            <button className="btn btn-gold btn-block" onClick={tryDemo} disabled={busy}>
              一键体验示范森林
            </button>
          </>
        )}
        <p className={`auth-mode ${isCloud ? 'mode-cloud' : 'mode-local'}`}>
          {isCloud ? '云端模式：数据保存在 Supabase，多设备同步' : '本地模式：未配置 Supabase，数据保存在本浏览器'}
        </p>
      </div>
    </div>
  );
}