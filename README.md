# 🎓 ProFx Mentori - Sistem Management Clase

Aplicație web pentru gestionarea mentorilor, claselor și studenților cu integrare Firebase.

## 🚀 Features

- ✅ **Gestionare Mentori** - Adaugă, editează, șterge mentori
- ✅ **Clase & Studenți** - Organizează studenții pe clase
- ✅ **Tracking Prezență** - Fiecare mentor își gestionează clasele și studenții
- ✅ **Panou Admin** - Interfață completă pentru administrare
- ✅ **Firebase Integration** - Date sincronizate în timp real
- ✅ **Asistent Migrare** - Tool pentru migrarea datelor inițiale

## 📦 Instalare

```bash
# Clonează repo-ul
git clone <url>
cd profx-webinarii

# Instalează dependințele
npm install

# Pornește development server
npm run dev
```

## 🔧 Configurare Firebase

1. Creează un proiect Firebase la [Firebase Console](https://console.firebase.google.com/)
2. Activează **Firestore Database**
3. Copiază configurația din Project Settings
4. Actualizează [firebase.js](src/firebase.js) cu configurația ta

## 📖 Utilizare

### Structura Aplicației

```
/                  → Pagina principală (tracking clase mentori)
/admin            → Panou administrare (mentori, clase, studenți)
/migrate          → Asistent migrare date
```

### Migrarea Datelor Inițiale

1. Accesează `/migrate` în browser
2. Click pe **"🚀 Rulează Migrare Completă"**
3. Verifică în console că toate pașii s-au executat
4. Mergi la `/admin` pentru a vedea datele

SAU rulează pașii individuali:
- **Pas 1**: Inițializează mentori (Sergiu, Dan, Tudor, Eli, Adrian)
- **Pas 2**: Creează clasă cu 5 studenți demo

### Documentație Completă

Vezi [FIREBASE_GUIDE.md](FIREBASE_GUIDE.md) pentru:
- 📚 Ghid complet de utilizare
- 🔐 Configurare Security Rules
- 💡 Exemple de cod
- 🆘 Troubleshooting

## 🏗️ Structura Proiectului

```
src/
├── components/          # Componente React
│   └── ui/
├── pages/              # Pagini principale
│   ├── AdminPanel.jsx       # Panou admin
│   └── MigrationHelper.jsx  # Asistent migrare
├── scripts/            # Scripturi utilitate
│   └── migrateToFirebase.js
├── services/           # Servicii Firebase
│   ├── firebaseService.js   # CRUD operații
│   └── adminService.js      # Funcții admin
├── utils/              # Funcții helper
│   └── dates.js
├── Mentors1la20.jsx    # Componenta principală tracking mentori
├── firebase.js         # Configurare Firebase
└── App.jsx            # Component principal + routing
```

## 🔥 Servicii Firebase

### firebaseService.js
Operații CRUD pentru:
- Mentori (save, get, delete)
- Clase (create, update, get, delete)
- Studenți (create, update, get, delete)

### adminService.js
Funcții avansate:
- `initializeMentorsInFirebase()` - Inițializează mentori
- `createCompleteClass()` - Creează clasă + studenți
- `getClassStatistics()` - Statistici clasă
- `exportAllData()` - Backup date
- `validateDataConsistency()` - Validare integritate date

## 📊 Baza de Date Firebase

### Colecții Firestore:

**mentori**
```javascript
{
  id: "sergiu",      // Document ID
  name: "Sergiu",
  email: "sergiu@example.com",
  password: "Sergiu",
  active: true,
  updatedAt: timestamp
}
```

**clase**
```javascript
{
  id: "auto-generated",
  name: "ProFx Q1 2025",
  startDate: "2025-01-10",
  endDate: "2025-04-10",
  studentIds: ["student1", "student2"],
  active: true,
  createdAt: timestamp,
  updatedAt: timestamp
}
```

**studenti**
```javascript
{
  id: "auto-generated",
  name: "Ion Popescu",
  email: "ion@example.com",
  phone: "0712345678",
  classId: "class123",
  createdAt: timestamp,
  updatedAt: timestamp
}
```

## 🛠️ Development

```bash
# Development server
npm run dev

# Build pentru producție
npm run build

# Preview build
npm run preview

# Lint
npm run lint
```

## 🔐 Security Rules (Recomandat)

Adaugă în Firebase Console → Firestore → Rules:

```javascript
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Doar autentificați pot scrie, toată lumea poate citi
    match /{document=**} {
      allow read: if true;
      allow write: if request.auth != null;
    }
  }
}
```

## 📱 Tecnologii

- **React 19** - UI Framework
- **Vite** - Build tool
- **Firebase/Firestore** - Backend & Database
- **React Router** - Routing
- **Tailwind CSS** - Styling

## 🤝 Contribuție

1. Fork repo-ul
2. Creează branch (`git checkout -b feature/AmazingFeature`)
3. Commit (`git commit -m 'Add some AmazingFeature'`)
4. Push (`git push origin feature/AmazingFeature`)
5. Deschide Pull Request

## 📝 License

MIT

## 👥 Echipa

ProFx - Trading Mentorship Platform

---

**Happy Coding! 🚀**
