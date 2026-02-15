import React, { useEffect, useState } from 'react';
import { Navigate } from 'react-router-dom';

export default function ProtectedRoute({ children }) {
  const [isAuthenticated, setIsAuthenticated] = useState(null);

  useEffect(() => {
    // Verificăm dacă utilizatorul este autentificat
    const authData = localStorage.getItem('isAuthenticated');
    setIsAuthenticated(authData === 'true');
  }, []);

  // Loading state
  if (isAuthenticated === null) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-950 to-black flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p className="text-gray-300 text-lg">Verificare autentificare...</p>
        </div>
      </div>
    );
  }

  // Redirect la pagina de înscriere dacă nu este autentificat
  if (!isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return children;
}
