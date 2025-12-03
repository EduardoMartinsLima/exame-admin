import { createClient } from '@supabase/supabase-js';
import { AppData, Sensei, Student, Exam, ExamRegistration } from '../types';

// Supabase Configuration
const SUPABASE_URL = 'https://bjfybtsiazhfidnapyol.supabase.co';
const SUPABASE_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImJqZnlidHNpYXpoZmlkbmFweW9sIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc2MzkyNDI1OSwiZXhwIjoyMDc5NTAwMjU5fQ.C-gvnFdr5nAnlUsj_Z_T4zdTTwThOCLuBrNlouWuAD4';

const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// ID Generator (still useful for optimistic UI or generating UUIDs client side)
const generateId = (): string => {
  return crypto.randomUUID();
};

export const storageService = {
  generateId,

  // --- AUTHENTICATION ---
  signIn: async (email: string, password: string) => {
    const { data, error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    return { data, error };
  },

  signOut: async () => {
    const { error } = await supabase.auth.signOut();
    return { error };
  },

  getSession: async () => {
    const { data } = await supabase.auth.getSession();
    return data.session;
  },

  onAuthStateChange: (callback: (session: any) => void) => {
    const { data } = supabase.auth.onAuthStateChange((_event, session) => {
      callback(session);
    });
    return data.subscription;
  },

  // --- Fetch All Data ---
  getData: async (): Promise<AppData> => {
    try {
      const [senseisRes, studentsRes, examsRes, regsRes] = await Promise.all([
        supabase.from('senseis').select('*'),
        supabase.from('students').select('*'),
        supabase.from('exams').select('*'),
        supabase.from('exam_registrations').select('*')
      ]);

      if (senseisRes.error) throw senseisRes.error;
      if (studentsRes.error) throw studentsRes.error;
      if (examsRes.error) throw examsRes.error;
      if (regsRes.error) throw regsRes.error;

      // Map DB snake_case to App camelCase
      const students: Student[] = (studentsRes.data || []).map((s: any) => ({
        id: s.id,
        name: s.name,
        cpf: s.cpf,
        sex: s.sex,
        birthDate: s.birth_date,
        currentRank: s.current_rank,
        senseiId: s.sensei_id
      }));

      const registrations: ExamRegistration[] = (regsRes.data || []).map((r: any) => ({
        id: r.id,
        examId: r.exam_id,
        studentId: r.student_id,
        targetRank: r.target_rank,
        present: r.present, // Map presence
        kihon: r.kihon,
        kata1: r.kata1,
        kata2: r.kata2,
        kumite: r.kumite,
        average: r.average,
        pass: r.pass
      }));

      return {
        senseis: senseisRes.data || [],
        students,
        exams: examsRes.data || [],
        registrations
      };
    } catch (error) {
      console.error("Error fetching data from Supabase:", JSON.stringify(error));
      return { senseis: [], students: [], exams: [], registrations: [] };
    }
  },

  // --- Senseis ---
  addSensei: async (sensei: Sensei) => {
    const { error } = await supabase.from('senseis').insert(sensei);
    if (error) console.error('Error adding sensei:', JSON.stringify(error));
    return { error };
  },

  deleteSensei: async (id: string) => {
    // Database is configured with ON DELETE SET NULL for students referencing this sensei
    const { error } = await supabase.from('senseis').delete().eq('id', id);
    if (error) console.error('Error deleting sensei:', JSON.stringify(error));
    return { error };
  },

  // --- Students ---
  addStudent: async (student: Student) => {
    const dbStudent = {
      id: student.id,
      name: student.name,
      cpf: student.cpf ? student.cpf : null,
      sex: student.sex,
      birth_date: student.birthDate ? student.birthDate : null,
      current_rank: student.currentRank,
      sensei_id: student.senseiId ? student.senseiId : null
    };
    const { error } = await supabase.from('students').insert(dbStudent);
    if (error) {
        return { error };
    }
    return { error: null };
  },

  updateStudent: async (id: string, updates: Partial<Student>) => {
    const dbUpdates: any = {};
    if (updates.name !== undefined) dbUpdates.name = updates.name;
    // Convert empty string to null specifically for DB constraints
    if (updates.cpf !== undefined) dbUpdates.cpf = updates.cpf ? updates.cpf : null;
    if (updates.sex !== undefined) dbUpdates.sex = updates.sex;
    if (updates.birthDate !== undefined) dbUpdates.birth_date = updates.birthDate ? updates.birthDate : null;
    if (updates.currentRank !== undefined) dbUpdates.current_rank = updates.currentRank;
    // Explicitly handle null for unlinking. If empty string is passed, treat as null.
    if (updates.senseiId !== undefined) dbUpdates.sensei_id = updates.senseiId ? updates.senseiId : null;

    const { error } = await supabase.from('students').update(dbUpdates).eq('id', id);
    if (error) {
        return { error };
    }
    return { error: null };
  },

  deleteStudent: async (id: string) => {
    // Registrations cascade delete due to foreign key constraints
    const { error } = await supabase.from('students').delete().eq('id', id);
    if (error) {
        return { error };
    }
    return { error: null };
  },

  importStudents: async (students: Student[]) => {
    const dbStudents = students.map(s => ({
      id: s.id,
      name: s.name,
      cpf: s.cpf || null,
      sex: s.sex,
      birth_date: s.birthDate || null, // Allow null dates
      current_rank: s.currentRank,
      sensei_id: s.senseiId || null
    }));
    const { error } = await supabase.from('students').insert(dbStudents);
    if (error) {
        // Return the error so the UI can display it
        return { error };
    }
    return { error: null };
  },

  // --- Exams ---
  addExam: async (exam: Exam) => {
    const { error } = await supabase.from('exams').insert(exam);
    if (error) console.error('Error adding exam:', JSON.stringify(error));
    return { error };
  },

  updateExam: async (id: string, updates: Partial<Exam>) => {
    const dbUpdates: any = {};
    if (updates.date !== undefined) dbUpdates.date = updates.date;
    if (updates.time !== undefined) dbUpdates.time = updates.time;
    if (updates.location !== undefined) dbUpdates.location = updates.location;

    const { error } = await supabase.from('exams').update(dbUpdates).eq('id', id);
    if (error) console.error('Error updating exam:', JSON.stringify(error));
    return { error };
  },

  // --- Registrations ---
  registerStudentToExam: async (registration: ExamRegistration) => {
    const dbReg = {
      id: registration.id,
      exam_id: registration.examId,
      student_id: registration.studentId,
      target_rank: registration.targetRank,
      pass: false,
      present: false
    };
    const { error } = await supabase.from('exam_registrations').insert(dbReg);
    if (error) console.error('Error registering student:', JSON.stringify(error));
    return { error };
  },

  removeRegistration: async (id: string) => {
    const { error } = await supabase.from('exam_registrations').delete().eq('id', id);
    if (error) console.error('Error removing registration:', JSON.stringify(error));
    return { error };
  },

  updateResult: async (regId: string, updates: Partial<ExamRegistration>) => {
    const dbUpdates: any = {};
    if (updates.present !== undefined) dbUpdates.present = updates.present;
    if (updates.kihon !== undefined) dbUpdates.kihon = updates.kihon;
    if (updates.kata1 !== undefined) dbUpdates.kata1 = updates.kata1;
    if (updates.kata2 !== undefined) dbUpdates.kata2 = updates.kata2;
    if (updates.kumite !== undefined) dbUpdates.kumite = updates.kumite;
    if (updates.average !== undefined) dbUpdates.average = updates.average;
    if (updates.pass !== undefined) dbUpdates.pass = updates.pass;

    const { error } = await supabase.from('exam_registrations').update(dbUpdates).eq('id', regId);
    if (error) console.error('Error updating result:', JSON.stringify(error));
    return { error };
  }
};