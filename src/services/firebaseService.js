import { 
  collection, 
  doc, 
  setDoc, 
  getDoc, 
  getDocs, 
  updateDoc, 
  deleteDoc,
  query,
  where,
  orderBy,
  addDoc,
  serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebase';

// ==================== MENTORI ====================

/**
 * Adaugă sau actualizează un mentor
 * @param {string} id - ID-ul mentorului (ex: "sergiu", "dan", "tudor", etc)
 * @param {object} mentorData - {name: string, email?: string, phone?: string, password?: string, active: boolean}
 */
export async function saveMentor(id, mentorData) {
  const mentorRef = doc(db, 'mentori', id);
  await setDoc(mentorRef, {
    ...mentorData,
    updatedAt: serverTimestamp()
  }, { merge: true });
  return id;
}

/**
 * Obține toți mentorii
 */
export async function getAllMentors() {
  const mentorsRef = collection(db, 'mentori');
  const snapshot = await getDocs(mentorsRef);
  const mentors = {};
  snapshot.forEach(doc => {
    mentors[doc.id] = doc.data();
  });
  return mentors;
}

/**
 * Obține un mentor după ID
 */
export async function getMentor(id) {
  const mentorRef = doc(db, 'mentori', id);
  const snapshot = await getDoc(mentorRef);
  return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
}

/**
 * Șterge un mentor
 */
export async function deleteMentor(id) {
  const mentorRef = doc(db, 'mentori', id);
  await deleteDoc(mentorRef);
}

// ==================== CLASE ====================

/**
 * Creează o clasă nouă
 * @param {object} classData - {name: string, startDate: string, endDate: string, studentIds: string[], active: boolean}
 */
export async function createClass(classData) {
  const classRef = await addDoc(collection(db, 'clase'), {
    ...classData,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  return classRef.id;
}

/**
 * Actualizează o clasă
 */
export async function updateClass(classId, classData) {
  const classRef = doc(db, 'clase', classId);
  await updateDoc(classRef, {
    ...classData,
    updatedAt: serverTimestamp()
  });
}

/**
 * Obține toate clasele
 */
export async function getAllClasses() {
  const classesRef = collection(db, 'clase');
  const q = query(classesRef, orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
}

/**
 * Obține o clasă după ID
 */
export async function getClass(classId) {
  const classRef = doc(db, 'clase', classId);
  const snapshot = await getDoc(classRef);
  return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
}

/**
 * Obține doar clasele active
 */
export async function getActiveClasses() {
  const classesRef = collection(db, 'clase');
  const q = query(classesRef, where('active', '==', true), orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
}

/**
 * Șterge o clasă
 */
export async function deleteClass(classId) {
  const classRef = doc(db, 'clase', classId);
  await deleteDoc(classRef);
}

// ==================== STUDENȚI ====================

/**
 * Creează un student nou
 * @param {object} studentData - {name: string, email: string, phone?: string, classId?: string}
 */
export async function createStudent(studentData) {
  const studentRef = await addDoc(collection(db, 'studenti'), {
    ...studentData,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp()
  });
  return studentRef.id;
}

/**
 * Actualizează un student
 */
export async function updateStudent(studentId, studentData) {
  const studentRef = doc(db, 'studenti', studentId);
  await updateDoc(studentRef, {
    ...studentData,
    updatedAt: serverTimestamp()
  });
}

/**
 * Obține toți studenții
 */
export async function getAllStudents() {
  const studentsRef = collection(db, 'studenti');
  const q = query(studentsRef, orderBy('createdAt', 'desc'));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
}

/**
 * Obține studenții dintr-o clasă
 */
export async function getStudentsByClass(classId) {
  const studentsRef = collection(db, 'studenti');
  const q = query(studentsRef, where('classId', '==', classId));
  const snapshot = await getDocs(q);
  return snapshot.docs.map(doc => ({
    id: doc.id,
    ...doc.data()
  }));
}

/**
 * Obține un student după ID
 */
export async function getStudent(studentId) {
  const studentRef = doc(db, 'studenti', studentId);
  const snapshot = await getDoc(studentRef);
  return snapshot.exists() ? { id: snapshot.id, ...snapshot.data() } : null;
}

/**
 * Șterge un student
 */
export async function deleteStudent(studentId) {
  const studentRef = doc(db, 'studenti', studentId);
  await deleteDoc(studentRef);
}
