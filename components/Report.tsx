import React, { useState, useEffect, useRef } from 'react';
import { createPortal } from 'react-dom';
import { AppData, Rank } from '../types';
import { RANKS } from '../constants';
import { FileText, Filter, ArrowUpDown, Printer, Users, Trophy, ClipboardCheck, List, FileBadge, Download } from 'lucide-react';
import { KarateLogo } from './KarateLogo';
import { ExamSheet } from './ExamSheet';

interface Props {
  data: AppData;
}

type SortOption = 'rank' | 'grade_desc' | 'grade_asc' | 'name';
type ReportType = 'results' | 'exam_list' | 'approval_list' | 'student_list' | 'exam_sheets';

export const Report: React.FC<Props> = ({ data }) => {
  const [reportType, setReportType] = useState<ReportType>('results');
  
  const [filterRank, setFilterRank] = useState<string>('');
  const [filterSensei, setFilterSensei] = useState<string>('');
  const [filterExam, setFilterExam] = useState<string>('');
  const [sortBy, setSortBy] = useState<SortOption>('rank');

  // Print/PDF State
  const [printingSheets, setPrintingSheets] = useState<{
        fullStudent: any;
        fullExam: any;
        registration: any;
        senseiName: string;
  }[] | null>(null);

  // Ref to track print readiness
  const isWaitingForPrintRef = useRef(false);

  // Auto-trigger print once content is rendered
  useEffect(() => {
    if (printingSheets && printingSheets.length > 0 && isWaitingForPrintRef.current) {
        const timer = setTimeout(() => {
            window.print();
            isWaitingForPrintRef.current = false;
            // Optionally clear to close preview automatically
            // setPrintingSheets(null);
        }, 500);
        return () => clearTimeout(timer);
    }
  }, [printingSheets]);


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
          examId: reg.examId,
          // Full objects for ExamSheet
          fullStudent: student,
          fullExam: exam
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

  const handlePrintStandardReport = () => {
    window.print();
  };

  const handleDirectDownloadPDF = () => {
      // Prepare data for sheets
      const sheets = sortedData.map(item => ({
        fullStudent: item.fullStudent,
        fullExam: item.fullExam,
        registration: item,
        senseiName: item.senseiName
      }));
      setPrintingSheets(sheets);
      isWaitingForPrintRef.current = true;
  };
  
  const closePrintPreview = () => {
      setPrintingSheets(null);
      isWaitingForPrintRef.current = false;
  };

  const selectedExamDetails = data.exams.find(e => e.id === filterExam);

  // Helper to determine if exam selection is required
  const isExamSelectionRequired = reportType === 'exam_list' || reportType === 'approval_list' || reportType === 'student_list' || reportType === 'exam_sheets';

  return (
    <div className="space-y-6">
      {/* 
          PRINT PORTAL (Automatic)
      */}
      {printingSheets && createPortal(
        <div id="print-portal-wrapper" className="fixed inset-0 z-[9999] bg-white flex flex-col h-screen w-screen">
            {/* Overlay Message - Hidden on Print */}
            <div className="fixed inset-0 bg-gray-900 bg-opacity-90 flex flex-col items-center justify-center z-[10000] print-hidden">
                 <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mb-4"></div>
                 <h2 className="text-2xl font-bold text-white mb-2">Preparando Documento...</h2>
                 <p className="text-gray-300 mb-6">A janela de impressão abrirá automaticamente.</p>
                 <button 
                    onClick={closePrintPreview}
                    className="px-6 py-2 bg-white text-gray-900 rounded-md font-bold hover:bg-gray-100 transition-colors"
                 >
                    Cancelar / Fechar
                 </button>
            </div>

            <div className="w-full h-full bg-white">
                <style>{`
                    @media print {
                        body > *:not(#print-portal-wrapper) { display: none !important; }
                        
                        #print-portal-wrapper { 
                            display: block !important; 
                            position: absolute;
                            top: 0; left: 0; width: 100%;
                            background: white;
                            margin: 0; padding: 0;
                            overflow: visible !important;
                        }
                        
                        .print-hidden { display: none !important; }
                        
                        @page { 
                            size: A4 landscape; 
                            margin: 0; 
                        }
                        
                        body {
                            background-color: white !important;
                            margin: 0 !important;
                            padding: 0 !important;
                        }

                        .sheet-page {
                            page-break-after: always;
                            break-after: page;
                            width: 297mm;
                            height: 210mm;
                            overflow: hidden;
                            margin: 0 !important;
                            padding: 5mm !important;
                            box-sizing: border-box;
                            display: block;
                        }
                        .sheet-page:last-child { 
                            page-break-after: avoid; 
                            break-after: avoid; 
                        }
                    }
                `}</style>
                
                {/* Sheets Container */}
                <div className="mx-auto w-fit">
                    {printingSheets.map((item, index) => (
                        <div key={index} className="sheet-page bg-white shadow-none mb-0" style={{ width: '297mm', height: '210mm' }}>
                            {item.fullStudent && item.fullExam && (
                                <ExamSheet 
                                    student={item.fullStudent} 
                                    exam={item.fullExam} 
                                    registration={item.registration}
                                    senseiName={item.senseiName}
                                />
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </div>,
        document.body
      )}

      {/* 
          STANDARD REPORT PRINT CSS
          This handles the 'Print Report' button for tables (not sheets).
      */}
      <style>{`
        @media print {
          /* General resets for standard reports */
          @page { 
             /* Only if NOT in preview mode (which overrides this) */
             margin: 10mm;
             size: A4 landscape;
          }
          
          body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          
          /* Hide main UI if we are printing a standard report directly from the main view */
          body > *:not(#root) { display: none; } /* Just a fallback */
          
          .no-print { display: none !important; }
          
          /* Ensure the report content block is visible */
          #report-content, #report-content * {
            visibility: visible;
          }
          
          #report-content {
            position: absolute;
            left: 0; top: 0; width: 100%;
            margin: 0; padding: 0;
            background: white;
            border: none !important;
            box-shadow: none !important;
          }

          /* Show formal header for standard reports */
          .print-header { display: flex !important; }
          .report-view-header { display: none !important; }

          /* Table Styling */
          table { width: 100% !important; border-collapse: collapse !important; }
          th, td { border: 1px solid #000 !important; padding: 4px 8px !important; color: black !important; font-size: 10pt; }
          thead th { background-color: #eee !important; font-weight: bold !important; }
          .status-badge { border: 1px solid #000 !important; background: none !important; color: #000 !important; }
        }
      `}</style>

      {/* Tabs / Header */}
      <div className="flex flex-col xl:flex-row justify-between items-center bg-white p-4 rounded-lg shadow-sm no-print gap-4 print:hidden">
         <div className="flex flex-wrap gap-2 bg-gray-100 p-1 rounded-lg w-full xl:w-auto overflow-x-auto">
            <button
                onClick={() => setReportType('results')}
                className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${
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
                className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${
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
                className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${
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
                className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${
                    reportType === 'approval_list' ? 'bg-white text-red-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                }`}
            >
                <ClipboardCheck size={16} className="mr-2" /> Aprovação
            </button>
            <button
                onClick={() => {
                    setReportType('exam_sheets');
                    setSortBy('name');
                }}
                className={`flex items-center px-4 py-2 rounded-md text-sm font-medium transition-all whitespace-nowrap ${
                    reportType === 'exam_sheets' ? 'bg-white text-red-700 shadow-sm' : 'text-gray-600 hover:text-gray-900'
                }`}
            >
                <FileBadge size={16} className="mr-2" /> Fichas
            </button>
         </div>
         
         <div className="flex items-center gap-2 flex-wrap">
             {reportType === 'exam_sheets' ? (
                 <button 
                    onClick={handleDirectDownloadPDF}
                    disabled={!filterExam || sortedData.length === 0}
                    className="flex items-center bg-red-600 text-white px-6 py-2 rounded-md hover:bg-red-700 transition-colors text-sm whitespace-nowrap shadow-md disabled:opacity-50 font-bold"
                 >
                    <Download size={18} className="mr-2" /> Baixar Fichas (PDF)
                 </button>
             ) : (
                 <button 
                    onClick={handlePrintStandardReport}
                    className="flex items-center bg-gray-800 text-white px-4 py-2 rounded-md hover:bg-gray-900 transition-colors text-sm whitespace-nowrap shadow-lg"
                 >
                    <Printer size={16} className="mr-2" /> Imprimir Relatório
                 </button>
             )}
         </div>
      </div>

      {/* Filters */}
      <div className="bg-white p-6 rounded-lg shadow-md no-print border border-gray-100 print:hidden">
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

      {/* Screen Report Content Area */}
      <div id="report-content" className={`bg-white rounded-xl shadow-lg overflow-hidden min-h-[500px] border border-gray-200 ${reportType === 'exam_sheets' ? 'p-0 shadow-none border-none bg-gray-100' : ''} print:hidden`}>
        
        {/* Formal Header for Print (Hidden on Screen) */}
        <div className="print-header hidden flex-col items-center justify-center p-8 border-b-2 border-red-900 mb-2">
             <div className="flex items-center gap-4 mb-2">
                <KarateLogo size={64} className="text-red-900" />
                <div className="text-center">
                    <h1 className="text-4xl font-extrabold text-red-900 tracking-wider uppercase leading-none">KarateAdmin</h1>
                    <p className="text-gray-600 text-xs tracking-[0.3em] uppercase mt-1">Gestão de Dojos & Exames</p>
                </div>
             </div>
             <div className="text-center mt-2 w-full">
                <h2 className="text-xl font-bold uppercase border-t border-b border-gray-300 py-1">
                     {reportType === 'results' && 'Boletim de Resultados'}
                     {reportType === 'exam_list' && 'Lista de Inscritos'}
                     {reportType === 'student_list' && 'Relação Nominal'}
                     {reportType === 'approval_list' && 'Lista de Aprovação'}
                </h2>
                {selectedExamDetails && (
                    <p className="mt-1 font-semibold">
                        {formatDate(selectedExamDetails.date)} - {selectedExamDetails.location}
                    </p>
                )}
             </div>
        </div>

        {/* Header for View/Screen */}
        <div className="report-view-header px-8 py-6 border-b border-gray-200 bg-gray-50 print:bg-white print:border-none print:px-0 print:py-2">
             <div className="flex justify-between items-start">
                 <div>
                     <h3 className="text-2xl font-bold text-gray-900 flex items-center uppercase tracking-wide">
                         {reportType === 'results' && 'Boletim de Resultados'}
                         {reportType === 'exam_list' && 'Lista de Inscritos'}
                         {reportType === 'student_list' && 'Relação Nominal de Alunos'}
                         {reportType === 'approval_list' && 'Lista de Aprovação'}
                         {reportType === 'exam_sheets' && 'Fichas de Exame'}
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

        {/* EXAM SHEETS SCREEN PREVIEW - Inline for Reports */}
        {reportType === 'exam_sheets' && filterExam && (
             <div className="bg-gray-100 p-8 overflow-auto">
                 <div className="max-w-fit mx-auto space-y-8">
                     {sortedData.map((item) => (
                         <div key={item.id} className="bg-white shadow-xl exam-sheet-page-preview">
                             <style>{`
                                .exam-sheet-page-preview {
                                    width: 297mm; 
                                    height: 210mm;
                                    margin: 0 auto 2rem auto;
                                    background-color: white;
                                    display: block; 
                                    overflow: hidden;
                                    box-sizing: border-box; 
                                    padding: 5mm;
                                }
                             `}</style>
                             {item.fullStudent && item.fullExam && (
                                 <ExamSheet 
                                    student={item.fullStudent} 
                                    exam={item.fullExam} 
                                    registration={item}
                                    senseiName={item.senseiName}
                                 />
                             )}
                         </div>
                     ))}
                     {sortedData.length === 0 && (
                         <div className="p-12 text-center text-gray-500 italic">Nenhum registro encontrado para gerar fichas.</div>
                     )}
                 </div>
             </div>
        )}

        {/* Table View (Other Reports) */}
        {reportType !== 'exam_sheets' && (reportType === 'results' || (isExamSelectionRequired && filterExam)) && (
            <>
                {/* Desktop Table */}
                <div className="hidden md:block overflow-x-auto">
                    <table className="min-w-full divide-y divide-gray-200">
                        <thead className="bg-red-900 text-white print:bg-gray-100 print:text-black">
                            <tr>
                                {/* Common Columns */}
                                <th className="px-4 py-4 text-left text-xs font-bold uppercase tracking-wider">Aluno</th>
                                <th className="px-4 py-4 text-left text-xs font-bold uppercase tracking-wider">Sensei</th>
                                <th className="px-4 py-4 text-center text-xs font-bold uppercase tracking-wider">Faixa Atual</th>
                                <th className="px-4 py-4 text-center text-xs font-bold uppercase tracking-wider">Faixa Pretendida</th>
                                
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

                {/* Mobile Card List */}
                <div className="md:hidden space-y-4 p-4 bg-gray-50 print:hidden">
                    {sortedData.map((row, idx) => (
                        <div key={idx} className="bg-white border border-gray-200 rounded-lg shadow-sm p-4 relative overflow-hidden">
                            {/* Stripe for status or decoration */}
                            <div className={`absolute left-0 top-0 bottom-0 w-1 ${
                                reportType === 'results' || reportType === 'approval_list' 
                                    ? (row.pass ? 'bg-green-500' : (row.average != null ? 'bg-red-500' : 'bg-gray-300'))
                                    : 'bg-red-800'
                            }`}></div>
                            
                            <div className="pl-3">
                                <div className="flex justify-between items-start mb-2">
                                    <div>
                                        <h4 className="font-bold text-gray-900 text-sm uppercase">{row.studentName}</h4>
                                        <p className="text-xs text-gray-500">{row.studentCpf || 'Sem CPF'}</p>
                                    </div>
                                    {(reportType === 'results' || reportType === 'approval_list') && (
                                        row.average != null ? (
                                            <span className={`px-2 py-0.5 text-[10px] font-bold rounded uppercase ${
                                                row.pass ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'
                                            }`}>
                                                {row.pass ? 'Aprovado' : 'Reprovado'}
                                            </span>
                                        ) : (
                                            <span className="px-2 py-0.5 bg-gray-100 text-gray-500 text-[10px] rounded uppercase">Pendente</span>
                                        )
                                    )}
                                </div>
                                
                                <div className="grid grid-cols-2 gap-y-2 gap-x-4 text-xs mt-3">
                                    <div>
                                        <span className="text-gray-400 uppercase block text-[10px]">Sensei</span>
                                        <span className="font-medium text-gray-700">{row.senseiName}</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-400 uppercase block text-[10px]">Faixa Atual</span>
                                        <span className="font-medium text-gray-700">{row.studentRank}</span>
                                    </div>
                                    <div>
                                        <span className="text-gray-400 uppercase block text-[10px]">Faixa Pretendida</span>
                                        <span className="font-bold text-red-700">{row.targetRank}</span>
                                    </div>
                                    
                                    {reportType === 'results' && (
                                        <div>
                                            <span className="text-gray-400 uppercase block text-[10px]">Média</span>
                                            <span className={`font-bold text-sm ${row.average != null && row.average >= 6 ? 'text-green-600' : 'text-gray-800'}`}>
                                                {row.average != null ? row.average.toFixed(2) : '-'}
                                            </span>
                                        </div>
                                    )}
                                </div>

                                {reportType === 'exam_list' && (
                                    <div className="mt-3 pt-3 border-t border-gray-100 flex gap-4">
                                         <div className="flex items-center gap-2">
                                             <div className="w-4 h-4 border border-gray-300 rounded bg-white"></div>
                                             <span className="text-xs text-gray-500">Pagamento</span>
                                         </div>
                                         <div className="flex items-center gap-2">
                                             <div className="w-4 h-4 border border-gray-300 rounded bg-white"></div>
                                             <span className="text-xs text-gray-500">Presença</span>
                                         </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    ))}
                    {sortedData.length === 0 && (
                        <div className="text-center text-gray-500 italic py-8">Nenhum registro encontrado.</div>
                    )}
                </div>
            </>
        )}
      </div>
    </div>
  );
};