import React, { useState } from 'react';
import { collection, addDoc, Timestamp, query, where, getDocs } from 'firebase/firestore';
import { db } from '../firebase';
import { Card, CardContent } from '../components/ui/card';
import { Input } from '../components/ui/input';
import logo from '../logo2.png';

const LEAD_STATUS = {
  NEALOCAT: 'nealocat',
  ALOCAT: 'alocat',
  CONFIRMAT: 'confirmat',
  NECONFIRMAT: 'neconfirmat',
  NO_SHOW: 'no_show',
  COMPLET: 'complet'
};

export default function RegisterForm() {
  const [formData, setFormData] = useState({
    nume: '',
    telefon: '',
    email: ''
  });
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const validateEmail = (email) => {
    const re = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return re.test(email);
  };

  const validatePhone = (phone) => {
    const re = /^[0-9]{10}$/;
    return re.test(phone.replace(/\s/g, ''));
  };

  const checkDuplicateLead = async (email, telefon) => {
    try {
      // Verificăm dacă există deja un lead cu același email
      const emailQuery = query(
        collection(db, 'leaduri'),
        where('email', '==', email.toLowerCase().trim())
      );
      const emailSnapshot = await getDocs(emailQuery);
      
      if (!emailSnapshot.empty) {
        return { isDuplicate: true, message: 'Acest email este deja înregistrat în sistem!' };
      }

      // Verificăm dacă există deja un lead cu același telefon
      const phoneQuery = query(
        collection(db, 'leaduri'),
        where('telefon', '==', telefon.trim())
      );
      const phoneSnapshot = await getDocs(phoneQuery);
      
      if (!phoneSnapshot.empty) {
        return { isDuplicate: true, message: 'Acest număr de telefon este deja înregistrat în sistem!' };
      }

      return { isDuplicate: false };
    } catch (err) {
      console.error('Eroare la verificarea duplicatelor:', err);
      return { isDuplicate: false };
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccess(false);

    // Validări
    if (!formData.nume.trim()) {
      setError('Te rugăm să introduci numele complet');
      return;
    }

    if (!formData.telefon.trim()) {
      setError('Te rugăm să introduci numărul de telefon');
      return;
    }

    if (!validatePhone(formData.telefon)) {
      setError('Numărul de telefon trebuie să conțină 10 cifre');
      return;
    }

    if (!formData.email.trim()) {
      setError('Te rugăm să introduci adresa de email');
      return;
    }

    if (!validateEmail(formData.email)) {
      setError('Te rugăm să introduci o adresă de email validă');
      return;
    }

    setLoading(true);

    try {
      // Verificăm duplicate
      const duplicateCheck = await checkDuplicateLead(formData.email, formData.telefon);
      
      if (duplicateCheck.isDuplicate) {
        setError(duplicateCheck.message);
        setLoading(false);
        return;
      }

      // Adăugăm leadul în baza de date
      await addDoc(collection(db, 'leaduri'), {
        nume: formData.nume.trim(),
        telefon: formData.telefon.trim(),
        email: formData.email.toLowerCase().trim(),
        status: LEAD_STATUS.NEALOCAT,
        mentorAlocat: null,
        alocareId: null,
        dataAlocare: null,
        dataConfirmare: null,
        dataTimeout: null,
        emailTrimis: false,
        dataTrimiereEmail: null,
        confirmatPrinLink: false,
        confirmationToken: null,
        istoricMentori: [],
        numarReAlocari: 0,
        observatii: '',
        createdAt: Timestamp.now()
      });

      setSuccess(true);
      setFormData({ nume: '', telefon: '', email: '' });
      
      // Scroll sus pentru a vedea mesajul de succes
      window.scrollTo({ top: 0, behavior: 'smooth' });
    } catch (err) {
      console.error('Eroare la înregistrare:', err);
      setError('A apărut o eroare la înregistrare. Te rugăm să încerci din nou.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-950 to-black flex items-center justify-center p-6">
      <Card className="bg-gray-900/50 backdrop-blur-sm border border-gray-700/50 shadow-2xl max-w-2xl w-full">
        <CardContent className="p-8">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <img src={logo} alt="ProFX Logo" className="h-20 w-auto" />
          </div>

          {/* Title */}
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold text-white mb-3">
              Înscriere Webinar 1:20
            </h1>
            <p className="text-gray-400 text-lg">
              Completează formularul pentru a te înscrie la următorul webinar ProFX
            </p>
          </div>

          {/* Success Message */}
          {success && (
            <div className="mb-6 bg-green-500/20 border border-green-500/50 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <div className="bg-green-500/30 rounded-full p-1">
                  <svg className="w-5 h-5 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
                <div className="flex-1">
                  <h3 className="text-green-400 font-semibold mb-1">Înscriere reușită! 🎉</h3>
                  <p className="text-green-300 text-sm">
                    Mulțumim pentru înscriere! Vei fi contactat/ă în curând de către unul dintre mentorii noștri pentru detalii despre webinar.
                  </p>
                </div>
              </div>
            </div>
          )}

          {/* Error Message */}
          {error && (
            <div className="mb-6 bg-red-500/20 border border-red-500/50 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <div className="bg-red-500/30 rounded-full p-1">
                  <svg className="w-5 h-5 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </div>
                <div className="flex-1">
                  <p className="text-red-300 text-sm">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Nume */}
            <div>
              <label htmlFor="nume" className="block text-sm font-medium text-gray-300 mb-2">
                Nume Complet <span className="text-red-400">*</span>
              </label>
              <Input
                id="nume"
                name="nume"
                type="text"
                value={formData.nume}
                onChange={handleInputChange}
                placeholder="Ex: Ion Popescu"
                className="w-full p-4 rounded-xl border border-gray-600/50 bg-gray-800/50 text-white placeholder-gray-500 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all"
                disabled={loading}
              />
            </div>

            {/* Telefon */}
            <div>
              <label htmlFor="telefon" className="block text-sm font-medium text-gray-300 mb-2">
                Număr Telefon <span className="text-red-400">*</span>
              </label>
              <Input
                id="telefon"
                name="telefon"
                type="tel"
                value={formData.telefon}
                onChange={handleInputChange}
                placeholder="Ex: 0712345678"
                className="w-full p-4 rounded-xl border border-gray-600/50 bg-gray-800/50 text-white placeholder-gray-500 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all"
                disabled={loading}
              />
              <p className="text-xs text-gray-500 mt-1">Format: 10 cifre, fără spații sau caractere speciale</p>
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="block text-sm font-medium text-gray-300 mb-2">
                Adresă Email <span className="text-red-400">*</span>
              </label>
              <Input
                id="email"
                name="email"
                type="email"
                value={formData.email}
                onChange={handleInputChange}
                placeholder="Ex: ion.popescu@email.com"
                className="w-full p-4 rounded-xl border border-gray-600/50 bg-gray-800/50 text-white placeholder-gray-500 focus:border-blue-500/50 focus:ring-2 focus:ring-blue-500/20 transition-all"
                disabled={loading}
              />
            </div>

            {/* Info Box */}
            <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
              <div className="flex items-start gap-3">
                <div className="bg-blue-500/20 rounded-full p-1 mt-0.5">
                  <svg className="w-5 h-5 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div className="text-sm text-blue-300">
                  <p className="font-semibold mb-1">Ce se întâmplă după înscriere?</p>
                  <ul className="space-y-1 text-blue-300/90">
                    <li>✓ Vei fi contactat telefonic de un mentor ProFX</li>
                    <li>✓ Vei primi detalii despre data și ora webinarului</li>
                    <li>✓ Îți vom trimite link-ul de participare pe email</li>
                  </ul>
                </div>
              </div>
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
                  Se înregistrează...
                </span>
              ) : (
                'Înscrie-te acum →'
              )}
            </button>

            {/* Privacy Notice */}
            <p className="text-xs text-gray-500 text-center">
              Prin completarea formularului, ești de acord ca datele tale să fie folosite pentru a te contacta în legătură cu webinarul ProFX.
            </p>
          </form>
        </CardContent>
      </Card>
    </div>
  );
}
