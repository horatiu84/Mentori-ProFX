/* eslint-disable no-unused-vars */
import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import logo from "./logo2.png";
import { supabase } from "./supabase";
import { dateTimeLocalToUtcIso, formatDate, MENTORI_DISPONIBILI, MENTOR_PHOTOS, LEAD_STATUS, ONE_TO_TWENTY_STATUS, TIMEOUT_6H, checkLeadTimeout, getTimeUntilTimeout, formatTimeRemaining, getStatusBadge, toDateTimeLocalValue } from "./constants";
import AdminDashboard from "./components/AdminDashboard";
import MentorDashboard from "./components/MentorDashboard";
import { clearStoredAuth, getAuthUserFromToken, isTokenValid } from "./utils/auth";
import { sanitizeEmail, sanitizeText, sanitizePhone } from "./utils/sanitize";
// ExcelJS se încarcă lazy doar când e nevoie (import/export)

export default function Mentori1La20() {
  const navigate = useNavigate();

  // ==================== STATE ====================
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentMentor, setCurrentMentor] = useState(null);
  const [currentRole, setCurrentRole] = useState(null);
  const [currentMentorId, setCurrentMentorId] = useState(null);
  const [leaduri, setLeaduri] = useState([]);
  const [mentoriData, setMentoriData] = useState([]);
  const [alocariActive, setAlocariActive] = useState([]);
  const [loading, setLoading] = useState(false);
  const [loadingData, setLoadingData] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showUploadForm, setShowUploadForm] = useState(false);
  const [uploadFile, setUploadFile] = useState(null);
  const [uploadMode, setUploadMode] = useState('excel');
  const [manualLead, setManualLead] = useState({ nume: '', telefon: '', email: '' });
  const [searchQuery, setSearchQuery] = useState('');
  const [sortBy, setSortBy] = useState('data-desc');
  const [currentPage, setCurrentPage] = useState(1);
  const leaduriPerPage = 10;
  const [selectedMentor, setSelectedMentor] = useState(null);
  const [editingLead, setEditingLead] = useState(null);
  const [editLeadData, setEditLeadData] = useState({ nume: '', telefon: '', email: '', status: '' });
  const [showDateModal, setShowDateModal] = useState(false);
  const [selectedMentorForDate, setSelectedMentorForDate] = useState(null);
  const [manualDate, setManualDate] = useState('');
  const [manualDate2, setManualDate2] = useState('');
  const [manualDate3, setManualDate3] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [modalConfig, setModalConfig] = useState({ type: 'alert', title: '', message: '', onConfirm: null });
  const [mentorSearchQuery, setMentorSearchQuery] = useState('');
  const [mentorSortBy, setMentorSortBy] = useState('data-desc');
  const [mentorCurrentPage, setMentorCurrentPage] = useState(1);
  const [showAdminEmailModal, setShowAdminEmailModal] = useState(false);
  const [selectedMentorForEmail, setSelectedMentorForEmail] = useState(null);
  const [bulkEmailPreview, setBulkEmailPreview] = useState(null);
  const [emailTemplate, setEmailTemplate] = useState(null);
  const [showEmailTemplateEditor, setShowEmailTemplateEditor] = useState(false);
  const [editingTemplate, setEditingTemplate] = useState({ subject: '', body: '' });
  const [vipEmailTemplate, setVipEmailTemplate] = useState(null);
  const [showVipEmailTemplateEditor, setShowVipEmailTemplateEditor] = useState(false);
  const [editingVipTemplate, setEditingVipTemplate] = useState({ subject: '', body: '' });
  const [showVipEmailModal, setShowVipEmailModal] = useState(false);
  const [vipEmailPreview, setVipEmailPreview] = useState(null);
  const [showManualAllocModal, setShowManualAllocModal] = useState(false);
  const [manualAllocMentor, setManualAllocMentor] = useState('');
  const [manualAllocCount, setManualAllocCount] = useState('');
  const [usersAccounts, setUsersAccounts] = useState([]);
  const [loadingUsersAccounts, setLoadingUsersAccounts] = useState(false);
  const isAutoAllocatingRef = useRef(false);
  const lastAutoAllocCheckRef = useRef(0);

  const COMPLETED_3_SESSIONS_HIDE_MS = 60 * 60 * 1000;
  const ACCOUNTS_REQUEST_TIMEOUT_MS = 12000;
  const DELETE_REQUEST_TIMEOUT_MS = 30000;
  const SCHEDULE_REQUEST_TIMEOUT_MS = 30000;
  const ALLOCATION_REQUEST_TIMEOUT_MS = 30000;
  const ATTENDANCE_REQUEST_TIMEOUT_MS = 30000;
  const EDIT_LEAD_REQUEST_TIMEOUT_MS = 30000;
  const TEMPLATE_REQUEST_TIMEOUT_MS = 30000;
  const ACCOUNTS_REQUEST_MAX_RETRIES = 1;
  const ACCOUNTS_CACHE_KEY = 'adminUsersAccountsCacheV1';
  const ACCOUNTS_CACHE_TTL_MS = 5 * 60 * 1000;

  const parseJsonResponse = async (response) => {
    const raw = await response.text();
    if (!raw) return {};
    try {
      return JSON.parse(raw);
    } catch {
      return { error: raw };
    }
  };

  const fetchWithTimeout = async (url, options = {}, timeoutMs = 10000) => {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), timeoutMs);
    try {
      return await fetch(url, { ...options, signal: controller.signal });
    } finally {
      clearTimeout(timeoutId);
    }
  };

  const readCachedUsersAccounts = useCallback(() => {
    try {
      const raw = localStorage.getItem(ACCOUNTS_CACHE_KEY);
      if (!raw) return [];
      const parsed = JSON.parse(raw);
      const ts = Number(parsed?.ts || 0);
      const users = Array.isArray(parsed?.users) ? parsed.users : [];
      if (!ts || Date.now() - ts > ACCOUNTS_CACHE_TTL_MS) return [];
      return users;
    } catch {
      return [];
    }
  }, [ACCOUNTS_CACHE_KEY, ACCOUNTS_CACHE_TTL_MS]);

  const writeCachedUsersAccounts = useCallback((users) => {
    try {
      localStorage.setItem(ACCOUNTS_CACHE_KEY, JSON.stringify({ ts: Date.now(), users }));
    } catch {
      // ignore storage quota/availability issues
    }
  }, [ACCOUNTS_CACHE_KEY]);

  const normalizeLeadEmail = (email) => sanitizeEmail(email || '');

  const extractExcelCellText = (value) => {
    if (value == null) return '';
    if (typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean') {
      return String(value);
    }
    if (value instanceof Date) {
      return value.toISOString();
    }
    if (Array.isArray(value?.richText)) {
      return value.richText.map((part) => part?.text || '').join('');
    }
    if (typeof value === 'object') {
      if (typeof value.text === 'string' && value.text.trim()) {
        return value.text;
      }
      if (typeof value.hyperlink === 'string' && value.hyperlink.trim()) {
        return value.hyperlink.replace(/^mailto:/i, '');
      }
      if (value.result != null) {
        return extractExcelCellText(value.result);
      }
    }

    return String(value);
  };

  const findLeadByEmail = async (email, excludeLeadId = null) => {
    const normalizedEmail = normalizeLeadEmail(email);
    if (!normalizedEmail) return null;

    let query = supabase
      .from('leaduri')
      .select('id, nume, email')
      .eq('email', normalizedEmail)
      .limit(5);

    if (excludeLeadId) {
      query = query.neq('id', excludeLeadId);
    }

    const { data, error: fetchErr } = await query;
    if (fetchErr) throw fetchErr;

    return Array.isArray(data) && data.length > 0 ? data[0] : null;
  };

  const ensureLeadEmailIsUnique = async (email, options = {}) => {
    const { excludeLeadId = null } = options;
    const existingLead = await findLeadByEmail(email, excludeLeadId);
    if (existingLead) {
      throw new Error(`Exista deja un lead cu email-ul ${normalizeLeadEmail(email)}.`);
    }
  };

  const ensureBatchLeadEmailsAreUnique = async (leadBatch) => {
    const normalizedEmails = [];
    const seenEmails = new Set();

    leadBatch.forEach((lead, index) => {
      const normalizedEmail = normalizeLeadEmail(lead.email);
      if (!normalizedEmail) {
        throw new Error('Linia ' + (index + 2) + ': email invalid sau lipsa');
      }
      if (seenEmails.has(normalizedEmail)) {
        throw new Error('Fisierul contine email duplicat: ' + normalizedEmail);
      }
      seenEmails.add(normalizedEmail);
      normalizedEmails.push(normalizedEmail);
    });

    if (normalizedEmails.length === 0) return;

    const { data, error: fetchErr } = await supabase
      .from('leaduri')
      .select('email')
      .in('email', normalizedEmails);

    if (fetchErr) throw fetchErr;

    if (Array.isArray(data) && data.length > 0) {
      const existingEmail = normalizeLeadEmail(data[0].email);
      throw new Error('Email deja existent in sistem: ' + existingEmail);
    }
  };

  // ==================== MODAL HELPERS ====================
  const showAlert = (title, message) => {
    setModalConfig({ type: 'alert', title, message, onConfirm: null });
    setShowModal(true);
  };

  const showErrorModal = (message) => {
    setModalConfig({ type: 'error', title: 'Eroare', message, onConfirm: null });
    setShowModal(true);
  };

  const showConfirmDialog = (title, message, onConfirm) => {
    setModalConfig({ type: 'confirm', title, message, onConfirm });
    setShowModal(true);
  };

  const closeModal = () => setShowModal(false);
  const handleModalConfirm = () => {
    if (modalConfig.onConfirm) modalConfig.onConfirm();
    closeModal();
  };
  const closeDateModal = () => {
    setShowDateModal(false);
    setSelectedMentorForDate(null);
    setManualDate('');
    setManualDate2('');
    setManualDate3('');
  };

  // ==================== FETCH FUNCTIONS ====================
  
  // Statusuri care înseamnă că programul este activ (mentorul nu poate primi leaduri noi)
  const ACTIVE_PROGRAM_STATUSES = [LEAD_STATUS.ALOCAT, LEAD_STATUS.CONFIRMAT, LEAD_STATUS.NECONFIRMAT, LEAD_STATUS.IN_PROGRAM];
  const FINALIZED_PROGRAM_STATUSES = [
    LEAD_STATUS.COMPLET,
    LEAD_STATUS.COMPLET_3_SESIUNI,
    LEAD_STATUS.COMPLET_2_SESIUNI,
    LEAD_STATUS.COMPLET_SESIUNE_FINALA,
    LEAD_STATUS.COMPLET_SESIUNE_1,
    LEAD_STATUS.NO_SHOW
  ];
  const isFinalizedProgramLead = (lead) => FINALIZED_PROGRAM_STATUSES.includes(lead?.status);

  const fetchMentori = async () => {
    try {
      const { data: mentoriList, error: mentoriErr } = await supabase.from("mentori").select("*");
      if (mentoriErr) throw mentoriErr;
      if (!mentoriList || mentoriList.length === 0) { await initializeMentori(); return; }
      
      const { data: toateLeadurile } = await supabase.from("leaduri").select("*");
      
      // Collect all updates needed, then batch
      const updates = [];
      for (const mentor of mentoriList) {
        const leaduriActive = (toateLeadurile || []).filter(l =>
          l.mentorAlocat === mentor.id && ACTIVE_PROGRAM_STATUSES.includes(l.status)
        );
        const leaduriRealeMentor = leaduriActive.length;
        const isManuallyDisabled = mentor.manuallyDisabled === true;
        const hasProgramActiv = (toateLeadurile || []).some(l =>
          l.mentorAlocat === mentor.id && (
            [LEAD_STATUS.CONFIRMAT, LEAD_STATUS.NECONFIRMAT, LEAD_STATUS.IN_PROGRAM].includes(l.status) ||
            (l.status === LEAD_STATUS.ALOCAT && l.emailTrimis === true)
          )
        );
        const shouldBeAvailable = !isManuallyDisabled && !hasProgramActiv && leaduriRealeMentor < 30;
        
        if (mentor.available !== shouldBeAvailable || (mentor.leaduriAlocate || 0) !== leaduriRealeMentor) {
          updates.push({ id: mentor.id, leaduriAlocate: leaduriRealeMentor, available: shouldBeAvailable });
        }
      }
      
      // Apply updates in parallel
      if (updates.length > 0) {
        await Promise.all(updates.map(u => 
          supabase.from("mentori").update({ leaduriAlocate: u.leaduriAlocate, available: u.available }).eq("id", u.id)
        ));
        const { data: updatedMentori } = await supabase.from("mentori").select("*");
        setMentoriData(updatedMentori || []);
      } else {
        setMentoriData(mentoriList);
      }
    } catch (err) { console.error("Eroare fetch mentori:", err); }
  };

  const initializeMentori = async () => {
    try {
      const mentoriInit = [];
      for (let i = 0; i < MENTORI_DISPONIBILI.length; i++) {
        const mentor = MENTORI_DISPONIBILI[i];
        const row = {
          id: mentor.id, nume: mentor.nume, available: true, ultimulOneToTwenty: null,
          ordineCoada: i, leaduriAlocate: 0, manuallyDisabled: false, createdAt: new Date().toISOString()
        };
        await supabase.from("mentori").upsert(row);
        mentoriInit.push(row);
      }
      setMentoriData(mentoriInit);
      setSuccess("Mentori initializati cu succes!");
    } catch (err) { setError("Eroare la initializarea mentorilor"); }
  };

  const fetchLeaduri = async () => {
    try {
      const { data: list, error: fetchErr } = await supabase
        .from("leaduri").select("*").order("createdAt", { ascending: false });
      if (fetchErr) throw fetchErr;
      
      // Batch-update all expired leads in one query
      const expiredIds = (list || []).filter(lead => checkLeadTimeout(lead)).map(l => l.id);
      if (expiredIds.length > 0) {
        await supabase.from("leaduri").update({
          status: LEAD_STATUS.NECONFIRMAT, motivNeconfirmare: 'Timeout 6h', dataExpirare: new Date().toISOString()
        }).in("id", expiredIds);
        const { data: list2 } = await supabase
          .from("leaduri").select("*").order("createdAt", { ascending: false });
        setLeaduri(list2 || []);
      } else { setLeaduri(list || []); }
    } catch (err) { setError("Eroare la incarcarea leadurilor"); }
  };

  const fetchAlocari = async () => {
    try {
      const { data: alocariList, error: alocErr } = await supabase.from("alocari").select("*");
      if (alocErr) throw alocErr;
      
      const { data: toateLeadurile } = await supabase.from("leaduri").select("*");
      
      const toDelete = [];
      const toUpdate = [];
      
      for (const alocare of (alocariList || [])) {
        const leaduriReale = (toateLeadurile || []).filter(l => 
          alocare.leaduri && alocare.leaduri.includes(l.id) && !isFinalizedProgramLead(l)
        );
        const numarRealDeLeaduri = leaduriReale.length;
        
        if (numarRealDeLeaduri === 0) {
          toDelete.push(alocare.id);
        } else if (alocare.numarLeaduri !== numarRealDeLeaduri || alocare.leaduri.length !== numarRealDeLeaduri) {
          toUpdate.push({
            id: alocare.id,
            numarLeaduri: numarRealDeLeaduri,
            leaduri: leaduriReale.map(l => l.id),
            ultimaActualizare: new Date().toISOString()
          });
        }
      }
      
      // Batch deletes and updates
      const ops = [];
      if (toDelete.length > 0) ops.push(supabase.from("alocari").delete().in("id", toDelete));
      for (const u of toUpdate) {
        ops.push(supabase.from("alocari").update({ numarLeaduri: u.numarLeaduri, leaduri: u.leaduri, ultimaActualizare: u.ultimaActualizare }).eq("id", u.id));
      }
      if (ops.length > 0) await Promise.all(ops);
      
      const { data: alocariUpdated } = await supabase.from("alocari").select("*");
      setAlocariActive(alocariUpdated || []);
    } catch (err) { console.error("Eroare fetch alocari:", err); }
  };

  const fetchEmailTemplate = async () => {
    try {
      const result = await manageEmailTemplateAsAdmin({ method: 'GET', templateId: 'emailTemplate' });
      setEmailTemplate(result.template || null);
    } catch (err) { 
      console.error("Eroare fetch email template:", err);
    }
  };

  const fetchVipEmailTemplate = async () => {
    try {
      const result = await manageEmailTemplateAsAdmin({ method: 'GET', templateId: 'vipEmailTemplate' });
      setVipEmailTemplate(result.template || null);
    } catch (err) {
      console.error("Eroare fetch VIP email template:", err);
    }
  };

  const fetchAllData = useCallback(async () => {
    setLoadingData(true);
    await Promise.all([fetchMentori(), fetchLeaduri(), fetchAlocari(), fetchEmailTemplate(), fetchVipEmailTemplate()]);
    setLoadingData(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [readCachedUsersAccounts, writeCachedUsersAccounts]);

  const fetchUsersAccounts = useCallback(async (options = {}) => {
    const { preferCache = false, background = false, silentNoToken = false } = options;
    const token = localStorage.getItem('authToken');
    if (!token || !isTokenValid(token)) {
      setUsersAccounts([]);
      if (!silentNoToken) {
        setError('Sesiune expirată. Reautentifică-te pentru a încărca conturile.');
      }
      return;
    }

    let servedFromCache = false;
    if (preferCache) {
      const cachedUsers = readCachedUsersAccounts();
      if (cachedUsers.length > 0) {
        setUsersAccounts(cachedUsers);
        servedFromCache = true;
      }
    }

    if (!background) {
      setLoadingUsersAccounts(true);
    }
    setError('');
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const endpoint = `${supabaseUrl}/functions/v1/manage-users`;
      let lastError = null;

      for (let attempt = 0; attempt <= ACCOUNTS_REQUEST_MAX_RETRIES; attempt += 1) {
        try {
          const response = await fetchWithTimeout(endpoint, {
            method: 'GET',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${token}`,
            },
          }, ACCOUNTS_REQUEST_TIMEOUT_MS);

          const result = await parseJsonResponse(response);
          if (!response.ok) throw new Error(result.error || 'Nu s-au putut încărca conturile');

          const users = Array.isArray(result.users) ? result.users : [];
          setUsersAccounts(users);
          writeCachedUsersAccounts(users);
          return;
        } catch (err) {
          const message = err?.name === 'AbortError'
            ? 'Cererea de încărcare a conturilor a depășit timpul limită.'
            : (err?.message || 'Eroare necunoscută la încărcare');
          lastError = new Error(message);

          if (attempt < ACCOUNTS_REQUEST_MAX_RETRIES) {
            await new Promise(resolve => setTimeout(resolve, 500));
          }
        }
      }

      throw lastError || new Error('Nu s-au putut încărca conturile');
    } catch (err) {
      console.error('Eroare la încărcarea conturilor:', err);
      if (!servedFromCache) {
        setError(err?.message || 'Eroare la încărcarea conturilor utilizatorilor');
      }
    } finally {
      if (!background) {
        setLoadingUsersAccounts(false);
      }
    }
  }, [readCachedUsersAccounts, writeCachedUsersAccounts]);

  const updateUserCredentials = async ({ targetUsername, oldPassword, newPassword, newUsername }) => {
    const token = localStorage.getItem('authToken');
    if (!token || !isTokenValid(token)) {
      setError('Sesiune invalidă. Reautentifică-te.');
      return false;
    }

    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetchWithTimeout(`${supabaseUrl}/functions/v1/manage-users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ targetUsername, oldPassword, newPassword, newUsername }),
      }, ACCOUNTS_REQUEST_TIMEOUT_MS);

      const result = await parseJsonResponse(response);
      if (!response.ok) throw new Error(result.error || 'Actualizarea contului a eșuat');

      await fetchUsersAccounts();
      setSuccess(`Credențialele pentru "${result.user?.username || targetUsername}" au fost actualizate cu succes!`);
      return true;
    } catch (err) {
      setError('Eroare la actualizarea contului: ' + (err.message || ''));
      return false;
    } finally {
      setLoading(false);
    }
  };

  const resetUserPasswordByAdmin = async ({ username, newPassword }) => {
    const token = localStorage.getItem('authToken');
    if (!token || !isTokenValid(token)) {
      setError('Sesiune invalidă. Reautentifică-te.');
      return false;
    }

    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetchWithTimeout(`${supabaseUrl}/functions/v1/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
        },
        body: JSON.stringify({ username, newPassword }),
      }, ACCOUNTS_REQUEST_TIMEOUT_MS);

      const result = await parseJsonResponse(response);
      if (!response.ok) throw new Error(result.error || 'Resetarea parolei a eșuat');

      setSuccess(`Parola pentru "${username}" a fost resetată cu succes!`);
      return true;
    } catch (err) {
      setError('Eroare la resetarea parolei: ' + (err.message || ''));
      return false;
    } finally {
      setLoading(false);
    }
  };

  const deleteLeadsAsAdmin = async (payload) => {
    const token = localStorage.getItem('authToken');
    if (!token || !isTokenValid(token)) {
      throw new Error('Sesiune invalidă. Reautentifică-te.');
    }

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const response = await fetchWithTimeout(`${supabaseUrl}/functions/v1/delete-leads`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify(payload),
    }, DELETE_REQUEST_TIMEOUT_MS);

    const result = await parseJsonResponse(response);
    if (!response.ok) {
      const errorParts = [result.error, result.details, `HTTP ${response.status}`].filter(Boolean);
      throw new Error(errorParts.join(': ') || 'Operațiunea de ștergere a eșuat');
    }

    return result;
  };

  const updateMentorSchedule = async ({ mentorId, webinar1Date, webinar2Date, webinar3Date, resetAll = false }) => {
    const token = localStorage.getItem('authToken');
    if (!token || !isTokenValid(token)) {
      throw new Error('Sesiune invalidă. Reautentifică-te.');
    }

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const response = await fetchWithTimeout(`${supabaseUrl}/functions/v1/update-mentor-schedule`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ mentorId, webinar1Date, webinar2Date, webinar3Date, resetAll }),
    }, SCHEDULE_REQUEST_TIMEOUT_MS);

    const result = await parseJsonResponse(response);
    if (!response.ok) {
      const errorParts = [result.error, result.details, `HTTP ${response.status}`].filter(Boolean);
      throw new Error(errorParts.join(': ') || 'Actualizarea programului webinar a eșuat');
    }

    return result;
  };

  const updateLeadAttendance = async ({ action, leadId, session, value }) => {
    const token = localStorage.getItem('authToken');
    if (!token || !isTokenValid(token)) {
      throw new Error('Sesiune invalidă. Reautentifică-te.');
    }

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const response = await fetchWithTimeout(`${supabaseUrl}/functions/v1/update-lead-attendance`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ action, leadId, session, value }),
    }, ATTENDANCE_REQUEST_TIMEOUT_MS);

    const result = await parseJsonResponse(response);
    if (!response.ok) {
      const errorParts = [result.error, result.details, `HTTP ${response.status}`].filter(Boolean);
      throw new Error(errorParts.join(': ') || 'Actualizarea prezenței a eșuat');
    }

    return result;
  };

  const updateLeadAsAdmin = async ({ leadId, nume, telefon, email, status = null }) => {
    const token = localStorage.getItem('authToken');
    if (!token || !isTokenValid(token)) {
      throw new Error('Sesiune invalidă. Reautentifică-te.');
    }

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const response = await fetchWithTimeout(`${supabaseUrl}/functions/v1/update-lead`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ leadId, nume, telefon, email, status }),
    }, EDIT_LEAD_REQUEST_TIMEOUT_MS);

    const result = await parseJsonResponse(response);
    if (!response.ok) {
      const errorParts = [result.error, result.details, `HTTP ${response.status}`].filter(Boolean);
      throw new Error(errorParts.join(': ') || 'Actualizarea leadului a eșuat');
    }

    return result;
  };

  const manageEmailTemplateAsAdmin = async ({ method = 'GET', templateId, subject = null, body = null }) => {
    const token = localStorage.getItem('authToken');
    if (!token || !isTokenValid(token)) {
      throw new Error('Sesiune invalidă. Reautentifică-te.');
    }

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const isGet = method === 'GET';
    const endpoint = isGet
      ? `${supabaseUrl}/functions/v1/manage-email-templates?templateId=${encodeURIComponent(templateId)}`
      : `${supabaseUrl}/functions/v1/manage-email-templates`;

    const response = await fetchWithTimeout(endpoint, {
      method,
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      ...(isGet ? {} : { body: JSON.stringify({ templateId, subject, body }) }),
    }, TEMPLATE_REQUEST_TIMEOUT_MS);

    const result = await parseJsonResponse(response);
    if (!response.ok) {
      const errorParts = [result.error, result.details, `HTTP ${response.status}`].filter(Boolean);
      throw new Error(errorParts.join(': ') || 'Operațiunea pentru template a eșuat');
    }

    return result;
  };

  const manageLeadAssignmentsAsAdmin = async ({ action, mentorId = null, requestedCount = null, leadId = null, isCurrentlyDisabled = null }) => {
    const token = localStorage.getItem('authToken');
    if (!token || !isTokenValid(token)) {
      throw new Error('Sesiune invalidă. Reautentifică-te.');
    }

    const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
    const response = await fetchWithTimeout(`${supabaseUrl}/functions/v1/allocate-leads`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`,
      },
      body: JSON.stringify({ action, mentorId, requestedCount, leadId, isCurrentlyDisabled }),
    }, ALLOCATION_REQUEST_TIMEOUT_MS);

    const result = await parseJsonResponse(response);
    if (!response.ok) {
      const errorParts = [result.error, result.details, `HTTP ${response.status}`].filter(Boolean);
      throw new Error(errorParts.join(': ') || 'Alocarea leadurilor a eșuat');
    }

    return result;
  };

  // ==================== AUTO-ALLOCATE ====================
  const checkAndAutoAllocate = useCallback(async () => {
    let modificari = false;

    // Verifică dacă un mentor are program activ (leaduri confirmate/neconfirmate/in_program sau emailuri trimise)
    const mentorAreProgramActiv = (mentorId) => {
      return leaduri.some(l =>
        l.mentorAlocat === mentorId && (
          [LEAD_STATUS.CONFIRMAT, LEAD_STATUS.NECONFIRMAT, LEAD_STATUS.IN_PROGRAM].includes(l.status) ||
          (l.status === LEAD_STATUS.ALOCAT && l.emailTrimis === true)
        )
      );
    };

    try {
      // PRIORITATE 1: Realocă IMEDIAT leadurile neconfirmate
      const leaduriNeconfirmate = leaduri.filter(l => l.status === LEAD_STATUS.NECONFIRMAT);

      if (leaduriNeconfirmate.length > 0) {
        console.log(`🔄 Găsite ${leaduriNeconfirmate.length} leaduri neconfirmate - se realocă automat...`);
        modificari = true;

        const localLeadCounts = {};
        mentoriData.forEach(m => { localLeadCounts[m.id] = m.leaduriAlocate || 0; });

        for (const lead of leaduriNeconfirmate) {
          const mentoriSortati = [...mentoriData].sort((a, b) => a.ordineCoada - b.ordineCoada);
          const mentorActual = lead.mentorAlocat;

          const MAX_REALOCARI = 5;
          if ((lead.numarReAlocari || 0) >= MAX_REALOCARI) {
            console.warn(`⚠️ Lead "${lead.nume}" a atins limita de ${MAX_REALOCARI} re-alocări — skip`);
            continue;
          }

          const mentorNou = mentoriSortati.find(m => {
            const leadCnt = localLeadCounts[m.id] || 0;
            if (mentorAreProgramActiv(m.id)) return false;
            return m.id !== mentorActual && leadCnt < 30 && m.available && !m.manuallyDisabled;
          });

          if (!mentorNou) {
            console.warn(`⚠️ Nu există mentor disponibil pentru "${lead.nume}"`);
            continue;
          }

          const mentorInfo = MENTORI_DISPONIBILI.find(m => m.id === mentorNou.id);
          const mentorNume = mentorInfo ? mentorInfo.nume : mentorNou.id;

          if (lead.alocareId) {
            const alocareVeche = alocariActive.find(a => a.id === lead.alocareId);
            if (alocareVeche) {
              const leaduriRamase = (alocareVeche.leaduri || []).filter(id => id !== lead.id);
              if (leaduriRamase.length === 0) {
                await supabase.from("alocari").delete().eq("id", lead.alocareId);
              } else {
                await supabase.from("alocari").update({
                  numarLeaduri: leaduriRamase.length,
                  leaduri: leaduriRamase,
                  ultimaActualizare: new Date().toISOString()
                }).eq("id", lead.alocareId);
              }
            }
          }

          const da = new Date().toISOString();
          await supabase.from("leaduri").update({
            status: LEAD_STATUS.ALOCAT,
            mentorAlocat: mentorNou.id,
            dataAlocare: da,
            dataTimeout: null,
            dataConfirmare: null,
            numarReAlocari: (lead.numarReAlocari || 0) + 1,
            istoricMentori: [...(lead.istoricMentori || []), mentorNou.id],
            emailTrimis: false,
          }).eq("id", lead.id);

          if (mentorActual) {
            localLeadCounts[mentorActual] = Math.max(0, (localLeadCounts[mentorActual] || 1) - 1);
          }
          localLeadCounts[mentorNou.id] = (localLeadCounts[mentorNou.id] || 0) + 1;

          await supabase.from("mentori").update({
            leaduriAlocate: localLeadCounts[mentorNou.id]
          }).eq("id", mentorNou.id);

          console.log(`✅ Re-alocare automată: Lead "${lead.nume}" de la ${mentorActual} -> ${mentorNume} (${localLeadCounts[mentorNou.id]}/30)`);
        }
        
        // Actualizează și contoarele mentorilor vechi în DB
        for (const m of mentoriData) {
          const dbCount = m.leaduriAlocate || 0;
          const localCount = localLeadCounts[m.id] || 0;
          if (localCount !== dbCount) {
            await supabase.from("mentori").update({
              leaduriAlocate: localCount
            }).eq("id", m.id);
          }
        }
      }
      
      // PRIORITATE 2: Alocă leadurile nealocate DOAR dacă sunt minim 20
      const leaduriNealocateList = leaduri.filter(l => l.status === LEAD_STATUS.NEALOCAT);
      
      if (leaduriNealocateList.length >= 20) {
        const mentoriSortati = [...mentoriData].sort((a, b) => a.ordineCoada - b.ordineCoada);
        const mentorEligibil = mentoriSortati.find(m => {
          const leadCnt = m.leaduriAlocate || 0;
          // Sare mentorii care sunt în program activ
          if (mentorAreProgramActiv(m.id)) return false;
          return leadCnt < 30 && m.available && !m.manuallyDisabled;
        });
        
        if (mentorEligibil) {
          console.log(`🔄 Găsite ${leaduriNealocateList.length} leaduri nealocate - se alocă automat...`);
          modificari = true;
          
          const leadCntActual = mentorEligibil.leaduriAlocate || 0;
          const spatDisponibil = 30 - leadCntActual;
          
          // Orice mentor cu loc disponibil primeste leaduri pana la 30
          // Exceptie: mentor cu 0 leaduri necesita minim 20 disponibile
          if (leadCntActual === 0 && leaduriNealocateList.length < 20) {
            return modificari; // Nu destule leaduri pentru a initializa un mentor nou
          }
          const nrDeAlocat = Math.min(spatDisponibil, leaduriNealocateList.length);
          
          const batch = leaduriNealocateList.slice(0, nrDeAlocat);
          const mentorInfo = MENTORI_DISPONIBILI.find(m => m.id === mentorEligibil.id);
          const mentorNume = mentorInfo ? mentorInfo.nume : mentorEligibil.id;
          
          const alocareExistenta = alocariActive.find(a => a.mentorId === mentorEligibil.id && a.status === 'activa');
          let alocRef;
          
          if (alocareExistenta) {
            const leaduriActualizate = [...alocareExistenta.leaduri, ...batch.map(l => l.id)];
            await supabase.from("alocari").update({
              numarLeaduri: leaduriActualizate.length,
              leaduri: leaduriActualizate,
              ultimaActualizare: new Date().toISOString()
            }).eq("id", alocareExistenta.id);
            alocRef = { id: alocareExistenta.id };
          } else {
            const { data: newAloc } = await supabase.from("alocari").insert({
              mentorId: mentorEligibil.id, 
              mentorNume: mentorNume, 
              numarLeaduri: nrDeAlocat,
              leaduri: batch.map(l => l.id), 
              createdAt: new Date().toISOString(), 
              status: 'activa'
            }).select("id").single();
            alocRef = newAloc;
          }
          
          const da = new Date().toISOString();
          
          for (const lead of batch) {
            await supabase.from("leaduri").update({
              status: LEAD_STATUS.ALOCAT, 
              mentorAlocat: mentorEligibil.id, 
              alocareId: alocRef.id,
              dataAlocare: da, 
              dataTimeout: null,
              emailTrimis: false,
              istoricMentori: [...(lead.istoricMentori || []), mentorEligibil.id],
              numarReAlocari: 0
            }).eq("id", lead.id);
          }
          
          const nuLeaduriTotale = leadCntActual + nrDeAlocat;
          await supabase.from("mentori").update({
            leaduriAlocate: nuLeaduriTotale,
            available: nuLeaduriTotale >= 30 ? false : mentorEligibil.available
          }).eq("id", mentorEligibil.id);
          
          console.log(`✅ Auto-alocare: ${nrDeAlocat} leaduri nealocate către ${mentorNume}. Total: ${nuLeaduriTotale}/30`);
        }
      }
      
      return modificari;
    } catch (err) {
      console.error("❌ Eroare la alocarea automată:", err);
      return modificari;
    }
  }, [leaduri, mentoriData, alocariActive]);

  // ==================== EFFECTS ====================
  useEffect(() => { setCurrentPage(1); }, [searchQuery]);
  useEffect(() => { setMentorCurrentPage(1); }, [mentorSearchQuery]);

  useEffect(() => {
    const token = localStorage.getItem('authToken');
    const validToken = isTokenValid(token);

    if (validToken) {
      const tokenUser = getAuthUserFromToken(token);
      setIsAuthenticated(true);
      setCurrentMentor(tokenUser?.username || localStorage.getItem('currentUser') || '');
      setCurrentRole(tokenUser?.role || localStorage.getItem('currentRole') || '');
      setCurrentMentorId(tokenUser?.mentorId || localStorage.getItem('currentMentorId') || null);
      return;
    }

    clearStoredAuth();
    navigate('/login');
  }, [navigate]);

  useEffect(() => {
    if (isAuthenticated) { fetchAllData(); }
  }, [isAuthenticated, fetchAllData]);

  useEffect(() => {
    if (isAuthenticated && currentRole === 'admin') {
      fetchUsersAccounts({ preferCache: true, background: true, silentNoToken: true });
    }
  }, [isAuthenticated, currentRole, fetchUsersAccounts]);

  useEffect(() => {
    if (!error) return;
    showErrorModal(error);
    setError('');
  }, [error]);

  // AUTO-ALLOCATION DISABLED — was causing race conditions and unwanted re-allocations.
  // The admin can still use the "Aloca Automat (FIFO)" button for manual FIFO allocation.
  // useEffect(() => {
  //   const now = Date.now();
  //   const timeSinceLastCheck = now - lastAutoAllocCheckRef.current;
  //   if (isAuthenticated && leaduri.length > 0 && mentoriData.length > 0 && !loadingData && !isAutoAllocatingRef.current && timeSinceLastCheck > 10000) {
  //     const verificaAutoAlocare = async () => {
  //       isAutoAllocatingRef.current = true;
  //       lastAutoAllocCheckRef.current = Date.now();
  //       const modificari = await checkAndAutoAllocate();
  //       if (modificari) {
  //         setTimeout(async () => { await fetchAllData(); isAutoAllocatingRef.current = false; }, 1000);
  //       } else { isAutoAllocatingRef.current = false; }
  //     };
  //     verificaAutoAlocare();
  //   }
  // }, [leaduri, mentoriData, isAuthenticated, loadingData, checkAndAutoAllocate, fetchAllData]);

  // ==================== HANDLERS ====================

  const handleLogout = () => {
    setIsAuthenticated(false); 
    setCurrentMentor(null); 
    setCurrentRole(null);
    setCurrentMentorId(null);
    setUsersAccounts([]);
    localStorage.removeItem(ACCOUNTS_CACHE_KEY);
    clearStoredAuth();
    navigate('/login');
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      const valid = ['application/vnd.ms-excel','application/vnd.openxmlformats-officedocument.spreadsheetml.sheet','text/csv'];
      if (!valid.includes(file.type)) { setError("Te rog incarca un fisier Excel (.xlsx, .xls) sau CSV"); return; }
      setUploadFile(file); setError("");
    }
  };

  const parseExcelFile = async (file) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = async (e) => {
        try {
          const ExcelJS = (await import('exceljs')).default;
          const buffer = e.target.result;
          const workbook = new ExcelJS.Workbook();
          await workbook.xlsx.load(buffer);
          const worksheet = workbook.worksheets[0];
          const headers = [];
          worksheet.getRow(1).eachCell((cell) => { headers.push(extractExcelCellText(cell.value)); });
          const jsonData = [];
          worksheet.eachRow((row, rowNumber) => {
            if (rowNumber === 1) return;
            const rowObj = {};
            row.eachCell((cell, colNumber) => { rowObj[headers[colNumber - 1]] = extractExcelCellText(cell.value); });
            jsonData.push(rowObj);
          });
          const leaduriValide = jsonData.map((row, index) => {
            const nume = row['Nume'] || row['nume'] || row['Name'] || row['name'] || '';
            const telefon = row['Telefon'] || row['telefon'] || row['Phone'] || row['phone'] || '';
            const email = row['Email'] || row['email'] || '';
            if (!nume || !telefon || !email) throw new Error('Linia ' + (index + 2) + ': Nume, telefon si email sunt obligatorii');
            return { nume: extractExcelCellText(nume).trim(), telefon: extractExcelCellText(telefon).trim(), email: normalizeLeadEmail(extractExcelCellText(email)),
              status: LEAD_STATUS.NEALOCAT, mentorAlocat: null, dataAlocare: null, dataConfirmare: null,
              dataTimeout: null, statusOneToTwenty: ONE_TO_TWENTY_STATUS.PENDING, dataOneToTwenty: null,
              numarReAlocari: 0, istoricMentori: [], createdAt: new Date().toISOString() };
          });
          resolve(leaduriValide);
        } catch (err) { reject(err); }
      };
      reader.onerror = () => reject(new Error("Eroare la citirea fisierului"));
      reader.readAsArrayBuffer(file);
    });
  };

  const handleUploadLeaduri = async () => {
    if (!uploadFile) { setError("Te rog selecteaza un fisier"); return; }
    setLoading(true); setError(""); setSuccess("");
    try {
      const leaduriNoi = await parseExcelFile(uploadFile);
      await ensureBatchLeadEmailsAreUnique(leaduriNoi);
      for (const lead of leaduriNoi) {
        const { error: insErr } = await supabase.from("leaduri").insert(lead);
        if (insErr) throw insErr;
      }
      setSuccess(leaduriNoi.length + " leaduri incarcate cu succes!");
      setUploadFile(null); setShowUploadForm(false); await fetchLeaduri();
    } catch (err) { setError(err.message || "Eroare la incarcarea leadurilor"); }
    finally { setLoading(false); }
  };

  const handleAddManualLead = async (e) => {
    e.preventDefault();
    if (!manualLead.nume || !manualLead.telefon || !manualLead.email) { setError("Numele, telefonul si email-ul sunt obligatorii"); return; }
    setLoading(true); setError(""); setSuccess("");
    try {
      const normalizedEmail = normalizeLeadEmail(manualLead.email);
      await ensureLeadEmailIsUnique(normalizedEmail);

      const { error: insErr } = await supabase.from("leaduri").insert({
        nume: sanitizeText(manualLead.nume), telefon: sanitizePhone(manualLead.telefon), email: normalizedEmail,
        status: LEAD_STATUS.NEALOCAT, mentorAlocat: null, dataAlocare: null, dataConfirmare: null,
        dataTimeout: null, statusOneToTwenty: ONE_TO_TWENTY_STATUS.PENDING, dataOneToTwenty: null,
        numarReAlocari: 0, istoricMentori: [], createdAt: new Date().toISOString()
      });
      if (insErr) throw insErr;
      setSuccess('Lead "' + manualLead.nume + '" adaugat cu succes!');
      setManualLead({ nume: '', telefon: '', email: '' }); await fetchLeaduri();
    } catch (err) { setError("Eroare la adaugarea leadului"); }
    finally { setLoading(false); }
  };

  const alocaLeaduriAutomata = async () => {
    setLoading(true); setError(""); setSuccess("");
    try {
      const result = await manageLeadAssignmentsAsAdmin({ action: 'auto' });
      await fetchAllData();
      setSuccess(result.message || 'Leadurile au fost alocate cu succes!');
    } catch (err) { 
      console.error("Eroare la alocarea automata:", err);
      setError("Eroare la alocarea automata: " + (err.message || "")); 
    }
    finally { setLoading(false); }
  };

  const alocaLeaduriManual = async () => {
    setLoading(true); setError(""); setSuccess("");
    try {
      if (!manualAllocMentor) {
        setError('Selecteaza un mentor');
        setLoading(false);
        return;
      }

      const nealoc = leaduri.filter(l => l.status === LEAD_STATUS.NEALOCAT);
      if (nealoc.length === 0) {
        setError('Nu exista leaduri nealocate');
        setLoading(false);
        return;
      }

      const mentorEligibil = mentoriData.find(m => m.id === manualAllocMentor);
      if (!mentorEligibil) {
        setError('Mentor invalid');
        setLoading(false);
        return;
      }

      if (!mentorEligibil.available) {
        setError('Mentorul este în program activ și nu poate primi leaduri noi. Aşteață finalizarea programului curent.');
        setLoading(false);
        return;
      }

      const leadCntActual = mentorEligibil.leaduriAlocate || 0;
      const spatDisponibil = 30 - leadCntActual;

      if (spatDisponibil <= 0) {
        setError('Mentorul selectat are deja 30 de leaduri (maxim)');
        setLoading(false);
        return;
      }

      const requestedCount = manualAllocCount && parseInt(manualAllocCount, 10) > 0
        ? parseInt(manualAllocCount, 10)
        : null;

      const result = await manageLeadAssignmentsAsAdmin({
        action: 'manual',
        mentorId: mentorEligibil.id,
        requestedCount,
      });

      await fetchAllData();
      setSuccess(result.message || 'Leadurile au fost alocate manual cu succes!');
      setShowManualAllocModal(false);
      setManualAllocMentor('');
      setManualAllocCount('');
    } catch (err) {
      console.error("Eroare la alocarea manuala:", err);
      setError("Eroare la alocarea manuala: " + (err.message || ""));
    }
    finally { setLoading(false); }
  };

  const toggleMentorAvailability = async (mentorId, isCurrentlyDisabled) => {
    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const result = await manageLeadAssignmentsAsAdmin({
        action: 'toggle_mentor',
        mentorId,
        isCurrentlyDisabled,
      });

      await fetchAllData();
      setSuccess(result.message || (isCurrentlyDisabled ? 'Mentor activat!' : 'Mentor dezactivat!'));
    } catch (err) { 
      console.error("Eroare la actualizarea statusului:", err);
      setError(`Eroare la actualizarea statusului: ${err.message}`); 
    } finally {
      setLoading(false);
    }
  };

  const updateOneToTwenty = async (mentorId, customDate, customDate2, customDate3, options = {}) => {
    const { resetAll = false } = options;

    if (!mentorId) {
      setError('Mentor invalid pentru actualizarea sesiunilor.');
      return false;
    }

    if (!resetAll && !customDate) {
      setError('Sesiunea 1 este obligatorie. Pentru a sterge toate sesiunile, foloseste resetarea.');
      return false;
    }

    const webinar1Date = resetAll ? null : dateTimeLocalToUtcIso(customDate);
    const webinar2Date = resetAll ? null : dateTimeLocalToUtcIso(customDate2);
    const webinar3Date = resetAll ? null : dateTimeLocalToUtcIso(customDate3);

    if (!resetAll && !webinar1Date) {
      setError('Data sesiunii 1 nu este valida.');
      return false;
    }

    if (!resetAll && customDate2 && !webinar2Date) {
      setError('Data sesiunii 2 nu este valida.');
      return false;
    }

    if (!resetAll && customDate3 && !webinar3Date) {
      setError('Data sesiunii 3 nu este valida.');
      return false;
    }

    setLoading(true);
    setError('');
    setSuccess('');
    try {
      const result = await updateMentorSchedule({
        mentorId,
        webinar1Date,
        webinar2Date,
        webinar3Date,
        resetAll,
      });

      const mentorActualizat = result.mentor;
      if (!mentorActualizat?.id) {
        throw new Error('Mentorul nu a putut fi actualizat.');
      }

      setMentoriData(prev => {
        const mentorExista = prev.some(mentor => mentor.id === mentorActualizat.id);
        const urmatoriiMentori = prev.map(mentor => (
          mentor.id === mentorActualizat.id
            ? { ...mentor, ...mentorActualizat }
            : mentor
        ));

        return mentorExista ? urmatoriiMentori : [...urmatoriiMentori, mentorActualizat];
      });

  await fetchMentori();
  setSuccess(result.message || (resetAll ? 'Programul webinar 1:20 a fost resetat.' : 'Datele webinarului actualizate!'));
      closeDateModal();
      return true;
    } catch (err) {
      console.error('Eroare la actualizarea sesiunilor 1:20:', err);
      setError(err?.message || 'Eroare la actualizarea datei 1:20');
      return false;
    } finally {
      setLoading(false);
    }
  };

  const openDateModal = (mentorId) => {
    setSelectedMentorForDate(mentorId);
    const mentor = mentoriData.find(m => m.id === mentorId);
    setManualDate(toDateTimeLocalValue(mentor?.ultimulOneToTwenty));
    setManualDate2(toDateTimeLocalValue(mentor?.webinar2Date));
    setManualDate3(toDateTimeLocalValue(mentor?.webinar3Date));
    setShowDateModal(true);
  };

  const generateEmailContent = (lead, mentorId = null) => {
    const mentor = mentoriData.find(m => m.id === (mentorId || currentMentorId));
    const webinarDate = mentor?.ultimulOneToTwenty;
    const mentorInfo = MENTORI_DISPONIBILI.find(m => m.id === (mentorId || currentMentorId));
    const mentorName = mentorInfo ? mentorInfo.nume : currentMentor;
    
    if (!webinarDate) {
      setError('Te rog seteaza mai intai data webinarului!');
      return null;
    }

    if (!emailTemplate) {
      setError('Template-ul de email nu este încărcat!');
      return null;
    }

    const confirmationLink = `${window.location.origin}/confirm/${lead.confirmationToken || lead.id}`;

    // Înlocuim placeholder-urile cu datele reale
    const replacements = {
      '{{nume}}': lead.nume,
      '{{mentorName}}': mentorName,
      '{{webinarDate}}': formatDate(webinarDate),
      '{{confirmationLink}}': confirmationLink,
      '{{telefon}}': lead.telefon,
      '{{email}}': lead.email
    };

    let subject = emailTemplate.subject;
    let body = emailTemplate.body;

    // Înlocuim toate placeholder-urile
    Object.keys(replacements).forEach(placeholder => {
      const value = replacements[placeholder];
      const escaped = placeholder.replace(/[{}]/g, '\\$&');
      subject = subject.replace(new RegExp(escaped, 'g'), value);
      body = body.replace(new RegExp(escaped, 'g'), value);
    });

    return { subject, body };
  };

  const openAdminEmailModal = (mentorId) => {
    const mentor = mentoriData.find(m => m.id === mentorId);
    if (!mentor) return;
    
    if (!mentor.ultimulOneToTwenty) {
      setError('Mentorul trebuie sa seteze mai intai data webinarului!');
      return;
    }
    
    // Check if mentor has at least 1 lead assigned (send button in modal is disabled if none ALOCAT)
    const totalLeaduri = leaduri.filter(l => l.mentorAlocat === mentorId).length;
    
    if (totalLeaduri === 0) {
      setError('Mentorul nu are niciun lead alocat!');
      return;
    }
    
    setSelectedMentorForEmail(mentor);
    setBulkEmailPreview(null);
    setShowAdminEmailModal(true);
  };

  const showBulkEmailPreview = (lead) => {
    if (!selectedMentorForEmail) return;
    const content = generateEmailContent(lead, selectedMentorForEmail.id);
    if (content) {
      setBulkEmailPreview({ lead, content });
    }
  };

  const sendBulkEmail = async () => {
    if (!selectedMentorForEmail) return;
    
    setLoading(true);
    try {
      // Only send emails to ALOCAT leads (not CONFIRMAT, as they already confirmed)
      const mentorLeads = leaduri.filter(l => 
        l.mentorAlocat === selectedMentorForEmail.id && 
        l.status === LEAD_STATUS.ALOCAT
      );
      
      if (mentorLeads.length === 0) {
        setError('Nu exista leaduri active pentru acest mentor!');
        setLoading(false);
        return;
      }
      
      console.log(`Trimitere ${mentorLeads.length} emailuri pentru mentorul ${selectedMentorForEmail.nume}`);
      
      // Call Supabase Edge Function to send bulk emails via Resend
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(
        `${supabaseUrl}/functions/v1/send-bulk-emails`,
        {
          method: 'POST',
          headers: { 
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('authToken') || ''}`
          },
          body: JSON.stringify({
            mentorId: selectedMentorForEmail.id
          })
        }
      );
      
      const result = await response.json();
      
      console.log('Bulk email response status:', response.status);
      console.log('Bulk email response result:', result);
      
      if (!response.ok) {
        console.error('Bulk email error details:', result);
        throw new Error(result.error || result.details || result.message || 'Eroare la trimiterea emailurilor');
      }
      
      await fetchLeaduri();
      
      const msg = result.results
        ? `${result.results.sent} emailuri trimise cu succes${result.results.failed > 0 ? `, ${result.results.failed} eșuate` : ''}!`
        : result.message;
      
      setSuccess(`${msg} Countdown 6h a început.`);
      setShowAdminEmailModal(false);
      setSelectedMentorForEmail(null);
    } catch (err) {
      console.error('Eroare trimitere bulk email:', err);
      setError('Eroare la trimiterea emailurilor: ' + (err.message || ''));
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmDate = () => {
    if (!manualDate && !manualDate2 && !manualDate3) {
      updateOneToTwenty(selectedMentorForDate, '', '', '', { resetAll: true });
      return;
    }
    updateOneToTwenty(selectedMentorForDate, manualDate, manualDate2, manualDate3);
  };

  const handleResetDateSchedule = () => {
    if (!selectedMentorForDate) {
      setError('Selecteaza un mentor pentru resetarea sesiunilor.');
      return;
    }

    showConfirmDialog(
      'Resetare Program 1:20',
      'Resetezi toate cele 3 sesiuni pentru acest mentor? Mentorul va aparea fara nicio sesiune setata.',
      async () => {
        await updateOneToTwenty(selectedMentorForDate, '', '', '', { resetAll: true });
      }
    );
  };

  const openEmailTemplateEditor = () => {
    if (emailTemplate) {
      setEditingTemplate({ 
        subject: emailTemplate.subject, 
        body: emailTemplate.body 
      });
    }
    setShowEmailTemplateEditor(true);
  };

  const openVipEmailTemplateEditor = () => {
    if (vipEmailTemplate) {
      setEditingVipTemplate({
        subject: vipEmailTemplate.subject,
        body: vipEmailTemplate.body
      });
    }
    setShowVipEmailTemplateEditor(true);
  };

  const saveVipEmailTemplate = async () => {
    if (!editingVipTemplate.subject || !editingVipTemplate.body) {
      setError('Te rog completează subiectul și conținutul email-ului VIP!');
      return;
    }
    setLoading(true);
    try {
      await manageEmailTemplateAsAdmin({
        method: 'POST',
        templateId: 'vipEmailTemplate',
        subject: editingVipTemplate.subject,
        body: editingVipTemplate.body,
      });
      await fetchVipEmailTemplate();
      setShowVipEmailTemplateEditor(false);
      setError('');
      setSuccess('Template-ul VIP a fost actualizat cu succes!');
    } catch (err) {
      console.error('Eroare la salvarea template-ului VIP:', err);
      setSuccess('');
      setError('Eroare la salvarea template-ului VIP: ' + (err.message || JSON.stringify(err)));
    } finally {
      setLoading(false);
    }
  };

  const generateVipEmailContent = (lead) => {
    if (!vipEmailTemplate) {
      setError('Template-ul VIP nu este încărcat!');
      return null;
    }
    const replacements = { '{{nume}}': lead.nume || '' };
    let subject = vipEmailTemplate.subject;
    let body = vipEmailTemplate.body;
    Object.keys(replacements).forEach(placeholder => {
      const regex = new RegExp(placeholder.replace(/[{}]/g, '\\$&'), 'g');
      subject = subject.replace(regex, replacements[placeholder]);
      body = body.replace(regex, replacements[placeholder]);
    });
    return { subject, body };
  };

  const showVipEmailPreviewFn = (lead) => {
    const content = generateVipEmailContent(lead);
    if (content) setVipEmailPreview({ lead, content });
  };

  const sendVipEmails = async () => {
    const absolventi = leaduri.filter(l => l.status === LEAD_STATUS.COMPLET_3_SESIUNI && l.email);
    if (absolventi.length === 0) {
      setError('Nu există absolvenți cu email pentru a trimite oferta VIP!');
      return;
    }
    setLoading(true);
    try {
      const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
      const response = await fetch(
        `${supabaseUrl}/functions/v1/send-vip-emails`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${localStorage.getItem('authToken') || ''}`
          },
          body: JSON.stringify({})
        }
      );
      const result = await response.json();
      if (!response.ok) throw new Error(result.error || 'Eroare la trimiterea emailurilor VIP');
      const msg = result.results
        ? `${result.results.sent} emailuri VIP trimise${result.results.failed > 0 ? `, ${result.results.failed} eșuate` : ''}!`
        : result.message;
      setSuccess(msg);
      setShowVipEmailModal(false);
      setVipEmailPreview(null);
    } catch (err) {
      console.error('Eroare trimitere VIP email:', err);
      setError('Eroare la trimiterea emailurilor VIP: ' + (err.message || ''));
    } finally {
      setLoading(false);
    }
  };

  const saveEmailTemplate = async () => {
    if (!editingTemplate.subject || !editingTemplate.body) {
      setError('Te rog completează subiectul și conținutul email-ului!');
      return;
    }

    setLoading(true);
    try {
      await manageEmailTemplateAsAdmin({
        method: 'POST',
        templateId: 'emailTemplate',
        subject: editingTemplate.subject,
        body: editingTemplate.body,
      });
      await fetchEmailTemplate();
      setShowEmailTemplateEditor(false);
      setError('');
      setSuccess('Template-ul de email a fost actualizat cu succes!');
    } catch (err) {
      console.error('Eroare la salvarea template-ului:', err);
      setSuccess('');
      setError('Eroare la salvarea template-ului de email: ' + (err.message || JSON.stringify(err)));
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmLead = async (leadId) => {
    showConfirmDialog("Confirmare Lead", "Confirma ca acest lead participa la sesiunea 1:20?", async () => {
      setLoading(true);
      try {
        await supabase.from("leaduri").update({
          status: LEAD_STATUS.CONFIRMAT, dataConfirmare: new Date().toISOString(), statusOneToTwenty: ONE_TO_TWENTY_STATUS.CONFIRMED
        }).eq("id", leadId);
        await fetchLeaduri(); setSuccess("Lead confirmat cu succes!");
      } catch (err) { setError("Eroare la confirmarea leadului"); } finally { setLoading(false); }
    });
  };

  const handleRejectLead = async (leadId) => {
    showConfirmDialog("Refuz Lead", "Marcheaza leadul ca neconfirmat?", async () => {
      setLoading(true);
      try {
        await supabase.from("leaduri").update({
          status: LEAD_STATUS.NECONFIRMAT, dataConfirmare: new Date().toISOString(), motivNeconfirmare: 'Lead-ul a refuzat sau nu raspunde'
        }).eq("id", leadId);
        await fetchLeaduri(); setSuccess("Lead marcat ca neconfirmat.");
      } catch (err) { setError("Eroare la marcarea leadului"); } finally { setLoading(false); }
    });
  };

  const handleNoShowLead = async (leadId) => {
    showConfirmDialog('No-Show Sesiune 1', 'Marchează leadul ca NO-SHOW la Sesiunea 1?', async () => {
      setLoading(true);
      try {
        const result = await updateLeadAttendance({ action: 'mark_session', leadId, session: 1, value: false });
        await fetchAllData();
        setSuccess(result.message || 'Lead marcat ca No-Show la Sesiunea 1.');
      } catch (err) { setError('Eroare la marcarea prezenței'); } finally { setLoading(false); }
    });
  };

  const handleCompleteLead = async (leadId) => {
    showConfirmDialog('Prezent Sesiune 1', 'Marchează leadul ca PREZENT la Sesiunea 1?', async () => {
      setLoading(true);
      try {
        const result = await updateLeadAttendance({ action: 'mark_session', leadId, session: 1, value: true });
        await fetchAllData();
        setSuccess(result.message || 'Lead marcat ca Prezent la Sesiunea 1!');
      } catch (err) { setError('Eroare la marcarea prezenței'); } finally { setLoading(false); }
    });
  };

  const computeFinalStatus = (prezenta1, prezenta2, prezenta3) => {
    const totalPrezente = [prezenta1, prezenta2, prezenta3].filter(v => v === true).length;
    if (totalPrezente === 3) return LEAD_STATUS.COMPLET_3_SESIUNI;
    if (totalPrezente === 2) return LEAD_STATUS.COMPLET_2_SESIUNI;
    if (totalPrezente === 1) return LEAD_STATUS.COMPLET_SESIUNE_1;
    return LEAD_STATUS.NO_SHOW; // 0 sessions attended — finalized, not re-allocable
  };

  const getLeadProgramMentorId = (lead) => {
    const historyMentors = Array.isArray(lead?.istoricMentori)
      ? lead.istoricMentori.filter(Boolean)
      : [];

    return lead?.mentorAlocat || historyMentors[historyMentors.length - 1] || null;
  };

  const getCompletedSession3TimeLeftMs = (lead, nowTs = Date.now()) => {
    if (!lead || lead.status !== LEAD_STATUS.COMPLET_3_SESIUNI || lead.prezenta3 !== true || !lead.dataOneToTwenty) return null;
    const completedAtMs = new Date(lead.dataOneToTwenty).getTime();
    if (Number.isNaN(completedAtMs)) return null;
    return Math.max(0, COMPLETED_3_SESSIONS_HIDE_MS - (nowTs - completedAtMs));
  };

  const handleSession2Prezent = async (leadId) => {
    showConfirmDialog('Prezent Sesiune 2', 'Marchează leadul ca PREZENT la Sesiunea 2?', async () => {
      setLoading(true);
      try {
        const result = await updateLeadAttendance({ action: 'mark_session', leadId, session: 2, value: true });
        await fetchAllData();
        setSuccess(result.message || 'Lead marcat ca Prezent la Sesiunea 2. Continuă cu Sesiunea 3.');
      } catch (err) { setError('Eroare la marcarea prezenței'); } finally { setLoading(false); }
    });
  };

  const handleSession2NoShow = async (leadId) => {
    showConfirmDialog('No-Show Sesiune 2', 'Marchează leadul ca NO-SHOW la Sesiunea 2?', async () => {
      setLoading(true);
      try {
        const result = await updateLeadAttendance({ action: 'mark_session', leadId, session: 2, value: false });
        await fetchAllData();
        setSuccess(result.message || 'Lead marcat ca No-Show la Sesiunea 2. Continuă cu Sesiunea 3.');
      } catch (err) { setError('Eroare la marcarea prezenței'); } finally { setLoading(false); }
    });
  };

  const handleSession3Prezent = async (leadId) => {
    showConfirmDialog('Prezent Sesiune 3', 'Marchează leadul ca PREZENT la Sesiunea 3? Aceasta finalizează programul.', async () => {
      setLoading(true);
      try {
        const result = await updateLeadAttendance({ action: 'mark_session', leadId, session: 3, value: true });
        await fetchAllData();
        setSuccess(result.message || 'Lead marcat ca Prezent la Sesiunea 3. Program finalizat!');
      } catch (err) { setError('Eroare la marcarea prezenței'); } finally { setLoading(false); }
    });
  };

  const handleSession3NoShow = async (leadId) => {
    showConfirmDialog('No-Show Sesiune 3', 'Marchează leadul ca NO-SHOW la Sesiunea 3? Aceasta finalizează programul.', async () => {
      setLoading(true);
      try {
        const result = await updateLeadAttendance({ action: 'mark_session', leadId, session: 3, value: false });
        await fetchAllData();
        setSuccess(result.message || 'Lead marcat la Sesiunea 3. Program finalizat.');
      } catch (err) { setError('Eroare la marcarea prezenței'); } finally { setLoading(false); }
    });
  };

  const handleEditAttendance = async (leadId, session, newValue) => {
    setLoading(true);
    try {
      const result = await updateLeadAttendance({ action: 'edit_attendance', leadId, session, value: newValue });
      await fetchAllData();
      setSuccess(result.message || 'Prezența a fost corectată cu succes!');
    } catch (err) { setError('Eroare la editarea prezenței: ' + (err.message || '')); } finally { setLoading(false); }
  };

  const handleReallocateLead = async (leadId) => {
    showConfirmDialog("Re-alocare", "Re-aloca acest lead catre alt mentor disponibil?", async () => {
      setLoading(true);
      try {
        const lead = leaduri.find(l => l.id === leadId);
        if (!lead) { setError("Lead negasit"); return; }
        if (isFinalizedProgramLead(lead)) {
          setError('Leadul a finalizat programul si nu mai poate fi realocat.');
          return;
        }
        const mentDisp = mentoriData.filter(m => {
          const leadCnt = m.leaduriAlocate || 0;
          return m.id !== lead.mentorAlocat && leadCnt < 30 && m.available && !m.manuallyDisabled;
        }).sort((a, b) => a.ordineCoada - b.ordineCoada);
        if (mentDisp.length === 0) { setError("Nu exista mentori disponibili"); setLoading(false); return; }
        const mentorNou = mentDisp[0];
        const oldMentorId = lead.mentorAlocat;
        const da = new Date().toISOString();
        await supabase.from("leaduri").update({
          status: LEAD_STATUS.ALOCAT, 
          mentorAlocat: mentorNou.id, 
          dataAlocare: da, 
          dataTimeout: null,
          dataConfirmare: null, 
          numarReAlocari: (lead.numarReAlocari || 0) + 1,
          istoricMentori: [...(lead.istoricMentori || []), mentorNou.id],
          emailTrimis: false
        }).eq("id", leadId);
        // Decrement old mentor's count
        if (oldMentorId) {
          const oldMentor = mentoriData.find(m => m.id === oldMentorId);
          if (oldMentor) {
            await supabase.from("mentori").update({ leaduriAlocate: Math.max(0, (oldMentor.leaduriAlocate || 1) - 1) }).eq("id", oldMentorId);
          }
          // Clean up old allocation record
          if (lead.alocareId) {
            await supabase.from("alocari").delete().eq("id", lead.alocareId);
          }
        }
        await supabase.from("mentori").update({ leaduriAlocate: (mentorNou.leaduriAlocate || 0) + 1 }).eq("id", mentorNou.id);
        await fetchAllData(); setSuccess('Lead re-alocat catre ' + mentorNou.nume + '!');
      } catch (err) { setError("Eroare la re-alocarea leadului"); } finally { setLoading(false); }
    });
  };

  const stergeLeaduri = () => {
    showConfirmDialog("Stergere Totala", "Esti sigur ca vrei sa stergi TOATE leadurile?", async () => {
      setLoading(true);
      setError('');
      setSuccess('');
      try {
        const result = await deleteLeadsAsAdmin({ action: 'delete_all' });
        await fetchAllData();
        setSuccess(result.message || "Toate leadurile au fost sterse si mentorii resetati!");
      } catch (err) {
        console.error('Eroare la stergerea tuturor leadurilor:', err);
        setError(err?.message || "Eroare la stergerea leadurilor");
      } finally { setLoading(false); }
    });
  };

  const stergeLeaduriMentor = (alocare) => {
    showConfirmDialog("Stergere Leaduri Mentor", 'Stergi toate cele ' + alocare.numarLeaduri + ' leaduri ale mentorului ' + alocare.mentorNume + '?', async () => {
      setLoading(true);
      setError('');
      setSuccess('');
      try {
        const result = await deleteLeadsAsAdmin({ action: 'delete_mentor', mentorId: alocare.mentorId });
        await fetchAllData(); 
        setSuccess(result.message || ('Leadurile mentorului ' + alocare.mentorNume + ' au fost sterse!'));
      } catch (err) { 
        console.error("Eroare la stergerea leadurilor:", err);
        setError(err?.message || "Eroare la stergerea leadurilor mentorului"); 
      } finally { setLoading(false); }
    });
  };

  const dezalocaLeadSingular = (lead) => {
    showConfirmDialog(
      'Dezalocare Lead',
      `Dezaloci leadul "${lead.nume}" de la mentorul său? Leadul va reveni cu status NEALOCAT.`,
      async () => {
        setLoading(true);
        setError('');
        setSuccess('');
        try {
          const result = await manageLeadAssignmentsAsAdmin({
            action: 'deallocate_single',
            leadId: lead.id,
          });
          await fetchAllData();
          setSuccess(result.message || `Leadul "${lead.nume}" a fost dezalocat cu succes!`);
        } catch (err) {
          setError('Eroare la dezalocarea leadului: ' + (err.message || ''));
        } finally { setLoading(false); }
      }
    );
  };

  const dezalocaLeaduriMentor = (alocare) => {
    showConfirmDialog("Dezalocare Leaduri", 'Dezaloci toate cele ' + alocare.numarLeaduri + ' leaduri ale mentorului ' + alocare.mentorNume + '? Leadurile vor ramane in sistem cu status NEALOCAT.', async () => {
      setLoading(true);
      setError('');
      setSuccess('');
      try {
        const result = await manageLeadAssignmentsAsAdmin({
          action: 'deallocate_mentor',
          mentorId: alocare.mentorId,
        });
        await fetchAllData(); 
        setSuccess(result.message || (alocare.numarLeaduri + ' leaduri dezalocate de la ' + alocare.mentorNume + '! Leadurile sunt acum nealocate.'));
      } catch (err) { 
        console.error("Eroare la dezalocarea leadurilor:", err);
        setError(err?.message || "Eroare la dezalocarea leadurilor mentorului"); 
      } finally { setLoading(false); }
    });
  };

  const exportToExcel = async () => {
    try {
      const ExcelJS = (await import('exceljs')).default;

      const getMentorNume = (lead) => {
        const mentorId = getLeadProgramMentorId(lead);
        const mentorInfo = MENTORI_DISPONIBILI.find(m => m.id === mentorId);
        const mentor = mentoriData.find(m => m.id === mentorId);
        return mentorInfo ? mentorInfo.nume : (mentor ? mentor.nume : '');
      };

      const leaduriActivi = leaduri.filter(l => l.status !== LEAD_STATUS.COMPLET_3_SESIUNI);
      const leaduriAbsolventi = leaduri.filter(l => l.status === LEAD_STATUS.COMPLET_3_SESIUNI);

      const activiData = leaduriActivi.map(lead => ({
        'Nume': lead.nume || '',
        'Telefon': lead.telefon || '',
        'Email': lead.email || '',
        'Status': lead.status || '',
        'Mentor': getMentorNume(lead),
        'Data Alocare': lead.dataAlocare ? new Date(lead.dataAlocare).toLocaleString('ro-RO') : '',
        'Data Confirmare': lead.dataConfirmare ? new Date(lead.dataConfirmare).toLocaleString('ro-RO') : '',
        'Observatii': lead.observatii || ''
      }));

      const absolventiData = leaduriAbsolventi.map(lead => ({
        'Nume': lead.nume || '',
        'Telefon': lead.telefon || '',
        'Email': lead.email || '',
        'Mentor': getMentorNume(lead),
        'Sesiunea 1': lead.prezenta1 === true ? 'Prezent' : lead.prezenta1 === false ? 'Absent' : '',
        'Sesiunea 2': lead.prezenta2 === true ? 'Prezent' : lead.prezenta2 === false ? 'Absent' : '',
        'Sesiunea 3': lead.prezenta3 === true ? 'Prezent' : lead.prezenta3 === false ? 'Absent' : '',
        'Data Alocare': lead.dataAlocare ? new Date(lead.dataAlocare).toLocaleString('ro-RO') : '',
        'Data Confirmare': lead.dataConfirmare ? new Date(lead.dataConfirmare).toLocaleString('ro-RO') : '',
        'Observatii': lead.observatii || ''
      }));

      const wb = new ExcelJS.Workbook();

      // Sheet 1 — Leads Activi
      const wsActivi = wb.addWorksheet('Leads Activi');
      if (activiData.length > 0) {
        wsActivi.columns = Object.keys(activiData[0]).map(key => ({ header: key, key, width: 22 }));
        wsActivi.getRow(1).font = { bold: true };
        activiData.forEach(row => wsActivi.addRow(row));
      }

      // Sheet 2 — Absolvenți
      const wsAbs = wb.addWorksheet('Absolventi');
      if (absolventiData.length > 0) {
        wsAbs.columns = Object.keys(absolventiData[0]).map(key => ({ header: key, key, width: 22 }));
        wsAbs.getRow(1).font = { bold: true };
        absolventiData.forEach(row => wsAbs.addRow(row));
      }

      const fileName = `leaduri_export_${new Date().toISOString().split('T')[0]}.xlsx`;
      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = fileName; a.click();
      URL.revokeObjectURL(url);
      setSuccess(`Export reușit: ${leaduriActivi.length} leads activi + ${leaduriAbsolventi.length} absolvenți în ${fileName}!`);
    } catch (err) {
      console.error('Eroare la exportul în Excel:', err);
      setError('Eroare la exportul în Excel');
    }
  };

  const resetMentori = () => {
    showConfirmDialog("Reset Mentori", "Resetezi coada mentorilor?", async () => {
      try {
        for (let i = 0; i < MENTORI_DISPONIBILI.length; i++) {
          const mid = MENTORI_DISPONIBILI[i].id;
          if (mentoriData.find(m => m.id === mid)) {
            await supabase.from("mentori").update({ ordineCoada: i, leaduriAlocate: 0, available: true }).eq("id", mid);
          }
        }
        await fetchMentori(); setSuccess("Coada mentorilor resetata!");
      } catch (err) { setError("Eroare la resetarea mentorilor"); }
    });
  };

  const stergeMentoriDuplicati = () => {
    showConfirmDialog("Stergere Duplicati", "Stergi toti mentorii duplicati?", async () => {
      setLoading(true);
      try {
        for (const m of mentoriData) await supabase.from("mentori").delete().eq("id", m.id);
        await initializeMentori(); setSuccess("Mentorii duplicati au fost stersi!");
      } catch (err) { setError("Eroare la stergerea mentorilor duplicati"); } finally { setLoading(false); }
    });
  };

  const handleEditLead = (lead) => {
    setEditingLead(lead.id);
    setEditLeadData({ nume: lead.nume, telefon: lead.telefon, email: lead.email, status: lead.status || '' });
  };

  const handleSaveEditLead = async (leadId) => {
    if (!editLeadData.nume || !editLeadData.telefon || !editLeadData.email) { setError("Toate campurile sunt obligatorii"); return; }
    setLoading(true); setError(""); setSuccess("");
    try {
      await updateLeadAsAdmin({
        leadId,
        nume: editLeadData.nume,
        telefon: editLeadData.telefon,
        email: editLeadData.email,
        status: editLeadData.status || null,
      });
      await fetchAllData();
      setSuccess("Lead actualizat cu succes!"); setEditingLead(null);
    } catch (err) {
      const errorMessage = err?.message || '';
      if (errorMessage) {
        setError(errorMessage);
      } else {
        setError("Eroare la actualizarea leadului");
      }
    } finally { setLoading(false); }
  };

  const handleCancelEdit = () => { setEditingLead(null); setEditLeadData({ nume: '', telefon: '', email: '', status: '' }); };

  const handleDeleteLead = (lead) => {
    showConfirmDialog("Stergere Lead", 'Stergi leadul "' + lead.nume + '"?', async () => {
      setLoading(true);
      setError('');
      setSuccess('');
      try {
        const result = await deleteLeadsAsAdmin({ action: 'delete_single', leadId: lead.id });
        await fetchAllData();
        setSuccess(result.message || ('Lead "' + lead.nume + '" sters!'));
      } catch (err) {
        console.error('Eroare la stergerea leadului:', err);
        setError(err?.message || "Eroare la stergerea leadului");
      } finally { setLoading(false); }
    });
  };

  // ==================== COMPUTED VALUES ====================
  const leaduriNealocate = leaduri.filter(l => l.status === LEAD_STATUS.NEALOCAT).length;
  const leaduriAlocate = leaduri.filter(l => l.status === LEAD_STATUS.ALOCAT).length;
  const leaduriConfirmate = leaduri.filter(l => l.status === LEAD_STATUS.CONFIRMAT).length;
  const leaduriNeconfirmate = leaduri.filter(l => l.status === LEAD_STATUS.NECONFIRMAT).length;
  const leaduriNoShow = leaduri.filter(l => l.status === LEAD_STATUS.NO_SHOW).length;
  const leaduriComplete = leaduri.filter(l => l.status === LEAD_STATUS.COMPLET).length;

  const mentorLeaduri = currentMentorId
    ? leaduri
        .filter(l => l.mentorAlocat === currentMentorId)
        .filter(l => {
          const timeLeftMs = getCompletedSession3TimeLeftMs(l);
          return timeLeftMs === null || timeLeftMs > 0;
        })
    : [];
  const mentorLeaduriAlocate = mentorLeaduri.filter(l => l.status === LEAD_STATUS.ALOCAT).length;
  const mentorLeaduriConfirmate = mentorLeaduri.filter(l => l.status === LEAD_STATUS.CONFIRMAT).length;
  const mentorLeaduriInProgram = mentorLeaduri.filter(l => l.status === LEAD_STATUS.IN_PROGRAM).length;
  const mentorLeaduriComplete = mentorLeaduri.filter(l => [
    LEAD_STATUS.COMPLET,
    LEAD_STATUS.COMPLET_3_SESIUNI,
    LEAD_STATUS.COMPLET_2_SESIUNI,
    LEAD_STATUS.COMPLET_SESIUNE_FINALA,
    LEAD_STATUS.COMPLET_SESIUNE_1
  ].includes(l.status)).length;
  const mentorLeaduriNoShow = mentorLeaduri.filter(l => l.status === LEAD_STATUS.NO_SHOW).length;
  const mentorLeaduriNeconfirmate = mentorLeaduri.filter(l => l.status === LEAD_STATUS.NECONFIRMAT).length;

  const canAllocateLeads = () => {
    if (leaduriNealocate === 0) return false;
    const mentoriSortati = [...mentoriData].sort((a, b) => a.ordineCoada - b.ordineCoada);
    const mentorEligibil = mentoriSortati.find(m => {
      const leadCnt = m.leaduriAlocate || 0;
      return leadCnt < 30 && m.available && !m.manuallyDisabled;
    });
    if (!mentorEligibil) return false;
    const leadCnt = mentorEligibil.leaduriAlocate || 0;
    if (leadCnt === 0 && leaduriNealocate < 20) return false;
    return true;
  };

  // Admin table computed (excludes absolvenți - complet_3_sesiuni are shown in separate tab)
  const leaduriFiltrate = leaduri.filter(l =>
    l.status !== LEAD_STATUS.COMPLET_3_SESIUNI &&
    (
      l.nume?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      l.telefon?.includes(searchQuery) ||
      l.email?.toLowerCase().includes(searchQuery.toLowerCase())
    )
  );

  const leaduriSortate = [...leaduriFiltrate].sort((a, b) => {
    if (sortBy === 'nume-asc') return (a.nume || '').localeCompare(b.nume || '');
    if (sortBy === 'nume-desc') return (b.nume || '').localeCompare(a.nume || '');
    if (sortBy === 'data-asc') {
      const dA = new Date(a.createdAt);
      const dB = new Date(b.createdAt);
      return dA - dB;
    }
    const dA = new Date(a.createdAt);
    const dB = new Date(b.createdAt);
    return dB - dA;
  });

  const totalPages = Math.ceil(leaduriSortate.length / leaduriPerPage);
  const indexOfLastLead = currentPage * leaduriPerPage;
  const indexOfFirstLead = indexOfLastLead - leaduriPerPage;
  const leaduriCurente = leaduriSortate.slice(indexOfFirstLead, indexOfLastLead);

  // Mentor table computed
  const mentorLeaduriFiltrate = mentorLeaduri.filter(l =>
    l.nume?.toLowerCase().includes(mentorSearchQuery.toLowerCase()) ||
    l.telefon?.includes(mentorSearchQuery) ||
    l.email?.toLowerCase().includes(mentorSearchQuery.toLowerCase())
  );

  const mentorLeaduriSortate = [...mentorLeaduriFiltrate].sort((a, b) => {
    if (mentorSortBy === 'nume-asc') return (a.nume || '').localeCompare(b.nume || '');
    if (mentorSortBy === 'nume-desc') return (b.nume || '').localeCompare(a.nume || '');
    if (mentorSortBy === 'status') {
      const order = [LEAD_STATUS.ALOCAT, LEAD_STATUS.CONFIRMAT, LEAD_STATUS.IN_PROGRAM, LEAD_STATUS.NECONFIRMAT, LEAD_STATUS.NO_SHOW, LEAD_STATUS.COMPLET, LEAD_STATUS.COMPLET_3_SESIUNI, LEAD_STATUS.COMPLET_2_SESIUNI, LEAD_STATUS.COMPLET_SESIUNE_FINALA, LEAD_STATUS.COMPLET_SESIUNE_1];
      return order.indexOf(a.status) - order.indexOf(b.status);
    }
    if (mentorSortBy === 'data-asc') {
      const dA = new Date(a.createdAt);
      const dB = new Date(b.createdAt);
      return dA - dB;
    }
    const dA = new Date(a.createdAt);
    const dB = new Date(b.createdAt);
    return dB - dA;
  });

  const mentorTotalPages = Math.ceil(mentorLeaduriSortate.length / leaduriPerPage);
  const mentorIndexOfLast = mentorCurrentPage * leaduriPerPage;
  const mentorIndexOfFirst = mentorIndexOfLast - leaduriPerPage;
  const mentorLeaduriCurente = mentorLeaduriSortate.slice(mentorIndexOfFirst, mentorIndexOfLast);

  // Mentor cards
  const mentoriUnici = MENTORI_DISPONIBILI.map(mentorDef => {
    const mentorDB = mentoriData.find(m => m.id === mentorDef.id);
    const leaduriRealeMentor = leaduri.filter(l => l.mentorAlocat === mentorDef.id && !isFinalizedProgramLead(l)).length;
    return {
      id: mentorDef.id, nume: mentorDef.nume,
      available: mentorDB?.available ?? true,
      manuallyDisabled: mentorDB?.manuallyDisabled ?? false,
      ultimulOneToTwenty: mentorDB?.ultimulOneToTwenty ?? null,
      webinar2Date: mentorDB?.webinar2Date ?? null,
      webinar3Date: mentorDB?.webinar3Date ?? null,
      ordineCoada: mentorDB?.ordineCoada ?? MENTORI_DISPONIBILI.findIndex(m => m.id === mentorDef.id),
      leaduriAlocate: leaduriRealeMentor,
      createdAt: mentorDB?.createdAt ?? new Date().toISOString()
    };
  });

  // Aggregated allocations
  const alocariAggregate = mentoriUnici
    .map(mentor => {
      const leaduriMentor = leaduri.filter(l => l.mentorAlocat === mentor.id && !isFinalizedProgramLead(l));
      if (leaduriMentor.length === 0) return null;
      const primaAlocare = alocariActive
        .filter(a => a.mentorId === mentor.id)
        .sort((a, b) => {
          const dateA = new Date(a.createdAt);
          const dateB = new Date(b.createdAt);
          return dateA - dateB;
        })[0];
      return {
        id: mentor.id, mentorId: mentor.id, mentorNume: mentor.nume,
        numarLeaduri: leaduriMentor.length, leaduri: leaduriMentor.map(l => l.id),
        createdAt: primaAlocare?.createdAt ?? new Date().toISOString(), status: 'activa'
      };
    })
    .filter(a => a !== null);

  // ==================== RENDER ====================
  if (currentRole === "admin") {
    return (
      <AdminDashboard
        logo={logo}
        leaduri={leaduri} mentoriData={mentoriData} mentoriUnici={mentoriUnici} alocariAggregate={alocariAggregate}
        leaduriNealocate={leaduriNealocate} leaduriAlocate={leaduriAlocate} leaduriConfirmate={leaduriConfirmate}
        leaduriNeconfirmate={leaduriNeconfirmate} leaduriNoShow={leaduriNoShow} leaduriComplete={leaduriComplete}
        searchQuery={searchQuery} setSearchQuery={setSearchQuery} sortBy={sortBy} setSortBy={setSortBy}
        currentPage={currentPage} setCurrentPage={setCurrentPage}
        leaduriCurente={leaduriCurente} leaduriSortate={leaduriSortate} totalPages={totalPages}
        indexOfFirstLead={indexOfFirstLead} indexOfLastLead={indexOfLastLead} leaduriPerPage={leaduriPerPage}
        loading={loading} loadingData={loadingData} error={error} success={success} setError={setError} setSuccess={setSuccess}
        fetchAllData={fetchAllData} handleLogout={handleLogout}
        stergeMentoriDuplicati={stergeMentoriDuplicati} resetMentori={resetMentori}
        openAdminEmailModal={openAdminEmailModal} toggleMentorAvailability={toggleMentorAvailability} openDateModal={openDateModal}
        alocaLeaduriAutomata={alocaLeaduriAutomata} canAllocateLeads={canAllocateLeads}
        alocaLeaduriManual={alocaLeaduriManual}
        showManualAllocModal={showManualAllocModal} setShowManualAllocModal={setShowManualAllocModal}
        manualAllocMentor={manualAllocMentor} setManualAllocMentor={setManualAllocMentor}
        manualAllocCount={manualAllocCount} setManualAllocCount={setManualAllocCount}
        stergeLeaduri={stergeLeaduri} exportToExcel={exportToExcel}
        dezalocaLeaduriMentor={dezalocaLeaduriMentor} dezalocaLeadSingular={dezalocaLeadSingular} stergeLeaduriMentor={stergeLeaduriMentor}
        selectedMentor={selectedMentor} setSelectedMentor={setSelectedMentor}
        showUploadForm={showUploadForm} setShowUploadForm={setShowUploadForm}
        uploadMode={uploadMode} setUploadMode={setUploadMode}
        uploadFile={uploadFile} setUploadFile={setUploadFile}
        handleFileChange={handleFileChange} handleUploadLeaduri={handleUploadLeaduri}
        manualLead={manualLead} setManualLead={setManualLead} handleAddManualLead={handleAddManualLead}
        editingLead={editingLead} editLeadData={editLeadData} setEditLeadData={setEditLeadData}
        handleEditLead={handleEditLead} handleSaveEditLead={handleSaveEditLead} handleCancelEdit={handleCancelEdit}
        handleReallocateLead={handleReallocateLead} handleDeleteLead={handleDeleteLead}
        showDateModal={showDateModal} manualDate={manualDate} setManualDate={setManualDate}
        manualDate2={manualDate2} setManualDate2={setManualDate2}
        manualDate3={manualDate3} setManualDate3={setManualDate3}
        handleConfirmDate={handleConfirmDate} handleResetDateSchedule={handleResetDateSchedule} setShowDateModal={setShowDateModal}
        selectedMentorForDate={selectedMentorForDate} setSelectedMentorForDate={setSelectedMentorForDate}
        showAdminEmailModal={showAdminEmailModal} selectedMentorForEmail={selectedMentorForEmail}
        setShowAdminEmailModal={setShowAdminEmailModal}
        bulkEmailPreview={bulkEmailPreview} setBulkEmailPreview={setBulkEmailPreview}
        showBulkEmailPreview={showBulkEmailPreview} sendBulkEmail={sendBulkEmail}
        emailTemplate={emailTemplate} showEmailTemplateEditor={showEmailTemplateEditor}
        editingTemplate={editingTemplate} setEditingTemplate={setEditingTemplate}
        openEmailTemplateEditor={openEmailTemplateEditor} saveEmailTemplate={saveEmailTemplate}
        setShowEmailTemplateEditor={setShowEmailTemplateEditor}
        vipEmailTemplate={vipEmailTemplate}
        showVipEmailModal={showVipEmailModal} setShowVipEmailModal={setShowVipEmailModal}
        showVipEmailTemplateEditor={showVipEmailTemplateEditor} setShowVipEmailTemplateEditor={setShowVipEmailTemplateEditor}
        editingVipTemplate={editingVipTemplate} setEditingVipTemplate={setEditingVipTemplate}
        openVipEmailTemplateEditor={openVipEmailTemplateEditor} saveVipEmailTemplate={saveVipEmailTemplate}
        vipEmailPreview={vipEmailPreview} setVipEmailPreview={setVipEmailPreview}
        showVipEmailPreviewFn={showVipEmailPreviewFn} sendVipEmails={sendVipEmails}
        usersAccounts={usersAccounts}
        loadingUsersAccounts={loadingUsersAccounts}
        fetchUsersAccounts={fetchUsersAccounts}
        updateUserCredentials={updateUserCredentials}
        resetUserPasswordByAdmin={resetUserPasswordByAdmin}
        showModal={showModal} modalConfig={modalConfig} closeModal={closeModal} handleModalConfirm={handleModalConfirm}
      />
    );
  }

  return (
    <MentorDashboard
      logo={logo}
      currentMentor={currentMentor} currentMentorId={currentMentorId}
      leaduri={leaduri} mentoriData={mentoriData}
      mentorLeaduri={mentorLeaduri}
      mentorLeaduriAlocate={mentorLeaduriAlocate} mentorLeaduriConfirmate={mentorLeaduriConfirmate}
      mentorLeaduriComplete={mentorLeaduriComplete} mentorLeaduriNeconfirmate={mentorLeaduriNeconfirmate}
      mentorLeaduriNoShow={mentorLeaduriNoShow} mentorLeaduriInProgram={mentorLeaduriInProgram}
      mentorSearchQuery={mentorSearchQuery} setMentorSearchQuery={setMentorSearchQuery}
      mentorSortBy={mentorSortBy} setMentorSortBy={setMentorSortBy}
      mentorCurrentPage={mentorCurrentPage} setMentorCurrentPage={setMentorCurrentPage}
      mentorLeaduriCurente={mentorLeaduriCurente} mentorLeaduriSortate={mentorLeaduriSortate}
      mentorTotalPages={mentorTotalPages} mentorIndexOfFirst={mentorIndexOfFirst}
      mentorIndexOfLast={mentorIndexOfLast} leaduriPerPage={leaduriPerPage}
      loading={loading} loadingData={loadingData} error={error} success={success} setError={setError} setSuccess={setSuccess}
      fetchAllData={fetchAllData} handleLogout={handleLogout}
      openDateModal={openDateModal}
      handleCompleteLead={handleCompleteLead} handleNoShowLead={handleNoShowLead}
      handleSession2Prezent={handleSession2Prezent} handleSession2NoShow={handleSession2NoShow}
      handleSession3Prezent={handleSession3Prezent} handleSession3NoShow={handleSession3NoShow}
      handleEditAttendance={handleEditAttendance}
      getCompletedSession3TimeLeftMs={getCompletedSession3TimeLeftMs}
      showDateModal={showDateModal} manualDate={manualDate} setManualDate={setManualDate}
      manualDate2={manualDate2} setManualDate2={setManualDate2}
      manualDate3={manualDate3} setManualDate3={setManualDate3}
      handleConfirmDate={handleConfirmDate} handleResetDateSchedule={handleResetDateSchedule} setShowDateModal={setShowDateModal}
      selectedMentorForDate={selectedMentorForDate} setSelectedMentorForDate={setSelectedMentorForDate}
      showModal={showModal} modalConfig={modalConfig} closeModal={closeModal} handleModalConfirm={handleModalConfirm}
    />
  );
}
