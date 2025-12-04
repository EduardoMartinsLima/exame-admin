import React, { useState, useEffect } from 'react';
import { Exam, Student, ExamRegistration, Rank, Sensei } from '../types';
import { storageService } from '../services/storageService';
import { RANKS } from '../constants';
import { Calendar, MapPin, Clock, Users, Plus, Trash2, ChevronRight, CheckCircle, X, Check, Pencil, ArrowUpDown, CheckSquare, FileText, FileDown } from 'lucide-react';
import { ExamSheet } from './ExamSheet';

interface Props {
  exams: Exam[];
  students: Student[];
  registrations: ExamRegistration[];
  senseis: Sensei[];
  onUpdate: () => void;
}

type SortKey = 'name' | 'currentRank' | 'targetRank';

export const ExamManager: React.FC<Props> = ({ exams, students, registrations, senseis, onUpdate }) => {
  const [form, setForm] = useState({
    date: '',
    time: '',
    location: ''
  });

  const [selectedExamId, setSelectedExamId] = useState<string | null>(null);
  const [editingExamId, setEditingExamId] = useState<string | null>(null);
  
  const [selectedStudentId, setSelectedStudentId] = useState<string>('');
  const [targetRank, setTargetRank] = useState<Rank>('Amarela');
  const [isSubmitting, setIsSubmitting] = useState(false);
  
  // State for inline delete confirmation
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Sorting State
  const [sortConfig, setSortConfig] = useState<{ key: SortKey; direction: 'asc' | 'desc' }>({ key: 'name', direction: 'asc' });

  // Single PDF Generation State
  const [pdfTarget, setPdfTarget] = useState<{
      student: Student;
      registration: ExamRegistration;
      exam: Exam;
      senseiName: string;
  } | null>(null);

  // Batch PDF Generation State
  const [pdfBatchTarget, setPdfBatchTarget] = useState<{
      items: Array<{
          student: Student;
          registration: ExamRegistration;
          exam: Exam;
          senseiName: string;
      }>
  } | null>(null);

  // Effect for Single PDF
  useEffect(() => {
    if (pdfTarget) {
        // Allow DOM to render the hidden sheet
        setTimeout(() => {
            generatePDF();
        }, 500);
    }
  }, [pdfTarget]);

  // Effect for Batch PDF
  useEffect(() => {
    if (pdfBatchTarget) {
        setTimeout(() => {
            generateBatchPDF();
        }, 1000); // Give a bit more time for list rendering
    }
  }, [pdfBatchTarget]);

  const generatePDF = async () => {
    if (!pdfTarget) return;

    const element = document.getElementById('hidden-exam-sheet-content');
    if (!element) return;

    const html2pdf = (window as any).html2pdf;
    if (!html2pdf) {
        alert('Biblioteca de PDF não carregada.');
        setPdfTarget(null);
        return;
    }

    const opt = {
      margin: 0,
      filename: `ficha_${pdfTarget.student.name.replace(/\s+/g, '_')}_${pdfTarget.exam.date}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, letterRendering: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
    };

    try {
        await html2pdf().set(opt).from(element).save();
    } catch (err) {
        console.error(err);
        alert('Erro ao gerar PDF');
    } finally {
        setPdfTarget(null);
    }
  };

  const generateBatchPDF = async () => {
    if (!pdfBatchTarget || !currentExam) return;

    const element = document.getElementById('hidden-batch-sheet-content');
    if (!element) return;

    const html2pdf = (window as any).html2pdf;
    if (!html2pdf) {
        alert('Biblioteca de PDF não carregada.');
        setPdfBatchTarget(null);
        return;
    }

    const opt = {
      margin: 0,
      filename: `fichas_exame_${currentExam.date}_completo.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, letterRendering: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'landscape' }
    };

    try {
        await html2pdf().set(opt).from(element).save();
    } catch (err) {
        console.error(err);
        alert('Erro ao gerar PDF em lote');
    } finally {
        setPdfBatchTarget(null);
    }
  };

  const handleDownloadPDF = (reg: ExamRegistration) => {
      const student = students.find(s => s.id === reg.studentId);
      const exam = exams.find(e => e.id === reg.examId);
      if (!student || !exam) return;

      const sensei = senseis.find(s => s.id === student.senseiId);
      
      setPdfTarget({
          student,
          registration: reg,
          exam,
          senseiName: sensei?.name || '-'
      });
  };

  const handleDownloadAllPDF = () => {
    if (!selectedExamId || !currentExam) return;
    
    // Use sortedRegistrations to maintain the order seen in the table
    const items = sortedRegistrations.map(reg => {
        const student = students.find(s => s.id === reg.studentId);
        if (!student) return null;
        const sensei = senseis.find(s => s.id === student.senseiId);
        return {
            student,
            registration: reg,
            exam: currentExam,
            senseiName: sensei?.name || '-'
        };
    }).filter((item): item is NonNullable<typeof item> => item !== null);

    if (items.length === 0) {
        alert("Nenhum aluno vinculado para gerar fichas.");
        return;
    }

    if (!window.confirm(`Deseja gerar um PDF com as fichas de todos os ${items.length} alunos listados?`)) {
        return;
    }

    setPdfBatchTarget({ items });
  };

  // Helper to format date avoiding timezone issues
  const formatDate = (dateString: string) => {
    if (!dateString) return '';
    const [year, month, day] = dateString.split('-').map(Number);
    // Create date treating the input as local time (month is 0-indexed)
    return new Date(year, month - 1, day).toLocaleDateString();
  };

  const getInitials = (name: string) => {
    return name
        .split(' ')
        .map(n => n[0])
        .slice(0, 2)
        .join('')
        .toUpperCase();
  };

  const getRankBadgeStyle = (rank: string) => {
    const r = rank.toLowerCase();
    if (r.includes('branca')) return 'bg-gray-100 text-gray-800 border-gray-200';
    if (r.includes('amarela')) return 'bg-yellow-100 text-yellow-800 border-yellow-200';
    if (r.includes('vermelha')) return 'bg-red-100 text-red-800 border-red-200';
    if (r.includes('laranja')) return 'bg-orange-100 text-orange-800 border-orange-200';
    if (r.includes('verde')) return 'bg-green-100 text-green-800 border-green-200';
    if (r.includes('roxa')) return 'bg-purple-100 text-purple-800 border-purple-200';
    if (r.includes('marrom')) return 'bg-amber-900 text-amber-100 border-amber-800';
    if (r.includes('preta')) return 'bg-gray-900 text-white border-gray-700';
    return 'bg-blue-100 text-blue-800 border-blue-200';
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!form.date || !form.location) return;

    setIsSubmitting(true);
    let error;

    if (editingExamId) {
        const { error: updateError } = await storageService.updateExam(editingExamId, {
            date: form.date,
            time: form.time,
            location: form.location
        });
        error = updateError;
        if (!error) setEditingExamId(null);
    } else {
        const newExam: Exam = {
          id: storageService.generateId(),
          date: form.date,
          time: form.time,
          location: form.location
        };
        const { error: addError } = await storageService.addExam(newExam);
        error = addError;
        if (!error) setSelectedExamId(newExam.id); // Auto-select the new exam
    }

    setIsSubmitting(false);

    if (error) {
        alert('Erro ao salvar exame. Tente novamente.');
    } else {
        setForm({ date: '', time: '', location: '' });
        onUpdate();
    }
  };

  const handleEdit = (exam: Exam) => {
      setEditingExamId(exam.id);
      setForm({
          date: exam.date,
          time: exam.time,
          location: exam.location
      });
      // On mobile, scroll up to the form so the user sees it populated
      if (window.innerWidth < 1024) {
          window.scrollTo({ top: 0, behavior: 'smooth' });
      }
  };

  const handleCancelEdit = () => {
      setEditingExamId(null);
      setForm({ date: '', time: '', location: '' });
  };

  const handleAddParticipant = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedExamId || !selectedStudentId) return;

    setIsSubmitting(true);
    const registration: ExamRegistration = {
      id: storageService.generateId(),
      examId: selectedExamId,
      studentId: selectedStudentId,
      targetRank: targetRank,
      present: false
    };

    const { error } = await storageService.registerStudentToExam(registration);
    
    setSelectedStudentId('');
    setIsSubmitting(false);

    if (error) {
        alert('Erro ao vincular aluno.');
    } else {
        onUpdate();
    }
  };

  const confirmDelete = async (regId: string) => {
    await storageService.removeRegistration(regId);
    setDeletingId(null);
    onUpdate();
  };

  const handleTogglePresence = async (regId: string, currentStatus: boolean | undefined) => {
    // Optimistic toggle could be implemented, but simple wait is safer
    await storageService.updateResult(regId, { present: !currentStatus });
    onUpdate();
  };

  const handleMarkAllPresent = async () => {
    if (!selectedExamId) return;
    
    // Filter registrations for this exam that aren't already marked present
    const regsToUpdate = registrations.filter(r => r.examId === selectedExamId && !r.present);

    if (regsToUpdate.length === 0) return;

    if (!window.confirm(`Marcar presença para todos os ${regsToUpdate.length} alunos pendentes?`)) {
        return;
    }

    setIsSubmitting(true);
    
    try {
        const updates = regsToUpdate.map(reg => 
            storageService.updateResult(reg.id, { present: true })
        );
        
        await Promise.all(updates);
        onUpdate();
    } catch (error) {
        console.error("Error updating presence:", error);
        alert("Erro ao atualizar presenças.");
    } finally {
        setIsSubmitting(false);
    }
  };

  const handleStudentSelect = (studentId: string) => {
    setSelectedStudentId(studentId);
    if (!studentId) return;

    // Auto-suggest next rank
    const student = students.find(s => s.id === studentId);
    if (student) {
      const currentIdx = RANKS.indexOf(student.currentRank);
      if (currentIdx < RANKS.length - 1) {
        setTargetRank(RANKS[currentIdx + 1]);
      } else {
        setTargetRank(student.currentRank);
      }
    }
  };

  const handleSort = (key: SortKey) => {
    setSortConfig(current => ({
        key,
        direction: current.key === key && current.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  // Logic for selected exam
  const currentExam = exams.find(e => e.id === selectedExamId);
  const currentRegistrations = registrations.filter(r => r.examId === selectedExamId);
  
  // Available students (not yet registered for this exam)
  const availableStudents = students.filter(s => 
    !currentRegistrations.some(r => r.studentId === s.id)
  );

  // Sorting Logic
  const sortedRegistrations = [...currentRegistrations].sort((a, b) => {
      const studentA = students.find(s => s.id === a.studentId);
      const studentB = students.find(s => s.id === b.studentId);
      
      const nameA = studentA?.name || '';
      const nameB = studentB?.name || '';
      const rankAIdx = RANKS.indexOf(studentA?.currentRank || 'Branca');
      const rankBIdx = RANKS.indexOf(studentB?.currentRank || 'Branca');
      const targetAIdx = RANKS.indexOf(a.targetRank);
      const targetBIdx = RANKS.indexOf(b.targetRank);

      let comparison = 0;
      if (sortConfig.key === 'name') {
          comparison = nameA.localeCompare(nameB);
      } else if (sortConfig.key === 'currentRank') {
          comparison = rankAIdx - rankBIdx;
      } else if (sortConfig.key === 'targetRank') {
          comparison = targetAIdx - targetBIdx;
      }

      return sortConfig.direction === 'asc' ? comparison : -comparison;
  });

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-[calc(100vh-8rem)]">
      {/* Styles for PDF Generation */}
      <style>{`
         .exam-sheet-page {
             width: 297mm; 
             height: 210mm;
             margin: 0;
             background-color: white;
             display: block; 
             overflow: hidden;
             box-sizing: border-box; 
             padding: 5mm; 
        }
      `}</style>

      {/* Hidden container for PDF generation */}
      <div id="hidden-exam-sheet" className="fixed top-0 left-0 -z-50 invisible">
        {/* Single Sheet */}
        {pdfTarget && (
            <div id="hidden-exam-sheet-content" className="exam-sheet-page">
                <ExamSheet 
                    student={pdfTarget.student}
                    exam={pdfTarget.exam}
                    registration={pdfTarget.registration}
                    senseiName={pdfTarget.senseiName}
                />
            </div>
        )}
        
        {/* Batch Sheets */}
        {pdfBatchTarget && (
            <div id="hidden-batch-sheet-content">
                {pdfBatchTarget.items.map((item, index) => (
                    <div key={index} className="exam-sheet-page" style={{ pageBreakAfter: 'always' }}>
                        <ExamSheet 
                            student={item.student}
                            exam={item.exam}
                            registration={item.registration}
                            senseiName={item.senseiName}
                        />
                    </div>
                ))}
            </div>
        )}
      </div>

      {/* Left Column: Create/Edit & List */}
      <div className="lg:col-span-1 flex flex-col gap-6 overflow-hidden min-h-0">
        
        {/* Create/Edit Exam Form */}
        <div className="p-5 bg-white rounded-lg shadow-sm border border-gray-200 flex-shrink-0">
          <div className="flex justify-between items-center mb-4">
              <h2 className="text-lg font-bold text-gray-800 flex items-center">
                <Calendar className="mr-2" size={20} /> {editingExamId ? 'Editar Exame' : 'Novo Exame'}
              </h2>
              {editingExamId && (
                  <button onClick={handleCancelEdit} className="text-xs text-red-600 hover:text-red-800 underline">
                      Cancelar
                  </button>
              )}
          </div>
          <form onSubmit={handleSubmit} className="space-y-3">
            <div>
              <label className="block text-xs font-semibold text-gray-600 uppercase">Data</label>
              <input
                type="date"
                required
                value={form.date}
                onChange={e => setForm({...form, date: e.target.value})}
                className="mt-1 w-full border border-gray-300 rounded-md p-2 text-sm"
                disabled={isSubmitting}
              />
            </div>
            <div className="flex gap-3">
                <div className="flex-1">
                    <label className="block text-xs font-semibold text-gray-600 uppercase">Horário</label>
                    <input
                        type="time"
                        required
                        value={form.time}
                        onChange={e => setForm({...form, time: e.target.value})}
                        className="mt-1 w-full border border-gray-300 rounded-md p-2 text-sm"
                        disabled={isSubmitting}
                    />
                </div>
                <div className="flex-1">
                    <label className="block text-xs font-semibold text-gray-600 uppercase">Local</label>
                    <input
                        type="text"
                        required
                        placeholder="Dojo"
                        value={form.location}
                        onChange={e => setForm({...form, location: e.target.value})}
                        className="mt-1 w-full border border-gray-300 rounded-md p-2 text-sm"
                        disabled={isSubmitting}
                    />
                </div>
            </div>
            <button 
                type="submit" 
                className={`w-full text-white py-2 rounded-md font-medium text-sm transition-colors disabled:opacity-50 ${editingExamId ? 'bg-orange-600 hover:bg-orange-700' : 'bg-red-600 hover:bg-red-700'}`}
                disabled={isSubmitting}
            >
              {editingExamId ? 'Atualizar Exame' : 'Agendar Exame'}
            </button>
          </form>
        </div>

        {/* Exam List */}
        <div className="flex-1 bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col overflow-hidden min-h-0">
          <h3 className="p-4 bg-gray-50 border-b font-semibold text-gray-700 flex-shrink-0">Selecione um Exame</h3>
          <div className="overflow-y-auto flex-1 p-2 space-y-2">
            {exams.length === 0 ? (
                <p className="p-4 text-center text-gray-400 text-sm">Nenhum exame cadastrado.</p>
            ) : (
                exams.map(exam => {
                    const count = registrations.filter(r => r.examId === exam.id).length;
                    const isSelected = selectedExamId === exam.id;
                    const isEditing = editingExamId === exam.id;
                    return (
                        <div 
                            key={exam.id} 
                            onClick={() => setSelectedExamId(exam.id)}
                            className={`p-3 rounded-md cursor-pointer border transition-all relative group ${
                                isSelected 
                                ? 'bg-red-50 border-red-200 shadow-sm ring-1 ring-red-200' 
                                : 'bg-white border-gray-100 hover:border-gray-300 hover:bg-gray-50'
                            }`}
                        >
                            <div className="flex justify-between items-start">
                                <div>
                                    <div className={`font-medium text-sm ${isSelected ? 'text-red-900' : 'text-gray-900'}`}>
                                        {formatDate(exam.date)}
                                    </div>
                                    <div className="text-xs text-gray-500 mt-1 flex items-center">
                                        <Clock size={12} className="mr-1"/> {exam.time}
                                        <span className="mx-2">•</span>
                                        <MapPin size={12} className="mr-1"/> {exam.location}
                                    </div>
                                </div>
                                <div className="flex items-center gap-2">
                                     <button 
                                        onClick={(e) => { e.stopPropagation(); handleEdit(exam); }}
                                        className={`p-2 rounded-full transition-colors ${
                                            isEditing 
                                            ? 'text-white bg-orange-500 hover:bg-orange-600 shadow-sm' 
                                            : 'text-gray-400 hover:text-blue-600 hover:bg-blue-50'
                                        }`}
                                        title="Editar Exame"
                                     >
                                         <Pencil size={16} />
                                     </button>
                                     {isSelected && <ChevronRight size={16} className="text-red-500" />}
                                </div>
                            </div>
                            <div className="mt-2 flex items-center text-xs text-gray-500">
                                <Users size={12} className="mr-1" />
                                {count} Participantes
                            </div>
                        </div>
                    );
                })
            )}
          </div>
        </div>
      </div>

      {/* Right Column: Manage Participants */}
      <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-gray-200 flex flex-col overflow-hidden min-h-0">
        {selectedExamId && currentExam ? (
            <>
                <div className="p-5 border-b bg-gray-50 flex justify-between items-center flex-shrink-0">
                    <div>
                        <h2 className="text-xl font-bold text-gray-800 flex items-center">
                            Gerenciar Participantes
                        </h2>
                        <p className="text-sm text-gray-600 mt-1">
                            {formatDate(currentExam.date)} em {currentExam.location}
                        </p>
                    </div>
                    <div className="flex items-center gap-3">
                        <button
                            onClick={handleDownloadAllPDF}
                            disabled={isSubmitting || currentRegistrations.length === 0}
                            className="flex items-center text-xs font-medium text-green-700 hover:text-green-900 hover:bg-green-50 px-3 py-1.5 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed border border-green-200"
                            title="Baixar todas as fichas"
                        >
                            <FileDown size={16} className="mr-1.5" />
                            Baixar Fichas
                        </button>

                        <button
                            onClick={handleMarkAllPresent}
                            disabled={isSubmitting || currentRegistrations.length === 0}
                            className="flex items-center text-xs font-medium text-blue-600 hover:text-blue-800 hover:bg-blue-50 px-3 py-1.5 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                            title="Marcar presença para todos os inscritos"
                        >
                            <CheckSquare size={16} className="mr-1.5" />
                            Marcar Todos Presentes
                        </button>
                        <div className="bg-white px-3 py-1 rounded-full border shadow-sm text-sm font-medium text-gray-700">
                            Total: {currentRegistrations.length}
                        </div>
                    </div>
                </div>

                <div className="p-5 overflow-y-auto flex-1 flex flex-col min-h-0">
                    {/* Add Form */}
                    <div className="bg-blue-50 p-4 rounded-lg border border-blue-100 mb-6 flex-shrink-0">
                        <h4 className="text-sm font-bold text-blue-900 mb-3 flex items-center">
                            <Plus size={16} className="mr-2" /> Adicionar Aluno ao Exame
                        </h4>
                        <form onSubmit={handleAddParticipant} className="flex flex-col md:flex-row gap-4 items-end">
                            <div className="flex-1 w-full">
                                <label className="block text-xs font-semibold text-blue-800 mb-1">Aluno</label>
                                <select
                                    className="w-full border border-blue-200 rounded-md p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={selectedStudentId}
                                    onChange={e => handleStudentSelect(e.target.value)}
                                    disabled={isSubmitting}
                                >
                                    <option value="">Selecione o aluno...</option>
                                    {availableStudents.map(s => (
                                        <option key={s.id} value={s.id}>{s.name} (Atual: {s.currentRank})</option>
                                    ))}
                                </select>
                            </div>
                            <div className="w-full md:w-48">
                                <label className="block text-xs font-semibold text-blue-800 mb-1">Faixa Pretendida</label>
                                <select
                                    className="w-full border border-blue-200 rounded-md p-2 text-sm focus:ring-2 focus:ring-blue-500 outline-none"
                                    value={targetRank}
                                    onChange={e => setTargetRank(e.target.value as Rank)}
                                    disabled={isSubmitting}
                                >
                                    {RANKS.map(r => <option key={r} value={r}>{r}</option>)}
                                </select>
                            </div>
                            <button 
                                type="submit" 
                                disabled={!selectedStudentId || isSubmitting}
                                className="w-full md:w-auto bg-blue-600 text-white px-6 py-2 rounded-md hover:bg-blue-700 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed transition-colors shadow-sm"
                            >
                                Vincular
                            </button>
                        </form>
                    </div>

                    {/* Table */}
                    <div className="flex-1 rounded-lg border border-gray-200 overflow-hidden flex flex-col">
                        <div className="overflow-x-auto flex-1">
                            <table className="min-w-full divide-y divide-gray-200">
                                <thead className="bg-gray-50 sticky top-0 z-10">
                                    <tr>
                                        <th 
                                            className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none whitespace-nowrap"
                                            onClick={() => handleSort('name')}
                                        >
                                            <div className="flex items-center">
                                                Aluno
                                                {sortConfig.key === 'name' && (
                                                    <ArrowUpDown size={12} className={`ml-1 ${sortConfig.direction === 'asc' ? 'text-blue-600' : 'text-gray-400'}`} />
                                                )}
                                            </div>
                                        </th>
                                        <th 
                                            className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none whitespace-nowrap"
                                            onClick={() => handleSort('currentRank')}
                                        >
                                            <div className="flex items-center justify-center">
                                                Faixa Atual
                                                {sortConfig.key === 'currentRank' && (
                                                    <ArrowUpDown size={12} className={`ml-1 ${sortConfig.direction === 'asc' ? 'text-blue-600' : 'text-gray-400'}`} />
                                                )}
                                            </div>
                                        </th>
                                        <th 
                                            className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider cursor-pointer hover:bg-gray-100 select-none whitespace-nowrap"
                                            onClick={() => handleSort('targetRank')}
                                        >
                                            <div className="flex items-center justify-center">
                                                Faixa Pretendida
                                                {sortConfig.key === 'targetRank' && (
                                                    <ArrowUpDown size={12} className={`ml-1 ${sortConfig.direction === 'asc' ? 'text-blue-600' : 'text-gray-400'}`} />
                                                )}
                                            </div>
                                        </th>
                                        <th className="px-4 py-3 text-center text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">
                                            Presença
                                        </th>
                                        <th className="px-4 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider whitespace-nowrap">Ações</th>
                                    </tr>
                                </thead>
                                <tbody className="bg-white divide-y divide-gray-200">
                                    {sortedRegistrations.length === 0 ? (
                                        <tr>
                                            <td colSpan={5} className="px-6 py-8 text-center text-gray-500 text-sm">
                                                Nenhum aluno vinculado a este exame. Use o formulário acima para adicionar.
                                            </td>
                                        </tr>
                                    ) : (
                                        sortedRegistrations.map(reg => {
                                            const s = students.find(st => st.id === reg.studentId);
                                            const isDeleting = deletingId === reg.id;
                                            return (
                                                <tr key={reg.id} className="hover:bg-gray-50 group">
                                                    <td className="px-4 py-3 whitespace-nowrap">
                                                        <div className="flex items-center">
                                                            <div className="flex-shrink-0 h-8 w-8 rounded-full bg-red-100 flex items-center justify-center text-red-700 text-xs font-bold mr-3 border border-red-200">
                                                                {s ? getInitials(s.name) : '?'}
                                                            </div>
                                                            <div>
                                                                <div className="text-sm font-medium text-gray-900">{s?.name || 'Desconhecido'}</div>
                                                                <div className="text-xs text-gray-500">{s?.cpf || '-'}</div>
                                                            </div>
                                                        </div>
                                                    </td>
                                                    <td className="px-4 py-3 whitespace-nowrap text-center text-sm">
                                                        {s && (
                                                            <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getRankBadgeStyle(s.currentRank)}`}>
                                                                {s.currentRank}
                                                            </span>
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3 whitespace-nowrap text-center text-sm">
                                                         <span className={`px-2 py-1 rounded-full text-xs font-semibold ${getRankBadgeStyle(reg.targetRank)}`}>
                                                                {reg.targetRank}
                                                        </span>
                                                    </td>
                                                    <td className="px-4 py-3 whitespace-nowrap text-center">
                                                        <input 
                                                            type="checkbox"
                                                            checked={!!reg.present}
                                                            onChange={() => handleTogglePresence(reg.id, reg.present)}
                                                            className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500 cursor-pointer"
                                                            title="Marcar presença"
                                                        />
                                                    </td>
                                                    <td className="px-4 py-3 whitespace-nowrap text-right text-sm">
                                                        {isDeleting ? (
                                                            <div className="flex justify-end items-center gap-2">
                                                                <button 
                                                                    type="button"
                                                                    onClick={(e) => { e.stopPropagation(); confirmDelete(reg.id); }}
                                                                    className="bg-red-100 text-red-600 p-1.5 rounded hover:bg-red-200 transition-colors"
                                                                    title="Confirmar exclusão"
                                                                >
                                                                    <Check size={16} />
                                                                </button>
                                                                <button 
                                                                    type="button"
                                                                    onClick={(e) => { e.stopPropagation(); setDeletingId(null); }}
                                                                    className="bg-gray-100 text-gray-600 p-1.5 rounded hover:bg-gray-200 transition-colors"
                                                                    title="Cancelar"
                                                                >
                                                                    <X size={16} />
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <div className="flex justify-end gap-2">
                                                                <button
                                                                    type="button"
                                                                    onClick={(e) => {
                                                                        e.stopPropagation();
                                                                        handleDownloadPDF(reg);
                                                                    }}
                                                                    className="text-gray-500 hover:text-blue-600 p-2 rounded-md hover:bg-blue-50 transition-colors"
                                                                    title="Baixar Ficha PDF"
                                                                >
                                                                    <FileText size={18} />
                                                                </button>
                                                                <button 
                                                                    type="button"
                                                                    onClick={(e) => {
                                                                      e.stopPropagation();
                                                                      setDeletingId(reg.id);
                                                                    }}
                                                                    className="text-gray-500 hover:text-red-700 p-2 rounded-md hover:bg-red-50 transition-colors cursor-pointer"
                                                                    title="Remover do exame"
                                                                >
                                                                    <Trash2 size={18} />
                                                                </button>
                                                            </div>
                                                        )}
                                                    </td>
                                                </tr>
                                            );
                                        })
                                    )}
                                </tbody>
                            </table>
                        </div>
                    </div>
                </div>
            </>
        ) : (
            <div className="flex flex-col items-center justify-center h-full text-gray-400 bg-gray-50 flex-1">
                <CheckCircle size={48} className="mb-4 opacity-20" />
                <p className="text-lg font-medium">Nenhum exame selecionado</p>
                <p className="text-sm">Selecione um exame na lista à esquerda para gerenciar os participantes.</p>
            </div>
        )}
      </div>
    </div>
  );
};