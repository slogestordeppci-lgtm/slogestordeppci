import React, { useState } from 'react';
import { StoreProvider } from './store';
import { Sidebar } from './components/Sidebar';
import { DashboardView } from './views/DashboardView';
import { ProjectsView } from './views/ProjectsView';
import { InventoryView } from './views/InventoryView';
import { HourlyRateCalculatorView } from './views/HourlyRateCalculatorView';
import { SettingsView } from './views/SettingsView';
import { CompanySettingsModal } from './components/CompanySettingsModal';
import { ClientsView } from './views/ClientsView';
import { ExtinguishersView } from './views/ExtinguishersView';
import { Menu } from 'lucide-react';

import { AgendaView } from './views/AgendaView';
import { ProvidersView } from './views/ProvidersView';
import { SuppliersView } from './views/SuppliersView';
import { FinancialView } from './views/FinancialView';
import { ProspectingView } from './views/ProspectingView';
import { InspectionsView } from './views/InspectionsView';
import { FleetView } from './views/FleetView';
import { ProtocolView } from './views/ProtocolView';
import { ServicesView } from './views/ServicesView';
import { ConnectionStatusBar } from './components/ConnectionStatusBar';

function MainLayout() {
  const [currentView, setCurrentView] = useState(() => {
    if (sessionStorage.getItem('draft_inspection')) {
      return 'inspections';
    }
    return 'agenda';
  });

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Custom view navigation event listener
  React.useEffect(() => {
    const handleNav = (e: Event) => {
      const customEvent = e as CustomEvent<string>;
      setCurrentView(customEvent.detail);
    };
    window.addEventListener('change-view', handleNav);
    return () => window.removeEventListener('change-view', handleNav);
  }, []);

  // Automatically collapse sidebar when entering PPCI Projects, Lead Prospecting (Captação), Clientes, Extintores, Prestadores de Serviço, Fornecedores, Checklist de Vistorias or Controle de Frota
  React.useEffect(() => {
    if (
      currentView === 'projects' || 
      currentView === 'prospecting' || 
      currentView === 'clients' || 
      currentView === 'extinguishers' ||
      currentView === 'providers' ||
      currentView === 'suppliers' ||
      currentView === 'inspections' ||
      currentView === 'fleet'
    ) {
      setIsSidebarCollapsed(true);
    } else {
      setIsSidebarCollapsed(false);
    }
  }, [currentView]);

  return (
    <div className="flex h-screen bg-black font-sans text-white selection:bg-red-900 selection:text-white relative">
      {!isSidebarCollapsed && (
        <Sidebar currentView={currentView} setCurrentView={setCurrentView} />
      )}
      <main className={`flex-1 h-full min-w-0 relative ${isSidebarCollapsed ? 'pl-14' : ''}`}>
        <CompanySettingsModal />
        {isSidebarCollapsed && (
          <button
            onClick={() => setIsSidebarCollapsed(false)}
            className="absolute left-4 top-4 z-50 p-2 bg-zinc-950/90 hover:bg-zinc-900 border border-zinc-850 rounded-lg text-zinc-400 hover:text-white transition-all shadow-lg flex items-center gap-2 text-xs font-semibold backdrop-blur-sm animate-in fade-in slide-in-from-left-5 duration-200"
            title="Mostrar Menu Principal"
          >
            <Menu className="w-4 h-4 text-red-500 animate-pulse" />
            <span>Menu</span>
          </button>
        )}
        {currentView === 'dashboard' && <DashboardView />}
        {currentView === 'prospecting' && <ProspectingView />}
        {currentView === 'inspections' && <InspectionsView />}
        {currentView === 'projects' && <ProjectsView />}
        {currentView === 'protocol' && <ProtocolView />}
        {currentView === 'clients' && <ClientsView />}
        {currentView === 'extinguishers' && <ExtinguishersView />}
        {currentView === 'agenda' && <AgendaView />}
        {currentView === 'financial' && <FinancialView />}
        {currentView === 'providers' && <ProvidersView />}
        {currentView === 'suppliers' && <SuppliersView />}
        {currentView === 'inventory' && <InventoryView />}
        {currentView === 'services' && <ServicesView />}
        {currentView === 'fleet' && <FleetView />}
        {currentView === 'hourly-rate' && <HourlyRateCalculatorView />}
        {currentView === 'settings' && <SettingsView />}
        <ConnectionStatusBar isSidebarCollapsed={isSidebarCollapsed} />
      </main>
    </div>
  );
}

export default function App() {
  return (
    <StoreProvider>
      <MainLayout />
    </StoreProvider>
  );
}
