import React, { useState } from 'react';
import { AppData, Rank } from '../types';
import { RANKS } from '../constants';
import { FileText, Filter, ArrowUpDown, Printer, Users, Trophy, ClipboardCheck, Award, List } from 'lucide-react';
import { KarateLogo } from './KarateLogo';

interface Props {
  data: AppData;
}

type SortOption = 'rank' | 'grade_desc' | 'grade_asc' | 'name';
type ReportType = 'results' | 'exam_list' | 'approval_list' | 'passed_list' | 'student_list';

export const Report: React.FC<Props> = ({ data }) => {
  const [reportType, setReportType] = useState<ReportType>('results');
  
  const [filterRank, setFilterRank] = useState<string>('');
  const [filterSensei, setFilterSensei] = useState<string>('');
  const [filterExam, setFilterExam] = useState<string>('');
  const [sortBy, setSortBy] = useState<SortOption>('rank');

  // Helper to format date avoiding timezone issues
  const formatDate = (dateString: string | undefined) => {
    if (!dateString) return '-';
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day).toLocaleDateString();
  };

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
        
        // Filter for Passed List
        if (reportType === 'passed_list' && !item.pass) return false;

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
  const isExamSelectionRequired = reportType === 'exam_list' || reportType === 'approval_list' || reportType === 'student_list';

  return (
    <div className="space-y-6">
      {/* CSS for printing */}
      <style>{`
        @media print {
          @page { margin: 1cm; }
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
            background-color: white !important;
            min-height: auto !important;
            box-shadow: none !important;
          }
          .no-print {
            display: none !important;
          }
          /* Force background colors */
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          /* Print Styling Overrides */
          table { width: 100% !important; border-collapse: collapse !important; }
          th, td { border: 1px solid #ddd !important; padding: 8px !important; color: #000 !important; }
          thead th { background-color: #f3f4f6 !important; font-weight: bold !important; }
          .status-badge { border: 1px solid #000 !important; background: none !important; color: #000 !important; }
          /* Hide print header on screen, show on print */
          .print-header { display: flex !important; }
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
                <Trophy size={16} className="mr-2" /> Resultados
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
                <Users size={16} className="mr-2" /> Inscritos
            </button>
            <button
                onClick={() => {
                    setReportType('student_list');
                    setSortBy('name');
                }}
                className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    reportType === 'student_list' ? 'bg-white text-red-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                }`}
            >
                <List size={16} className="mr-2" /> Relação Nominal
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
                <ClipboardCheck size={16} className="mr-2" /> Aprovação
            </button>
            <button
                onClick={() => {
                    setReportType('passed_list');
                    setSortBy('name');
                }}
                className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-all ${
                    reportType === 'passed_list' ? 'bg-white text-red-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                }`}
            >
                <Award size={16} className="mr-2" /> Aprovados
            </button>
         </div>
         <button 
            onClick={handlePrint}
            className="flex items-center bg-gray-800 text-white px-4 py-2 rounded-md hover:bg-gray-900 transition-colors text-sm whitespace-nowrap shadow-lg"
         >
            <Printer size={16} className="mr-2" /> Imprimir
         </button>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-lg shadow-md no-print border border-gray-100">
        <h2 className="text-lg font-bold mb-4 flex items-center text-gray-800">
           <Filter className="mr-2" size={20} /> Filtros de Relatório
        </h2>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
             <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Exame {isExamSelectionRequired && '*'}</label>
                <select 
                    className={`w-full border rounded-md p-2 text-sm focus:ring-2 focus:ring-red-500 outline-none ${isExamSelectionRequired && !filterExam ? 'border-red-300 bg-red-50' : 'border-gray-300'}`}
                    value={filterExam}
                    onChange={e => setFilterExam(e.target.value)}
                >
                    <option value="">{isExamSelectionRequired ? 'Selecione um Exame...' : 'Todos os Exames'}</option>
                    {data.exams.map(e => (
                        <option key={e.id} value={e.id}>
                            {formatDate(e.date)} - {e.time} - {e.location}
                        </option>
                    ))}
                </select>
             </div>
             <div>
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Faixa Pretendida</label>
                <select 
                    className="w-full border border-gray-300 rounded-md p-2 text-sm focus:ring-2 focus:ring-red-500 outline-none"
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
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1">Sensei</label>
                <select 
                    className="w-full border border-gray-300 rounded-md p-2 text-sm focus:ring-2 focus:ring-red-500 outline-none"
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
                <label className="block text-xs font-semibold text-gray-500 uppercase mb-1 flex items-center">
                    <ArrowUpDown size={12} className="mr-1"/> Ordenação
                </label>
                <select 
                    className="w-full border border-gray-300 rounded-md p-2 text-sm bg-gray-50 font-medium focus:ring-2 focus:ring-red-500 outline-none"
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
      <div id="report-content" className="bg-white rounded-xl shadow-lg overflow-hidden min-h-[500px] border border-gray-200">
        
        {/* Formal Header for Print (Hidden on Screen) */}
        <div className="print-header hidden flex-col items-center justify-center p-8 border-b-2 border-red-900 mb-2">
             <div className="flex items-center gap-4 mb-2">
                <KarateLogo size={64} className="text-red-900" />
                <div className="text-center">
                    <h1 className="text-4xl font-extrabold text-red-900 tracking-wider uppercase leading-none">KarateAdmin</h1>
                    <p className="text-gray-600 text-xs tracking-[0.3em] uppercase mt-1">Gestão de Dojos & Exames</p>
                </div>
             </div>
        </div>

        {/* Header for View/Screen */}
        <div className="px-8 py-6 border-b border-gray-200 bg-gray-50 print:bg-white print:border-none print:px-0 print:py-2">
             <div className="flex justify-between items-start">
                 <div>
                     <h3 className="text-2xl font-bold text-gray-900 flex items-center uppercase tracking-wide">
                         {reportType === 'results' && 'Boletim de Resultados'}
                         {reportType === 'exam_list' && 'Lista de Inscritos'}
                         {reportType === 'student_list' && 'Relação Nominal de Alunos'}
                         {reportType === 'approval_list' && 'Lista de Aprovação'}
                         {reportType === 'passed_list' && 'Relatório de Aprovados'}
                     </h3>
                     {selectedExamDetails ? (
                         <div className="mt-2 text-red-800 print:text-gray-800">
                             <p className="font-semibold text-lg flex items-center gap-2">
                                 <span>{formatDate(selectedExamDetails.date)}</span>
                                 <span className="text-gray-300">•</span>
                                 <span>{selectedExamDetails.time}</span>
                                 <span className="text-gray-300">•</span>
                                 <span>{selectedExamDetails.location}</span>
                             </p>
                         </div>
                     ) : (
                         <p className="mt-2 text-gray-500 text-sm print:text-gray-800">Relatório Geral Consolidado</p>
                     )}
                 </div>
                 <div className="text-right print:hidden">
                     <p className="text-xs text-gray-400">Data de Geração</p>
                     <p className="text-sm font-medium text-gray-700">{new Date().toLocaleDateString()}</p>
                     <p className="mt-2 text-sm font-bold bg-gray-200 px-3 py-1 rounded-full inline-block text-gray-700">
                        Registros: {sortedData.length}
                     </p>
                 </div>
             </div>
        </div>

        {/* Content Warning for Exam specific reports */}
        {isExamSelectionRequired && !filterExam && (
             <div className="p-12 text-center flex flex-col items-center justify-center text-gray-500 bg-gray-50">
                 <div className="bg-white p-4 rounded-full shadow-sm mb-4">
                    <Filter size={48} className="text-red-200" />
                 </div>
                 <h3 className="text-xl font-bold text-gray-700">Selecione um Exame</h3>
                 <p className="text-gray-500 mt-2">Utilize os filtros acima para selecionar o exame que deseja visualizar.</p>
             </div>
        )}

        {/* Table View */}
        {(reportType === 'results' || reportType === 'passed_list' || (isExamSelectionRequired && filterExam)) && (
            <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-red-900 text-white print:bg-gray-100 print:text-black">
                        <tr>
                            {/* Common Columns */}
                            <th className="px-4 py-4 text-left text-xs font-bold uppercase tracking-wider">Aluno</th>
                            <th className="px-4 py-4 text-left text-xs font-bold uppercase tracking-wider">Sensei</th>
                            <th className="px-4 py-4 text-center text-xs font-bold uppercase tracking-wider">Faixa Atual</th>
                            <th className="px-4 py-4 text-center text-xs font-bold uppercase tracking-wider">Faixa Pretendida</th>
                            
                            {/* Passed List Specific */}
                            {reportType === 'passed_list' && (
                                <th className="px-4 py-4 text-center text-xs font-bold uppercase tracking-wider">Data Exame</th>
                            )}

                            {/* Results Specific */}
                            {reportType === 'results' && (
                                <>
                                    <th className="px-4 py-4 text-center text-xs font-bold uppercase tracking-wider">Média</th>
                                    <th className="px-4 py-4 text-center text-xs font-bold uppercase tracking-wider">Situação</th>
                                </>
                            )}

                            {/* Approval List Specific */}
                            {reportType === 'approval_list' && (
                                <th className="px-4 py-4 text-center text-xs font-bold uppercase tracking-wider">Situação</th>
                            )}
                            
                            {/* Exam List Specific (Empty cols for printing) */}
                            {reportType === 'exam_list' && (
                                <>
                                    <th className="px-4 py-4 text-center text-xs font-bold uppercase tracking-wider border-l border-red-800 print:border-gray-400">Pgto</th>
                                    <th className="px-4 py-4 text-center text-xs font-bold uppercase tracking-wider border-l border-red-800 print:border-gray-400">Presença</th>
                                </>
                            )}
                        </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                        {sortedData.map((row, idx) => (
                            <tr key={idx} className="hover:bg-red-50 transition-colors group print:hover:bg-transparent">
                                <td className="px-4 py-3 whitespace-nowrap border-b border-gray-100 print:border-gray-300">
                                    <div className="text-sm font-bold text-gray-900 uppercase">{row.studentName}</div>
                                    {row.studentCpf && <div className="text-xs text-gray-500">{row.studentCpf}</div>}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-sm text-gray-700 border-b border-gray-100 print:border-gray-300">
                                    {row.senseiName}
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-center text-sm text-gray-500 border-b border-gray-100 print:border-gray-300">
                                    <span className="bg-gray-100 text-gray-800 px-2 py-1 rounded text-xs print:bg-transparent print:p-0 print:text-black">
                                        {row.studentRank}
                                    </span>
                                </td>
                                <td className="px-4 py-3 whitespace-nowrap text-center text-sm font-bold text-gray-800 border-b border-gray-100 print:border-gray-300">
                                    {row.targetRank}
                                </td>

                                {/* Passed List Columns */}
                                {reportType === 'passed_list' && (
                                    <td className="px-4 py-3 text-center text-sm text-gray-700 border-b border-gray-100 print:border-gray-300">
                                        {formatDate(row.examDate)} <span className="text-xs text-gray-500 ml-1 print:hidden">{row.examTime}</span>
                                    </td>
                                )}

                                {/* Results Columns */}
                                {reportType === 'results' && (
                                    <>
                                        <td className="px-4 py-3 text-center text-sm font-bold text-gray-800 border-b border-gray-100 print:border-gray-300">
                                            {row.average != null ? row.average.toFixed(2) : '-'}
                                        </td>
                                        <td className="px-4 py-3 text-center border-b border-gray-100 print:border-gray-300">
                                            {row.average != null ? (
                                                <span className={`status-badge px-3 py-1 text-xs font-bold rounded-full uppercase tracking-wide shadow-sm ${row.pass ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-red-100 text-red-800 border border-red-200'}`}>
                                                    {row.pass ? 'Aprovado' : 'Reprovado'}
                                                </span>
                                            ) : (
                                                <span className="text-gray-400 text-xs italic">Pendente</span>
                                            )}
                                        </td>
                                    </>
                                )}

                                {/* Approval List Columns */}
                                {reportType === 'approval_list' && (
                                    <td className="px-4 py-3 text-center border-b border-gray-100 print:border-gray-300">
                                        {row.average != null ? (
                                            <span className={`status-badge px-3 py-1 text-xs font-bold rounded-full uppercase tracking-wide shadow-sm ${row.pass ? 'bg-green-100 text-green-800 border border-green-200' : 'bg-red-100 text-red-800 border border-red-200'}`}>
                                                {row.pass ? 'Aprovado' : 'Reprovado'}
                                            </span>
                                        ) : (
                                            <span className="text-gray-400 text-xs italic">Pendente</span>
                                        )}
                                    </td>
                                )}

                                {/* Exam List Checkboxes (Visual only) */}
                                {reportType === 'exam_list' && (
                                    <>
                                        <td className="px-4 py-3 text-center border-l border-gray-100 print:border-gray-300 border-b">
                                            <div className="w-5 h-5 border-2 border-gray-300 rounded mx-auto print:border-black"></div>
                                        </td>
                                        <td className="px-4 py-3 text-center border-l border-gray-100 print:border-gray-300 border-b">
                                            <div className="w-5 h-5 border-2 border-gray-300 rounded mx-auto print:border-black"></div>
                                        </td>
                                    </>
                                )}
                            </tr>
                        ))}
                        {sortedData.length === 0 && (
                            <tr><td colSpan={10} className="p-12 text-center text-gray-500 italic">Nenhum registro encontrado para os filtros selecionados.</td></tr>
                        )}
                    </tbody>
                </table>
            </div>
        )}
      </div>
    </div>
  );
};