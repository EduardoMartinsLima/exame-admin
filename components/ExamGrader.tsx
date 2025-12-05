import React, { useState, useEffect } from 'react';
import { AppData, ExamRegistration, Rank } from '../types';
import { storageService } from '../services/storageService';
import { RANKS } from '../constants';
import { Trophy, Eraser, Filter, ArrowUpDown, Search, ChevronDown, ChevronUp, AlertTriangle, Save } from 'lucide-react';

interface Props {
  data: AppData;
  onUpdate: () => void;
}

type SortKey = 'name' | 'targetRank' | 'average';

export const ExamGrader: React.FC<Props> = ({ data, onUpdate }) => {
  const [selectedExamId, setSelectedExamId] = useState<string>('');
  
  // Local Edits State: Stores changes that haven't been saved to DB yet
  const [edits, setEdits] = useState<Record<string, Partial<ExamRegistration>>>({});

  // Mobile: Track expanded cards
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

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

  const toggleItem = (id: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const calculateAverageAndPass = (reg: Partial<ExamRegistration>) => {
    const scores = [
        reg.kihon ?? 0,
        reg.kata1 ?? 0,
        reg.kata2 ?? 0,
        reg.kumite ?? 0
    ];
    // Filter only scores greater than 0
    const validScores = scores.filter(s => s > 0);
    const sum = validScores.reduce((a, b) => a + b, 0);
    const count = validScores.length;
    
    const average = count > 0 ? sum / count : 0;
    return {
        average: parseFloat(average.toFixed(2)),
        pass: average >= 6.0
    };
  };

  const handleLocalChange = (regId: string, field: keyof ExamRegistration, value: string) => {
      const numValue = value === '' ? null : parseFloat(value);
      
      setEdits(prev => {
          const currentEdit = prev[regId] || {};
          const dbValue = data.registrations.find(r => r.id === regId);
          
          // Merge DB data with existing edits and new value to calculate average preview
          const mergedState = { ...dbValue, ...currentEdit, [field]: numValue };
          
          const { average, pass } = calculateAverageAndPass(mergedState);

          return {
              ...prev,
              [regId]: {
                  ...currentEdit,
                  [field]: numValue,
                  average,
                  pass
              }
          };
      });
  };

  const handleSaveRow = async (regId: string) => {
      const changes = edits[regId];
      if (!changes) return;

      try {
          const { error } = await storageService.updateResult(regId, changes);
          if (error) {
              alert('Erro ao salvar. Tente novamente.');
              console.error(error);
          } else {
              // Clear edits for this row on success
              setEdits(prev => {
                  const newState = { ...prev };
                  delete newState[regId];
                  return newState;
              });
              onUpdate();
          }
      } catch (err) {
          console.error("Save error:", err);
          alert('Erro desconhecido ao salvar.');
      }
  };

  const handleClearGrades = async (regId: string) => {
      if (window.confirm('Tem certeza que deseja limpar todas as notas deste aluno?')) {
          try {
              // 1. OPTIMISTIC UPDATE: Visually clear immediately so the user sees action
              setEdits(prev => ({
                  ...prev,
                  [regId]: {
                      kihon: null,
                      kata1: null,
                      kata2: null,
                      kumite: null,
                      average: null,
                      pass: false
                  }
              }));

              // 2. Clear in DB
              const { error } = await storageService.updateResult(regId, {
                  kihon: null,
                  kata1: null,
                  kata2: null,
                  kumite: null,
                  average: null,
                  pass: false
              });

              if (error) {
                  alert('Erro ao limpar notas no banco de dados.');
                  console.error(error);
                  // Revert optimistic update on error
                  setEdits(prev => {
                    const newState = { ...prev };
                    delete newState[regId];
                    return newState;
                  });
              } else {
                  onUpdate();
                  // Clean up the local edit state
                  setEdits(prev => {
                    const newState = { ...prev };
                    delete newState[regId];
                    return newState;
                  });
              }
          } catch (err) {
              console.error('Unexpected error clearing grades:', err);
              alert('Ocorreu um erro inesperado.');
          }
      }
  };

  const handleClearAllGrades = async () => {
    if (!selectedExamId) return;

    // Filter registrations for this exam that have ANY grade data
    const gradedRegs = data.registrations.filter(r => 
        r.examId === selectedExamId && 
        (r.average != null || r.pass === true || r.kihon != null || r.kata1 != null || r.kata2 != null || r.kumite != null)
    );

    if (gradedRegs.length === 0) {
        alert('Não há notas lançadas para limpar neste exame.');
        return;
    }

    if (!window.confirm(`ATENÇÃO: Isso apagará as notas de TODOS os ${gradedRegs.length} alunos avaliados neste exame.\n\nEsta ação não pode ser desfeita. Tem certeza que deseja continuar?`)) {
        return;
    }

    try {
        // Optimistic update for all
        const emptyState = {
            kihon: null,
            kata1: null,
            kata2: null,
            kumite: null,
            average: null,
            pass: false
        };

        setEdits(prev => {
            const next = { ...prev };
            gradedRegs.forEach(r => {
                next[r.id] = emptyState;
            });
            return next;
        });

        const updates = gradedRegs.map(reg => 
            storageService.updateResult(reg.id, emptyState)
        );

        await Promise.all(updates);
        setEdits({}); // Clear all local edits after sync
        onUpdate();
        alert('Todas as notas do exame foram limpas.');
    } catch (err) {
        console.error("Error clearing all grades:", err);
        alert("Ocorreu um erro ao tentar limpar as notas.");
        onUpdate(); // Re-fetch to ensure consistency
    }
  };

  const handleSort = (key: SortKey) => {
    setSortConfig(current => ({
        key,
        direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const examRegistrations = data.registrations.filter(r => r.examId === selectedExamId);
  
  // Enhance registrations with student data and MERGE with local edits
  const gradedList = examRegistrations.map(reg => {
    const student = data.students.find(s => s.id === reg.studentId);
    
    // Merge DB data with Local Edits
    const pendingEdits = edits[reg.id] || {};
    const mergedReg = { ...reg, ...pendingEdits };
    const hasPendingChanges = Object.keys(pendingEdits).length > 0;

    return { 
        ...mergedReg, // Use merged values for display
        originalId: reg.id,
        studentName: student?.name || 'Unknown', 
        currentRank: student?.currentRank,
        targetRank: reg.targetRank,
        senseiId: student?.senseiId,
        hasPendingChanges
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
        const avgA = a.average ?? -1;
        const avgB = b.average ?? -1;
        comparison = avgA - avgB;
      }

      return sortConfig.direction === 'asc' ? comparison : -comparison;
  });

  // Helper to format date avoiding timezone issues
  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day).toLocaleDateString();
  };

  return (
    <div className="space-y-6 pb-20 md:pb-0">
      
      {/* Exam Selector & Filters */}
      <div className="bg-white p-4 md:p-6 rounded-lg shadow-md">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-4 gap-4">
            <h2 className="text-xl font-bold flex items-center text-gray-800">
                <Trophy className="mr-2" /> Avaliação de Exame
            </h2>
            {selectedExamId && (
                <button 
                    type="button"
                    onClick={handleClearAllGrades}
                    className="flex items-center text-red-600 bg-red-50 hover:bg-red-100 px-3 py-2 rounded-md text-sm font-medium transition-colors border border-red-200"
                    title="Apagar notas de todos os alunos deste exame"
                >
                    <AlertTriangle size={16} className="mr-2" />
                    Limpar Todas as Notas
                </button>
            )}
        </div>
        
        {/* Main Selector */}
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
            type="button"
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
            {/* Desktop Table View (Hidden on Mobile/Tablet) */}
            <div className="hidden lg:block bg-white rounded-lg shadow-md overflow-hidden">
                <div className="px-6 py-4 border-b border-gray-200 bg-gray-50 flex justify-between items-center">
                    <div>
                        <h3 className="font-bold text-gray-800">Notas e Resultados</h3>
                        <p className="text-sm text-gray-500 mt-1">
                            Preencha as notas e clique no botão de <strong>Salvar</strong> ao final da linha.
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
                                <th className="px-4 py-3 text-center text-xs font-bold text-gray-600 uppercase tracking-wider w-24">Ações</th>
                            </tr>
                        </thead>
                        <tbody className="bg-white divide-y divide-gray-200">
                            {gradedList.length === 0 ? (
                                <tr><td colSpan={8} className="p-8 text-center text-gray-500">Nenhum aluno encontrado com os filtros selecionados.</td></tr>
                            ) : (
                                gradedList.map(item => (
                                    <tr key={item.originalId} className={`hover:bg-gray-50 transition-colors ${item.hasPendingChanges ? 'bg-yellow-50' : ''}`}>
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
                                                type="number" step="0.1" min="0" max="10"
                                                className={`w-full text-center border rounded-md p-2 text-sm outline-none transition-shadow ${item.hasPendingChanges ? 'border-yellow-400 bg-white' : 'border-gray-300 focus:ring-2 focus:ring-red-500'}`}
                                                placeholder="0.0"
                                                value={item.kihon ?? ''}
                                                onChange={(e) => handleLocalChange(item.originalId, 'kihon', e.target.value)}
                                            />
                                        </td>
                                        <td className="px-2 py-2">
                                            <input 
                                                type="number" step="0.1" min="0" max="10"
                                                className={`w-full text-center border rounded-md p-2 text-sm outline-none transition-shadow ${item.hasPendingChanges ? 'border-yellow-400 bg-white' : 'border-gray-300 focus:ring-2 focus:ring-red-500'}`}
                                                placeholder="0.0"
                                                value={item.kata1 ?? ''}
                                                onChange={(e) => handleLocalChange(item.originalId, 'kata1', e.target.value)}
                                            />
                                        </td>
                                        <td className="px-2 py-2">
                                            <input 
                                                type="number" step="0.1" min="0" max="10"
                                                className={`w-full text-center border rounded-md p-2 text-sm outline-none transition-shadow ${item.hasPendingChanges ? 'border-yellow-400 bg-white' : 'border-gray-300 focus:ring-2 focus:ring-red-500'}`}
                                                placeholder="0.0"
                                                value={item.kata2 ?? ''}
                                                onChange={(e) => handleLocalChange(item.originalId, 'kata2', e.target.value)}
                                            />
                                        </td>
                                        <td className="px-2 py-2">
                                            <input 
                                                type="number" step="0.1" min="0" max="10"
                                                className={`w-full text-center border rounded-md p-2 text-sm outline-none transition-shadow ${item.hasPendingChanges ? 'border-yellow-400 bg-white' : 'border-gray-300 focus:ring-2 focus:ring-red-500'}`}
                                                placeholder="0.0"
                                                value={item.kumite ?? ''}
                                                onChange={(e) => handleLocalChange(item.originalId, 'kumite', e.target.value)}
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
                                            <div className="flex justify-center gap-1">
                                                {item.hasPendingChanges && (
                                                    <button 
                                                        type="button"
                                                        onClick={() => handleSaveRow(item.originalId)}
                                                        className="text-white bg-green-600 hover:bg-green-700 p-2 rounded-full shadow-sm transition-colors animate-pulse"
                                                        title="Salvar Alterações"
                                                    >
                                                        <Save size={16} />
                                                    </button>
                                                )}
                                                <button 
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        handleClearGrades(item.originalId);
                                                    }}
                                                    className="text-gray-400 hover:text-orange-600 p-2 rounded-full hover:bg-orange-50 transition-colors"
                                                    title="Limpar Notas (Zerar)"
                                                >
                                                    <Eraser size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>

            {/* Mobile & Tablet Card View (Collapsible) */}
            <div className="lg:hidden grid grid-cols-1 md:grid-cols-2 gap-4">
                {gradedList.length === 0 ? (
                    <div className="p-8 text-center bg-white rounded-lg shadow-sm text-gray-500 col-span-full">
                        Nenhum aluno encontrado com os filtros selecionados.
                    </div>
                ) : (
                    gradedList.map(item => {
                        const isExpanded = expandedItems.has(item.originalId);
                        
                        return (
                            <div 
                                key={item.originalId} 
                                className={`rounded-lg shadow-sm border overflow-hidden transition-all ${
                                    item.hasPendingChanges ? 'bg-yellow-50 border-yellow-200' : 'bg-white border-gray-200'
                                }`}
                            >
                                {/* Collapsible Header */}
                                <div 
                                    className="p-4 cursor-pointer flex justify-between items-center"
                                    onClick={() => toggleItem(item.originalId)}
                                >
                                    <div className="flex-1">
                                        <div className="flex justify-between items-start mb-1">
                                            <h3 className="text-base font-bold text-gray-900 line-clamp-1 mr-2">{item.studentName}</h3>
                                            <span className="px-2 py-0.5 bg-red-50 text-red-800 text-[10px] font-bold rounded-full border border-red-100 whitespace-nowrap">
                                                {item.targetRank}
                                            </span>
                                        </div>
                                        <div className="flex items-center gap-2">
                                            <span className="text-xs text-gray-500">
                                                Média: <span className={`font-bold ${
                                                    item.average == null ? 'text-gray-400' : (item.average >= 6 ? 'text-green-600' : 'text-red-600')
                                                }`}>
                                                    {item.average != null ? item.average.toFixed(2) : '-'}
                                                </span>
                                            </span>
                                            {item.average != null && (
                                                <span className={`text-[9px] uppercase font-bold px-1.5 py-0.5 rounded-sm ${
                                                    (item.average ?? 0) >= 6 ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                                }`}>
                                                    {(item.average ?? 0) >= 6 ? 'APROV' : 'REPROV'}
                                                </span>
                                            )}
                                        </div>
                                    </div>
                                    <div className="ml-3 text-gray-400">
                                        {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                    </div>
                                </div>

                                {/* Collapsible Body */}
                                {isExpanded && (
                                    <div className="p-4 pt-0 border-t border-dashed border-gray-200">
                                        {/* Inputs Grid */}
                                        <div className="grid grid-cols-2 gap-3 mt-4 mb-4">
                                            <div>
                                                <label className="block text-xs font-medium text-gray-500 mb-1">Kihon</label>
                                                <input 
                                                    type="number" step="0.1" min="0" max="10"
                                                    className="w-full text-center border border-gray-300 rounded-md p-2 text-lg font-medium focus:ring-2 focus:ring-red-500 outline-none"
                                                    placeholder="-"
                                                    value={item.kihon ?? ''}
                                                    onChange={(e) => handleLocalChange(item.originalId, 'kihon', e.target.value)}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-gray-500 mb-1">Kata 1</label>
                                                <input 
                                                    type="number" step="0.1" min="0" max="10"
                                                    className="w-full text-center border border-gray-300 rounded-md p-2 text-lg font-medium focus:ring-2 focus:ring-red-500 outline-none"
                                                    placeholder="-"
                                                    value={item.kata1 ?? ''}
                                                    onChange={(e) => handleLocalChange(item.originalId, 'kata1', e.target.value)}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-gray-500 mb-1">Kata 2</label>
                                                <input 
                                                    type="number" step="0.1" min="0" max="10"
                                                    className="w-full text-center border border-gray-300 rounded-md p-2 text-lg font-medium focus:ring-2 focus:ring-red-500 outline-none"
                                                    placeholder="-"
                                                    value={item.kata2 ?? ''}
                                                    onChange={(e) => handleLocalChange(item.originalId, 'kata2', e.target.value)}
                                                />
                                            </div>
                                            <div>
                                                <label className="block text-xs font-medium text-gray-500 mb-1">Kumite</label>
                                                <input 
                                                    type="number" step="0.1" min="0" max="10"
                                                    className="w-full text-center border border-gray-300 rounded-md p-2 text-lg font-medium focus:ring-2 focus:ring-red-500 outline-none"
                                                    placeholder="-"
                                                    value={item.kumite ?? ''}
                                                    onChange={(e) => handleLocalChange(item.originalId, 'kumite', e.target.value)}
                                                />
                                            </div>
                                        </div>

                                        {/* Actions Footer */}
                                        <div className="flex justify-between items-center bg-gray-50 -m-4 p-4 border-t">
                                            <div className="text-xs text-gray-500">
                                                Faixa Atual: <span className="font-semibold">{item.currentRank}</span>
                                            </div>
                                            <div className="flex gap-2">
                                                {item.hasPendingChanges && (
                                                    <button 
                                                        type="button"
                                                        onClick={() => handleSaveRow(item.originalId)}
                                                        className="bg-green-600 text-white px-4 py-2 rounded-full shadow-md active:bg-green-700 transition-colors flex items-center gap-2"
                                                        title="Salvar"
                                                    >
                                                        <Save size={16} /> <span className="text-xs font-bold">Salvar</span>
                                                    </button>
                                                )}
                                                <button 
                                                    type="button"
                                                    onClick={(e) => {
                                                        e.preventDefault();
                                                        e.stopPropagation();
                                                        handleClearGrades(item.originalId);
                                                    }}
                                                    className="bg-white text-gray-400 hover:text-orange-600 p-2 rounded-full border shadow-sm active:bg-gray-100 transition-colors"
                                                    title="Limpar Notas"
                                                >
                                                    <Eraser size={18} />
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}
                            </div>
                        );
                    })
                )}
            </div>
        </>
      )}
    </div>
  );
};