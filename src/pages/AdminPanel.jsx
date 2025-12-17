import React, { useState, useEffect } from 'react';
import { 
  getAllMentors, 
  getAllClasses, 
  getAllStudents,
  saveMentor,
  deleteMentor,
  deleteClass,
  deleteStudent
} from '../services/firebaseService';
import { 
  initializeMentorsInFirebase,
  createCompleteClass,
  exportAllData,
  validateDataConsistency
} from '../services/adminService';

const AdminPanel = () => {
  const [activeTab, setActiveTab] = useState('mentori');
  const [mentors, setMentors] = useState({});
  const [classes, setClasses] = useState([]);
  const [students, setStudents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  // Formulare
  const [newMentor, setNewMentor] = useState({ id: '', name: '', email: '', password: '', active: true });
  const [newClass, setNewClass] = useState({ 
    name: '', 
    startDate: '', 
    endDate: '', 
    students: [] 
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [mentorsData, classesData, studentsData] = await Promise.all([
        getAllMentors(),
        getAllClasses(),
        getAllStudents()
      ]);
      setMentors(mentorsData);
      setClasses(classesData);
      setStudents(studentsData);
    } catch (error) {
      setMessage(`Eroare la încărcarea datelor: ${error.message}`);
    }
    setLoading(false);
  };

  const handleInitializeMentors = async () => {
    setLoading(true);
    try {
      const results = await initializeMentorsInFirebase();
      setMessage(`Mentori inițializați: ${results.filter(r => r.success).length} succes`);
      await loadData();
    } catch (error) {
      setMessage(`Eroare: ${error.message}`);
    }
    setLoading(false);
  };

  const handleAddMentor = async (e) => {
    e.preventDefault();
    if (!newMentor.id || !newMentor.name) {
      setMessage('ID și nume sunt obligatorii!');
      return;
    }
    setLoading(true);
    try {
      await saveMentor(newMentor.id, {
        name: newMentor.name,
        email: newMentor.email,
        password: newMentor.password,
        active: newMentor.active
      });
      setMessage('Mentor adăugat cu succes!');
      setNewMentor({ id: '', name: '', email: '', password: '', active: true });
      await loadData();
    } catch (error) {
      setMessage(`Eroare: ${error.message}`);
    }
    setLoading(false);
  };

  const handleDeleteMentor = async (id) => {
    if (!window.confirm(`Sigur vrei să ștergi mentorul ${id}?`)) return;
    setLoading(true);
    try {
      await deleteMentor(id);
      setMessage('Mentor șters!');
      await loadData();
    } catch (error) {
      setMessage(`Eroare: ${error.message}`);
    }
    setLoading(false);
  };

  const handleCreateClass = async (e) => {
    e.preventDefault();
    if (!newClass.name || !newClass.startDate || !newClass.endDate) {
      setMessage('Toate câmpurile sunt obligatorii!');
      return;
    }
    setLoading(true);
    try {
      const result = await createCompleteClass(newClass);
      if (result.success) {
        setMessage(`Clasă creată cu ID: ${result.classId}`);
        setNewClass({ name: '', startDate: '', endDate: '', students: [] });
        await loadData();
      } else {
        setMessage(`Eroare: ${result.error}`);
      }
    } catch (error) {
      setMessage(`Eroare: ${error.message}`);
    }
    setLoading(false);
  };

  const handleDeleteClass = async (id) => {
    if (!window.confirm('Sigur vrei să ștergi această clasă?')) return;
    setLoading(true);
    try {
      await deleteClass(id);
      setMessage('Clasă ștearsă!');
      await loadData();
    } catch (error) {
      setMessage(`Eroare: ${error.message}`);
    }
    setLoading(false);
  };

  const handleDeleteStudent = async (id) => {
    if (!window.confirm('Sigur vrei să ștergi acest student?')) return;
    setLoading(true);
    try {
      await deleteStudent(id);
      setMessage('Student șters!');
      await loadData();
    } catch (error) {
      setMessage(`Eroare: ${error.message}`);
    }
    setLoading(false);
  };

  const handleExportData = async () => {
    setLoading(true);
    try {
      const data = await exportAllData();
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `backup-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      setMessage('Date exportate cu succes!');
    } catch (error) {
      setMessage(`Eroare: ${error.message}`);
    }
    setLoading(false);
  };

  const handleValidateData = async () => {
    setLoading(true);
    try {
      const result = await validateDataConsistency();
      if (result.valid) {
        setMessage('✅ Toate datele sunt consistente!');
      } else {
        setMessage(`⚠️ Probleme găsite: ${JSON.stringify(result.issues, null, 2)}`);
      }
    } catch (error) {
      setMessage(`Eroare: ${error.message}`);
    }
    setLoading(false);
  };

  return (
    <div className="min-h-screen bg-gray-100 p-8">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-4xl font-bold mb-8">📊 Panou Admin</h1>

        {/* Mesaj */}
        {message && (
          <div className="bg-blue-100 border border-blue-400 text-blue-700 px-4 py-3 rounded mb-4">
            {message}
          </div>
        )}

        {/* Butoane acțiuni rapide */}
        <div className="bg-white p-6 rounded-lg shadow mb-6">
          <h2 className="text-xl font-bold mb-4">Acțiuni Rapide</h2>
          <div className="flex gap-4 flex-wrap">
            <button 
              onClick={handleInitializeMentors}
              disabled={loading}
              className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600 disabled:bg-gray-400"
            >
              Inițializează Mentori
            </button>
            <button 
              onClick={handleExportData}
              disabled={loading}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:bg-gray-400"
            >
              Exportă Date (Backup)
            </button>
            <button 
              onClick={handleValidateData}
              disabled={loading}
              className="bg-purple-500 text-white px-4 py-2 rounded hover:bg-purple-600 disabled:bg-gray-400"
            >
              Validează Consistență
            </button>
            <button 
              onClick={loadData}
              disabled={loading}
              className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600 disabled:bg-gray-400"
            >
              Reîncarcă Date
            </button>
          </div>
        </div>

        {/* Tab-uri */}
        <div className="flex gap-2 mb-6">
          {['mentori', 'clase', 'studenti'].map(tab => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`px-6 py-2 rounded-t-lg font-semibold ${
                activeTab === tab 
                  ? 'bg-white text-blue-600 border-b-2 border-blue-600' 
                  : 'bg-gray-200 text-gray-600 hover:bg-gray-300'
              }`}
            >
              {tab.charAt(0).toUpperCase() + tab.slice(1)}
            </button>
          ))}
        </div>

        {/* Conținut Tab */}
        <div className="bg-white p-6 rounded-lg shadow">
          {activeTab === 'mentori' && (
            <div>
              <h2 className="text-2xl font-bold mb-4">Mentori</h2>
              
              {/* Formular adăugare mentor */}
              <form onSubmit={handleAddMentor} className="mb-6 p-4 bg-gray-50 rounded">
                <h3 className="font-bold mb-2">Adaugă Mentor Nou</h3>
                <div className="grid grid-cols-5 gap-4">
                  <input
                    type="text"
                    placeholder="ID (ex: sergiu)"
                    value={newMentor.id}
                    onChange={(e) => setNewMentor({...newMentor, id: e.target.value})}
                    className="border p-2 rounded"
                  />
                  <input
                    type="text"
                    placeholder="Nume"
                    value={newMentor.name}
                    onChange={(e) => setNewMentor({...newMentor, name: e.target.value})}
                    className="border p-2 rounded"
                  />
                  <input
                    type="email"
                    placeholder="Email (opțional)"
                    value={newMentor.email}
                    onChange={(e) => setNewMentor({...newMentor, email: e.target.value})}
                    className="border p-2 rounded"
                  />
                  <input
                    type="text"
                    placeholder="Parolă"
                    value={newMentor.password}
                    onChange={(e) => setNewMentor({...newMentor, password: e.target.value})}
                    className="border p-2 rounded"
                  />
                  <button 
                    type="submit"
                    disabled={loading}
                    className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
                  >
                    Adaugă
                  </button>
                </div>
              </form>

              {/* Lista mentori */}
              <div className="space-y-2">
                {Object.entries(mentors).map(([id, data]) => (
                  <div key={id} className="flex justify-between items-center p-4 bg-gray-50 rounded">
                    <div>
                      <span className="font-bold">{id}</span> - {data.name}
                      {data.email && <span className="text-gray-600 ml-2">({data.email})</span>}
                      {data.active === false && <span className="text-red-500 ml-2">(Inactiv)</span>}
                    </div>
                    <button
                      onClick={() => handleDeleteMentor(id)}
                      className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
                    >
                      Șterge
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'clase' && (
            <div>
              <h2 className="text-2xl font-bold mb-4">Clase</h2>
              
              {/* Formular creare clasă */}
              <form onSubmit={handleCreateClass} className="mb-6 p-4 bg-gray-50 rounded">
                <h3 className="font-bold mb-2">Creează Clasă Nouă</h3>
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <input
                    type="text"
                    placeholder="Nume clasă"
                    value={newClass.name}
                    onChange={(e) => setNewClass({...newClass, name: e.target.value})}
                    className="border p-2 rounded"
                  />
                  <input
                    type="date"
                    placeholder="Data start"
                    value={newClass.startDate}
                    onChange={(e) => setNewClass({...newClass, startDate: e.target.value})}
                    className="border p-2 rounded"
                  />
                  <input
                    type="date"
                    placeholder="Data sfârșit"
                    value={newClass.endDate}
                    onChange={(e) => setNewClass({...newClass, endDate: e.target.value})}
                    className="border p-2 rounded"
                  />
                </div>
                <button 
                  type="submit"
                  disabled={loading}
                  className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
                >
                  Creează Clasă
                </button>
              </form>

              {/* Lista clase */}
              <div className="space-y-2">
                {classes.map(cls => (
                  <div key={cls.id} className="flex justify-between items-center p-4 bg-gray-50 rounded">
                    <div>
                      <span className="font-bold">{cls.name}</span>
                      <span className="text-gray-600 ml-4">
                        {cls.startDate} → {cls.endDate}
                      </span>
                      <span className="text-blue-600 ml-4">
                        {cls.studentIds?.length || 0} studenți
                      </span>
                    </div>
                    <button
                      onClick={() => handleDeleteClass(cls.id)}
                      className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
                    >
                      Șterge
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {activeTab === 'studenti' && (
            <div>
              <h2 className="text-2xl font-bold mb-4">Studenți ({students.length})</h2>
              <div className="space-y-2">
                {students.map(student => (
                  <div key={student.id} className="flex justify-between items-center p-4 bg-gray-50 rounded">
                    <div>
                      <span className="font-bold">{student.name}</span>
                      {student.email && <span className="text-gray-600 ml-2">({student.email})</span>}
                      {student.classId && (
                        <span className="text-blue-600 ml-2">
                          Clasă: {classes.find(c => c.id === student.classId)?.name || student.classId}
                        </span>
                      )}
                    </div>
                    <button
                      onClick={() => handleDeleteStudent(student.id)}
                      className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
                    >
                      Șterge
                    </button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {loading && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center">
            <div className="bg-white p-8 rounded-lg">
              <p className="text-xl">Se încarcă...</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default AdminPanel;
