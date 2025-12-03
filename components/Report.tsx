import React, { useState } from 'react';
import { AppData, Rank } from '../types';
import { RANKS } from '../constants';
import { FileText, Filter, ArrowUpDown } from 'lucide-react';

interface Props {
  data: AppData;
}

type SortOption = 'rank' | 'grade_desc' | 'grade_asc';

export const Report: React.FC<Props> = ({ data }) => {
  const [filterRank, setFilterRank] = useState<string>('');
  const [filterSensei, setFilterSensei] = useState<string>('');
  const [filterExam, setFilterExam] = useState<string>('');
  const [sortBy, setSortBy] = useState<SortOption>('rank');

  // Combine data for the report
  const reportData = data.registrations.map(reg => {
    const student = data.students.find(s => s.id === reg.studentId);
    const exam = data.exams.find(e => e.id === reg.examId);
    // Find the sensei associated with the student
    const sensei = data.senseis.find(sen => sen.id === student?.senseiId);
    
    return {
      ...reg,
      studentName: student?.name,
      studentSenseiId: student?.senseiId,
      senseiName: sensei?.name || '-',
      studentRank: student?.currentRank,
      examDate: exam?.date,
      examLocation: exam?.location
    };
  }).filter(item => {
    // Apply filters
    if (filterExam && item.examId !== filterExam) return false;
    if (filterRank && item.targetRank !== filterRank) return false;
    if (filterSensei && item.studentSenseiId !== filterSensei) return false;
    return true;
  }).sort((a, b) => {
    
    if (sortBy === 'grade_desc') {
        // Sort by Average (High to Low)
        return (b.average ?? 0) - (a.average ?? 0);
    }
    
    if (sortBy === 'grade_asc') {
        // Sort by Average (Low to High)
        return (a.average ?? 0) - (b.average ?? 0);
    }

    // Default: Sort by Rank Order
    const rankA = RANKS.indexOf(a.targetRank as Rank);
    const rankB = RANKS.indexOf(b.targetRank as Rank);
    
    // If ranks are equal, sort by name
    if (rankA === rankB) {
        return (a.studentName || '').localeCompare(b.studentName || '');
    }
    
    return rankA - rankB;
  });

  return (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-bold mb-4 flex items-center text-gray-800">
           <Filter className="mr-2" /> Filtros e Ordenação
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
             <div>
                <label className="block text-sm font-medium text-gray-700">Exame</label>
                <select 
                    className="mt-1 w-full border border-gray-300 rounded-md p-2 text-sm"
                    value={filterExam}
                    onChange={e => setFilterExam(e.target.value)}
                >
                    <option value="">Todos os Exames</option>
                    {data.exams.map(e => (
                        <option key={e.id} value={e.id}>{new Date(e.date).toLocaleDateString()} - {e.location}</option>
                    ))}
                </select>
             </div>
             <div>
                <label className="block text-sm font-medium text-gray-700">Faixa Pretendida</label>
                <select 
                    className="mt-1 w-full border border-gray-300 rounded-md p-2 text-sm"
                    value={filterRank}
                    onChange={e => setFilterRank(e.target.value)}
                >
                    <option value="">Todas</option>
                    {RANKS.map(r => (
                        <option key={r} value={r}>{r}</option>
                    ))}
                </select>
             </div>
             <div>
                <label className="block text-sm font-medium text-gray-700">Sensei</label>
                <select 
                    className="mt-1 w-full border border-gray-300 rounded-md p-2 text-sm"
                    value={filterSensei}
                    onChange={e => setFilterSensei(e.target.value)}
                >
                    <option value="">Todos</option>
                    {data.senseis.sort((a,b) => a.name.localeCompare(b.name)).map(s => (
                        <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                </select>
             </div>
             <div>
                <label className="block text-sm font-medium text-gray-700 flex items-center">
                    <ArrowUpDown size={14} className="mr-1"/> Ordenar Por
                </label>
                <select 
                    className="mt-1 w-full border border-gray-300 rounded-md p-2 text-sm bg-gray-50 font-medium"
                    value={sortBy}
                    onChange={e => setSortBy(e.target.value as SortOption)}
                >
                    <option value="rank">Faixa (Ordem Crescente)</option>
                    <option value="grade_desc">Maior Nota (Decrescente)</option>
                    <option value="grade_asc">Menor Nota (Crescente)</option>
                </select>
             </div>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <div className="px-6 py-4 border-b border-gray-200 flex justify-between items-center bg-gray-50">
             <h3 className="font-bold text-gray-800 flex items-center">
                 <FileText className="mr-2" size={20}/> Resultado Geral
             </h3>
             <span className="text-sm text-gray-500 bg-white px-3 py-1 rounded-full border shadow-sm">
                {reportData.length} registros
             </span>
        </div>
        <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-100">
                    <tr>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Data/Local</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Aluno</th>
                        <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase">Sensei</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Faixa Alvo</th>
                        <th className="px-2 py-3 text-center text-xs font-medium text-gray-500 uppercase">Média</th>
                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase">Situação</th>
                        <th className="px-2 py-3 text-center text-xs font-medium text-gray-400 uppercase text-[10px]">Detalhes</th>
                    </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                    {reportData.map((row, idx) => (
                        <tr key={idx} className="hover:bg-gray-50 group">
                            <td className="px-4 py-3 whitespace-nowrap text-xs text-gray-500">
                                <div>{new Date(row.examDate!).toLocaleDateString()}</div>
                                <div className="text-[10px] text-gray-400">{row.examLocation}</div>
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm font-medium text-gray-900">
                                {row.studentName}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-600">
                                {row.senseiName}
                            </td>
                            <td className="px-4 py-3 whitespace-nowrap text-center text-sm font-semibold text-gray-700">
                                {row.targetRank}
                            </td>
                            <td className="px-2 py-3 text-center text-sm font-bold text-gray-800">
                                {row.average != null ? row.average.toFixed(2) : '-'}
                            </td>
                            <td className="px-4 py-3 text-center">
                                {row.average != null ? (
                                    <span className={`px-2 py-1 text-xs font-bold rounded-full ${row.pass ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                        {row.pass ? 'APROVADO' : 'REPROVADO'}
                                    </span>
                                ) : (
                                    <span className="text-gray-400 text-xs italic">Pendente</span>
                                )}
                            </td>
                            <td className="px-2 py-3 text-center text-xs text-gray-400">
                                <div className="flex flex-col gap-0.5 text-[10px]">
                                    <span title="Kihon">Ki: {row.kihon ?? '-'}</span>
                                    <span title="Kata">Ka: {row.kata1 ?? '-'}</span>
                                    <span title="Kumite">Ku: {row.kumite ?? '-'}</span>
                                </div>
                            </td>
                        </tr>
                    ))}
                     {reportData.length === 0 && (
                        <tr><td colSpan={7} className="p-8 text-center text-gray-500">Nenhum resultado encontrado para os filtros selecionados.</td></tr>
                    )}
                </tbody>
            </table>
        </div>
      </div>
    </div>
  );
};