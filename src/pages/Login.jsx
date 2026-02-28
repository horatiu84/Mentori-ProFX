import React, { useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { Card, CardContent } from '../components/ui/card';
import { Input } from '../components/ui/input';
import { sanitizeUsername, containsSuspiciousContent } from '../utils/sanitize';
import { saveAuthSession, saveLegacySession } from '../utils/auth';
import logo from '../logo2.png';

// Rate limiting: maxim 5 încercări, apoi lockout 30 secunde
const MAX_ATTEMPTS = 5;
const LOCKOUT_DURATION_MS = 30000;
const AUTH_REQUEST_TIMEOUT_MS = 35000;

export default function Login() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [lockedUntil, setLockedUntil] = useState(0);
  const attemptCount = useRef(0);

  const authenticateWithTimeout = async (supabaseUrl, payload, timeoutMs) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(
        `${supabaseUrl}/functions/v1/authenticate`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json'
          },
          body: JSON.stringify(payload),
          signal: controller.signal
        }
      );
      return response;
    } finally {
      clearTimeout(timeoutId);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    // Verificare lockout
    const now = Date.now();
    if (now < lockedUntil) {
      const secondsLeft = Math.ceil((lockedUntil - now) / 1000);
      setError(`Prea multe încercări. Încearcă din nou în ${secondsLeft} secunde.`);
      return;
    }

    // Sanitizare username
    const sanitizedUsername = sanitizeUsername(username);

    // Verificare conținut suspect
    if (containsSuspiciousContent(username) || containsSuspiciousContent(password)) {
      setError('Datele introduse conțin caractere nepermise.');
      return;
    }

    if (!sanitizedUsername) {
      setError('Te rugăm să introduci un username valid.');
      return;
    }

    if (!password || password.length > 128) {
      setError('Parola introdusă nu este validă.');
      return;
    }

    setLoading(true);

    try {
      // FAST PATH: authenticate directly via DB RPC (avoids slow edge cold starts)
      const { data: fastAuthRows, error: fastAuthError } = await supabase.rpc('auth_login', {
        p_username: sanitizedUsername,
        p_password: password
      });

      const fastUser = Array.isArray(fastAuthRows) && fastAuthRows.length > 0 ? fastAuthRows[0] : null;

      if (fastAuthError) {
        console.warn('Fast auth RPC failed, fallback to edge authenticate:', fastAuthError.message);
      }

      if (fastUser) {
        const userData = {
          username: fastUser.username,
          role: fastUser.role,
          mentorId: fastUser.mentorId || '',
          id: fastUser.id,
        };

        saveLegacySession(userData);
        attemptCount.current = 0;

        // Token hydration in background (needed for protected admin edge functions)
        void (async () => {
          try {
            const supabaseUrlBg = import.meta.env.VITE_SUPABASE_URL;
            const responseBg = await authenticateWithTimeout(
              supabaseUrlBg,
              { username: sanitizedUsername, password },
              AUTH_REQUEST_TIMEOUT_MS
            );

            if (!responseBg.ok) return;
            const resultBg = await responseBg.json();
            if (resultBg?.accessToken) {
              saveAuthSession(resultBg.accessToken, userData);
            }
          } catch {
            // silent: fast login already succeeded
          }
        })();

        setLoading(false);
        navigate('/admin');
        return;
      }

      // FALLBACK: edge authenticate
      // Call authentication Edge Function (secure - doesn't expose users table)
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const payload = { username: sanitizedUsername, password };

      let response;
      try {
        response = await authenticateWithTimeout(supabaseUrl, payload, AUTH_REQUEST_TIMEOUT_MS);
      } catch (firstErr) {
        if (firstErr?.name !== 'AbortError') throw firstErr;
        response = await authenticateWithTimeout(supabaseUrl, payload, AUTH_REQUEST_TIMEOUT_MS);
      }

      let result = {};
      try {
        result = await response.json();
      } catch {
        result = { error: 'Răspuns invalid de la server' };
      }

      if (!response.ok) {
        // Incrementare contor încercări eșuate
        attemptCount.current += 1;
        if (attemptCount.current >= MAX_ATTEMPTS) {
          setLockedUntil(Date.now() + LOCKOUT_DURATION_MS);
          attemptCount.current = 0;
          setError(`Prea multe încercări eșuate. Contul este blocat temporar pentru 30 de secunde.`);
        } else {
          setError(result.error || 'Username sau parolă greșită!');
        }
        return;
      }

      // Reset contor la succes
      attemptCount.current = 0;

      // Autentificare reușită - salvăm token + date user în localStorage
      const userData = result.user;
      if (!result.accessToken) {
        setError('Răspuns de autentificare invalid (lipsește token-ul).');
        setLoading(false);
        return;
      }

      saveAuthSession(result.accessToken, userData);
      
      // Redirecționăm la dashboard
      setLoading(false);
      navigate('/admin');
    } catch (err) {
      console.error('Eroare la autentificare:', err);
      if (err?.name === 'AbortError') {
        setError('Serverul răspunde prea greu. Încearcă din nou în câteva secunde.');
      } else {
        setError('A apărut o eroare la autentificare. Te rugăm să încerci din nou.');
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-950 to-black flex items-center justify-center p-6">
      <Card className="bg-gray-900/50 backdrop-blur-sm border border-gray-700/50 shadow-2xl max-w-md w-full">
        <CardContent className="p-8">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <img src={logo} alt="ProFX Logo" className="h-20 w-auto" />
          </div>

          {/* Title */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-2">
              Autentificare
            </h1>
            <p className="text-gray-400">
              Dashboard Mentorii & Admin
            </p>
          </div>

          {/* Error Message */}
          {error && (
            <div className="mb-6 bg-red-500/20 border border-red-500/50 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <div className="bg-red-500/30 rounded-full p-1">
                  <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <p className="text-red-300 text-sm">{error}</p>
              </div>
            </div>
          )}

          {/* Login Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Username */}
            <div>
              <label htmlFor="username" className="block text-sm font-medium text-gray-300 mb-2">
                Username
              </label>
              <Input
                id="username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="Introduceți username-ul"
                maxLength={50}
                autoComplete="username"
                className="w-full p-4 rounded-xl border border-gray-600/50 bg-gray-800/50 text-white placeholder-gray-500 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all"
                disabled={loading || Date.now() < lockedUntil}
                required
              />
            </div>

            {/* Password */}
            <div>
              <label htmlFor="password" className="block text-sm font-medium text-gray-300 mb-2">
                Parolă
              </label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Introduceți parola"
                maxLength={128}
                autoComplete="current-password"
                className="w-full p-4 rounded-xl border border-gray-600/50 bg-gray-800/50 text-white placeholder-gray-500 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all"
                disabled={loading || Date.now() < lockedUntil}
                required
              />
            </div>

            {/* Submit Button */}
            <button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-semibold py-4 px-6 rounded-xl transition-all transform hover:scale-[1.02] active:scale-[0.98] disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none shadow-lg"
            >
              {loading ? (
                <span className="flex items-center justify-center gap-2">
                  <svg className="animate-spin h-5 w-5" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                  Autentificare...
                </span>
              ) : (
                'Autentifică-te'
              )}
            </button>
          </form>

          {/* Back to Home */}
          <div className="text-center mt-6">
            <a 
              href="/" 
              className="text-sm text-gray-500 hover:text-gray-300 transition-colors"
            >
              ← Înapoi la pagina de înscriere
            </a>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
