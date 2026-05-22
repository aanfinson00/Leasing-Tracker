import { useEffect, useState, type ReactNode } from 'react';
import { Lock } from 'lucide-react';
import { ParceIcon } from './ParceIcon';

const STORAGE_KEY = 'app:unlocked';
const ATTEMPT_KEY = 'app:auth:attempts';
const LOCKOUT_KEY = 'app:auth:lockoutUntil';
const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 30_000;

const EXPECTED_HASH = (import.meta.env.VITE_PASSWORD_HASH ?? '').trim();

async function sha256(input: string): Promise<string> {
  const enc = new TextEncoder().encode(input);
  const hashBuf = await crypto.subtle.digest('SHA-256', enc);
  return Array.from(new Uint8Array(hashBuf))
    .map((b) => b.toString(16).padStart(2, '0'))
    .join('');
}

interface LoginGateProps {
  children: ReactNode;
}

export function LoginGate({ children }: LoginGateProps) {
  const [unlocked, setUnlocked] = useState<boolean>(() => {
    if (!EXPECTED_HASH) return true; // no password configured → pass through (dev mode)
    return localStorage.getItem(STORAGE_KEY) === 'true';
  });
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [lockoutRemaining, setLockoutRemaining] = useState(0);

  // Tick down lockout timer
  useEffect(() => {
    if (unlocked) return;
    const lockoutUntil = parseInt(localStorage.getItem(LOCKOUT_KEY) ?? '0', 10);
    if (!lockoutUntil) return;
    const tick = () => {
      const remaining = Math.max(0, lockoutUntil - Date.now());
      setLockoutRemaining(remaining);
      if (remaining === 0) {
        localStorage.removeItem(LOCKOUT_KEY);
        localStorage.removeItem(ATTEMPT_KEY);
      }
    };
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [unlocked]);

  if (unlocked) return <>{children}</>;

  const isLockedOut = lockoutRemaining > 0;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isLockedOut || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const hash = await sha256(password);
      if (hash === EXPECTED_HASH) {
        localStorage.setItem(STORAGE_KEY, 'true');
        localStorage.removeItem(ATTEMPT_KEY);
        localStorage.removeItem(LOCKOUT_KEY);
        setUnlocked(true);
      } else {
        const attempts = parseInt(localStorage.getItem(ATTEMPT_KEY) ?? '0', 10) + 1;
        localStorage.setItem(ATTEMPT_KEY, String(attempts));
        if (attempts >= MAX_ATTEMPTS) {
          const until = Date.now() + LOCKOUT_MS;
          localStorage.setItem(LOCKOUT_KEY, String(until));
          setLockoutRemaining(LOCKOUT_MS);
          setError(`Too many attempts. Try again in ${Math.ceil(LOCKOUT_MS / 1000)}s.`);
        } else {
          setError(`Incorrect password (${MAX_ATTEMPTS - attempts} attempts left).`);
        }
        setPassword('');
      }
    } catch (err) {
      setError('Could not verify password — your browser may not support crypto.subtle.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center overflow-hidden p-6"
      style={{ background: '#121010' }}
    >
      {/* Hero texture — subtle accent radial gradients */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            radial-gradient(ellipse at 35% 40%, rgba(201, 100, 66, 0.10) 0%, transparent 60%),
            radial-gradient(ellipse at 65% 70%, rgba(201, 100, 66, 0.06) 0%, transparent 50%)
          `,
        }}
      />

      {/* Animated grid — three nested layers:
          outer drifts, middle pulses, inner glow sweeps with a wave mask.
          Ported from ParceCRM's login screen. */}
      <div
        className="pointer-events-none lt-animate-grid-move"
        style={{ position: 'absolute', inset: '-80px' }}
      >
        <div
          className="absolute inset-0 lt-animate-grid-pulse will-change-[transform,opacity]"
          style={{ transformOrigin: 'center' }}
        >
          {/* Glow layer: blurred grid with wave mask */}
          <div
            className="absolute inset-0 lt-animate-wave-sweep"
            style={{
              backgroundImage: `
                linear-gradient(rgba(201, 100, 66, 0.35) 2px, transparent 2px),
                linear-gradient(90deg, rgba(201, 100, 66, 0.35) 2px, transparent 2px)
              `,
              backgroundSize: '60px 60px',
              filter: 'blur(5px)',
            }}
          />
          {/* Sharp grid lines */}
          <div
            className="absolute inset-0"
            style={{
              backgroundImage: `
                linear-gradient(rgba(201, 100, 66, 0.14) 1px, transparent 1px),
                linear-gradient(90deg, rgba(201, 100, 66, 0.14) 1px, transparent 1px)
              `,
              backgroundSize: '60px 60px',
            }}
          />
        </div>
      </div>

      {/* Card */}
      <div className="relative z-10 w-full max-w-sm lt-animate-fade-in-up">
        <div className="bg-bg-elevated rounded-2xl shadow-lift p-8 border border-border">
          <div className="flex flex-col items-center text-center mb-8">
            <div className="flex items-center justify-center mb-4">
              <ParceIcon size="xl" variant="on-light" />
            </div>
            <h1
              className="text-5xl text-fg font-extralight"
              style={{ letterSpacing: '0.08em' }}
            >
              parce
            </h1>
            <p
              className="text-sm text-fg-muted mt-4 inline-flex items-center gap-2"
            >
              <Lock size={12} strokeWidth={2} />
              Restricted access
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Password"
                autoFocus
                disabled={isLockedOut || submitting}
                className="w-full px-3.5 py-3 bg-bg rounded-xl text-sm text-fg placeholder:text-fg-subtle focus:outline-none focus:ring-2 focus:ring-accent transition-all shadow-soft text-center tracking-wider border border-border"
              />
              {error && (
                <p className="mt-2 text-xs text-danger text-center">{error}</p>
              )}
              {isLockedOut && !error && (
                <p className="mt-2 text-xs text-fg-subtle text-center">
                  Locked out — {Math.ceil(lockoutRemaining / 1000)}s remaining
                </p>
              )}
            </div>

            <button
              type="submit"
              disabled={isLockedOut || submitting || password.length === 0}
              className="w-full px-4 py-3 text-sm font-semibold bg-accent text-accent-fg rounded-xl hover:bg-accent-hover transition-colors shadow-soft disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {submitting ? 'Checking…' : 'Continue'}
            </button>
          </form>

          <p className="mt-6 text-[11px] text-fg-subtle text-center leading-relaxed">
            Unlock state is stored locally on this device.
            <br />
            Log out from the sidebar to clear.
          </p>
        </div>
      </div>
    </div>
  );
}
