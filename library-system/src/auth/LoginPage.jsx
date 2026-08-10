import { useState } from 'react';
import { Navigate, useLocation, useNavigate } from 'react-router-dom';
import { Library } from 'lucide-react';
import { useAuth } from './AuthContext';
import { Button, Field, Input } from '../components/ui';

/**
 * The left panel is the shelf: a run of spines in the classification colours.
 * It is the same colour system the interface uses to identify every book, so
 * the sign-in screen teaches the vocabulary before you are inside.
 */
function ShelfGraphic() {
  const spines = [
    ['000', 'General', 'var(--color-dewey-000)', 74],
    ['155', 'Psychology', 'var(--color-dewey-100)', 92],
    ['232', 'Religion', 'var(--color-dewey-200)', 64],
    ['302', 'Society', 'var(--color-dewey-300)', 86],
    ['428', 'Language', 'var(--color-dewey-400)', 70],
    ['523', 'Astronomy', 'var(--color-dewey-500)', 96],
    ['612', 'Medicine', 'var(--color-dewey-600)', 68],
    ['759', 'Painting', 'var(--color-dewey-700)', 88],
    ['823', 'Fiction', 'var(--color-dewey-800)', 78],
    ['941', 'History', 'var(--color-dewey-900)', 90],
  ];

  return (
    <div className="flex items-end gap-1.5" aria-hidden>
      {spines.map(([num, label, colour, height], i) => (
        <div
          key={num}
          className="flex flex-col justify-between rounded-t-[3px] px-1.5 pb-2 pt-2.5"
          style={{
            background: colour,
            height: `${height}%`,
            minHeight: 120,
            width: 34,
            animation: `rise 600ms cubic-bezier(.2,.8,.3,1) ${i * 55}ms both`,
          }}
        >
          <span
            className="data text-[9px] font-bold tracking-wider text-white/95"
            style={{ writingMode: 'vertical-rl' }}
          >
            {label}
          </span>
          <span className="data text-[9px] font-bold text-white/80">{num}</span>
        </div>
      ))}
    </div>
  );
}

export default function LoginPage() {
  const { user, login } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null);
  const [busy, setBusy] = useState(false);

  if (user) return <Navigate to={location.state?.from || '/'} replace />;

  const submit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) {
      setError('Enter your email and password to sign in.');
      return;
    }
    setBusy(true);
    setError(null);
    try {
      await login(email.trim(), password);
      navigate(location.state?.from || '/', { replace: true });
    } catch (err) {
      setError(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="grid min-h-screen lg:grid-cols-[1.1fr_1fr]">
      <style>{`@keyframes rise { from { transform: translateY(14px); opacity: 0 } to { transform: none; opacity: 1 } }`}</style>

      <div className="hidden flex-col justify-between bg-ink-800 p-10 lg:flex xl:p-14">
        <div className="flex items-center gap-2.5 text-white">
          <Library size={22} strokeWidth={1.75} />
          <span className="font-display text-[17px] font-semibold tracking-tight">Athenaeum</span>
        </div>

        <div>
          <ShelfGraphic />
          <h2 className="mt-9 max-w-md font-display text-[30px] leading-[1.15] font-semibold tracking-tight text-white">
            Every book on the shelf, and everyone who has one.
          </h2>
          <p className="mt-3 max-w-md text-[14.5px] leading-relaxed text-ink-200">
            Issue and return at the desk, keep the catalogue current, and see what is
            overdue before the day starts.
          </p>
        </div>

        <p className="text-[12.5px] text-ink-300">
          Colours follow the Dewey ranges used on the shelves, so a call number reads
          the same here as it does downstairs.
        </p>
      </div>

      <div className="flex items-center justify-center px-5 py-12 sm:px-10">
        <div className="w-full max-w-sm">
          <div className="mb-8 flex items-center gap-2.5 lg:hidden">
            <Library size={20} className="text-ink-800" strokeWidth={1.75} />
            <span className="font-display text-[16px] font-semibold text-ink-800">Athenaeum</span>
          </div>

          <h1 className="font-display text-[26px] font-semibold tracking-tight text-ink-800">
            Sign in
          </h1>
          <p className="mt-1.5 text-[14px] text-ink-400">
            For library staff. Members do not sign in here.
          </p>

          {error && (
            <div className="mt-5 rounded-md border border-[var(--color-due-late)]/30 bg-[var(--color-due-late)]/5 px-3.5 py-2.5 text-[13.5px] text-[var(--color-due-late)]">
              {error}
            </div>
          )}

          <form onSubmit={submit} className="mt-6 space-y-4">
            <Field label="Email" required>
              <Input
                type="email" value={email} autoComplete="username" autoFocus
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@athenaeum.lk"
              />
            </Field>
            <Field label="Password" required>
              <Input
                type="password" value={password} autoComplete="current-password"
                onChange={(e) => setPassword(e.target.value)}
              />
            </Field>
            <Button type="submit" size="lg" loading={busy} className="w-full">
              {busy ? 'Signing in' : 'Sign in'}
            </Button>
          </form>

          <div className="mt-8 rounded-lg border border-shelf bg-white p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.09em] text-ink-400">
              Demo accounts
            </p>
            <div className="mt-2.5 space-y-1.5">
              {[
                ['iresha@athenaeum.lk', 'Administrator'],
                ['malith@athenaeum.lk', 'Librarian'],
              ].map(([mail, role]) => (
                <button
                  key={mail}
                  type="button"
                  onClick={() => { setEmail(mail); setPassword('demo1234'); }}
                  className="flex w-full items-center justify-between rounded px-1 py-1 text-left hover:bg-ink-50"
                >
                  <span className="data text-[12.5px] text-ink-700">{mail}</span>
                  <span className="text-[12px] text-ink-400">{role}</span>
                </button>
              ))}
            </div>
            <p className="mt-2.5 text-[12px] text-ink-400">
              Password <code className="data">demo1234</code>. Served by the mock server until you
              build <code className="data">POST /api/auth/login</code>.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
