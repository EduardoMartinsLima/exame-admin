export type Rank = 
  | 'Branca'
  | 'Branca Ponteira Amarela'
  | 'Cinza'
  | 'Amarela'
  | 'Vermelha'
  | 'Laranja'
  | 'Verde'
  | 'Verde I'
  | 'Verde II'
  | 'Verde III'
  | 'Roxa'
  | 'Marrom'
  | 'Preta';

export interface Sensei {
  id: string;
  name: string;
}

export interface Student {
  id: string;
  name: string;
  cpf?: string;
  sex?: 'M' | 'F' | 'Outro';
  birthDate?: string;
  currentRank: Rank;
  senseiId?: string | null; // Allow null explicitly
}

export interface Exam {
  id: string;
  date: string;
  location: string;
  time: string;
}

export interface ExamRegistration {
  id: string;
  examId: string;
  studentId: string;
  targetRank: Rank;
  
  // Results
  kihon?: number;
  kata1?: number;
  kata2?: number;
  kumite?: number;
  average?: number;
  pass?: boolean;
}

export interface AppData {
  senseis: Sensei[];
  students: Student[];
  exams: Exam[];
  registrations: ExamRegistration[];
}