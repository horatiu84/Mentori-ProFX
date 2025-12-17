import React, { useState, useEffect } from "react";
import { Input } from "./components/ui/input";
import { Card, CardContent } from "./components/ui/card";
import logo from "./logo2.png";
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from './firebase';

export default function Mentori1La20() {
  // Mentorii disponibili + Admin
  const mentors = [
    { username: "Sergiu", password: "Sergiu", role: "mentor" },
    { username: "Dan", password: "Dan", role: "mentor" },
    { username: "Tudor", password: "Tudor", role: "mentor" },
    { username: "Eli", password: "Eli", role: "mentor" },
    { username: "Adrian", password: "Adrian", role: "mentor" },
    { username: "Admin", password: "Admin", role: "admin" },
  ];

  // State pentru autentificare
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [currentMentor, setCurrentMentor] = useState(null);
  const [currentRole, setCurrentRole] = useState(null);
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [loginError, setLoginError] = useState("");

  // State pentru clasele mentorilor - încărcăm din Firebase
  const [mentorClasses, setMentorClasses] = useState({});
  const [loadingData, setLoadingData] = useState(false);

  // State pentru clasa curentă
  const [currentClass, setCurrentClass] = useState(null);
  // eslint-disable-next-line no-unused-vars
  const [studentCount, setStudentCount] = useState(0);
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [newStudentName, setNewStudentName] = useState("");
  
  // State pentru expanded classes în istoric
  const [expandedClasses, setExpandedClasses] = useState([]);
  
  // State pentru editarea studentului
  const [editingStudent, setEditingStudent] = useState(null); // { mentorName, classId, studentId }
  const [editStudentName, setEditStudentName] = useState("");
  
  // State pentru editarea datelor clasei
  const [editingClassDates, setEditingClassDates] = useState(null); // { mentorName, classId }
  const [editClassStartDate, setEditClassStartDate] = useState("");
  const [editClassEndDate, setEditClassEndDate] = useState("");

  // State pentru modals
  const [showModal, setShowModal] = useState(false);
  const [modalConfig, setModalConfig] = useState({ type: 'alert', title: '', message: '', onConfirm: null });

  // Funcții pentru modals
  const showAlert = (title, message) => {
    setModalConfig({ type: 'alert', title, message, onConfirm: null });
    setShowModal(true);
  };

  const showConfirm = (title, message, onConfirm) => {
    setModalConfig({ type: 'confirm', title, message, onConfirm });
    setShowModal(true);
  };

  const closeModal = () => {
    setShowModal(false);
  };

  const handleConfirm = () => {
    if (modalConfig.onConfirm) {
      modalConfig.onConfirm();
    }
    closeModal();
  };

  // Salvăm în Firebase când mentorClasses se schimbă
  useEffect(() => {
    const saveToFirebase = async () => {
      if (Object.keys(mentorClasses).length === 0) return;
      
      try {
        const docRef = doc(db, 'mentorData', 'allMentors');
        await setDoc(docRef, { mentorClasses, updatedAt: new Date().toISOString() });
      } catch (error) {
        console.error('Eroare la salvarea în Firebase:', error);
      }
    };
    
    saveToFirebase();
  }, [mentorClasses]);

  // Încărcăm datele din Firebase când aplicația pornește
  useEffect(() => {
    const loadFromFirebase = async () => {
      setLoadingData(true);
      try {
        const docRef = doc(db, 'mentorData', 'allMentors');
        const docSnap = await getDoc(docRef);
        
        if (docSnap.exists()) {
          const data = docSnap.data();
          setMentorClasses(data.mentorClasses || {});
        }
      } catch (error) {
        console.error('Eroare la încărcarea din Firebase:', error);
      } finally {
        setLoadingData(false);
      }
    };
    
    loadFromFirebase();
  }, []);

  // Încărcăm clasa curentă când mentorul se autentifică
  useEffect(() => {
    if (currentMentor) {
      const mentorData = mentorClasses[currentMentor];
      if (mentorData && mentorData.currentClass) {
        setCurrentClass(mentorData.currentClass);
        setStudentCount(mentorData.currentClass.students.length);
        setStartDate(mentorData.currentClass.startDate);
        setEndDate(mentorData.currentClass.endDate);
      } else {
        setCurrentClass(null);
        setStudentCount(0);
        setStartDate("");
        setEndDate("");
      }
    }
  }, [currentMentor, mentorClasses]);

  // Funcție pentru login
  const handleLogin = (e) => {
    e.preventDefault();
    const user = mentors.find(
      (m) => m.username === username && m.password === password
    );
    if (user) {
      setIsAuthenticated(true);
      setCurrentMentor(username);
      setCurrentRole(user.role);
      setLoginError("");
    } else {
      setLoginError("Username sau parolă greșită!");
    }
  };

  // Funcție pentru logout
  const handleLogout = () => {
    setIsAuthenticated(false);
    setCurrentMentor(null);
    setCurrentRole(null);
    setUsername("");
    setPassword("");
    setCurrentClass(null);
  };

  // Funcție pentru a crea o clasă nouă
  const createNewClass = () => {
    if (!startDate || !endDate) {
      showAlert("Date lipsă", "Te rog completează perioada de start și finish!");
      return;
    }

    const newClass = {
      id: Date.now(),
      startDate,
      endDate,
      students: [],
      status: "active",
      createdAt: new Date().toISOString(),
    };

    setMentorClasses((prev) => ({
      ...prev,
      [currentMentor]: {
        ...prev[currentMentor],
        currentClass: newClass,
        history: [
          ...(prev[currentMentor]?.history || []),
        ],
      },
    }));
  };

  // Funcție pentru a adăuga un student
  const addStudent = () => {
    if (!currentClass) {
      showAlert("Clasă lipsă", "Te rog creează o clasă înainte de a adăuga studenți!");
      return;
    }
    if (currentClass.students.length >= 20) {
      showAlert("Clasă completă", "Clasa este deja completă (20 studenți)!");
      return;
    }
    if (!newStudentName.trim()) {
      showAlert("Nume lipsă", "Te rog introdu numele studentului pentru a-l putea adăuga în clasă.");
      return;
    }

    const updatedClass = {
      ...currentClass,
      students: [
        ...currentClass.students,
        {
          id: Date.now(),
          name: newStudentName,
          addedAt: new Date().toISOString(),
        },
      ],
    };

    setMentorClasses((prev) => ({
      ...prev,
      [currentMentor]: {
        ...prev[currentMentor],
        currentClass: updatedClass,
      },
    }));

    setNewStudentName("");
  };

  // Funcție pentru a elimina un student
  const removeStudent = (studentId) => {
    const updatedClass = {
      ...currentClass,
      students: currentClass.students.filter((s) => s.id !== studentId),
    };

    setMentorClasses((prev) => ({
      ...prev,
      [currentMentor]: {
        ...prev[currentMentor],
        currentClass: updatedClass,
      },
    }));
  };

  // Funcție pentru a încheia clasa și a o muta în istoric
  const finishClass = () => {
    if (!currentClass) return;

    const finishedClass = {
      ...currentClass,
      status: "completed",
      completedAt: new Date().toISOString(),
    };

    setMentorClasses((prev) => ({
      ...prev,
      [currentMentor]: {
        currentClass: null,
        history: [...(prev[currentMentor]?.history || []), finishedClass],
      },
    }));

    setStartDate("");
    setEndDate("");
  };

  // Funcție pentru a edita un student din istoric
  const editStudentInHistory = (mentorName, classId, studentId, newName) => {
    if (!newName.trim()) {
      showAlert("Nume invalid", "Te rog introdu un nume valid pentru student!");
      return;
    }

    setMentorClasses((prev) => {
      const mentorData = prev[mentorName];
      if (!mentorData || !mentorData.history) return prev;

      const updatedHistory = mentorData.history.map(cls => {
        if (cls.id === classId) {
          return {
            ...cls,
            students: cls.students.map(student => 
              student.id === studentId 
                ? { ...student, name: newName, editedAt: new Date().toISOString() }
                : student
            )
          };
        }
        return cls;
      });

      return {
        ...prev,
        [mentorName]: {
          ...mentorData,
          history: updatedHistory
        }
      };
    });

    setEditingStudent(null);
    setEditStudentName("");
  };

  // Funcție pentru a șterge un student din istoric
  const deleteStudentFromHistory = (mentorName, classId, studentId) => {
    showConfirm(
      "Șterge Student",
      "Ești sigur că vrei să ștergi acest student din istoric? Această acțiune nu poate fi anulată.",
      () => {
        setMentorClasses((prev) => {
      const mentorData = prev[mentorName];
      if (!mentorData || !mentorData.history) return prev;

      const updatedHistory = mentorData.history.map(cls => {
        if (cls.id === classId) {
          return {
            ...cls,
            students: cls.students.filter(student => student.id !== studentId)
          };
        }
        return cls;
      });

          return {
            ...prev,
            [mentorName]: {
              ...mentorData,
              history: updatedHistory
            }
          };
        });
      }
    );
  };

  // Funcție pentru a edita datele unei clase din istoric
  const editClassDatesInHistory = (mentorName, classId, newStartDate, newEndDate) => {
    if (!newStartDate || !newEndDate) {
      showAlert("Date lipsă", "Te rog completează ambele date pentru a continua!");
      return;
    }

    setMentorClasses((prev) => {
      const mentorData = prev[mentorName];
      if (!mentorData || !mentorData.history) return prev;

      const updatedHistory = mentorData.history.map(cls => {
        if (cls.id === classId) {
          return {
            ...cls,
            startDate: newStartDate,
            endDate: newEndDate,
            datesEditedAt: new Date().toISOString()
          };
        }
        return cls;
      });

      return {
        ...prev,
        [mentorName]: {
          ...mentorData,
          history: updatedHistory
        }
      };
    });

    setEditingClassDates(null);
    setEditClassStartDate("");
    setEditClassEndDate("");
  };

  // Funcție pentru a șterge complet o clasă din istoric
  const deleteClassFromHistory = (mentorName, classId) => {
    showConfirm(
      "Șterge Clasa",
      "Ești sigur că vrei să ștergi această clasă complet? Toți studenții din această clasă vor fi eliminați permanent. Această acțiune nu poate fi anulată.",
      () => {
        setMentorClasses((prev) => {
      const mentorData = prev[mentorName];
      if (!mentorData || !mentorData.history) return prev;

      const updatedHistory = mentorData.history.filter(cls => cls.id !== classId);

          return {
            ...prev,
            [mentorName]: {
              ...mentorData,
              history: updatedHistory
            }
          };
        });
      }
    );
  };

  // Pagina de login
  if (!isAuthenticated) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-black to-gray-900 flex items-center justify-center px-4">
        <Card className="w-full max-w-md bg-gray-900/50 backdrop-blur-sm border border-gray-700/50 shadow-2xl">
          <CardContent className="p-8 space-y-6">
            <div className="text-center space-y-4">
              <div className="flex justify-center">
                <img src={logo} alt="ProFX Logo" className="h-16 w-auto" />
              </div>
              <h1 className="text-3xl font-bold text-blue-400">
                Mentori 1:20
              </h1>
              <p className="text-gray-300 text-sm">
                Autentifică-te pentru a accesa dashboard-ul tău
              </p>
              {loadingData && (
                <p className="text-blue-400 text-sm animate-pulse">
                  Încărcare date...
                </p>
              )}
            </div>

            <form onSubmit={handleLogin} className="space-y-4">
              <div>
                <label className="block text-sm font-medium mb-2 text-white">
                  Username
                </label>
                <Input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="w-full p-3 bg-gray-800/50 border border-gray-600/50 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400/50"
                  placeholder="Introdu username-ul"
                />
              </div>

              <div>
                <label className="block text-sm font-medium mb-2 text-white">
                  Parolă
                </label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="w-full p-3 bg-gray-800/50 border border-gray-600/50 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400/50"
                  placeholder="Introdu parola"
                />
              </div>

              {loginError && (
                <div className="bg-red-500/20 border border-red-500/50 text-red-300 p-3 rounded-xl text-sm text-center">
                  {loginError}
                </div>
              )}

              <button
                type="submit"
                className="w-full bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white font-bold py-3 px-6 rounded-xl transition-all duration-300 shadow-lg hover:shadow-blue-500/50"
              >
                Autentifică-te
              </button>
            </form>

            <div className="text-center text-gray-400 text-xs">
              <p>Mentori: Sergiu, Dan, Tudor, Eli, Adrian</p>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  // Dashboard-ul Admin
  if (currentRole === "admin") {
    const allMentorNames = ["Sergiu", "Dan", "Tudor", "Eli", "Adrian"];
    
    // Calculăm statistici generale
    const totalActiveClasses = allMentorNames.filter(
      name => mentorClasses[name]?.currentClass
    ).length;
    
    const totalCompletedClasses = allMentorNames.reduce(
      (sum, name) => sum + (mentorClasses[name]?.history?.length || 0), 0
    );
    
    const totalActiveStudents = allMentorNames.reduce(
      (sum, name) => sum + (mentorClasses[name]?.currentClass?.students.length || 0), 0
    );

    const totalHistoricalStudents = allMentorNames.reduce(
      (sum, name) => sum + (mentorClasses[name]?.history?.reduce(
        (s, cls) => s + cls.students.length, 0
      ) || 0), 0
    );

    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-950 via-black to-gray-900">
        <div className="max-w-7xl mx-auto pt-10 space-y-6 text-white px-4 pb-10">
          {/* Header Admin */}
          <Card className="bg-gray-900/50 backdrop-blur-sm border border-gray-700/50 shadow-2xl">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-4">
                  <img src={logo} alt="ProFX Logo" className="h-12 w-auto" />
                  <div>
                    <h1 className="text-2xl font-bold text-purple-400">
                      👑 Admin Dashboard
                    </h1>
                    <p className="text-gray-400 text-sm">Overview Complet Mentori 1:20</p>
                  </div>
                </div>
                <button
                  onClick={handleLogout}
                  className="bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 text-red-300 px-6 py-2 rounded-xl transition-all duration-300"
                >
                  Logout
                </button>
              </div>
            </CardContent>
          </Card>

          {/* Statistici Generale */}
          <Card className="bg-gray-900/50 backdrop-blur-sm border border-gray-700/50 shadow-2xl">
            <CardContent className="p-6">
              <h2 className="text-2xl font-bold text-yellow-400 mb-6">
                Statistici Generale
              </h2>
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                <div className="bg-gradient-to-br from-green-500/10 to-green-600/5 backdrop-blur-sm border border-green-500/30 p-4 rounded-xl">
                  <div className="text-gray-300 text-sm mb-1">Clase Active</div>
                  <div className="text-3xl font-bold text-green-400">{totalActiveClasses}</div>
                </div>
                <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 backdrop-blur-sm border border-blue-500/30 p-4 rounded-xl">
                  <div className="text-gray-300 text-sm mb-1">Clase Finalizate</div>
                  <div className="text-3xl font-bold text-blue-400">{totalCompletedClasses}</div>
                </div>
                <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 backdrop-blur-sm border border-purple-500/30 p-4 rounded-xl">
                  <div className="text-gray-300 text-sm mb-1">Studenți Activi</div>
                  <div className="text-3xl font-bold text-purple-400">{totalActiveStudents}</div>
                </div>
                <div className="bg-gradient-to-br from-amber-500/10 to-amber-600/5 backdrop-blur-sm border border-amber-500/30 p-4 rounded-xl">
                  <div className="text-gray-300 text-sm mb-1">Total Istoric</div>
                  <div className="text-3xl font-bold text-amber-400">{totalHistoricalStudents}</div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Detalii pe Mentor */}
          {allMentorNames.map((mentorName) => {
            const mentorData = mentorClasses[mentorName];
            const currentClass = mentorData?.currentClass;
            const history = mentorData?.history || [];
            const hasData = currentClass || history.length > 0;

            if (!hasData) return null;

            const spotsRemaining = currentClass ? 20 - currentClass.students.length : 0;

            return (
              <Card key={mentorName} className="bg-gray-900/50 backdrop-blur-sm border border-gray-700/50 shadow-2xl">
                <CardContent className="p-6 space-y-4">
                  <div className="flex items-center justify-between">
                    <h2 className="text-2xl font-bold text-blue-400">
                      Mentor: {mentorName}
                    </h2>
                    {currentClass && (
                      <div className={`px-4 py-2 rounded-full text-sm font-bold ${
                        currentClass.students.length === 20
                          ? "bg-red-500/20 border border-red-500/50 text-red-300"
                          : "bg-green-500/20 border border-green-500/50 text-green-300"
                      }`}>
                        {currentClass.students.length === 20 ? "FULL" : "ACTIVE"}
                      </div>
                    )}
                  </div>

                  {/* Clasa Activă */}
                  {currentClass && (
                    <div className="bg-gray-800/30 p-4 rounded-xl border border-gray-700/50">
                      <h3 className="text-lg font-bold text-yellow-400 mb-3">Clasa Activă</h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-3">
                        <div>
                          <span className="text-gray-400">Start:</span>
                          <span className="text-white ml-2">
                            {new Date(currentClass.startDate).toLocaleDateString('ro-RO')}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-400">Finish:</span>
                          <span className="text-white ml-2">
                            {new Date(currentClass.endDate).toLocaleDateString('ro-RO')}
                          </span>
                        </div>
                        <div>
                          <span className="text-gray-400">Studenți:</span>
                          <span className="text-white ml-2">{currentClass.students.length} / 20</span>
                        </div>
                        <div>
                          <span className="text-gray-400">Locuri rămase:</span>
                          <span className={`ml-2 font-bold ${
                            spotsRemaining === 0 ? "text-red-400" : "text-green-400"
                          }`}>
                            {spotsRemaining}
                          </span>
                        </div>
                      </div>
                      
                      {/* Progress Bar */}
                      <div className="space-y-2">
                        <div className="flex justify-between text-xs text-gray-400">
                          <span>Progres</span>
                          <span>{Math.round((currentClass.students.length / 20) * 100)}%</span>
                        </div>
                        <div className="w-full bg-gray-700/50 rounded-full h-2 overflow-hidden">
                          <div
                            className="h-full bg-gradient-to-r from-green-500 to-blue-500 transition-all duration-500"
                            style={{ width: `${(currentClass.students.length / 20) * 100}%` }}
                          />
                        </div>
                      </div>

                      {/* Lista Studenților din Clasa Activă */}
                      {currentClass.students.length > 0 && (
                        <div className="mt-4">
                          <h4 className="text-sm font-bold text-white mb-2">
                            Studenți Înscriși ({currentClass.students.length})
                          </h4>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                            {currentClass.students.map((student, idx) => (
                              <div
                                key={student.id}
                                className="flex items-center space-x-2 bg-gray-900/50 p-2 rounded-lg text-sm"
                              >
                                <div className="bg-blue-500/20 text-blue-400 font-bold w-6 h-6 rounded-full flex items-center justify-center text-xs">
                                  {idx + 1}
                                </div>
                                <span className="text-white text-xs">{student.name}</span>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  )}

                  {/* Istoric */}
                  {history.length > 0 && (
                    <div className="bg-gray-800/30 p-4 rounded-xl border border-gray-700/50">
                      <h3 className="text-lg font-bold text-gray-300 mb-3">
                        Istoric: {history.length} clase finalizate
                      </h3>
                      <div className="space-y-2">
                        {history.map((cls, index) => {
                          const isExpanded = expandedClasses.includes(cls.id);
                          return (
                            <div
                              key={cls.id}
                              className="bg-gray-900/50 rounded-lg border border-gray-700/30 overflow-hidden"
                            >
                              <div className="p-3">
                                <div 
                                  className="cursor-pointer hover:bg-gray-800/50 transition-all duration-300 rounded-lg p-2 -m-2"
                                  onClick={() => {
                                    if (isExpanded) {
                                      setExpandedClasses(expandedClasses.filter(id => id !== cls.id));
                                    } else {
                                      setExpandedClasses([...expandedClasses, cls.id]);
                                    }
                                  }}
                                >
                                  <div className="flex items-center justify-between text-sm mb-3">
                                    <div className="flex items-center space-x-2">
                                      <span className="text-blue-400 font-semibold">
                                        Clasa #{history.length - index}
                                      </span>
                                      <span className="text-gray-500">•</span>
                                      <span className="text-gray-400">
                                        {cls.students.length} studenți
                                      </span>
                                    </div>
                                    <svg
                                      className={`w-4 h-4 text-blue-400 transition-transform duration-300 ${
                                        isExpanded ? "rotate-180" : ""
                                      }`}
                                      fill="none"
                                      stroke="currentColor"
                                      viewBox="0 0 24 24"
                                    >
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                                    </svg>
                                  </div>
                                </div>

                                {/* Datele clasei cu opțiune de editare */}
                                <div className="grid grid-cols-2 gap-2 text-xs mb-2">
                                  {editingClassDates?.mentorName === mentorName && editingClassDates?.classId === cls.id ? (
                                    <>
                                      <div>
                                        <label className="text-gray-400 block mb-1">Start:</label>
                                        <Input
                                          type="date"
                                          value={editClassStartDate}
                                          onChange={(e) => setEditClassStartDate(e.target.value)}
                                          className="w-full px-2 py-1 bg-gray-900/50 border border-blue-500/50 text-white rounded text-xs"
                                        />
                                      </div>
                                      <div>
                                        <label className="text-gray-400 block mb-1">Finish:</label>
                                        <Input
                                          type="date"
                                          value={editClassEndDate}
                                          onChange={(e) => setEditClassEndDate(e.target.value)}
                                          className="w-full px-2 py-1 bg-gray-900/50 border border-blue-500/50 text-white rounded text-xs"
                                        />
                                      </div>
                                      <div className="col-span-2 flex gap-2">
                                        <button
                                          onClick={() => editClassDatesInHistory(mentorName, cls.id, editClassStartDate, editClassEndDate)}
                                          className="flex-1 bg-green-500/20 hover:bg-green-500/30 border border-green-500/50 text-green-300 px-2 py-1 rounded transition-all duration-300 text-xs"
                                        >
                                          ✓ Salvează Date
                                        </button>
                                        <button
                                          onClick={() => {
                                            setEditingClassDates(null);
                                            setEditClassStartDate("");
                                            setEditClassEndDate("");
                                          }}
                                          className="flex-1 bg-gray-500/20 hover:bg-gray-500/30 border border-gray-500/50 text-gray-300 px-2 py-1 rounded transition-all duration-300 text-xs"
                                        >
                                          ✕ Anulează
                                        </button>
                                      </div>
                                    </>
                                  ) : (
                                    <>
                                      <div className="flex items-center justify-between">
                                        <span className="text-gray-400">Start:</span>
                                        <span className="text-white">
                                          {new Date(cls.startDate).toLocaleDateString('ro-RO')}
                                        </span>
                                      </div>
                                      <div className="flex items-center justify-between">
                                        <span className="text-gray-400">Finish:</span>
                                        <span className="text-white">
                                          {new Date(cls.endDate).toLocaleDateString('ro-RO')}
                                        </span>
                                      </div>
                                      <div className="col-span-2 flex gap-2">
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            setEditingClassDates({ mentorName, classId: cls.id });
                                            setEditClassStartDate(cls.startDate);
                                            setEditClassEndDate(cls.endDate);
                                          }}
                                          className="flex-1 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/50 text-blue-300 px-2 py-1 rounded transition-all duration-300 text-xs"
                                        >
                                          ✎ Editează Date
                                        </button>
                                        <button
                                          onClick={(e) => {
                                            e.stopPropagation();
                                            deleteClassFromHistory(mentorName, cls.id);
                                          }}
                                          className="flex-1 bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 text-red-300 px-2 py-1 rounded transition-all duration-300 text-xs"
                                        >
                                          🗑 Șterge Clasa
                                        </button>
                                      </div>
                                    </>
                                  )}
                                </div>
                              </div>

                              {isExpanded && cls.students.length > 0 && (
                                <div className="px-3 pb-3 border-t border-gray-700/30 pt-3 bg-gray-950/30">
                                  <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto">
                                    {cls.students.map((student, studentIndex) => {
                                      const isEditing = editingStudent?.mentorName === mentorName && 
                                                       editingStudent?.classId === cls.id && 
                                                       editingStudent?.studentId === student.id;
                                      
                                      return (
                                        <div
                                          key={student.id}
                                          className="flex items-center justify-between bg-gray-800/50 p-2 rounded text-xs border border-gray-700/30"
                                        >
                                          <div className="flex items-center space-x-2 flex-1">
                                            <div className="bg-blue-500/20 text-blue-400 font-bold w-5 h-5 rounded-full flex items-center justify-center text-xs flex-shrink-0">
                                              {studentIndex + 1}
                                            </div>
                                            {isEditing ? (
                                              <Input
                                                type="text"
                                                value={editStudentName}
                                                onChange={(e) => setEditStudentName(e.target.value)}
                                                onKeyPress={(e) => {
                                                  if (e.key === 'Enter') {
                                                    editStudentInHistory(mentorName, cls.id, student.id, editStudentName);
                                                  }
                                                }}
                                                className="flex-1 px-2 py-1 bg-gray-900 border border-blue-500/50 text-white rounded text-xs"
                                                autoFocus
                                              />
                                            ) : (
                                              <span className="text-white flex-1">{student.name}</span>
                                            )}
                                          </div>
                                          <div className="flex items-center space-x-1 ml-2">
                                            {isEditing ? (
                                              <>
                                                <button
                                                  onClick={() => editStudentInHistory(mentorName, cls.id, student.id, editStudentName)}
                                                  className="bg-green-500/20 hover:bg-green-500/30 border border-green-500/50 text-green-300 px-2 py-1 rounded transition-all duration-300 text-xs"
                                                >
                                                  ✓
                                                </button>
                                                <button
                                                  onClick={() => {
                                                    setEditingStudent(null);
                                                    setEditStudentName("");
                                                  }}
                                                  className="bg-gray-500/20 hover:bg-gray-500/30 border border-gray-500/50 text-gray-300 px-2 py-1 rounded transition-all duration-300 text-xs"
                                                >
                                                  ✕
                                                </button>
                                              </>
                                            ) : (
                                              <>
                                                <button
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    setEditingStudent({ mentorName, classId: cls.id, studentId: student.id });
                                                    setEditStudentName(student.name);
                                                  }}
                                                  className="bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/50 text-blue-300 px-2 py-1 rounded transition-all duration-300 text-xs"
                                                  title="Editează"
                                                >
                                                  ✎
                                                </button>
                                                <button
                                                  onClick={(e) => {
                                                    e.stopPropagation();
                                                    deleteStudentFromHistory(mentorName, cls.id, student.id);
                                                  }}
                                                  className="bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 text-red-300 px-2 py-1 rounded transition-all duration-300 text-xs"
                                                  title="Șterge"
                                                >
                                                  🗑
                                                </button>
                                              </>
                                            )}
                                          </div>
                                        </div>
                                      );
                                    })}
                                  </div>
                                </div>
                              )}
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>
    );
  }

  // Dashboard-ul mentorului
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-black to-gray-900">
      <div className="max-w-6xl mx-auto pt-10 space-y-6 text-white px-4 pb-10">
        {/* Header cu logo și logout */}
        <Card className="bg-gray-900/50 backdrop-blur-sm border border-gray-700/50 shadow-2xl">
          <CardContent className="p-6">
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-4">
                <img src={logo} alt="ProFX Logo" className="h-12 w-auto" />
                <div>
                  <h1 className="text-2xl font-bold text-blue-400">
                    Bun venit, {currentMentor}!
                  </h1>
                  <p className="text-gray-400 text-sm">Dashboard Mentor 1:20</p>
                </div>
              </div>
              <button
                onClick={handleLogout}
                className="bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 text-red-300 px-6 py-2 rounded-xl transition-all duration-300"
              >
                Logout
              </button>
            </div>
          </CardContent>
        </Card>

        {/* Clasa Curentă */}
        {!currentClass ? (
          <Card className="bg-gray-900/50 backdrop-blur-sm border border-gray-700/50 shadow-2xl">
            <CardContent className="p-6 space-y-6">
              <h2 className="text-2xl font-bold text-yellow-400">
                Creează o Clasă Nouă
              </h2>
              <p className="text-gray-300">
                Nu ai o clasă activă momentan. Creează una nouă pentru a începe!
              </p>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2 text-white">
                    Data de Start
                  </label>
                  <Input
                    type="date"
                    value={startDate}
                    onChange={(e) => setStartDate(e.target.value)}
                    className="w-full p-3 bg-gray-800/50 border border-gray-600/50 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400/50"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2 text-white">
                    Data de Finish
                  </label>
                  <Input
                    type="date"
                    value={endDate}
                    onChange={(e) => setEndDate(e.target.value)}
                    className="w-full p-3 bg-gray-800/50 border border-gray-600/50 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-400/50"
                  />
                </div>
              </div>

              <button
                onClick={createNewClass}
                className="w-full bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold py-3 px-6 rounded-xl transition-all duration-300 shadow-lg hover:shadow-green-500/50"
              >
                Creează Clasa
              </button>
            </CardContent>
          </Card>
        ) : (
          <>
            {/* Informații Clasă Activă */}
            <Card className="bg-gray-900/50 backdrop-blur-sm border border-gray-700/50 shadow-2xl">
              <CardContent className="p-6 space-y-6">
                <div className="flex items-center justify-between">
                  <h2 className="text-2xl font-bold text-yellow-400">
                    Clasa Activă
                  </h2>
                  <div className={`px-4 py-2 rounded-full text-sm font-bold ${
                    currentClass.students.length === 20
                      ? "bg-red-500/20 border border-red-500/50 text-red-300"
                      : "bg-green-500/20 border border-green-500/50 text-green-300"
                  }`}>
                    {currentClass.students.length === 20 ? "FULL" : "ACTIVE"}
                  </div>
                </div>

                {/* Informații Perioadă */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <div className="bg-gradient-to-br from-blue-500/10 to-blue-600/5 backdrop-blur-sm border border-blue-500/30 p-4 rounded-xl">
                    <div className="text-gray-300 text-sm mb-1">Data Start</div>
                    <div className="text-xl font-bold text-blue-400">
                      {new Date(currentClass.startDate).toLocaleDateString('ro-RO')}
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-purple-500/10 to-purple-600/5 backdrop-blur-sm border border-purple-500/30 p-4 rounded-xl">
                    <div className="text-gray-300 text-sm mb-1">Data Finish</div>
                    <div className="text-xl font-bold text-purple-400">
                      {new Date(currentClass.endDate).toLocaleDateString('ro-RO')}
                    </div>
                  </div>
                  <div className="bg-gradient-to-br from-green-500/10 to-green-600/5 backdrop-blur-sm border border-green-500/30 p-4 rounded-xl">
                    <div className="text-gray-300 text-sm mb-1">Studenți</div>
                    <div className="text-xl font-bold text-green-400">
                      {currentClass.students.length} / 20
                    </div>
                  </div>
                </div>

                {/* Progress Bar */}
                <div className="space-y-2">
                  <div className="flex justify-between text-sm text-gray-400">
                    <span>Progres Completare</span>
                    <span>{Math.round((currentClass.students.length / 20) * 100)}%</span>
                  </div>
                  <div className="w-full bg-gray-700/50 rounded-full h-3 overflow-hidden">
                    <div
                      className="h-full bg-gradient-to-r from-green-500 to-blue-500 transition-all duration-500"
                      style={{ width: `${(currentClass.students.length / 20) * 100}%` }}
                    />
                  </div>
                </div>

                {/* Adaugă Student */}
                {currentClass.students.length < 20 && (
                  <div className="bg-gray-800/30 p-4 rounded-xl space-y-3">
                    <label className="block text-sm font-medium text-white">
                      Adaugă Student Nou
                    </label>
                    <div className="flex gap-3">
                      <Input
                        type="text"
                        value={newStudentName}
                        onChange={(e) => setNewStudentName(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && addStudent()}
                        placeholder="Numele studentului"
                        className="flex-1 p-3 bg-gray-800/50 border border-gray-600/50 text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-green-400/50"
                      />
                      <button
                        onClick={addStudent}
                        className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700 text-white font-bold px-6 py-3 rounded-xl transition-all duration-300 shadow-lg hover:shadow-green-500/50"
                      >
                        Adaugă
                      </button>
                    </div>
                  </div>
                )}

                {/* Lista Studenților */}
                <div className="space-y-3">
                  <h3 className="text-lg font-bold text-white">
                    Lista Studenților ({currentClass.students.length})
                  </h3>
                  {currentClass.students.length === 0 ? (
                    <div className="text-center text-gray-400 py-8">
                      Nu există studenți înscriși încă
                    </div>
                  ) : (
                    <div className="grid grid-cols-1 gap-2 max-h-96 overflow-y-auto">
                      {currentClass.students.map((student, index) => (
                        <div
                          key={student.id}
                          className="flex items-center justify-between bg-gray-800/30 p-3 rounded-lg border border-gray-700/50 hover:border-blue-500/50 transition-all duration-300"
                        >
                          <div className="flex items-center space-x-3">
                            <div className="bg-blue-500/20 text-blue-400 font-bold w-8 h-8 rounded-full flex items-center justify-center text-sm">
                              {index + 1}
                            </div>
                            <div>
                              <div className="text-white font-medium">{student.name}</div>
                              <div className="text-gray-400 text-xs">
                                Adăugat: {new Date(student.addedAt).toLocaleDateString('ro-RO')}
                              </div>
                            </div>
                          </div>
                          <button
                            onClick={() => removeStudent(student.id)}
                            className="bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 text-red-300 px-4 py-2 rounded-lg transition-all duration-300 text-sm"
                          >
                            Elimină
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Buton Finalizare Clasă */}
                <button
                  onClick={finishClass}
                  className="w-full bg-gradient-to-r from-orange-500 to-orange-600 hover:from-orange-600 hover:to-orange-700 text-white font-bold py-3 px-6 rounded-xl transition-all duration-300 shadow-lg hover:shadow-orange-500/50"
                >
                  Finalizează Clasa și Începe una Nouă
                </button>
              </CardContent>
            </Card>
          </>
        )}

        {/* Istoric Clase */}
        {mentorClasses[currentMentor]?.history?.length > 0 && (
          <Card className="bg-gray-900/50 backdrop-blur-sm border border-gray-700/50 shadow-2xl">
            <CardContent className="p-6 space-y-4">
              <h2 className="text-2xl font-bold text-yellow-400">
                Istoric Clase Finalizate
              </h2>
              <div className="space-y-3">
                {mentorClasses[currentMentor].history.map((cls, index) => {
                  const isExpanded = expandedClasses.includes(cls.id);
                  
                  return (
                    <div
                      key={cls.id}
                      className="bg-gray-800/30 rounded-xl border border-gray-700/50 overflow-hidden hover:border-blue-500/50 transition-all duration-300"
                    >
                      <div 
                        className="p-4 cursor-pointer hover:bg-gray-800/50 transition-all duration-300"
                        onClick={() => {
                          if (isExpanded) {
                            setExpandedClasses(expandedClasses.filter(id => id !== cls.id));
                          } else {
                            setExpandedClasses([...expandedClasses, cls.id]);
                          }
                        }}
                      >
                        <div className="flex items-center justify-between mb-2">
                          <div className="flex items-center space-x-3">
                            <h3 className="text-lg font-bold text-blue-400">
                              Clasa #{mentorClasses[currentMentor].history.length - index}
                            </h3>
                            <div className="bg-gray-500/20 border border-gray-500/50 text-gray-300 px-3 py-1 rounded-full text-xs font-bold">
                              COMPLETED
                            </div>
                          </div>
                          <div className="flex items-center space-x-2">
                            <span className="text-xs text-gray-400">
                              {isExpanded ? "Ascunde studenți" : "Vezi studenți"}
                            </span>
                            <svg
                              className={`w-5 h-5 text-blue-400 transition-transform duration-300 ${
                                isExpanded ? "rotate-180" : ""
                              }`}
                              fill="none"
                              stroke="currentColor"
                              viewBox="0 0 24 24"
                            >
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                            </svg>
                          </div>
                        </div>
                        
                        {/* Informații Clasă cu opțiune de editare date */}
                        <div className="space-y-3">
                          {editingClassDates?.mentorName === currentMentor && editingClassDates?.classId === cls.id ? (
                            <div className="bg-gray-800/30 p-3 rounded-xl border border-blue-500/50">
                              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
                                <div>
                                  <label className="block text-xs font-medium mb-1 text-gray-400">
                                    Data de Start
                                  </label>
                                  <Input
                                    type="date"
                                    value={editClassStartDate}
                                    onChange={(e) => setEditClassStartDate(e.target.value)}
                                    className="w-full p-2 bg-gray-900/50 border border-blue-500/50 text-white rounded-lg text-sm"
                                  />
                                </div>
                                <div>
                                  <label className="block text-xs font-medium mb-1 text-gray-400">
                                    Data de Finish
                                  </label>
                                  <Input
                                    type="date"
                                    value={editClassEndDate}
                                    onChange={(e) => setEditClassEndDate(e.target.value)}
                                    className="w-full p-2 bg-gray-900/50 border border-blue-500/50 text-white rounded-lg text-sm"
                                  />
                                </div>
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={() => editClassDatesInHistory(currentMentor, cls.id, editClassStartDate, editClassEndDate)}
                                  className="flex-1 bg-green-500/20 hover:bg-green-500/30 border border-green-500/50 text-green-300 px-4 py-2 rounded-lg transition-all duration-300 text-sm font-bold"
                                >
                                  ✓ Salvează Date
                                </button>
                                <button
                                  onClick={() => {
                                    setEditingClassDates(null);
                                    setEditClassStartDate("");
                                    setEditClassEndDate("");
                                  }}
                                  className="flex-1 bg-gray-500/20 hover:bg-gray-500/30 border border-gray-500/50 text-gray-300 px-4 py-2 rounded-lg transition-all duration-300 text-sm"
                                >
                                  ✕ Anulează
                                </button>
                              </div>
                            </div>
                          ) : (
                            <>
                              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                                <div>
                                  <span className="text-gray-400">Start:</span>
                                  <span className="text-white ml-2">
                                    {new Date(cls.startDate).toLocaleDateString('ro-RO')}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-gray-400">Finish:</span>
                                  <span className="text-white ml-2">
                                    {new Date(cls.endDate).toLocaleDateString('ro-RO')}
                                  </span>
                                </div>
                                <div>
                                  <span className="text-gray-400">Studenți:</span>
                                  <span className="text-white ml-2">{cls.students.length}</span>
                                </div>
                                <div>
                                  <span className="text-gray-400">Finalizat:</span>
                                  <span className="text-white ml-2">
                                    {new Date(cls.completedAt).toLocaleDateString('ro-RO')}
                                  </span>
                                </div>
                              </div>
                              <div className="mt-2 flex gap-2">
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    setEditingClassDates({ mentorName: currentMentor, classId: cls.id });
                                    setEditClassStartDate(cls.startDate);
                                    setEditClassEndDate(cls.endDate);
                                  }}
                                  className="flex-1 bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/50 text-blue-300 px-4 py-2 rounded-lg transition-all duration-300 text-sm"
                                >
                                  ✎ Editează Datele Clasei
                                </button>
                                <button
                                  onClick={(e) => {
                                    e.stopPropagation();
                                    deleteClassFromHistory(currentMentor, cls.id);
                                  }}
                                  className="flex-1 bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 text-red-300 px-4 py-2 rounded-lg transition-all duration-300 text-sm"
                                >
                                  🗑 Șterge Clasa
                                </button>
                              </div>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Lista Studenților - Expandabilă */}
                      {isExpanded && (
                        <div className="px-4 pb-4 border-t border-gray-700/50 pt-4 bg-gray-900/30">
                          <h4 className="text-sm font-bold text-yellow-400 mb-3">
                            Lista Studenților ({cls.students.length})
                          </h4>
                          {cls.students.length === 0 ? (
                            <div className="text-center text-gray-400 py-4 text-sm">
                              Nu există studenți înregistrați
                            </div>
                          ) : (
                            <div className="grid grid-cols-1 gap-2 max-h-64 overflow-y-auto">
                              {cls.students.map((student, studentIndex) => {
                                const isEditing = editingStudent?.mentorName === currentMentor && 
                                                 editingStudent?.classId === cls.id && 
                                                 editingStudent?.studentId === student.id;
                                
                                return (
                                  <div
                                    key={student.id}
                                    className="flex items-center justify-between bg-gray-800/50 p-3 rounded-lg border border-gray-700/30 hover:border-blue-500/50 transition-all duration-300"
                                  >
                                    <div className="flex items-center space-x-3 flex-1">
                                      <div className="bg-blue-500/20 text-blue-400 font-bold w-7 h-7 rounded-full flex items-center justify-center text-xs flex-shrink-0">
                                        {studentIndex + 1}
                                      </div>
                                      <div className="flex-1">
                                        {isEditing ? (
                                          <Input
                                            type="text"
                                            value={editStudentName}
                                            onChange={(e) => setEditStudentName(e.target.value)}
                                            onKeyPress={(e) => {
                                              if (e.key === 'Enter') {
                                                editStudentInHistory(currentMentor, cls.id, student.id, editStudentName);
                                              }
                                            }}
                                            className="w-full px-3 py-2 bg-gray-900/50 border border-blue-500/50 text-white rounded-lg text-sm"
                                            autoFocus
                                          />
                                        ) : (
                                          <>
                                            <div className="text-white font-medium text-sm">{student.name}</div>
                                            <div className="text-gray-400 text-xs">
                                              Adăugat: {new Date(student.addedAt).toLocaleDateString('ro-RO')}
                                              {student.editedAt && (
                                                <span className="ml-2 text-yellow-400">
                                                  (Editat: {new Date(student.editedAt).toLocaleDateString('ro-RO')})
                                                </span>
                                              )}
                                            </div>
                                          </>
                                        )}
                                      </div>
                                    </div>
                                    <div className="flex items-center space-x-2 ml-3">
                                      {isEditing ? (
                                        <>
                                          <button
                                            onClick={() => editStudentInHistory(currentMentor, cls.id, student.id, editStudentName)}
                                            className="bg-green-500/20 hover:bg-green-500/30 border border-green-500/50 text-green-300 px-3 py-1.5 rounded-lg transition-all duration-300 text-sm font-bold"
                                          >
                                            ✓ Salvează
                                          </button>
                                          <button
                                            onClick={() => {
                                              setEditingStudent(null);
                                              setEditStudentName("");
                                            }}
                                            className="bg-gray-500/20 hover:bg-gray-500/30 border border-gray-500/50 text-gray-300 px-3 py-1.5 rounded-lg transition-all duration-300 text-sm"
                                          >
                                            ✕
                                          </button>
                                        </>
                                      ) : (
                                        <>
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              setEditingStudent({ mentorName: currentMentor, classId: cls.id, studentId: student.id });
                                              setEditStudentName(student.name);
                                            }}
                                            className="bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/50 text-blue-300 px-3 py-1.5 rounded-lg transition-all duration-300 text-sm"
                                            title="Editează nume"
                                          >
                                            ✎ Editează
                                          </button>
                                          <button
                                            onClick={(e) => {
                                              e.stopPropagation();
                                              deleteStudentFromHistory(currentMentor, cls.id, student.id);
                                            }}
                                            className="bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 text-red-300 px-3 py-1.5 rounded-lg transition-all duration-300 text-sm"
                                            title="Șterge student"
                                          >
                                            🗑 Șterge
                                          </button>
                                        </>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Modal personalizat frumos */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 rounded-2xl shadow-2xl border border-gray-700/50 max-w-md w-full transform transition-all duration-300 scale-100 animate-scaleIn">
            <div className="p-6">
              {/* Header */}
              <div className="flex items-center gap-3 mb-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center ${
                  modalConfig.type === 'confirm' 
                    ? 'bg-red-500/20 border-2 border-red-500/50' 
                    : 'bg-blue-500/20 border-2 border-blue-500/50'
                }`}>
                  <span className="text-2xl">
                    {modalConfig.type === 'confirm' ? '⚠️' : 'ℹ️'}
                  </span>
                </div>
                <h3 className={`text-xl font-bold ${
                  modalConfig.type === 'confirm' ? 'text-red-400' : 'text-blue-400'
                }`}>
                  {modalConfig.title}
                </h3>
              </div>

              {/* Message */}
              <p className="text-gray-300 text-base leading-relaxed mb-6">
                {modalConfig.message}
              </p>

              {/* Buttons */}
              <div className="flex gap-3">
                {modalConfig.type === 'confirm' ? (
                  <>
                    <button
                      onClick={closeModal}
                      className="flex-1 bg-gray-600/20 hover:bg-gray-600/30 border border-gray-500/50 text-gray-300 px-4 py-3 rounded-xl transition-all duration-300 font-medium"
                    >
                      Anulează
                    </button>
                    <button
                      onClick={handleConfirm}
                      className="flex-1 bg-red-500/20 hover:bg-red-500/30 border border-red-500/50 text-red-300 px-4 py-3 rounded-xl transition-all duration-300 font-medium"
                    >
                      Confirmă
                    </button>
                  </>
                ) : (
                  <button
                    onClick={closeModal}
                    className="w-full bg-blue-500/20 hover:bg-blue-500/30 border border-blue-500/50 text-blue-300 px-4 py-3 rounded-xl transition-all duration-300 font-medium"
                  >
                    Am înțeles
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
