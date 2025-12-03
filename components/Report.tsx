import React, { useState } from 'react';
import { AppData, Rank } from '../types';
import { RANKS } from '../constants';
import { FileText, Filter, ArrowUpDown, Printer, Users, Trophy, ClipboardCheck } from 'lucide-react';

interface Props {
  data: AppData;
}

type SortOption = 'rank' | 'grade_desc' | 'grade_asc' | 'name';
type ReportType = 'results' | 'exam_list' | 'approval_list';

export const Report: React.FC<Props> = ({ data }) => {
  const [reportType, setReportType] = useState<ReportType>('results');
  
  const [filterRank, setFilterRank] = useState<string>('');
  const [filterSensei, setFilterSensei] = useState<string>('');
  const [filterExam, setFilterExam] = useState<string>('');
  const [sortBy, setSortBy] = useState<SortOption>('rank');

  // Helper to get enriched data
  const getEnrichedData = () => {
    return data.registrations.map(reg => {
        const student = data.students.find(s => s.id === reg.studentId);
        const exam = data.exams.find(e => e.id === reg.examId);
        const sensei = data.senseis.find(sen => sen.id === student?.senseiId);
        
        return {
          ...reg,
          studentName: student?.name,
          studentCpf: student?.cpf,
          studentSenseiId: student?.senseiId,
          senseiName: sensei?.name || '-',
          studentRank: student?.currentRank,
          examDate: exam?.date,
          examTime: exam?.time,
          examLocation: exam?.location,
          examId: reg.examId
        };
      }).filter(item => {
        // Apply filters
        if (filterExam && item.examId !== filterExam) return false;
        if (filterRank && item.targetRank !== filterRank) return false;
        if (filterSensei && item.studentSenseiId !== filterSensei) return false;
        return true;
      });
  };

  const filteredData = getEnrichedData();

  // Sorting Logic
  const sortedData = [...filteredData].sort((a, b) => {
    if (sortBy === 'grade_desc') {
        return (b.average ?? 0) - (a.average ?? 0);
    }
    if (sortBy === 'grade_asc') {
        return (a.average ?? 0) - (b.average ?? 0);
    }
    if (sortBy === 'name') {
        return (a.studentName || '').localeCompare(b.studentName || '');
    }
    // Default: Sort by Rank Order
    const rankA = RANKS.indexOf(a.targetRank as Rank);
    const rankB = RANKS.indexOf(b.targetRank as Rank);
    
    if (rankA === rankB) {
        return (a.studentName || '').localeCompare(b.studentName || '');
    }
    return rankA - rankB;
  });

  const handlePrint = () => {
    window.print();
  };

  const selectedExamDetails = data.exams.find(e => e.id === filterExam);

  // Helper to determine if exam selection is required
  const isExamSelectionRequired = reportType === 'exam_list' || reportType === 'approval_list';

  return (
    <div className="space-y-6">
      {/* CSS for printing */}
      <style>{`
        @media print {
          body * {
            visibility: hidden;
          }
          #report-content, #report-content * {
            visibility: visible;
          }
          #report-content {
            position: absolute;
            left: 0;
            top: 0;
            width: 100%;
          }
          .no-print {
            display: none !important;
          }
        }
      `}</style>

      {/* Tabs / Header */}
      <div className="flex flex-col xl:flex-row justify-between items-center bg-white p-4 rounded-lg shadow-sm no-print gap-4">
         <div className="flex flex-wrap gap-2 bg-gray-100 p-1 rounded-lg">
            <button
                onClick={() => setReportType('results')}
                className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    reportType === 'results' ? 'bg-white text-red-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                }`}
            >
                <Trophy size={16} className="mr-2" /> Resultados Gerais
            </button>
            <button
                onClick={() => {
                    setReportType('exam_list');
                    setSortBy('name');
                }}
                className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    reportType === 'exam_list' ? 'bg-white text-red-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                }`}
            >
                <Users size={16} className="mr-2" /> Lista de Inscritos
            </button>
            <button
                onClick={() => {
                    setReportType('approval_list');
                    setSortBy('name');
                }}
                className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    reportType === 'approval_list' ? 'bg-white text-red-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                }`}
            >
                <ClipboardCheck size={16} className="mr-2" /> Lista de Aprovação
            </button>
         </div>
         <button 
            onClick={handlePrint}
            className="flex items-center bg-gray-800 text-white px-4 py-2 rounded-md hover:bg-gray-900 transition-colors text-sm whitespace-nowrap"
         >
            <Printer size={16} className="mr-2" /> Imprimir Relatório
         </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-lg shadow-md no-print">
        <h2 className="text-xl font-bold mb-4 flex items-center text-gray-800">
           <Filter className="mr-2" /> Filtros e Configurações
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
             <div>
                <label className="block text-sm font-medium text-gray-700">Exame {isExamSelectionRequired && '*'}</label>
                <select 
                    className={`mt-1 w-full border rounded-md p-2 text-sm ${isExamSelectionRequired && !filterExam ? 'border-red-300 ring-1 ring-red-200' : 'border-gray-300'}`}
                    value={filterExam}
                    onChange={e => setFilterExam(e.target.value)}
                >
                    <option value="">{isExamSelectionRequired ? 'Selecione um Exame...' : 'Todos os Exames'}</option>
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
                    <option value="rank">Faixa (Crescente)</option>
                    <option value="name">Nome do Aluno</option>
                    {reportType === 'results' && (
                        <>
                            <option value="grade_desc">Maior Nota</option>
                            <option value="grade_asc">Menor Nota</option>
                        </>
                    )}
                </select>
             </div>
        </div>
      </div>

      {/* Report Content Area */}
      <div id="report-content" className="bg-white rounded-lg shadow-md overflow-hidden min-h-[500px]">
        
        {/* Header for Print/View */}
        <div className="px-6 py-6 border-b border-gray-200 bg-gray-50">
             <div className="flex justify-between items-start">
                 <div>
                     <h3 className="text-2xl font-bold text-gray-900 flex items-center uppercase tracking-wide">
                         {reportType === 'results' && 'Boletim de Resultados'}
                         {reportType === 'exam_list' && 'Lista de Inscritos'}
                         {reportType === 'approval_list' && 'Lista de Aprovação'}
                     </h3>
                     {selectedExamDetails ? (
                         <div className="mt-2 text-gray-600">
                             <p className="font-semibold">{new Date(selectedExamDetails.date).toLocaleDateString()} - {selectedExamDetails.location}</p>
                             <p className="text-sm">Horário: {selectedExamDetails.time}</p>
                         </div>
                     ) : (
                         <p className="mt-2 text-gray-500 text-sm">Relatório Geral</p>
                     )}
                 </div>
                 <div className="text-right">
                     <p className="text-xs text-gray-400">Gerado em</p>
                     <p className="text-sm font-medium text-gray-700">{new Date().toLocaleDateString()} {new Date().toLocaleTimeString()}</p>
                     <p className="mt-2 text-sm font-bold bg-gray-200 px-3 py-1 rounded-full inline-block">
                        Total: {sortedData.length}
                     </p>
                 </div>
             </div>
        </div>

        {/* Content Warning for Exam specific reports */}
        {isExamSelectionRequired && !filterExam && (
             <div className="p-10 text-center flex flex-col items-center justify-center text-gray-500">
                 <Filter size={48} className="mb-4 text-gray-300" />
                 <p className="text-lg font-medium">Selecione um Exame acima para visualizar este relatório.</p>
             </div>
        )}

        {/* Table View */}
        {(reportType === 'results' || (isExamSelectionRequired && filterExam)) && (
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-100">
                        <tr>
                            {/* Common Columns */}
                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Aluno</th>
                            <th className="px-4 py-3 text-left text-xs font-bold text-gray-600 uppercase tracking-wider">Sensei</th>
                            <th className="px-4 py-3 text-center text-xs font-bold text-gray-600 uppercase tracking-wider">Faixa Atual</th>
                            <th className="px-4 py-3 text-center text-xs font-bold text-gray-600 uppercase tracking-wider">Faixa Pretendida</th>
                            
                            {/* Results Specific */}
                            {reportType === 'results' && (
                                <>
                                    <th className="px-2 py-3 text-center text-xs font-bold text-gray-600 uppercase tracking-wider">Média</th>
                                    <th className="px-4 py-3 text-center text-xs font-bold text-gray-600 uppercase tracking-wider">Situação</th>
                                </>
                            )}

                            {/* Approval List Specific */}
                            {reportType === 'approval_list' && (
                                <th className="px-4 py-3 text-center text-xs font-bold text-gray-600 uppercase tracking-wider">Situação</th>
                            )}
                            
                            {/* Exam List Specific (Empty cols for printing) */}
                            {reportType === 'exam_list' && (
                                <>
                                    <th className="px-4 py-3 text-center text-xs font-bold text-gray-600 uppercase tracking-wider border-l">Pagamento</th>
                                    <th className="px-4 py-3 text-center text-xs font-bold text-gray-600 uppercase tracking-wider border-l">Presença</th>
                                </>
                            )}
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {sortedData.map((row, idx) => (
                            <tr key={idx} className="hover:bg-gray-50 group">
                                <td className="px-4 py-3 whitespace-nowrap">
                                    <div className="text-sm font-bold text-gray-900 uppercase">{row.studentName}</div>
                                    {row.studentCpf && <div className="text-xs text-gray-500">{row.studentCpf}</div>}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700">
                                    {row.senseiName}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-center text-sm text-gray-500">
                                    {row.studentRank}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-center text-sm font-bold text-gray-800">
                                    {row.targetRank}
                                </td>

                                {/* Results Columns */}
                                {reportType === 'results' && (
                                    <>
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
                                    </>
                                )}

                                {/* Approval List Columns */}
                                {reportType === 'approval_list' && (
                                    <td className="px-4 py-3 text-center">
                                        {row.average != null ? (
                                            <span className={`px-2 py-1 text-xs font-bold rounded-full ${row.pass ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                {row.pass ? 'APROVADO' : 'REPROVADO'}
                                            </span>
                                        ) : (
                                            <span className="text-gray-400 text-xs italic">Pendente</span>
                                        )}
                                    </td>
                                )}

                                {/* Exam List Checkboxes (Visual only) */}
                                {reportType === 'exam_list' && (
                                    <>
                                        <td className="px-4 py-3 text-center border-l">
                                            <div className="w-4 h-4 border-2 border-gray-300 rounded mx-auto"></div>
                                        </td>
                                        <td className="px-4 py-3 text-center border-l">
                                            <div className="w-4 h-4 border-2 border-gray-300 rounded mx-auto"></div>
                                        </td>
                                    </>
                                )}
                            </tr>
                        ))}
                        {sortedData.length === 0 && (
                            <tr><td colSpan={reportType === 'results' ? 6 : (reportType === 'approval_list' ? 5 : 6)} className="p-8 text-center text-gray-500">Nenhum registro encontrado.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        )}
      </div>
    </div>
  );
};