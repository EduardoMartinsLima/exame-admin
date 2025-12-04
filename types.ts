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
  senseiId?: string | null;
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
  present?: boolean;
  kihon?: number | null;
  kata1?: number | null;
  kata2?: number | null;
  kumite?: number | null;
  average?: number | null;
  pass?: boolean;
}

export interface AppData {
  senseis: Sensei[];
  students: Student[];
  exams: Exam[];
  registrations: ExamRegistration[];
}