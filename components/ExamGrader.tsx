import React, { useState, useEffect } from 'react';
import { AppData, ExamRegistration, Rank } from '../types';
import { storageService } from '../services/storageService';
import { RANKS } from '../constants';
import { Trophy, Trash2, Eraser, Filter } from 'lucide-react';

interface Props {
  data: AppData;
  onUpdate: () => void;
}

export const ExamGrader: React.FC<Props> = ({ data, onUpdate }) => {
  const [selectedExamId, setSelectedExamId] = useState<string>('');
  const [filterRank, setFilterRank] = useState<string>('');

  // Only run once on mount or when data changes
  useEffect(() => {
    if (data.exams.length > 0 && !selectedExamId) {
      setSelectedExamId(data.exams[0].id);
    }
  }, [data.exams, selectedExamId]);

  const handleGradeUpdate = async (regId: string, field: keyof ExamRegistration, value: string) => {
    const numValue = parseFloat(value);
    
    // Allow empty string to clear the value (set to null/undefined)
    if (isNaN(numValue) && value !== '') return;
    
    const currentReg = data.registrations.find(r => r.id === regId);
    if (!currentReg) return;

    // Use null for empty string to clear value in DB
    const updateValue = value === '' ? null : numValue;

    const updates: any = { 
        [field]: updateValue 
    };

    // Calculate Average automatically based on merged state
    const merged = { ...currentReg, ...updates };
    
    // Treat undefined/null as 0 for calculation logic
    const scores = [
        merged.kihon ?? 0,
        merged.kata1 ?? 0,
        merged.kata2 ?? 0,
        merged.kumite ?? 0
    ];

    // Filter only scores greater than 0
    const validScores = scores.filter(s => s > 0);
    const sum = validScores.reduce((a, b) => a + b, 0);
    const count = validScores.length;

    // Avoid division by zero if no grades are entered yet
    const average = count > 0 ? sum / count : 0;
    
    updates.average = parseFloat(average.toFixed(2));
    updates.pass = average >= 6.0;

    await storageService.updateResult(regId, updates);
    onUpdate();
  };

  const handleClearGrades = async (regId: string) => {
      if (window.confirm('Tem certeza que deseja limpar todas as notas deste aluno?')) {
          await storageService.updateResult(regId, {
              kihon: null as any, // Cast to any to allow null if strictNullChecks is causing issues, though storageService handles it
              kata1: null as any,
              kata2: null as any,
              kumite: null as any,
              average: null as any,
              pass: false
          });
          onUpdate();
      }
  };

  const handleRemoveRegistration = async (regId: string) => {
    if (window.confirm('Tem certeza que deseja remover este aluno deste exame? Todas as notas lançadas serão perdidas.')) {
        await storageService.removeRegistration(regId);
        onUpdate();
    }
  };

  const examRegistrations = data.registrations.filter(r => r.examId === selectedExamId);
  
  // Enhance registrations with student data
  const gradedList = examRegistrations.map(reg => {
    const student = data.students.find(s => s.id === reg.studentId);
    return { 
        ...reg, 
        studentName: student?.name || 'Unknown', 
        currentRank: student?.currentRank,
        targetRank: reg.targetRank
    };
  }).filter(item => {
      if (!filterRank) return true;
      return item.targetRank === filterRank;
  }).sort((a, b) => {
      // Sort alphabetically by name to prevent jumping rows on update
      return a.studentName.localeCompare(b.studentName);
  });

  return (
    <div className="space-y-6">
      
      {/* Exam Selector & Filters */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-bold mb-4 flex items-center text-gray-800">
            <Trophy className="mr-2" /> Avaliação de Exame
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
                <label className="block text-sm font-medium text-gray-700">Selecione o Exame</label>
                <select 
                    className="mt-1 w-full border border-gray-300 rounded-md p-2"
                    value={selectedExamId}
                    onChange={e => setSelectedExamId(e.target.value)}
                >
                    <option value="">Selecione...</option>
                    {data.exams.map(ex => (
                        <option key={ex.id} value={ex.id}>
                            {new Date(ex.date).toLocaleDateString()} - {ex.location}
                        </option>
                    ))}
                </select>
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 flex items-center">
                    <Filter size={14} className="mr-1"/> Filtrar por Faixa Pretendida
                </label>
                <select 
                    className="mt-1 w-full border border-gray-300 rounded-md p-2"
                    value={filterRank}
                    onChange={e => setFilterRank(e.target.value)}
                    disabled={!selectedExamId}
                >
                    <option value="">Todas as Faixas</option>
                    {RANKS.map(r => (
                        <option key={r} value={r}>{r}</option>
                    ))}
                </select>
            </div>
        </div>
      </div>

      {selectedExamId && (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                <div>
                    <h3 className="font-bold text-gray-800">Notas e Resultados</h3>
                    <p className="text-sm text-gray-500 mt-1">
                        Preencha as notas abaixo. A média é calculada automaticamente considerando apenas notas preenchidas (diferentes de zero).
                    </p>
                </div>
                <div className="text-sm text-gray-600 bg-white px-3 py-1 rounded border">
                    Exibindo: <strong>{gradedList.length}</strong> alunos
                </div>
            </div>
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-100">
                        <tr>
                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Aluno</th>
                            <th className="px-2 py-3 text-center text-xs font-bold text-gray-600 uppercase tracking-wider w-24">Kihon</th>
                            <th className="px-2 py-3 text-center text-xs font-bold text-gray-600 uppercase tracking-wider w-24">Kata 1</th>
                            <th className="px-2 py-3 text-center text-xs font-bold text-gray-600 uppercase tracking-wider w-24">Kata 2</th>
                            <th className="px-2 py-3 text-center text-xs font-bold text-gray-600 uppercase tracking-wider w-24">Kumite</th>
                            <th className="px-4 py-3 text-center text-xs font-bold text-gray-600 uppercase tracking-wider">Média Final</th>
                            <th className="px-4 py-3 text-center text-xs font-bold text-gray-600 uppercase tracking-wider w-20">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {gradedList.length === 0 ? (
                            <tr><td colSpan={7} className="p-8 text-center text-gray-500">Nenhum aluno encontrado com os filtros selecionados.</td></tr>
                        ) : (
                            gradedList.map(item => (
                                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-4 py-4 text-sm font-medium text-gray-900">
                                        <div className="flex flex-col">
                                            <span>{item.studentName}</span>
                                            <span className="text-xs text-gray-500 font-normal">
                                                Faixa Atual: {item.currentRank} <span className="mx-1">→</span> <span className="font-bold text-red-800">{item.targetRank}</span>
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-2 py-2">
                                        <input 
                                            key={`${item.id}-kihon-${item.kihon}`}
                                            type="number" step="0.1" min="0" max="10"
                                            className="w-full text-center border border-gray-300 rounded-md p-2 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-shadow"
                                            placeholder="0.0"
                                            defaultValue={item.kihon ?? ''}
                                            onBlur={(e) => handleGradeUpdate(item.id, 'kihon', e.target.value)}
                                        />
                                    </td>
                                    <td className="px-2 py-2">
                                        <input 
                                            key={`${item.id}-kata1-${item.kata1}`}
                                            type="number" step="0.1" min="0" max="10"
                                            className="w-full text-center border border-gray-300 rounded-md p-2 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-shadow"
                                            placeholder="0.0"
                                            defaultValue={item.kata1 ?? ''}
                                            onBlur={(e) => handleGradeUpdate(item.id, 'kata1', e.target.value)}
                                        />
                                    </td>
                                    <td className="px-2 py-2">
                                        <input 
                                            key={`${item.id}-kata2-${item.kata2}`}
                                            type="number" step="0.1" min="0" max="10"
                                            className="w-full text-center border border-gray-300 rounded-md p-2 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-shadow"
                                            placeholder="0.0"
                                            defaultValue={item.kata2 ?? ''}
                                            onBlur={(e) => handleGradeUpdate(item.id, 'kata2', e.target.value)}
                                        />
                                    </td>
                                    <td className="px-2 py-2">
                                        <input 
                                            key={`${item.id}-kumite-${item.kumite}`}
                                            type="number" step="0.1" min="0" max="10"
                                            className="w-full text-center border border-gray-300 rounded-md p-2 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-shadow"
                                            placeholder="0.0"
                                            defaultValue={item.kumite ?? ''}
                                            onBlur={(e) => handleGradeUpdate(item.id, 'kumite', e.target.value)}
                                        />
                                    </td>
                                    <td className="px-4 py-4 text-center">
                                        <div className="flex flex-col items-center justify-center">
                                            <span className={`text-lg font-bold ${
                                                (item.average ?? 0) >= 6 ? 'text-green-600' : 'text-red-600'
                                            }`}>
                                                {item.average != null ? item.average.toFixed(2) : '-'}
                                            </span>
                                            {item.average != null && (
                                                <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                                                    (item.average ?? 0) >= 6 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                                }`}>
                                                    {(item.average ?? 0) >= 6 ? 'Aprovado' : 'Reprovado'}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-4 py-4 text-center whitespace-nowrap">
                                        <button 
                                            onClick={() => handleClearGrades(item.id)}
                                            className="text-gray-400 hover:text-orange-600 p-2 rounded-full hover:bg-orange-50 transition-colors mr-1"
                                            title="Limpar Notas"
                                        >
                                            <Eraser size={16} />
                                        </button>
                                        <button 
                                            onClick={() => handleRemoveRegistration(item.id)}
                                            className="text-gray-400 hover:text-red-600 p-2 rounded-full hover:bg-red-50 transition-colors"
                                            title="Remover do exame"
                                        >
                                            <Trash2 size={16} />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
      )}
    </div>
  );
};