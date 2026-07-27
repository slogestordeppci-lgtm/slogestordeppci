import React, { useState, useMemo } from 'react';
import { useStore } from '../store';
import { Plus, CheckCircle2, X, Trash2, Search, Phone, UserPlus, ClipboardList, Target, Upload, FileSpreadsheet, AlertTriangle, ClipboardCheck } from 'lucide-react';
import { Lead } from '../types';

// Helper to dynamically load SheetJS from CDN for Excel (.xlsx/.xls) parsing
const loadXLSX = (): Promise<any> => {
  return new Promise((resolve, reject) => {
    if ((window as any).XLSX) {
      resolve((window as any).XLSX);
      return;
    }
    const script = document.createElement('script');
    script.src = 'https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js';
    script.onload = () => resolve((window as any).XLSX);
    script.onerror = (err) => reject(err);
    document.head.appendChild(script);
  });
};

// Separates the Alvará status from the expiry date
function parseAlvaraStatusAndDate(statusStr: string) {
  if (!statusStr) return { status: 'A Contatar', date: '' };
  
  // Extract date like 23/01/2027 or 06/07/2024
  const dateRegex = /(\d{2}\/\d{2}\/\d{4})/;
  const match = statusStr.match(dateRegex);
  const date = match ? match[1] : '';
  
  // Clean up the status. Remove the date, any asterisks and extra spaces.
  let cleanedStatus = statusStr.replace(dateRegex, '').replace(/\*/g, '').trim();
  
  return {
    status: cleanedStatus || 'Desconhecido',
    date: date
  };
}

// Converts DD/MM/YYYY to YYYY-MM-DD
function convertBrDateToIso(brDate: string): string {
  if (!brDate) return '';
  const parts = brDate.split('/');
  if (parts.length === 3) {
    const [day, month, year] = parts;
    return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
  }
  return '';
}

export function ProspectingView() {
  const { data, updateData } = useStore();
  const [selectedLead, setSelectedLead] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [importText, setImportText] = useState('');
  const [importError, setImportError] = useState('');
  const [previewLeads, setPreviewLeads] = useState<Partial<Lead>[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterStatus, setFilterStatus] = useState<Lead['status'] | 'Todos'>('Todos');
  const [filterResponsible, setFilterResponsible] = useState('Todos');
  const [filterCity, setFilterCity] = useState('Todas');
  const [leadToDelete, setLeadToDelete] = useState<string | null>(null);
  const [showDeleteAllConfirm, setShowDeleteAllConfirm] = useState(false);
  
  const [newLead, setNewLead] = useState<Partial<Lead>>({
    name: '',
    phone: '',
    address: '',
    city: '',
    status: 'A Contatar',
    notes: '',
    responsible: '',
    nextContactDate: '',
    ppc: '',
    alvaraStatus: '',
    alvaraExpiryDate: '',
    enterpriseName: '',
    neighborhood: '',
  });

  const leads = data.leads || [];

  const responsibles = useMemo(() => {
    const list = new Set(leads.map(l => l.responsible).filter(Boolean));
    return Array.from(list) as string[];
  }, [leads]);

  const cities = useMemo(() => {
    const list = new Set(leads.map(l => l.city).filter(Boolean));
    return Array.from(list) as string[];
  }, [leads]);

  const filteredLeads = useMemo(() => {
    return leads.filter(lead => {
      const matchesSearch = lead.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                            lead.phone?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            lead.city?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            lead.address?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            lead.ppc?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                            lead.enterpriseName?.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesStatus = filterStatus === 'Todos' || lead.status === filterStatus;
      const matchesResponsible = filterResponsible === 'Todos' || lead.responsible === filterResponsible;
      const matchesCity = filterCity === 'Todas' || lead.city === filterCity;

      return matchesSearch && matchesStatus && matchesResponsible && matchesCity;
    });
  }, [leads, searchQuery, filterStatus, filterResponsible, filterCity]);

  const activeLead = leads.find(l => l.id === selectedLead);

  const handleAddLead = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newLead.name) return;

    const lead: Lead = {
      id: `lead-${Date.now()}`,
      name: newLead.name,
      phone: newLead.phone,
      address: newLead.address,
      city: newLead.city,
      status: newLead.status as Lead['status'],
      notes: newLead.notes,
      responsible: newLead.responsible,
      nextContactDate: newLead.nextContactDate,
      createdAt: new Date().toISOString().split('T')[0],
      ppc: newLead.ppc,
      alvaraStatus: newLead.alvaraStatus,
      alvaraExpiryDate: newLead.alvaraExpiryDate,
      enterpriseName: newLead.enterpriseName,
      neighborhood: newLead.neighborhood,
    };

    updateData({ leads: [...leads, lead] });
    setShowAddForm(false);
    setNewLead({
      name: '',
      phone: '',
      address: '',
      city: '',
      status: 'A Contatar',
      notes: '',
      responsible: '',
      nextContactDate: '',
      ppc: '',
      alvaraStatus: '',
      alvaraExpiryDate: '',
      enterpriseName: '',
      neighborhood: '',
    });
    setSelectedLead(lead.id);
  };

  const updateLeadField = (leadId: string, field: keyof Lead, value: string) => {
    const updated = leads.map(l => l.id === leadId ? { ...l, [field]: value } : l);
    updateData({ leads: updated });
  };

  const handleDeleteLead = (leadId: string) => {
    setLeadToDelete(leadId);
  };

  const confirmDeleteLead = () => {
    if (!leadToDelete) return;
    const updated = leads.filter(l => l.id !== leadToDelete);
    updateData({ leads: updated });
    if (selectedLead === leadToDelete) setSelectedLead(null);
    setLeadToDelete(null);
  };

  const [convertingLead, setConvertingLead] = useState<Lead | null>(null);
  const [visitDate, setVisitDate] = useState('');
  const [visitTime, setVisitTime] = useState('');

  const handleConvertToClient = (lead: Lead) => {
    setConvertingLead(lead);
    setVisitDate('');
    setVisitTime('');
  };

  const confirmConversion = (e: React.FormEvent) => {
    e.preventDefault();
    if (!convertingLead) return;

    const newClient = {
      id: `client-${Date.now()}`,
      name: convertingLead.name,
      phone: convertingLead.phone,
      address: convertingLead.address || '',
      city: convertingLead.city || '',
      extinguishers: []
    };
    
    const updatedLeads = leads.filter(l => l.id !== convertingLead.id);
    const newAgendaEvents = [...data.agenda];

    if (visitDate) {
      newAgendaEvents.push({
        id: `ev-${Date.now()}`,
        title: `Visita Cliente: ${convertingLead.name}`,
        date: visitDate,
        time: visitTime,
        type: 'Visita',
        completed: false,
      });
    }

    updateData({ 
      clients: [...data.clients, newClient],
      leads: updatedLeads,
      agenda: newAgendaEvents,
    });
    
    setConvertingLead(null);
    setSelectedLead(null);
    alert(`${convertingLead.name} foi adicionado à sua lista de Clientes!`);
  };

  const processParsedRows = (rows: any[][]) => {
    if (rows.length === 0) {
      setPreviewLeads([]);
      return;
    }

    // Check for headers
    let startIdx = 0;
    const firstRowStr = rows[0].join(' ').toLowerCase();
    const hasHeaders = firstRowStr.includes('proprietário') || 
                       firstRowStr.includes('proprietario') || 
                       firstRowStr.includes('empreendimento') || 
                       firstRowStr.includes('ppc') ||
                       firstRowStr.includes('status');
    if (hasHeaders) {
      startIdx = 1;
    }

    // Map columns
    let colPpc = 0;
    let colProprietario = 1;
    let colEmpreendimento = 2;
    let colRua = 3;
    let colBairro = 4;
    let colStatus = 5;

    if (hasHeaders) {
      const headers = rows[0].map(h => String(h || '').toLowerCase());
      const findIndex = (terms: string[]) => headers.findIndex(h => terms.some(t => h.includes(t)));
      
      const ppcIdx = findIndex(['ppc']);
      if (ppcIdx !== -1) colPpc = ppcIdx;
      
      const propIdx = findIndex(['proprietário', 'proprietario', 'nome', 'cliente']);
      if (propIdx !== -1) colProprietario = propIdx;
      
      const empIdx = findIndex(['empreendimento', 'empresa', 'local', 'fantasia']);
      if (empIdx !== -1) colEmpreendimento = empIdx;
      
      const ruaIdx = findIndex(['rua', 'endereço', 'endereco', 'logradouro']);
      if (ruaIdx !== -1) colRua = ruaIdx;
      
      const bairroIdx = findIndex(['bairro']);
      if (bairroIdx !== -1) colBairro = bairroIdx;
      
      const statusIdx = findIndex(['status', 'alvará', 'alvara', 'situação', 'situacao']);
      if (statusIdx !== -1) colStatus = statusIdx;
    }

    const importedLeads: Partial<Lead>[] = [];

    for (let i = startIdx; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length < 2) continue; // Skip empty/invalid lines

      const ppc = String(row[colPpc] || '').trim();
      const name = String(row[colProprietario] || '').trim();
      const enterpriseName = String(row[colEmpreendimento] || '').trim();
      const rua = String(row[colRua] || '').trim();
      const neighborhood = String(row[colBairro] || '').trim();
      const statusCell = String(row[colStatus] || '').trim();

      const cleanedName = name.replace(/\*/g, '').trim();
      const finalName = cleanedName || enterpriseName || (ppc ? `Lead PPC ${ppc}` : '') || 'Lead sem nome';

      const parsedAlvara = parseAlvaraStatusAndDate(statusCell);
      const alvaraExpiryIso = convertBrDateToIso(parsedAlvara.date);

      const fullAddress = [rua, neighborhood].filter(Boolean).join(', ');

      importedLeads.push({
        id: `lead-import-${Date.now()}-${i}-${Math.random().toString(36).substr(2, 5)}`,
        name: finalName,
        ppc: ppc,
        enterpriseName: enterpriseName,
        address: fullAddress,
        neighborhood: neighborhood,
        city: 'Canoas',
        status: 'A Contatar',
        alvaraStatus: parsedAlvara.status,
        alvaraExpiryDate: alvaraExpiryIso,
        createdAt: new Date().toISOString().split('T')[0],
        notes: `Importado via Planilha.\nPPC: ${ppc}\nProprietário original: ${name}\nEmpreendimento: ${enterpriseName}\nStatus do Alvará: ${parsedAlvara.status} (${parsedAlvara.date || 'Sem data'})\nEndereço original: ${rua}, Bairro: ${neighborhood}`,
      });
    }

    setPreviewLeads(importedLeads);
    setImportError('');
  };

  const handleParseText = (text: string) => {
    if (!text.trim()) {
      setPreviewLeads([]);
      setImportError('');
      return;
    }

    try {
      const lines = text.split(/\r?\n/).map(line => line.trim()).filter(line => line.length > 0);
      if (lines.length === 0) {
        setPreviewLeads([]);
        return;
      }

      // Determine separator
      const firstLine = lines[0];
      let separator = '\t';
      if (firstLine.includes('\t')) {
        separator = '\t';
      } else if (firstLine.includes(';')) {
        separator = ';';
      } else if (firstLine.includes(',')) {
        separator = ',';
      }

      const rows = lines.map(line => {
        return line.split(separator).map(cell => {
          let cleaned = cell.trim();
          if (cleaned.startsWith('"') && cleaned.endsWith('"')) {
            cleaned = cleaned.slice(1, -1);
          }
          return cleaned;
        });
      });

      processParsedRows(rows);
    } catch (err: any) {
      setImportError('Erro ao processar os dados copiados. Verifique a formatação.');
      setPreviewLeads([]);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fileExtension = file.name.split('.').pop()?.toLowerCase();

    if (fileExtension === 'xlsx' || fileExtension === 'xls') {
      const reader = new FileReader();
      reader.onload = async (event) => {
        try {
          const data = new Uint8Array(event.target?.result as ArrayBuffer);
          const XLSX = await loadXLSX();
          const workbook = XLSX.read(data, { type: 'array' });
          const firstSheetName = workbook.SheetNames[0];
          const worksheet = workbook.Sheets[firstSheetName];
          const rows = XLSX.utils.sheet_to_json(worksheet, { header: 1 }) as any[][];
          
          processParsedRows(rows);
        } catch (err: any) {
          console.error(err);
          setImportError('Erro ao processar o arquivo Excel. Certifique-se de que ele não está corrompido ou é um formato válido.');
          setPreviewLeads([]);
        }
      };
      reader.readAsArrayBuffer(file);
    } else {
      const reader = new FileReader();
      reader.onload = (event) => {
        const text = event.target?.result as string;
        setImportText(text);
        handleParseText(text);
      };
      reader.readAsText(file, 'UTF-8');
    }
  };

  const handleConfirmImport = () => {
    if (previewLeads.length === 0) return;
    
    const newLeadsList = [...leads, ...previewLeads as Lead[]];
    updateData({ leads: newLeadsList });
    
    const firstImportedId = previewLeads[0].id;
    setSelectedLead(firstImportedId || null);
    setShowImportModal(false);
    setImportText('');
    setPreviewLeads([]);
  };

  const handleDeleteAllLeads = () => {
    setShowDeleteAllConfirm(true);
  };

  const confirmDeleteAllLeads = () => {
    updateData({ leads: [] });
    setSelectedLead(null);
    setShowDeleteAllConfirm(false);
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'A Contatar': return 'bg-zinc-500/10 text-zinc-400 border border-zinc-500/20';
      case 'Em Contato': return 'bg-blue-500/10 text-blue-400 border border-blue-500/20';
      case 'Sem Interesse': return 'bg-red-500/10 text-red-400 border border-red-500/20';
      case 'Orçamento Solicitado': return 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20';
      default: return 'bg-zinc-800 text-zinc-400';
    }
  };

  return (
    <div className="h-full flex flex-col p-6 max-w-[1600px] mx-auto animate-in fade-in duration-300">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white flex items-center gap-2">
            <Target className="w-6 h-6 text-red-600" />
            Captação de Clientes
          </h1>
          <p className="text-zinc-400 text-sm mt-1">Busque leads, faça contatos e converta em clientes</p>
        </div>
        <div className="flex items-center gap-3">
          {leads.length > 0 && (
            <button
              onClick={handleDeleteAllLeads}
              className="bg-zinc-900 hover:bg-red-950/30 border border-zinc-800 hover:border-red-900/50 text-zinc-400 hover:text-red-400 px-3 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-all shadow-md cursor-pointer"
              title="Excluir Todos os Leads de Captação"
            >
              <Trash2 className="w-4 h-4 text-red-500" />
              Excluir Todos
            </button>
          )}
          <button
            onClick={() => setShowImportModal(true)}
            className="bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-300 px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-all shadow-md cursor-pointer"
          >
            <Upload className="w-4 h-4 text-emerald-500" />
            Importar Planilha (Excel/CSV)
          </button>
          <button
            onClick={() => setShowAddForm(true)}
            className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg flex items-center gap-2 text-sm font-medium transition-all shadow-lg shadow-red-900/20 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Novo Lead
          </button>
        </div>
      </div>

      <div className="flex gap-8 flex-1 min-h-0">
        {/* Leads List */}
        <div className="w-1/3 flex flex-col overflow-hidden bg-zinc-950 rounded-xl border border-zinc-900 shadow-sm">
          <div className="p-4 border-b border-zinc-900 bg-zinc-900 font-semibold text-white flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <ClipboardList className="w-4 h-4 text-red-500" />
              Lista de Contatos
            </div>
            <div className="flex flex-col gap-2">
              <div className="relative">
                <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Buscar lead (nome, telefone)..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-9 pr-3 py-1.5 bg-zinc-950 border border-zinc-800 text-white rounded text-sm focus:outline-none focus:ring-1 focus:ring-red-500"
                />
              </div>
              <select
                value={filterStatus}
                onChange={(e) => setFilterStatus(e.target.value as any)}
                className="w-full px-3 py-1.5 bg-zinc-950 border border-zinc-800 text-white rounded text-sm focus:outline-none focus:ring-1 focus:ring-red-500"
              >
                <option value="Todos">Todos os Status</option>
                <option value="A Contatar">A Contatar</option>
                <option value="Em Contato">Em Contato</option>
                <option value="Orçamento Solicitado">Orçamento Solicitado</option>
                <option value="Sem Interesse">Sem Interesse</option>
              </select>
              {responsibles.length > 0 && (
                <select
                  value={filterResponsible}
                  onChange={(e) => setFilterResponsible(e.target.value)}
                  className="w-full px-3 py-1.5 bg-zinc-950 border border-zinc-800 text-white rounded text-sm focus:outline-none focus:ring-1 focus:ring-red-500"
                >
                  <option value="Todos">Todos os Responsáveis</option>
                  {responsibles.map(r => (
                    <option key={r} value={r}>{r}</option>
                  ))}
                </select>
              )}
              {cities.length > 0 && (
                <select
                  value={filterCity}
                  onChange={(e) => setFilterCity(e.target.value)}
                  className="w-full px-3 py-1.5 bg-zinc-950 border border-zinc-800 text-white rounded text-sm focus:outline-none focus:ring-1 focus:ring-red-500"
                >
                  <option value="Todas">Todas as Cidades</option>
                  {cities.map(c => (
                    <option key={c} value={c}>{c}</option>
                  ))}
                </select>
              )}
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {filteredLeads.length === 0 ? (
              <div className="p-4 text-sm text-zinc-500 text-center">Nenhum lead encontrado.</div>
            ) : (
              filteredLeads.map((lead) => (
                <button
                  key={lead.id}
                  onClick={() => setSelectedLead(lead.id)}
                  className={`group w-full text-left p-3 rounded-lg mb-1 transition-all flex flex-col gap-1 relative ${
                    selectedLead === lead.id
                      ? 'bg-red-500/10 border-red-500/50 border shadow-sm'
                      : 'hover:bg-zinc-900 border border-transparent'
                  }`}
                >
                  <div className="flex items-center justify-between gap-2 w-full">
                    <div className="font-medium text-zinc-200 text-sm truncate">{lead.name}</div>
                    {lead.ppc && (
                      <span className="text-[10px] font-mono font-bold bg-zinc-800 text-zinc-400 px-1.5 py-0.5 rounded shrink-0">
                        PPC {lead.ppc}
                      </span>
                    )}
                  </div>
                  {lead.enterpriseName && (
                    <div className="text-xs text-zinc-400 truncate max-w-[280px]">
                      {lead.enterpriseName}
                    </div>
                  )}
                  {lead.phone && <div className="text-xs text-zinc-500 flex items-center gap-1"><Phone className="w-3 h-3"/>{lead.phone}</div>}
                  {lead.city && <div className="text-xs text-zinc-500">{lead.city}</div>}
                  {lead.alvaraExpiryDate && (
                    <div className="text-[10px] mt-0.5 flex items-center gap-1">
                      {new Date(lead.alvaraExpiryDate) < new Date() ? (
                        <span className="text-red-400 font-medium flex items-center gap-1">⚠️ Alvará Vencido ({new Date(lead.alvaraExpiryDate + 'T00:00:00').toLocaleDateString('pt-BR')})</span>
                      ) : (
                        <span className="text-emerald-400 font-medium flex items-center gap-1">✅ Alvará Válido ({new Date(lead.alvaraExpiryDate + 'T00:00:00').toLocaleDateString('pt-BR')})</span>
                      )}
                    </div>
                  )}
                  <div className="flex items-center justify-between w-full mt-1">
                    <div className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${getStatusBadge(lead.status)}`}>
                      {lead.status}
                    </div>
                    <span
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDeleteLead(lead.id);
                      }}
                      className="p-1 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-all opacity-0 group-hover:opacity-100 cursor-pointer"
                      title="Excluir Lead"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Lead Details */}
        <div className="flex-1 bg-zinc-950 rounded-xl border border-zinc-900 overflow-hidden flex flex-col shadow-sm">
          {activeLead ? (
            <div className="flex flex-col h-full animate-in fade-in duration-200">
              <div className="p-6 border-b border-zinc-900 flex justify-between items-start bg-zinc-900">
                <div>
                  <h2 className="text-xl font-bold text-white mb-2">{activeLead.name}</h2>
                  <div className="flex items-center gap-3">
                    <select
                      value={activeLead.status}
                      onChange={(e) => updateLeadField(activeLead.id, 'status', e.target.value)}
                      className={`text-xs font-semibold px-2 py-1 rounded focus:outline-none focus:ring-1 focus:ring-red-600 appearance-none cursor-pointer ${getStatusBadge(activeLead.status)}`}
                    >
                      <option value="A Contatar" className="bg-zinc-900 text-zinc-300">A Contatar</option>
                      <option value="Em Contato" className="bg-zinc-900 text-zinc-300">Em Contato</option>
                      <option value="Orçamento Solicitado" className="bg-zinc-900 text-zinc-300">Orçamento Solicitado</option>
                      <option value="Sem Interesse" className="bg-zinc-900 text-zinc-300">Sem Interesse</option>
                    </select>
                    <span className="text-xs text-zinc-500">Adicionado em: {new Date(activeLead.createdAt).toLocaleDateString('pt-BR')}</span>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleConvertToClient(activeLead)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-emerald-400 bg-emerald-500/10 hover:bg-emerald-500/20 rounded border border-emerald-500/20 transition-colors"
                    title="Converter para Cliente Oficial"
                  >
                    <UserPlus className="w-4 h-4" />
                    Converter em Cliente
                  </button>
                  <button
                    onClick={() => handleDeleteLead(activeLead.id)}
                    className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-400 bg-red-500/10 hover:bg-red-500/20 rounded border border-red-500/20 transition-colors cursor-pointer"
                    title="Excluir Lead permanentemente"
                  >
                    <Trash2 className="w-4 h-4 text-red-500" />
                    Excluir Lead
                  </button>
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-6 space-y-6">
                {/* Basic Info */}
                <div className="bg-zinc-900/50 p-5 rounded-lg border border-zinc-800/50">
                  <h3 className="text-sm font-semibold text-zinc-300 mb-4 flex items-center gap-2">
                    <ClipboardList className="w-4 h-4 text-zinc-500" />
                    Dados do Contato
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-zinc-500 mb-1">Nome / Empresa</label>
                      <input
                        type="text"
                        value={activeLead.name}
                        onChange={(e) => updateLeadField(activeLead.id, 'name', e.target.value)}
                        className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 text-zinc-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-red-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-zinc-500 mb-1">Telefone / WhatsApp</label>
                      <input
                        type="text"
                        value={activeLead.phone || ''}
                        onChange={(e) => updateLeadField(activeLead.id, 'phone', e.target.value)}
                        placeholder="Ex: (00) 00000-0000"
                        className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 text-zinc-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-red-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-zinc-500 mb-1">Cidade</label>
                      <input
                        type="text"
                        value={activeLead.city || ''}
                        onChange={(e) => updateLeadField(activeLead.id, 'city', e.target.value)}
                        placeholder="Ex: São Paulo"
                        className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 text-zinc-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-red-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-zinc-500 mb-1">Endereço (Opcional)</label>
                      <input
                        type="text"
                        value={activeLead.address || ''}
                        onChange={(e) => updateLeadField(activeLead.id, 'address', e.target.value)}
                        placeholder="Ex: Rua das Flores, 123"
                        className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 text-zinc-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-red-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-zinc-500 mb-1">Responsável</label>
                      <input
                        type="text"
                        value={activeLead.responsible || ''}
                        onChange={(e) => updateLeadField(activeLead.id, 'responsible', e.target.value)}
                        placeholder="Ex: João"
                        className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 text-zinc-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-red-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-zinc-500 mb-1">Data do Próximo Contato</label>
                      <input
                        type="date"
                        value={activeLead.nextContactDate || ''}
                        onChange={(e) => updateLeadField(activeLead.id, 'nextContactDate', e.target.value)}
                        className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 text-zinc-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-red-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Technical & Alvará info */}
                <div className="bg-zinc-900/50 p-5 rounded-lg border border-zinc-800/50">
                  <h3 className="text-sm font-semibold text-zinc-300 mb-4 flex items-center gap-2">
                    <ClipboardCheck className="w-4 h-4 text-emerald-500" />
                    Informações do PPC & Alvará
                  </h3>
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-xs font-medium text-zinc-500 mb-1">Número do PPC</label>
                      <input
                        type="text"
                        value={activeLead.ppc || ''}
                        onChange={(e) => updateLeadField(activeLead.id, 'ppc', e.target.value)}
                        placeholder="Ex: 101/1"
                        className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 text-zinc-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-red-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-zinc-500 mb-1">Empreendimento (Nome Fantasia)</label>
                      <input
                        type="text"
                        value={activeLead.enterpriseName || ''}
                        onChange={(e) => updateLeadField(activeLead.id, 'enterpriseName', e.target.value)}
                        placeholder="Ex: RGE SUL DISTRIBUIDORA"
                        className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 text-zinc-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-red-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-zinc-500 mb-1">Bairro</label>
                      <input
                        type="text"
                        value={activeLead.neighborhood || ''}
                        onChange={(e) => updateLeadField(activeLead.id, 'neighborhood', e.target.value)}
                        placeholder="Ex: Igara"
                        className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 text-zinc-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-red-500"
                      />
                    </div>
                    <div>
                      <div className="flex justify-between items-center mb-1">
                        <label className="block text-xs font-medium text-zinc-500">Status do Alvará</label>
                        {activeLead.alvaraExpiryDate && (
                          <span className={`text-[10px] font-semibold px-1.5 py-0.5 rounded ${
                            new Date(activeLead.alvaraExpiryDate) < new Date() 
                              ? 'bg-red-500/10 text-red-400 border border-red-500/20' 
                              : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          }`}>
                            {new Date(activeLead.alvaraExpiryDate) < new Date() ? 'Vencido' : 'Válido'}
                          </span>
                        )}
                      </div>
                      <input
                        type="text"
                        value={activeLead.alvaraStatus || ''}
                        onChange={(e) => updateLeadField(activeLead.id, 'alvaraStatus', e.target.value)}
                        placeholder="Ex: Alvará Válido"
                        className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 text-zinc-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-red-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-zinc-500 mb-1">Data de Vencimento do Alvará</label>
                      <input
                        type="date"
                        value={activeLead.alvaraExpiryDate || ''}
                        onChange={(e) => updateLeadField(activeLead.id, 'alvaraExpiryDate', e.target.value)}
                        className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 text-zinc-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-red-500"
                      />
                    </div>
                  </div>
                </div>

                {/* Notes/Log */}
                <div className="bg-zinc-900/50 p-5 rounded-lg border border-zinc-800/50 flex-1 flex flex-col min-h-[300px]">
                  <h3 className="text-sm font-semibold text-zinc-300 mb-4 flex items-center gap-2">
                    <Phone className="w-4 h-4 text-zinc-500" />
                    Histórico de Contato / Anotações
                  </h3>
                  <textarea
                    value={activeLead.notes || ''}
                    onChange={(e) => updateLeadField(activeLead.id, 'notes', e.target.value)}
                    placeholder="Anote aqui o histórico de ligações, retornos e observações sobre o cliente..."
                    className="w-full flex-1 min-h-[200px] px-3 py-2 bg-zinc-950 border border-zinc-800 text-zinc-200 rounded text-sm focus:outline-none focus:ring-1 focus:ring-red-500 resize-none"
                  />
                </div>
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-zinc-500 p-6 text-center">
              <Target className="w-16 h-16 text-zinc-800 mb-4" />
              <p className="text-lg font-medium text-zinc-400">Nenhum lead selecionado</p>
              <p className="text-sm mt-2 max-w-md">
                Selecione um contato na lista ao lado para ver e editar os detalhes ou adicione um novo lead para prospectar.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Custom Delete Single Lead Modal */}
      {leadToDelete && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-[100] animate-in fade-in duration-200">
          <div className="bg-zinc-950 border border-zinc-900 rounded-xl max-w-sm w-full p-6 space-y-4 zoom-in-95 animate-in duration-200 shadow-2xl">
            <div className="flex items-center gap-3 text-red-500">
              <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/20">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-white text-lg">Excluir Lead</h3>
            </div>
            
            <p className="text-sm text-zinc-400">
              Tem certeza de que deseja excluir este lead? Todos os dados associados a ele serão perdidos permanentemente.
            </p>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setLeadToDelete(null)}
                className="flex-1 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 rounded-lg text-sm font-semibold transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmDeleteLead}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-semibold transition-colors cursor-pointer"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Custom Delete All Leads Modal */}
      {showDeleteAllConfirm && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-[100] animate-in fade-in duration-200">
          <div className="bg-zinc-950 border border-zinc-900 rounded-xl max-w-sm w-full p-6 space-y-4 zoom-in-95 animate-in duration-200 shadow-2xl">
            <div className="flex items-center gap-3 text-red-500">
              <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/20">
                <AlertTriangle className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-white text-lg">Excluir Todos os Leads</h3>
            </div>
            
            <p className="text-sm text-zinc-400">
              ⚠️ Tem certeza absoluta que deseja excluir <strong>TODOS</strong> os leads de captação? Esta ação apagará todos os dados de captação permanentemente e não poderá ser desfeita!
            </p>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setShowDeleteAllConfirm(false)}
                className="flex-1 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 rounded-lg text-sm font-semibold transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmDeleteAllLeads}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-semibold transition-colors cursor-pointer"
              >
                Excluir Tudo
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Add Lead Modal */}
      {showAddForm && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-zinc-950 rounded-xl border border-zinc-900 shadow-xl w-full max-w-lg max-h-[90vh] overflow-hidden flex flex-col zoom-in-95 animate-in duration-200">
            <div className="p-4 border-b border-zinc-900 flex justify-between items-center bg-zinc-900 shrink-0">
              <h2 className="font-semibold text-white flex items-center gap-2">
                <Target className="w-5 h-5 text-red-600" />
                Novo Lead (Captação)
              </h2>
              <button
                onClick={() => setShowAddForm(false)}
                className="text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleAddLead} className="p-6 space-y-4 overflow-y-auto flex-1">
              <div className="space-y-4">
                <h3 className="text-xs font-semibold text-red-500 uppercase tracking-wider">Dados Principais</h3>
                
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1">Nome / Proprietário *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Mercado Silva"
                    value={newLead.name}
                    onChange={(e) => setNewLead({ ...newLead, name: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-1">Telefone / WhatsApp</label>
                    <input
                      type="text"
                      placeholder="Ex: (00) 00000-0000"
                      value={newLead.phone}
                      onChange={(e) => setNewLead({ ...newLead, phone: e.target.value })}
                      className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-1">Cidade</label>
                    <input
                      type="text"
                      placeholder="Ex: Canoas"
                      value={newLead.city}
                      onChange={(e) => setNewLead({ ...newLead, city: e.target.value })}
                      className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-1">Bairro</label>
                    <input
                      type="text"
                      placeholder="Ex: Igara"
                      value={newLead.neighborhood}
                      onChange={(e) => setNewLead({ ...newLead, neighborhood: e.target.value })}
                      className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-1">Endereço / Rua</label>
                    <input
                      type="text"
                      placeholder="Ex: Av. Principal, 1000"
                      value={newLead.address}
                      onChange={(e) => setNewLead({ ...newLead, address: e.target.value })}
                      className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                </div>

                <div className="border-t border-zinc-900 pt-4 space-y-4">
                  <h3 className="text-xs font-semibold text-emerald-500 uppercase tracking-wider">Informações Técnicas & Alvará (Opcional)</h3>
                  
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-zinc-300 mb-1">Número do PPC</label>
                      <input
                        type="text"
                        placeholder="Ex: 101/1"
                        value={newLead.ppc}
                        onChange={(e) => setNewLead({ ...newLead, ppc: e.target.value })}
                        className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-300 mb-1">Nome do Empreendimento</label>
                      <input
                        type="text"
                        placeholder="Ex: RGE SUL DISTRIBUIDORA"
                        value={newLead.enterpriseName}
                        onChange={(e) => setNewLead({ ...newLead, enterpriseName: e.target.value })}
                        className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-zinc-300 mb-1">Status do Alvará</label>
                      <input
                        type="text"
                        placeholder="Ex: Alvará Válido"
                        value={newLead.alvaraStatus}
                        onChange={(e) => setNewLead({ ...newLead, alvaraStatus: e.target.value })}
                        className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-zinc-300 mb-1">Vencimento do Alvará</label>
                      <input
                        type="date"
                        value={newLead.alvaraExpiryDate}
                        onChange={(e) => setNewLead({ ...newLead, alvaraExpiryDate: e.target.value })}
                        className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                      />
                    </div>
                  </div>
                </div>

                <div className="border-t border-zinc-900 pt-4 grid grid-cols-3 gap-4">
                  <div className="col-span-2">
                    <label className="block text-sm font-medium text-zinc-300 mb-1">Responsável</label>
                    <input
                      type="text"
                      placeholder="Ex: João"
                      value={newLead.responsible}
                      onChange={(e) => setNewLead({ ...newLead, responsible: e.target.value })}
                      className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-1">Status Inicial</label>
                    <select
                      value={newLead.status}
                      onChange={(e) => setNewLead({ ...newLead, status: e.target.value as any })}
                      className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                    >
                      <option value="A Contatar">A Contatar</option>
                      <option value="Em Contato">Em Contato</option>
                      <option value="Orçamento Solicitado">Orçamento Solicitado</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1">Próximo Contato</label>
                  <input
                    type="date"
                    value={newLead.nextContactDate}
                    onChange={(e) => setNewLead({ ...newLead, nextContactDate: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-zinc-900 flex justify-end gap-3 shrink-0">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-white transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-md transition-colors flex items-center gap-2 cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  Salvar Lead
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Convert to Client Modal */}
      {convertingLead && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-zinc-950 rounded-xl border border-zinc-900 shadow-xl w-full max-w-md overflow-hidden zoom-in-95 animate-in duration-200">
            <div className="p-4 border-b border-zinc-900 flex justify-between items-center bg-zinc-900">
              <h2 className="font-semibold text-white flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-emerald-500" />
                Converter em Cliente
              </h2>
              <button
                onClick={() => setConvertingLead(null)}
                className="text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={confirmConversion} className="p-6 space-y-4">
              <p className="text-zinc-300 text-sm mb-2">
                Deseja adicionar <strong>{convertingLead.name}</strong> à sua carteira de clientes?
              </p>
              
              <div className="bg-zinc-900/50 p-4 rounded border border-zinc-800">
                <h3 className="text-sm font-medium text-white mb-3">Agendar Visita (Opcional)</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1">Data</label>
                    <input
                      type="date"
                      value={visitDate}
                      onChange={(e) => setVisitDate(e.target.value)}
                      className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-zinc-400 mb-1">Horário</label>
                    <input
                      type="time"
                      value={visitTime}
                      onChange={(e) => setVisitTime(e.target.value)}
                      className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>
              </div>

              <div className="pt-4 border-t border-zinc-900 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setConvertingLead(null)}
                  className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-white transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-medium rounded-md transition-colors flex items-center gap-2"
                >
                  <UserPlus className="w-4 h-4" />
                  Confirmar Conversão
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Excel/CSV Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-md flex items-center justify-center p-4 z-50 animate-in fade-in duration-300">
          <div className="bg-zinc-950 rounded-xl border border-zinc-900 shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col zoom-in-95 animate-in duration-200">
            <div className="p-5 border-b border-zinc-900 flex justify-between items-center bg-zinc-900/60 shrink-0">
              <div className="flex items-center gap-3">
                <FileSpreadsheet className="w-6 h-6 text-emerald-400" />
                <div>
                  <h2 className="font-semibold text-lg text-white">Importar Dados do Excel (Captação)</h2>
                  <p className="text-xs text-zinc-400">Importe sua planilha de leads com separação automática de PPC, Alvará e Data de Vencimento</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowImportModal(false);
                  setImportText('');
                  setPreviewLeads([]);
                }}
                className="text-zinc-400 hover:text-zinc-200 transition-colors cursor-pointer"
              >
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 grid grid-cols-1 lg:grid-cols-12 gap-6">
              {/* Left Column: Input and Guide */}
              <div className="lg:col-span-5 space-y-4 flex flex-col">
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1.5">
                    Opção 1: Selecionar Arquivo CSV
                  </label>
                  <div className="flex items-center gap-2">
                    <label className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 hover:border-zinc-700 text-zinc-200 text-sm font-medium rounded-md cursor-pointer transition-colors">
                      <Upload className="w-4 h-4 text-emerald-400" />
                      <span>Escolher arquivo .csv</span>
                      <input
                        type="file"
                        accept=".csv,.txt"
                        onChange={handleFileUpload}
                        className="hidden"
                      />
                    </label>
                  </div>
                </div>

                <div className="flex-1 flex flex-col">
                  <div className="flex justify-between items-center mb-1.5">
                    <label className="block text-sm font-medium text-zinc-300">
                      Opção 2: Colar do Excel
                    </label>
                    <span className="text-[10px] text-zinc-500 font-mono">Suporta CTRL+V</span>
                  </div>
                  <textarea
                    value={importText}
                    onChange={(e) => {
                      setImportText(e.target.value);
                      handleParseText(e.target.value);
                    }}
                    placeholder={`Cole aqui as linhas copiadas do Excel...\nExemplo:\n101/1\tProprietário ABC\tEMPREENDIMENTO XYZ\tRua Principal, 123\tIgara\tAlvará Válido 23/01/2027`}
                    className="w-full flex-1 min-h-[180px] p-3 bg-zinc-900 border border-zinc-800 text-zinc-200 rounded-md text-xs font-mono focus:outline-none focus:ring-1 focus:ring-emerald-500 resize-none leading-relaxed"
                  />
                </div>

                <div className="p-4 bg-zinc-900/60 rounded-lg border border-zinc-850 space-y-2">
                  <h4 className="text-xs font-semibold text-emerald-400 uppercase tracking-wider flex items-center gap-1.5">
                    💡 Colunas Recomendadas
                  </h4>
                  <p className="text-xs text-zinc-400 leading-relaxed">
                    Sua tabela deve conter as seguintes colunas (na ordem ou com cabeçalho correspondente):
                  </p>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1.5 text-[11px] text-zinc-400 font-mono">
                    <span className="flex items-center gap-1">🔹 <strong>PPC</strong> (Ex: 101/1)</span>
                    <span className="flex items-center gap-1">🔹 <strong>Proprietário</strong></span>
                    <span className="flex items-center gap-1">🔹 <strong>Empreendimento</strong></span>
                    <span className="flex items-center gap-1">🔹 <strong>Rua / Endereço</strong></span>
                    <span className="flex items-center gap-1">🔹 <strong>Bairro</strong></span>
                    <span className="flex items-center gap-1">🔹 <strong>Status / Alvará</strong></span>
                  </div>
                  <div className="text-[10px] text-zinc-500 pt-1 border-t border-zinc-800/60 mt-1">
                    * O sistema separa automaticamente o texto do status ("Alvará Válido") da data de vencimento ("23/01/2027") usando nossa inteligência de importação!
                  </div>
                </div>
              </div>

              {/* Right Column: Dynamic Preview */}
              <div className="lg:col-span-7 flex flex-col bg-zinc-900/30 border border-zinc-900/80 rounded-lg p-4 overflow-hidden min-h-[350px]">
                <div className="flex justify-between items-center pb-3 border-b border-zinc-900 mb-3">
                  <h3 className="font-medium text-sm text-zinc-300 flex items-center gap-2">
                    Visualização dos Dados ({previewLeads.length} identificados)
                  </h3>
                  {previewLeads.length > 0 && (
                    <span className="text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full">
                      Pronto para Importar
                    </span>
                  )}
                </div>

                {importError && (
                  <div className="p-3 bg-red-500/10 text-red-400 border border-red-500/20 rounded text-xs">
                    {importError}
                  </div>
                )}

                <div className="flex-1 overflow-auto max-h-[450px]">
                  {previewLeads.length > 0 ? (
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="text-zinc-500 border-b border-zinc-900 font-medium">
                          <th className="py-2 pr-2">PPC</th>
                          <th className="py-2 px-2">Proprietário / Empreendimento</th>
                          <th className="py-2 px-2">Endereço</th>
                          <th className="py-2 px-2">Status do Alvará</th>
                          <th className="py-2 pl-2">Vencimento</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-zinc-900 text-zinc-300 font-mono">
                        {previewLeads.map((lead, idx) => (
                          <tr key={idx} className="hover:bg-zinc-900/40">
                            <td className="py-2.5 pr-2 font-bold text-zinc-400">{lead.ppc || '-'}</td>
                            <td className="py-2.5 px-2">
                              <div className="font-sans font-semibold text-zinc-200 truncate max-w-[150px]">
                                {lead.name}
                              </div>
                              {lead.enterpriseName && (
                                <div className="text-[10px] text-zinc-500 truncate max-w-[150px]">
                                  {lead.enterpriseName}
                                </div>
                              )}
                            </td>
                            <td className="py-2.5 px-2 font-sans truncate max-w-[120px]" title={lead.address}>
                              {lead.address || '-'}
                            </td>
                            <td className="py-2.5 px-2 font-sans text-[11px] text-zinc-400">
                              {lead.alvaraStatus || '-'}
                            </td>
                            <td className="py-2.5 pl-2 font-sans text-right shrink-0">
                              {lead.alvaraExpiryDate ? (
                                <div className="flex flex-col items-end">
                                  <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded ${
                                    new Date(lead.alvaraExpiryDate) < new Date()
                                      ? 'bg-red-500/10 text-red-400 border border-red-500/20'
                                      : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                  }`}>
                                    {new Date(lead.alvaraExpiryDate + 'T00:00:00').toLocaleDateString('pt-BR')}
                                  </span>
                                </div>
                              ) : (
                                <span className="text-zinc-600">-</span>
                              )}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  ) : (
                    <div className="h-full flex flex-col items-center justify-center text-zinc-600 py-12 text-center">
                      <FileSpreadsheet className="w-12 h-12 text-zinc-800 mb-3" />
                      <p className="text-sm">Nenhum dado processado</p>
                      <p className="text-xs max-w-xs mt-1">
                        Copie as colunas da sua planilha Excel e cole no campo de texto à esquerda para ver a prévia em tempo real aqui.
                      </p>
                    </div>
                  )}
                </div>
              </div>
            </div>

            <div className="p-4 border-t border-zinc-900 flex justify-between items-center bg-zinc-900/30 shrink-0">
              <span className="text-xs text-zinc-500">
                {previewLeads.length > 0 ? `${previewLeads.length} leads prontos para importar` : 'Aguardando dados...'}
              </span>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowImportModal(false);
                    setImportText('');
                    setPreviewLeads([]);
                  }}
                  className="px-4 py-2 text-zinc-400 hover:text-white text-sm font-medium transition-colors cursor-pointer"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  disabled={previewLeads.length === 0}
                  onClick={handleConfirmImport}
                  className={`px-5 py-2 rounded-md text-sm font-medium transition-colors flex items-center gap-2 cursor-pointer ${
                    previewLeads.length === 0
                      ? 'bg-zinc-800 text-zinc-600 cursor-not-allowed'
                      : 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  }`}
                >
                  <Plus className="w-4 h-4" />
                  Confirmar e Importar ({previewLeads.length})
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
