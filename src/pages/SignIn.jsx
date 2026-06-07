import { useEffect, useRef, useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabase';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Checkbox } from '@/components/ui/checkbox';
import { Loader2 } from 'lucide-react';
import { TOS_VERSION } from '@/lib/tos';

const TURNSTILE_SITE_KEY = import.meta.env.VITE_TURNSTILE_SITE_KEY;
const TURNSTILE_SCRIPT_SRC =
  'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit';

function useTurnstile() {
  const containerRef = useRef(null);
  const widgetIdRef = useRef(null);
  const [token, setToken] = useState(null);

  useEffect(() => {
    if (!TURNSTILE_SITE_KEY || !containerRef.current) return;

    let cancelled = false;

    const ensureScript = () => {
      if (document.querySelector(`script[src^="${TURNSTILE_SCRIPT_SRC}"]`)) return;
      const script = document.createElement('script');
      script.src = TURNSTILE_SCRIPT_SRC;
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    };

    const render = () => {
      if (cancelled || !window.turnstile || !containerRef.current) return;
      // Already rendered for this mount.
      if (widgetIdRef.current) return;
      widgetIdRef.current = window.turnstile.render(containerRef.current, {
        sitekey: TURNSTILE_SITE_KEY,
        theme: 'dark',
        callback: (t) => setToken(t),
        'expired-callback': () => setToken(null),
        'error-callback': () => setToken(null),
      });
    };

    ensureScript();

    if (window.turnstile) {
      render();
    } else {
      const poll = setInterval(() => {
        if (cancelled) {
          clearInterval(poll);
          return;
        }
        if (window.turnstile) {
          clearInterval(poll);
          render();
        }
      }, 100);
      return () => {
        cancelled = true;
        clearInterval(poll);
      };
    }

    return () => {
      cancelled = true;
      if (window.turnstile && widgetIdRef.current) {
        try { window.turnstile.remove(widgetIdRef.current); } catch { /* ignore */ }
        widgetIdRef.current = null;
      }
    };
  }, []);

  const reset = () => {
    if (window.turnstile && widgetIdRef.current) {
      try { window.turnstile.reset(widgetIdRef.current); } catch { /* ignore */ }
    }
    setToken(null);
  };

  return { containerRef, token, reset, enabled: !!TURNSTILE_SITE_KEY };
}

export default function SignIn() {
  const navigate = useNavigate();
  const [mode, setMode] = useState('signin'); // 'signin' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [fullName, setFullName] = useState('');
  const [username, setUsername] = useState('');
  const [tosAccepted, setTosAccepted] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);
  const [error, setError] = useState(null);

  const captcha = useTurnstile();

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setMessage(null);

    try {
      if (captcha.enabled && !captcha.token) {
        setError('Please complete the verification challenge.');
        return;
      }

      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
          options: captcha.token ? { captchaToken: captcha.token } : undefined,
        });
        if (error) {
          captcha.reset();
          setError('Invalid email or password.');
          return;
        }
        navigate('/', { replace: true });
      } else {
        if (!tosAccepted) {
          setError('You must agree to the Terms of Service to create an account.');
          return;
        }
        const trimmedUsername = username.trim().toLowerCase();
        if (trimmedUsername && !/^[a-z0-9_]{3,20}$/.test(trimmedUsername)) {
          setError('Username must be 3-20 characters: lowercase letters, numbers, or underscore.');
          return;
        }
        const { data, error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            captchaToken: captcha.token ?? undefined,
            data: {
              full_name: fullName,
              tos_version: TOS_VERSION,
              tos_accepted_at: new Date().toISOString(),
              ...(trimmedUsername ? { username: trimmedUsername } : {}),
            },
          },
        });
        if (error) {
          // 23505 = unique violation from the username partial unique index
          if (/duplicate key|already exists/i.test(error.message) && /username/i.test(error.message)) {
            captcha.reset();
            setError('That username is already taken. Try another.');
            return;
          }
          if (!/already|registered|exists/i.test(error.message)) {
            captcha.reset();
            setError(error.message);
            return;
          }
        }
        if (data?.session) {
          navigate('/', { replace: true });
        } else {
          setMessage('Check your email for a confirmation link.');
        }
      }
    } catch {
      captcha.reset();
      setError('Something went wrong. Please try again.');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-zinc-950 text-white px-4">
      <div className="w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold tracking-tight">Pact.</h1>
          <p className="mt-2 text-zinc-400 text-sm">
            {mode === 'signin' ? 'Sign in to your account' : 'Create your account'}
          </p>
        </div>

        <form onSubmit={submit} className="space-y-4 bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6">
          {mode === 'signup' && (
            <>
              <div className="space-y-1.5">
                <Label htmlFor="name">Full name</Label>
                <Input
                  id="name"
                  type="text"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="username">
                  Username <span className="text-zinc-500 font-normal">(optional)</span>
                </Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 pointer-events-none">@</span>
                  <Input
                    id="username"
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value.toLowerCase().replace(/[^a-z0-9_]/g, ''))}
                    maxLength={20}
                    placeholder="preston"
                    autoComplete="username"
                    className="pl-7"
                  />
                </div>
                <p className="text-xs text-zinc-500">3-20 chars: lowercase letters, numbers, underscore.</p>
              </div>
            </>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div className="space-y-1.5">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete={mode === 'signin' ? 'current-password' : 'new-password'}
              minLength={12}
            />
          </div>

          {mode === 'signup' && (
            <div className="flex items-start gap-2.5 pt-1">
              <Checkbox
                id="tos"
                checked={tosAccepted}
                onCheckedChange={(checked) => setTosAccepted(checked === true)}
                className="mt-0.5 border-zinc-600 data-[state=checked]:bg-violet-600 data-[state=checked]:border-violet-600"
              />
              <Label htmlFor="tos" className="text-sm text-zinc-300 leading-snug font-normal cursor-pointer">
                I have read and agree to the{' '}
                <Link
                  to="/Terms"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-violet-400 hover:text-violet-300 underline"
                >
                  Terms of Service
                </Link>
                .
              </Label>
            </div>
          )}

          {captcha.enabled && (
            <div className="flex justify-center pt-1">
              <div ref={captcha.containerRef} />
            </div>
          )}

          {error && (
            <div className="text-sm text-rose-400 bg-rose-500/10 border border-rose-500/20 rounded-lg px-3 py-2">
              {error}
            </div>
          )}
          {message && (
            <div className="text-sm text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 rounded-lg px-3 py-2">
              {message}
            </div>
          )}

          <Button
            type="submit"
            disabled={
              busy
              || (mode === 'signup' && !tosAccepted)
              || (captcha.enabled && !captcha.token)
            }
            className="w-full bg-violet-600 hover:bg-violet-700 text-white rounded-xl h-11 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {busy && <Loader2 className="w-4 h-4 mr-2 animate-spin" />}
            {mode === 'signin' ? 'Sign in' : 'Create account'}
          </Button>

          <div className="text-center text-sm text-zinc-400 pt-2">
            {mode === 'signin' ? (
              <>
                No account?{' '}
                <button
                  type="button"
                  onClick={() => { setMode('signup'); setError(null); setMessage(null); }}
                  className="text-violet-400 hover:text-violet-300"
                >
                  Sign up
                </button>
              </>
            ) : (
              <>
                Already have one?{' '}
                <button
                  type="button"
                  onClick={() => { setMode('signin'); setError(null); setMessage(null); }}
                  className="text-violet-400 hover:text-violet-300"
                >
                  Sign in
                </button>
              </>
            )}
          </div>
        </form>
      </div>
    </div>
  );
}
