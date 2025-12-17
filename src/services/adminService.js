/**
 * Servicii pentru admin - funcții avansate de gestionare
 */

import { 
  saveMentor, 
  createClass, 
  createStudent, 
  getStudentsByClass
} from './firebaseService';

// ==================== INIȚIALIZARE DATE ====================

/**
 * Inițializează mentorii în Firebase
 */
export async function initializeMentorsInFirebase() {
  const mentorsData = {
    sergiu: { name: "Sergiu", password: "Sergiu", active: true },
    dan: { name: "Dan", password: "Dan", active: true },
    tudor: { name: "Tudor", password: "Tudor", active: true },
    eli: { name: "Eli", password: "Eli", active: true },
    adrian: { name: "Adrian", password: "Adrian", active: true }
  };

  const results = [];
  for (const [id, data] of Object.entries(mentorsData)) {
    try {
      await saveMentor(id, data);
      results.push({ id, success: true });
    } catch (error) {
      results.push({ id, success: false, error: error.message });
    }
  }
  return results;
}

/**
 * Creează o clasă completă cu studenți
 * @param {object} classInfo - {name, startDate, endDate, students: [{name, email, phone}]}
 */
export async function createCompleteClass(classInfo) {
  try {
    // 1. Creează clasa
    const classId = await createClass({
      name: classInfo.name,
      startDate: classInfo.startDate,
      endDate: classInfo.endDate,
      active: true,
      studentIds: []
    });

    // 2. Creează studenții și adaugă-i în clasă
    const studentIds = [];
    if (classInfo.students && classInfo.students.length > 0) {
      for (const student of classInfo.students) {
        const studentId = await createStudent({
          ...student,
          classId: classId
        });
        studentIds.push(studentId);
      }
    }

    // 3. Actualizează clasa cu ID-urile studenților
    if (studentIds.length > 0) {
      const { updateClass } = await import('./firebaseService');
      await updateClass(classId, { studentIds });
    }

    return {
      success: true,
      classId,
      studentIds
    };
  } catch (error) {
    return {
      success: false,
      error: error.message
    };
  }
}

/**
 * Obține statistici pentru o clasă
 */
export async function getClassStatistics(classId) {
  try {
    const students = await getStudentsByClass(classId);

    return {
      totalStudents: students.length,
      students: students
    };
  } catch (error) {
    console.error('Error getting class statistics:', error);
    return null;
  }
}

/**
 * Exportă toate datele pentru backup
 */
export async function exportAllData() {
  const { getAllMentors, getAllClasses, getAllStudents } = await import('./firebaseService');
  
  try {
    const [mentors, classes, students] = await Promise.all([
      getAllMentors(),
      getAllClasses(),
      getAllStudents()
    ]);

    return {
      exportDate: new Date().toISOString(),
      mentors,
      classes,
      students
    };
  } catch (error) {
    console.error('Error exporting data:', error);
    throw error;
  }
}

/**
 * Validează consistența datelor
 */
export async function validateDataConsistency() {
  const { getAllClasses, getAllStudents, getAllMentors } = await import('./firebaseService');
  
  const issues = [];

  try {
    const [classes, students, mentors] = await Promise.all([
      getAllClasses(),
      getAllStudents(),
      getAllMentors()
    ]);

    // Verifică studenții fără clasă
    const orphanStudents = students.filter(s => !s.classId);
    if (orphanStudents.length > 0) {
      issues.push({
        type: 'orphan_students',
        count: orphanStudents.length,
        students: orphanStudents.map(s => s.id)
      });
    }

    return {
      valid: issues.length === 0,
      issues: issues,
      stats: {
        totalClasses: classes.length,
        totalStudents: students.length,
        totalMentors: Object.keys(mentors).length
      }
    };
  } catch (error) {
    console.error('Error validating data:', error);
    throw error;
  }
}
