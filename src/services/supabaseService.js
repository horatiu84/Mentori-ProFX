import { supabase } from '../supabase';

// ==================== MENTORI ====================

/**
 * Adaugă sau actualizează un mentor
 * @param {string} id - ID-ul mentorului (ex: "sergiu", "dan", "tudor", etc)
 * @param {object} mentorData - {name: string, email?: string, phone?: string, password?: string, active: boolean}
 */
export async function saveMentor(id, mentorData) {
  const { error } = await supabase
    .from('mentori')
    .upsert({
      id,
      ...mentorData,
      updatedAt: new Date().toISOString()
    });
  if (error) throw error;
  return id;
}

/**
 * Obține toți mentorii
 */
export async function getAllMentors() {
  const { data, error } = await supabase
    .from('mentori')
    .select('*');
  if (error) throw error;
  const mentors = {};
  (data || []).forEach(row => {
    const { id, ...rest } = row;
    mentors[id] = rest;
  });
  return mentors;
}

/**
 * Obține un mentor după ID
 */
export async function getMentor(id) {
  const { data, error } = await supabase
    .from('mentori')
    .select('*')
    .eq('id', id)
    .single();
  if (error) {
    if (error.code === 'PGRST116') return null; // not found
    throw error;
  }
  return data;
}

/**
 * Șterge un mentor
 */
export async function deleteMentor(id) {
  const { error } = await supabase
    .from('mentori')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

// ==================== CLASE ====================

/**
 * Creează o clasă nouă
 * @param {object} classData - {name: string, startDate: string, endDate: string, studentIds: string[], active: boolean}
 */
export async function createClass(classData) {
  const { data, error } = await supabase
    .from('clase')
    .insert({
      ...classData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    })
    .select('id')
    .single();
  if (error) throw error;
  return data.id;
}

/**
 * Actualizează o clasă
 */
export async function updateClass(classId, classData) {
  const { error } = await supabase
    .from('clase')
    .update({
      ...classData,
      updatedAt: new Date().toISOString()
    })
    .eq('id', classId);
  if (error) throw error;
}

/**
 * Obține toate clasele
 */
export async function getAllClasses() {
  const { data, error } = await supabase
    .from('clase')
    .select('*')
    .order('createdAt', { ascending: false });
  if (error) throw error;
  return data || [];
}

/**
 * Obține o clasă după ID
 */
export async function getClass(classId) {
  const { data, error } = await supabase
    .from('clase')
    .select('*')
    .eq('id', classId)
    .single();
  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data;
}

/**
 * Obține doar clasele active
 */
export async function getActiveClasses() {
  const { data, error } = await supabase
    .from('clase')
    .select('*')
    .eq('active', true)
    .order('createdAt', { ascending: false });
  if (error) throw error;
  return data || [];
}

/**
 * Șterge o clasă
 */
export async function deleteClass(classId) {
  const { error } = await supabase
    .from('clase')
    .delete()
    .eq('id', classId);
  if (error) throw error;
}

// ==================== STUDENȚI ====================

/**
 * Creează un student nou
 * @param {object} studentData - {name: string, email: string, phone?: string, classId?: string}
 */
export async function createStudent(studentData) {
  const { data, error } = await supabase
    .from('studenti')
    .insert({
      ...studentData,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    })
    .select('id')
    .single();
  if (error) throw error;
  return data.id;
}

/**
 * Actualizează un student
 */
export async function updateStudent(studentId, studentData) {
  const { error } = await supabase
    .from('studenti')
    .update({
      ...studentData,
      updatedAt: new Date().toISOString()
    })
    .eq('id', studentId);
  if (error) throw error;
}

/**
 * Obține toți studenții
 */
export async function getAllStudents() {
  const { data, error } = await supabase
    .from('studenti')
    .select('*')
    .order('createdAt', { ascending: false });
  if (error) throw error;
  return data || [];
}

/**
 * Obține studenții dintr-o clasă
 */
export async function getStudentsByClass(classId) {
  const { data, error } = await supabase
    .from('studenti')
    .select('*')
    .eq('classId', classId);
  if (error) throw error;
  return data || [];
}

/**
 * Obține un student după ID
 */
export async function getStudent(studentId) {
  const { data, error } = await supabase
    .from('studenti')
    .select('*')
    .eq('id', studentId)
    .single();
  if (error) {
    if (error.code === 'PGRST116') return null;
    throw error;
  }
  return data;
}

/**
 * Șterge un student
 */
export async function deleteStudent(studentId) {
  const { error } = await supabase
    .from('studenti')
    .delete()
    .eq('id', studentId);
  if (error) throw error;
}
