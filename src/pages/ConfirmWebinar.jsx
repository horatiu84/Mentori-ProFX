/* eslint-disable no-unused-vars */
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { supabase } from '../supabase';
import { Card, CardContent } from '../components/ui/card';
import logo from '../logo2.png';

const ZOOM_LINKS = {
  sergiu: { url: 'https://us02web.zoom.us/j/88481338630', meetingId: '884 8133 8630', passcode: '2026' },
  eli:    { url: 'https://us06web.zoom.us/j/86056241761', meetingId: '860 5624 1761', passcode: 'Eli' },
  dan:    { url: 'https://us06web.zoom.us/j/84497687444', meetingId: '844 9768 7444', passcode: 'Dan' },
  tudor:  { url: 'https://us06web.zoom.us/j/84059943113', meetingId: '840 5994 3113', passcode: 'Tudor' },
  adrian: null,
};

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
  const [status, setStatus] = useState('loading'); // loading, success, error, already-confirmed, expired, invalid
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

        // Verificăm dacă link-ul a expirat (lead resetat la nealocat sau timeout depășit)
        const isTimedOut = lead.dataTimeout && new Date() > new Date(lead.dataTimeout);
        if (lead.status === LEAD_STATUS.NEALOCAT || isTimedOut) {
          setStatus('expired');
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
              {(() => {
                const zoom = ZOOM_LINKS[leadData?.mentorAlocat];
                return zoom ? (
                  <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-5 mb-6 text-left">
                    <p className="text-green-300 font-semibold mb-3 text-center">🔗 Link Zoom Webinar</p>
                    <a
                      href={zoom.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-center text-blue-400 underline font-medium text-lg mb-3 break-all hover:text-blue-300"
                    >
                      {zoom.url}
                    </a>
                    <p className="text-gray-400 text-sm text-center">
                      Meeting ID: <span className="text-white font-mono">{zoom.meetingId}</span>
                      &nbsp;&nbsp;|&nbsp;&nbsp;
                      Passcode: <span className="text-white font-mono">{zoom.passcode}</span>
                    </p>
                    <p className="text-yellow-300 text-sm text-center mt-3 font-medium">
                      ⚠️ Nu uita să-ți salvezi linkul de Zoom și parola!
                    </p>
                  </div>
                ) : (
                  <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4 mb-6">
                    <p className="text-yellow-300 text-sm">ℹ️ Linkul Zoom va fi comunicat în curând de mentorul tău.</p>
                  </div>
                );
              })()}
              <p className="text-gray-400 text-sm">
                Te așteptăm cu drag la webinar! 🚀
              </p>
            </div>
          )}

          {/* Expired */}
          {status === 'expired' && (
            <div className="text-center py-8">
              <div className="bg-orange-500/20 border border-orange-500/50 rounded-full w-20 h-20 flex items-center justify-center mx-auto mb-6">
                <svg className="w-10 h-10 text-orange-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h1 className="text-3xl font-bold text-orange-400 mb-4">Link Expirat ⏰</h1>
              <p className="text-gray-300 text-lg mb-6">
                Ne pare rău, {leadData?.nume}! Termenul de confirmare de <strong className="text-white">6 ore</strong> a expirat.
              </p>
              <div className="bg-orange-500/10 border border-orange-500/30 rounded-xl p-5 mb-6">
                <p className="text-orange-200 text-sm leading-relaxed">
                  Locul tău a fost eliberat și va fi reallocat. Te rog să aștepți o nouă alocare din partea mentorului tău — vei primi un nou email de invitație.
                </p>
              </div>
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
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 mb-4">
                <p className="text-gray-300 text-sm">
                  Nu este nevoie să confirmi din nou. Te așteptăm la webinar! 🎯
                </p>
              </div>
              {(() => {
                const zoom = ZOOM_LINKS[leadData?.mentorAlocat];
                return zoom ? (
                  <div className="bg-green-500/10 border border-green-500/30 rounded-xl p-5 text-left">
                    <p className="text-green-300 font-semibold mb-3 text-center">🔗 Link Zoom Webinar</p>
                    <a
                      href={zoom.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="block text-center text-blue-400 underline font-medium text-lg mb-3 break-all hover:text-blue-300"
                    >
                      {zoom.url}
                    </a>
                    <p className="text-gray-400 text-sm text-center">
                      Meeting ID: <span className="text-white font-mono">{zoom.meetingId}</span>
                      &nbsp;&nbsp;|&nbsp;&nbsp;
                      Passcode: <span className="text-white font-mono">{zoom.passcode}</span>
                    </p>
                    <p className="text-yellow-300 text-sm text-center mt-3 font-medium">
                      ⚠️ Nu uita să-ți salvezi linkul de Zoom și parola!
                    </p>
                  </div>
                ) : (
                  <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-4">
                    <p className="text-yellow-300 text-sm">ℹ️ Linkul Zoom va fi comunicat în curând de mentorul tău.</p>
                  </div>
                );
              })()}
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
