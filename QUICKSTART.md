# 🚀 Quick Start Guide - ProFx Webinarii

## 📦 Setup în 5 minute

### 1. Instalează dependințele
```bash
npm install
```

### 2. Configurează Firebase
1. Mergi la [Firebase Console](https://console.firebase.google.com/)
2. Creează un proiect nou sau folosește unul existent
3. Activează **Firestore Database**
4. Copiază configurația din **Project Settings → Your Apps → Web**
5. Configurația este deja în `src/firebase.js` - nu e nevoie să o modifici dacă folosești proiectul existent

### 3. Configurează Security Rules (Important!)

În Firebase Console → Firestore Database → Rules, adaugă:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read: if true;
      allow write: if true;  // Pentru development
    }
  }
}
```

⚠️ **Atenție**: Aceste reguli sunt permisive. Pentru producție, vezi `firestore.rules`.

### 4. Pornește aplicația
```bash
npm run dev
```

### 5. Rulează migrarea datelor
1. Deschide browser la `http://localhost:5173/migrate`
2. Click pe **"🚀 Rulează Migrare Completă"**
3. Așteaptă confirmarea în console
4. Gata! Datele sunt în Firebase

## 🎯 Ce face migrarea?

✅ **Creează 5 mentori**: Sergiu, Dan, Tudor, Eli, Adrian  
✅ **Creează 1 clasă** cu 5 studenți demonstrativi  

## 📱 Pagini disponibile

```
http://localhost:5173/          → Pagina principală
http://localhost:5173/admin     → Panou administrare
http://localhost:5173/migrate   → Asistent migrare date
```

## 🎓 Acțiuni comune

### Adaugă un mentor nou
```javascript
import { saveMentor } from './services/firebaseService';

await saveMentor("cristian", {
  name: "Cristian",
  email: "cristian@example.com",
  password: "Cristian",
  active: true
});
```

### Creează o clasă nouă
```javascript
import { createCompleteClass } from './services/adminService';

const result = await createCompleteClass({
  name: "Clasa Q2 2025",
  startDate: "2025-04-01",
  endDate: "2025-06-30",
  students: [
    { name: "Student 1", email: "s1@example.com" },
    { name: "Student 2", email: "s2@example.com" }
  ]
});

console.log("Clasă creată:", result.classId);
```

## 📊 Verifică datele în Firebase Console

1. Mergi la [Firebase Console](https://console.firebase.google.com/)
2. Click pe proiectul tău
3. Firestore Database
4. Vei vedea colecțiile:
   - `mentori` (5 documente)
   - `clase` (1+ documente)
   - `studenti` (5+ documente)

## 🆘 Probleme Comune

### "Permission denied" când salvezi date
**Soluție**: Verifică Security Rules în Firebase Console.

### "Module not found"
**Soluție**: Rulează `npm install` din nou.

### Pagina /admin nu se încarcă
**Soluție**: Asigură-te că `react-router-dom` este instalat.

### Datele nu apar
**Soluție**: Verifică că ai rulat migrarea la `/migrate`.

## 📚 Documentație Completă

Pentru mai multe detalii, vezi:
- [FIREBASE_GUIDE.md](FIREBASE_GUIDE.md) - Ghid complet Firebase
- [README.md](README.md) - Documentație generală
- [src/examples/usageExamples.js](src/examples/usageExamples.js) - 25+ exemple de cod

## 🎨 Personalizare

### Adaugă mentori noi
Folosește panoul admin la `/admin` sau prin cod:
```javascript
import { saveMentor } from './services/firebaseService';

await saveMentor("cristian", {
  name: "Cristian",
  password: "Cristian",
  active: true
});
```

## ✅ Checklist Final

- [ ] Firebase configurat
- [ ] npm install executat
- [ ] Security Rules configurate
- [ ] npm run dev pornit
- [ ] Migrare completată la /migrate
- [ ] Date vizibile în Firebase Console
- [ ] Panou admin funcțional la /admin

---

**Gata! Aplicația ta este pregătită! 🎉**

Pentru suport, verifică documentația sau deschide un issue.
