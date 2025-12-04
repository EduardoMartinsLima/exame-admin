import React, { useState, useEffect } from 'react';
import { AppData, ExamRegistration, Rank } from '../types';
import { storageService } from '../services/storageService';
import { RANKS } from '../constants';
import { Trophy, Trash2, Filter, ArrowUpDown, Search, ChevronDown, ChevronUp } from 'lucide-react';

interface Props {
  data: AppData;
  onUpdate: () => void;
}

type SortKey = 'name' | 'targetRank' | 'average';

export const ExamGrader: React.FC<Props> = ({ data, onUpdate }) => {
  const [selectedExamId, setSelectedExamId] = useState<string>('');
  
  // Filters
  const [filterRank, setFilterRank] = useState<string>('');
  const [filterSensei, setFilterSensei] = useState<string>('');
  const [filterName, setFilterName] = useState<string>('');
  const [showFilters, setShowFilters] = useState(false);

  // Sorting
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' }>({ 
    key: 'name', 
    direction: 'asc' 
  });

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
              kihon: null as any,
              kata1: null as any,
              kata2: null as any,
              kumite: null as any,
              average: null as any,
              pass: false
          });
          onUpdate();
      }
  };

  const handleSort = (key: SortKey) => {
    setSortConfig(current => ({
        key,
        direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  // Helper to format date avoiding timezone issues
  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day).toLocaleDateString();
  };

  const examRegistrations = data.registrations.filter(r => r.examId === selectedExamId);
  
  // Enhance registrations with student data
  const gradedList = examRegistrations.map(reg => {
    const student = data.students.find(s => s.id === reg.studentId);
    return { 
        ...reg, 
        studentName: student?.name || 'Unknown', 
        currentRank: student?.currentRank,
        targetRank: reg.targetRank,
        senseiId: student?.senseiId
    };
  }).filter(item => {
      // Filter Logic
      if (filterRank && item.targetRank !== filterRank) return false;
      if (filterSensei && item.senseiId !== filterSensei) return false;
      if (filterName && !item.studentName.toLowerCase().includes(filterName.toLowerCase())) return false;
      return true;
  }).sort((a, b) => {
      // Sort Logic
      let comparison = 0;

      if (sortConfig.key === 'name') {
        comparison = a.studentName.localeCompare(b.studentName);
      } else if (sortConfig.key === 'targetRank') {
        const rankA = RANKS.indexOf(a.targetRank as Rank);
        const rankB = RANKS.indexOf(b.targetRank as Rank);
        comparison = rankA - rankB;
      } else if (sortConfig.key === 'average') {
        // Handle nulls always at bottom
        const avgA = a.average ?? -1;
        const avgB = b.average ?? -1;
        comparison = avgA - avgB;
      }

      return sortConfig.direction === 'asc' ? comparison : -comparison;
  });

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      
      {/* Exam Selector & Filters */}
      <div className="bg-white p-4 md:p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-bold mb-4 flex items-center text-gray-800">
            <Trophy className="mr-2" /> Avaliação de Exame
        </h2>
        
        {/* Main Selector always visible */}
        <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 mb-1">Selecione o Exame</label>
            <select 
                className="w-full border border-gray-300 rounded-md p-2 text-sm"
                value={selectedExamId}
                onChange={e => setSelectedExamId(e.target.value)}
            >
                <option value="">Selecione...</option>
                {data.exams.map(ex => (
                    <option key={ex.id} value={ex.id}>
                        {formatDate(ex.date)} - {ex.location}
                    </option>
                ))}
            </select>
        </div>

        {/* Filters Toggle Mobile */}
        <button 
            onClick={() => setShowFilters(!showFilters)}
            className="md:hidden flex items-center text-sm text-red-600 font-medium mb-2"
        >
            {showFilters ? <ChevronUp size={16} className="mr-1"/> : <ChevronDown size={16} className="mr-1"/>}
            {showFilters ? 'Ocultar Filtros' : 'Mostrar Filtros'}
        </button>

        {/* Filters Grid */}
        <div className={`grid grid-cols-1 md:grid-cols-3 gap-4 ${showFilters ? 'block' : 'hidden md:grid'}`}>
            <div>
                <label className="block text-sm font-medium text-gray-700 flex items-center mb-1">
                    <Search size={14} className="mr-1"/> Buscar Aluno
                </label>
                <input 
                    type="text"
                    className="w-full border border-gray-300 rounded-md p-2 text-sm placeholder-gray-400"
                    placeholder="Nome do aluno..."
                    value={filterName}
                    onChange={e => setFilterName(e.target.value)}
                    disabled={!selectedExamId}
                />
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 flex items-center mb-1">
                    <Filter size={14} className="mr-1"/> Filtrar por Sensei
                </label>
                <select 
                    className="w-full border border-gray-300 rounded-md p-2 text-sm"
                    value={filterSensei}
                    onChange={e => setFilterSensei(e.target.value)}
                    disabled={!selectedExamId}
                >
                    <option value="">Todos os Senseis</option>
                    {data.senseis.sort((a,b) => a.name.localeCompare(b.name)).map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                </select>
            </div>
            <div>
                <label className="block text-sm font-medium text-gray-700 flex items-center mb-1">
                    <Filter size={14} className="mr-1"/> Filtrar por Faixa
                </label>
                <select 
                    className="w-full border border-gray-300 rounded-md p-2 text-sm"
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
        <>
            {/* Desktop Table View */}
            <div className="hidden md:block bg-white rounded-lg shadow-md overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                    <div>
                        <h3 className="font-bold text-gray-800">Notas e Resultados</h3>
                        <p className="text-sm text-gray-500 mt-1">
                            Preencha as notas abaixo. A média é calculada automaticamente.
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
                                <th 
                                    className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-200 select-none"
                                    onClick={() => handleSort('name')}
                                >
                                    <div className="flex items-center">
                                        Aluno
                                        {sortConfig.key === 'name' && <ArrowUpDown size={12} className="ml-1 text-red-600" />}
                                    </div>
                                </th>
                                <th 
                                    className="px-2 py-3 text-center text-xs font-bold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-200 select-none"
                                    onClick={() => handleSort('targetRank')}
                                >
                                    <div className="flex items-center justify-center">
                                        Faixa Pretendida
                                        {sortConfig.key === 'targetRank' && <ArrowUpDown size={12} className="ml-1 text-red-600" />}
                                    </div>
                                </th>
                                <th className="px-2 py-3 text-center text-xs font-bold text-gray-600 uppercase tracking-wider w-24">Kihon</th>
                                <th className="px-2 py-3 text-center text-xs font-bold text-gray-600 uppercase tracking-wider w-24">Kata 1</th>
                                <th className="px-2 py-3 text-center text-xs font-bold text-gray-600 uppercase tracking-wider w-24">Kata 2</th>
                                <th className="px-2 py-3 text-center text-xs font-bold text-gray-600 uppercase tracking-wider w-24">Kumite</th>
                                <th 
                                    className="px-4 py-3 text-center text-xs font-bold text-gray-600 uppercase tracking-wider cursor-pointer hover:bg-gray-200 select-none"
                                    onClick={() => handleSort('average')}
                                >
                                    <div className="flex items-center justify-center">
                                        Média Final
                                        {sortConfig.key === 'average' && <ArrowUpDown size={12} className="ml-1 text-red-600" />}
                                    </div>
                                </th>
                                <th className="px-4 py-3 text-center text-xs font-bold text-gray-600 uppercase tracking-wider w-20">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {gradedList.length === 0 ? (
                                <tr><td colSpan={8} className="p-8 text-center text-gray-500">Nenhum aluno encontrado com os filtros selecionados.</td></tr>
                            ) : (
                                gradedList.map(item => (
                                    <tr key={item.id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-4 py-4 text-sm font-medium text-gray-900">
                                            <div className="flex flex-col">
                                                <span>{item.studentName}</span>
                                                <span className="text-xs text-gray-500 font-normal">
                                                    Faixa Atual: {item.currentRank}
                                                </span>
                                            </div>
                                        </td>
                                        <td className="px-2 py-4 text-center">
                                            <span className="px-2 py-1 bg-red-50 text-red-800 text-xs font-bold rounded-full border border-red-100">
                                                {item.targetRank}
                                            </span>
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
                                                className="text-gray-400 hover:text-red-600 p-2 rounded-full hover:bg-red-50 transition-colors"
                                                title="Limpar Notas"
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

            {/* Mobile Card View */}
            <div className="md:hidden space-y-4">
                {gradedList.length === 0 ? (
                    <div className="p-8 text-center bg-white rounded-lg shadow-sm text-gray-500">
                        Nenhum aluno encontrado com os filtros selecionados.
                    </div>
                ) : (
                    gradedList.map(item => (
                        <div key={item.id} className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                            {/* Header: Name and Ranks */}
                            <div className="flex justify-between items-start mb-4 border-b pb-3">
                                <div>
                                    <h3 className="text-lg font-bold text-gray-900">{item.studentName}</h3>
                                    <p className="text-xs text-gray-500">Atual: <span className="font-medium">{item.currentRank}</span></p>
                                </div>
                                <span className="px-3 py-1 bg-red-50 text-red-800 text-xs font-bold rounded-full border border-red-100">
                                    Para: {item.targetRank}
                                </span>
                            </div>

                            {/* Inputs Grid */}
                            <div className="grid grid-cols-2 gap-3 mb-4">
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1">Kihon</label>
                                    <input 
                                        key={`${item.id}-kihon-${item.kihon}`}
                                        type="number" step="0.1" min="0" max="10"
                                        className="w-full text-center border border-gray-300 rounded-md p-2 text-lg font-medium focus:ring-2 focus:ring-red-500 outline-none"
                                        placeholder="-"
                                        defaultValue={item.kihon ?? ''}
                                        onBlur={(e) => handleGradeUpdate(item.id, 'kihon', e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1">Kata 1</label>
                                    <input 
                                        key={`${item.id}-kata1-${item.kata1}`}
                                        type="number" step="0.1" min="0" max="10"
                                        className="w-full text-center border border-gray-300 rounded-md p-2 text-lg font-medium focus:ring-2 focus:ring-red-500 outline-none"
                                        placeholder="-"
                                        defaultValue={item.kata1 ?? ''}
                                        onBlur={(e) => handleGradeUpdate(item.id, 'kata1', e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1">Kata 2</label>
                                    <input 
                                        key={`${item.id}-kata2-${item.kata2}`}
                                        type="number" step="0.1" min="0" max="10"
                                        className="w-full text-center border border-gray-300 rounded-md p-2 text-lg font-medium focus:ring-2 focus:ring-red-500 outline-none"
                                        placeholder="-"
                                        defaultValue={item.kata2 ?? ''}
                                        onBlur={(e) => handleGradeUpdate(item.id, 'kata2', e.target.value)}
                                    />
                                </div>
                                <div>
                                    <label className="block text-xs font-medium text-gray-500 mb-1">Kumite</label>
                                    <input 
                                        key={`${item.id}-kumite-${item.kumite}`}
                                        type="number" step="0.1" min="0" max="10"
                                        className="w-full text-center border border-gray-300 rounded-md p-2 text-lg font-medium focus:ring-2 focus:ring-red-500 outline-none"
                                        placeholder="-"
                                        defaultValue={item.kumite ?? ''}
                                        onBlur={(e) => handleGradeUpdate(item.id, 'kumite', e.target.value)}
                                    />
                                </div>
                            </div>

                            {/* Result Footer */}
                            <div className="flex justify-between items-center bg-gray-50 -m-4 mt-0 p-4 border-t">
                                <div className="flex flex-col">
                                    <span className="text-xs text-gray-500 font-bold uppercase">Média Final</span>
                                    <div className="flex items-center gap-2">
                                        <span className={`text-2xl font-bold ${
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
                                </div>
                                <button 
                                    onClick={() => handleClearGrades(item.id)}
                                    className="bg-white text-gray-400 hover:text-red-600 p-3 rounded-full border shadow-sm active:bg-gray-100 transition-colors"
                                    title="Limpar Notas"
                                >
                                    <Trash2 size={20} />
                                </button>
                            </div>
                        </div>
                    ))
                )}
            </div>
        </>
      )}
    </div>
  );
};