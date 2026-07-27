import React, { useState } from 'react';
import { useStore } from '../store';
import { Project, ProjectBudget } from '../types';
import { 
  FileText, 
  Search, 
  Calendar, 
  Building2, 
  MapPin, 
  Copy, 
  Check, 
  ExternalLink, 
  FileSearch, 
  AlertCircle,
  Clock,
  Printer,
  Trash2,
  Edit,
  CheckCircle,
  TrendingUp,
  Filter,
  CheckSquare,
  ArrowRight,
  Info
} from 'lucide-react';

export function ProtocolView() {
  const { data, updateData } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [protocolToDelete, setProtocolToDelete] = useState<{ projectId: string; clientName: string } | null>(null);

  // Handle confirming protocol deletion
  const handleConfirmDeleteProtocol = () => {
    if (!protocolToDelete) return;
    const { projectId } = protocolToDelete;

    const updatedProjects = data.projects.map(p => {
      if (p.id === projectId) {
        const existingActions = p.actions || {};
        const updatedActions = {
          ...existingActions,
          protocolado_cbm: {
            date: '',
            checked: false,
            protocolNumber: '',
            analyzed: false,
            analyzedDate: ''
          }
        };
        const nextStatus = p.status === 'Protocolado' ? 'Elaboração' : p.status;
        return {
          ...p,
          status: nextStatus as Project['status'],
          actions: updatedActions
        };
      }
      return p;
    });

    updateData({ projects: updatedProjects });
    setProtocolToDelete(null);
    setSuccessMessage('Registro de protocolo excluído com sucesso!');
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  // Quick feedback for copying
  const handleCopy = (text: string, id: string) => {
    navigator.clipboard.writeText(text);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  // Helper to navigate to specific project in Projects view
  const handleNavigateToProject = (projectId: string) => {
    sessionStorage.setItem('active_project_id', projectId);
    window.dispatchEvent(new CustomEvent('change-view', { detail: 'projects' }));
  };

  // Update project protocol properties in the main store
  const handleUpdateProjectProtocol = (
    projectId: string, 
    field: 'date' | 'protocolNumber' | 'checked' | 'analyzed' | 'analyzedDate', 
    value: any
  ) => {
    const updatedProjects = data.projects.map(p => {
      if (p.id === projectId) {
        const existingActions = p.actions || {};
        const protocolAction = existingActions.protocolado_cbm || { date: '', checked: true, protocolNumber: '', analyzed: false, analyzedDate: '' };
        const updatedAction = { ...protocolAction, [field]: value };
        return {
          ...p,
          actions: {
            ...existingActions,
            protocolado_cbm: updatedAction
          }
        };
      }
      return p;
    });
    updateData({ projects: updatedProjects });
    setSuccessMessage('Protocolo atualizado com sucesso!');
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  // Update project status directly
  const handleUpdateProjectStatus = (projectId: string, nextStatus: Project['status']) => {
    const updatedProjects = data.projects.map(p => {
      if (p.id === projectId) {
        // If status changed to Protocolado, auto-check protocol action
        let actions = p.actions;
        if (nextStatus === 'Protocolado') {
          actions = {
            ...(p.actions || {}),
            protocolado_cbm: {
              date: p.actions?.protocolado_cbm?.date || new Date().toISOString().split('T')[0],
              checked: true,
              protocolNumber: p.actions?.protocolado_cbm?.protocolNumber || '',
              analyzed: p.actions?.protocolado_cbm?.analyzed || false,
              analyzedDate: p.actions?.protocolado_cbm?.analyzedDate || ''
            }
          };
        }
        return { ...p, status: nextStatus, actions };
      }
      return p;
    });
    updateData({ projects: updatedProjects });
    setSuccessMessage('Status do projeto atualizado!');
    setTimeout(() => setSuccessMessage(null), 3000);
  };

  // Helper to extract projects in protocol phase
  const protocolItems: Array<{
    project: Project;
    protocolDate: string;
    protocolNumber: string;
    isChecked: boolean;
    analyzed: boolean;
    analyzedDate: string;
  }> = [];

  data.projects.forEach(project => {
    const protocolAction = project.actions?.protocolado_cbm;
    const isChecked = Boolean(protocolAction?.checked);
    const isStatusProtocolado = project.status === 'Protocolado';
    const hasProtocolNumber = Boolean(protocolAction?.protocolNumber);

    if (isChecked || isStatusProtocolado || hasProtocolNumber) {
      protocolItems.push({
        project,
        protocolDate: protocolAction?.date || '',
        protocolNumber: protocolAction?.protocolNumber || '',
        isChecked,
        analyzed: Boolean(protocolAction?.analyzed),
        analyzedDate: protocolAction?.analyzedDate || ''
      });
    }
  });

  // Filter items based on search term and dates
  const filteredItems = protocolItems.filter(item => {
    const { project, protocolDate, protocolNumber } = item;
    
    // Search matcher
    const searchLower = searchTerm.toLowerCase();
    const matchesSearch = 
      project.clientName.toLowerCase().includes(searchLower) ||
      (project.notes && project.notes.toLowerCase().includes(searchLower)) ||
      project.address.toLowerCase().includes(searchLower) ||
      project.type.toLowerCase().includes(searchLower) ||
      (protocolNumber && protocolNumber.toLowerCase().includes(searchLower));

    // Date matcher
    let matchesDate = true;
    if (protocolDate) {
      if (startDate && protocolDate < startDate) matchesDate = false;
      if (endDate && protocolDate > endDate) matchesDate = false;
    } else if (startDate || endDate) {
      matchesDate = false;
    }

    return matchesSearch && matchesDate;
  });

  // Calculate statistics
  const totalProtocols = protocolItems.length;
  const filteredCount = filteredItems.length;
  const inAnalysisCount = protocolItems.filter(item => !item.analyzed).length;
  const analyzedCount = protocolItems.filter(item => item.analyzed).length;
  const withProtocolNumberCount = protocolItems.filter(item => Boolean(item.protocolNumber)).length;

  // Formatting date for displaying
  const formatDateBR = (dateStr?: string) => {
    if (!dateStr) return 'Não informada';
    try {
      const [year, month, day] = dateStr.split('-');
      return `${day}/${month}/${year}`;
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="p-6 max-w-7xl mx-auto space-y-6 animate-in fade-in duration-200">
      
      {/* Header section */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 border-b border-zinc-900 pb-5">
        <div>
          <h1 className="text-xl font-bold text-white flex items-center gap-2">
            <FileText className="w-5 h-5 text-red-500" />
            Consulta de Protocolos (CBM)
          </h1>
          <p className="text-zinc-400 text-sm mt-1">
            Consulte e acompanhe todas as propostas e projetos que se encontram na etapa de Protocolo junto ao Corpo de Bombeiros Militar.
          </p>
        </div>

        {successMessage && (
          <div className="bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs px-3 py-2 rounded-lg flex items-center gap-2 animate-in fade-in slide-in-from-top-2">
            <CheckCircle className="w-4 h-4 text-emerald-500" />
            <span>{successMessage}</span>
          </div>
        )}
      </div>

      {/* Overview Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-zinc-950 border border-zinc-900 rounded-lg p-4 flex items-center gap-4">
          <div className="p-3 rounded-lg bg-indigo-500/10 text-indigo-400 border border-indigo-500/20">
            <FileText className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-zinc-500 block">Total em Protocolo</span>
            <span className="text-xl font-bold text-white block mt-0.5">{totalProtocols}</span>
          </div>
        </div>

        <div className="bg-zinc-950 border border-zinc-900 rounded-lg p-4 flex items-center gap-4">
          <div className="p-3 rounded-lg bg-red-500/10 text-red-400 border border-red-500/20">
            <Clock className="w-5 h-5 text-red-400" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-zinc-500 block">Em Análise no CBM</span>
            <span className="text-xl font-bold text-red-400 block mt-0.5">{inAnalysisCount}</span>
          </div>
        </div>

        <div className="bg-zinc-950 border border-zinc-900 rounded-lg p-4 flex items-center gap-4">
          <div className="p-3 rounded-lg bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
            <CheckCircle className="w-5 h-5 text-emerald-400" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-zinc-500 block">Analisado pelo CBM</span>
            <span className="text-xl font-bold text-emerald-400 block mt-0.5">{analyzedCount}</span>
          </div>
        </div>

        <div className="bg-zinc-950 border border-zinc-900 rounded-lg p-4 flex items-center gap-4">
          <div className="p-3 rounded-lg bg-amber-500/10 text-amber-400 border border-amber-500/20">
            <CheckSquare className="w-5 h-5" />
          </div>
          <div>
            <span className="text-[10px] uppercase font-bold text-zinc-500 block">Com Nº de Protocolo</span>
            <span className="text-xl font-bold text-white block mt-0.5">
              {withProtocolNumberCount} <span className="text-xs text-zinc-500 font-normal">/ {totalProtocols}</span>
            </span>
          </div>
        </div>
      </div>

      {/* Filter panel */}
      <div className="bg-zinc-950 border border-zinc-900 rounded-lg p-4 space-y-3">
        <div className="flex flex-col md:flex-row gap-3">
          <div className="flex-1 relative">
            <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Buscar por cliente, empreendimento, número do protocolo, proposta..."
              className="w-full bg-zinc-900 border border-zinc-800 text-zinc-100 placeholder-zinc-500 pl-9 pr-4 py-2 rounded-lg text-sm focus:outline-none focus:ring-1 focus:ring-red-500 transition-all"
            />
          </div>

          <div className="flex items-center gap-2">
            <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-lg px-2 py-1 gap-1.5">
              <Calendar className="w-3.5 h-3.5 text-zinc-500" />
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="bg-transparent border-none text-zinc-300 text-xs focus:outline-none cursor-pointer"
                title="Data inicial do protocolo"
              />
              <span className="text-zinc-600 text-xs">até</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="bg-transparent border-none text-zinc-300 text-xs focus:outline-none cursor-pointer"
                title="Data final do protocolo"
              />
            </div>

            {(searchTerm || startDate || endDate) && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setStartDate('');
                  setEndDate('');
                }}
                className="text-xs text-red-500 hover:text-red-400 font-semibold px-2 py-1 rounded transition-colors"
              >
                Limpar
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Protocols Listing */}
      {filteredCount === 0 ? (
        <div className="bg-zinc-950 border border-zinc-900 rounded-lg p-10 text-center space-y-3">
          <div className="inline-flex p-4 rounded-full bg-zinc-900 text-zinc-500 border border-zinc-800">
            <FileSearch className="w-8 h-8" />
          </div>
          <h3 className="text-sm font-semibold text-zinc-300">Nenhum protocolo localizado</h3>
          <p className="text-xs text-zinc-500 max-w-md mx-auto">
            {searchTerm || startDate || endDate 
              ? "Experimente ajustar os filtros ou digitar termos de busca mais abrangentes."
              : "Marque a etapa 'Protocolado CBM' no cronograma do projeto em Projetos para acompanhá-los por aqui."
            }
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
          {filteredItems.map(({ project, protocolDate, protocolNumber, isChecked, analyzed, analyzedDate }) => {
            const isMissingFields = !protocolNumber || !protocolDate;
            
            return (
              <div 
                key={project.id} 
                className={`bg-zinc-950 border ${analyzed ? 'border-emerald-900/40 hover:border-emerald-700/60' : isMissingFields ? 'border-amber-900/40 hover:border-amber-700/60' : 'border-zinc-800 hover:border-zinc-700'} rounded-lg p-5 flex flex-col justify-between transition-all space-y-4`}
              >
                <div className="space-y-3">
                  {/* Card Title & Badges */}
                  <div className="flex justify-between items-start gap-3">
                    <div>
                      <button
                        type="button"
                        onClick={() => handleNavigateToProject(project.id)}
                        className="text-left text-sm font-bold text-white hover:text-red-400 transition-colors flex items-center gap-1.5 group cursor-pointer underline decoration-zinc-700 hover:decoration-red-400 underline-offset-4"
                        title="Clique para ir para o Projeto"
                      >
                        <span className="line-clamp-1">{project.clientName}</span>
                        <ExternalLink className="w-3.5 h-3.5 text-zinc-500 group-hover:text-red-400 transition-colors shrink-0" />
                      </button>
                      <p className="text-[11px] text-zinc-500 flex items-center gap-1 mt-1">
                        <Building2 className="w-3 h-3 text-zinc-600" />
                        <span>Tipo: {project.type}</span>
                      </p>
                    </div>

                    <div className="flex flex-col items-end gap-1">
                      {/* Green or Red Marker for CBM Analysis */}
                      {analyzed ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 uppercase tracking-wider">
                          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
                          Analisado
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold bg-red-500/10 text-red-400 border border-red-500/30 uppercase tracking-wider">
                          <span className="w-2 h-2 rounded-full bg-red-500 animate-pulse"></span>
                          Em Análise
                        </span>
                      )}

                      <span className="text-[9px] font-semibold text-zinc-500">
                        {project.status}
                      </span>
                    </div>
                  </div>

                  {/* Address Section */}
                  <div className="text-[11px] text-zinc-400 flex items-start gap-1.5 bg-zinc-900/40 p-2 rounded border border-zinc-900/60">
                    <MapPin className="w-3.5 h-3.5 text-zinc-500 shrink-0 mt-0.5" />
                    <span className="line-clamp-2">{project.address}</span>
                  </div>

                  {/* Protocol Management Form */}
                  <div className="bg-zinc-900 border border-zinc-850 rounded-lg p-3.5 space-y-3">
                    <div className="flex items-center justify-between border-b border-zinc-800 pb-1.5 mb-1.5">
                      <span className="text-[10px] uppercase font-bold text-zinc-400 flex items-center gap-1">
                        <Info className="w-3 h-3 text-red-500" />
                        Informações do Protocolo (CBM)
                      </span>
                      {isChecked && (
                        <span className="text-[9px] font-bold text-indigo-400 bg-indigo-500/10 px-1.5 py-0.5 rounded border border-indigo-500/20">
                          Etapa Cronograma
                        </span>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-[10px] font-bold text-zinc-500 mb-1">Data do Protocolo</label>
                        <input
                          type="date"
                          value={protocolDate || ''}
                          onChange={(e) => handleUpdateProjectProtocol(project.id, 'date', e.target.value)}
                          className="w-full px-2.5 py-1.5 bg-zinc-950 border border-zinc-800 text-white text-xs rounded-md focus:outline-none focus:ring-1 focus:ring-red-500 transition-all cursor-pointer"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-bold text-zinc-500 mb-1">Número do Protocolo</label>
                        <div className="relative">
                          <input
                            type="text"
                            value={protocolNumber || ''}
                            onChange={(e) => handleUpdateProjectProtocol(project.id, 'protocolNumber', e.target.value)}
                            placeholder="Ex: 12345/2026"
                            className="w-full px-2.5 py-1.5 bg-zinc-950 border border-zinc-800 text-white text-xs rounded-md focus:outline-none focus:ring-1 focus:ring-red-500 pr-8 transition-all font-mono"
                          />
                          {protocolNumber && (
                            <button
                              type="button"
                              onClick={() => handleCopy(protocolNumber, project.id)}
                              className="absolute right-2 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white transition-colors"
                              title="Copiar Protocolo"
                            >
                              {copiedId === project.id ? (
                                <Check className="w-3.5 h-3.5 text-emerald-500 animate-bounce" />
                              ) : (
                                <Copy className="w-3.5 h-3.5" />
                              )}
                            </button>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* CBM Analysis Control Block */}
                    <div className="pt-2.5 mt-2 border-t border-zinc-800/80 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 bg-zinc-950/60 p-2.5 rounded border border-zinc-800/50">
                      <label className="flex items-center gap-2 cursor-pointer select-none">
                        <input
                          type="checkbox"
                          checked={analyzed}
                          onChange={(e) => {
                            const isCheckedVal = e.target.checked;
                            handleUpdateProjectProtocol(project.id, 'analyzed', isCheckedVal);
                            if (isCheckedVal && !analyzedDate) {
                              handleUpdateProjectProtocol(project.id, 'analyzedDate', new Date().toISOString().split('T')[0]);
                            }
                          }}
                          className="w-4 h-4 rounded border-zinc-700 bg-zinc-900 text-emerald-600 focus:ring-emerald-600 cursor-pointer"
                        />
                        <span className={`text-xs font-bold ${analyzed ? 'text-emerald-400' : 'text-zinc-300'}`}>
                          Marcar como Analisado pelo CBM
                        </span>
                      </label>

                      {analyzed ? (
                        <div className="flex items-center gap-1.5 text-xs">
                          <span className="text-zinc-400 text-[10px] font-semibold">Data da Análise:</span>
                          <input
                            type="date"
                            value={analyzedDate || ''}
                            onChange={(e) => handleUpdateProjectProtocol(project.id, 'analyzedDate', e.target.value)}
                            className="px-2 py-1 bg-zinc-900 border border-emerald-800/60 text-white text-[11px] rounded focus:outline-none focus:ring-1 focus:ring-emerald-500 cursor-pointer font-medium"
                          />
                        </div>
                      ) : (
                        <span className="text-[10px] font-semibold text-red-400 bg-red-500/10 px-2 py-0.5 rounded border border-red-500/20">
                          Aguardando análise CBM
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                {/* Footer and Info */}
                <div className="border-t border-zinc-900/80 pt-3.5 mt-2 flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 text-xs">
                  <div className="text-zinc-500 text-[10px] flex flex-col">
                    <span>Data do Protocolo: {formatDateBR(protocolDate)}</span>
                    {analyzed && <span>Data da Análise: {formatDateBR(analyzedDate)}</span>}
                  </div>

                  <div className="flex items-center gap-2">
                    {/* Project Status quick modifier */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-[10px] text-zinc-500 font-semibold uppercase">Status Projeto:</span>
                      <select
                        value={project.status}
                        onChange={(e) => handleUpdateProjectStatus(project.id, e.target.value as Project['status'])}
                        className="bg-zinc-900 border border-zinc-800 text-zinc-300 text-[10px] font-semibold py-1 px-2 rounded focus:outline-none focus:ring-1 focus:ring-red-500 cursor-pointer"
                      >
                        <option value="Orçamento">Orçamento</option>
                        <option value="Aprovado">Aprovado</option>
                        <option value="Reprovado">Reprovado</option>
                        <option value="Levantamento">Levantamento</option>
                        <option value="Elaboração">Elaboração</option>
                        <option value="Protocolado">Protocolado</option>
                        <option value="Concluído">Concluído</option>
                      </select>
                    </div>

                    {/* Delete Protocol Button */}
                    <button
                      type="button"
                      onClick={() => setProtocolToDelete({ projectId: project.id, clientName: project.clientName })}
                      className="p-1.5 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded-md transition-colors border border-transparent hover:border-red-500/20 cursor-pointer"
                      title="Excluir Protocolo"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Confirmation Modal for Protocol Deletion */}
      {protocolToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl zoom-in-95 animate-in duration-200">
            <div className="flex items-center gap-3 text-red-500">
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base">Excluir Protocolo</h3>
                <p className="text-xs text-zinc-400">Esta ação não pode ser desfeita</p>
              </div>
            </div>

            <div className="text-sm text-zinc-300 bg-zinc-900/60 p-3.5 rounded-xl border border-zinc-800/80 space-y-2">
              <p>
                Tem certeza de que deseja excluir o registro de protocolo para <strong className="text-white">{protocolToDelete.clientName}</strong>?
              </p>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Isso removerá o número do protocolo, desmarcará a etapa de protocolo e redefinirá o status do projeto.
              </p>
            </div>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setProtocolToDelete(null)}
                className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteProtocol}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 shadow-lg shadow-red-600/20 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Excluir Protocolo
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
