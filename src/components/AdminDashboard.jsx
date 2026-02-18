/* eslint-disable no-unused-vars */
import React from "react";
import { Input } from "./ui/input";
import { Card, CardContent } from "./ui/card";
import { formatDate, getStatusBadge, formatTimeRemaining, getTimeUntilTimeout, LEAD_STATUS, MENTORI_DISPONIBILI, MENTOR_PHOTOS } from "../constants";

export default function AdminDashboard({
  logo,
  // Data
  leaduri, mentoriData, mentoriUnici, alocariAggregate,
  // Stats
  leaduriNealocate, leaduriAlocate, leaduriConfirmate, leaduriNeconfirmate, leaduriNoShow, leaduriComplete,
  // Table
  searchQuery, setSearchQuery, sortBy, setSortBy,
  currentPage, setCurrentPage,
  leaduriCurente, leaduriSortate, totalPages, indexOfFirstLead, indexOfLastLead, leaduriPerPage,
  // Loading / Messages
  loading, loadingData, error, success, setError, setSuccess,
  // Handlers
  fetchAllData, handleLogout,
  stergeMentoriDuplicati, resetMentori,
  openAdminEmailModal, toggleMentorAvailability, openDateModal,
  alocaLeaduriAutomata, canAllocateLeads, stergeLeaduri, exportToExcel,
  alocaLeaduriManual, showManualAllocModal, setShowManualAllocModal,
  manualAllocMentor, setManualAllocMentor, manualAllocCount, setManualAllocCount,
  dezalocaLeaduriMentor, stergeLaeduriMentor,
  selectedMentor, setSelectedMentor,
  // Upload
  showUploadForm, setShowUploadForm, uploadMode, setUploadMode,
  uploadFile, setUploadFile, handleFileChange, handleUploadLeaduri,
  manualLead, setManualLead, handleAddManualLead,
  // Lead edit
  editingLead, editLeadData, setEditLeadData,
  handleEditLead, handleSaveEditLead, handleCancelEdit,
  handleReallocateLead, handleDeleteLead,
  // Modals
  showDateModal, manualDate, setManualDate, handleConfirmDate, setShowDateModal, selectedMentorForDate, setSelectedMentorForDate,
  showAdminEmailModal, selectedMentorForEmail, setShowAdminEmailModal,
  bulkEmailPreview, setBulkEmailPreview, showBulkEmailPreview, sendBulkEmail,
  emailTemplate, showEmailTemplateEditor, editingTemplate, setEditingTemplate,
  openEmailTemplateEditor, saveEmailTemplate, setShowEmailTemplateEditor,
  showModal, modalConfig, closeModal, handleModalConfirm,
}) {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-black to-gray-900">
      <div className="max-w-7xl mx-auto pt-10 space-y-6 text-white px-4 pb-10">

        {/* Header */}
        <Card className="bg-gray-900/50 backdrop-blur-sm border border-gray-700/50 shadow-2xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <img src={logo} alt="ProFX Logo" className="h-12 w-auto" />
                <div>
                  <h1 className="text-2xl font-bold text-purple-400">Admin - Gestionare Leaduri</h1>
                  <p className="text-gray-400 text-sm">Panou complet de administrare</p>
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
            <span>{success}</span>
            <button onClick={() => setSuccess("")} className="text-xl ml-4">&times;</button>
          </div>
        )}
        {error && (
          <div className="bg-red-500/20 border border-red-500/50 text-red-300 px-4 py-3 rounded-xl flex justify-between items-center">
            <span>{error}</span>
            <button onClick={() => setError("")} className="text-xl ml-4">&times;</button>
          </div>
        )}

        {/* Statistics */}
        <Card className="bg-gray-900/50 backdrop-blur-sm border border-gray-700/50 shadow-2xl">
          <CardContent className="p-6">
            <h2 className="text-xl font-bold text-yellow-400 mb-4">Statistici Generale</h2>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
              <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/30 p-4 rounded-xl text-center">
                <p className="text-sm text-gray-300 mb-1">Total</p>
                <p className="text-3xl font-bold text-blue-400">{leaduri.length}</p>
              </div>
              <div className="bg-gradient-to-br from-yellow-500/10 to-yellow-600/5 border border-yellow-500/30 p-4 rounded-xl text-center">
                <p className="text-sm text-yellow-300 mb-1">Nealocate</p>
                <p className="text-3xl font-bold text-yellow-400">{leaduriNealocate}</p>
              </div>
              <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/30 p-4 rounded-xl text-center">
                <p className="text-sm text-blue-300 mb-1">Alocate</p>
                <p className="text-3xl font-bold text-blue-400">{leaduriAlocate}</p>
              </div>
              <div className="bg-gradient-to-br from-green-500/10 to-green-600/5 border border-green-500/30 p-4 rounded-xl text-center">
                <p className="text-sm text-green-300 mb-1">Confirmate</p>
                <p className="text-3xl font-bold text-green-400">{leaduriConfirmate}</p>
              </div>
              <div className="bg-gradient-to-br from-red-500/10 to-red-600/5 border border-red-500/30 p-4 rounded-xl text-center">
                <p className="text-sm text-red-300 mb-1">Neconfirmate</p>
                <p className="text-3xl font-bold text-red-400">{leaduriNeconfirmate}</p>
              </div>
              <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 border border-purple-500/30 p-4 rounded-xl text-center">
                <p className="text-sm text-purple-300 mb-1">Prezenți</p>
                <p className="text-3xl font-bold text-purple-400">{leaduriComplete}</p>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-4">
              <div className="bg-gradient-to-br from-orange-500/10 to-orange-600/5 border border-orange-500/30 p-4 rounded-xl">
                <div className="flex items-center justify-between">
                  <div><p className="text-sm text-orange-300 mb-1">No-Show</p><p className="text-2xl font-bold text-orange-400">{leaduriNoShow}</p></div>
                </div>
              </div>
              <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 border border-blue-500/30 p-4 rounded-xl">
                <div className="flex items-center justify-between">
                  <div><p className="text-sm text-gray-300 mb-1">Rata conversie</p>
                  <p className="text-2xl font-bold text-blue-400">{leaduri.length > 0 ? Math.round((leaduriComplete / leaduri.length) * 100) : 0}%</p></div>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Mentori */}
        <Card className="bg-gray-900/50 backdrop-blur-sm border border-gray-700/50 shadow-2xl">
          <CardContent className="p-6">
            <div className="flex justify-between items-center mb-4">
              <h2 className="text-xl font-bold text-blue-400">Mentori ({mentoriUnici.length})</h2>
              <div className="flex gap-2">
                {mentoriData.length > 5 && (
                  <button onClick={stergeMentoriDuplicati} disabled={loading}
                    className="bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/50 text-orange-300 px-4 py-2 rounded-xl text-sm transition-all">
                    Sterge Duplicati
                  </button>
                )}
                <button onClick={resetMentori}
                  className="bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-500/50 text-yellow-300 px-4 py-2 rounded-xl text-sm transition-all">
                  Reset
                </button>
              </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
              {mentoriUnici
                .sort((a, b) => a.ordineCoada - b.ordineCoada)
                .map((mentor, index) => (
                  <div key={mentor.id} className={"border-2 rounded-xl p-4 transition-all " + (mentor.available ? 'border-green-500/50 bg-gray-800/30' : 'border-gray-600/50 bg-gray-800/30')}>
                    <div className="text-center">
                      <div className="mb-3 flex justify-center">
                        <div className="w-16 h-16 rounded-full border-2 border-gray-600/50 overflow-hidden">
                          <img src={MENTOR_PHOTOS[mentor.id]} alt={mentor.nume} className="w-full h-full object-cover" />
                        </div>
                      </div>
                      <h4 className="font-bold text-lg text-white">{mentor.nume || 'Mentor'}</h4>
                      <p className="text-sm text-gray-400">Pozitie: #{index + 1}</p>
                      
                      {/* Progress Bar */}
                      <div className="mt-3 mb-3">
                        <div className="flex justify-between items-center mb-1">
                          <span className="text-xs text-gray-400">Leaduri alocate</span>
                          <span className="text-xs font-bold text-white">{mentor.leaduriAlocate || 0}/30</span>
                        </div>
                        <div className="w-full bg-gray-700/30 rounded-full h-2.5 overflow-hidden">
                          <div 
                            className={"h-full rounded-full transition-all duration-500 " + ((mentor.leaduriAlocate || 0) <= 20 ? 'bg-gradient-to-r from-blue-500 to-cyan-400' : 'bg-gradient-to-r from-orange-500 to-red-500')}
                            style={{ width: Math.min(((mentor.leaduriAlocate || 0) / 30) * 100, 100) + '%' }}>
                          </div>
                        </div>
                      </div>

                      <div className="mt-3 space-y-1 text-xs">
                        <div className="flex justify-between"><span className="text-gray-400">Total:</span><span className="text-white font-bold">{mentor.leaduriAlocate || 0}</span></div>
                        <div className="flex justify-between"><span className="text-blue-400">Alocate:</span><span className="text-blue-400 font-bold">{leaduri.filter(l => l.mentorAlocat === mentor.id && l.status === LEAD_STATUS.ALOCAT).length}</span></div>
                        <div className="flex justify-between"><span className="text-green-400">Confirmate:</span><span className="text-green-400 font-bold">{leaduri.filter(l => l.mentorAlocat === mentor.id && l.status === LEAD_STATUS.CONFIRMAT).length}</span></div>
                        <div className="flex justify-between"><span className="text-purple-400">Prezenți:</span><span className="text-purple-400 font-bold">{leaduri.filter(l => l.mentorAlocat === mentor.id && l.status === LEAD_STATUS.COMPLET).length}</span></div>
                      </div>
                      <div className="mt-2">
                        <span className={"inline-block px-3 py-1 rounded-full text-xs font-semibold border " + (mentor.available ? 'bg-green-500/20 border-green-500/50 text-green-300' : 'bg-gray-500/20 border-gray-500/50 text-gray-400')}>
                          {mentor.available ? 'Available' : 'Busy'}
                        </span>
                      </div>
                      <div className="mt-2">
                        {mentor.ultimulOneToTwenty ? (
                          <div className="bg-purple-500/10 border border-purple-500/30 rounded-lg p-2">
                            <p className="text-xs text-purple-300 font-semibold mb-1">Webinar 1:20 programat:</p>
                            <p className="text-xs text-white font-bold">{formatDate(mentor.ultimulOneToTwenty)}</p>
                          </div>
                        ) : (
                          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-2">
                            <p className="text-xs text-yellow-300 font-semibold">Fără webinar programat</p>
                          </div>
                        )}
                      </div>
                      <div className="mt-3 space-y-2">
                        <button 
                          onClick={() => openAdminEmailModal(mentor.id)}
                          disabled={!mentor.ultimulOneToTwenty || (mentor.leaduriAlocate || 0) < 2}
                          className={"w-full px-3 py-1.5 rounded-lg text-sm font-semibold transition-all border flex items-center justify-center gap-2 " + (mentor.ultimulOneToTwenty && (mentor.leaduriAlocate || 0) >= 2 ? 'bg-purple-500/20 hover:bg-purple-500/30 border-purple-500/50 text-purple-300' : 'bg-gray-700/20 border-gray-600/50 text-gray-500 cursor-not-allowed')}>
                          <span>✉️</span> Email Leaduri
                        </button>
                        <button 
                          onClick={(e) => {
                            e.preventDefault();
                            console.log('Dezactiveaza button clicked for mentor:', mentor.id);
                            toggleMentorAvailability(mentor.id, mentor.available);
                          }}
                          disabled={loading}
                          className={"w-full px-3 py-1.5 rounded-lg text-sm font-semibold transition-all border " + (loading ? 'opacity-50 cursor-not-allowed ' : '') + (mentor.available ? 'bg-red-500/20 hover:bg-red-500/30 border-red-500/50 text-red-300' : 'bg-green-500/20 hover:bg-green-500/30 border-green-500/50 text-green-300')}>
                          {loading ? '...' : (mentor.available ? 'Dezactiveaza' : 'Activeaza')}
                        </button>
                        <button onClick={() => openDateModal(mentor.id)}
                          className="w-full bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/50 text-blue-300 px-3 py-1.5 rounded-lg text-sm font-semibold transition-all">
                          Update 1:20
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
            </div>
          </CardContent>
        </Card>

        {/* Actions */}
        <Card className="bg-gray-900/50 backdrop-blur-sm border border-gray-700/50 shadow-2xl">
          <CardContent className="p-6">
            <h2 className="text-xl font-bold text-blue-400 mb-4">Actiuni</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
              <button onClick={() => setShowUploadForm(!showUploadForm)}
                className="bg-gradient-to-r from-blue-500/20 to-blue-600/20 hover:from-blue-500/30 hover:to-blue-600/30 border border-blue-500/50 text-blue-300 px-6 py-3 rounded-xl font-semibold transition-all flex items-center justify-center gap-2">
                Incarca Leaduri
              </button>
              <button onClick={exportToExcel} disabled={loading || leaduri.length === 0}
                className={"px-6 py-3 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 border " + (loading || leaduri.length === 0 ? 'bg-gray-700/20 border-gray-600/50 text-gray-500 cursor-not-allowed' : 'bg-gradient-to-r from-purple-500/20 to-purple-600/20 hover:from-purple-500/30 hover:to-purple-600/30 border-purple-500/50 text-purple-300')}>
                Export Excel
              </button>
              <button onClick={alocaLeaduriAutomata} disabled={loading || !canAllocateLeads()}
                className={"px-6 py-3 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 border " + (loading || !canAllocateLeads() ? 'bg-gray-700/20 border-gray-600/50 text-gray-500 cursor-not-allowed' : 'bg-gradient-to-r from-green-500/20 to-green-600/20 hover:from-green-500/30 hover:to-green-600/30 border-green-500/50 text-green-300')}>
                Aloca Automat (FIFO)
              </button>
              <button onClick={() => setShowManualAllocModal(true)} disabled={loading || leaduriNealocate === 0}
                className={"px-6 py-3 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 border " + (loading || leaduriNealocate === 0 ? 'bg-gray-700/20 border-gray-600/50 text-gray-500 cursor-not-allowed' : 'bg-gradient-to-r from-teal-500/20 to-teal-600/20 hover:from-teal-500/30 hover:to-teal-600/30 border-teal-500/50 text-teal-300')}>
                🎯 Aloca Manual
              </button>
              <button onClick={openEmailTemplateEditor} disabled={loading}
                className={"px-6 py-3 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 border " + (loading ? 'bg-gray-700/20 border-gray-600/50 text-gray-500 cursor-not-allowed' : 'bg-gradient-to-r from-yellow-500/20 to-yellow-600/20 hover:from-yellow-500/30 hover:to-yellow-600/30 border-yellow-500/50 text-yellow-300')}>
                ✉️ Editează Email
              </button>
              <button onClick={stergeLeaduri} disabled={loading || leaduri.length === 0}
                className={"px-6 py-3 rounded-xl font-semibold transition-all flex items-center justify-center gap-2 border " + (loading || leaduri.length === 0 ? 'bg-gray-700/20 border-gray-600/50 text-gray-500 cursor-not-allowed' : 'bg-gradient-to-r from-red-500/20 to-red-600/20 hover:from-red-500/30 hover:to-red-600/30 border-red-500/50 text-red-300')}>
                Sterge Toate
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Upload Form */}
        {showUploadForm && (
          <Card className="bg-gray-900/50 backdrop-blur-sm border border-gray-700/50 shadow-2xl">
            <CardContent className="p-6">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-xl font-bold text-blue-400">Incarca Leaduri</h2>
                <div className="flex gap-2">
                  <button onClick={() => setUploadMode('excel')}
                    className={"px-4 py-2 rounded-xl font-semibold transition-all border " + (uploadMode === 'excel' ? 'bg-blue-500/20 border-blue-500/50 text-blue-300' : 'bg-gray-700/20 border-gray-600/50 text-gray-400')}>
                    Excel
                  </button>
                  <button onClick={() => setUploadMode('manual')}
                    className={"px-4 py-2 rounded-xl font-semibold transition-all border " + (uploadMode === 'manual' ? 'bg-blue-500/20 border-blue-500/50 text-blue-300' : 'bg-gray-700/20 border-gray-600/50 text-gray-400')}>
                    Manual
                  </button>
                </div>
              </div>
              {uploadMode === 'excel' ? (
                <div className="space-y-4">
                  <div className="border-2 border-dashed border-gray-600/50 rounded-xl p-6 text-center bg-gray-800/30">
                    <input type="file" accept=".xlsx,.xls,.csv" onChange={handleFileChange} className="hidden" id="file-upload" />
                    <label htmlFor="file-upload" className="cursor-pointer inline-flex items-center gap-2 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/50 text-blue-300 px-6 py-3 rounded-xl font-semibold transition-all">
                      Selecteaza Fisier Excel
                    </label>
                    {uploadFile && <p className="mt-4 text-sm text-gray-400">Fisier: <span className="font-semibold text-blue-300">{uploadFile.name}</span></p>}
                  </div>
                  <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
                    <h4 className="font-semibold text-blue-300 mb-2">Format Excel</h4>
                    <p className="text-sm text-gray-300 mb-2">Coloane necesare:</p>
                    <ul className="text-sm text-gray-300 list-disc list-inside space-y-1">
                      <li><strong className="text-white">Nume</strong> - Numele complet (obligatoriu)</li>
                      <li><strong className="text-white">Telefon</strong> - Numar de telefon (obligatoriu)</li>
                      <li><strong className="text-white">Email</strong> - Adresa de email (obligatoriu)</li>
                    </ul>
                  </div>
                  <div className="flex gap-3">
                    <button onClick={handleUploadLeaduri} disabled={loading || !uploadFile}
                      className={"flex-1 px-6 py-3 rounded-xl font-semibold transition-all border " + (loading || !uploadFile ? 'bg-gray-700/20 border-gray-600/50 text-gray-500 cursor-not-allowed' : 'bg-green-500/20 hover:bg-green-500/30 border-green-500/50 text-green-300')}>
                      {loading ? 'Se incarca...' : 'Incarca Leaduri'}
                    </button>
                    <button onClick={() => { setShowUploadForm(false); setUploadFile(null); }}
                      className="px-6 py-3 bg-gray-700/20 hover:bg-gray-700/30 border border-gray-600/50 text-gray-300 rounded-xl font-semibold transition-all">
                      Anuleaza
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleAddManualLead} className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Nume complet *</label>
                      <Input type="text" value={manualLead.nume} onChange={(e) => setManualLead({ ...manualLead, nume: e.target.value })}
                        className="w-full p-3 rounded-xl border border-gray-600/50 bg-gray-800/50 text-white" placeholder="Ion Popescu" required />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Telefon *</label>
                      <Input type="tel" value={manualLead.telefon} onChange={(e) => setManualLead({ ...manualLead, telefon: e.target.value })}
                        className="w-full p-3 rounded-xl border border-gray-600/50 bg-gray-800/50 text-white" placeholder="0712345678" required />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-300 mb-2">Email *</label>
                      <Input type="email" value={manualLead.email} onChange={(e) => setManualLead({ ...manualLead, email: e.target.value })}
                        className="w-full p-3 rounded-xl border border-gray-600/50 bg-gray-800/50 text-white" placeholder="ion@example.com" required />
                    </div>
                  </div>
                  <div className="flex gap-3">
                    <button type="submit" disabled={loading}
                      className={"flex-1 px-6 py-3 rounded-xl font-semibold transition-all border " + (loading ? 'bg-gray-700/20 border-gray-600/50 text-gray-500 cursor-not-allowed' : 'bg-green-500/20 hover:bg-green-500/30 border-green-500/50 text-green-300')}>
                      {loading ? 'Se adauga...' : 'Adauga Lead'}
                    </button>
                    <button type="button" onClick={() => { setShowUploadForm(false); setManualLead({ nume: '', telefon: '', email: '' }); }}
                      className="px-6 py-3 bg-gray-700/20 hover:bg-gray-700/30 border border-gray-600/50 text-gray-300 rounded-xl font-semibold transition-all">
                      Anuleaza
                    </button>
                  </div>
                </form>
              )}
            </CardContent>
          </Card>
        )}

        {/* Active Allocations */}
        {alocariAggregate.length > 0 && (
          <Card className="bg-gray-900/50 backdrop-blur-sm border border-gray-700/50 shadow-2xl">
            <CardContent className="p-6">
              <h2 className="text-xl font-bold text-blue-400 mb-4">Alocari Active</h2>
              <div className="space-y-3">
                {alocariAggregate.sort((a, b) => {
                  const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
                  const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
                  return dateB - dateA;
                }).map((alocare) => (
                  <div key={alocare.id} className="border border-gray-700/50 rounded-xl p-4 bg-gray-800/30 hover:bg-gray-800/50 transition-all">
                    <div className="flex justify-between items-start">
                      <div>
                        <h4 className="font-semibold text-lg text-blue-300">{alocare.mentorNume}</h4>
                        <p className="text-sm text-gray-400">{alocare.numarLeaduri} leaduri alocate</p>
                        <p className="text-xs text-gray-500">{formatDate(alocare.createdAt)}</p>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => dezalocaLeaduriMentor(alocare)} disabled={loading}
                          className="bg-yellow-500/20 hover:bg-yellow-500/30 border border-yellow-500/50 text-yellow-300 px-3 py-1.5 rounded-lg text-sm transition-all disabled:opacity-50">
                          Dezalocare
                        </button>
                        <button onClick={() => stergeLaeduriMentor(alocare)} disabled={loading}
                          className="bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 text-red-300 px-3 py-1.5 rounded-lg text-sm transition-all disabled:opacity-50">
                          Sterge
                        </button>
                        <button onClick={() => setSelectedMentor(selectedMentor === alocare.id ? null : alocare.id)}
                          className="bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/50 text-blue-300 px-3 py-1.5 rounded-lg text-sm transition-all">
                          {selectedMentor === alocare.id ? 'Ascunde' : 'Vezi Leaduri'}
                        </button>
                      </div>
                    </div>
                    {selectedMentor === alocare.id && (
                      <div className="mt-4 pt-4 border-t border-gray-700/50">
                        <div className="max-h-96 overflow-y-auto">
                          <table className="min-w-full divide-y divide-gray-700/50">
                            <thead className="bg-gray-900/50 sticky top-0">
                              <tr>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase">Nume</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase">Telefon</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase">Email</th>
                                <th className="px-4 py-2 text-left text-xs font-medium text-gray-400 uppercase">Status</th>
                              </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-700/30">
                              {leaduri.filter(l => alocare.leaduri.includes(l.id)).map(l => {
                                const badge = getStatusBadge(l.status);
                                return (
                                  <tr key={l.id} className="hover:bg-gray-800/50">
                                    <td className="px-4 py-2 text-sm text-white">{l.nume}</td>
                                    <td className="px-4 py-2 text-sm text-white">{l.telefon}</td>
                                    <td className="px-4 py-2 text-sm text-gray-300">{l.email || '-'}</td>
                                    <td className="px-4 py-2 text-sm"><span className={"px-2 py-1 text-xs font-semibold rounded-full border " + badge.bg}>{badge.label}</span></td>
                                  </tr>
                                );
                              })}
                            </tbody>
                          </table>
                        </div>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {/* All Leads Table */}
        <Card className="bg-gray-900/50 backdrop-blur-sm border border-gray-700/50 shadow-2xl">
          <CardContent className="p-6">
            <h2 className="text-xl font-bold text-blue-400 mb-4">Toate Leadurile ({leaduri.length})</h2>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div className="md:col-span-2">
                <Input type="text" placeholder="Cauta dupa nume, telefon sau email..." value={searchQuery}
                  onChange={(e) => { setSearchQuery(e.target.value); setCurrentPage(1); }}
                  className="w-full p-3 rounded-xl border border-gray-600/50 bg-gray-800/50 text-white placeholder-gray-500" />
              </div>
              <div>
                <select value={sortBy} onChange={(e) => setSortBy(e.target.value)}
                  className="w-full p-3 rounded-xl border border-gray-600/50 bg-gray-800/50 text-white">
                  <option value="data-desc">Data (Nou &rarr; Vechi)</option>
                  <option value="data-asc">Data (Vechi &rarr; Nou)</option>
                  <option value="nume-asc">Nume (A &rarr; Z)</option>
                  <option value="nume-desc">Nume (Z &rarr; A)</option>
                </select>
              </div>
            </div>
            {leaduri.length === 0 ? (
              <div className="text-center py-12 text-gray-400">
                <p className="text-lg">Nu exista leaduri incarcate</p>
                <p className="text-sm mt-2">Apasa pe Incarca Leaduri pentru a adauga</p>
              </div>
            ) : leaduriCurente.length === 0 ? (
              <div className="text-center py-12 text-gray-400"><p className="text-lg">Nu s-au gasit rezultate</p></div>
            ) : (
              <>
                <div className="overflow-x-auto">
                  <table className="min-w-full divide-y divide-gray-700/50">
                    <thead className="bg-gray-900/50">
                      <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">#</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Nume</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Telefon</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Email</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Status</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Mentor</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Data</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-400 uppercase">Actiuni</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-700/30">
                      {leaduriCurente.map((lead, index) => {
                        const mentorInfo = MENTORI_DISPONIBILI.find(m => m.id === lead.mentorAlocat);
                        const isEd = editingLead === lead.id;
                        const badge = getStatusBadge(lead.status);
                        return (
                          <tr key={lead.id} className="hover:bg-gray-800/50 transition-all">
                            <td className="px-4 py-3 text-sm text-gray-400">{indexOfFirstLead + index + 1}</td>
                            <td className="px-4 py-3 text-sm font-medium text-white">
                              {isEd ? <Input type="text" value={editLeadData.nume} onChange={(e) => setEditLeadData({...editLeadData, nume: e.target.value})} className="w-full p-2 rounded-lg bg-gray-700/50 text-white border border-gray-600/50" /> : lead.nume}
                            </td>
                            <td className="px-4 py-3 text-sm text-white">
                              {isEd ? <Input type="tel" value={editLeadData.telefon} onChange={(e) => setEditLeadData({...editLeadData, telefon: e.target.value})} className="w-full p-2 rounded-lg bg-gray-700/50 text-white border border-gray-600/50" /> : lead.telefon}
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-300">
                              {isEd ? <Input type="email" value={editLeadData.email} onChange={(e) => setEditLeadData({...editLeadData, email: e.target.value})} className="w-full p-2 rounded-lg bg-gray-700/50 text-white border border-gray-600/50" /> : lead.email}
                            </td>
                            <td className="px-4 py-3">
                              <div className="flex flex-col gap-1">
                                <span className={"px-2 py-1 text-xs font-semibold rounded-full text-center border " + badge.bg}>{badge.label}</span>
                                {lead.status === LEAD_STATUS.ALOCAT && lead.dataAlocare && (
                                  <span className="text-xs text-gray-400 text-center">{formatTimeRemaining(getTimeUntilTimeout(lead))}</span>
                                )}
                              </div>
                            </td>
                            <td className="px-4 py-3 text-sm text-gray-300">{mentorInfo ? mentorInfo.nume : '-'}</td>
                            <td className="px-4 py-3 text-sm text-gray-400">{formatDate(lead.createdAt)}</td>
                            <td className="px-4 py-3 text-sm">
                              {isEd ? (
                                <div className="flex gap-2">
                                  <button onClick={() => handleSaveEditLead(lead.id)} disabled={loading}
                                    className="bg-green-500/20 hover:bg-green-500/30 border border-green-500/50 text-green-300 px-3 py-1 rounded-lg text-xs font-semibold transition-all">Salveaza</button>
                                  <button onClick={handleCancelEdit}
                                    className="bg-gray-500/20 hover:bg-gray-500/30 border border-gray-500/50 text-gray-300 px-3 py-1 rounded-lg text-xs font-semibold transition-all">Anuleaza</button>
                                </div>
                              ) : (
                                <div className="flex flex-col gap-1.5">
                                  {(lead.status === LEAD_STATUS.NECONFIRMAT || lead.status === LEAD_STATUS.NO_SHOW) && (
                                    <button onClick={() => handleReallocateLead(lead.id)} disabled={loading}
                                      className="bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/50 text-blue-300 px-2 py-1 rounded-lg text-xs font-semibold transition-all">Re-aloca</button>
                                  )}
                                  <div className="flex gap-1 pt-1 border-t border-gray-700/30">
                                    <button onClick={() => handleEditLead(lead)} disabled={loading}
                                      className="bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/50 text-blue-300 px-2 py-1 rounded-lg text-xs font-semibold transition-all">Edit</button>
                                    <button onClick={() => handleDeleteLead(lead)} disabled={loading}
                                      className="bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 text-red-300 px-2 py-1 rounded-lg text-xs font-semibold transition-all">Sterge</button>
                                  </div>
                                </div>
                              )}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
                {totalPages > 1 && (
                  <div className="mt-6 flex items-center justify-between">
                    <div className="text-sm text-gray-400">{indexOfFirstLead + 1} - {Math.min(indexOfLastLead, leaduriSortate.length)} din {leaduriSortate.length}</div>
                    <div className="flex gap-2">
                      <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1}
                        className={"px-4 py-2 rounded-xl font-semibold transition-all border " + (currentPage === 1 ? 'bg-gray-700/20 border-gray-600/50 text-gray-500 cursor-not-allowed' : 'bg-blue-500/20 hover:bg-blue-500/30 border-blue-500/50 text-blue-300')}>Anterior</button>
                      <div className="flex gap-1">
                        {[...Array(totalPages)].map((_, i) => {
                          const p = i + 1;
                          if (p === 1 || p === totalPages || (p >= currentPage - 1 && p <= currentPage + 1))
                            return <button key={p} onClick={() => setCurrentPage(p)} className={"px-4 py-2 rounded-xl font-semibold transition-all border " + (currentPage === p ? 'bg-blue-500/30 border-blue-500/50 text-blue-300' : 'bg-gray-700/20 hover:bg-gray-700/30 border-gray-600/50 text-gray-400')}>{p}</button>;
                          if (p === currentPage - 2 || p === currentPage + 2) return <span key={p} className="px-2 py-2 text-gray-500">...</span>;
                          return null;
                        })}
                      </div>
                      <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages}
                        className={"px-4 py-2 rounded-xl font-semibold transition-all border " + (currentPage === totalPages ? 'bg-gray-700/20 border-gray-600/50 text-gray-500 cursor-not-allowed' : 'bg-blue-500/20 hover:bg-blue-500/30 border-blue-500/50 text-blue-300')}>Urmator</button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Date Modal */}
      {showDateModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-2xl shadow-2xl border border-gray-700/50 max-w-md w-full p-6">
            <h3 className="text-xl font-bold text-white mb-4">📅 Seteaza Data Webinar 1:20</h3>
            <p className="text-sm text-gray-400 mb-4">Alege data și ora pentru webinarul mentorului</p>
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

      {/* Admin Email Preview Modal */}
      {showAdminEmailModal && selectedMentorForEmail && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-2xl shadow-2xl border border-gray-700/50 max-w-2xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <span>✉️</span> Trimite Email Leaduri - {selectedMentorForEmail.nume}
              </h3>
              <button onClick={() => setShowAdminEmailModal(false)} className="text-gray-400 hover:text-white text-2xl">&times;</button>
            </div>
            
            <div className="bg-gray-800/50 rounded-xl p-4 mb-4 border border-gray-700/50">
              <div className="flex items-center gap-3 mb-3">
                <div className="w-12 h-12 rounded-full bg-purple-500/20 border-2 border-purple-500/50 flex items-center justify-center overflow-hidden">
                  <img src={MENTOR_PHOTOS[selectedMentorForEmail.id]} alt={selectedMentorForEmail.nume} className="w-full h-full object-cover" />
                </div>
                <div>
                  <p className="text-white font-semibold">{selectedMentorForEmail.nume}</p>
                  <p className="text-sm text-gray-400">
                    {leaduri.filter(l => l.mentorAlocat === selectedMentorForEmail.id && l.status === LEAD_STATUS.ALOCAT).length} leaduri vor primi email
                    {leaduri.filter(l => l.mentorAlocat === selectedMentorForEmail.id && l.status === LEAD_STATUS.CONFIRMAT).length > 0 && (
                      <span className="text-green-400"> • {leaduri.filter(l => l.mentorAlocat === selectedMentorForEmail.id && l.status === LEAD_STATUS.CONFIRMAT).length} deja confirmate</span>
                    )}
                  </p>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4">
                <h4 className="font-semibold text-blue-300 mb-2">📋 Detalii Email</h4>
                <ul className="text-sm text-gray-300 space-y-2">
                  <li><strong className="text-white">Subiect:</strong> Invitație Webinar 1:20 - ProFX</li>
                  <li><strong className="text-white">Data webinar:</strong> {formatDate(selectedMentorForEmail.ultimulOneToTwenty)}</li>
                  <li><strong className="text-white">Mentor:</strong> {selectedMentorForEmail.nume}</li>
                  <li><strong className="text-white">Destinatari:</strong> Doar leadurile cu status ALOCAT (neconfirmate)</li>
                  <li className="text-yellow-300 text-xs">⚠️ Leadurile confirmate nu vor primi email (au confirmat deja prezența)</li>
                </ul>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-400 mb-2">Leaduri:</label>
                <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4 max-h-48 overflow-y-auto">
                  <div className="space-y-2">
                    {leaduri
                      .filter(l => l.mentorAlocat === selectedMentorForEmail.id && (l.status === LEAD_STATUS.ALOCAT || l.status === LEAD_STATUS.CONFIRMAT))
                      .map(lead => {
                        const isConfirmed = lead.status === LEAD_STATUS.CONFIRMAT;
                        return (
                          <button
                            key={lead.id}
                            onClick={() => !isConfirmed && showBulkEmailPreview(lead)}
                            className={`w-full flex items-center justify-between py-2 px-3 rounded-lg transition-all ${
                              isConfirmed 
                                ? 'bg-green-900/20 border border-green-500/30 opacity-60 cursor-not-allowed' 
                                : 'bg-gray-700/30 hover:bg-gray-700/50 cursor-pointer group'
                            }`}
                            disabled={isConfirmed}
                          >
                            <div className="text-left">
                              <p className={`text-sm font-semibold ${
                                isConfirmed ? 'text-green-300' : 'text-white group-hover:text-blue-300'
                              } transition-colors`}>{lead.nume} {isConfirmed && '✓'}</p>
                              <p className="text-gray-400 text-xs">{lead.email}</p>
                              {isConfirmed && (
                                <p className="text-green-400 text-xs mt-1">🚫 Deja confirmat - nu va primi email</p>
                              )}
                            </div>
                            <span className={"px-2 py-1 text-xs font-semibold rounded-full " + getStatusBadge(lead.status).bg}>
                              {getStatusBadge(lead.status).label}
                            </span>
                          </button>
                        );
                      })}
                  </div>
                </div>
              </div>

              {/* Preview Email pentru lead selectat */}
              {bulkEmailPreview && (
                <div className="bg-gradient-to-br from-blue-900/20 to-purple-900/20 border border-blue-500/30 rounded-xl p-4">
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="font-semibold text-blue-300 flex items-center gap-2">
                      <span>👁️</span> Preview Email - {bulkEmailPreview.lead.nume}
                    </h4>
                    <button 
                      onClick={() => setBulkEmailPreview(null)}
                      className="text-gray-400 hover:text-white text-xl"
                    >
                      &times;
                    </button>
                  </div>
                  <div className="bg-gray-900/50 rounded-lg p-4 max-h-64 overflow-y-auto">
                    <div className="mb-3 pb-3 border-b border-gray-700/50">
                      <p className="text-xs text-gray-400 mb-1">Subiect:</p>
                      <p className="text-white font-semibold text-sm">{bulkEmailPreview.content.subject}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-400 mb-2">Conținut:</p>
                      <pre className="text-gray-300 whitespace-pre-wrap font-sans text-xs leading-relaxed">{bulkEmailPreview.content.body}</pre>
                    </div>
                  </div>
                </div>
              )}
            </div>

            <div className="mt-6 pt-4 border-t border-gray-700/50">
              <div className="flex gap-3">
                <button onClick={() => setShowAdminEmailModal(false)}
                  className="flex-1 bg-gray-600/20 hover:bg-gray-600/30 border border-gray-600/50 text-gray-300 py-3 px-4 rounded-xl font-semibold transition-all">Anuleaza</button>
                <button onClick={sendBulkEmail} disabled={loading || leaduri.filter(l => l.mentorAlocat === selectedMentorForEmail.id && l.status === LEAD_STATUS.ALOCAT).length === 0}
                  className="flex-1 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/50 text-purple-300 py-3 px-4 rounded-xl font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                  {loading ? 'Se trimite...' : (
                    <>
                      <span>📤</span> Trimite Email ({leaduri.filter(l => l.mentorAlocat === selectedMentorForEmail.id && l.status === LEAD_STATUS.ALOCAT).length})
                      {leaduri.filter(l => l.mentorAlocat === selectedMentorForEmail.id && l.status === LEAD_STATUS.ALOCAT).length === 0 && ' - Niciun lead disponibil'}
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Email Template Editor Modal */}
      {showEmailTemplateEditor && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-2xl shadow-2xl border border-gray-700/50 max-w-4xl w-full p-6 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-bold text-white flex items-center gap-2">
                <span>✏️</span> Editează Template Email
              </h3>
              <button onClick={() => setShowEmailTemplateEditor(false)} className="text-gray-400 hover:text-white text-2xl">&times;</button>
            </div>

            <div className="bg-blue-500/10 border border-blue-500/30 rounded-xl p-4 mb-6">
              <h4 className="font-semibold text-blue-300 mb-2">📝 Variabile Disponibile</h4>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-2 text-sm text-gray-300">
                <div className="bg-gray-800/50 rounded-lg p-2">
                  <code className="text-yellow-300">{'{{nume}}'}</code> - Numele leadului
                </div>
                <div className="bg-gray-800/50 rounded-lg p-2">
                  <code className="text-yellow-300">{'{{mentorName}}'}</code> - Numele mentorului
                </div>
                <div className="bg-gray-800/50 rounded-lg p-2">
                  <code className="text-yellow-300">{'{{webinarDate}}'}</code> - Data webinarului
                </div>
                <div className="bg-gray-800/50 rounded-lg p-2">
                  <code className="text-yellow-300">{'{{confirmationLink}}'}</code> - Link confirmare
                </div>
                <div className="bg-gray-800/50 rounded-lg p-2">
                  <code className="text-yellow-300">{'{{telefon}}'}</code> - Telefonul leadului
                </div>
                <div className="bg-gray-800/50 rounded-lg p-2">
                  <code className="text-yellow-300">{'{{email}}'}</code> - Email-ul leadului
                </div>
              </div>
              <p className="text-xs text-gray-400 mt-3">
                Aceste variabile vor fi înlocuite automat cu datele reale când se trimite emailul.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Subiect Email:</label>
                <Input
                  type="text"
                  value={editingTemplate.subject}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, subject: e.target.value })}
                  placeholder="ex: Invitatie Webinar 1:20 - ProFX"
                  className="w-full p-3 rounded-xl bg-gray-800/50 text-white border border-gray-600/50"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Conținut Email:</label>
                <textarea
                  value={editingTemplate.body}
                  onChange={(e) => setEditingTemplate({ ...editingTemplate, body: e.target.value })}
                  rows={16}
                  placeholder="Scrie conținutul email-ului aici... Folosește variabilele de mai sus pentru a personaliza mesajul."
                  className="w-full p-4 rounded-xl bg-gray-800/50 text-white border border-gray-600/50 font-mono text-sm leading-relaxed resize-none focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                />
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-gray-700/50">
              <div className="flex gap-3">
                <button 
                  onClick={() => setShowEmailTemplateEditor(false)}
                  className="flex-1 bg-gray-600/20 hover:bg-gray-600/30 border border-gray-600/50 text-gray-300 py-3 px-4 rounded-xl font-semibold transition-all">
                  Anulează
                </button>
                <button 
                  onClick={saveEmailTemplate} 
                  disabled={loading}
                  className="flex-1 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/50 text-blue-300 py-3 px-4 rounded-xl font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                  {loading ? 'Se salvează...' : '💾 Salvează Template'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Manual Allocation Modal */}
      {showManualAllocModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-2xl shadow-2xl border border-teal-700/50 max-w-lg w-full animate-scaleIn">
            <div className="p-6">
              <div className="flex items-center gap-3 mb-6">
                <div className="w-12 h-12 rounded-full flex items-center justify-center bg-teal-500/20 border-2 border-teal-500/50">
                  <span className="text-2xl">🎯</span>
                </div>
                <h3 className="text-xl font-bold text-teal-400">Alocare Manuală Leaduri</h3>
              </div>
              
              <div className="space-y-4 mb-6">
                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-2">
                    Selectează Mentor
                  </label>
                  <select
                    value={manualAllocMentor}
                    onChange={(e) => setManualAllocMentor(e.target.value)}
                    className="w-full bg-gray-800/50 border border-gray-600/50 text-white px-4 py-3 rounded-xl focus:outline-none focus:border-teal-500/50 transition-all"
                  >
                    <option value="">-- Alege un mentor --</option>
                    {mentoriUnici
                      .filter(m => (m.leaduriAlocate || 0) < 30)
                      .sort((a, b) => a.ordineCoada - b.ordineCoada)
                      .map(mentor => {
                        const leadCnt = mentor.leaduriAlocate || 0;
                        const mentorInfo = MENTORI_DISPONIBILI.find(mDef => mDef.id === mentor.id);
                        const mentorNume = mentorInfo ? mentorInfo.nume : mentor.nume;
                        return (
                          <option key={mentor.id} value={mentor.id}>
                            {mentorNume} ({leadCnt}/30 leaduri)
                          </option>
                        );
                      })}
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-semibold text-gray-300 mb-2">
                    Număr de Leaduri (opțional)
                  </label>
                  <input
                    type="number"
                    min="1"
                    value={manualAllocCount}
                    onChange={(e) => setManualAllocCount(e.target.value)}
                    placeholder="Lasă gol pentru toate disponibile"
                    className="w-full bg-gray-800/50 border border-gray-600/50 text-white px-4 py-3 rounded-xl focus:outline-none focus:border-teal-500/50 transition-all"
                  />
                  <p className="text-xs text-gray-400 mt-1">
                    Leaduri nealocate disponibile: {leaduriNealocate}
                  </p>
                </div>

                <div className="bg-teal-500/10 border border-teal-500/30 rounded-xl p-4">
                  <p className="text-sm text-gray-300">
                    <span className="font-semibold text-teal-400">💡 Info:</span> Alocarea manuală permite atribuirea de leaduri chiar și când sunt mai puțin de 20, pentru situații speciale.
                  </p>
                </div>
              </div>

              <div className="flex gap-3">
                <button 
                  onClick={() => {
                    setShowManualAllocModal(false);
                    setManualAllocMentor('');
                    setManualAllocCount('');
                  }}
                  className="flex-1 bg-gray-600/20 hover:bg-gray-600/30 border border-gray-600/50 text-gray-300 px-4 py-3 rounded-xl transition-all font-medium">
                  Anulează
                </button>
                <button 
                  onClick={alocaLeaduriManual}
                  disabled={!manualAllocMentor || loading}
                  className="flex-1 bg-teal-500/20 hover:bg-teal-500/30 border border-teal-500/50 text-teal-300 px-4 py-3 rounded-xl transition-all font-medium disabled:opacity-50 disabled:cursor-not-allowed">
                  {loading ? 'Se alocă...' : '🎯 Alocă Leaduri'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

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

      {loading && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-40">
          <div className="bg-gray-800 border border-gray-700 p-8 rounded-2xl"><p className="text-xl text-white animate-pulse">Se proceseaza...</p></div>
        </div>
      )}
    </div>
  );
}
