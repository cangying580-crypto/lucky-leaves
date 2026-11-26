import { useEffect, useRef, useState } from 'react';

interface Props {
  nickname: string;
  muted: boolean;
  onToggleMute: () => void;
  onSignOut: () => void;
  onToggleStats: () => void;
  statsOpen: boolean;
}

export function UserChip({ nickname, muted, onToggleMute, onSignOut, onToggleStats, statsOpen }: Props) {
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onDown = (e: MouseEvent) => {
      if (menuRef.current && !menuRef.current.contains(e.target as Node)) setMenuOpen(false);
    };
    window.addEventListener('mousedown', onDown);
    return () => window.removeEventListener('mousedown', onDown);
  }, [menuOpen]);

  return (
    <div className="top-right">
      <button
        className="round-btn stats-toggle"
        onClick={onToggleStats}
        aria-label={statsOpen ? '收起森林统计' : '展开森林统计'}
        aria-expanded={statsOpen}
        title="森林统计"
      >
        <svg viewBox="0 0 24 24" width="19" height="19" fill="none">
          <path d="M4 20 L4 12 M10 20 L10 6 M16 20 L16 10 M22 20 L22 4" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" />
        </svg>
      </button>
      <button className="round-btn" onClick={onToggleMute} aria-label={muted ? '开启音效' : '关闭音效'} title={muted ? '开启音效' : '关闭音效'}>
        {muted ? (
          <svg viewBox="0 0 24 24" width="19" height="19" fill="none">
            <path d="M4 9 L8 9 L13 4.5 L13 19.5 L8 15 L4 15 Z" fill="currentColor" />
            <path d="M16.5 9.5 L21 14.5 M21 9.5 L16.5 14.5" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" width="19" height="19" fill="none">
            <path d="M4 9 L8 9 L13 4.5 L13 19.5 L8 15 L4 15 Z" fill="currentColor" />
            <path d="M16 9 A4.5 4.5 0 0 1 16 15 M18.5 6.5 A8 8 0 0 1 18.5 17.5" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
          </svg>
        )}
      </button>
      <div className="user-menu" ref={menuRef}>
        <button className="user-chip" onClick={() => setMenuOpen((v) => !v)} aria-label="用户菜单" aria-expanded={menuOpen}>
          <span className="user-avatar">{nickname.slice(0, 1)}</span>
          <span className="user-name">{nickname}</span>
          <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden>
            <path d="M6 9 L12 15 L18 9" stroke="currentColor" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </svg>
        </button>
        {menuOpen && (
          <div className="user-dropdown">
            <div className="user-dropdown-name">{nickname}</div>
            <button className="dropdown-item" onClick={onSignOut}>
              退出登录
            </button>
          </div>
        )}
      </div>
    </div>
  );
}