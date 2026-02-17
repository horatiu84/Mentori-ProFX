/* eslint-disable no-unused-vars */
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { Card, CardContent } from '../components/ui/card';
import logo from '../logo2.png';

const LEAD_STATUS = {
  NEALOCAT: 'nealocat',
  ALOCAT: 'alocat',
  CONFIRMAT: 'confirmat',
  NECONFIRMAT: 'neconfirmat',
  NO_SHOW: 'no_show',
  COMPLET: 'complet'
};

export default function ConfirmWebinar() {
  const { token } = useParams();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState('loading'); // loading, success, error, already-confirmed, invalid
  const [leadData, setLeadData] = useState(null);
  const [error, setError] = useState('');

  useEffect(() => {
    const confirmParticipation = async () => {
      if (!token) {
        setStatus('invalid');
        setError('Link invalid - token lipsă');
        setLoading(false);
        return;
      }

      try {
        // Căutăm leadul după token în baza de date
        const { data: leadDoc, error: fetchError } = await supabase
          .from('leaduri')
          .select('*')
          .eq('id', token)
          .single();

        if (fetchError || !leadDoc) {
          setStatus('invalid');
          setError('Link invalid sau expirat');
          setLoading(false);
          return;
        }

        const lead = leadDoc;
        setLeadData(lead);

        // Verificăm dacă leadul este deja confirmat
        if (lead.status === LEAD_STATUS.CONFIRMAT) {
          setStatus('already-confirmed');
          setLoading(false);
          return;
        }

        // Verificăm dacă leadul este alocat (poate fi confirmat)
        if (lead.status !== LEAD_STATUS.ALOCAT) {
          setStatus('invalid');
          setError('Acest lead nu poate fi confirmat în momentul actual');
          setLoading(false);
          return;
        }

        // Actualizăm statusul la CONFIRMAT
        const { error: updateError } = await supabase
          .from('leaduri')
          .update({
            status: LEAD_STATUS.CONFIRMAT,
            dataConfirmare: new Date().toISOString(),
            confirmatPrinLink: true
          })
          .eq('id', token);

        if (updateError) throw updateError;

        setStatus('success');
        setLoading(false);
      } catch (err) {
        console.error('Eroare la confirmare:', err);
        setStatus('error');
        setError(err.message || 'A apărut o eroare la confirmarea participării');
        setLoading(false);
      }
    };

    confirmParticipation();
  }, [token]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-blue-950 to-black flex items-center justify-center p-6">
      <Card className="bg-gray-900/50 backdrop-blur-sm border border-gray-700/50 shadow-2xl max-w-2xl w-full">
        <CardContent className="p-8">
          {/* Logo */}
          <div className="flex justify-center mb-8">
            <img src={logo} alt="ProFX Logo" className="h-20 w-auto" />
          </div>

          {/* Loading */}
          {loading && (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-blue-500 mx-auto mb-4"></div>
              <p className="text-gray-300 text-lg">Confirmăm participarea ta...</p>
            </div>
          )}

          {/* Success */}
          {status === 'success' && (
            <div className="text-center py-8">
              <div className="bg-green-500/20 border border-green-500/50 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-green-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
              </div>
              <h1 className="text-3xl font-bold text-green-400 mb-4">Confirmare Reușită! 🎉</h1>
              <p className="text-gray-300 text-lg mb-6">
                Mulțumim, {leadData?.nume}! Participarea ta la webinarul 1:20 ProFX a fost confirmată cu succes.
              </p>
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-6 mb-6">
                <p className="text-gray-300 mb-3">
                  <strong className="text-blue-400">📧 Email:</strong> {leadData?.email}
                </p>
                <p className="text-gray-300">
                  <strong className="text-blue-400">📞 Telefon:</strong> {leadData?.telefon}
                </p>
              </div>
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 mb-6">
                <p className="text-yellow-300 text-sm">
                  ℹ️ Vei primi detalii despre webinar și linkul de participare pe email cu 30 de minute înainte de start.
                </p>
              </div>
              <p className="text-gray-400 text-sm">
                Te așteptăm cu drag la webinar! 🚀
              </p>
            </div>
          )}

          {/* Already Confirmed */}
          {status === 'already-confirmed' && (
            <div className="text-center py-8">
              <div className="bg-blue-500/20 border border-blue-500/50 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-blue-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h1 className="text-3xl font-bold text-blue-400 mb-4">Deja Confirmat ✓</h1>
              <p className="text-gray-300 text-lg mb-6">
                Bună, {leadData?.nume}! Participarea ta la webinar a fost deja confirmată anterior.
              </p>
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
                <p className="text-gray-300 text-sm">
                  Nu este nevoie să confirmi din nou. Te așteptăm la webinar! 🎯
                </p>
              </div>
            </div>
          )}

          {/* Error or Invalid */}
          {(status === 'error' || status === 'invalid') && (
            <div className="text-center py-8">
              <div className="bg-red-500/20 border border-red-500/50 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </div>
              <h1 className="text-3xl font-bold text-red-400 mb-4">Link Invalid</h1>
              <p className="text-gray-300 text-lg mb-6">
                {error || 'Acest link de confirmare este invalid sau a expirat.'}
              </p>
              <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-6">
                <p className="text-gray-400 text-sm mb-3">
                  Dacă ai primit acest link prin email și întâmpini probleme, te rugăm să contactezi mentorul tău.
                </p>
                <p className="text-gray-500 text-xs">
                  Pentru asistență: support@profx.ro
                </p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
