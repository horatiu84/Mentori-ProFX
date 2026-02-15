import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, CardContent } from '../components/ui/card';
import { Input } from '../components/ui/input';
import logo from '../logo2.png';

const mentors = [
  { username: "Sergiu", password: "Sergiu", role: "mentor", mentorId: "sergiu" },
  { username: "Dan", password: "Dan", role: "mentor", mentorId: "dan" },
  { username: "Tudor", password: "Tudor", role: "mentor", mentorId: "tudor" },
  { username: "Eli", password: "Eli", role: "mentor", mentorId: "eli" },
  { username: "Adrian", password: "Adrian", role: "mentor", mentorId: "adrian" },
  { username: "Admin", password: "Admin", role: "admin", mentorId: null },
];

export default function Login() {
  const navigate = useNavigate();
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Simulăm un mic delay pentru UX
    setTimeout(() => {
      const user = mentors.find(m => m.username === username && m.password === password);
      
      if (user) {
        // Salvăm datele de autentificare în localStorage
        localStorage.setItem('isAuthenticated', 'true');
        localStorage.setItem('currentUser', username);
        localStorage.setItem('currentRole', user.role);
        localStorage.setItem('currentMentorId', user.mentorId || '');
        
        // Redirecționăm la dashboard
        navigate('/admin');
      } else {
        setError('Username sau parolă greșită!');
        setLoading(false);
      }
    }, 500);
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
                className="w-full p-4 rounded-xl border border-gray-600/50 bg-gray-800/50 text-white placeholder-gray-500 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all"
                disabled={loading}
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
                className="w-full p-4 rounded-xl border border-gray-600/50 bg-gray-800/50 text-white placeholder-gray-500 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all"
                disabled={loading}
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
