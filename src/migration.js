// migration.js - Script pentru resetarea bazei de date
// Rulează o singură dată, apoi șterge fișierul

import { db } from './firebase';
import { collection, getDocs, doc, setDoc, deleteDoc } from 'firebase/firestore';

// Mentorii actuali (fără Cosmin)
const mentors = {
  A: "Eli",
  B: "Tudor", 
  D: "Dan",
  E: "Adrian",
};

// Rotația respectând cronologia
const rotation = [
  ["A", "E"], // Eli & Adrian (următorul webinar)
  ["B", "D"], // Tudor & Dan
  ["B", "E"], // Tudor & Adrian  
  ["D", "E"], // Dan & Adrian
  ["A", "B"], // Eli & Tudor
  ["A", "D"], // Eli & Dan
];

// Funcție pentru a găsi următoarea zi de marți
function getNextTuesday(fromDate, includeToday = false) {
  const date = new Date(fromDate);
  const dayOfWeek = date.getDay(); // 0 = Duminică, 2 = Marți
  
  let daysUntilTuesday;
  if (dayOfWeek === 2 && includeToday) {
    daysUntilTuesday = 0;
  } else if (dayOfWeek < 2) {
    daysUntilTuesday = 2 - dayOfWeek;
  } else {
    daysUntilTuesday = 7 - dayOfWeek + 2;
  }
  
  date.setDate(date.getDate() + daysUntilTuesday);
  return date;
}

// Funcție pentru a genera 20 de marți consecutivi
function getNext20Tuesdays() {
  const today = new Date();
  const firstTuesday = getNextTuesday(today, false);
  const tuesdays = [];
  
  for (let i = 0; i < 20; i++) {
    const tuesday = new Date(firstTuesday);
    tuesday.setDate(firstTuesday.getDate() + (i * 7)); // +7 zile pentru fiecare marți
    tuesdays.push(tuesday);
  }
  
  return tuesdays;
}

// Construiește Date cu ora 20:00 România (UTC+2 vara, UTC+3 iarna)
function getDateWithEightPMRomania(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  
  // Creează data cu ora 20:00 în timezone-ul local (România)
  return new Date(`${year}-${month}-${day}T20:00:00`);
}

// 🔥 FUNCȚIA PRINCIPALĂ DE RESETARE
async function resetFirebaseForNext20Webinars() {
  console.log('🚀 Începe resetarea pentru următoarele 20 de webinarii...');
  console.log('📅 Fiecare marți la 20:00 (ora României)');
  
  try {
    // 1. Șterge toate documentele existente
    console.log('\n🔥 PASUL 1: Ștergerea bazei de date...');
    const webinariiRef = collection(db, 'webinarii');
    const snapshot = await getDocs(webinariiRef);
    
    console.log(`📋 Găsite ${snapshot.docs.length} documente de șters...`);
    
    for (const docSnapshot of snapshot.docs) {
      await deleteDoc(doc(db, 'webinarii', docSnapshot.id));
      console.log(`🗑️ Șters: ${docSnapshot.id}`);
    }
    
    console.log('✅ Toate documentele au fost șterse!');
    
    // 2. Generează următoarele 20 de marți
    console.log('\n📅 PASUL 2: Generarea datelor...');
    const next20Tuesdays = getNext20Tuesdays();
    
    console.log('📋 Următoarele 20 de webinarii (marți la 20:00):');
    next20Tuesdays.forEach((date, i) => {
      const rotaIndex = i % rotation.length;
      const [m1, m2] = rotation[rotaIndex];
      const mentorsPair = `${mentors[m1]} & ${mentors[m2]}`;
      console.log(`   ${i + 1}. ${date.toLocaleDateString('ro-RO')} - ${mentorsPair}`);
    });
    
    // 3. Populează baza de date
    console.log('\n📝 PASUL 3: Popularea bazei de date...');
    
    for (let i = 0; i < next20Tuesdays.length; i++) {
      const date = next20Tuesdays[i];
      const dateStr = date.toISOString().split('T')[0]; // YYYY-MM-DD
      const rotaIndex = i % rotation.length;
      const [m1, m2] = rotation[rotaIndex];
      
      if (!mentors[m1] || !mentors[m2]) {
        console.warn(`⚠️ Mentori indisponibili pentru rotația ${rotaIndex}: ${m1}, ${m2}`);
        continue;
      }
      
      const mentorsPair = `${mentors[m1]} & ${mentors[m2]}`;
      const dateAtEight = getDateWithEightPMRomania(date);

      const docRef = doc(db, 'webinarii', dateStr);
      await setDoc(docRef, {
        date: dateAtEight.toISOString(),
        mentori: mentorsPair,
        change_count: 0, // Resetează contorul de schimbări
      });
      
      console.log(`✅ Creat: ${dateStr} → ${mentorsPair}`);
    }
    
    // 4. Statistici finale
    console.log('\n🎉 MIGRARE COMPLETĂ CU SUCCES!');
    console.log('📊 STATISTICI:');
    console.log(`   • Total webinarii create: ${next20Tuesdays.length}`);
    console.log(`   • Lungime rotație: ${rotation.length}`);
    console.log(`   • Primul webinar: ${next20Tuesdays[0].toLocaleDateString('ro-RO')} - Eli & Adrian`);
    console.log(`   • Ultimul webinar: ${next20Tuesdays[next20Tuesdays.length - 1].toLocaleDateString('ro-RO')}`);
    console.log(`   • Fiecare mentor va avea ${Math.floor(next20Tuesdays.length * 3 / Object.keys(mentors).length)} webinarii`);
    
    console.log('\n🗑️ Poți șterge fișierul migration.js acum!');
    
    return true;
    
  } catch (error) {
    console.error('❌ EROARE în timpul migrării:', error);
    return false;
  }
}

// 🚀 RULEAZĂ MIGRAREA
console.log('🔄 Inițializare script migrare...');
resetFirebaseForNext20Webinars()
  .then(success => {
    if (success) {
      console.log('🎯 Script executat cu succes!');
    } else {
      console.log('💥 Script eșuat!');
    }
  })
  .catch(err => {
    console.error('💥 Eroare critică:', err);
  });

export default resetFirebaseForNext20Webinars;