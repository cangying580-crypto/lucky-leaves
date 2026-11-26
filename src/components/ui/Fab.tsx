interface Props {
  onAddEvent: () => void;
  onPlantTree: () => void;
  onOpenJournal: () => void;
  disabled?: boolean;
}

export function Fab({ onAddEvent, onPlantTree, onOpenJournal, disabled }: Props) {
  return (
    <>
      <button className="journal-btn" onClick={onOpenJournal} aria-label="打开成长记录">
        <svg viewBox="0 0 24 24" width="24" height="24" fill="none">
          <path d="M5 20 L5 12 M10 20 L10 6 M15 20 L15 10 M20 20 L20 4" stroke="currentColor" strokeWidth="2.8" strokeLinecap="round" />
        </svg>
        <span>成长记录</span>
      </button>
      <div className="fab-stack">
        <button className="fab fab-plant" onClick={onPlantTree} disabled={disabled} aria-label="种下新树" title="种下新树">
          <svg viewBox="0 0 24 24" width="22" height="22" fill="none">
            <path d="M12 21 L12 11" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" />
            <path d="M12 12 C12 7 8 4 3.5 4 C3.5 9 7 12 12 12 Z" fill="currentColor" opacity="0.9" />
            <path d="M12 14 C12 10 15.5 7.5 20 7.5 C20 12 16.5 14.5 12 14 Z" fill="currentColor" opacity="0.7" />
          </svg>
          <span className="fab-tip">种下新树</span>
        </button>
        <button className="fab fab-main" onClick={onAddEvent} disabled={disabled} aria-label="添加事件">
          <svg className="fab-flower" viewBox="0 0 24 24" width="20" height="20" aria-hidden>
            {[0, 72, 144, 216, 288].map((deg) => (
              <ellipse key={deg} cx="12" cy="7.5" rx="3" ry="4.6" fill="#fffdf5" transform={`rotate(${deg} 12 12)`} />
            ))}
            <circle cx="12" cy="12" r="2.6" fill="#f2b134" />
          </svg>
          <svg viewBox="0 0 24 24" width="22" height="22">
            <path d="M12 5 L12 19 M5 12 L19 12" stroke="currentColor" strokeWidth="3" strokeLinecap="round" />
          </svg>
          <span className="fab-label">添加事件</span>
        </button>
      </div>
    </>
  );
}