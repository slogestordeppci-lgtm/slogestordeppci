import React, { createContext, useContext, useState, useEffect } from 'react';
import { AppData } from './types';
import { fetchFromSupabase, syncDataToSupabase } from './lib/supabase-sync';

const defaultData: AppData = {
  projects: [
    {
      id: '1',
      clientName: 'Restaurante Central',
      address: 'Av. das Flores, 100 - Bairro Novo, Cidade/UF',
      status: 'Elaboração',
      type: 'Comercial',
      checklist: {
        plantas_arquitetonicas: true,
        extintores: true,
        sinalizacao: false,
        iluminacao_emergencia: false,
        central_glp: true,
        saidas_emergencia: true,
      },
      notes: 'Necessário adequar central de GLP e adicionar sinalização de emergência nas rotas de fuga.',
      lastVisit: '2026-06-01',
    },
    {
      id: '2',
      clientName: 'Depósito de Gás Litoral',
      address: 'Av. Ipiranga, 450 - Canoas, RS',
      status: 'Levantamento',
      type: 'Depósito de GLP',
      checklist: {
        plantas_arquitetonicas: false,
        extintores: false,
        sinalizacao: false,
        iluminacao_emergencia: false,
        central_glp: false,
        saidas_emergencia: false,
      },
      notes: 'Plantas originais extraviadas. Elaborando croqui e levantamento arquitetônico in loco.',
      lastVisit: '2026-06-05',
    }
  ],
  inventory: [
    {
      id: 'i1',
      codigo_interno: '35',
      codigo_norma: 'P1',
      simbolo_tipo: 'Proibição',
      significado: 'Proibido fumar',
      dimensoes: '200 x 150',
      qtd_estoque: 5,
      qtd_venda: 0,
      custo_unitario: 7.00,
      margem: 56,
    },
    {
      id: 'i2',
      codigo_interno: '40',
      codigo_norma: 'A1',
      simbolo_tipo: 'Alerta',
      significado: 'Alerta geral',
      dimensoes: '200 x 200',
      qtd_estoque: 2,
      qtd_venda: 0,
      custo_unitario: 7.00,
      margem: 56,
    }
  ],
  services: [
    { id: 'svc1', codigo_interno: 'SRV-01', name: 'Elaboração de Projeto PPCI', unit: 'Un.', price: 1500.00 },
    { id: 'svc2', codigo_interno: 'SRV-02', name: 'Laudo de Estanqueidade de Gás', unit: 'Un.', price: 650.00 },
    { id: 'svc3', codigo_interno: 'SRV-03', name: 'Laudo de Abrigo e Central GLP', unit: 'Un.', price: 450.00 },
    { id: 'svc4', codigo_interno: 'SRV-04', name: 'Treinamento de Brigada de Incêndio', unit: 'Un.', price: 800.00 },
    { id: 'svc5', codigo_interno: 'SRV-05', name: 'ART de Projeto ou Execução (CREA/CAU)', unit: 'Un.', price: 350.00 },
    { id: 'svc6', codigo_interno: 'SRV-06', name: 'Renovação de Alvará APPCI / CLCB', unit: 'Un.', price: 900.00 },
  ],
  agenda: [
    {
      id: 'a1',
      title: 'Vistoria Técnica - Restaurante Central',
      date: '2026-06-10',
      type: 'Vistoria',
      projectId: '1',
      completed: false,
    },
    {
      id: 'a2',
      title: 'Protocolo CBM-RS Litoral',
      date: '2026-06-12',
      type: 'Protocolo',
      completed: false,
    }
  ],
  clients: [],
  leads: [],
  providers: [],
  suppliers: [],
  inventoryTransactions: [],
  financialTransactions: [],
  companyName: 'Sua Empresa de Engenharia',
  companyPhone: '(51) 99999-9999',
  companyEmail: 'contato@suaempresa.com.br',
  companyCnpj: '00.000.000/0001-00',
  companyCep: '00000-000',
  companyAddress: 'Av. Principal, 1000 - Centro, Cidade/UF',
  sketches: [],
  vehicles: [
    {
      id: 'v1',
      model: 'Fiat Strada Freedom 1.3',
      plate: 'RTS-4E21',
      year: '2022',
      fuelType: 'Flex',
      status: 'Disponível',
      currentKm: 42150,
      insuranceExpiry: '2026-11-15',
      renavam: '12345678901'
    },
    {
      id: 'v2',
      model: 'Chevrolet Onix LTZ',
      plate: 'QOP-9D82',
      year: '2021',
      fuelType: 'Flex',
      status: 'Em Uso',
      currentKm: 58900,
      insuranceExpiry: '2026-08-20',
      renavam: '98765432102'
    }
  ],
  maintenances: [
    {
      id: 'm1',
      vehicleId: 'v1',
      vehiclePlate: 'RTS-4E21',
      date: '2026-05-10',
      type: 'Preventiva',
      description: 'Troca de óleo, filtro de óleo e pastilhas de freio dianteiras.',
      cost: 450.00,
      providerName: 'Oficina Rápida Ltda',
      odometer: 40000,
      nextMaintenanceDate: '2026-11-10',
      nextMaintenanceKm: 50000
    }
  ],
  supplies: [
    {
      id: 's1',
      vehicleId: 'v1',
      vehiclePlate: 'RTS-4E21',
      date: '2026-07-10',
      fuelType: 'Gasolina',
      liters: 42,
      cost: 247.80,
      odometer: 42100,
      stationName: 'Posto Ipiranga Central'
    }
  ],
  trips: [
    {
      id: 't1',
      vehicleId: 'v2',
      vehiclePlate: 'QOP-9D82',
      date: '2026-07-14',
      driverName: 'Eng. Roberto Silva',
      purpose: 'Vistoria técnica no Restaurante Central e medições in loco.',
      startKm: 58850,
      status: 'Ativo'
    }
  ],
};

interface StoreContextType {
  data: AppData;
  updateData: (newData: Partial<AppData>) => void;
  exportBackup: () => void;
  importBackup: (file: File) => void;
}

const StoreContext = createContext<StoreContextType | undefined>(undefined);

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
          agenda: parsed.agenda || [],
          inventory: parsed.inventory || [],
          services: parsed.services || defaultData.services,
          projects: parsed.projects || [],
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
          const merged = {
            ...prev,
            ...supabaseData,
            clients: supabaseData.clients && supabaseData.clients.length > 0 ? supabaseData.clients : prev.clients,
            projects: supabaseData.projects && supabaseData.projects.length > 0 ? supabaseData.projects : prev.projects,
            inventory: supabaseData.inventory && supabaseData.inventory.length > 0 ? supabaseData.inventory : prev.inventory,
            services: supabaseData.services && supabaseData.services.length > 0 ? supabaseData.services : prev.services,
            agenda: supabaseData.agenda && supabaseData.agenda.length > 0 ? supabaseData.agenda : prev.agenda,
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

  if (!isLoaded) return null;

  return (
    <StoreContext.Provider value={{ data, updateData, exportBackup, importBackup }}>
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
