export function decodeJwtPayload(token) {
  if (!token || typeof token !== 'string') return null;

  const parts = token.split('.');
  if (parts.length !== 3) return null;

  try {
    const base64 = parts[1].replace(/-/g, '+').replace(/_/g, '/');
    const padded = base64 + '='.repeat((4 - (base64.length % 4)) % 4);
    const decoded = atob(padded);
    const json = decodeURIComponent(
      decoded
        .split('')
        .map((char) => `%${(`00${char.charCodeAt(0).toString(16)}`).slice(-2)}`)
        .join('')
    );
    return JSON.parse(json);
  } catch {
    return null;
  }
}

export function isJwtExpired(token, skewSeconds = 15) {
  const payload = decodeJwtPayload(token);
  if (!payload || typeof payload.exp !== 'number') return true;
  const now = Math.floor(Date.now() / 1000);
  return payload.exp <= now + skewSeconds;
}

export function isTokenValid(token) {
  return !!token && !isJwtExpired(token);
}

export function clearStoredAuth() {
  localStorage.removeItem('authToken');
  localStorage.removeItem('isAuthenticated');
  localStorage.removeItem('currentUser');
  localStorage.removeItem('currentRole');
  localStorage.removeItem('currentMentorId');
}

export function saveAuthSession(token, user) {
  localStorage.setItem('authToken', token);
  localStorage.setItem('isAuthenticated', 'true');
  localStorage.setItem('currentUser', user?.username || '');
  localStorage.setItem('currentRole', user?.role || '');
  localStorage.setItem('currentMentorId', user?.mentorId || '');
}

export function getAuthUserFromToken(token) {
  const payload = decodeJwtPayload(token);
  if (!payload) return null;

  return {
    username: payload.username || '',
    role: payload.app_role || payload.role || '',
    mentorId: payload.mentor_id || '',
    userId: payload.user_id || payload.sub || '',
  };
}
