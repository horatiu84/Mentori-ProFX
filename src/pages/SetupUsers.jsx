import { useState } from 'react';
import { setupUsers } from '../utils/setupUsers';
import { Card, CardContent } from '../components/ui/card';

export default function SetupUsers() {
  const [status, setStatus] = useState('ready'); // ready, running, success, error
  const [result, setResult] = useState(null);
  const [error, setError] = useState(null);

  const handleSetup = async () => {
    setStatus('running');
    setError(null);
    
    try {
      const res = await setupUsers();
      setResult(res);
      setStatus('success');
    } catch (err) {
      setError(err.message);
      setStatus('error');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-black to-gray-900 flex items-center justify-center px-4">
      <Card className="w-full max-w-lg bg-gray-900/50 backdrop-blur-sm border border-gray-700/50 shadow-2xl">
        <CardContent className="p-8 space-y-6">
          <div className="text-center space-y-4">
            <h1 className="text-3xl font-bold text-blue-400">Setup Users</h1>
            <p className="text-gray-300 text-sm">
              Acest script va crea utilizatorii în Firebase Firestore.
              <br />
              <span className="text-yellow-400">Rulează acest script o singură dată!</span>
            </p>
          </div>

          {status === 'ready' && (
            <button
              onClick={handleSetup}
              className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold py-3 px-6 rounded-xl transition-all duration-300 shadow-lg hover:shadow-blue-500/50"
            >
              🚀 Start Setup
            </button>
          )}

          {status === 'running' && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-400 mx-auto"></div>
              <p className="text-gray-300 mt-4">Se creează utilizatorii...</p>
            </div>
          )}

          {status === 'success' && result && (
            <div className="space-y-4">
              <div className="bg-green-500/20 border border-green-500/50 text-green-300 p-4 rounded-xl">
                <p className="font-bold text-center mb-2">✅ Setup complet!</p>
                <p className="text-sm">Utilizatori creați: {result.created}</p>
                <p className="text-sm">Utilizatori existenți: {result.skipped}</p>
              </div>
              
              <div className="bg-yellow-500/20 border border-yellow-500/50 text-yellow-300 p-4 rounded-xl text-sm">
                <p className="font-bold mb-2">⚠️ Important:</p>
                <ol className="list-decimal list-inside space-y-1">
                  <li>Testează login-ul cu credențialele actuale</li>
                  <li>Schimbă parolele din Firebase Console</li>
                  <li>Șterge acest fișier din producție</li>
                </ol>
              </div>

              <a
                href="/login"
                className="block text-center bg-gray-700 hover:bg-gray-600 text-white font-bold py-3 px-6 rounded-xl transition-all duration-300"
              >
                Mergi la Login
              </a>
            </div>
          )}

          {status === 'error' && error && (
            <div className="space-y-4">
              <div className="bg-red-500/20 border border-red-500/50 text-red-300 p-4 rounded-xl">
                <p className="font-bold text-center mb-2">❌ Eroare</p>
                <p className="text-sm">{error}</p>
              </div>
              
              <button
                onClick={handleSetup}
                className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold py-3 px-6 rounded-xl transition-all duration-300"
              >
                🔄 Încearcă din nou
              </button>
            </div>
          )}

          <div className="bg-gray-800/50 border border-gray-700/50 p-4 rounded-xl text-xs text-gray-400">
            <p className="font-bold mb-2">Utilizatori ce vor fi creați:</p>
            <ul className="space-y-1">
              <li>• Sergiu (mentor)</li>
              <li>• Dan (mentor)</li>
              <li>• Tudor (mentor)</li>
              <li>• Eli (mentor)</li>
              <li>• Adrian (mentor)</li>
              <li>• Admin (admin)</li>
            </ul>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
