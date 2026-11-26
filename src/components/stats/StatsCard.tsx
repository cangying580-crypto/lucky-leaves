import type { ForestStats } from '../../hooks/useForestData';

interface Props {
  stats: ForestStats;
  open: boolean;
}

export function StatsCard({ stats, open }: Props) {
  const pct = Math.round(stats.rate * 100);
  return (
    <section className={`stats-card ${open ? 'stats-open' : ''}`} aria-label="我的森林统计">
      <svg className="card-sprig card-sprig-l" viewBox="0 0 40 32" width="34" height="27" aria-hidden>
        <path d="M20 30 C20 20 20 12 20 6" stroke="#4f9a41" strokeWidth="2.6" strokeLinecap="round" fill="none" />
        <path d="M20 14 C12 12 7 7 7 2 C15 2 20 7 20 14 Z" fill="#63b350" />
        <path d="M20 19 C28 17 33 12 33 7 C25 7 20 12 20 19 Z" fill="#8fce6f" />
      </svg>
      <svg className="card-sprig card-sprig-r" viewBox="0 0 40 32" width="34" height="27" aria-hidden>
        <path d="M20 30 C20 20 20 12 20 6" stroke="#4f9a41" strokeWidth="2.6" strokeLinecap="round" fill="none" />
        <path d="M20 14 C12 12 7 7 7 2 C15 2 20 7 20 14 Z" fill="#8fce6f" />
        <path d="M20 19 C28 17 33 12 33 7 C25 7 20 12 20 19 Z" fill="#63b350" />
      </svg>
      <h2 className="stats-title">我的森林</h2>
      <div className="stats-cols">
        <div className="stats-col">
          <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden>
            <path d="M12 22 L12 13" stroke="#8a5a33" strokeWidth="2.4" strokeLinecap="round" />
            <circle cx="12" cy="8.5" r="6.5" fill="#5aa845" />
            <circle cx="7.5" cy="11" r="4" fill="#63b350" />
            <circle cx="16.5" cy="11" r="4" fill="#79c257" />
          </svg>
          <span className="stats-num">{stats.treeCount}</span>
          <span className="stats-cap">人生树木</span>
        </div>
        <div className="stats-col">
          <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden>
            <path d="M12 3 C18 7 20 13 12 21 C4 13 6 7 12 3 Z" fill="#8fce6f" />
            <path d="M12 6 L12 18" stroke="#fdf6e3" strokeWidth="1.6" strokeLinecap="round" />
          </svg>
          <span className="stats-num">{stats.eventCount}</span>
          <span className="stats-cap">记录事件</span>
        </div>
        <div className="stats-col">
          <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden>
            <circle cx="12" cy="12" r="9.5" fill="#3f9d5a" />
            <path d="M8 12 L11 15 L16.5 9" stroke="#fdf6e3" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
          </svg>
          <span className="stats-num">{stats.doneCount}</span>
          <span className="stats-cap">已完成</span>
        </div>
      </div>
      <div className="stats-progress-row">
        <span>森林成长进度</span>
        <strong>{pct}%</strong>
      </div>
      <div className="stats-bar-track" role="progressbar" aria-valuenow={pct} aria-valuemin={0} aria-valuemax={100} aria-label="森林成长进度">
        <div className="stats-bar-fill" style={{ width: `${pct}%` }} />
      </div>
      <div className="stats-streak">
        <svg viewBox="0 0 24 24" width="14" height="14" aria-hidden>
          <path d="M12 2 C15 6 19 8 19 13 A7 7 0 0 1 5 13 C5 10 7 8 8 6 C9 8 10.5 9 12 9 C11 7 11.5 4 12 2 Z" fill="#e8604c" />
        </svg>
        连续成长 {stats.streak} 天
      </div>
      <p className="stats-quote">
        <svg viewBox="0 0 24 24" width="16" height="16" aria-hidden>
          <path d="M12 3 C18 7 20 13 12 21 C4 13 6 7 12 3 Z" fill="#8fce6f" />
          <path d="M12 6 L12 18" stroke="#fdf6e3" strokeWidth="1.6" strokeLinecap="round" />
        </svg>
        让每一片黄色叶子，都成为成长的证明。
      </p>
    </section>
  );
}