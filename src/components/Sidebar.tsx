import React from 'react';
import { 
  LayoutDashboard, 
  FolderGit2, 
  Calendar, 
  PackageOpen, 
  Settings, 
  Image as ImageIcon, 
  Users, 
  Flame, 
  Briefcase, 
  Truck, 
  DollarSign,
  Target,
  ClipboardCheck,
  Car,
  FileText,
  Calculator,
  Wrench
} from 'lucide-react';
import { useStore } from '../store';

interface SidebarProps {
  currentView: string;
  setCurrentView: (view: string) => void;
}

export function Sidebar({ currentView, setCurrentView }: SidebarProps) {
  const { data } = useStore();
  
  const navGroups = [
    {
      title: 'Visão Geral',
      items: [
        { id: 'dashboard', label: 'Dashboard Geral', icon: LayoutDashboard },
        { id: 'agenda', label: 'Planner & Agenda', icon: Calendar },
      ]
    },
    {
      title: 'Comercial',
      items: [
        { id: 'prospecting', label: 'Captação (Leads)', icon: Target },
        { id: 'clients', label: 'Clientes', icon: Users },
      ]
    },
    {
      title: 'Engenharia & Campo',
      items: [
        { id: 'projects', label: 'Projetos', icon: FolderGit2 },
        { id: 'protocol', label: 'Protocolos (CBM)', icon: FileText },
        { id: 'inspections', label: 'Checklist de Vistorias', icon: ClipboardCheck },
        { id: 'extinguishers', label: 'Extintores (CBM)', icon: Flame },
      ]
    },
    {
      title: 'Operações & Cadastros',
      items: [
        { id: 'services', label: 'Catálogo de Serviços', icon: Briefcase },
        { id: 'inventory', label: 'Estoque e Materiais', icon: PackageOpen },
        { id: 'providers', label: 'Prestadores de Serviço', icon: Wrench },
        { id: 'suppliers', label: 'Fornecedores', icon: Truck },
        { id: 'fleet', label: 'Controle de Frota', icon: Car },
      ]
    },
    {
      title: 'Financeiro & Gestão',
      items: [
        { id: 'financial', label: 'Fluxo Financeiro', icon: DollarSign },
        { id: 'hourly-rate', label: 'Cálculo de Hora Técnica', icon: Calculator },
      ]
    },
    {
      title: 'Sistema',
      items: [
        { id: 'settings', label: 'Configurações & Backup', icon: Settings },
      ]
    }
  ];

  return (
    <div className="w-64 bg-black border-r border-zinc-900 text-zinc-300 flex flex-col h-screen">
      <div className="p-5 flex flex-col items-center justify-center gap-2 border-b border-zinc-900">
        {data.logoUrl ? (
          <img src={data.logoUrl} alt="Logo" className="max-h-14 object-contain" />
        ) : (
          <div className="flex flex-col items-center text-zinc-600 gap-1 font-medium">
             <ImageIcon className="w-6 h-6 opacity-45" />
          </div>
        )}
        {data.companyName && (
          <div className="text-xs font-bold text-white text-center uppercase tracking-widest mt-1">
            {data.companyName}
          </div>
        )}
      </div>
      
      <nav className="flex-1 p-4 space-y-4 overflow-y-auto">
        {navGroups.map((group, gIdx) => (
          <div key={gIdx} className="space-y-1">
            <span className="text-[10px] uppercase tracking-wider text-zinc-600 font-bold px-3 block mb-1.5">
              {group.title}
            </span>
            {group.items.map((item) => {
              const Icon = item.icon;
              const isActive = currentView === item.id;
              return (
                <button
                  key={item.id}
                  onClick={() => setCurrentView(item.id)}
                  className={`w-full flex items-center gap-3 px-3 py-2 rounded-md transition-colors text-xs font-semibold ${
                    isActive 
                      ? 'bg-red-900/30 text-red-500' 
                      : 'hover:bg-zinc-900 hover:text-white text-zinc-400'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${isActive ? 'text-red-500' : 'text-zinc-500'}`} />
                  {item.label}
                </button>
              );
            })}
          </div>
        ))}
      </nav>

      <div className="p-4 border-t border-zinc-900 text-[10px] text-zinc-600 font-medium space-y-1">
        <p>Gestor PPCI • Sistema de Gestão v1.2</p>
        <p>© Alessandro M. Zandoná • Direitos Reservados</p>
      </div>
    </div>
  );
}
