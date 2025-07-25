import { collection, getDocs, setDoc, doc } from 'firebase/firestore';
import { db } from './firebase.js';

// Rulează funcția o singură dată pentru migrare!
async function addTimeToDates() {
  const q = await getDocs(collection(db, 'webinarii'));
  for (let d of q.docs) {
    let dateStr = d.data().date;
    // Dacă data este în formatul "YYYY-MM-DD" (fără oră)
    if (dateStr && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
      // Construiește data cu ora 20:00 (în local time zone al serverului/pc-ului)
      const withTime = new Date(dateStr + "T20:00:00");
      await setDoc(doc(db, 'webinarii', d.id), {
        ...d.data(),
        date: withTime.toISOString()
      }, { merge: true });
      console.log(`Updatat data ${d.id} la ora 20:00`);
    }
  }
}
addTimeToDates();
