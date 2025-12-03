import React, { useState } from 'react';
import { Student, Rank, Sensei } from '../types';
import { RANKS } from '../constants';
import { storageService } from '../services/storageService';
import { Users, Upload, Save, Trash2, Pencil, X, Check } from 'lucide-react';

interface Props {
  students: Student[];
  senseis: Sensei[];
  onUpdate: () => void;
}

const INITIAL_FORM = {
  name: '',
  cpf: '',
  sex: 'M',
  birthDate: '',
  currentRank: 'Branca' as Rank,
  senseiId: ''
};

export const StudentManager: React.FC<Props> = ({ students, senseis, onUpdate }) => {
  const [form, setForm] = useState(INITIAL_FORM);
  const [showImport, setShowImport] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name) return;

    setIsSubmitting(true);
    let error;

    if (editingId) {
        // Use null for unlinking sensei (empty string from form)
        const updates: Partial<Student> = {
            name: form.name,
            cpf: form.cpf,
            sex: form.sex as any,
            birthDate: form.birthDate,
            currentRank: form.currentRank,
            senseiId: form.senseiId || null
        };
        const res = await storageService.updateStudent(editingId, updates);
        error = res.error;
        if (!error) setEditingId(null);
    } else {
        const newStudent: Student = {
          id: storageService.generateId(),
          name: form.name,
          cpf: form.cpf,
          sex: form.sex as any,
          birthDate: form.birthDate,
          currentRank: form.currentRank,
          senseiId: form.senseiId || null
        };
        const res = await storageService.addStudent(newStudent);
        error = res.error;
    }
    
    setIsSubmitting(false);

    if (error) {
        alert(`Erro ao salvar aluno: ${error.message || JSON.stringify(error)}`);
    } else {
        setForm(INITIAL_FORM);
        onUpdate();
    }
  };

  const handleEdit = (student: Student) => {
      setEditingId(student.id);
      setForm({
          name: student.name,
          cpf: student.cpf || '',
          sex: (student.sex || 'M') as string,
          birthDate: student.birthDate || '',
          currentRank: student.currentRank,
          senseiId: student.senseiId || ''
      });
      // Scroll to top to see form
      window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleCancelEdit = () => {
      setEditingId(null);
      setForm(INITIAL_FORM);
  };

  // Helper parsers
  const parseDate = (dateStr: string): string => {
    if (!dateStr) return '';
    const cleanStr = dateStr.trim();
    // Handle DD/MM/YYYY
    if (cleanStr.includes('/')) {
        const parts = cleanStr.split('/');
        if (parts.length === 3) {
            // Assume day, month, year
            const day = parts[0].padStart(2, '0');
            const month = parts[1].padStart(2, '0');
            let year = parts[2];
            
            // Handle 2 digit years (e.g. 90 -> 1990, 15 -> 2015)
            if (year.length === 2) {
                const yearNum = parseInt(year);
                // Pivot at 30: 00-29 -> 2000-2029, 30-99 -> 1930-1999
                if (yearNum < 30) {
                    year = `20${year}`;
                } else {
                    year = `19${year}`;
                }
            }
            
            return `${year}-${month}-${day}`;
        }
    }
    return cleanStr;
  };

  const parseSex = (sexStr: string): 'M' | 'F' | 'Outro' => {
      if (!sexStr) return 'Outro';
      const s = sexStr.toUpperCase().trim();
      if (s.startsWith('M')) return 'M';
      if (s.startsWith('F')) return 'F';
      return 'Outro';
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (event) => {
      const text = event.target?.result as string;
      if (!text) return;

      const lines = text.split(/\r?\n/);
      const newStudents: Student[] = [];

      // Helper to clean quotes and whitespace
      const clean = (val: string | undefined) => val ? val.trim().replace(/^["']|["']$/g, '').trim() : '';

      // Skipping header row 1
      for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;
        
        // Auto-detect separator (prefer semicolon if present, common in Excel CSVs)
        const separator = line.includes(';') ? ';' : ',';
        const cols = line.split(separator);
        
        // Basic validation: Name is required
        if (cols[0]) {
          const name = clean(cols[0]);
          if (!name) continue;

          // Mapping: Name, CPF, Sex, BirthDate, Rank, SenseiName
          const senseiName = clean(cols[5]);
          let matchedSenseiId: string | undefined = undefined;

          // Try to match sensei by name
          if (senseiName) {
            const found = senseis.find(s => s.name.trim().toLowerCase() === senseiName.toLowerCase());
            if (found) matchedSenseiId = found.id;
          }

          const rawRank = clean(cols[4]);
          // Find Rank case-insensitive or close match if needed, for now exact match
          const rank = RANKS.find(r => r.toLowerCase() === rawRank.toLowerCase()) || 'Branca';

          newStudents.push({
            id: storageService.generateId(),
            name: name,
            cpf: clean(cols[1]),
            sex: parseSex(clean(cols[2])),
            birthDate: parseDate(clean(cols[3])),
            currentRank: rank as Rank,
            senseiId: matchedSenseiId || null // Ensure null if undefined
          });
        }
      }

      if (newStudents.length > 0) {
        setIsSubmitting(true);
        const { error } = await storageService.importStudents(newStudents);
        setIsSubmitting(false);
        
        if (error) {
            // Robust error display
            const msg = error.message || JSON.stringify(error);
            alert(`Erro ao importar alunos: ${msg}`);
            console.error(error);
        } else {
            onUpdate();
            alert(`${newStudents.length} alunos importados com sucesso!`);
            setShowImport(false);
        }
      } else {
        alert('Nenhum aluno válido encontrado no arquivo.');
      }
    };
    reader.readAsText(file);
    // Reset input
    e.target.value = '';
  };

  const confirmDelete = async (id: string) => {
      setIsSubmitting(true);
      await storageService.deleteStudent(id);
      setIsSubmitting(false);
      setDeletingId(null);
      onUpdate();
  }

  const getSenseiName = (senseiId?: string | null) => {
    if (!senseiId) return '-';
    return senseis.find(s => s.id === senseiId)?.name || '-';
  };

  // Sort senseis for display
  const sortedSenseis = [...senseis].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="space-y-6">
      <div className="p-6 bg-white rounded-lg shadow-md">
        <div className="flex justify-between items-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800 flex items-center">
            <Users className="mr-2" /> {editingId ? 'Editar Aluno' : 'Cadastro de Alunos'}
          </h2>
          <button 
            onClick={() => setShowImport(!showImport)}
            className="flex items-center text-blue-600 hover:text-blue-800 font-medium"
          >
            <Upload className="mr-1" size={18} /> Importar Excel (CSV)
          </button>
        </div>

        {showImport && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
            <h3 className="font-semibold text-blue-800 mb-2">Importar de CSV</h3>
            <p className="text-sm text-blue-600 mb-4">
              O arquivo deve ser .csv com as colunas na ordem: <strong>Nome, CPF, Sexo, Data de Nascimento, Graduação, Nome do Sensei</strong>.
              <br />
              <span className="text-xs text-blue-500 italic">O Sensei será vinculado automaticamente se o nome corresponder exatamente a um Sensei cadastrado. Suporta separadores vírgula (,) ou ponto-e-vírgula (;). Datas podem ser DD/MM/AAAA ou DD/MM/AA.</span>
            </p>
            <input 
              type="file" 
              accept=".csv"
              onChange={handleFileUpload}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-100 file:text-blue-700 hover:file:bg-blue-200"
            />
          </div>
        )}

        <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          <div className="col-span-1 md:col-span-2 lg:col-span-1">
            <label className="block text-sm font-medium text-gray-700">Nome Completo *</label>
            <input
              required
              type="text"
              value={form.name}
              onChange={e => setForm({...form, name: e.target.value})}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              disabled={isSubmitting}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">CPF</label>
            <input
              type="text"
              value={form.cpf}
              onChange={e => setForm({...form, cpf: e.target.value})}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              disabled={isSubmitting}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Sexo</label>
            <select
              value={form.sex}
              onChange={e => setForm({...form, sex: e.target.value as any})}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              disabled={isSubmitting}
            >
              <option value="M">Masculino</option>
              <option value="F">Feminino</option>
              <option value="Outro">Outro</option>
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Data de Nascimento</label>
            <input
              type="date"
              value={form.birthDate}
              onChange={e => setForm({...form, birthDate: e.target.value})}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              disabled={isSubmitting}
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Graduação Atual</label>
            <select
              value={form.currentRank}
              onChange={e => setForm({...form, currentRank: e.target.value as Rank})}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              disabled={isSubmitting}
            >
              {RANKS.map(rank => (
                <option key={rank} value={rank}>{rank}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700">Sensei Responsável</label>
            <select
              value={form.senseiId}
              onChange={e => setForm({...form, senseiId: e.target.value})}
              className="mt-1 block w-full border border-gray-300 rounded-md shadow-sm p-2"
              disabled={isSubmitting}
            >
              <option value="">Selecione...</option>
              {sortedSenseis.map(sensei => (
                <option key={sensei.id} value={sensei.id}>{sensei.name}</option>
              ))}
            </select>
          </div>
          <div className="flex items-end col-span-1 md:col-span-2 lg:col-span-3 gap-3 justify-end">
             {editingId && (
                <button
                    type="button"
                    onClick={handleCancelEdit}
                    disabled={isSubmitting}
                    className="bg-gray-200 text-gray-700 px-6 py-2 rounded-md hover:bg-gray-300 flex items-center font-medium disabled:opacity-50"
                >
                    <X className="mr-2" size={18} /> Cancelar
                </button>
             )}
             <button
              type="submit"
              disabled={isSubmitting}
              className={`px-6 py-2 rounded-md text-white flex items-center justify-center font-medium transition-colors disabled:opacity-50 ${editingId ? 'bg-orange-600 hover:bg-orange-700' : 'bg-red-600 hover:bg-red-700'}`}
            >
              {isSubmitting ? (
                  <span>Salvando...</span>
              ) : (
                  editingId ? (
                    <>
                        <Save className="mr-2" size={18} /> Atualizar Aluno
                    </>
                  ) : (
                    <>
                        <Save className="mr-2" size={18} /> Salvar Aluno
                    </>
                  )
              )}
            </button>
          </div>
        </form>
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-100">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Nome</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Faixa</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Sensei</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">CPF</th>
              <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">Ações</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {students.map(student => {
               const isDeleting = deletingId === student.id;
               return (
                <tr key={student.id} className="hover:bg-gray-50">
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900">{student.name}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">
                    <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-gray-100 text-gray-800 border border-gray-200">
                      {student.currentRank}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{getSenseiName(student.senseiId)}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{student.cpf || '-'}</td>
                  <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                    <div className="flex justify-end gap-2">
                      {isDeleting ? (
                        <>
                          <button 
                              onClick={() => confirmDelete(student.id)} 
                              className="bg-red-100 text-red-600 p-1.5 rounded hover:bg-red-200 transition-colors"
                              title="Confirmar exclusão"
                              disabled={isSubmitting}
                          >
                              <Check size={16} />
                          </button>
                          <button 
                              onClick={() => setDeletingId(null)} 
                              className="bg-gray-100 text-gray-600 p-1.5 rounded hover:bg-gray-200 transition-colors"
                              title="Cancelar"
                              disabled={isSubmitting}
                          >
                              <X size={16} />
                          </button>
                        </>
                      ) : (
                        <>
                          <button 
                              onClick={() => handleEdit(student)} 
                              className="text-blue-600 hover:text-blue-900 p-1 rounded hover:bg-blue-50"
                              title="Editar"
                              disabled={isSubmitting}
                          >
                              <Pencil size={16} />
                          </button>
                          <button 
                              onClick={() => setDeletingId(student.id)} 
                              className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50"
                              title="Excluir"
                              disabled={isSubmitting}
                          >
                              <Trash2 size={16} />
                          </button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
            )})}
            {students.length === 0 && (
                <tr>
                    <td colSpan={5} className="px-6 py-10 text-center text-gray-500">Nenhum aluno cadastrado.</td>
                </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
};