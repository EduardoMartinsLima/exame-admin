import React, { useState } from 'react';
import { Student, Rank, Sensei } from '../types';
import { RANKS } from '../constants';
import { storageService } from '../services/storageService';
import { Users, Upload, Save, Trash2, Pencil, X, Check, Search, CheckSquare } from 'lucide-react';

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

  // Batch Selection State
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.name) return;

    try {
        setIsSubmitting(true);
        let error;

        // Sanitize payload
        const payload: any = {
            name: form.name,
            sex: form.sex,
            current_rank: form.currentRank,
            // Convert empty strings to null for DB
            cpf: form.cpf ? form.cpf : null,
            birth_date: form.birthDate ? form.birthDate : null,
            sensei_id: form.senseiId ? form.senseiId : null
        };
        
        console.log("Submitting payload:", payload);

        if (editingId) {
            const res = await storageService.updateStudent(editingId, {
                name: payload.name,
                cpf: payload.cpf,
                sex: payload.sex,
                birthDate: payload.birth_date,
                currentRank: payload.current_rank,
                senseiId: payload.sensei_id
            });
            error = res.error;
            if (!error) setEditingId(null);
        } else {
            const newStudent: Student = {
              id: storageService.generateId(),
              name: payload.name,
              cpf: payload.cpf,
              sex: payload.sex,
              birthDate: payload.birth_date,
              currentRank: payload.current_rank,
              senseiId: payload.sensei_id
            };
            const res = await storageService.addStudent(newStudent);
            error = res.error;
        }
        
        setIsSubmitting(false);

        if (error) {
            console.error("Operation failed:", error);
            alert(`Erro ao salvar aluno: ${error.message || JSON.stringify(error)}`);
        } else {
            setForm(INITIAL_FORM);
            onUpdate();
        }
    } catch (err: any) {
        setIsSubmitting(false);
        console.error("Unexpected error:", err);
        alert(`Ocorreu um erro inesperado: ${err.message || 'Erro desconhecido'}`);
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
      if (s.startsWith('M') || s === 'MASCULINO') return 'M';
      if (s.startsWith('F') || s === 'FEMININO') return 'F';
      return 'Outro';
  };

  // Robust CSV Line Parser handles quotes
  const parseCSVLine = (line: string, separator: string): string[] => {
      const result: string[] = [];
      let current = '';
      let inQuote = false;
      
      for (let i = 0; i < line.length; i++) {
          const char = line[i];
          if (char === '"') {
              inQuote = !inQuote;
          } else if (char === separator && !inQuote) {
              result.push(current);
              current = '';
          } else {
              current += char;
          }
      }
      result.push(current);
      return result;
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
        
        // Auto-detect separator
        const separator = line.includes(';') ? ';' : ',';
        const cols = parseCSVLine(line, separator);
        
        // Basic validation: Name is required
        if (cols[0]) {
          const name = clean(cols[0]);
          if (!name) continue;

          // Standard Mapping: Name(0), CPF(1), Sex(2), BirthDate(3), Rank(4), SenseiName(5)
          let cpf = clean(cols[1]);
          let sexRaw = clean(cols[2]);
          let birthRaw = clean(cols[3]);
          let rankRaw = clean(cols[4]);
          let senseiName = clean(cols[5]);

          let matchedSenseiId: string | undefined = undefined;

          // SMART DETECTION: Check if Sensei is in Column 1 (Index 1) instead of 5
          // Many users might put Name, Sensei, CPF...
          const possibleSenseiNameInCol1 = cpf; 
          const matchedSenseiInCol1 = senseis.find(s => s.name.trim().toLowerCase() === possibleSenseiNameInCol1.toLowerCase());

          if (matchedSenseiInCol1) {
              // Found a sensei in the CPF column! Switch mapping.
              matchedSenseiId = matchedSenseiInCol1.id;
              // Shift columns right
              cpf = clean(cols[2]);
              sexRaw = clean(cols[3]);
              birthRaw = clean(cols[4]);
              rankRaw = clean(cols[5]);
          } else {
              // Try standard mapping match (Col 5)
              if (senseiName) {
                const found = senseis.find(s => s.name.trim().toLowerCase() === senseiName.toLowerCase());
                if (found) matchedSenseiId = found.id;
              }
          }

          const rank = RANKS.find(r => r.toLowerCase() === rankRaw.toLowerCase()) || 'Branca';

          newStudents.push({
            id: storageService.generateId(),
            name: name,
            cpf: cpf,
            sex: parseSex(sexRaw),
            birthDate: parseDate(birthRaw),
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
      const { error } = await storageService.deleteStudent(id);
      setIsSubmitting(false);
      
      if (error) {
           alert(`Erro ao excluir aluno: ${error.message}`);
      } else {
           setDeletingId(null);
           onUpdate();
      }
  };

  // --- Batch Operations ---
  
  const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
      if (e.target.checked) {
          setSelectedIds(students.map(s => s.id));
      } else {
          setSelectedIds([]);
      }
  };

  const handleSelectOne = (id: string) => {
      setSelectedIds(prev => {
          if (prev.includes(id)) {
              return prev.filter(p => p !== id);
          } else {
              return [...prev, id];
          }
      });
  };

  const handleBatchDelete = async () => {
      if (selectedIds.length === 0) return;
      
      if (window.confirm(`Tem certeza que deseja excluir os ${selectedIds.length} alunos selecionados? Esta ação não pode ser desfeita.`)) {
          setIsSubmitting(true);
          try {
              // Delete sequentially or parallel. Parallel is faster.
              const promises = selectedIds.map(id => storageService.deleteStudent(id));
              await Promise.all(promises);
              
              setSelectedIds([]);
              onUpdate();
              alert('Alunos excluídos com sucesso.');
          } catch (error) {
              console.error("Batch delete error:", error);
              alert('Ocorreu um erro ao excluir alguns alunos.');
          } finally {
              setIsSubmitting(false);
          }
      }
  };

  const getSenseiName = (senseiId?: string | null) => {
    if (!senseiId) return '-';
    return senseis.find(s => s.id === senseiId)?.name || '-';
  };

  // Sort senseis for display
  const sortedSenseis = [...senseis].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div className="space-y-6">
      <div className="p-4 md:p-6 bg-white rounded-lg shadow-md">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-6 gap-4">
          <h2 className="text-xl md:text-2xl font-bold text-gray-800 flex items-center">
            <Users className="mr-2" /> {editingId ? 'Editar Aluno' : 'Cadastro de Alunos'}
          </h2>
          
          <div className="flex flex-wrap gap-3">
              {selectedIds.length > 0 && (
                  <button 
                    onClick={handleBatchDelete}
                    disabled={isSubmitting}
                    className="flex items-center bg-red-100 text-red-700 px-3 py-1.5 rounded-md hover:bg-red-200 font-medium text-sm transition-colors border border-red-200"
                  >
                    <Trash2 className="mr-1.5" size={16} /> 
                    Excluir ({selectedIds.length})
                  </button>
              )}
              
              <button 
                onClick={() => setShowImport(!showImport)}
                className="flex items-center text-blue-600 hover:text-blue-800 font-medium text-sm md:text-base"
              >
                <Upload className="mr-1" size={18} /> Importar Excel (CSV)
              </button>
          </div>
        </div>

        {showImport && (
          <div className="mb-6 p-4 bg-blue-50 border border-blue-200 rounded-md">
            <h3 className="font-semibold text-blue-800 mb-2">Importar de CSV</h3>
            <p className="text-sm text-blue-600 mb-4">
              O arquivo deve ser .csv com as colunas na ordem:<br/>
              <strong>1. Nome, 2. CPF, 3. Sexo, 4. Data de Nascimento, 5. Graduação, 6. Nome do Sensei</strong>
              <br/>
              <span className="text-xs text-blue-500 italic mt-1 block">
                  *Alternativamente, aceita: <strong>1. Nome, 2. Nome do Sensei, 3. CPF...</strong> se o nome do Sensei for reconhecido.
                  <br/>
                  *Suporta separadores vírgula (,) ou ponto-e-vírgula (;). Aspas em nomes são tratadas corretamente.
              </span>
            </p>
            <input 
              type="file" 
              accept=".csv"
              onChange={handleFileUpload}
              className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-semibold file:bg-blue-100 file:text-blue-700 hover:file:bg-blue-200"
            />
          </div>
        )}

        <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 mb-6">
          <div className="col-span-1 sm:col-span-2 lg:col-span-1">
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
          <div className="flex items-end col-span-1 sm:col-span-2 lg:col-span-3 gap-3 justify-end pt-2">
             {editingId && (
                <button
                    type="button"
                    onClick={handleCancelEdit}
                    disabled={isSubmitting}
                    className="bg-gray-200 text-gray-700 px-4 py-2 rounded-md hover:bg-gray-300 flex items-center font-medium disabled:opacity-50 text-sm md:text-base"
                >
                    <X className="mr-2" size={18} /> Cancelar
                </button>
             )}
             <button
              type="submit"
              disabled={isSubmitting}
              className={`px-6 py-2 rounded-md text-white flex items-center justify-center font-medium transition-colors disabled:opacity-50 text-sm md:text-base w-full sm:w-auto ${editingId ? 'bg-orange-600 hover:bg-orange-700' : 'bg-red-600 hover:bg-red-700'}`}
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

      {/* List Container */}
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        
        {/* Desktop/Tablet Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200">
            <thead className="bg-gray-100">
              <tr>
                <th className="px-6 py-3 text-left">
                    <input 
                        type="checkbox" 
                        onChange={handleSelectAll}
                        checked={students.length > 0 && selectedIds.length === students.length}
                        className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                    />
                </th>
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
                 const isSelected = selectedIds.includes(student.id);
                 return (
                  <tr key={student.id} className={`hover:bg-gray-50 ${isSelected ? 'bg-red-50' : ''}`}>
                    <td className="px-6 py-4">
                        <input 
                            type="checkbox" 
                            checked={isSelected}
                            onChange={() => handleSelectOne(student.id)}
                            className="w-4 h-4 text-red-600 border-gray-300 rounded focus:ring-red-500"
                        />
                    </td>
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
                      <td colSpan={6} className="px-6 py-10 text-center text-gray-500">Nenhum aluno cadastrado.</td>
                  </tr>
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden">
            {students.length === 0 ? (
                <div className="p-8 text-center text-gray-500">Nenhum aluno cadastrado.</div>
            ) : (
                <div className="grid grid-cols-1 gap-4 p-4">
                    {students.map(student => {
                        const isDeleting = deletingId === student.id;
                        const isSelected = selectedIds.includes(student.id);
                        return (
                            <div key={student.id} className={`bg-white border rounded-lg shadow-sm p-4 space-y-3 ${isSelected ? 'border-red-300 bg-red-50' : ''}`}>
                                <div className="flex justify-between items-start">
                                    <div className="flex items-center gap-3">
                                        <input 
                                            type="checkbox" 
                                            checked={isSelected}
                                            onChange={() => handleSelectOne(student.id)}
                                            className="w-5 h-5 text-red-600 border-gray-300 rounded focus:ring-red-500"
                                        />
                                        <div>
                                            <h3 className="text-lg font-bold text-gray-900">{student.name}</h3>
                                            <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-gray-100 text-gray-800 border border-gray-200 whitespace-nowrap mt-1 inline-block">
                                                {student.currentRank}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                                
                                <div className="text-sm text-gray-600 space-y-1 pl-8">
                                    <p className="flex justify-between">
                                        <span className="font-medium text-gray-500">Sensei:</span>
                                        <span>{getSenseiName(student.senseiId)}</span>
                                    </p>
                                    <p className="flex justify-between">
                                        <span className="font-medium text-gray-500">CPF:</span>
                                        <span>{student.cpf || '-'}</span>
                                    </p>
                                </div>

                                <div className="pt-3 border-t flex justify-end gap-3 pl-8">
                                    {isDeleting ? (
                                        <>
                                            <span className="text-sm text-red-600 font-medium self-center mr-auto">Confirmar exclusão?</span>
                                            <button 
                                                onClick={() => confirmDelete(student.id)} 
                                                className="bg-red-100 text-red-600 p-2 rounded hover:bg-red-200 transition-colors flex items-center gap-1"
                                                disabled={isSubmitting}
                                            >
                                                <Check size={18} /> <span className="text-xs">Sim</span>
                                            </button>
                                            <button 
                                                onClick={() => setDeletingId(null)} 
                                                className="bg-gray-100 text-gray-600 p-2 rounded hover:bg-gray-200 transition-colors flex items-center gap-1"
                                                disabled={isSubmitting}
                                            >
                                                <X size={18} /> <span className="text-xs">Não</span>
                                            </button>
                                        </>
                                    ) : (
                                        <>
                                            <button 
                                                onClick={() => handleEdit(student)} 
                                                className="flex-1 bg-blue-50 text-blue-700 py-2 rounded border border-blue-200 hover:bg-blue-100 flex items-center justify-center gap-2 text-sm font-medium"
                                                disabled={isSubmitting}
                                            >
                                                <Pencil size={16} /> Editar
                                            </button>
                                            <button 
                                                onClick={() => setDeletingId(student.id)} 
                                                className="flex-1 bg-red-50 text-red-700 py-2 rounded border border-red-200 hover:bg-red-100 flex items-center justify-center gap-2 text-sm font-medium"
                                                disabled={isSubmitting}
                                            >
                                                <Trash2 size={16} /> Excluir
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
      </div>
    </div>
  );
};