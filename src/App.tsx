import { AuthProvider, useAuth } from './context/AuthContext';
import { ToastProvider } from './context/ToastContext';
import { AuthPage } from './components/auth/AuthPage';
import { HomePage } from './pages/HomePage';

function Gate() {
  const { session, loading } = useAuth();
  if (loading) {
    return (
      <div className="splash">
        <svg viewBox="0 0 64 64" width="64" height="64" className="splash-leaf">
          <path d="M32 4 C50 14 58 34 32 60 C6 34 14 14 32 4 Z" fill="#5aa845" />
          <path d="M32 10 L32 54 M32 24 L22 18 M32 24 L42 18 M32 36 L20 29 M32 36 L44 29" stroke="#fdf6e3" strokeWidth="2.6" strokeLinecap="round" fill="none" />
        </svg>
        <p>Lucky Leaves · 幸运叶子</p>
      </div>
    );
  }
  return session ? <HomePage /> : <AuthPage />;
}

export default function App() {
  return (
    <AuthProvider>
      <ToastProvider>
        <Gate />
      </ToastProvider>
    </AuthProvider>
  );
}