import React, { useState, useEffect } from 'react';
import { AppData, ExamRegistration } from '../types';
import { storageService } from '../services/storageService';
import { Trophy, Trash2, Check } from 'lucide-react';

interface Props {
  data: AppData;
  onUpdate: () => void;
}

export const ExamGrader: React.FC<Props> = ({ data, onUpdate }) => {
  const [selectedExamId, setSelectedExamId] = useState<string>('');

  // Only run once on mount or when data changes
  useEffect(() => {
    if (data.exams.length > 0 && !selectedExamId) {
      setSelectedExamId(data.exams[0].id);
    }
  }, [data.exams, selectedExamId]);

  const handleGradeUpdate = async (regId: string, field: keyof ExamRegistration, value: string) => {
    const numValue = parseFloat(value);
    
    // Only update if it's a valid number or empty string
    if (isNaN(numValue) && value !== '') return;
    
    const currentReg = data.registrations.find(r => r.id === regId);
    if (!currentReg) return;

    // Create updates object
    const updates: Partial<ExamRegistration> = { 
        [field]: value === '' ? undefined : numValue 
    };

    // Calculate Average automatically based on merged state
    const merged = { ...currentReg, ...updates };
    
    // Treat undefined/null as 0 for calculation
    const k1 = merged.kihon ?? 0;
    const k2 = merged.kata1 ?? 0;
    const k3 = merged.kata2 ?? 0;
    const k4 = merged.kumite ?? 0;

    const average = (k1 + k2 + k3 + k4) / 4;
    
    updates.average = parseFloat(average.toFixed(2));
    updates.pass = average >= 6.0;

    await storageService.updateResult(regId, updates);
    onUpdate();
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
  });

  return (
    <div className="space-y-6">
      
      {/* Exam Selector */}
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
        </div>
      </div>

      {selectedExamId && (
        <div className="bg-white rounded-lg shadow-md overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-200 bg-gray-50">
                <h3 className="font-bold text-gray-800">Notas e Resultados</h3>
                <p className="text-sm text-gray-500 mt-1">
                    Preencha as notas abaixo. A média é calculada automaticamente.
                </p>
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
                            <th className="px-4 py-3 text-center text-xs font-bold text-gray-600 uppercase tracking-wider w-16">Ações</th>
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {gradedList.length === 0 ? (
                            <tr><td colSpan={7} className="p-8 text-center text-gray-500">Nenhum aluno vinculado a este exame.</td></tr>
                        ) : (
                            gradedList.map(item => (
                                <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                                    <td className="px-4 py-4 text-sm font-medium text-gray-900">
                                        <div className="flex flex-col">
                                            <span>{item.studentName}</span>
                                            <span className="text-xs text-gray-500 font-normal">
                                                Faixa Atual: {item.currentRank} <span className="mx-1">→</span> Pretendida: {item.targetRank}
                                            </span>
                                        </div>
                                    </td>
                                    <td className="px-2 py-2">
                                        <input type="number" step="0.1" min="0" max="10"
                                            className="w-full text-center border border-gray-300 rounded-md p-2 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-shadow"
                                            placeholder="0.0"
                                            value={item.kihon ?? ''}
                                            onBlur={(e) => handleGradeUpdate(item.id, 'kihon', e.target.value)}
                                            defaultValue={item.kihon ?? ''}
                                        />
                                    </td>
                                    <td className="px-2 py-2">
                                        <input type="number" step="0.1" min="0" max="10"
                                            className="w-full text-center border border-gray-300 rounded-md p-2 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-shadow"
                                            placeholder="0.0"
                                            defaultValue={item.kata1 ?? ''}
                                            onBlur={(e) => handleGradeUpdate(item.id, 'kata1', e.target.value)}
                                        />
                                    </td>
                                    <td className="px-2 py-2">
                                        <input type="number" step="0.1" min="0" max="10"
                                            className="w-full text-center border border-gray-300 rounded-md p-2 text-sm focus:ring-2 focus:ring-red-500 focus:border-red-500 outline-none transition-shadow"
                                            placeholder="0.0"
                                            defaultValue={item.kata2 ?? ''}
                                            onBlur={(e) => handleGradeUpdate(item.id, 'kata2', e.target.value)}
                                        />
                                    </td>
                                    <td className="px-2 py-2">
                                        <input type="number" step="0.1" min="0" max="10"
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
                                                {item.average !== undefined ? item.average.toFixed(2) : '-'}
                                            </span>
                                            {item.average !== undefined && (
                                                <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${
                                                    (item.average ?? 0) >= 6 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                                }`}>
                                                    {(item.average ?? 0) >= 6 ? 'Aprovado' : 'Reprovado'}
                                                </span>
                                            )}
                                        </div>
                                    </td>
                                    <td className="px-4 py-4 text-center">
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