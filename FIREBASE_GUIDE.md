# 📚 Ghid Firebase - ProFx Mentori

## 📋 Structura Bazei de Date

### Colecții Firestore:

1. **mentori** - Informații despre mentori (Sergiu, Dan, Tudor, Eli, Adrian)
2. **clase** - Clase de studenți gestionate de mentori
3. **studenti** - Informații despre studenți

---

## 🔥 Operații Principale

### 1. Gestionare Mentori

```javascript
import { saveMentor, getAllMentors, getMentor, deleteMentor } from './services/firebaseService';

// Adaugă/Actualizează mentor
await saveMentor("sergiu", {
  name: "Sergiu",
  email: "sergiu@profx.ro",
  password: "Sergiu",
  active: true
});

// Obține toți mentorii
const mentors = await getAllMentors();
console.log(mentors);
// Output: { sergiu: {name: "Sergiu", ...}, dan: {name: "Dan", ...}, ... }

// Obține un mentor specific
const mentor = await getMentor("sergiu");

// Șterge mentor
await deleteMentor("sergiu");
```

### 2. Gestionare Clase

```javascript
import { createClass, updateClass, getAllClasses, getActiveClasses } from './services/firebaseService';

// Creează clasă
const classId = await createClass({
  name: "ProFx Q1 2025",
  startDate: "2025-01-10",
  endDate: "2025-04-10",
  active: true,
  studentIds: []
});

// Actualizează clasă
await updateClass(classId, {
  name: "ProFx Q1 2025 - Updated",
  active: false
});

// Obține toate clasele
const classes = await getAllClasses();

// Obține doar clasele active
const activeClasses = await getActiveClasses();
```

### 3. Gestionare Studenți

```javascript
import { createStudent, updateStudent, getAllStudents, getStudentsByClass } from './services/firebaseService';

// Creează student
const studentId = await createStudent({
  name: "Ion Popescu",
  email: "ion@example.com",
  phone: "0712345678",
  classId: "classId123"
});

// Actualizează student
await updateStudent(studentId, {
  phone: "0756789012"
});

// Obține toți studenții
const students = await getAllStudents();

// Obține studenții dintr-o clasă
const classStudents = await getStudentsByClass("classId123");
```

### 4. Funcții Admin Avansate

```javascript
import { 
  initializeMentorsInFirebase,
  createCompleteClass,
  getClassStatistics,
  exportAllData,
  validateDataConsistency
} from './services/adminService';

// Inițializează mentorii default
const results = await initializeMentorsInFirebase();

// Creează clasă cu studenți
const result = await createCompleteClass({
  name: "Trading Basics",
  startDate: "2025-01-10",
  endDate: "2025-04-10",
  students: [
    { name: "Student 1", email: "s1@example.com", phone: "0712345678" },
    { name: "Student 2", email: "s2@example.com", phone: "0723456789" }
  ]
});

// Obține statistici clasă
const stats = await getClassStatistics("classId123");
console.log(`Total studenți: ${stats.totalStudents}`);

// Exportă toate datele (backup)
const backup = await exportAllData();
// Salvează în fișier JSON

// Validează consistența datelor
const validation = await validateDataConsistency();
if (validation.valid) {
  console.log("✅ Date consistente!");
}
```

---

## 🔐 Security Rules

### Pentru Development

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /{document=**} {
      allow read: if true;
      allow write: if true;
    }
  }
}
```

### Pentru Producție

Folosește `firestore.rules` din proiect pentru reguli complete cu autentificare.

---

## 🎯 Workflow Tipic

### Setup Inițial

1. **Inițializează mentorii**
```javascript
await initializeMentorsInFirebase();
// Creează: Sergiu, Dan, Tudor, Eli, Adrian
```

2. **Creează o clasă cu studenți**
```javascript
const result = await createCompleteClass({
  name: "ProFx Q1 2025",
  startDate: "2025-01-10",
  endDate: "2025-04-10",
  students: [
    { name: "Student 1", email: "s1@example.com" },
    // ... mai mulți studenți
  ]
});
```

3. **Verifică datele în Firebase Console**
- Mergi la Firebase Console → Firestore Database
- Vezi colecțiile: mentori, clase, studenti

---

## 📱 Utilizare în Aplicație

### Pagina Principală (/)
- Mentorii se autentifică
- Gestionează clasele lor
- Marchează studenți activi/inactivi
- Urmăresc progresul claselor

### Panoul Admin (/admin)
- Vizualizează toți mentorii
- Gestionează clasele
- Adaugă/șterge studenți
- Exportă date pentru backup

### Asistent Migrare (/migrate)
- Inițializează date pentru prima dată
- Rulează migrarea completă cu un click

---

## 🆘 Probleme Comune

### "Permission denied"
**Cauză**: Security Rules sunt prea restrictive  
**Soluție**: Pentru development, folosește regulile permisive din `firestore.rules.dev`

### Date nu apar în aplicație
**Cauză**: Datele nu au fost migrate  
**Soluție**: Accesează `/migrate` și rulează migrarea

### Mentor nu poate salva date
**Cauză**: Mentorul nu există în Firebase  
**Soluție**: Adaugă mentorul în `/admin` sau rulează `initializeMentorsInFirebase()`

---

## 📊 Structura Documentelor

### Mentor
```javascript
{
  name: "Sergiu",
  email: "sergiu@example.com",
  password: "Sergiu",
  active: true,
  updatedAt: timestamp
}
```

### Clasă
```javascript
{
  name: "ProFx Q1 2025",
  startDate: "2025-01-10",
  endDate: "2025-04-10",
  studentIds: ["student1", "student2"],
  active: true,
  createdAt: timestamp,
  updatedAt: timestamp
}
```

### Student
```javascript
{
  name: "Ion Popescu",
  email: "ion@example.com",
  phone: "0712345678",
  classId: "class123",
  createdAt: timestamp,
  updatedAt: timestamp
}
```

---

## 🚀 Best Practices

1. **Backup regulat**: Folosește `exportAllData()` săptămânal
2. **Validare date**: Rulează `validateDataConsistency()` periodic
3. **Security Rules**: Actualizează pentru producție cu autentificare
4. **Indexare**: Firebase va sugera indexuri în console când e necesar

---

Pentru suport: [Firebase Documentation](https://firebase.google.com/docs/firestore)
