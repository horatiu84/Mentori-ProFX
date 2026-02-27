/**
 * Utilitar de sanitizare input pentru prevenirea code injection.
 * Se folosește pe toate formularele publice (RegisterForm, Login).
 */

/**
 * Elimină tag-urile HTML și caracterele periculoase dintr-un string.
 * @param {string} input - Textul de sanitizat
 * @param {number} maxLength - Lungimea maximă permisă (default: 255)
 * @returns {string} Textul sanitizat
 */
export function sanitizeText(input, maxLength = 255) {
  if (typeof input !== 'string') return '';

  return input
    // Elimină tag-uri HTML
    .replace(/<[^>]*>/g, '')
    // Elimină caractere de control (exceptând newline, tab)
    // eslint-disable-next-line no-control-regex
    .replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '')
    // Escape HTML entities periculoase
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#x27;')
    // Limitează lungimea
    .slice(0, maxLength)
    .trim();
}

/**
 * Sanitizează un email - doar caractere valide pentru email.
 * @param {string} email
 * @returns {string}
 */
export function sanitizeEmail(email) {
  if (typeof email !== 'string') return '';

  return email
    .toLowerCase()
    .trim()
    // Permite doar caractere valide în email
    .replace(/[^a-z0-9.@_+-]/g, '')
    .slice(0, 254); // RFC 5321 max email length
}

/**
 * Sanitizează un număr de telefon - doar cifre.
 * @param {string} phone
 * @returns {string}
 */
export function sanitizePhone(phone) {
  if (typeof phone !== 'string') return '';

  return phone
    .replace(/[^0-9+\s\-()]/g, '')
    .slice(0, 20)
    .trim();
}

/**
 * Sanitizează un username - doar caractere alfanumerice, punct și underscore.
 * @param {string} username
 * @returns {string}
 */
export function sanitizeUsername(username) {
  if (typeof username !== 'string') return '';

  return username
    .replace(/[^a-zA-Z0-9._-]/g, '')
    .slice(0, 50)
    .trim();
}

/**
 * Verifică dacă un string conține potențial cod malițios.
 * @param {string} input
 * @returns {boolean} true dacă inputul pare suspect
 */
export function containsSuspiciousContent(input) {
  if (typeof input !== 'string') return false;

  const suspiciousPatterns = [
    /<script\b/i,
    /javascript:/i,
    /on\w+\s*=/i,       // onclick=, onerror=, etc.
    /eval\s*\(/i,
    /expression\s*\(/i,
    /url\s*\(/i,
    /import\s*\(/i,
    /<iframe/i,
    /<object/i,
    /<embed/i,
    /<form/i,
    /data:\s*text\/html/i,
    /vbscript:/i,
    /&#x?[0-9a-f]+;/i,  // HTML encoded characters
    /\\u[0-9a-f]{4}/i,  // Unicode escapes
  ];

  return suspiciousPatterns.some(pattern => pattern.test(input));
}
