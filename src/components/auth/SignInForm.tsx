import * as React from 'react';
import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Loader2 } from 'lucide-react';
import { useAuth } from './AuthProvider';
import { AuthDivider, AuthError, GoogleAuthButton, authInputClass, authLabelClass, authSubmitClass } from './AuthFormUI';

export function SignInForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const { signIn, signInWithGoogle } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setError(null);
    setLoading(true);
    const result = await signIn(email, password);
    if (result.error) {
      setError(result.error);
      setLoading(false);
      return;
    }
    navigate('/dashboard');
  };

  const handleGoogleSignIn = async () => {
    setError(null);
    setGoogleLoading(true);
    const result = await signInWithGoogle();
    if (result.error) {
      setError(result.error);
      setGoogleLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <GoogleAuthButton loading={googleLoading} disabled={googleLoading || loading} onClick={handleGoogleSignIn} />
      <AuthDivider />

      <form onSubmit={handleSubmit} className="space-y-6">
        <div>
          <label htmlFor="email" className={authLabelClass}>Email</label>
          <input
            id="email"
            type="email"
            placeholder="you@company.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
            autoComplete="email"
            className={authInputClass}
          />
        </div>

        <div>
          <label htmlFor="password" className={authLabelClass}>Password</label>
          <input
            id="password"
            type="password"
            value={password}
            onChange={(event) => setPassword(event.target.value)}
            required
            autoComplete="current-password"
            className={authInputClass}
          />
        </div>

        <AuthError message={error} />

        <button type="submit" className={authSubmitClass} disabled={loading || googleLoading}>
          {loading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" />Signing in...</> : 'Sign in'}
        </button>
      </form>
    </div>
  );
}
