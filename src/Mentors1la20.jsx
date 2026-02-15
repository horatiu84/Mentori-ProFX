/* eslint-disable no-unused-vars */
import React, { useState, useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { Input } from "./components/ui/input";
import { Card, CardContent } from "./components/ui/card";
import logo from "./logo2.png";
import { collection, addDoc, updateDoc, deleteDoc, doc, Timestamp, getDocs, query, orderBy, setDoc, getDoc } from "firebase/firestore";
import { db } from "./firebase";
// ExcelJS se încarcă lazy doar când e nevoie (import/export)

// ==================== CONSTANTE ====================

const formatDate = (createdAt) => {
  if (!createdAt) return "N/A";
  if (createdAt.toDate) return createdAt.toDate().toLocaleString('ro-RO', { timeZone: 'Europe/Bucharest' });
  try {
    return new Date(createdAt).toLocaleString('ro-RO', { timeZone: 'Europe/Bucharest' });
  } catch {
    return "N/A";
  }
};

const MENTORI_DISPONIBILI = [
  { id: 'sergiu', nume: 'Sergiu' },
  { id: 'eli', nume: 'Eli' },
  { id: 'dan', nume: 'Dan' },
  { id: 'tudor', nume: 'Tudor' },
  { id: 'adrian', nume: 'Adrian' }
];

const MENTOR_PHOTOS = {
  sergiu: '/mentori/Sergiu.jpg',
  eli: '/mentori/Eli.jpg',
  dan: '/mentori/Dan.jpg',
  tudor: '/mentori/Tudor.jpg',
  adrian: '/mentori/Adrian.jpg'
};

const LEAD_STATUS = {
  NEALOCAT: 'nealocat',
  ALOCAT: 'alocat',
  CONFIRMAT: 'confirmat',
  NECONFIRMAT: 'neconfirmat',
  NO_SHOW: 'no_show',
  COMPLET: 'complet'
};

const ONE_TO_TWENTY_STATUS = {
  PENDING: 'pending',
  CONFIRMED: 'confirmed',
  NO_SHOW: 'no_show',
  COMPLETED: 'completed'
};

const TIMEOUT_6H = 6 * 60 * 60 * 1000;

const checkLeadTimeout = (lead) => {
  if (lead.status !== LEAD_STATUS.ALOCAT) return false;
  // Timeout-ul \u00eencepe doar dac\u0103 emailul a fost trimis (dataTimeout este setat)
  if (!lead.dataTimeout) return false;
  const dataTimeout = lead.dataTimeout.toDate ? lead.dataTimeout.toDate() : new Date(lead.dataTimeout);
  const now = new Date();
  return now >= dataTimeout;
};

const getTimeUntilTimeout = (lead) => {
  // Dac\u0103 emailul nu a fost trimis \u00eenc\u0103, nu exist\u0103 timeout
  if (!lead.dataTimeout) return null;
  const dataTimeout = lead.dataTimeout.toDate ? lead.dataTimeout.toDate() : new Date(lead.dataTimeout);
  const now = new Date();
  const minutesLeft = Math.floor((dataTimeout - now) / (1000 * 60));
  return minutesLeft > 0 ? minutesLeft : 0;
};

const formatTimeRemaining = (minutes) => {
  if (minutes === null) return '';
  if (minutes <= 0) return 'Expirat';
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  return hours > 0 ? hours + 'h ' + mins + 'm' : mins + 'm';
};

const getStatusBadge = (status) => {
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
      return { bg: 'bg-purple-500/20 border-purple-500/50 text-purple-300', label: 'Complet' };
    default:
      return { bg: 'bg-gray-500/20 border-gray-500/50 text-gray-300', label: status };
  }
};

export default function Mentori1La20() {
  const navigate = useNavigate();

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
  const [showModal, setShowModal] = useState(false);
  const [modalConfig, setModalConfig] = useState({ type: 'alert', title: '', message: '', onConfirm: null });
  const [mentorSearchQuery, setMentorSearchQuery] = useState('');
  const [mentorSortBy, setMentorSortBy] = useState('data-desc');
  const [mentorCurrentPage, setMentorCurrentPage] = useState(1);
  const [showEmailPreview, setShowEmailPreview] = useState(false);
  const [selectedLeadForEmail, setSelectedLeadForEmail] = useState(null);
  const [emailContent, setEmailContent] = useState({ subject: '', body: '' });
  const [showAdminEmailModal, setShowAdminEmailModal] = useState(false);
  const [selectedMentorForEmail, setSelectedMentorForEmail] = useState(null);
  const [bulkEmailPreview, setBulkEmailPreview] = useState(null);
  const isAutoAllocatingRef = useRef(false);
  const lastAutoAllocCheckRef = useRef(0);

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

  // Verificăm autentificarea din localStorage la încărcarea componentei
  useEffect(() => {
    const authData = localStorage.getItem('isAuthenticated');
    if (authData === 'true') {
      // Restaurăm datele utilizatorului din localStorage
      setIsAuthenticated(true);
      setCurrentMentor(localStorage.getItem('currentUser') || '');
      setCurrentRole(localStorage.getItem('currentRole') || '');
      setCurrentMentorId(localStorage.getItem('currentMentorId') || null);
    }
  }, []);

  useEffect(() => {
    if (isAuthenticated) { fetchAllData(); }
  }, [isAuthenticated]);

  // Auto-alocă leaduri când datele se schimbă
  useEffect(() => {
    const now = Date.now();
    const timeSinceLastCheck = now - lastAutoAllocCheckRef.current;
    
    // Rulează verificarea doar dacă au trecut mai mult de 3 secunde de la ultima verificare
    if (isAuthenticated && leaduri.length > 0 && mentoriData.length > 0 && !loadingData && !isAutoAllocatingRef.current && timeSinceLastCheck > 3000) {
      const verificaAutoAlocare = async () => {
        isAutoAllocatingRef.current = true;
        lastAutoAllocCheckRef.current = Date.now();
        
        const modificari = await checkAndAutoAllocate();
        
        // Dacă s-au făcut modificări, reîmprospătează datele după un mic delay
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
  }, [leaduri, mentoriData, isAuthenticated, loadingData]);

  const fetchAllData = async () => {
    setLoadingData(true);
    await Promise.all([fetchMentori(), fetchLeaduri(), fetchAlocari()]);
    setLoadingData(false);
  };

  const fetchMentori = async () => {
    try {
      const mentoriSnapshot = await getDocs(collection(db, "mentori"));
      let mentoriList = mentoriSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      if (mentoriList.length === 0) { await initializeMentori(); return; }
      
      // Sincronizează numărul real de leaduri pentru fiecare mentor
      const leaduriSnapshot = await getDocs(collection(db, "leaduri"));
      const toateLeadurile = leaduriSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      
      for (const mentor of mentoriList) {
        // Calculează numărul real de leaduri alocate acestui mentor
        const leaduriRealeMentor = toateLeadurile.filter(l => l.mentorAlocat === mentor.id).length;
        
        // Actualizează doar dacă e diferit
        if ((mentor.leaduriAlocate || 0) !== leaduriRealeMentor) {
          await updateDoc(doc(db, "mentori", mentor.id), { 
            leaduriAlocate: leaduriRealeMentor,
            available: leaduriRealeMentor >= 30 ? false : mentor.available
          });
        } else if (mentor.available && leaduriRealeMentor >= 30) {
          await updateDoc(doc(db, "mentori", mentor.id), { available: false });
        } else if (!mentor.available && leaduriRealeMentor < 30) {
          // Reactivează mentorul dacă are mai puțin de 30 leaduri
          await updateDoc(doc(db, "mentori", mentor.id), { available: true });
        }
      }
      
      const updatedSnapshot = await getDocs(collection(db, "mentori"));
      setMentoriData(updatedSnapshot.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) { console.error("Eroare fetch mentori:", err); }
  };

  const initializeMentori = async () => {
    try {
      const mentoriInit = [];
      for (let i = 0; i < MENTORI_DISPONIBILI.length; i++) {
        const mentor = MENTORI_DISPONIBILI[i];
        await setDoc(doc(db, "mentori", mentor.id), {
          nume: mentor.nume, available: true, ultimulOneToTwenty: null,
          ordineCoada: i, leaduriAlocate: 0, createdAt: Timestamp.now()
        });
        mentoriInit.push({ id: mentor.id, nume: mentor.nume, available: true, ultimulOneToTwenty: null, ordineCoada: i, leaduriAlocate: 0 });
      }
      setMentoriData(mentoriInit);
      setSuccess("Mentori initializati cu succes!");
    } catch (err) { setError("Eroare la initializarea mentorilor"); }
  };

  const fetchLeaduri = async () => {
    try {
      const snap = await getDocs(query(collection(db, "leaduri"), orderBy("createdAt", "desc")));
      const list = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      let expired = 0;
      for (const lead of list) {
        if (checkLeadTimeout(lead)) {
          expired++;
          await updateDoc(doc(db, "leaduri", lead.id), {
            status: LEAD_STATUS.NECONFIRMAT, motivNeconfirmare: 'Timeout 6h', dataTimeout: Timestamp.now()
          });
        }
      }
      if (expired > 0) {
        const snap2 = await getDocs(query(collection(db, "leaduri"), orderBy("createdAt", "desc")));
        setLeaduri(snap2.docs.map(d => ({ id: d.id, ...d.data() })));
      } else { setLeaduri(list); }
    } catch (err) { setError("Eroare la incarcarea leadurilor"); }
  };

  const fetchAlocari = async () => {
    try {
      const snap = await getDocs(collection(db, "alocari"));
      const alocariList = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      
      // Încarcă toate leadurile pentru sincronizare
      const leaduriSnapshot = await getDocs(collection(db, "leaduri"));
      const toateLeadurile = leaduriSnapshot.docs.map(d => ({ id: d.id, ...d.data() }));
      
      // Sincronizează fiecare alocare cu realitatea
      for (const alocare of alocariList) {
        // Găsește leadurile reale care aparțin acestei alocări
        const leaduriReale = toateLeadurile.filter(l => 
          alocare.leaduri && alocare.leaduri.includes(l.id)
        );
        
        const numarRealDeLeaduri = leaduriReale.length;
        
        // Dacă numărul e diferit, actualizează în DB
        if (alocare.numarLeaduri !== numarRealDeLeaduri || alocare.leaduri.length !== numarRealDeLeaduri) {
          const leaduriIdReale = leaduriReale.map(l => l.id);
          await updateDoc(doc(db, "alocari", alocare.id), {
            numarLeaduri: numarRealDeLeaduri,
            leaduri: leaduriIdReale,
            ultimaActualizare: Timestamp.now()
          });
        }
        
        // Șterge alocările goale
        if (numarRealDeLeaduri === 0) {
          await deleteDoc(doc(db, "alocari", alocare.id));
        }
      }
      
      // Re-încarcă alocările după sincronizare
      const snap2 = await getDocs(collection(db, "alocari"));
      setAlocariActive(snap2.docs.map(d => ({ id: d.id, ...d.data() })));
    } catch (err) { console.error("Eroare fetch alocari:", err); }
  };

  const handleLogout = () => {
    setIsAuthenticated(false); 
    setCurrentMentor(null); 
    setCurrentRole(null);
    setCurrentMentorId(null);
    // Curățăm toate datele de autentificare din localStorage
    localStorage.removeItem('isAuthenticated');
    localStorage.removeItem('currentUser');
    localStorage.removeItem('currentRole');
    localStorage.removeItem('currentMentorId');
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
              numarReAlocari: 0, istoricMentori: [], createdAt: Timestamp.now() };
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
      for (const lead of leaduriNoi) await addDoc(collection(db, "leaduri"), lead);
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
      await addDoc(collection(db, "leaduri"), {
        nume: manualLead.nume.trim(), telefon: manualLead.telefon.trim(), email: manualLead.email.trim(),
        status: LEAD_STATUS.NEALOCAT, mentorAlocat: null, dataAlocare: null, dataConfirmare: null,
        dataTimeout: null, statusOneToTwenty: ONE_TO_TWENTY_STATUS.PENDING, dataOneToTwenty: null,
        numarReAlocari: 0, istoricMentori: [], createdAt: Timestamp.now()
      });
      setSuccess('Lead "' + manualLead.nume + '" adaugat cu succes!');
      setManualLead({ nume: '', telefon: '', email: '' }); await fetchLeaduri();
    } catch (err) { setError("Eroare la adaugarea leadului"); }
    finally { setLoading(false); }
  };

  // Funcție silențioasă pentru alocare automată (fără loading UI)
  const checkAndAutoAllocate = async () => {
    let modificari = false;
    
    try {
      // PRIORITATE 1: Realocă IMEDIAT leadurile neconfirmate, chiar dacă sunt sub 20
      const leaduriNeconfirmate = leaduri.filter(l => l.status === LEAD_STATUS.NECONFIRMAT);
      
      if (leaduriNeconfirmate.length > 0) {
        console.log(`🔄 Găsite ${leaduriNeconfirmate.length} leaduri neconfirmate - se realocă automat...`);
        modificari = true;
        
        // Pentru fiecare lead neconfirmat, găsește următorul mentor disponibil
        for (const lead of leaduriNeconfirmate) {
          const mentoriSortati = [...mentoriData].sort((a, b) => a.ordineCoada - b.ordineCoada);
          const mentorActual = lead.mentorAlocat;
          
          // Găsește următorul mentor eligibil (diferit de cel actual și cu < 30 leaduri)
          const mentorNou = mentoriSortati.find(m => {
            const leadCnt = m.leaduriAlocate || 0;
            return m.id !== mentorActual && leadCnt < 30 && (m.available || (leadCnt >= 20 && leadCnt < 30));
          });
          
          if (!mentorNou) {
            console.warn(`⚠️ Nu există mentor disponibil pentru "${lead.nume}"`);
            continue;
          }
          
          const mentorInfo = MENTORI_DISPONIBILI.find(m => m.id === mentorNou.id);
          const mentorNume = mentorInfo ? mentorInfo.nume : mentorNou.id;
          
          // Șterge lead-ul din alocarea veche (dacă există)
          if (lead.alocareId) {
            const alocareVeche = alocariActive.find(a => a.id === lead.alocareId);
            if (alocareVeche) {
              const leaduriRamase = alocareVeche.leaduri.filter(id => id !== lead.id);
              if (leaduriRamase.length === 0) {
                await deleteDoc(doc(db, "alocari", lead.alocareId));
              } else {
                await updateDoc(doc(db, "alocari", lead.alocareId), {
                  numarLeaduri: leaduriRamase.length,
                  leaduri: leaduriRamase,
                  ultimaActualizare: Timestamp.now()
                });
              }
            }
          }
          
          // Actualizează lead-ul pentru noua alocare
          const alocareExistenta = alocariActive.find(a => a.mentorId === mentorNou.id && a.status === 'activa');
          let alocRef;
          
          if (alocareExistenta) {
            const leaduriActualizate = [...alocareExistenta.leaduri, lead.id];
            await updateDoc(doc(db, "alocari", alocareExistenta.id), {
              numarLeaduri: leaduriActualizate.length,
              leaduri: leaduriActualizate,
              ultimaActualizare: Timestamp.now()
            });
            alocRef = { id: alocareExistenta.id };
          } else {
            alocRef = await addDoc(collection(db, "alocari"), {
              mentorId: mentorNou.id,
              mentorNume: mentorNume,
              numarLeaduri: 1,
              leaduri: [lead.id],
              createdAt: Timestamp.now(),
              status: 'activa'
            });
          }
          
          const da = Timestamp.now();
          await updateDoc(doc(db, "leaduri", lead.id), {
            status: LEAD_STATUS.ALOCAT,
            mentorAlocat: mentorNou.id,
            alocareId: alocRef.id,
            dataAlocare: da,
            dataTimeout: null,
            emailTrimis: false,
            istoricMentori: [...(lead.istoricMentori || []), mentorNou.id],
            numarReAlocari: (lead.numarReAlocari || 0) + 1,
            motivNeconfirmare: null
          });
          
          // Actualizează contorul de leaduri pentru mentorul nou
          await updateDoc(doc(db, "mentori", mentorNou.id), {
            leaduriAlocate: (mentorNou.leaduriAlocate || 0) + 1
          });
          
          console.log(`✅ Re-alocare automată: Lead "${lead.nume}" de la ${mentorActual} -> ${mentorNume}`);
        }
      }
      
      // PRIORITATE 2: Alocă leadurile nealocate DOAR dacă sunt minim 20
      const leaduriNealocate = leaduri.filter(l => l.status === LEAD_STATUS.NEALOCAT);
      
      if (leaduriNealocate.length >= 20) {
        // Găsește mentor eligibil (trebuie să aibă mai puțin de 30 leaduri)
        const mentoriSortati = [...mentoriData].sort((a, b) => a.ordineCoada - b.ordineCoada);
        const mentorEligibil = mentoriSortati.find(m => {
          const leadCnt = m.leaduriAlocate || 0;
          // Mentor eligibil: are < 30 leaduri ȘI (este disponibil SAU are deja 20-29 leaduri)
          return leadCnt < 30 && (m.available || (leadCnt >= 20 && leadCnt < 30));
        });
        
        if (mentorEligibil) {
          console.log(`🔄 Găsite ${leaduriNealocate.length} leaduri nealocate - se alocă automat...`);
          modificari = true;
          
          const leadCntActual = mentorEligibil.leaduriAlocate || 0;
          const spatDisponibil = 30 - leadCntActual;
          
          let nrDeAlocat;
          if (leadCntActual === 0) {
            nrDeAlocat = Math.min(30, leaduriNealocate.length);
          } else if (leadCntActual >= 20 && leadCntActual < 30) {
            nrDeAlocat = Math.min(spatDisponibil, leaduriNealocate.length);
          } else {
            return modificari;
          }
          
          const batch = leaduriNealocate.slice(0, nrDeAlocat);
          const mentorInfo = MENTORI_DISPONIBILI.find(m => m.id === mentorEligibil.id);
          const mentorNume = mentorInfo ? mentorInfo.nume : mentorEligibil.id;
          
          const alocareExistenta = alocariActive.find(a => a.mentorId === mentorEligibil.id && a.status === 'activa');
          let alocRef;
          
          if (alocareExistenta) {
            const leaduriActualizate = [...alocareExistenta.leaduri, ...batch.map(l => l.id)];
            await updateDoc(doc(db, "alocari", alocareExistenta.id), {
              numarLeaduri: leaduriActualizate.length,
              leaduri: leaduriActualizate,
              ultimaActualizare: Timestamp.now()
            });
            alocRef = { id: alocareExistenta.id };
          } else {
            alocRef = await addDoc(collection(db, "alocari"), {
              mentorId: mentorEligibil.id, 
              mentorNume: mentorNume, 
              numarLeaduri: nrDeAlocat,
              leaduri: batch.map(l => l.id), 
              createdAt: Timestamp.now(), 
              status: 'activa'
            });
          }
          
          const da = Timestamp.now();
          
          for (const lead of batch) {
            await updateDoc(doc(db, "leaduri", lead.id), {
              status: LEAD_STATUS.ALOCAT, 
              mentorAlocat: mentorEligibil.id, 
              alocareId: alocRef.id,
              dataAlocare: da, 
              dataTimeout: null,
              emailTrimis: false,
              istoricMentori: [...(lead.istoricMentori || []), mentorEligibil.id],
              numarReAlocari: 0
            });
          }
          
          const nuLeaduriTotale = leadCntActual + nrDeAlocat;
          await updateDoc(doc(db, "mentori", mentorEligibil.id), {
            leaduriAlocate: nuLeaduriTotale,
            available: nuLeaduriTotale >= 30 ? false : mentorEligibil.available
          });
          
          console.log(`✅ Auto-alocare: ${nrDeAlocat} leaduri nealocate către ${mentorNume}. Total: ${nuLeaduriTotale}/30`);
        }
      }
      
      return modificari;
    } catch (err) {
      console.error("❌ Eroare la alocarea automată:", err);
      return modificari;
    }
  };

  const alocaLeaduriAutomata = async () => {
    setLoading(true); setError(""); setSuccess("");
    try {
      // Lucrăm doar cu leadurile nealocate (cele neconfirmate se realocă automat)
      const nealoc = leaduri.filter(l => l.status === LEAD_STATUS.NEALOCAT);
      if (nealoc.length === 0) { setError('Nu exista leaduri nealocate'); setLoading(false); return; }
      
      // Sortăm mentorii după ordineCoada
      const mentoriSortati = [...mentoriData].sort((a, b) => a.ordineCoada - b.ordineCoada);
      
      // Găsim primul mentor eligibil (trebuie să aibă mai puțin de 30 leaduri)
      const mentorEligibil = mentoriSortati.find(m => {
        const leadCnt = m.leaduriAlocate || 0;
        // Mentor eligibil: are < 30 leaduri ȘI (este disponibil SAU are deja 20-29 leaduri)
        return leadCnt < 30 && (m.available || (leadCnt >= 20 && leadCnt < 30));
      });
      
      if (!mentorEligibil) { 
        setError("Nu exista mentori disponibili. Trebuie ca mentorul sa fie activat sau sa aiba intre 20-29 leaduri."); 
        setLoading(false); 
        return; 
      }
      
      const leadCntActual = mentorEligibil.leaduriAlocate || 0;
      
      // Dacă mentorul e nou (0 leaduri), trebuie minim 20 leaduri
      if (leadCntActual === 0 && nealoc.length < 20) {
        setError('Pentru un mentor nou, minimul este 20 leaduri. Disponibile: ' + nealoc.length);
        setLoading(false);
        return;
      }
      
      // Calculăm câte leaduri putem aloca
      const spatDisponibil = 30 - leadCntActual;
      let nrDeAlocat;
      
      if (leadCntActual === 0) {
        // Mentor nou: minim 20, maxim 30
        nrDeAlocat = Math.min(30, nealoc.length);
      } else if (leadCntActual >= 20 && leadCntActual < 30) {
        // Mentor cu 20-29: poate primi orice număr până la 30
        nrDeAlocat = Math.min(spatDisponibil, nealoc.length);
      } else {
        setError('Mentorul selectat nu poate primi mai multe leaduri');
        setLoading(false);
        return;
      }
      
      const batch = nealoc.slice(0, nrDeAlocat);
      const mentorInfo = MENTORI_DISPONIBILI.find(m => m.id === mentorEligibil.id);
      const mentorNume = mentorInfo ? mentorInfo.nume : mentorEligibil.id;
      
      // Verificăm dacă mentorul are deja o alocare activă
      const alocareExistenta = alocariActive.find(a => a.mentorId === mentorEligibil.id && a.status === 'activa');
      let alocRef;
      
      if (alocareExistenta) {
        // Actualizăm alocarea existentă
        const leaduriActualizate = [...alocareExistenta.leaduri, ...batch.map(l => l.id)];
        await updateDoc(doc(db, "alocari", alocareExistenta.id), {
          numarLeaduri: leaduriActualizate.length,
          leaduri: leaduriActualizate,
          ultimaActualizare: Timestamp.now()
        });
        alocRef = { id: alocareExistenta.id };
      } else {
        // Creăm o alocare nouă
        alocRef = await addDoc(collection(db, "alocari"), {
          mentorId: mentorEligibil.id, 
          mentorNume: mentorNume, 
          numarLeaduri: nrDeAlocat,
          leaduri: batch.map(l => l.id), 
          createdAt: Timestamp.now(), 
          status: 'activa'
        });
      }
      
      // NU setăm dataTimeout aici - va fi setat când se trimite emailul
      const da = Timestamp.now();
      
      for (const lead of batch) {
        await updateDoc(doc(db, "leaduri", lead.id), {
          status: LEAD_STATUS.ALOCAT, 
          mentorAlocat: mentorEligibil.id, 
          alocareId: alocRef.id,
          dataAlocare: da, 
          dataTimeout: null, // Timeout-ul va fi setat când se trimite emailul
          emailTrimis: false,
          istoricMentori: [...(lead.istoricMentori || []), mentorEligibil.id],
          numarReAlocari: 0 // Leadurile nealocate sunt prima alocare
        });
      }
      
      const nuLeaduriTotale = leadCntActual + nrDeAlocat;
      await updateDoc(doc(db, "mentori", mentorEligibil.id), {
        leaduriAlocate: nuLeaduriTotale,
        available: nuLeaduriTotale >= 30 ? false : mentorEligibil.available
      });
      
      await fetchAllData();
      setSuccess(`Alocate ${nrDeAlocat} leaduri catre ${mentorNume}! Total mentor: ${nuLeaduriTotale}/30. Nealocate: ${nealoc.length - nrDeAlocat}`);
    } catch (err) { 
      console.error("Eroare la alocarea automata:", err);
      setError("Eroare la alocarea automata: " + (err.message || "")); 
    }
    finally { setLoading(false); }
  };

  const toggleMentorAvailability = async (mentorId, currentStatus) => {
    try {
      await updateDoc(doc(db, "mentori", mentorId), { available: !currentStatus });
      await fetchMentori(); setSuccess("Status mentor actualizat!");
    } catch (err) { setError("Eroare la actualizarea statusului"); }
  };

  const updateOneToTwenty = async (mentorId, customDate) => {
    try {
      const dateToUse = customDate ? Timestamp.fromDate(new Date(customDate)) : Timestamp.now();
      await updateDoc(doc(db, "mentori", mentorId), { ultimulOneToTwenty: dateToUse });
      await fetchMentori(); setSuccess("Data 1:20 actualizata!");
      setShowDateModal(false); setSelectedMentorForDate(null); setManualDate('');
    } catch (err) { setError("Eroare la actualizarea datei 1:20"); }
  };

  const openDateModal = (mentorId) => {
    setSelectedMentorForDate(mentorId);
    setManualDate(new Date().toISOString().slice(0, 16)); // datetime-local format
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

    // Generăm linkul de confirmare folosind ID-ul leadului ca token
    const confirmationLink = `${window.location.origin}/confirm/${lead.id}`;

    const subject = `Invitatie Webinar 1:20 - ProFX`;
    const body = `Buna ziua ${lead.nume},

Sunt ${mentorName}, mentorul tau de la ProFX!

Te invit să participi la webinarul nostru 1:20 dedicat începătorilor, unde vom construi împreună baza corectă în trading, pas cu pas.

În cadrul webinarului vei învăța:

✅ Ce înseamnă tradingul și cum funcționează piața
✅ Ce sunt Buy Stop/Limit, Sell Stop/Limit, Stop Loss (SL) și Take Profit (TP)
✅ Cum se folosește platforma MT5 și cum se plasează corect un ordin
✅ Noțiuni esențiale pentru a începe în siguranță, fără confuzie

Webinarul este gândit special pentru cei care pornesc de la zero și vor să înțeleagă lucrurile simplu și practic.

La final vei putea adresa întrebări și vei avea o imagine clară asupra pașilor următori.

Data si ora webinarului:
📅 ${formatDate(webinarDate)}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

🎯 CONFIRMA PARTICIPAREA TA:
👉 ${confirmationLink}

Te rog să confirmi participarea ta accesând link-ul de mai sus.
Link-ul de participare la webinar îți va fi trimis cu 30 minute înainte de start.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Te astept cu drag!

Cu respect,
${mentorName}
Mentor ProFX

Contact:
📞 ${lead.telefon}
📧 ${lead.email}`;

    return { subject, body };
  };

  const openEmailPreview = (lead) => {
    const content = generateEmailContent(lead);
    if (content) {
      setEmailContent(content);
      setSelectedLeadForEmail(lead);
      setShowEmailPreview(true);
    }
  };

  const sendEmail = async () => {
    if (!selectedLeadForEmail) return;
    
    setLoading(true);
    try {
      // TODO: Implementeaza trimiterea efectiva a emailului
      console.log('Trimitere email catre:', selectedLeadForEmail.email);
      console.log('Subiect:', emailContent.subject);
      console.log('Continut:', emailContent.body);
      
      // Simulare trimitere
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      // DUPĂ trimiterea emailului, setăm timeout-ul de 6 ore și tokenul de confirmare
      if (selectedLeadForEmail.status === LEAD_STATUS.ALOCAT) {
        const now = Timestamp.now();
        const timeoutDate = Timestamp.fromDate(new Date(now.toDate().getTime() + TIMEOUT_6H));
        
        await updateDoc(doc(db, "leaduri", selectedLeadForEmail.id), {
          dataTimeout: timeoutDate,
          emailTrimis: true,
          dataTrimiereEmail: now,
          confirmationToken: selectedLeadForEmail.id // folosim ID-ul ca token de confirmare
        });
        
        await fetchLeaduri();
      }
      
      setSuccess(`Email trimis cu succes catre ${selectedLeadForEmail.nume}! Countdown 6h a început.`);
      setShowEmailPreview(false);
      setSelectedLeadForEmail(null);
    } catch (err) {
      setError('Eroare la trimiterea emailului: ' + (err.message || ''));
    } finally {
      setLoading(false);
    }
  };

  const openAdminEmailModal = (mentorId) => {
    const mentor = mentoriData.find(m => m.id === mentorId);
    if (!mentor) return;
    
    if ((mentor.leaduriAlocate || 0) < 20) {
      setError('Mentorul trebuie sa aiba minim 20 leaduri pentru a trimite email!');
      return;
    }
    
    if (!mentor.ultimulOneToTwenty) {
      setError('Mentorul trebuie sa seteze mai intai data webinarului!');
      return;
    }
    
    setSelectedMentorForEmail(mentor);
    setBulkEmailPreview(null); // Reset preview
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
      const mentorLeads = leaduri.filter(l => 
        l.mentorAlocat === selectedMentorForEmail.id && 
        (l.status === LEAD_STATUS.ALOCAT || l.status === LEAD_STATUS.CONFIRMAT)
      );
      
      if (mentorLeads.length === 0) {
        setError('Nu exista leaduri active pentru acest mentor!');
        setLoading(false);
        return;
      }
      
      console.log(`Trimitere ${mentorLeads.length} emailuri pentru mentorul ${selectedMentorForEmail.nume}`);
      console.log('Catre leaduri:', mentorLeads.map(l => `${l.nume} (${l.email})`));
      
      // Pentru fiecare lead, generăm emailul cu linkul de confirmare specific
      for (const lead of mentorLeads) {
        const confirmationLink = `${window.location.origin}/confirm/${lead.id}`;
        console.log(`Link confirmare pentru ${lead.nume}: ${confirmationLink}`);
      }
      
      // TODO: Aici va fi integrarea cu serviciul de email
      // Simulare trimitere
      await new Promise(resolve => setTimeout(resolve, 1500));
      
      // DUPĂ ce emailurile sunt trimise, setăm timeout-ul de 6 ore și tokenul
      const now = Timestamp.now();
      const timeoutDate = Timestamp.fromDate(new Date(now.toDate().getTime() + TIMEOUT_6H));
      
      for (const lead of mentorLeads) {
        if (lead.status === LEAD_STATUS.ALOCAT) {
          await updateDoc(doc(db, "leaduri", lead.id), {
            dataTimeout: timeoutDate,
            emailTrimis: true,
            dataTrimiereEmail: now,
            confirmationToken: lead.id // folosim ID-ul ca token de confirmare
          });
        }
      }
      
      await fetchLeaduri();
      setSuccess(`${mentorLeads.length} emailuri trimise cu succes pentru mentorul ${selectedMentorForEmail.nume}! Countdown 6h a început.`);
      setShowAdminEmailModal(false);
      setSelectedMentorForEmail(null);
    } catch (err) {
      setError('Eroare la trimiterea emailurilor: ' + (err.message || ''));
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmDate = () => {
    if (!manualDate) { setError("Te rog selecteaza o data!"); return; }
    updateOneToTwenty(selectedMentorForDate, manualDate);
  };

  const handleConfirmLead = async (leadId) => {
    showConfirmDialog("Confirmare Lead", "Confirma ca acest lead participa la sesiunea 1:20?", async () => {
      setLoading(true);
      try {
        await updateDoc(doc(db, "leaduri", leadId), {
          status: LEAD_STATUS.CONFIRMAT, dataConfirmare: Timestamp.now(), statusOneToTwenty: ONE_TO_TWENTY_STATUS.CONFIRMED
        });
        await fetchLeaduri(); setSuccess("Lead confirmat cu succes!");
      } catch (err) { setError("Eroare la confirmarea leadului"); } finally { setLoading(false); }
    });
  };

  const handleRejectLead = async (leadId) => {
    showConfirmDialog("Refuz Lead", "Marcheaza leadul ca neconfirmat?", async () => {
      setLoading(true);
      try {
        await updateDoc(doc(db, "leaduri", leadId), {
          status: LEAD_STATUS.NECONFIRMAT, dataConfirmare: Timestamp.now(), motivNeconfirmare: 'Lead-ul a refuzat sau nu raspunde'
        });
        await fetchLeaduri(); setSuccess("Lead marcat ca neconfirmat.");
      } catch (err) { setError("Eroare la marcarea leadului"); } finally { setLoading(false); }
    });
  };

  const handleNoShowLead = async (leadId) => {
    showConfirmDialog("No-Show", "Marcheaza acest lead ca NO-SHOW?", async () => {
      setLoading(true);
      try {
        await updateDoc(doc(db, "leaduri", leadId), {
          status: LEAD_STATUS.NO_SHOW, statusOneToTwenty: ONE_TO_TWENTY_STATUS.NO_SHOW, dataOneToTwenty: Timestamp.now()
        });
        await fetchLeaduri(); setSuccess("Lead marcat ca NO-SHOW.");
      } catch (err) { setError("Eroare la marcarea leadului"); } finally { setLoading(false); }
    });
  };

  const handleCompleteLead = async (leadId) => {
    showConfirmDialog("Finalizare", "Marcheaza sesiunea 1:20 ca finalizata cu succes?", async () => {
      setLoading(true);
      try {
        await updateDoc(doc(db, "leaduri", leadId), {
          status: LEAD_STATUS.COMPLET, statusOneToTwenty: ONE_TO_TWENTY_STATUS.COMPLETED, dataOneToTwenty: Timestamp.now()
        });
        await fetchLeaduri(); setSuccess("Lead marcat ca finalizat!");
      } catch (err) { setError("Eroare la marcarea leadului"); } finally { setLoading(false); }
    });
  };

  const handleReallocateLead = async (leadId) => {
    showConfirmDialog("Re-alocare", "Re-aloca acest lead catre alt mentor disponibil?", async () => {
      setLoading(true);
      try {
        const lead = leaduri.find(l => l.id === leadId);
        if (!lead) { setError("Lead negasit"); return; }
        const mentDisp = mentoriData.filter(m => m.available && m.id !== lead.mentorAlocat).sort((a, b) => a.ordineCoada - b.ordineCoada);
        if (mentDisp.length === 0) { setError("Nu exista mentori disponibili"); setLoading(false); return; }
        const mentorNou = mentDisp[0];
        const da = Timestamp.now();
        await updateDoc(doc(db, "leaduri", leadId), {
          status: LEAD_STATUS.ALOCAT, 
          mentorAlocat: mentorNou.id, 
          dataAlocare: da, 
          dataTimeout: null, // Timeout-ul va fi setat c\u00e2nd se trimite emailul
          dataConfirmare: null, 
          numarReAlocari: (lead.numarReAlocari || 0) + 1,
          istoricMentori: [...(lead.istoricMentori || []), mentorNou.id],
          emailTrimis: false
        });
        await updateDoc(doc(db, "mentori", mentorNou.id), { leaduriAlocate: (mentorNou.leaduriAlocate || 0) + 1 });
        await fetchAllData(); setSuccess('Lead re-alocat catre ' + mentorNou.nume + '!');
      } catch (err) { setError("Eroare la re-alocarea leadului"); } finally { setLoading(false); }
    });
  };

  const stergeLeaduri = () => {
    showConfirmDialog("Stergere Totala", "Esti sigur ca vrei sa stergi TOATE leadurile?", async () => {
      setLoading(true);
      try {
        for (const lead of leaduri) await deleteDoc(doc(db, "leaduri", lead.id));
        for (const aloc of alocariActive) await deleteDoc(doc(db, "alocari", aloc.id));
        for (const m of mentoriData) await updateDoc(doc(db, "mentori", m.id), { leaduriAlocate: 0, available: true });
        await fetchAllData(); setSuccess("Toate leadurile au fost sterse si mentorii resetati!");
      } catch (err) { setError("Eroare la stergerea leadurilor"); } finally { setLoading(false); }
    });
  };

  const stergeLaeduriMentor = (alocare) => {
    showConfirmDialog("Stergere Leaduri Mentor", 'Stergi toate cele ' + alocare.numarLeaduri + ' leaduri ale mentorului ' + alocare.mentorNume + '?', async () => {
      setLoading(true);
      try {
        // Găsește toate leadurile mentorului
        const leaduriMentor = leaduri.filter(l => l.mentorAlocat === alocare.mentorId);
        
        // Șterge fiecare lead
        for (const l of leaduriMentor) {
          await deleteDoc(doc(db, "leaduri", l.id));
        }
        
        // Găsește și șterge TOATE alocările acestui mentor din DB
        const alocariMentor = alocariActive.filter(a => a.mentorId === alocare.mentorId);
        for (const aloc of alocariMentor) {
          await deleteDoc(doc(db, "alocari", aloc.id));
        }
        
        // Resetează contorul mentorului
        const mentorDB = mentoriData.find(x => x.id === alocare.mentorId);
        if (mentorDB) {
          await updateDoc(doc(db, "mentori", alocare.mentorId), { 
            leaduriAlocate: 0, 
            available: true 
          });
        }
        
        await fetchAllData(); 
        setSuccess('Leadurile mentorului ' + alocare.mentorNume + ' au fost sterse!');
      } catch (err) { 
        console.error("Eroare la stergerea leadurilor:", err);
        setError("Eroare la stergerea leadurilor mentorului"); 
      } finally { 
        setLoading(false); 
      }
    });
  };

  const dezalocaLeaduriMentor = (alocare) => {
    showConfirmDialog("Dezalocare Leaduri", 'Dezaloci toate cele ' + alocare.numarLeaduri + ' leaduri ale mentorului ' + alocare.mentorNume + '? Leadurile vor ramane in sistem cu status NEALOCAT.', async () => {
      setLoading(true);
      try {
        // Găsește toate leadurile mentorului
        const leaduriMentor = leaduri.filter(l => l.mentorAlocat === alocare.mentorId);
        
        // Resetează fiecare lead la status NEALOCAT
        for (const l of leaduriMentor) {
          await updateDoc(doc(db, "leaduri", l.id), {
            status: LEAD_STATUS.NEALOCAT,
            mentorAlocat: null,
            dataAlocare: null,
            dataTimeout: null,
            dataConfirmare: null,
            emailTrimis: false,
            alocareId: null
            // Păstrează istoricMentori și numarReAlocari pentru tracking
          });
        }
        
        // Găsește și șterge TOATE alocările acestui mentor din DB
        const alocariMentor = alocariActive.filter(a => a.mentorId === alocare.mentorId);
        for (const aloc of alocariMentor) {
          await deleteDoc(doc(db, "alocari", aloc.id));
        }
        
        // Resetează contorul mentorului
        const mentorDB = mentoriData.find(x => x.id === alocare.mentorId);
        if (mentorDB) {
          await updateDoc(doc(db, "mentori", alocare.mentorId), { 
            leaduriAlocate: 0, 
            available: true 
          });
        }
        
        await fetchAllData(); 
        setSuccess(alocare.numarLeaduri + ' leaduri dezalocate de la ' + alocare.mentorNume + '! Leadurile sunt acum nealocate.');
      } catch (err) { 
        console.error("Eroare la dezalocarea leadurilor:", err);
        setError("Eroare la dezalocarea leadurilor mentorului"); 
      } finally { 
        setLoading(false); 
      }
    });
  };

  const exportToExcel = async () => {
    try {
      const ExcelJS = (await import('exceljs')).default;
      // Pregătește datele pentru export
      const exportData = leaduri.map(lead => {
        const mentor = mentoriData.find(m => m.id === lead.mentorAlocat);
        const mentorInfo = MENTORI_DISPONIBILI.find(m => m.id === lead.mentorAlocat);
        const mentorNume = mentorInfo ? mentorInfo.nume : (mentor ? mentor.nume : '');
        
        return {
          'Nume': lead.nume || '',
          'Telefon': lead.telefon || '',
          'Email': lead.email || '',
          'Status': lead.status || '',
          'Mentor': mentorNume,
          'Data Alocare': lead.dataAlocare ? new Date(lead.dataAlocare.seconds * 1000).toLocaleString('ro-RO') : '',
          'Data Confirmare': lead.dataConfirmare ? new Date(lead.dataConfirmare.seconds * 1000).toLocaleString('ro-RO') : '',
          'Observatii': lead.observatii || ''
        };
      });

      // Creează workbook și worksheet cu ExcelJS
      const wb = new ExcelJS.Workbook();
      const ws = wb.addWorksheet('Leaduri');
      if (exportData.length > 0) {
        ws.columns = Object.keys(exportData[0]).map(key => ({ header: key, key }));
        exportData.forEach(row => ws.addRow(row));
      }

      // Generează fișier și declanșează descărcarea
      const fileName = `leaduri_export_${new Date().toISOString().split('T')[0]}.xlsx`;
      const buffer = await wb.xlsx.writeBuffer();
      const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url; a.download = fileName; a.click();
      URL.revokeObjectURL(url);

      setSuccess(`${leaduri.length} leaduri exportate cu succes în ${fileName}!`);
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
            await updateDoc(doc(db, "mentori", mid), { ordineCoada: i, leaduriAlocate: 0, available: true });
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
        for (const m of mentoriData) await deleteDoc(doc(db, "mentori", m.id));
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
      await updateDoc(doc(db, "leaduri", leadId), { nume: editLeadData.nume.trim(), telefon: editLeadData.telefon.trim(), email: editLeadData.email.trim() });
      setSuccess("Lead actualizat cu succes!"); setEditingLead(null); await fetchLeaduri();
    } catch (err) { setError("Eroare la actualizarea leadului"); } finally { setLoading(false); }
  };

  const handleCancelEdit = () => { setEditingLead(null); setEditLeadData({ nume: '', telefon: '', email: '' }); };

  const handleDeleteLead = (lead) => {
    showConfirmDialog("Stergere Lead", 'Stergi leadul "' + lead.nume + '"?', async () => {
      setLoading(true);
      try {
        await deleteDoc(doc(db, "leaduri", lead.id));
        if (lead.status === 'alocat' && lead.mentorAlocat) {
          const m = mentoriData.find(x => x.id === lead.mentorAlocat);
          if (m) await updateDoc(doc(db, "mentori", lead.mentorAlocat), { leaduriAlocate: Math.max(0, (m.leaduriAlocate || 0) - 1) });
          if (lead.alocareId) {
            const aloc = alocariActive.find(a => a.id === lead.alocareId);
            if (aloc) {
              const rem = aloc.leaduri.filter(id => id !== lead.id);
              if (rem.length === 0) await deleteDoc(doc(db, "alocari", lead.alocareId));
              else await updateDoc(doc(db, "alocari", lead.alocareId), { leaduri: rem, numarLeaduri: rem.length });
            }
          }
        }
        setSuccess('Lead "' + lead.nume + '" sters!'); await fetchAllData();
      } catch (err) { setError("Eroare la stergerea leadului"); } finally { setLoading(false); }
    });
  };

  // Computed
  const leaduriNealocate = leaduri.filter(l => l.status === LEAD_STATUS.NEALOCAT).length;
  const leaduriAlocate = leaduri.filter(l => l.status === LEAD_STATUS.ALOCAT).length;
  const leaduriConfirmate = leaduri.filter(l => l.status === LEAD_STATUS.CONFIRMAT).length;
  const leaduriNeconfirmate = leaduri.filter(l => l.status === LEAD_STATUS.NECONFIRMAT).length;
  const leaduriNoShow = leaduri.filter(l => l.status === LEAD_STATUS.NO_SHOW).length;
  const leaduriComplete = leaduri.filter(l => l.status === LEAD_STATUS.COMPLET).length;

  const mentorLeaduri = currentMentorId ? leaduri.filter(l => l.mentorAlocat === currentMentorId) : [];
  const mentorLeaduriAlocate = mentorLeaduri.filter(l => l.status === LEAD_STATUS.ALOCAT).length;
  const mentorLeaduriConfirmate = mentorLeaduri.filter(l => l.status === LEAD_STATUS.CONFIRMAT).length;
  const mentorLeaduriComplete = mentorLeaduri.filter(l => l.status === LEAD_STATUS.COMPLET).length;
  const mentorLeaduriNoShow = mentorLeaduri.filter(l => l.status === LEAD_STATUS.NO_SHOW).length;
  const mentorLeaduriNeconfirmate = mentorLeaduri.filter(l => l.status === LEAD_STATUS.NECONFIRMAT).length;

  // Verifică dacă putem aloca leaduri
  const canAllocateLeads = () => {
    if (leaduriNealocate === 0) return false;
    const mentoriSortati = [...mentoriData].sort((a, b) => a.ordineCoada - b.ordineCoada);
    const mentorEligibil = mentoriSortati.find(m => {
      const leadCnt = m.leaduriAlocate || 0;
      // Mentor eligibil: are < 30 leaduri ȘI (este disponibil SAU are deja 20-29 leaduri)
      return leadCnt < 30 && (m.available || (leadCnt >= 20 && leadCnt < 30));
    });
    if (!mentorEligibil) return false;
    const leadCnt = mentorEligibil.leaduriAlocate || 0;
    if (leadCnt === 0 && leaduriNealocate < 20) return false;
    return true;
  };

  const leaduriFiltrate = leaduri.filter(l =>
    l.nume?.toLowerCase().includes(searchQuery.toLowerCase()) ||
    l.telefon?.includes(searchQuery) ||
    l.email?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const leaduriSortate = [...leaduriFiltrate].sort((a, b) => {
    if (sortBy === 'nume-asc') return (a.nume || '').localeCompare(b.nume || '');
    if (sortBy === 'nume-desc') return (b.nume || '').localeCompare(a.nume || '');
    if (sortBy === 'data-asc') {
      const dA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
      const dB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
      return dA - dB;
    }
    const dA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
    const dB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
    return dB - dA;
  });

  const totalPages = Math.ceil(leaduriSortate.length / leaduriPerPage);
  const indexOfLastLead = currentPage * leaduriPerPage;
  const indexOfFirstLead = indexOfLastLead - leaduriPerPage;
  const leaduriCurente = leaduriSortate.slice(indexOfFirstLead, indexOfLastLead);

  const mentorLeaduriFiltrate = mentorLeaduri.filter(l =>
    l.nume?.toLowerCase().includes(mentorSearchQuery.toLowerCase()) ||
    l.telefon?.includes(mentorSearchQuery) ||
    l.email?.toLowerCase().includes(mentorSearchQuery.toLowerCase())
  );

  const mentorLeaduriSortate = [...mentorLeaduriFiltrate].sort((a, b) => {
    if (mentorSortBy === 'nume-asc') return (a.nume || '').localeCompare(b.nume || '');
    if (mentorSortBy === 'nume-desc') return (b.nume || '').localeCompare(a.nume || '');
    if (mentorSortBy === 'status') {
      const order = [LEAD_STATUS.ALOCAT, LEAD_STATUS.CONFIRMAT, LEAD_STATUS.NECONFIRMAT, LEAD_STATUS.NO_SHOW, LEAD_STATUS.COMPLET];
      return order.indexOf(a.status) - order.indexOf(b.status);
    }
    if (mentorSortBy === 'data-asc') {
      const dA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
      const dB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
      return dA - dB;
    }
    const dA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
    const dB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
    return dB - dA;
  });

  const mentorTotalPages = Math.ceil(mentorLeaduriSortate.length / leaduriPerPage);
  const mentorIndexOfLast = mentorCurrentPage * leaduriPerPage;
  const mentorIndexOfFirst = mentorIndexOfLast - leaduriPerPage;
  const mentorLeaduriCurente = mentorLeaduriSortate.slice(mentorIndexOfFirst, mentorIndexOfLast);

  // Creează lista unică de mentori bazată pe MENTORI_DISPONIBILI
  const mentoriUnici = MENTORI_DISPONIBILI.map(mentorDef => {
    // Găsește datele mentorului din DB (poate exista sau nu)
    const mentorDB = mentoriData.find(m => m.id === mentorDef.id);
    
    // Calculează numărul REAL de leaduri din lista de leaduri
    const leaduriRealeMentor = leaduri.filter(l => l.mentorAlocat === mentorDef.id).length;
    
    return {
      id: mentorDef.id,
      nume: mentorDef.nume,
      available: mentorDB?.available ?? true,
      ultimulOneToTwenty: mentorDB?.ultimulOneToTwenty ?? null,
      ordineCoada: mentorDB?.ordineCoada ?? MENTORI_DISPONIBILI.findIndex(m => m.id === mentorDef.id),
      leaduriAlocate: leaduriRealeMentor, // Folosește numărul REAL din leaduri
      createdAt: mentorDB?.createdAt ?? Timestamp.now()
    };
  });

  // Agregă alocările pe mentor (combină alocările duplicate)
  const alocariAggregate = mentoriUnici
    .map(mentor => {
      // Găsește toate leadurile acestui mentor
      const leaduriMentor = leaduri.filter(l => l.mentorAlocat === mentor.id);
      
      if (leaduriMentor.length === 0) return null;
      
      // Găsește prima alocare (pentru data creării)
      const primaAlocare = alocariActive
        .filter(a => a.mentorId === mentor.id)
        .sort((a, b) => {
          const dateA = a.createdAt?.toDate ? a.createdAt.toDate() : new Date(a.createdAt);
          const dateB = b.createdAt?.toDate ? b.createdAt.toDate() : new Date(b.createdAt);
          return dateA - dateB;
        })[0];
      
      return {
        id: mentor.id, // Folosește ID-ul mentorului, nu al alocării
        mentorId: mentor.id,
        mentorNume: mentor.nume,
        numarLeaduri: leaduriMentor.length,
        leaduri: leaduriMentor.map(l => l.id),
        createdAt: primaAlocare?.createdAt ?? Timestamp.now(),
        status: 'activa'
      };
    })
    .filter(a => a !== null); // Elimină mentorii fără leaduri

  // ==================== ADMIN DASHBOARD ====================
  if (currentRole === "admin") {
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
                  <p className="text-sm text-purple-300 mb-1">Complete</p>
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
                          <div className="flex justify-between"><span className="text-purple-400">Complete:</span><span className="text-purple-400 font-bold">{leaduri.filter(l => l.mentorAlocat === mentor.id && l.status === LEAD_STATUS.COMPLET).length}</span></div>
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
                            disabled={(mentor.leaduriAlocate || 0) < 20}
                            className={"w-full px-3 py-1.5 rounded-lg text-sm font-semibold transition-all border flex items-center justify-center gap-2 " + ((mentor.leaduriAlocate || 0) >= 20 ? 'bg-purple-500/20 hover:bg-purple-500/30 border-purple-500/50 text-purple-300' : 'bg-gray-700/20 border-gray-600/50 text-gray-500 cursor-not-allowed')}>
                            <span>✉️</span> Email Leaduri
                          </button>
                          <button onClick={() => toggleMentorAvailability(mentor.id, mentor.available)}
                            className={"w-full px-3 py-1.5 rounded-lg text-sm font-semibold transition-all border " + (mentor.available ? 'bg-red-500/20 hover:bg-red-500/30 border-red-500/50 text-red-300' : 'bg-green-500/20 hover:bg-green-500/30 border-green-500/50 text-green-300')}>
                            {mentor.available ? 'Dezactiveaza' : 'Activeaza'}
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
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
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
                                    {lead.status === LEAD_STATUS.CONFIRMAT && (
                                      <div className="flex gap-1">
                                        <button onClick={() => handleCompleteLead(lead.id)} disabled={loading} title="Complet"
                                          className="bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/50 text-purple-300 px-2 py-1 rounded-lg text-xs font-semibold transition-all">Complet</button>
                                        <button onClick={() => handleNoShowLead(lead.id)} disabled={loading} title="No-Show"
                                          className="bg-orange-500/20 hover:bg-orange-500/30 border border-orange-500/50 text-orange-300 px-2 py-1 rounded-lg text-xs font-semibold transition-all">No-Show</button>
                                      </div>
                                    )}
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
                    <p className="text-sm text-gray-400">{leaduri.filter(l => l.mentorAlocat === selectedMentorForEmail.id && (l.status === LEAD_STATUS.ALOCAT || l.status === LEAD_STATUS.CONFIRMAT)).length} leaduri active</p>
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
                    <li><strong className="text-white">Destinatari:</strong> Toate leadurile alocate și confirmate</li>
                  </ul>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-400 mb-2">Leaduri care vor primi email:</label>
                  <div className="bg-gray-800/50 border border-gray-700/50 rounded-xl p-4 max-h-48 overflow-y-auto">
                    <div className="space-y-2">
                      {leaduri
                        .filter(l => l.mentorAlocat === selectedMentorForEmail.id && (l.status === LEAD_STATUS.ALOCAT || l.status === LEAD_STATUS.CONFIRMAT))
                        .map(lead => (
                          <button
                            key={lead.id}
                            onClick={() => showBulkEmailPreview(lead)}
                            className="w-full flex items-center justify-between py-2 px-3 bg-gray-700/30 hover:bg-gray-700/50 rounded-lg transition-all cursor-pointer group"
                          >
                            <div className="text-left">
                              <p className="text-white text-sm font-semibold group-hover:text-blue-300 transition-colors">{lead.nume}</p>
                              <p className="text-gray-400 text-xs">{lead.email}</p>
                            </div>
                            <span className={"px-2 py-1 text-xs font-semibold rounded-full " + getStatusBadge(lead.status).bg}>
                              {getStatusBadge(lead.status).label}
                            </span>
                          </button>
                        ))}
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
                <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-xl p-3 mb-4">
                  <p className="text-xs text-yellow-300">
                    <span className="font-semibold">⚠️ Notă:</span> Funcția de trimitere email este în dezvoltare. Deocamdată, emailurile vor fi doar afișate în consolă.
                  </p>
                </div>
                <div className="flex gap-3">
                  <button onClick={() => setShowAdminEmailModal(false)}
                    className="flex-1 bg-gray-600/20 hover:bg-gray-600/30 border border-gray-600/50 text-gray-300 py-3 px-4 rounded-xl font-semibold transition-all">Anuleaza</button>
                  <button onClick={sendBulkEmail} disabled={loading}
                    className="flex-1 bg-purple-500/20 hover:bg-purple-500/30 border border-purple-500/50 text-purple-300 py-3 px-4 rounded-xl font-semibold transition-all disabled:opacity-50 flex items-center justify-center gap-2">
                    {loading ? 'Se trimite...' : (
                      <>
                        <span>📤</span> Trimite Email ({leaduri.filter(l => l.mentorAlocat === selectedMentorForEmail.id && (l.status === LEAD_STATUS.ALOCAT || l.status === LEAD_STATUS.CONFIRMAT)).length})
                      </>
                    )}
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

  // ==================== MENTOR DASHBOARD ====================
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
