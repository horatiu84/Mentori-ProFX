/* eslint-disable no-unused-vars */
import React from "react";
import { Input } from "./ui/input";
import { Card, CardContent } from "./ui/card";
import { formatDate, getStatusBadge, formatTimeRemaining, getTimeUntilTimeout, LEAD_STATUS, MENTOR_PHOTOS } from "../constants";

export default function MentorDashboard({
  logo,
  // Auth
  currentMentor, currentMentorId,
  // Data
  leaduri, mentoriData,
  mentorLeaduri,
  mentorLeaduriAlocate, mentorLeaduriConfirmate, mentorLeaduriComplete, mentorLeaduriNeconfirmate, mentorLeaduriNoShow,
  // Table
  mentorSearchQuery, setMentorSearchQuery, mentorSortBy, setMentorSortBy,
  mentorCurrentPage, setMentorCurrentPage,
  mentorLeaduriCurente, mentorLeaduriSortate, mentorTotalPages, mentorIndexOfFirst, mentorIndexOfLast, leaduriPerPage,
  // Loading / Messages
  loading, loadingData, error, success, setError, setSuccess,
  // Handlers
  fetchAllData, handleLogout,
  openDateModal, openEmailPreview,
  handleCompleteLead, handleNoShowLead,
  // Modals
  showDateModal, manualDate, setManualDate, handleConfirmDate, setShowDateModal, selectedMentorForDate, setSelectedMentorForDate,
  showEmailPreview, selectedLeadForEmail, emailContent, sendEmail, setShowEmailPreview,
  showModal, modalConfig, closeModal, handleModalConfirm,
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-black to-gray-900">
      <div className="max-w-6xl mx-auto pt-10 space-y-6 text-white px-4 pb-10">

        {/* Header */}
        <Card className="bg-gray-900/50 backdrop-blur-sm border border-gray-700/50 shadow-2xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <img src={logo} alt="ProFX Logo" className="h-12 w-auto" />
                <div className="w-16 h-16 rounded-full border-2 border-blue-500/50 overflow-hidden shadow-lg">
                  <img src={MENTOR_PHOTOS[currentMentorId]} alt={currentMentor} className="w-full h-full object-cover" />
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-blue-400">Bun ai venit, {currentMentor}! 👋</h1>
                  <p className="text-gray-400 text-sm">Gestioneaza-ti leadurile cu succes</p>
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={fetchAllData} disabled={loadingData}
                  className="bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/50 text-blue-300 px-4 py-2 rounded-xl transition-all text-sm">
                  {loadingData ? 'Se incarca...' : 'Refresh'}
                </button>
                <button onClick={handleLogout}
                  className="bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 text-red-300 px-6 py-2 rounded-xl transition-all">
                  Logout
                </button>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Messages */}
        {success && (
          <div className="bg-green-500/20 border border-green-500/50 text-green-300 px-4 py-3 rounded-xl flex justify-between items-center">
            <span>{success}</span><button onClick={() => setSuccess("")} className="text-xl ml-4">&times;</button>
          </div>
        )}
        {error && (
          <div className="bg-red-500/20 border border-red-500/50 text-red-300 px-4 py-3 rounded-xl flex justify-between items-center">
            <span>{error}</span><button onClick={() => setError("")} className="text-xl ml-4">&times;</button>
          </div>
        )}

        {/* Mentor Stats */}
        <Card className="bg-gray-900/50 backdrop-blur-sm border border-gray-700/50 shadow-2xl">
          <CardContent className="p-6">
            <h2 className="text-xl font-bold text-yellow-400 mb-4">Leadurile Mele</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/30 p-4 rounded-xl text-center">
                <p className="text-sm text-gray-300 mb-1">Total</p><p className="text-3xl font-bold text-blue-400">{mentorLeaduri.length}</p>
              </div>
              <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/30 p-4 rounded-xl text-center">
                <p className="text-sm text-blue-300 mb-1">Alocate</p><p className="text-3xl font-bold text-blue-400">{mentorLeaduriAlocate}</p>
              </div>
              <div className="bg-gradient-to-br from-green-500/10 to-green-600/5 border border-green-500/30 p-4 rounded-xl text-center">
                <p className="text-sm text-green-300 mb-1">Confirmate</p><p className="text-3xl font-bold text-green-400">{mentorLeaduriConfirmate}</p>
              </div>
              <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border border-purple-500/30 p-4 rounded-xl text-center">
                <p className="text-sm text-purple-300 mb-1">Complete</p><p className="text-3xl font-bold text-purple-400">{mentorLeaduriComplete}</p>
              </div>
              <div className="bg-gradient-to-br from-red-500/10 to-red-600/5 border border-red-500/30 p-4 rounded-xl text-center">
                <p className="text-sm text-red-300 mb-1">Neconfirmate</p><p className="text-3xl font-bold text-red-400">{mentorLeaduriNeconfirmate}</p>
              </div>
              <div className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border border-orange-500/30 p-4 rounded-xl text-center">
                <p className="text-sm text-orange-300 mb-1">No-Show</p><p className="text-3xl font-bold text-orange-400">{mentorLeaduriNoShow}</p>
              </div>
            </div>
            {mentorLeaduri.length > 0 && (
              <div className="mt-4">
                <div className="bg-gradient-to-br from-green-500/10 to-blue-500/10 border border-green-500/30 p-4 rounded-xl">
                  <div className="flex items-center justify-between">
                    <div><p className="text-sm text-gray-300">Rata mea de conversie</p>
                    <p className="text-2xl font-bold text-green-400">{Math.round((mentorLeaduriComplete / mentorLeaduri.length) * 100)}%</p></div>
                    <div className="w-48">
                      <div className="flex justify-between text-xs text-gray-400 mb-1"><span>Progres</span><span>{mentorLeaduriComplete}/{mentorLeaduri.length}</span></div>
                      <div className="w-full bg-gray-700/50 rounded-full h-3 overflow-hidden">
                        <div className="h-full bg-gradient-to-r from-green-500 to-blue-500 transition-all duration-500" style={{ width: (mentorLeaduriComplete / mentorLeaduri.length) * 100 + '%' }} />
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Webinar 1:20 Info */}
        <Card className="bg-gray-900/50 backdrop-blur-sm border border-gray-700/50 shadow-2xl">
          <CardContent className="p-6">
            <h2 className="text-xl font-bold text-purple-400 mb-4">🎓 Webinar 1:20</h2>
            <div className="bg-gradient-to-br from-purple-500/10 to-blue-500/10 border border-purple-500/30 p-6 rounded-xl">
              <div className="flex items-center justify-between">
                <div className="flex-1">
                  {mentoriData.find(m => m.id === currentMentorId)?.ultimulOneToTwenty ? (
                    <>
                      <p className="text-sm text-gray-300 mb-2">Următorul webinar programat:</p>
                      <p className="text-2xl font-bold text-purple-400">{formatDate(mentoriData.find(m => m.id === currentMentorId)?.ultimulOneToTwenty)}</p>
                      <p className="text-sm text-gray-400 mt-2">Asigură-te că ești pregătit pentru sesiune!</p>
                    </>
                  ) : (
                    <>
                      <p className="text-sm text-gray-300 mb-2">Nu ai un webinar programat încă</p>
                      <p className="text-lg font-bold text-yellow-400">Setează data pentru următorul webinar</p>
                      <p className="text-sm text-gray-400 mt-2">Planifică-ți sesiunea 1:20 cu leadurile tale</p>
                    </>
                  )}
                </div>
                <div>
                  <button onClick={() => openDateModal(currentMentorId)} disabled={loading}
                    className="bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/50 text-purple-300 px-6 py-3 rounded-xl font-semibold transition-all flex items-center gap-2">
                    <span>📅</span>
                    {mentoriData.find(m => m.id === currentMentorId)?.ultimulOneToTwenty ? 'Modifica Data' : 'Seteaza Data'}
                  </button>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Mentor Leads */}
        <Card className="bg-gray-900/50 backdrop-blur-sm border border-gray-700/50 shadow-2xl">
          <CardContent className="p-6">
            <h2 className="text-xl font-bold text-blue-400 mb-4">Leadurile Mele ({mentorLeaduri.length})</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="md:col-span-2">
                <Input type="text" placeholder="Cauta dupa nume, telefon sau email..." value={mentorSearchQuery}
                  onChange={(e) => { setMentorSearchQuery(e.target.value); setMentorCurrentPage(1); }}
                  className="w-full p-3 rounded-xl border border-gray-600/50 bg-gray-800/50 text-white placeholder-gray-500" />
              </div>
              <div>
                <select value={mentorSortBy} onChange={(e) => setMentorSortBy(e.target.value)}
                  className="w-full p-3 rounded-xl border border-gray-600/50 bg-gray-800/50 text-white">
                  <option value="data-desc">Data (Nou &rarr; Vechi)</option>
                  <option value="data-asc">Data (Vechi &rarr; Nou)</option>
                  <option value="status">Dupa Status</option>
                  <option value="nume-asc">Nume (A &rarr; Z)</option>
                  <option value="nume-desc">Nume (Z &rarr; A)</option>
                </select>
              </div>
            </div>
            {mentorLeaduri.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <p className="text-lg">Nu ai leaduri alocate momentan</p>
                <p className="text-sm mt-2">Leadurile vor aparea aici dupa ce sunt alocate de Admin</p>
              </div>
            ) : mentorLeaduriCurente.length === 0 ? (
              <div className="text-center py-12 text-gray-400"><p className="text-lg">Nu s-au gasit rezultate</p></div>
            ) : (
              <>
                <div className="space-y-3">
                  {mentorLeaduriCurente.map((lead) => {
                    const badge = getStatusBadge(lead.status);
                    return (
                      <div key={lead.id} className="bg-gray-800/30 rounded-xl border border-gray-700/50 p-4 hover:border-blue-500/30 transition-all">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                          <div className="flex-1 space-y-2">
                            <div className="flex items-center gap-3">
                              <h3 className="text-lg font-bold text-white">{lead.nume}</h3>
                              <span className={"px-3 py-1 text-xs font-semibold rounded-full border " + badge.bg}>{badge.label}</span>
                              {lead.status === LEAD_STATUS.ALOCAT && lead.dataAlocare && (
                                <span className="text-xs text-gray-400">{formatTimeRemaining(getTimeUntilTimeout(lead))}</span>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-4 text-sm text-gray-300">
                              <span>Tel: {lead.telefon}</span>
                              <span>Email: {lead.email}</span>
                              <span className="text-gray-500">Adaugat: {formatDate(lead.createdAt)}</span>
                            </div>
                            {lead.numarReAlocari > 0 && <p className="text-xs text-yellow-400">Re-alocat de {lead.numarReAlocari} ori</p>}
                          </div>
                          <div className="flex flex-wrap gap-2">
                            {(lead.status === LEAD_STATUS.ALOCAT || lead.status === LEAD_STATUS.CONFIRMAT) && (
                              <button onClick={() => openEmailPreview(lead)} disabled={loading}
                                className="bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/50 text-blue-300 px-4 py-2 rounded-xl text-sm font-semibold transition-all disabled:opacity-50 flex items-center gap-2">
                                <span>✉️</span> Email
                              </button>
                            )}
                            {lead.status === LEAD_STATUS.CONFIRMAT && (
                              <>
                                <button onClick={() => handleCompleteLead(lead.id)} disabled={loading}
                                  className="bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/50 text-purple-300 px-4 py-2 rounded-xl text-sm font-semibold transition-all disabled:opacity-50">Complet</button>
                                <button onClick={() => handleNoShowLead(lead.id)} disabled={loading}
                                  className="bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/50 text-orange-300 px-4 py-2 rounded-xl text-sm font-semibold transition-all disabled:opacity-50">No-Show</button>
                              </>
                            )}
                            {lead.status === LEAD_STATUS.COMPLET && <span className="text-green-400 text-sm font-semibold px-4 py-2">Finalizat</span>}
                            {lead.status === LEAD_STATUS.NECONFIRMAT && <span className="text-red-400 text-sm px-4 py-2">Asteapta re-alocare</span>}
                            {lead.status === LEAD_STATUS.NO_SHOW && <span className="text-orange-400 text-sm px-4 py-2">Nu s-a prezentat</span>}
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
                {mentorTotalPages > 1 && (
                  <div className="mt-6 flex items-center justify-between">
                    <div className="text-sm text-gray-400">{mentorIndexOfFirst + 1} - {Math.min(mentorIndexOfLast, mentorLeaduriSortate.length)} din {mentorLeaduriSortate.length}</div>
                    <div className="flex gap-2">
                      <button onClick={() => setMentorCurrentPage(p => Math.max(1, p - 1))} disabled={mentorCurrentPage === 1}
                        className={"px-4 py-2 rounded-xl font-semibold transition-all border " + (mentorCurrentPage === 1 ? 'bg-gray-700/20 border-gray-600/50 text-gray-500 cursor-not-allowed' : 'bg-blue-500/20 hover:bg-blue-500/30 border-blue-500/50 text-blue-300')}>Anterior</button>
                      <div className="flex gap-1">
                        {[...Array(mentorTotalPages)].map((_, i) => {
                          const p = i + 1;
                          if (p === 1 || p === mentorTotalPages || (p >= mentorCurrentPage - 1 && p <= mentorCurrentPage + 1))
                            return <button key={p} onClick={() => setMentorCurrentPage(p)} className={"px-4 py-2 rounded-xl font-semibold transition-all border " + (mentorCurrentPage === p ? 'bg-blue-500/30 border-blue-500/50 text-blue-300' : 'bg-gray-700/20 hover:bg-gray-700/30 border-gray-600/50 text-gray-400')}>{p}</button>;
                          if (p === mentorCurrentPage - 2 || p === mentorCurrentPage + 2) return <span key={p} className="px-2 py-2 text-gray-500">...</span>;
                          return null;
                        })}
                      </div>
                      <button onClick={() => setMentorCurrentPage(p => Math.min(mentorTotalPages, p + 1))} disabled={mentorCurrentPage === mentorTotalPages}
                        className={"px-4 py-2 rounded-xl font-semibold transition-all border " + (mentorCurrentPage === mentorTotalPages ? 'bg-gray-700/20 border-gray-600/50 text-gray-500 cursor-not-allowed' : 'bg-blue-500/20 hover:bg-blue-500/30 border-blue-500/50 text-blue-300')}>Urmator</button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-2xl shadow-2xl border border-gray-700/50 max-w-md w-full animate-scaleIn">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-4">
                <div className={"w-12 h-12 rounded-full flex items-center justify-center " + (modalConfig.type === 'confirm' ? 'bg-red-500/20 border-2 border-red-500/50' : 'bg-blue-500/20 border-2 border-blue-500/50')}>
                  <span className="text-2xl">{modalConfig.type === 'confirm' ? '\u26A0\uFE0F' : '\u2139\uFE0F'}</span>
                </div>
                <h3 className={"text-xl font-bold " + (modalConfig.type === 'confirm' ? 'text-red-400' : 'text-blue-400')}>{modalConfig.title}</h3>
              </div>
              <p className="text-gray-300 text-base leading-relaxed mb-6">{modalConfig.message}</p>
              <div className="flex gap-3">
                {modalConfig.type === 'confirm' ? (
                  <>
                    <button onClick={closeModal} className="flex-1 bg-gray-600/20 hover:bg-gray-600/30 border border-gray-500/50 text-gray-300 px-4 py-3 rounded-xl transition-all font-medium">Anuleaza</button>
                    <button onClick={handleModalConfirm} className="flex-1 bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 text-red-300 px-4 py-3 rounded-xl transition-all font-medium">Confirma</button>
                  </>
                ) : (
                  <button onClick={closeModal} className="w-full bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/50 text-blue-300 px-4 py-3 rounded-xl transition-all font-medium">Am inteles</button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Date Modal */}
      {showDateModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-2xl shadow-2xl border border-gray-700/50 max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-white mb-4">📅 Seteaza Data Webinar 1:20</h3>
            <p className="text-sm text-gray-400 mb-4">Alege data și ora pentru următorul webinar cu leadurile tale</p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-300 mb-2">Data și Ora:</label>
              <Input type="datetime-local" value={manualDate} onChange={(e) => setManualDate(e.target.value)}
                className="w-full p-3 rounded-xl bg-gray-800/50 text-white border border-gray-600/50" />
            </div>
            <div className="flex gap-3">
              <button onClick={handleConfirmDate} disabled={loading}
                className="flex-1 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/50 text-purple-300 py-2 px-4 rounded-xl font-semibold transition-all">Confirma</button>
              <button onClick={() => { setShowDateModal(false); setSelectedMentorForDate(null); setManualDate(''); }}
                className="flex-1 bg-gray-600/20 hover:bg-gray-600/30 border border-gray-600/50 text-gray-300 py-2 px-4 rounded-xl font-semibold transition-all">Anuleaza</button>
            </div>
          </div>
        </div>
      )}

      {/* Email Preview Modal */}
      {showEmailPreview && selectedLeadForEmail && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-2xl shadow-2xl border border-gray-700/50 max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <span>✉️</span> Preview Email
              </h3>
              <button onClick={() => setShowEmailPreview(false)} className="text-gray-400 hover:text-white text-2xl">&times;</button>
            </div>
            
            <div className="bg-gray-800/50 rounded-xl p-4 mb-4 border border-gray-700/50">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-full bg-blue-500/20 border-2 border-blue-500/50 flex items-center justify-center overflow-hidden">
                  <img src={MENTOR_PHOTOS[currentMentorId]} alt={currentMentor} className="w-full h-full object-cover" />
                </div>
                <div>
                  <p className="text-sm text-gray-400">Catre:</p>
                  <p className="text-white font-semibold">{selectedLeadForEmail.nume} ({selectedLeadForEmail.email})</p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Subiect:</label>
                <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-3">
                  <p className="text-white font-semibold">{emailContent.subject}</p>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Mesaj:</label>
                <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4">
                  <pre className="text-gray-300 whitespace-pre-wrap font-sans text-sm leading-relaxed">{emailContent.body}</pre>
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-gray-700/50">
              <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3 mb-4">
                <p className="text-xs text-yellow-300">
                  <span className="font-semibold">⚠️ Notă:</span> Funcția de trimitere email este în dezvoltare. Deocamdată, emailul va fi doar afișat în consolă.
                </p>
              </div>
              <div className="flex gap-3">
                <button onClick={() => setShowEmailPreview(false)}
                  className="flex-1 bg-gray-600/20 hover:bg-gray-600/30 border border-gray-600/50 text-gray-300 py-3 px-4 rounded-xl font-semibold transition-all">Anuleaza</button>
                <button onClick={sendEmail} disabled={loading}
                  className="flex-1 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/50 text-blue-300 py-3 px-4 rounded-xl font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                  {loading ? 'Se trimite...' : (
                    <>
                      <span>📤</span> Trimite Email
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {loading && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-40">
          <div className="bg-gray-800 border border-gray-700 p-8 rounded-2xl"><p className="text-xl text-white animate-pulse">Se proceseaza...</p></div>
        </div>
      )}
    </div>
  );
}
