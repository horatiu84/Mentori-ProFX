/* eslint-disable no-unused-vars */
import React, { useState, useEffect } from "react";
import { Input } from "./ui/input";
import { Card, CardContent } from "./ui/card";
import { formatDate, getStatusBadge, formatTimeRemaining, getTimeUntilTimeout, LEAD_STATUS, MENTOR_PHOTOS } from "../constants";

export default function MentorDashboard({
  logo,
  // Auth
  currentMentor, currentMentorId,
  // Data
  leaduri, mentoriData,
  mentorLeaduri, mentorLeaduriAlocate, mentorLeaduriConfirmate, mentorLeaduriComplete,
  mentorLeaduriNeconfirmate, mentorLeaduriNoShow, mentorLeaduriInProgram,
  // Table
  mentorSearchQuery, setMentorSearchQuery, mentorSortBy, setMentorSortBy,
  mentorCurrentPage, setMentorCurrentPage,
  mentorLeaduriCurente, mentorLeaduriSortate, mentorTotalPages, mentorIndexOfFirst, mentorIndexOfLast, leaduriPerPage,
  // Loading / Messages
  loading, loadingData, error, success, setError, setSuccess,
  // Handlers
  fetchAllData, handleLogout,
  openDateModal,
  handleCompleteLead, handleNoShowLead,
  handleSession2Prezent, handleSession2NoShow,
  handleEditAttendance,
  getCompletedSession2TimeLeftMs,
  // Modals
  showDateModal, manualDate, setManualDate, manualDate2, setManualDate2, handleConfirmDate, setShowDateModal, selectedMentorForDate, setSelectedMentorForDate,
  showModal, modalConfig, closeModal, handleModalConfirm,
}) {
  // Countdown timer state
  const [timeUntilWebinar, setTimeUntilWebinar] = useState(null);
  const [editingAttendance, setEditingAttendance] = useState(new Set());

  const toggleEditAttendance = (leadId) => {
    setEditingAttendance(prev => {
      const next = new Set(prev);
      next.has(leadId) ? next.delete(leadId) : next.add(leadId);
      return next;
    });
  };

  // Calculate time until webinar
  useEffect(() => {
    const calculateTimeRemaining = () => {
      const webinarDate = mentoriData.find(m => m.id === currentMentorId)?.ultimulOneToTwenty;
      if (!webinarDate) {
        setTimeUntilWebinar(null);
        return;
      }

      const now = new Date();
      const webinar = new Date(webinarDate);
      const diff = webinar - now;

      if (diff <= 0) {
        setTimeUntilWebinar({ isPast: true });
        return;
      }

      const days = Math.floor(diff / (1000 * 60 * 60 * 24));
      const hours = Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
      const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
      const seconds = Math.floor((diff % (1000 * 60)) / 1000);

      setTimeUntilWebinar({ days, hours, minutes, seconds, isPast: false });
    };

    calculateTimeRemaining();
    const interval = setInterval(calculateTimeRemaining, 1000);

    return () => clearInterval(interval);
  }, [mentoriData, currentMentorId]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-black to-gray-900">
      <div className="max-w-6xl mx-auto pt-10 space-y-6 text-white px-4 pb-10">

        {/* Header */}
        <Card className="bg-gray-900/50 backdrop-blur-sm border border-gray-700/50 shadow-2xl">
          <CardContent className="p-4 md:p-6">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
              <div className="flex items-center space-x-3">
                <img src={logo} alt="ProFX Logo" className="h-10 w-auto" />
                <div className="w-12 h-12 rounded-full border-2 border-blue-500/50 overflow-hidden shadow-lg shrink-0">
                  <img src={MENTOR_PHOTOS[currentMentorId]} alt={currentMentor} className="w-full h-full object-cover" />
                </div>
                <div>
                  <h1 className="text-base md:text-2xl font-bold text-blue-400">Bine ai venit, {currentMentor}! 👋</h1>
                  <p className="text-gray-400 text-xs md:text-sm">Gestioneaza-ti leadurile</p>
                </div>
              </div>
              <div className="flex gap-2 self-end sm:self-auto">
                <button onClick={fetchAllData} disabled={loadingData}
                  className="bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/50 text-blue-300 px-3 py-2 rounded-xl transition-all text-sm">
                  {loadingData ? '...' : 'Refresh'}
                </button>
                <button onClick={handleLogout}
                  className="bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 text-red-300 px-4 py-2 rounded-xl transition-all text-sm">
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
              <div className="bg-gradient-to-br from-cyan-500/10 to-cyan-600/5 border border-cyan-500/30 p-4 rounded-xl text-center">
                <p className="text-sm text-cyan-300 mb-1">În Program</p><p className="text-3xl font-bold text-cyan-400">{mentorLeaduriInProgram}</p>
              </div>
              <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border border-purple-500/30 p-4 rounded-xl text-center">
                <p className="text-sm text-purple-300 mb-1">Finalizat</p><p className="text-3xl font-bold text-purple-400">{mentorLeaduriComplete}</p>
              </div>
              <div className="bg-gradient-to-br from-red-500/10 to-red-600/5 border border-red-500/30 p-4 rounded-xl text-center">
                <p className="text-sm text-red-300 mb-1">Neconfirmate</p><p className="text-3xl font-bold text-red-400">{mentorLeaduriNeconfirmate}</p>
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
              {mentoriData.find(m => m.id === currentMentorId)?.ultimulOneToTwenty ? (
                <div className="space-y-4">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div className="bg-purple-500/10 border border-purple-500/30 rounded-xl p-4">
                      <p className="text-xs text-gray-400 mb-1">Sesiunea 1</p>
                      <p className="text-base font-bold text-purple-400">{formatDate(mentoriData.find(m => m.id === currentMentorId)?.ultimulOneToTwenty)}</p>
                    </div>
                    <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
                      <p className="text-xs text-gray-400 mb-1">Sesiunea 2</p>
                      {mentoriData.find(m => m.id === currentMentorId)?.webinar2Date
                        ? <p className="text-base font-bold text-blue-400">{formatDate(mentoriData.find(m => m.id === currentMentorId)?.webinar2Date)}</p>
                        : <p className="text-sm text-yellow-400">Nestabilită — setează din modal</p>}
                    </div>
                  </div>
                  <div className="flex justify-end">
                    <button onClick={() => openDateModal(currentMentorId)} disabled={loading}
                      className="bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/50 text-purple-300 px-4 py-2 rounded-xl font-semibold transition-all flex items-center gap-2 text-sm">
                      <span>📅</span> Modifică Datele
                    </button>
                  </div>
                  {timeUntilWebinar && !timeUntilWebinar.isPast && (
                    <div className="bg-gradient-to-br from-blue-500/10 to-purple-500/10 border border-blue-400/40 rounded-xl p-6">
                      <p className="text-center text-sm text-gray-300 mb-4">⏱️ Timp rămas până la webinar</p>
                      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                        <div className="bg-gray-800/50 border border-blue-400/30 rounded-lg p-3 text-center">
                          <div className="text-2xl md:text-3xl font-bold text-blue-400">{timeUntilWebinar.days}</div>
                          <div className="text-xs text-gray-400 mt-1">Zile</div>
                        </div>
                        <div className="bg-gray-800/50 border border-purple-400/30 rounded-lg p-3 text-center">
                          <div className="text-2xl md:text-3xl font-bold text-purple-400">{timeUntilWebinar.hours}</div>
                          <div className="text-xs text-gray-400 mt-1">Ore</div>
                        </div>
                        <div className="bg-gray-800/50 border border-pink-400/30 rounded-lg p-3 text-center">
                          <div className="text-2xl md:text-3xl font-bold text-pink-400">{timeUntilWebinar.minutes}</div>
                          <div className="text-xs text-gray-400 mt-1">Minute</div>
                        </div>
                        <div className="bg-gray-800/50 border border-cyan-400/30 rounded-lg p-3 text-center">
                          <div className="text-2xl md:text-3xl font-bold text-cyan-400">{timeUntilWebinar.seconds}</div>
                          <div className="text-xs text-gray-400 mt-1">Secunde</div>
                        </div>
                      </div>
                    </div>
                  )}

                </div>
              ) : (
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm text-gray-300 mb-2">Nu ai un webinar programat încă</p>
                    <p className="text-base md:text-lg font-bold text-yellow-400">Setează data pentru următorul webinar</p>
                    <p className="text-sm text-gray-400 mt-2">Planifică-ți sesiunea 1:20 cu leadurile tale</p>
                  </div>
                  <div className="shrink-0">
                    <button onClick={() => openDateModal(currentMentorId)} disabled={loading}
                      className="bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/50 text-purple-300 px-4 py-2 rounded-xl font-semibold transition-all flex items-center gap-2 text-sm">
                      <span>📅</span>
                      <span className="hidden sm:inline">Setează Data</span>
                      <span className="sm:hidden">Seteaza</span>
                    </button>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>

        {/* Mentor Leads */}
        <Card className="bg-gray-900/50 backdrop-blur-sm border border-gray-700/50 shadow-2xl">
          <CardContent className="p-6">
            <h2 className="text-xl font-bold text-blue-400 mb-4">Leadurile Mele ({mentorLeaduri.length})</h2>
            <div className="flex flex-col sm:flex-row gap-3 mb-4">
              <Input type="text" placeholder="Cauta dupa nume, telefon sau email..." value={mentorSearchQuery}
                onChange={(e) => { setMentorSearchQuery(e.target.value); setMentorCurrentPage(1); }}
                className="flex-1 p-3 rounded-xl border border-gray-600/50 bg-gray-800/50 text-white placeholder-gray-500" />
              <select value={mentorSortBy} onChange={(e) => setMentorSortBy(e.target.value)}
                className="p-3 rounded-xl border border-gray-600/50 bg-gray-800/50 text-white sm:w-48">
                <option value="data-desc">Data (Nou → Vechi)</option>
                <option value="data-asc">Data (Vechi → Nou)</option>
                <option value="status">Dupa Status</option>
                <option value="nume-asc">Nume (A → Z)</option>
                <option value="nume-desc">Nume (Z → A)</option>
              </select>
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
                    const completedSession2TimeLeftMs = getCompletedSession2TimeLeftMs ? getCompletedSession2TimeLeftMs(lead) : null;
                    const completedSession2MinsLeft = completedSession2TimeLeftMs != null ? Math.floor(completedSession2TimeLeftMs / (1000 * 60)) : null;
                    const completedSession2SecsLeft = completedSession2TimeLeftMs != null ? Math.floor((completedSession2TimeLeftMs % (1000 * 60)) / 1000) : null;
                    return (
                      <div key={lead.id} className="bg-gray-800/30 rounded-xl border border-gray-700/50 p-4 hover:border-blue-500/30 transition-all">
                        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
                          <div className="flex-1 space-y-2">
                            <div className="flex items-start gap-3 flex-wrap">
                              <h3 className="text-base md:text-lg font-bold text-white">{lead.nume}</h3>
                              <span className={"px-3 py-1 text-xs font-semibold rounded-full border " + badge.bg}>{badge.label}</span>
                              {lead.status === LEAD_STATUS.ALOCAT && lead.dataAlocare && (
                                <span className="text-xs text-gray-400">{formatTimeRemaining(getTimeUntilTimeout(lead))}</span>
                              )}
                              {lead.prezenta1 != null && (
                                <span className={"text-xs px-2 py-1 rounded-full border " + (lead.prezenta1 ? 'bg-green-500/20 border-green-500/50 text-green-300' : 'bg-orange-500/20 border-orange-500/50 text-orange-300')}>
                                  S1 {lead.prezenta1 ? '✅' : '❌'}
                                </span>
                              )}
                              {lead.prezenta2 != null && (
                                <span className={"text-xs px-2 py-1 rounded-full border " + (lead.prezenta2 ? 'bg-green-500/20 border-green-500/50 text-green-300' : 'bg-orange-500/20 border-orange-500/50 text-orange-300')}>
                                  S2 {lead.prezenta2 ? '✅' : '❌'}
                                </span>
                              )}
                            </div>
                            <div className="flex flex-wrap gap-2 md:gap-4 text-xs md:text-sm text-gray-300">
                              <span>Tel: {lead.telefon}</span>
                              <span className="break-all">Email: {lead.email}</span>
                              <span className="text-gray-500">Adaugat: {formatDate(lead.createdAt)}</span>
                            </div>
                            {lead.numarReAlocari > 0 && <p className="text-xs text-yellow-400">Re-alocat de {lead.numarReAlocari} ori</p>}
                          </div>
                  <div className="flex gap-2">
                            {lead.status === LEAD_STATUS.CONFIRMAT && lead.prezenta1 == null && (
                              <>
                                <button onClick={() => handleCompleteLead(lead.id)} disabled={loading}
                                  className="bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/50 text-purple-300 px-3 py-2 rounded-xl text-sm font-semibold transition-all disabled:opacity-50">✅ Prezent S1</button>
                                <button onClick={() => handleNoShowLead(lead.id)} disabled={loading}
                                  className="bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/50 text-orange-300 px-3 py-2 rounded-xl text-sm font-semibold transition-all disabled:opacity-50">❌ No-Show S1</button>
                              </>
                            )}
                            {lead.status === LEAD_STATUS.IN_PROGRAM && (() => {
                              const w2 = mentoriData.find(m => m.id === currentMentorId)?.webinar2Date;
                              if (!w2) return <span className="text-cyan-400 text-sm px-3 py-2">Așteaptă Sesiunea 2</span>;
                              const isDay2Ready = new Date(w2).setHours(0,0,0,0) <= new Date().setHours(0,0,0,0);
                              if (!isDay2Ready) return <span className="text-cyan-400 text-sm px-3 py-2">Sesiunea 2 pe {new Date(w2).toLocaleDateString('ro-RO', {day:'2-digit', month:'2-digit', year:'numeric'})}</span>;
                              if (lead.prezenta2 != null) return null;
                              return (
                                <>
                                  <button onClick={() => handleSession2Prezent(lead.id)} disabled={loading}
                                    className="bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/50 text-blue-300 px-3 py-2 rounded-xl text-sm font-semibold transition-all disabled:opacity-50">✅ Prezent S2</button>
                                  <button onClick={() => handleSession2NoShow(lead.id)} disabled={loading}
                                    className="bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 text-red-300 px-3 py-2 rounded-xl text-sm font-semibold transition-all disabled:opacity-50">❌ No-Show S2</button>
                                </>
                              );
                            })()}
                            {lead.status === LEAD_STATUS.COMPLET_2_SESIUNI && (
                              <span className="text-emerald-400 text-sm font-semibold px-3 py-2">
                                🏆 Complet 2 Sesiuni
                                {completedSession2TimeLeftMs != null && (
                                  <span className="ml-2 text-xs text-emerald-300/90">
                                    (dispare în {String(completedSession2MinsLeft).padStart(2, '0')}:{String(completedSession2SecsLeft).padStart(2, '0')})
                                  </span>
                                )}
                              </span>
                            )}
                            {lead.status === LEAD_STATUS.COMPLET_SESIUNE_FINALA && <span className="text-teal-400 text-sm font-semibold px-3 py-2">✅ Complet S. Finală</span>}
                            {lead.status === LEAD_STATUS.COMPLET_SESIUNE_1 && <span className="text-indigo-400 text-sm font-semibold px-3 py-2">✅ Complet S. 1</span>}
                            {/* Leads vechi (complet/no_show fără prezenta1) — migrare spre noul sistem */}
                            {(lead.status === LEAD_STATUS.COMPLET || lead.status === LEAD_STATUS.NO_SHOW) && lead.prezenta1 == null && (
                              <>
                                <span className="text-xs text-gray-400 self-center">Setează S1:</span>
                                <button onClick={() => handleCompleteLead(lead.id)} disabled={loading}
                                  className="bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/50 text-purple-300 px-3 py-2 rounded-xl text-sm font-semibold transition-all disabled:opacity-50">✅ Prezent S1</button>
                                <button onClick={() => handleNoShowLead(lead.id)} disabled={loading}
                                  className="bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/50 text-orange-300 px-3 py-2 rounded-xl text-sm font-semibold transition-all disabled:opacity-50">❌ No-Show S1</button>
                              </>
                            )}
                            {lead.status === LEAD_STATUS.NECONFIRMAT && <span className="text-red-400 text-sm px-3 py-2">Asteapta re-alocare</span>}
                            {/* Edit attendance button — shown when at least one session is already marked */}
                            {(lead.prezenta1 != null || lead.prezenta2 != null) && (
                              <button onClick={() => toggleEditAttendance(lead.id)}
                                className={"border px-3 py-2 rounded-xl text-xs font-semibold transition-all " + (editingAttendance.has(lead.id) ? 'bg-yellow-500/30 border-yellow-500/50 text-yellow-200' : 'bg-gray-700/30 hover:bg-gray-700/50 border-gray-600/50 text-gray-400')}>
                                ✏️ {editingAttendance.has(lead.id) ? 'Închide' : 'Editează'}
                              </button>
                            )}
                          </div>
                        </div>
                        {/* Inline attendance correction panel - full width below */}
                        {editingAttendance.has(lead.id) && (
                            <div className="mt-3 pt-3 border-t border-gray-700/50">
                              <p className="text-xs text-yellow-300 mb-2 font-semibold">✏️ Corectează prezența:</p>
                              <div className="flex flex-wrap gap-2">
                                {lead.prezenta1 != null && (
                                  <>
                                    <span className="text-xs text-gray-400 self-center">S1:</span>
                                    <button onClick={() => { handleEditAttendance(lead.id, 1, true); toggleEditAttendance(lead.id); }} disabled={loading || lead.prezenta1 === true}
                                      className={"px-3 py-1 rounded-lg text-xs font-semibold border transition-all disabled:opacity-40 " + (lead.prezenta1 === true ? 'bg-green-500/30 border-green-500/50 text-green-300 cursor-default' : 'bg-green-500/20 hover:bg-green-500/30 border-green-500/50 text-green-300')}>
                                      ✅ Prezent
                                    </button>
                                    <button onClick={() => { handleEditAttendance(lead.id, 1, false); toggleEditAttendance(lead.id); }} disabled={loading || lead.prezenta1 === false}
                                      className={"px-3 py-1 rounded-lg text-xs font-semibold border transition-all disabled:opacity-40 " + (lead.prezenta1 === false ? 'bg-orange-500/30 border-orange-500/50 text-orange-300 cursor-default' : 'bg-orange-500/20 hover:bg-orange-500/30 border-orange-500/50 text-orange-300')}>
                                      ❌ No-Show
                                    </button>
                                  </>
                                )}
                                {lead.prezenta2 != null && (
                                  <>
                                    <span className="text-xs text-gray-400 self-center ml-2">S2:</span>
                                    <button onClick={() => { handleEditAttendance(lead.id, 2, true); toggleEditAttendance(lead.id); }} disabled={loading || lead.prezenta2 === true}
                                      className={"px-3 py-1 rounded-lg text-xs font-semibold border transition-all disabled:opacity-40 " + (lead.prezenta2 === true ? 'bg-green-500/30 border-green-500/50 text-green-300 cursor-default' : 'bg-green-500/20 hover:bg-green-500/30 border-green-500/50 text-green-300')}>
                                      ✅ Prezent
                                    </button>
                                    <button onClick={() => { handleEditAttendance(lead.id, 2, false); toggleEditAttendance(lead.id); }} disabled={loading || lead.prezenta2 === false}
                                      className={"px-3 py-1 rounded-lg text-xs font-semibold border transition-all disabled:opacity-40 " + (lead.prezenta2 === false ? 'bg-orange-500/30 border-orange-500/50 text-orange-300 cursor-default' : 'bg-orange-500/20 hover:bg-orange-500/30 border-orange-500/50 text-orange-300')}>
                                      ❌ No-Show
                                    </button>
                                  </>
                                )}
                              </div>
                            </div>
                          )}
                      </div>
                    );
                  })}
                </div>
                {mentorTotalPages > 1 && (
                  <div className="mt-6 flex items-center justify-between gap-2">
                    <div className="text-xs md:text-sm text-gray-400">{mentorIndexOfFirst + 1}-{Math.min(mentorIndexOfLast, mentorLeaduriSortate.length)} / {mentorLeaduriSortate.length}</div>
                    <div className="flex gap-1 md:gap-2">
                      <button onClick={() => setMentorCurrentPage(p => Math.max(1, p - 1))} disabled={mentorCurrentPage === 1}
                        className={"px-3 md:px-4 py-2 rounded-xl font-semibold transition-all border text-sm " + (mentorCurrentPage === 1 ? 'bg-gray-700/20 border-gray-600/50 text-gray-500 cursor-not-allowed' : 'bg-blue-500/20 hover:bg-blue-500/30 border-blue-500/50 text-blue-300')}>‹ Ant</button>
                      <div className="flex gap-1">
                        {[...Array(mentorTotalPages)].map((_, i) => {
                          const p = i + 1;
                          if (p === 1 || p === mentorTotalPages || (p >= mentorCurrentPage - 1 && p <= mentorCurrentPage + 1))
                            return <button key={p} onClick={() => setMentorCurrentPage(p)} className={"px-3 md:px-4 py-2 rounded-xl font-semibold transition-all border text-sm " + (mentorCurrentPage === p ? 'bg-blue-500/30 border-blue-500/50 text-blue-300' : 'bg-gray-700/20 hover:bg-gray-700/30 border-gray-600/50 text-gray-400')}>{p}</button>;
                          if (p === mentorCurrentPage - 2 || p === mentorCurrentPage + 2) return <span key={p} className="px-1 py-2 text-gray-500 text-sm">…</span>;
                          return null;
                        })}
                      </div>
                      <button onClick={() => setMentorCurrentPage(p => Math.min(mentorTotalPages, p + 1))} disabled={mentorCurrentPage === mentorTotalPages}
                        className={"px-3 md:px-4 py-2 rounded-xl font-semibold transition-all border text-sm " + (mentorCurrentPage === mentorTotalPages ? 'bg-gray-700/20 border-gray-600/50 text-gray-500 cursor-not-allowed' : 'bg-blue-500/20 hover:bg-blue-500/30 border-blue-500/50 text-blue-300')}>Urm ›</button>
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
            <h3 className="text-xl font-bold text-white mb-4">📅 Setează Datele Webinarului</h3>
            <p className="text-sm text-gray-400 mb-4">Alege data și ora pentru Sesiunea 1 și Sesiunea 2</p>
            <div className="mb-4">
              <label className="block text-sm font-medium text-purple-300 mb-2">Sesiunea 1 — Data și Ora:</label>
              <Input type="datetime-local" value={manualDate} onChange={(e) => setManualDate(e.target.value)}
                className="w-full p-3 rounded-xl bg-gray-800/50 text-white border border-gray-600/50" />
            </div>
            <div className="mb-6">
              <label className="block text-sm font-medium text-blue-300 mb-2">Sesiunea 2 — Data și Ora:</label>
              <Input type="datetime-local" value={manualDate2} onChange={(e) => setManualDate2(e.target.value)}
                className="w-full p-3 rounded-xl bg-gray-800/50 text-white border border-gray-600/50" />
              <p className="text-xs text-gray-500 mt-1">Opțional — poți seta Sesiunea 2 mai târziu</p>
            </div>
            <div className="flex gap-3">
              <button onClick={handleConfirmDate} disabled={loading}
                className="flex-1 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/50 text-purple-300 py-2 px-4 rounded-xl font-semibold transition-all">Salvează</button>
              <button onClick={() => { setShowDateModal(false); setSelectedMentorForDate(null); setManualDate(''); setManualDate2(''); }}
                className="flex-1 bg-gray-600/20 hover:bg-gray-600/30 border border-gray-600/50 text-gray-300 py-2 px-4 rounded-xl font-semibold transition-all">Anuleaza</button>
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
