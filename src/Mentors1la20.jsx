/* eslint-disable no-unused-vars */
import React, { useState, useEffect, useRef, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import logo from "./logo2.png";
import { supabase } from "./supabase";
import { formatDate, MENTORI_DISPONIBILI, MENTOR_PHOTOS, LEAD_STATUS, ONE_TO_TWENTY_STATUS, TIMEOUT_6H, checkLeadTimeout, getTimeUntilTimeout, formatTimeRemaining, getStatusBadge } from "./constants";
import AdminDashboard from "./components/AdminDashboard";
import MentorDashboard from "./components/MentorDashboard";
import { clearStoredAuth, getAuthUserFromToken, isTokenValid } from "./utils/auth";
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
  const [editLeadData, setEditLeadData] = useState({ nume: '', telefon: '', email: '' });
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
  const isAutoAllocatingRef = useRef(false);
  const lastAutoAllocCheckRef = useRef(0);

  const COMPLETED_3_SESSIONS_HIDE_MS = 60 * 60 * 1000;

  // ==================== MODAL HELPERS ====================
  const showAlert = (title, message) => {
    setModalConfig({ type: 'alert', title, message, onConfirm: null });
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

  // ==================== FETCH FUNCTIONS ====================
  
  // Statusuri care înseamnă că programul este activ (mentorul nu poate primi leaduri noi)
  const ACTIVE_PROGRAM_STATUSES = [LEAD_STATUS.ALOCAT, LEAD_STATUS.CONFIRMAT, LEAD_STATUS.NECONFIRMAT, LEAD_STATUS.IN_PROGRAM];
  const FINALIZED_PROGRAM_STATUSES = [
    LEAD_STATUS.COMPLET,
    LEAD_STATUS.COMPLET_3_SESIUNI,
    LEAD_STATUS.COMPLET_2_SESIUNI,
    LEAD_STATUS.COMPLET_SESIUNE_FINALA,
    LEAD_STATUS.COMPLET_SESIUNE_1
  ];
  const isFinalizedProgramLead = (lead) => FINALIZED_PROGRAM_STATUSES.includes(lead?.status);

  const fetchMentori = async () => {
    try {
      const { data: mentoriList, error: mentoriErr } = await supabase.from("mentori").select("*");
      if (mentoriErr) throw mentoriErr;
      if (!mentoriList || mentoriList.length === 0) { await initializeMentori(); return; }
      
      const { data: toateLeadurile } = await supabase.from("leaduri").select("*");
      
      for (const mentor of mentoriList) {
        // Numărăm doar leadurile ACTIVE (nu cele finale/terminate)
        const leaduriActive = (toateLeadurile || []).filter(l =>
          l.mentorAlocat === mentor.id && ACTIVE_PROGRAM_STATUSES.includes(l.status)
        );
        const leaduriRealeMentor = leaduriActive.length;
        const isManuallyDisabled = mentor.manuallyDisabled === true;
        // Mentorul e busy dacă:
        // - are lead confirmat/neconfirmat/in_program (post-email prin definiție), SAU
        // - are lead alocat cu emailTrimis: true (emails au fost trimise)
        const hasProgramActiv = (toateLeadurile || []).some(l =>
          l.mentorAlocat === mentor.id && (
            [LEAD_STATUS.CONFIRMAT, LEAD_STATUS.NECONFIRMAT, LEAD_STATUS.IN_PROGRAM].includes(l.status) ||
            (l.status === LEAD_STATUS.ALOCAT && l.emailTrimis === true)
          )
        );
        const shouldBeAvailable = !isManuallyDisabled && !hasProgramActiv && leaduriRealeMentor < 30;
        
        if (mentor.available !== shouldBeAvailable || (mentor.leaduriAlocate || 0) !== leaduriRealeMentor) {
          await supabase.from("mentori").update({
            leaduriAlocate: leaduriRealeMentor,
            available: shouldBeAvailable
          }).eq("id", mentor.id);
        }
      }
      
      const { data: updatedMentori } = await supabase.from("mentori").select("*");
      setMentoriData(updatedMentori || []);
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
      let expired = 0;
      for (const lead of (list || [])) {
        if (checkLeadTimeout(lead)) {
          expired++;
          await supabase.from("leaduri").update({
            status: LEAD_STATUS.NECONFIRMAT, motivNeconfirmare: 'Timeout 6h', dataTimeout: new Date().toISOString()
          }).eq("id", lead.id);
        }
      }
      if (expired > 0) {
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
      
      for (const alocare of (alocariList || [])) {
        const leaduriReale = (toateLeadurile || []).filter(l => 
          alocare.leaduri && alocare.leaduri.includes(l.id) && !isFinalizedProgramLead(l)
        );
        
        const numarRealDeLeaduri = leaduriReale.length;
        
        if (alocare.numarLeaduri !== numarRealDeLeaduri || alocare.leaduri.length !== numarRealDeLeaduri) {
          const leaduriIdReale = leaduriReale.map(l => l.id);
          await supabase.from("alocari").update({
            numarLeaduri: numarRealDeLeaduri,
            leaduri: leaduriIdReale,
            ultimaActualizare: new Date().toISOString()
          }).eq("id", alocare.id);
        }
        
        if (numarRealDeLeaduri === 0) {
          await supabase.from("alocari").delete().eq("id", alocare.id);
        }
      }
      
      const { data: alocariUpdated } = await supabase.from("alocari").select("*");
      setAlocariActive(alocariUpdated || []);
    } catch (err) { console.error("Eroare fetch alocari:", err); }
  };

  const fetchEmailTemplate = async () => {
    try {
      const { data: templateDoc, error: tplErr } = await supabase
        .from("settings").select("*").eq("id", "emailTemplate").single();
      
      if (!tplErr && templateDoc) {
        setEmailTemplate(templateDoc);
      } else {
        // Template default dacă nu există
        const defaultTemplate = {
          id: "emailTemplate",
          subject: "Invitatie Webinar 1:20 - ProFX",
          body: `Buna ziua {{nume}},

Sunt {{mentorName}}, mentorul tau de la ProFX!

Te invit să participi la webinarul nostru 1:20 dedicat începătorilor, unde vom construi împreună baza corectă în trading, pas cu pas.

În cadrul webinarului vei învăța:

✅ Ce înseamnă tradingul și cum funcționează piața
✅ Ce sunt Buy Stop/Limit, Sell Stop/Limit, Stop Loss (SL) și Take Profit (TP)
✅ Cum se folosește platforma MT5 și cum se plasează corect un ordin
✅ Noțiuni esențiale pentru a începe în siguranță, fără confuzie

Webinarul este gândit special pentru cei care pornesc de la zero și vor să înțeleagă lucrurile simplu și practic.

La final vei putea adresa întrebări și vei avea o imagine clară asupra pașilor următori.

Data si ora webinarului:
📅 {{webinarDate}}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 CONFIRMA PARTICIPAREA TA:
👉 {{confirmationLink}}

Te rog să confirmi participarea ta accesând link-ul de mai sus.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Te astept cu drag!

Cu respect,
{{mentorName}}
Mentor ProFX

Contact:
📞 {{telefon}}
📧 {{email}}`,
          createdAt: new Date().toISOString()
        };
        await supabase.from("settings").upsert(defaultTemplate);
        setEmailTemplate(defaultTemplate);
      }
    } catch (err) { 
      console.error("Eroare fetch email template:", err);
    }
  };

  const fetchVipEmailTemplate = async () => {
    try {
      const { data: templateDoc, error: tplErr } = await supabase
        .from("settings").select("*").eq("id", "vipEmailTemplate").single();
      if (!tplErr && templateDoc) {
        setVipEmailTemplate(templateDoc);
      } else {
        const defaultVipTemplate = {
          id: "vipEmailTemplate",
          subject: "Ofertă VIP Exclusivă – ProFX Premium 💎",
          body: `Buna ziua {{nume}},

🎓 Felicitări pentru parcurgerea programului ProFX!

Acum că ai finalizat sesiunile, te invităm să faci următorul pas în cariera ta de trader cu accesul la Programul VIP ProFX — conceput special pentru traders dedicați.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💎 ACCES VIP — DOAR 20€/LUNĂ

Ce primești:

📈 MINIM 4 sesiuni de trading LIVE zilnic
   • Scalping / Day Trading / Swing

💡 Idei de intrări zilnice – Entry, SL, TP pe Gold și Forex

🎓 Cursuri GRATUITE – Începători & Avansați

🧠 Cursuri Psihologie & Dezvoltare Personală

🤝 Affiliate Partnerships

📊 Acces la sesiuni de Macroeconomie

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💰 Investiția ta: doar 20€/lună

Nu rata această oportunitate de a face parte din comunitatea noastră VIP.

Contactează-ne pentru a-ți rezerva locul!

Cu respect,
Echipa ProFX`,
          createdAt: new Date().toISOString()
        };
        await supabase.from("settings").upsert(defaultVipTemplate);
        setVipEmailTemplate(defaultVipTemplate);
      }
    } catch (err) {
      console.error("Eroare fetch VIP email template:", err);
    }
  };

  const fetchAllData = useCallback(async () => {
    setLoadingData(true);
    await Promise.all([fetchMentori(), fetchLeaduri(), fetchAlocari(), fetchEmailTemplate(), fetchVipEmailTemplate()]);
    setLoadingData(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ==================== AUTO-ALLOCATE ====================
  const checkAndAutoAllocate = useCallback(async () => {
    let modificari = false;
    
    try {
      // PRIORITATE 1: Realocă IMEDIAT leadurile neconfirmate
      const leaduriNeconfirmate = leaduri.filter(l => l.status === LEAD_STATUS.NECONFIRMAT);
      
      if (leaduriNeconfirmate.length > 0) {
        console.log(`🔄 Găsite ${leaduriNeconfirmate.length} leaduri neconfirmate - se realocă automat...`);
        modificari = true;
        
        for (const lead of leaduriNeconfirmate) {
          const mentoriSortati = [...mentoriData].sort((a, b) => a.ordineCoada - b.ordineCoada);
          const mentorActual = lead.mentorAlocat;
          
          const mentorNou = mentoriSortati.find(m => {
            const leadCnt = m.leaduriAlocate || 0;
            return m.id !== mentorActual && leadCnt < 30 && (m.available || (leadCnt >= 20 && leadCnt < 30)) && !m.manuallyDisabled;
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
              const leaduriRamase = alocareVeche.leaduri.filter(id => id !== lead.id);
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
          
          const alocareExistenta = alocariActive.find(a => a.mentorId === mentorNou.id && a.status === 'activa');
          let alocRef;
          
          if (alocareExistenta) {
            const leaduriActualizate = [...alocareExistenta.leaduri, lead.id];
            await supabase.from("alocari").update({
              numarLeaduri: leaduriActualizate.length,
              leaduri: leaduriActualizate,
              ultimaActualizare: new Date().toISOString()
            }).eq("id", alocareExistenta.id);
            alocRef = { id: alocareExistenta.id };
          } else {
            const { data: newAloc } = await supabase.from("alocari").insert({
              mentorId: mentorNou.id,
              mentorNume: mentorNume,
              numarLeaduri: 1,
              leaduri: [lead.id],
              createdAt: new Date().toISOString(),
              status: 'activa'
            }).select("id").single();
            alocRef = newAloc;
          }
          
          const da = new Date().toISOString();
          await supabase.from("leaduri").update({
            status: LEAD_STATUS.ALOCAT,
            mentorAlocat: mentorNou.id,
            alocareId: alocRef.id,
            dataAlocare: da,
            dataTimeout: null,
            emailTrimis: false,
            istoricMentori: [...(lead.istoricMentori || []), mentorNou.id],
            numarReAlocari: (lead.numarReAlocari || 0) + 1,
            motivNeconfirmare: null
          }).eq("id", lead.id);
          
          await supabase.from("mentori").update({
            leaduriAlocate: (mentorNou.leaduriAlocate || 0) + 1
          }).eq("id", mentorNou.id);
          
          console.log(`✅ Re-alocare automată: Lead "${lead.nume}" de la ${mentorActual} -> ${mentorNume}`);
        }
      }
      
      // PRIORITATE 2: Alocă leadurile nealocate DOAR dacă sunt minim 20
      const leaduriNealocateList = leaduri.filter(l => l.status === LEAD_STATUS.NEALOCAT);
      
      if (leaduriNealocateList.length >= 20) {
        const mentoriSortati = [...mentoriData].sort((a, b) => a.ordineCoada - b.ordineCoada);
        const mentorEligibil = mentoriSortati.find(m => {
          const leadCnt = m.leaduriAlocate || 0;
          return leadCnt < 30 && (m.available || (leadCnt >= 20 && leadCnt < 30)) && !m.manuallyDisabled;
        });
        
        if (mentorEligibil) {
          console.log(`🔄 Găsite ${leaduriNealocateList.length} leaduri nealocate - se alocă automat...`);
          modificari = true;
          
          const leadCntActual = mentorEligibil.leaduriAlocate || 0;
          const spatDisponibil = 30 - leadCntActual;
          
          let nrDeAlocat;
          if (leadCntActual === 0) {
            nrDeAlocat = Math.min(30, leaduriNealocateList.length);
          } else if (leadCntActual >= 20 && leadCntActual < 30) {
            nrDeAlocat = Math.min(spatDisponibil, leaduriNealocateList.length);
          } else {
            return modificari;
          }
          
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
  useEffect(() => {
    const token = localStorage.getItem('authToken');
    const validToken = isTokenValid(token);

    if (!validToken) {
      clearStoredAuth();
      return;
    }

    const tokenUser = getAuthUserFromToken(token);
    setIsAuthenticated(true);
    setCurrentMentor(tokenUser?.username || localStorage.getItem('currentUser') || '');
    setCurrentRole(tokenUser?.role || localStorage.getItem('currentRole') || '');
    setCurrentMentorId(tokenUser?.mentorId || localStorage.getItem('currentMentorId') || null);
  }, []);

  useEffect(() => {
    if (isAuthenticated) { fetchAllData(); }
  }, [isAuthenticated, fetchAllData]);

  useEffect(() => {
    const now = Date.now();
    const timeSinceLastCheck = now - lastAutoAllocCheckRef.current;
    
    if (isAuthenticated && leaduri.length > 0 && mentoriData.length > 0 && !loadingData && !isAutoAllocatingRef.current && timeSinceLastCheck > 3000) {
      const verificaAutoAlocare = async () => {
        isAutoAllocatingRef.current = true;
        lastAutoAllocCheckRef.current = Date.now();
        
        const modificari = await checkAndAutoAllocate();
        
        if (modificari) {
          setTimeout(async () => {
            await fetchAllData();
            isAutoAllocatingRef.current = false;
          }, 1000);
        } else {
          isAutoAllocatingRef.current = false;
        }
      };
      verificaAutoAlocare();
    }
  }, [leaduri, mentoriData, isAuthenticated, loadingData, checkAndAutoAllocate, fetchAllData]);

  // ==================== HANDLERS ====================

  const handleLogout = () => {
    setIsAuthenticated(false); 
    setCurrentMentor(null); 
    setCurrentRole(null);
    setCurrentMentorId(null);
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
          worksheet.getRow(1).eachCell((cell) => { headers.push(cell.value); });
          const jsonData = [];
          worksheet.eachRow((row, rowNumber) => {
            if (rowNumber === 1) return;
            const rowObj = {};
            row.eachCell((cell, colNumber) => { rowObj[headers[colNumber - 1]] = cell.value; });
            jsonData.push(rowObj);
          });
          const leaduriValide = jsonData.map((row, index) => {
            const nume = row['Nume'] || row['nume'] || row['Name'] || row['name'] || '';
            const telefon = row['Telefon'] || row['telefon'] || row['Phone'] || row['phone'] || '';
            const email = row['Email'] || row['email'] || '';
            if (!nume || !telefon || !email) throw new Error('Linia ' + (index + 2) + ': Nume, telefon si email sunt obligatorii');
            return { nume: String(nume).trim(), telefon: String(telefon).trim(), email: String(email).trim(),
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
      const { error: insErr } = await supabase.from("leaduri").insert({
        nume: manualLead.nume.trim(), telefon: manualLead.telefon.trim(), email: manualLead.email.trim(),
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
      const nealoc = leaduri.filter(l => l.status === LEAD_STATUS.NEALOCAT);
      if (nealoc.length === 0) { setError('Nu exista leaduri nealocate'); setLoading(false); return; }
      
      const mentoriSortati = [...mentoriData].sort((a, b) => a.ordineCoada - b.ordineCoada);
      
      const mentorEligibil = mentoriSortati.find(m => {
        const leadCnt = m.leaduriAlocate || 0;
        return leadCnt < 30 && (m.available || (leadCnt >= 20 && leadCnt < 30)) && !m.manuallyDisabled;
      });
      
      if (!mentorEligibil) { 
        setError("Nu exista mentori disponibili. Trebuie ca mentorul sa fie activat sau sa aiba intre 20-29 leaduri."); 
        setLoading(false); 
        return; 
      }
      
      const leadCntActual = mentorEligibil.leaduriAlocate || 0;
      
      if (leadCntActual === 0 && nealoc.length < 20) {
        setError('Pentru un mentor nou, minimul este 20 leaduri. Disponibile: ' + nealoc.length);
        setLoading(false);
        return;
      }
      
      const spatDisponibil = 30 - leadCntActual;
      let nrDeAlocat;
      
      if (leadCntActual === 0) {
        nrDeAlocat = Math.min(30, nealoc.length);
      } else if (leadCntActual >= 20 && leadCntActual < 30) {
        nrDeAlocat = Math.min(spatDisponibil, nealoc.length);
      } else {
        setError('Mentorul selectat nu poate primi mai multe leaduri');
        setLoading(false);
        return;
      }
      
      const batch = nealoc.slice(0, nrDeAlocat);
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
      
      await fetchAllData();
      setSuccess(`Alocate ${nrDeAlocat} leaduri catre ${mentorNume}! Total mentor: ${nuLeaduriTotale}/30. Nealocate: ${nealoc.length - nrDeAlocat}`);
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

      let nrDeAlocat;
      if (manualAllocCount && parseInt(manualAllocCount) > 0) {
        nrDeAlocat = Math.min(parseInt(manualAllocCount), spatDisponibil, nealoc.length);
      } else {
        nrDeAlocat = Math.min(spatDisponibil, nealoc.length);
      }

      const batch = nealoc.slice(0, nrDeAlocat);
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

      await fetchAllData();
      setSuccess(`Alocate manual ${nrDeAlocat} leaduri catre ${mentorNume}! Total mentor: ${nuLeaduriTotale}/30. Nealocate: ${nealoc.length - nrDeAlocat}`);
      setShowManualAllocModal(false);
      setManualAllocMentor('');
      setManualAllocCount('');
    } catch (err) {
      console.error("Eroare la alocarea manuala:", err);
      setError("Eroare la alocarea manuala: " + (err.message || ""));
    }
    finally { setLoading(false); }
  };

  const toggleMentorAvailability = async (mentorId, currentStatus) => {
    setLoading(true);
    try {
      console.log(`Toggling mentor ${mentorId} from ${currentStatus} to ${!currentStatus}`);
      const newStatus = !currentStatus;
      await supabase.from("mentori").update({ 
        available: newStatus,
        manuallyDisabled: newStatus ? false : true
      }).eq("id", mentorId);
      await fetchMentori(); 
      setSuccess(`Status mentor actualizat! Mentor ${currentStatus ? 'dezactivat' : 'activat'}.`);
      console.log('Mentor availability updated successfully');
    } catch (err) { 
      console.error("Eroare la actualizarea statusului:", err);
      setError(`Eroare la actualizarea statusului: ${err.message}`); 
    } finally {
      setLoading(false);
    }
  };

  const updateOneToTwenty = async (mentorId, customDate, customDate2, customDate3) => {
    try {
      const updates = {};
      if (customDate) updates.ultimulOneToTwenty = new Date(customDate).toISOString();
      if (customDate2) updates.webinar2Date = new Date(customDate2).toISOString();
      if (customDate3) updates.webinar3Date = new Date(customDate3).toISOString();
      if (Object.keys(updates).length === 0) { setError('Te rog selecteaza cel putin o data!'); return; }
      await supabase.from('mentori').update(updates).eq('id', mentorId);
      await fetchMentori(); setSuccess('Datele webinarului actualizate!');
      setShowDateModal(false); setSelectedMentorForDate(null); setManualDate(''); setManualDate2(''); setManualDate3('');
    } catch (err) { setError('Eroare la actualizarea datei 1:20'); }
  };

  const openDateModal = (mentorId) => {
    setSelectedMentorForDate(mentorId);
    const mentor = mentoriData.find(m => m.id === mentorId);
    setManualDate(mentor?.ultimulOneToTwenty ? new Date(mentor.ultimulOneToTwenty).toISOString().slice(0, 16) : new Date().toISOString().slice(0, 16));
    setManualDate2(mentor?.webinar2Date ? new Date(mentor.webinar2Date).toISOString().slice(0, 16) : '');
    setManualDate3(mentor?.webinar3Date ? new Date(mentor.webinar3Date).toISOString().slice(0, 16) : '');
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

    const confirmationLink = `${window.location.origin}/confirm/${lead.id}`;

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
      subject = subject.replace(new RegExp(placeholder, 'g'), value);
      body = body.replace(new RegExp(placeholder, 'g'), value);
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
    if (!manualDate && !manualDate2 && !manualDate3) { setError('Te rog selecteaza cel putin o data!'); return; }
    updateOneToTwenty(selectedMentorForDate, manualDate, manualDate2, manualDate3);
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
      const { error: upsertErr } = await supabase.from("settings").upsert({
        id: "vipEmailTemplate",
        subject: editingVipTemplate.subject,
        body: editingVipTemplate.body,
        updatedAt: new Date().toISOString()
      });
      if (upsertErr) throw upsertErr;
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
      const { error: upsertErr } = await supabase.from("settings").upsert({
        id: "emailTemplate",
        subject: editingTemplate.subject,
        body: editingTemplate.body,
        updatedAt: new Date().toISOString()
      });
      if (upsertErr) throw upsertErr;
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
    showConfirmDialog('No-Show Sesiune 1', 'Marcheaзă leadul ca NO-SHOW la Sesiunea 1?', async () => {
      setLoading(true);
      try {
        await supabase.from('leaduri').update({
          prezenta1: false,
          status: LEAD_STATUS.IN_PROGRAM,
          dataOneToTwenty: new Date().toISOString()
        }).eq('id', leadId);
        await fetchLeaduri(); setSuccess('Lead marcat ca No-Show la Sesiunea 1.');
      } catch (err) { setError('Eroare la marcarea prezenței'); } finally { setLoading(false); }
    });
  };

  const handleCompleteLead = async (leadId) => {
    showConfirmDialog('Prezent Sesiune 1', 'Marcheaзă leadul ca PREZENT la Sesiunea 1?', async () => {
      setLoading(true);
      try {
        await supabase.from('leaduri').update({
          prezenta1: true,
          status: LEAD_STATUS.IN_PROGRAM,
          dataOneToTwenty: new Date().toISOString()
        }).eq('id', leadId);
        await fetchLeaduri(); setSuccess('Lead marcat ca Prezent la Sesiunea 1!');
      } catch (err) { setError('Eroare la marcarea prezenței'); } finally { setLoading(false); }
    });
  };

  const computeFinalStatus = (prezenta1, prezenta2, prezenta3) => {
    const totalPrezente = [prezenta1, prezenta2, prezenta3].filter(v => v === true).length;
    if (totalPrezente === 3) return LEAD_STATUS.COMPLET_3_SESIUNI;
    if (totalPrezente === 2) return LEAD_STATUS.COMPLET_2_SESIUNI;
    if (totalPrezente === 1) return LEAD_STATUS.COMPLET_SESIUNE_1;
    return LEAD_STATUS.NEALOCAT;
  };

  const getCompletedSession3TimeLeftMs = (lead, nowTs = Date.now()) => {
    if (!lead || lead.status !== LEAD_STATUS.COMPLET_3_SESIUNI || lead.prezenta3 !== true || !lead.dataOneToTwenty) return null;
    const completedAtMs = new Date(lead.dataOneToTwenty).getTime();
    if (Number.isNaN(completedAtMs)) return null;
    return Math.max(0, COMPLETED_3_SESSIONS_HIDE_MS - (nowTs - completedAtMs));
  };

  const handleSession2Prezent = async (leadId) => {
    showConfirmDialog('Prezent Sesiune 2', 'Marcheaзă leadul ca PREZENT la Sesiunea 2?', async () => {
      setLoading(true);
      try {
        await supabase.from('leaduri').update({
          prezenta2: true,
          status: LEAD_STATUS.IN_PROGRAM,
          dataOneToTwenty: new Date().toISOString()
        }).eq('id', leadId);
        await fetchLeaduri(); setSuccess('Lead marcat ca Prezent la Sesiunea 2. Continuă cu Sesiunea 3.');
      } catch (err) { setError('Eroare la marcarea prezenței'); } finally { setLoading(false); }
    });
  };

  const handleSession2NoShow = async (leadId) => {
    showConfirmDialog('No-Show Sesiune 2', 'Marcheaзă leadul ca NO-SHOW la Sesiunea 2?', async () => {
      setLoading(true);
      try {
        await supabase.from('leaduri').update({
          prezenta2: false,
          status: LEAD_STATUS.IN_PROGRAM,
          dataOneToTwenty: new Date().toISOString()
        }).eq('id', leadId);
        await fetchLeaduri();
        setSuccess('Lead marcat ca No-Show la Sesiunea 2. Continuă cu Sesiunea 3.');
      } catch (err) { setError('Eroare la marcarea prezenței'); } finally { setLoading(false); }
    });
  };

  const handleSession3Prezent = async (leadId) => {
    showConfirmDialog('Prezent Sesiune 3', 'Marcheaзă leadul ca PREZENT la Sesiunea 3? Aceasta finalizează programul.', async () => {
      setLoading(true);
      try {
        const lead = leaduri.find(l => l.id === leadId);
        if (!lead) throw new Error('Lead negăsit');
        const finalStatus = computeFinalStatus(lead.prezenta1, lead.prezenta2, true);
        await supabase.from('leaduri').update({
          prezenta3: true,
          status: finalStatus,
          dataOneToTwenty: new Date().toISOString()
        }).eq('id', leadId);
        await fetchLeaduri(); setSuccess('Lead marcat ca Prezent la Sesiunea 3. Program finalizat!');
      } catch (err) { setError('Eroare la marcarea prezenței'); } finally { setLoading(false); }
    });
  };

  const handleSession3NoShow = async (leadId) => {
    showConfirmDialog('No-Show Sesiune 3', 'Marcheaзă leadul ca NO-SHOW la Sesiunea 3? Aceasta finalizează programul.', async () => {
      setLoading(true);
      try {
        const lead = leaduri.find(l => l.id === leadId);
        if (!lead) throw new Error('Lead negăsit');
        const finalStatus = computeFinalStatus(lead.prezenta1, lead.prezenta2, false);
        const updates = {
          prezenta3: false,
          status: finalStatus,
          dataOneToTwenty: new Date().toISOString()
        };
        if (finalStatus === LEAD_STATUS.NEALOCAT) {
          updates.mentorAlocat = null;
          updates.prezenta1 = null;
          updates.prezenta2 = null;
          updates.prezenta3 = null;
          updates.dataAlocare = null;
          updates.dataConfirmare = null;
          updates.emailTrimis = false;
          updates.dataTimeout = null;
          updates.numarReAlocari = (lead.numarReAlocari || 0) + 1;
        }
        await supabase.from('leaduri').update(updates).eq('id', leadId);
        await fetchLeaduri();
        setSuccess(finalStatus === LEAD_STATUS.NEALOCAT
          ? 'No-Show la toate sesiunile — leadul va fi disponibil pentru re-alocare.'
          : 'Lead marcat la Sesiunea 3. Program finalizat.');
      } catch (err) { setError('Eroare la marcarea prezenței'); } finally { setLoading(false); }
    });
  };

  const handleEditAttendance = async (leadId, session, newValue) => {
    setLoading(true);
    try {
      const lead = leaduri.find(l => l.id === leadId);
      if (!lead) throw new Error('Lead negăsit');
      const updates = {};
      if (session === 1) {
        updates.prezenta1 = newValue;
        if (lead.prezenta3 != null) {
          updates.status = computeFinalStatus(newValue, lead.prezenta2, lead.prezenta3);
        } else if (lead.prezenta2 != null) {
          updates.status = LEAD_STATUS.IN_PROGRAM;
        }
      } else if (session === 2) {
        updates.prezenta2 = newValue;
        if (lead.prezenta3 != null) {
          updates.status = computeFinalStatus(lead.prezenta1, newValue, lead.prezenta3);
        } else {
          updates.status = LEAD_STATUS.IN_PROGRAM;
        }
      } else {
        updates.prezenta3 = newValue;
        updates.status = computeFinalStatus(lead.prezenta1, lead.prezenta2, newValue);
        if (updates.status !== LEAD_STATUS.NEALOCAT) {
          updates.dataOneToTwenty = new Date().toISOString();
        }
      }
      await supabase.from('leaduri').update(updates).eq('id', leadId);
      await fetchLeaduri();
      setSuccess('Prezența a fost corectată cu succes!');
    } catch (err) { setError('Eroare la editarea prezenței: ' + (err.message || '')); } finally { setLoading(false); }
  };

  const handleReallocateLead = async (leadId) => {
    showConfirmDialog("Re-alocare", "Re-aloca acest lead catre alt mentor disponibil?", async () => {
      setLoading(true);
      try {
        const lead = leaduri.find(l => l.id === leadId);
        if (!lead) { setError("Lead negasit"); return; }
        const mentDisp = mentoriData.filter(m => {
          const leadCnt = m.leaduriAlocate || 0;
          return m.id !== lead.mentorAlocat && leadCnt < 30 && m.available && !m.manuallyDisabled;
        }).sort((a, b) => a.ordineCoada - b.ordineCoada);
        if (mentDisp.length === 0) { setError("Nu exista mentori disponibili"); setLoading(false); return; }
        const mentorNou = mentDisp[0];
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
        await supabase.from("mentori").update({ leaduriAlocate: (mentorNou.leaduriAlocate || 0) + 1 }).eq("id", mentorNou.id);
        await fetchAllData(); setSuccess('Lead re-alocat catre ' + mentorNou.nume + '!');
      } catch (err) { setError("Eroare la re-alocarea leadului"); } finally { setLoading(false); }
    });
  };

  const stergeLeaduri = () => {
    showConfirmDialog("Stergere Totala", "Esti sigur ca vrei sa stergi TOATE leadurile?", async () => {
      setLoading(true);
      try {
        await supabase.from("leaduri").delete().neq("id", "00000000-0000-0000-0000-000000000000");
        await supabase.from("alocari").delete().neq("id", "00000000-0000-0000-0000-000000000000");
        for (const m of mentoriData) await supabase.from("mentori").update({ leaduriAlocate: 0, available: true }).eq("id", m.id);
        await fetchAllData(); setSuccess("Toate leadurile au fost sterse si mentorii resetati!");
      } catch (err) { setError("Eroare la stergerea leadurilor"); } finally { setLoading(false); }
    });
  };

  const stergeLaeduriMentor = (alocare) => {
    showConfirmDialog("Stergere Leaduri Mentor", 'Stergi toate cele ' + alocare.numarLeaduri + ' leaduri ale mentorului ' + alocare.mentorNume + '?', async () => {
      setLoading(true);
      try {
        await supabase.from("leaduri").delete().eq("mentorAlocat", alocare.mentorId);
        await supabase.from("alocari").delete().eq("mentorId", alocare.mentorId);
        const mentorDB = mentoriData.find(x => x.id === alocare.mentorId);
        if (mentorDB) await supabase.from("mentori").update({ leaduriAlocate: 0, available: true }).eq("id", alocare.mentorId);
        await fetchAllData(); 
        setSuccess('Leadurile mentorului ' + alocare.mentorNume + ' au fost sterse!');
      } catch (err) { 
        console.error("Eroare la stergerea leadurilor:", err);
        setError("Eroare la stergerea leadurilor mentorului"); 
      } finally { setLoading(false); }
    });
  };

  const dezalocaLeadSingular = (lead) => {
    showConfirmDialog(
      'Dezalocare Lead',
      `Dezaloci leadul "${lead.nume}" de la mentorul său? Leadul va reveni cu status NEALOCAT.`,
      async () => {
        setLoading(true);
        try {
          // Scoate lead-ul din alocare
          if (lead.alocareId) {
            const alocare = alocariActive.find(a => a.id === lead.alocareId);
            if (alocare) {
              const leaduriRamase = alocare.leaduri.filter(id => id !== lead.id);
              if (leaduriRamase.length === 0) {
                await supabase.from('alocari').delete().eq('id', lead.alocareId);
              } else {
                await supabase.from('alocari').update({
                  numarLeaduri: leaduriRamase.length,
                  leaduri: leaduriRamase,
                  ultimaActualizare: new Date().toISOString()
                }).eq('id', lead.alocareId);
              }
            }
          }
          // Resetează lead-ul
          await supabase.from('leaduri').update({
            status: LEAD_STATUS.NEALOCAT,
            mentorAlocat: null,
            dataAlocare: null,
            dataTimeout: null,
            dataConfirmare: null,
            emailTrimis: false,
            alocareId: null
          }).eq('id', lead.id);
          await fetchAllData();
          setSuccess(`Leadul "${lead.nume}" a fost dezalocat cu succes!`);
        } catch (err) {
          setError('Eroare la dezalocarea leadului: ' + (err.message || ''));
        } finally { setLoading(false); }
      }
    );
  };

  const dezalocaLeaduriMentor = (alocare) => {
    showConfirmDialog("Dezalocare Leaduri", 'Dezaloci toate cele ' + alocare.numarLeaduri + ' leaduri ale mentorului ' + alocare.mentorNume + '? Leadurile vor ramane in sistem cu status NEALOCAT.', async () => {
      setLoading(true);
      try {
        await supabase.from("leaduri").update({
          status: LEAD_STATUS.NEALOCAT, mentorAlocat: null, dataAlocare: null,
          dataTimeout: null, dataConfirmare: null, emailTrimis: false, alocareId: null
        }).eq("mentorAlocat", alocare.mentorId);
        await supabase.from("alocari").delete().eq("mentorId", alocare.mentorId);
        const mentorDB = mentoriData.find(x => x.id === alocare.mentorId);
        if (mentorDB) await supabase.from("mentori").update({ leaduriAlocate: 0, available: true }).eq("id", alocare.mentorId);
        await fetchAllData(); 
        setSuccess(alocare.numarLeaduri + ' leaduri dezalocate de la ' + alocare.mentorNume + '! Leadurile sunt acum nealocate.');
      } catch (err) { 
        console.error("Eroare la dezalocarea leadurilor:", err);
        setError("Eroare la dezalocarea leadurilor mentorului"); 
      } finally { setLoading(false); }
    });
  };

  const exportToExcel = async () => {
    try {
      const ExcelJS = (await import('exceljs')).default;

      const getMentorNume = (lead) => {
        const mentorInfo = MENTORI_DISPONIBILI.find(m => m.id === lead.mentorAlocat);
        const mentor = mentoriData.find(m => m.id === lead.mentorAlocat);
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
    setEditLeadData({ nume: lead.nume, telefon: lead.telefon, email: lead.email });
  };

  const handleSaveEditLead = async (leadId) => {
    if (!editLeadData.nume || !editLeadData.telefon || !editLeadData.email) { setError("Toate campurile sunt obligatorii"); return; }
    setLoading(true); setError(""); setSuccess("");
    try {
      await supabase.from("leaduri").update({ nume: editLeadData.nume.trim(), telefon: editLeadData.telefon.trim(), email: editLeadData.email.trim() }).eq("id", leadId);
      setSuccess("Lead actualizat cu succes!"); setEditingLead(null); await fetchLeaduri();
    } catch (err) { setError("Eroare la actualizarea leadului"); } finally { setLoading(false); }
  };

  const handleCancelEdit = () => { setEditingLead(null); setEditLeadData({ nume: '', telefon: '', email: '' }); };

  const handleDeleteLead = (lead) => {
    showConfirmDialog("Stergere Lead", 'Stergi leadul "' + lead.nume + '"?', async () => {
      setLoading(true);
      try {
        await supabase.from("leaduri").delete().eq("id", lead.id);
        if (lead.status === 'alocat' && lead.mentorAlocat) {
          const m = mentoriData.find(x => x.id === lead.mentorAlocat);
          if (m) await supabase.from("mentori").update({ leaduriAlocate: Math.max(0, (m.leaduriAlocate || 0) - 1) }).eq("id", lead.mentorAlocat);
          if (lead.alocareId) {
            const aloc = alocariActive.find(a => a.id === lead.alocareId);
            if (aloc) {
              const rem = aloc.leaduri.filter(id => id !== lead.id);
              if (rem.length === 0) await supabase.from("alocari").delete().eq("id", lead.alocareId);
              else await supabase.from("alocari").update({ leaduri: rem, numarLeaduri: rem.length }).eq("id", lead.alocareId);
            }
          }
        }
        setSuccess('Lead "' + lead.nume + '" sters!'); await fetchAllData();
      } catch (err) { setError("Eroare la stergerea leadului"); } finally { setLoading(false); }
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
      return leadCnt < 30 && (m.available || (leadCnt >= 20 && leadCnt < 30)) && !m.manuallyDisabled;
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
        dezalocaLeaduriMentor={dezalocaLeaduriMentor} dezalocaLeadSingular={dezalocaLeadSingular} stergeLaeduriMentor={stergeLaeduriMentor}
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
        handleConfirmDate={handleConfirmDate} setShowDateModal={setShowDateModal}
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
      handleConfirmDate={handleConfirmDate} setShowDateModal={setShowDateModal}
      selectedMentorForDate={selectedMentorForDate} setSelectedMentorForDate={setSelectedMentorForDate}
      showModal={showModal} modalConfig={modalConfig} closeModal={closeModal} handleModalConfirm={handleModalConfirm}
    />
  );
}
