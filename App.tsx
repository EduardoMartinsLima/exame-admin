import React, { useState, useEffect } from 'react';
import { storageService } from './services/storageService';
import { AppData } from './types';
import { SenseiManager } from './components/SenseiManager';
import { StudentManager } from './components/StudentManager';
import { ExamManager } from './components/ExamManager';
import { ExamGrader } from './components/ExamGrader';
import { Report } from './components/Report';
import { Login } from './components/Login';
import { Menu, Users, Calendar, ClipboardCheck, BarChart2, Shield, LogOut } from 'lucide-react';

type View = 'senseis' | 'students' | 'exams' | 'grader' | 'reports';

const App: React.FC = () => {
  // Auth State
  const [session, setSession] = useState<any>(null);
  const [authLoading, setAuthLoading] = useState(true);

  // App State
  const [currentView, setCurrentView] = useState<View>('students');
  const [data, setData] = useState<AppData>({
    senseis: [],
    students: [],
    exams: [],
    registrations: []
  });
  const [isDataLoading, setIsDataLoading] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Auth Lifecycle
  useEffect(() => {
    // Check initial session
    storageService.getSession().then((session) => {
      setSession(session);
      setAuthLoading(false);
      if (session) {
        refreshData();
      }
    });

    // Subscribe to changes
    const subscription = storageService.onAuthStateChange((session) => {
      setSession(session);
      if (session) {
        refreshData();
      } else {
        // Clear data on logout
        setData({ senseis: [], students: [], exams: [], registrations: [] });
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  const refreshData = async () => {
    setIsDataLoading(true);
    const freshData = await storageService.getData();
    setData(freshData);
    setIsDataLoading(false);
  };

  const handleLogout = async () => {
    await storageService.signOut();
  };

  const NavItem = ({ view, icon: Icon, label }: { view: View; icon: any; label: string }) => (
    <button
      onClick={() => {
        setCurrentView(view);
        setIsMobileMenuOpen(false);
      }}
      className={`w-full flex items-center space-x-3 px-4 py-3 rounded-lg transition-colors ${
        currentView === view 
          ? 'bg-red-700 text-white' 
          : 'text-red-100 hover:bg-red-800 hover:text-white'
      }`}
    >
      <Icon size={20} />
      <span className="font-medium">{label}</span>
    </button>
  );

  // --- Render Auth Loading ---
  if (authLoading) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-100">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-900"></div>
      </div>
    );
  }

  // --- Render Login Screen ---
  if (!session) {
    return <Login />;
  }

  // --- Render Main App ---
  return (
    <div className="flex h-screen bg-gray-100 overflow-hidden">
      {/* Sidebar - Desktop */}
      <aside className="hidden md:flex md:w-64 flex-col bg-red-900 shadow-xl z-10">
        <div className="p-6 flex items-center justify-center border-b border-red-800">
           <Shield className="text-white mr-2" size={32} />
           <h1 className="text-2xl font-extrabold text-white tracking-wider">KarateFlow</h1>
        </div>
        <nav className="flex-1 p-4 space-y-2">
          <NavItem view="students" icon={Users} label="Alunos" />
          <NavItem view="senseis" icon={Shield} label="Senseis" />
          <NavItem view="exams" icon={Calendar} label="Exames" />
          <NavItem view="grader" icon={ClipboardCheck} label="Avaliação" />
          <NavItem view="reports" icon={BarChart2} label="Relatórios" />
        </nav>
        <div className="p-4 border-t border-red-800">
           <button 
             onClick={handleLogout}
             className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-red-950 text-red-200 rounded hover:bg-red-800 transition-colors"
           >
             <LogOut size={16} />
             <span>Sair</span>
           </button>
           <p className="text-xs text-red-300 text-center mt-3">v1.0.0 - Gestão Dojo</p>
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 w-full bg-red-900 text-white z-20 flex justify-between items-center p-4 shadow-md">
        <div className="flex items-center">
            <Shield className="mr-2" />
            <span className="font-bold text-lg">KarateFlow</span>
        </div>
        <button onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}>
          <Menu />
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div className="fixed inset-0 bg-gray-800 bg-opacity-75 z-30 md:hidden" onClick={() => setIsMobileMenuOpen(false)}>
           <div className="bg-red-900 w-64 h-full flex flex-col pt-20" onClick={e => e.stopPropagation()}>
              <div className="p-4 space-y-2 flex-1">
                <NavItem view="students" icon={Users} label="Alunos" />
                <NavItem view="senseis" icon={Shield} label="Senseis" />
                <NavItem view="exams" icon={Calendar} label="Exames" />
                <NavItem view="grader" icon={ClipboardCheck} label="Avaliação" />
                <NavItem view="reports" icon={BarChart2} label="Relatórios" />
              </div>
              <div className="p-4 border-t border-red-800 pb-8">
                 <button 
                   onClick={handleLogout}
                   className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-red-950 text-red-200 rounded hover:bg-red-800 transition-colors"
                 >
                   <LogOut size={16} />
                   <span>Sair</span>
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-auto md:pt-0 pt-16">
        <div className="p-6 max-w-7xl mx-auto">
          {isDataLoading ? (
            <div className="flex justify-center items-center h-full">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-900"></div>
            </div>
          ) : (
            <>
              {currentView === 'senseis' && <SenseiManager data={data.senseis} onUpdate={refreshData} />}
              {currentView === 'students' && <StudentManager students={data.students} senseis={data.senseis} onUpdate={refreshData} />}
              {currentView === 'exams' && (
                <ExamManager 
                  exams={data.exams} 
                  students={data.students} 
                  registrations={data.registrations} 
                  onUpdate={refreshData} 
                />
              )}
              {currentView === 'grader' && <ExamGrader data={data} onUpdate={refreshData} />}
              {currentView === 'reports' && <Report data={data} />}
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default App;