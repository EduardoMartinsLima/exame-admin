import React, { useState, useEffect } from 'react';
import { storageService } from './services/storageService';
import { AppData } from './types';
import { SenseiManager } from './components/SenseiManager';
import { StudentManager } from './components/StudentManager';
import { ExamManager } from './components/ExamManager';
import { ExamGrader } from './components/ExamGrader';
import { Report } from './components/Report';
import { Login } from './components/Login';
import { KarateLogo } from './components/KarateLogo';
import { Menu, Users, Calendar, ClipboardCheck, BarChart2, Shield, LogOut, ChevronLeft, ChevronRight } from 'lucide-react';

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
  
  // Sidebar State (Default to collapsed on smaller screens if desired, currently false)
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Auth Lifecycle
  useEffect(() => {
    // Check initial session
    storageService.getSession().then((session) => {
      setSession(session);
      setAuthLoading(false);
      if (session) {
        refreshData(true); // Initial load shows spinner
      }
    });

    // Subscribe to changes
    const subscription = storageService.onAuthStateChange((session) => {
      setSession(session);
      if (session) {
        refreshData(true); // Login/Auth change shows spinner
      } else {
        // Clear data on logout
        setData({ senseis: [], students: [], exams: [], registrations: [] });
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  // Accepts boolean to decide if global loading spinner should show
  const refreshData = async (showLoading = false) => {
    if (showLoading) setIsDataLoading(true);
    const freshData = await storageService.getData();
    setData(freshData);
    if (showLoading) setIsDataLoading(false);
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
      className={`w-full flex items-center px-4 py-3 rounded-lg transition-all duration-200 outline-none focus:ring-2 focus:ring-red-400 ${
        isSidebarCollapsed ? 'justify-center' : 'space-x-3'
      } ${
        currentView === view 
          ? 'bg-red-700 text-white shadow-inner transform scale-[0.98]' 
          : 'text-red-100 hover:bg-red-800 hover:text-white active:bg-red-900 active:scale-95'
      }`}
      role="menuitem"
      title={isSidebarCollapsed ? label : ''}
    >
      <Icon size={20} className="flex-shrink-0" />
      {!isSidebarCollapsed && <span className="font-medium whitespace-nowrap overflow-hidden">{label}</span>}
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
      {/* Sidebar - Desktop (Collapsible) */}
      <aside 
        className={`hidden md:flex flex-col bg-red-900 shadow-xl z-10 transition-all duration-300 ease-in-out print:hidden ${
            isSidebarCollapsed ? 'w-20' : 'w-64'
        }`}
      >
        {/* Header with Logo and Toggle Button */}
        <div className={`p-4 flex border-b border-red-800 transition-all duration-300 ${
            isSidebarCollapsed ? 'flex-col items-center gap-4 py-6' : 'flex-row items-center justify-between'
        }`}>
           <div className="flex items-center overflow-hidden">
               <KarateLogo className="text-white flex-shrink-0" size={32} />
               {!isSidebarCollapsed && (
                 <h1 className="ml-2 text-xl font-extrabold text-white tracking-wider truncate">KarateAdmin</h1>
               )}
           </div>

           {/* Collapse Toggle Moved Here */}
           <button 
              onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
              className={`p-1 text-red-300 hover:text-white hover:bg-red-800 rounded transition-colors ${
                  isSidebarCollapsed ? '' : 'ml-2'
              }`}
              title={isSidebarCollapsed ? "Expandir Menu" : "Recolher Menu"}
           >
              {isSidebarCollapsed ? <ChevronRight size={20} /> : <ChevronLeft size={20} />}
           </button>
        </div>
        
        <nav className="flex-1 p-3 space-y-2 overflow-y-auto overflow-x-hidden">
          <NavItem view="students" icon={Users} label="Alunos" />
          <NavItem view="senseis" icon={Shield} label="Senseis" />
          <NavItem view="exams" icon={Calendar} label="Exames" />
          <NavItem view="grader" icon={ClipboardCheck} label="Avaliação" />
          <NavItem view="reports" icon={BarChart2} label="Relatórios" />
        </nav>

        <div className="p-3 border-t border-red-800">
           <button 
             onClick={handleLogout}
             className={`w-full flex items-center px-4 py-2 bg-red-950 text-red-200 rounded hover:bg-red-800 transition-colors ${
                 isSidebarCollapsed ? 'justify-center' : 'justify-center space-x-2'
             }`}
             title="Sair"
           >
             <LogOut size={16} />
             {!isSidebarCollapsed && <span>Sair</span>}
           </button>
           
           {!isSidebarCollapsed && (
             <p className="text-xs text-red-300 text-center mt-3 truncate">v1.0.0</p>
           )}
        </div>
      </aside>

      {/* Mobile Header */}
      <div className="md:hidden fixed top-0 w-full bg-red-900 text-white z-20 flex justify-between items-center p-4 shadow-md print:hidden">
        <div className="flex items-center">
            <KarateLogo className="mr-2" size={24} />
            <span className="font-bold text-lg">KarateAdmin</span>
        </div>
        <button 
          onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
          className="focus:outline-none focus:ring-2 focus:ring-red-400 rounded p-1"
          aria-label={isMobileMenuOpen ? "Fechar menu" : "Abrir menu"}
          aria-expanded={isMobileMenuOpen}
          aria-controls="mobile-menu"
        >
          <Menu />
        </button>
      </div>

      {/* Mobile Menu Overlay */}
      {isMobileMenuOpen && (
        <div 
          id="mobile-menu"
          className="fixed inset-0 bg-gray-800 bg-opacity-75 z-30 md:hidden transition-opacity duration-300 print:hidden" 
          onClick={() => setIsMobileMenuOpen(false)}
          role="dialog"
          aria-modal="true"
        >
           <div 
             className="bg-red-900 w-64 h-full flex flex-col pt-20 shadow-2xl transform transition-transform duration-300 ease-out translate-x-0" 
             onClick={e => e.stopPropagation()}
           >
              <div className="p-4 space-y-2 flex-1" role="menu">
                <NavItem view="students" icon={Users} label="Alunos" />
                <NavItem view="senseis" icon={Shield} label="Senseis" />
                <NavItem view="exams" icon={Calendar} label="Exames" />
                <NavItem view="grader" icon={ClipboardCheck} label="Avaliação" />
                <NavItem view="reports" icon={BarChart2} label="Relatórios" />
              </div>
              <div className="p-4 border-t border-red-800 pb-8">
                 <button 
                   onClick={handleLogout}
                   className="w-full flex items-center justify-center space-x-2 px-4 py-3 bg-red-950 text-red-200 rounded hover:bg-red-800 transition-colors active:bg-red-900"
                 >
                   <LogOut size={16} />
                   <span>Sair</span>
                 </button>
              </div>
           </div>
        </div>
      )}

      {/* Main Content */}
      <main className="flex-1 overflow-auto md:pt-0 pt-16 transition-all duration-300 print:overflow-visible">
        <div className="p-4 md:p-6 max-w-7xl mx-auto print:p-0 print:m-0 print:max-w-none">
          {isDataLoading ? (
            <div className="flex justify-center items-center h-full">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-900"></div>
            </div>
          ) : (
            <>
              {currentView === 'senseis' && <SenseiManager data={data.senseis} onUpdate={() => refreshData(false)} />}
              {currentView === 'students' && <StudentManager students={data.students} senseis={data.senseis} onUpdate={() => refreshData(false)} />}
              {currentView === 'exams' && (
                <ExamManager 
                  exams={data.exams} 
                  students={data.students} 
                  registrations={data.registrations} 
                  senseis={data.senseis}
                  onUpdate={() => refreshData(false)} 
                />
              )}
              {currentView === 'grader' && <ExamGrader data={data} onUpdate={() => refreshData(false)} />}
              {currentView === 'reports' && <Report data={data} />}
            </>
          )}
        </div>
      </main>
    </div>
  );
};

export default App;