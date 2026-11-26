export function LogoSign() {
  return (
    <div className="logo-sign">
      <div className="sign-plank">
        <svg className="sign-sprig" viewBox="0 0 48 40" width="40" height="34" aria-hidden>
          <path d="M24 38 C24 24 24 16 24 8" stroke="#4f9a41" strokeWidth="3" strokeLinecap="round" fill="none" />
          <path d="M24 16 C14 14 8 8 8 2 C18 2 24 8 24 16 Z" fill="#63b350" />
          <path d="M24 22 C34 20 40 14 40 8 C30 8 24 14 24 22 Z" fill="#8fce6f" />
        </svg>
        <svg viewBox="0 0 64 64" width="30" height="30" aria-hidden>
          <path d="M32 4 C50 14 58 34 32 60 C6 34 14 14 32 4 Z" fill="#8fce6f" />
          <path d="M32 10 L32 54 M32 24 L22 18 M32 24 L42 18 M32 36 L20 29 M32 36 L44 29" stroke="#fdf6e3" strokeWidth="3" strokeLinecap="round" fill="none" />
        </svg>
        <span className="sign-name">幸运叶子</span>
        <i className="sign-nail sign-nail-l" />
        <i className="sign-nail sign-nail-r" />
      </div>
      <div className="sign-tagline">
        让每一段经历，都在这里生长
        <svg viewBox="0 0 24 24" width="12" height="12" aria-hidden>
          <path d="M12 20 C5 14 3 9 6.5 6.5 C9 5 11 6.5 12 8.5 C13 6.5 15 5 17.5 6.5 C21 9 19 14 12 20 Z" fill="none" stroke="#fdf6e3" strokeWidth="2" />
        </svg>
      </div>
    </div>
  );
}