export const formatDate = (val) => {
  if (!val) return "N/A";
  try {
    // Supabase returns ISO strings for timestamptz
    return new Date(val).toLocaleString('ro-RO', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZone: 'Europe/Bucharest'
    });
  } catch {
    return "N/A";
  }
};

export const MENTORI_DISPONIBILI = [
  { id: 'sergiu', nume: 'Sergiu' },
  { id: 'eli', nume: 'Eli' },
  { id: 'dan', nume: 'Dan' },
  { id: 'tudor', nume: 'Tudor' },
  { id: 'adrian', nume: 'Adrian' }
];

export const MENTOR_PHOTOS = {
  sergiu: '/mentori/Sergiu.jpg',
  eli: '/mentori/Eli.jpg',
  dan: '/mentori/Dan.jpg',
  tudor: '/mentori/Tudor.jpg',
  adrian: '/mentori/Adrian.jpg'
};

export const LEAD_STATUS = {
  NEALOCAT: 'nealocat',
  ALOCAT: 'alocat',
  CONFIRMAT: 'confirmat',
  NECONFIRMAT: 'neconfirmat',
  NO_SHOW: 'no_show',
  COMPLET: 'complet',
  IN_PROGRAM: 'in_program',
  COMPLET_3_SESIUNI: 'complet_3_sesiuni',
  COMPLET_2_SESIUNI: 'complet_2_sesiuni',
  COMPLET_SESIUNE_FINALA: 'complet_sesiune_finala',
  COMPLET_SESIUNE_1: 'complet_sesiune_1',
};

export const ONE_TO_TWENTY_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  NO_SHOW: 'no_show',
  COMPLETED: 'completed'
};

export const TIMEOUT_6H = 6 * 60 * 60 * 1000;

export const checkLeadTimeout = (lead) => {
  if (lead.status !== LEAD_STATUS.ALOCAT) return false;
  if (!lead.dataTimeout) return false;
  const dataTimeout = new Date(lead.dataTimeout);
  const now = new Date();
  return now >= dataTimeout;
};

export const getTimeUntilTimeout = (lead) => {
  if (!lead.dataTimeout) return null;
  const dataTimeout = new Date(lead.dataTimeout);
  const now = new Date();
  const minutesLeft = Math.floor((dataTimeout - now) / (1000 * 60));
  return minutesLeft > 0 ? minutesLeft : 0;
};

export const formatTimeRemaining = (minutes) => {
  if (minutes === null) return '';
  if (minutes <= 0) return 'Expirat';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return hours > 0 ? hours + 'h ' + mins + 'm' : mins + 'm';
};

export const getStatusBadge = (status) => {
  switch (status) {
    case LEAD_STATUS.NEALOCAT:
      return { bg: 'bg-yellow-500/20 border-yellow-500/50 text-yellow-300', label: 'Nealocat' };
    case LEAD_STATUS.ALOCAT:
      return { bg: 'bg-blue-500/20 border-blue-500/50 text-blue-300', label: 'Alocat' };
    case LEAD_STATUS.CONFIRMAT:
      return { bg: 'bg-green-500/20 border-green-500/50 text-green-300', label: 'Confirmat' };
    case LEAD_STATUS.NECONFIRMAT:
      return { bg: 'bg-red-500/20 border-red-500/50 text-red-300', label: 'Neconfirmat' };
    case LEAD_STATUS.NO_SHOW:
      return { bg: 'bg-orange-500/20 border-orange-500/50 text-orange-300', label: 'No-Show' };
    case LEAD_STATUS.COMPLET:
      return { bg: 'bg-purple-500/20 border-purple-500/50 text-purple-300', label: 'Prezent' };
    case LEAD_STATUS.IN_PROGRAM:
      return { bg: 'bg-cyan-500/20 border-cyan-500/50 text-cyan-300', label: 'În Program' };
    case LEAD_STATUS.COMPLET_3_SESIUNI:
      return { bg: 'bg-emerald-500/20 border-emerald-500/50 text-emerald-300', label: 'Complet 3 Sesiuni' };
    case LEAD_STATUS.COMPLET_2_SESIUNI:
      return { bg: 'bg-teal-500/20 border-teal-500/50 text-teal-300', label: 'Complet 2/3 Sesiuni' };
    case LEAD_STATUS.COMPLET_SESIUNE_FINALA:
      return { bg: 'bg-teal-500/20 border-teal-500/50 text-teal-300', label: 'Complet S. Finală' };
    case LEAD_STATUS.COMPLET_SESIUNE_1:
      return { bg: 'bg-indigo-500/20 border-indigo-500/50 text-indigo-300', label: 'Complet 1/3 Sesiuni' };
    default:
      return { bg: 'bg-gray-500/20 border-gray-500/50 text-gray-300', label: status };
  }
};
