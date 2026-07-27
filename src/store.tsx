import React, { createContext, useContext, useState, useEffect } from 'react';
import { AppData } from './types';
import { fetchFromSupabase, syncDataToSupabase } from './lib/supabase-sync';

const defaultData: AppData = {
  projects: [],
  inventory: [],
  services: [],
  agenda: [],
  clients: [],
  leads: [],
  providers: [],
  suppliers: [],
  inventoryTransactions: [],
  financialTransactions: [],
  companyName: '',
  companyPhone: '',
  companyEmail: '',
  companyCnpj: '',
  companyCep: '',
  companyAddress: '',
  sketches: [],
  vehicles: [],
  maintenances: [],
  supplies: [],
  trips: [],
  inspections: [],
};

interface StoreContextType {
  data: AppData;
  updateData: (newData: Partial<AppData>) => void;
  exportBackup: () => void;
  importBackup: (file: File) => void;
  clearAllData: () => void;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

const isSampleProject = (p: any) =>
  p.id === '1' ||
  p.id === '2' ||
  p.clientName === 'Restaurante Central' ||
  p.clientName === 'Depósito de Gás Litoral';

export function StoreProvider({ children }: { children: React.ReactNode }) {
  const [data, setData] = useState<AppData>(defaultData);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from LocalStorage and Supabase
  useEffect(() => {
    let initialMergedData = defaultData;
    const saved = localStorage.getItem('@slo-engenharia-db');
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        initialMergedData = {
          ...defaultData,
          ...parsed,
          clients: parsed.clients || [],
          leads: parsed.leads || [],
          agenda: (parsed.agenda || []).filter((a: any) => a.projectId !== '1' && a.projectId !== '2'),
          inventory: parsed.inventory || [],
          services: parsed.services || defaultData.services,
          projects: (parsed.projects || []).filter((p: any) => !isSampleProject(p)),
          providers: parsed.providers || [],
          suppliers: parsed.suppliers || [],
          inventoryTransactions: parsed.inventoryTransactions || [],
          financialTransactions: parsed.financialTransactions || [],
          sketches: parsed.sketches || [],
          vehicles: parsed.vehicles || [],
          maintenances: parsed.maintenances || [],
          supplies: parsed.supplies || [],
          trips: parsed.trips || [],
          inspections: parsed.inspections || [],
        };
        setData(initialMergedData);
      } catch (e) {
        console.error('Failed to parse local data', e);
      }
    }
    setIsLoaded(true);

    // Fetch from Supabase remote database in background
    fetchFromSupabase().then(supabaseData => {
      if (supabaseData) {
        setData(prev => {
          const subProjects = (supabaseData.projects || []).filter(p => !isSampleProject(p));
          const prevProjects = (prev.projects || []).filter(p => !isSampleProject(p));
          const subAgenda = (supabaseData.agenda || []).filter(a => a.projectId !== '1' && a.projectId !== '2');
          const prevAgenda = (prev.agenda || []).filter(a => a.projectId !== '1' && a.projectId !== '2');

          const merged = {
            ...prev,
            ...supabaseData,
            clients: supabaseData.clients && supabaseData.clients.length > 0 ? supabaseData.clients : prev.clients,
            projects: subProjects,
            inventory: supabaseData.inventory && supabaseData.inventory.length > 0 ? supabaseData.inventory : prev.inventory,
            services: supabaseData.services && supabaseData.services.length > 0 ? supabaseData.services : prev.services,
            agenda: subAgenda.length > 0 ? subAgenda : prevAgenda,
            leads: supabaseData.leads && supabaseData.leads.length > 0 ? supabaseData.leads : prev.leads,
            providers: supabaseData.providers && supabaseData.providers.length > 0 ? supabaseData.providers : prev.providers,
            suppliers: supabaseData.suppliers && supabaseData.suppliers.length > 0 ? supabaseData.suppliers : prev.suppliers,
            financialTransactions: supabaseData.financialTransactions && supabaseData.financialTransactions.length > 0 ? supabaseData.financialTransactions : prev.financialTransactions,
            inspections: supabaseData.inspections && supabaseData.inspections.length > 0 ? supabaseData.inspections : prev.inspections,
            vehicles: supabaseData.vehicles && supabaseData.vehicles.length > 0 ? supabaseData.vehicles : prev.vehicles,
          };
          return merged;
        });
      }
    });
  }, []);

  // Save to LocalStorage and sync to Supabase
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem('@slo-engenharia-db', JSON.stringify(data));
      // Background sync to Supabase
      syncDataToSupabase(data).catch(err => {
        console.warn('Background Supabase sync notice:', err);
      });
    }
  }, [data, isLoaded]);

  const updateData = (newData: Partial<AppData>) => {
    setData(prev => ({ ...prev, ...newData }));
  };

  const exportBackup = () => {
    const jsonData = JSON.stringify(data, null, 2);
    const blob = new Blob([jsonData], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `gestao-engenharia-backup-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const importBackup = async (file: File) => {
    try {
      const text = await file.text();
      const parsed = JSON.parse(text) as AppData;
      if (parsed.projects && parsed.inventory && parsed.agenda) {
        if (!parsed.clients) parsed.clients = [];
        updateData(parsed);
        alert('Backup importado com sucesso!');
      } else {
        alert('Arquivo de backup inválido.');
      }
    } catch (e) {
      alert('Erro ao ler o arquivo.');
    }
  };

  const clearAllData = () => {
    localStorage.removeItem('@slo-engenharia-db');
    setData(defaultData);
  };

  if (!isLoaded) return null;

  return (
    <StoreContext.Provider value={{ data, updateData, exportBackup, importBackup, clearAllData }}>
      {children}
    </StoreContext.Provider>
  );
}

export function useStore() {
  const context = useContext(StoreContext);
  if (context === undefined) {
    throw new Error('useStore must be used within a StoreProvider');
  }
  return context;
}
