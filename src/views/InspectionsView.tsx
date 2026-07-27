import React, { useState, useMemo } from 'react';
import { useStore } from '../store';
import { Inspection, Client, Lead, StoreSketch, Project } from '../types';
import { Search, Plus, Save, FileText, ClipboardCheck, ArrowLeft, Trash2, Edit2, Layers, Eye, Palette, Camera, Image, X } from 'lucide-react';
import imageCompression from 'browser-image-compression';
import { SketchCanvas, SketchElement, SketchLayers } from '../components/SketchCanvas';

const emptyInspectionData = {
  activity: '', builtArea: '', landArea: '', floors: '', height: '', ceilingHeight: '', constructionYear: '', constructionType: '',
  hasMezzanine: false, hasBasement: false, hasStorage: false,
  isolatedBuilding: false, sideAccess: false, backAccess: false, fireTruckAccess: false, publicHydrant: false, attachedNeighbors: false, externalRisk: false,
  employees: '', maxPublic: '', operatingHours: '', developedActivity: '', hasStock: false, hasOffice: false, hasKitchen: false, hasBathrooms: false,
  environments: [], combustibleMaterials: [], dangerousProducts: [], doorsAndExits: [], corridors: [], extinguishers: [], emergencyLights: [], signs: [],
  electrical: {}, roofing: {}, equipment: [], accessibility: {}, photos: {}, documents: {}, generalNotes: '', pendingItems: [],
  conclusion: { sufficientInfo: false, returnNeeded: false, additionalDocs: false, additionalMeasurements: false }
};

export function InspectionsView() {
  const { data, updateData } = useStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [mainTab, setMainTab] = useState<'checklists' | 'croquis'>('checklists');
  const [activeSketchId, setActiveSketchId] = useState<string | null>(null);
  const [sketchEditorData, setSketchEditorData] = useState<{
    isOpen: boolean;
    name: string;
    elements: SketchElement[];
    layers: SketchLayers;
    inspectionId?: string;
  } | null>(null);

  const [editingInspection, setEditingInspection] = useState<Inspection | null>(() => {
    const draft = sessionStorage.getItem('draft_inspection');
    if (draft) {
      try {
        return JSON.parse(draft);
      } catch(e) {}
    }
    return null;
  });

  const inspections = data.inspections || [];
  const clients = data.clients || [];
  const leads = data.leads || [];
  const sketches = data.sketches || [];

  const [isNewSketchModalOpen, setIsNewSketchModalOpen] = useState(false);
  const [newSketchName, setNewSketchName] = useState('');
  const [shouldLinkInspection, setShouldLinkInspection] = useState(false);
  const [selectedInspectionId, setSelectedInspectionId] = useState('');

  // Confirmation modal states for Inspections & Croquis deletion
  const [inspectionToDelete, setInspectionToDelete] = useState<{ id: string; clientName: string } | null>(null);
  const [sketchToDelete, setSketchToDelete] = useState<{ id: string; name: string } | null>(null);

  const handleCreateNewSketch = () => {
    setNewSketchName('');
    setShouldLinkInspection(false);
    setSelectedInspectionId(inspections.length > 0 ? inspections[0].id : '');
    setIsNewSketchModalOpen(true);
  };

  const handleConfirmCreateSketch = () => {
    if (!newSketchName.trim()) return;

    setSketchEditorData({
      isOpen: true,
      name: newSketchName.trim(),
      elements: [],
      layers: {
        paredes: '#ffffff',
        medidas: '#3b82f6',
        blocos_civis: '#10b981',
        ppci: '#ef4444'
      },
      inspectionId: shouldLinkInspection && selectedInspectionId ? selectedInspectionId : undefined
    });
    setActiveSketchId(null);
    setIsNewSketchModalOpen(false);
  };

  const handleEditSketch = (sketch: StoreSketch) => {
    setActiveSketchId(sketch.id);
    setSketchEditorData({
      isOpen: true,
      name: sketch.name,
      elements: sketch.elements as any,
      layers: sketch.layers,
      inspectionId: sketch.inspectionId
    });
  };

  const handleDeleteSketch = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    const sketch = sketches.find(s => s.id === id);
    setSketchToDelete({ id, name: sketch?.name || 'Croqui' });
  };

  const handleConfirmDeleteSketch = () => {
    if (!sketchToDelete) return;
    updateData({ sketches: sketches.filter(s => s.id !== sketchToDelete.id) });
    setSketchToDelete(null);
  };

  const handleSaveSketchGlobal = (elements: SketchElement[], layers: SketchLayers) => {
    if (!sketchEditorData) return;
    
    if (activeSketchId) {
      const updated = sketches.map(s => s.id === activeSketchId ? {
        ...s,
        elements: elements as any,
        layers
      } : s);
      updateData({ sketches: updated });
    } else {
      const newSketch: StoreSketch = {
        id: `sketch-${Date.now()}`,
        name: sketchEditorData.name,
        inspectionId: sketchEditorData.inspectionId,
        elements: elements as any,
        layers,
        createdAt: new Date().toISOString()
      };
      updateData({ sketches: [...sketches, newSketch] });
    }
    
    setSketchEditorData(null);
    setActiveSketchId(null);
  };

  const filteredInspections = useMemo(() => {
    return inspections.filter(i => 
      i.clientName.toLowerCase().includes(searchQuery.toLowerCase()) || 
      i.companyName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      i.city.toLowerCase().includes(searchQuery.toLowerCase())
    );
  }, [inspections, searchQuery]);

  const filteredSketches = useMemo(() => {
    return sketches.filter(s => {
      const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase());
      const linkedInspection = inspections.find(i => i.id === s.inspectionId);
      const matchesInspection = linkedInspection 
        ? linkedInspection.clientName.toLowerCase().includes(searchQuery.toLowerCase()) || linkedInspection.companyName.toLowerCase().includes(searchQuery.toLowerCase())
        : false;
      return matchesSearch || matchesInspection;
    });
  }, [sketches, inspections, searchQuery]);

  const handleCreateNew = () => {
    const newInspection: Inspection = {
      id: `insp-${Date.now()}`,
      date: new Date().toISOString().split('T')[0],
      clientName: '',
      companyName: '',
      address: '',
      city: '',
      inspector: '',
      status: 'Pendente',
      data: JSON.parse(JSON.stringify(emptyInspectionData))
    };
    setEditingInspection(newInspection);
  };

  const saveInspection = (inspection: Inspection) => {
    let updatedClients = [...clients];
    let updatedInspection = { ...inspection };

    if (!inspection.clientId && inspection.clientName && inspection.clientName.trim() !== '') {
      const trimmedName = inspection.clientName.trim();
      const existingClient = clients.find(c => c.name.toLowerCase() === trimmedName.toLowerCase());
      
      if (existingClient) {
        updatedInspection.clientId = existingClient.id;
      } else {
        const newClientId = `c-${Date.now()}`;
        const newClient: Client = {
          id: newClientId,
          name: trimmedName,
          document: '',
          contactName: inspection.companyName || '',
          email: '',
          address: inspection.address || '',
          city: inspection.city || '',
          state: '',
          cep: '',
          phone: '',
          extinguishers: []
        };
        updatedClients.push(newClient);
        updatedInspection.clientId = newClientId;
      }
    }

    const isNew = !inspections.some(i => i.id === updatedInspection.id);
    const newInspections = isNew 
      ? [...inspections, updatedInspection]
      : inspections.map(i => i.id === updatedInspection.id ? updatedInspection : i);
    
    let updatedProjects = [...(data.projects || [])];
    if (isNew) {
      const projectCodes = updatedProjects
        .map(p => parseInt(p.id))
        .filter(id => !isNaN(id));
      const nextId = projectCodes.length > 0 ? Math.max(...projectCodes) + 1 : 1000;

      // Map inspection activity/type to Project's types
      let projectType: 'Comercial' | 'Residencial' | 'Industrial' | 'Depósito de GLP' = 'Comercial';
      const activityLower = (updatedInspection.data?.activity || '').toLowerCase();
      const constTypeLower = (updatedInspection.data?.constructionType || '').toLowerCase();
      
      if (activityLower.includes('glp') || activityLower.includes('gás') || activityLower.includes('depósito')) {
        projectType = 'Depósito de GLP';
      } else if (activityLower.includes('indús') || activityLower.includes('fábrica') || activityLower.includes('metalúrgica')) {
        projectType = 'Industrial';
      } else if (constTypeLower.includes('resid') || constTypeLower.includes('condomínio') || activityLower.includes('resid')) {
        projectType = 'Residencial';
      }

      const newProject: Project = {
        id: nextId.toString(),
        clientId: updatedInspection.clientId,
        clientName: updatedInspection.clientName || updatedInspection.companyName || 'Cliente sem nome',
        address: updatedInspection.address + (updatedInspection.city ? `, ${updatedInspection.city}` : ''),
        status: 'Levantamento',
        type: projectType,
        value: 0,
        paymentMethods: [],
        discountPercentage: 5,
        interestPercentage: 12,
        checklist: {
          plantas_arquitetonicas: false,
          extintores: !!(updatedInspection.data?.extinguishers && updatedInspection.data.extinguishers.length > 0),
          sinalizacao: !!(updatedInspection.data?.signs && updatedInspection.data.signs.length > 0),
          iluminacao_emergencia: !!(updatedInspection.data?.emergencyLights && updatedInspection.data.emergencyLights.length > 0),
          central_glp: activityLower.includes('glp') || activityLower.includes('gás'),
          saidas_emergencia: !!(updatedInspection.data?.doorsAndExits && updatedInspection.data.doorsAndExits.length > 0),
        },
        notes: `Criado automaticamente a partir do checklist de vistoria realizado em ${updatedInspection.date}.` + 
               (updatedInspection.data?.generalNotes ? ` Observações da vistoria: ${updatedInspection.data.generalNotes}` : ''),
        lastVisit: updatedInspection.date,
      };
      updatedProjects.push(newProject);
    }

    updateData({ 
      inspections: newInspections,
      clients: updatedClients,
      projects: updatedProjects
    });
    setEditingInspection(null);
  };

  const deleteInspection = (id: string) => {
    const inspection = inspections.find(i => i.id === id);
    setInspectionToDelete({
      id,
      clientName: inspection?.clientName || inspection?.companyName || 'Vistoria'
    });
  };

  const handleConfirmDeleteInspection = () => {
    if (!inspectionToDelete) return;
    updateData({ inspections: inspections.filter(i => i.id !== inspectionToDelete.id) });
    if (editingInspection?.id === inspectionToDelete.id) {
      setEditingInspection(null);
    }
    setInspectionToDelete(null);
  };

  return (
    <>
      <div className="flex-1 flex flex-col min-h-0 bg-black">
        <div className="p-6 border-b border-zinc-900 flex-shrink-0 flex items-center justify-between">
          <div>
            <h1 className="text-2xl font-bold text-white flex items-center gap-2">
              <ClipboardCheck className="w-7 h-7 text-emerald-500" />
              Checklist & Croquis
            </h1>
            <p className="text-zinc-400 mt-1">Gerencie formulários de vistoria PPCI e desenhe os croquis de loja</p>
          </div>
          <div className="flex gap-2">
            {mainTab === 'checklists' ? (
              <button
                onClick={handleCreateNew}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors text-sm"
              >
                <Plus className="w-4 h-4" />
                Nova Vistoria
              </button>
            ) : (
              <button
                onClick={handleCreateNewSketch}
                className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors text-sm"
              >
                <Plus className="w-4 h-4" />
                Novo Croqui
              </button>
            )}
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="px-6 border-b border-zinc-900 bg-zinc-950 flex gap-6">
          <button
            onClick={() => setMainTab('checklists')}
            className={`py-3 px-1 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
              mainTab === 'checklists' ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-zinc-400 hover:text-white'
            }`}
          >
            <ClipboardCheck className="w-4 h-4" /> Checklists de Vistoria
          </button>
          <button
            onClick={() => setMainTab('croquis')}
            className={`py-3 px-1 text-sm font-medium border-b-2 transition-colors flex items-center gap-2 ${
              mainTab === 'croquis' ? 'border-emerald-500 text-emerald-400' : 'border-transparent text-zinc-400 hover:text-white'
            }`}
          >
            <Layers className="w-4 h-4" /> Croquis de Lojas
          </button>
        </div>

        <div className="p-6 flex-1 overflow-y-auto">
          {/* SEARCH BAR */}
          <div className="mb-6 relative max-w-md">
            <Search className="w-5 h-5 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder={mainTab === 'checklists' ? "Buscar vistorias..." : "Buscar croquis por nome ou cliente..."}
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-zinc-900 border border-zinc-800 text-white pl-10 pr-4 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500"
            />
          </div>

          {mainTab === 'checklists' ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredInspections.map(inspection => {
                const linkedSketch = sketches.find(s => s.inspectionId === inspection.id);
                return (
                  <div key={inspection.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 hover:border-zinc-700 transition-colors">
                    <div className="flex justify-between items-start mb-3">
                      <div className="flex items-center gap-2">
                        <FileText className="w-5 h-5 text-zinc-400" />
                        <span className={`text-xs font-semibold px-2 py-0.5 rounded-full ${
                          inspection.status === 'Concluída' ? 'bg-emerald-500/10 text-emerald-500' : 'bg-amber-500/10 text-amber-500'
                        }`}>
                          {inspection.status}
                        </span>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => setEditingInspection(inspection)} className="text-zinc-400 hover:text-white p-1" title="Editar"><Edit2 className="w-4 h-4" /></button>
                        <button onClick={() => deleteInspection(inspection.id)} className="text-zinc-400 hover:text-red-500 p-1" title="Excluir"><Trash2 className="w-4 h-4" /></button>
                      </div>
                    </div>
                    <h3 className="font-bold text-white text-lg">{inspection.clientName || 'Sem Nome'}</h3>
                    <p className="text-zinc-400 text-sm mb-4">{inspection.companyName}</p>
                    
                    <div className="space-y-1 text-sm text-zinc-500 mb-4">
                      <div className="flex justify-between">
                        <span>Data:</span>
                        <span className="text-zinc-300">{new Date(inspection.date + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Cidade:</span>
                        <span className="text-zinc-300">{inspection.city || '-'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Responsável:</span>
                        <span className="text-zinc-300">{inspection.inspector || '-'}</span>
                      </div>
                    </div>

                    {linkedSketch ? (
                      <div className="border-t border-zinc-800 pt-3 mt-3 flex items-center justify-between text-xs text-emerald-400">
                        <span className="flex items-center gap-1">
                          <Layers className="w-3.5 h-3.5" /> Croqui desenhado
                        </span>
                        <button 
                          onClick={() => handleEditSketch(linkedSketch)}
                          className="text-zinc-400 hover:text-white bg-zinc-800 hover:bg-zinc-750 px-2 py-1.5 rounded text-xs transition-colors"
                        >
                          Ver Desenho
                        </button>
                      </div>
                    ) : (
                      <div className="border-t border-zinc-800 pt-3 mt-3 flex items-center justify-between text-xs text-zinc-500">
                        <span>Sem croqui desenhado</span>
                        <button 
                          onClick={() => {
                            setSketchEditorData({
                              isOpen: true,
                              name: `Croqui - ${inspection.clientName || 'Sem Nome'}`,
                              elements: [],
                              layers: {
                                paredes: '#ffffff',
                                medidas: '#3b82f6',
                                blocos_civis: '#10b981',
                                ppci: '#ef4444'
                              },
                              inspectionId: inspection.id
                            });
                            setActiveSketchId(null);
                          }}
                          className="text-emerald-400 hover:text-emerald-300 bg-emerald-500/10 px-2.5 py-1 rounded text-xs font-medium"
                        >
                          + Desenhar
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
              {filteredInspections.length === 0 && (
                <div className="col-span-full text-center py-12 text-zinc-500 bg-zinc-900/50 rounded-xl border border-zinc-800 border-dashed">
                  Nenhuma vistoria encontrada.
                </div>
              )}
            </div>
          ) : (
            /* CROQUIS MAIN TAB VIEW */
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredSketches.map(sketch => {
                const linkedInspection = inspections.find(i => i.id === sketch.inspectionId);
                const wallsCount = sketch.elements.filter(e => e.type === 'wall').length;
                const measuresCount = sketch.elements.filter(e => e.type === 'measure').length;
                const blocksCount = sketch.elements.filter(e => e.type === 'block').length;
                return (
                  <div key={sketch.id} className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 hover:border-zinc-700 transition-colors flex flex-col justify-between">
                    <div>
                      <div className="flex justify-between items-start mb-3">
                        <div className="flex items-center gap-2">
                          <Layers className="w-5 h-5 text-emerald-400" />
                          <span className="text-[10px] bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded-full font-mono">
                            ID: {sketch.id.split('-')[1] || sketch.id}
                          </span>
                        </div>
                        <div className="flex gap-2">
                          <button onClick={() => handleEditSketch(sketch)} className="text-zinc-400 hover:text-white p-1" title="Editar Croqui"><Edit2 className="w-4 h-4" /></button>
                          <button onClick={(e) => handleDeleteSketch(sketch.id, e)} className="text-zinc-400 hover:text-red-500 p-1" title="Excluir"><Trash2 className="w-4 h-4" /></button>
                        </div>
                      </div>
                      <h3 className="font-bold text-white text-lg mb-1">{sketch.name}</h3>
                      {linkedInspection ? (
                        <p className="text-xs text-zinc-400 mb-4 flex items-center gap-1">
                          <ClipboardCheck className="w-3.5 h-3.5 text-zinc-500" />
                          Vinculado a: <span className="text-emerald-400 font-medium">{linkedInspection.clientName}</span>
                        </p>
                      ) : (
                        <p className="text-xs text-zinc-500 mb-4 italic">Croqui avulso (sem vínculo)</p>
                      )}
                      
                      {/* STATS */}
                      <div className="grid grid-cols-3 gap-2 bg-zinc-950 p-2.5 rounded-lg border border-zinc-800 mb-4 text-center">
                        <div>
                          <div className="text-xs font-bold text-zinc-300">{wallsCount}</div>
                          <div className="text-[9px] text-zinc-500 uppercase tracking-wider font-semibold">Paredes</div>
                        </div>
                        <div>
                          <div className="text-xs font-bold text-zinc-300">{measuresCount}</div>
                          <div className="text-[9px] text-zinc-500 uppercase tracking-wider font-semibold">Medidas</div>
                        </div>
                        <div>
                          <div className="text-xs font-bold text-zinc-300">{blocksCount}</div>
                          <div className="text-[9px] text-zinc-500 uppercase tracking-wider font-semibold">Equip./Blocos</div>
                        </div>
                      </div>
                    </div>

                    <button 
                      onClick={() => handleEditSketch(sketch)}
                      className="w-full bg-emerald-600/10 hover:bg-emerald-600 text-emerald-400 hover:text-white py-2 rounded-lg text-sm font-semibold border border-emerald-500/20 hover:border-emerald-500 transition-all flex items-center justify-center gap-1.5"
                    >
                      <Palette className="w-4 h-4" /> Abrir Prancha de Desenho
                    </button>
                  </div>
                );
              })}
              {filteredSketches.length === 0 && (
                <div className="col-span-full text-center py-12 text-zinc-500 bg-zinc-900/50 rounded-xl border border-zinc-800 border-dashed">
                  Nenhum croqui encontrado. Clique em "Novo Croqui" para começar a desenhar.
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {editingInspection && (
        <InspectionEditor 
          inspection={editingInspection} 
          onSave={saveInspection} 
          onDelete={(id) => deleteInspection(id)}
          onCancel={() => setEditingInspection(null)} 
          clients={clients} 
          leads={leads} 
          sketches={sketches}
          updateSketches={(updated) => updateData({ sketches: updated })}
        />
      )}

      {/* FULLSCREEN OVERLAY FOR SKETCH CANVAS */}
      {sketchEditorData?.isOpen && (
        <SketchCanvas 
          title={sketchEditorData.name}
          initialElements={sketchEditorData.elements}
          initialLayers={sketchEditorData.layers}
          onSave={handleSaveSketchGlobal}
          onCancel={() => {
            setSketchEditorData(null);
            setActiveSketchId(null);
          }}
        />
      )}

      {/* CUSTOM MODAL FOR NEW SKETCH CREATION */}
      {isNewSketchModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/75 backdrop-blur-sm p-4">
          <div className="bg-zinc-900 border border-zinc-800 rounded-2xl w-full max-w-md p-6 shadow-2xl animate-in fade-in zoom-in duration-200">
            <h3 className="text-xl font-bold text-white mb-4">Criar Novo Croqui</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">
                  Nome ou identificação do Croqui <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  placeholder="Ex: Esboço Loja Central, Pavimento Térreo"
                  value={newSketchName}
                  onChange={(e) => setNewSketchName(e.target.value)}
                  className="w-full bg-zinc-950 border border-zinc-800 text-white px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                  autoFocus
                />
              </div>

              <div className="flex items-center gap-2 pt-2">
                <input
                  type="checkbox"
                  id="link-inspection-checkbox"
                  checked={shouldLinkInspection}
                  onChange={(e) => {
                    setShouldLinkInspection(e.target.checked);
                    if (e.target.checked && inspections.length > 0) {
                      setSelectedInspectionId(inspections[0].id);
                    } else {
                      setSelectedInspectionId('');
                    }
                  }}
                  className="rounded border-zinc-700 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-zinc-900 bg-zinc-900"
                />
                <label htmlFor="link-inspection-checkbox" className="text-sm text-zinc-300 cursor-pointer select-none">
                  Associar este croqui a uma vistoria existente
                </label>
              </div>

              {shouldLinkInspection && (
                <div className="animate-in slide-in-from-top-1 duration-150">
                  <label className="block text-xs font-medium text-zinc-400 mb-1">
                    Selecione a Vistoria
                  </label>
                  {inspections.length > 0 ? (
                    <select
                      value={selectedInspectionId}
                      onChange={(e) => setSelectedInspectionId(e.target.value)}
                      className="w-full bg-zinc-950 border border-zinc-800 text-white px-3 py-2 rounded-lg focus:outline-none focus:ring-2 focus:ring-emerald-500 text-sm"
                    >
                      {inspections.map((insp) => (
                        <option key={insp.id} value={insp.id}>
                          {insp.clientName || 'Sem Nome'} {insp.companyName ? `(${insp.companyName})` : ''} - {new Date(insp.date + 'T00:00:00').toLocaleDateString('pt-BR')}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <p className="text-xs text-amber-500 italic mt-1">
                      Nenhuma vistoria cadastrada para vincular.
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className="flex justify-end gap-3 mt-6">
              <button
                onClick={() => setIsNewSketchModalOpen(false)}
                className="bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirmCreateSketch}
                disabled={!newSketchName.trim() || (shouldLinkInspection && !selectedInspectionId)}
                className="bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:hover:bg-emerald-600 text-white px-4 py-2 rounded-lg font-medium text-sm transition-colors"
              >
                Criar Croqui
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal confirmation for Inspection deletion */}
      {inspectionToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl zoom-in-95 animate-in duration-200">
            <div className="flex items-center gap-3 text-red-500">
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base">Excluir Vistoria</h3>
                <p className="text-xs text-zinc-400">Esta ação removerá o checklist permanentemente</p>
              </div>
            </div>

            <p className="text-sm text-zinc-300 bg-zinc-900/60 p-3.5 rounded-xl border border-zinc-800/80">
              Tem certeza de que deseja excluir a vistoria de <strong className="text-white">{inspectionToDelete.clientName}</strong>?
            </p>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setInspectionToDelete(null)}
                className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteInspection}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 shadow-lg shadow-red-600/20 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Excluir Vistoria
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal confirmation for Croqui deletion */}
      {sketchToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-md p-6 space-y-4 shadow-2xl zoom-in-95 animate-in duration-200">
            <div className="flex items-center gap-3 text-red-500">
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base">Excluir Croqui</h3>
                <p className="text-xs text-zinc-400">Esta ação removerá o desenho do croqui</p>
              </div>
            </div>

            <p className="text-sm text-zinc-300 bg-zinc-900/60 p-3.5 rounded-xl border border-zinc-800/80">
              Tem certeza de que deseja excluir o croqui <strong className="text-white">{sketchToDelete.name}</strong>?
            </p>

            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSketchToDelete(null)}
                className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 hover:text-white rounded-lg text-xs font-semibold transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleConfirmDeleteSketch}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold transition-colors flex items-center gap-1.5 shadow-lg shadow-red-600/20 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Excluir Croqui
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

// ----- EDITOR COMPONENT -----

interface InspectionEditorProps {
  inspection: Inspection;
  onSave: (i: Inspection) => void;
  onDelete?: (id: string) => void;
  onCancel: () => void;
  clients: Client[];
  leads: Lead[];
  sketches: StoreSketch[];
  updateSketches: (sketches: StoreSketch[]) => void;
}

function InspectionEditor({ inspection: initial, onSave, onDelete, onCancel, clients, leads, sketches, updateSketches }: InspectionEditorProps) {
  const [inspection, setInspection] = useState<Inspection>(JSON.parse(JSON.stringify(initial)));
  const [activeTab, setActiveTab] = useState(() => {
    const savedTab = sessionStorage.getItem('draft_inspection_tab');
    return savedTab ? parseInt(savedTab, 10) : 0;
  });
  const [innerSketchOpen, setInnerSketchOpen] = useState(false);
  const [photoToDeleteInForm, setPhotoToDeleteInForm] = useState<string | null>(null);

  React.useEffect(() => {
    sessionStorage.setItem('draft_inspection', JSON.stringify(inspection));
  }, [inspection]);

  React.useEffect(() => {
    sessionStorage.setItem('draft_inspection_tab', activeTab.toString());
  }, [activeTab]);

  const handleSave = () => {
    sessionStorage.removeItem('draft_inspection');
    sessionStorage.removeItem('draft_inspection_tab');
    onSave(inspection);
  };

  const handleCancel = () => {
    sessionStorage.removeItem('draft_inspection');
    sessionStorage.removeItem('draft_inspection_tab');
    onCancel();
  };

  const updateHeader = (field: keyof Inspection, value: any) => {
    setInspection(prev => ({ ...prev, [field]: value }));
  };

  const updateData = (field: string, value: any) => {
    setInspection(prev => ({
      ...prev,
      data: { ...prev.data, [field]: value }
    }));
  };
  
  const updateNestedData = (section: string, field: string, value: any) => {
    setInspection(prev => ({
      ...prev,
      data: { 
        ...prev.data, 
        [section]: { 
          ...(prev.data as any)[section], 
          [field]: value 
        } 
      }
    }));
  };

  const handleLinkClient = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    if (!val) {
      updateHeader('clientId', '');
      return;
    }
    const [type, id] = val.split(':');
    const entity = type === 'client' ? clients.find(c => c.id === id) : leads.find(l => l.id === id);
    if (entity) {
      updateHeader('clientId', id);
      updateHeader('clientName', entity.name);
      updateHeader('address', entity.address || '');
      updateHeader('city', entity.city || '');
    }
  };

  const handlePhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const options = {
        maxSizeMB: 1,
        maxWidthOrHeight: 1280,
        useWebWorker: true
      };
      
      const compressedFile = await imageCompression(file, options);
      
      const reader = new FileReader();
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string;
        const newPhoto = {
          id: `photo-${Date.now()}`,
          name: file.name,
          dataUrl
        };
        
        const currentPhotos = inspection.data.uploadedPhotos || [];
        updateData('uploadedPhotos', [...currentPhotos, newPhoto]);
      };
      reader.readAsDataURL(compressedFile);
    } catch (error) {
      console.error('Error compressing image:', error);
      alert('Erro ao processar imagem. Tente uma foto com resolução menor.');
    }
  };

  const removePhoto = (id: string) => {
    const currentPhotos = inspection.data.uploadedPhotos || [];
    updateData('uploadedPhotos', currentPhotos.filter(p => p.id !== id));
  };

  const linkedSketch = sketches.find(s => s.inspectionId === inspection.id);

  const handleSaveInnerSketch = (elements: SketchElement[], layers: SketchLayers) => {
    if (linkedSketch) {
      const updated = sketches.map(s => s.inspectionId === inspection.id ? {
        ...s,
        elements: elements as any,
        layers
      } : s);
      updateSketches(updated);
    } else {
      const newSketch: StoreSketch = {
        id: `sketch-${Date.now()}`,
        name: `Croqui - ${inspection.clientName || 'Sem Nome'}`,
        inspectionId: inspection.id,
        elements: elements as any,
        layers,
        createdAt: new Date().toISOString()
      };
      updateSketches([...sketches, newSketch]);
    }
    setInnerSketchOpen(false);
  };

  const tabs = [
    "Cabeçalho & Identificação",
    "Entorno & Ocupação",
    "Listas (Extintores, etc)",
    "Sinalização & Instalações",
    "Checklists, Fotos & Conclusão",
    "Croqui da Loja"
  ];

  return (
    <div className="fixed inset-0 z-50 flex flex-col bg-black overflow-hidden animate-in fade-in duration-200">
      <div className="p-4 border-b border-zinc-900 flex-shrink-0 flex items-center justify-between bg-zinc-950">
        <div className="flex items-center gap-4">
          <button onClick={handleCancel} className="p-2 hover:bg-zinc-800 rounded-lg text-zinc-400">
            <ArrowLeft className="w-5 h-5" />
          </button>
          <div>
            <h1 className="text-xl font-bold text-white">Editar Vistoria</h1>
            <p className="text-xs text-zinc-500">{inspection.clientName || 'Nova Vistoria'}</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <select 
            value={inspection.status}
            onChange={(e) => updateHeader('status', e.target.value)}
            className="bg-zinc-900 border border-zinc-800 text-white px-3 py-2 rounded-md text-sm focus:outline-none"
          >
            <option value="Pendente">Pendente</option>
            <option value="Concluída">Concluída</option>
          </select>

          {onDelete && (
            <button
              type="button"
              onClick={() => onDelete(inspection.id)}
              className="bg-red-500/10 hover:bg-red-500/20 text-red-400 border border-red-500/30 px-3 py-2 rounded-lg font-medium flex items-center gap-1.5 transition-colors text-sm cursor-pointer"
              title="Excluir Vistoria"
            >
              <Trash2 className="w-4 h-4" /> Excluir
            </button>
          )}

          <button
            onClick={handleSave}
            className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors cursor-pointer"
          >
            <Save className="w-4 h-4" /> Salvar
          </button>
        </div>
      </div>

      <div className="flex-shrink-0 border-b border-zinc-900 bg-zinc-900/30 overflow-x-auto">
        <div className="flex p-4 gap-2 items-center min-w-max">
          <div className="text-sm font-medium text-zinc-400 mr-4">
            Passo {activeTab + 1} de {tabs.length}
          </div>
          <div className="flex-1 flex items-center">
            {tabs.map((tab, idx) => (
              <React.Fragment key={idx}>
                <div 
                  className={`flex items-center justify-center w-8 h-8 rounded-full text-xs font-bold ${
                    activeTab === idx 
                      ? 'bg-emerald-600 text-white' 
                      : activeTab > idx 
                        ? 'bg-emerald-900/50 text-emerald-500' 
                        : 'bg-zinc-800 text-zinc-500'
                  }`}
                >
                  {idx + 1}
                </div>
                <span className={`ml-2 text-sm hidden sm:block ${activeTab === idx ? 'text-white font-medium' : 'text-zinc-500'}`}>
                  {tab}
                </span>
                {idx < tabs.length - 1 && (
                  <div className="w-8 h-px bg-zinc-800 mx-2"></div>
                )}
              </React.Fragment>
            ))}
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-6 space-y-8">
        
        {activeTab === 0 && (
          <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-300">
            <section className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-xl space-y-4">
              <h2 className="text-lg font-semibold text-white border-b border-zinc-800 pb-2">Vínculo & Cabeçalho</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="col-span-full">
                  <label className="block text-xs font-medium text-zinc-500 mb-1">Vincular a Cliente / Lead (Opcional)</label>
                  <select
                    onChange={handleLinkClient}
                    value={inspection.clientId ? (clients.find(c=>c.id===inspection.clientId) ? `client:${inspection.clientId}` : `lead:${inspection.clientId}`) : ''}
                    className="w-full bg-zinc-900 border border-zinc-800 text-white px-3 py-2 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  >
                    <option value="">Sem Vínculo (Preenchimento Manual)</option>
                    <optgroup label="Clientes">
                      {clients.map(c => <option key={c.id} value={`client:${c.id}`}>{c.name}</option>)}
                    </optgroup>
                    <optgroup label="Leads">
                      {leads.map(l => <option key={l.id} value={`lead:${l.id}`}>{l.name}</option>)}
                    </optgroup>
                  </select>
                </div>
                
                <TextInput label="Nome do Cliente" value={inspection.clientName} onChange={v => updateHeader('clientName', v)} />
                <TextInput label="Empresa (Razão Social)" value={inspection.companyName} onChange={v => updateHeader('companyName', v)} />
                <TextInput label="Endereço" value={inspection.address} onChange={v => updateHeader('address', v)} />
                <TextInput label="Município" value={inspection.city} onChange={v => updateHeader('city', v)} />
                <TextInput label="Data da Vistoria" type="date" value={inspection.date} onChange={v => updateHeader('date', v)} />
                <TextInput label="Responsável pela Vistoria" value={inspection.inspector} onChange={v => updateHeader('inspector', v)} />
              </div>
            </section>

            <section className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-xl space-y-4">
              <h2 className="text-lg font-semibold text-white border-b border-zinc-800 pb-2">1. Identificação da Edificação</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <TextInput label="Atividade Principal" value={inspection.data.activity} onChange={v => updateData('activity', v)} />
                <TextInput label="Área Construída (m²)" value={inspection.data.builtArea} onChange={v => updateData('builtArea', v)} />
                <TextInput label="Área do Terreno (m²)" value={inspection.data.landArea} onChange={v => updateData('landArea', v)} />
                <TextInput label="Número de Pavimentos" value={inspection.data.floors} onChange={v => updateData('floors', v)} />
                <TextInput label="Altura Aproximada" value={inspection.data.height} onChange={v => updateData('height', v)} />
                <TextInput label="Pé-direito" value={inspection.data.ceilingHeight} onChange={v => updateData('ceilingHeight', v)} />
                <TextInput label="Ano da Construção" value={inspection.data.constructionYear} onChange={v => updateData('constructionYear', v)} />
                <TextInput label="Tipo Construtivo" value={inspection.data.constructionType} onChange={v => updateData('constructionType', v)} />
                <div className="col-span-full flex gap-6 mt-2">
                  <Checkbox label="Existe mezanino?" checked={inspection.data.hasMezzanine} onChange={v => updateData('hasMezzanine', v)} />
                  <Checkbox label="Existe subsolo?" checked={inspection.data.hasBasement} onChange={v => updateData('hasBasement', v)} />
                  <Checkbox label="Existe depósito?" checked={inspection.data.hasStorage} onChange={v => updateData('hasStorage', v)} />
                </div>
              </div>
            </section>
          </div>
        )}

        {activeTab === 1 && (
          <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-300">
            <section className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-xl space-y-4">
              <h2 className="text-lg font-semibold text-white border-b border-zinc-800 pb-2">2. Entorno</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Checkbox label="Edificação isolada no lote" checked={inspection.data.isolatedBuilding} onChange={v => updateData('isolatedBuilding', v)} />
                <Checkbox label="Existe acesso lateral" checked={inspection.data.sideAccess} onChange={v => updateData('sideAccess', v)} />
                <Checkbox label="Existe acesso pelos fundos" checked={inspection.data.backAccess} onChange={v => updateData('backAccess', v)} />
                <Checkbox label="Rua permite acesso de viaturas" checked={inspection.data.fireTruckAccess} onChange={v => updateData('fireTruckAccess', v)} />
                <Checkbox label="Existe hidrante público próximo" checked={inspection.data.publicHydrant} onChange={v => updateData('publicHydrant', v)} />
                <Checkbox label="Há edificações vizinhas geminadas" checked={inspection.data.attachedNeighbors} onChange={v => updateData('attachedNeighbors', v)} />
                <Checkbox label="Existe risco externo relevante" checked={inspection.data.externalRisk} onChange={v => updateData('externalRisk', v)} />
              </div>
            </section>

            <section className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-xl space-y-4">
              <h2 className="text-lg font-semibold text-white border-b border-zinc-800 pb-2">3. Ocupação</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <TextInput label="Número de Funcionários" value={inspection.data.employees} onChange={v => updateData('employees', v)} />
                <TextInput label="Público Máximo Estimado" value={inspection.data.maxPublic} onChange={v => updateData('maxPublic', v)} />
                <TextInput label="Horário de Funcionamento" value={inspection.data.operatingHours} onChange={v => updateData('operatingHours', v)} />
                <TextInput label="Atividade Desenvolvida" value={inspection.data.developedActivity} onChange={v => updateData('developedActivity', v)} />
                <div className="col-span-full flex flex-wrap gap-6 mt-2">
                  <Checkbox label="Possui estoque?" checked={inspection.data.hasStock} onChange={v => updateData('hasStock', v)} />
                  <Checkbox label="Possui escritório?" checked={inspection.data.hasOffice} onChange={v => updateData('hasOffice', v)} />
                  <Checkbox label="Possui copa/cozinha?" checked={inspection.data.hasKitchen} onChange={v => updateData('hasKitchen', v)} />
                  <Checkbox label="Possui sanitários?" checked={inspection.data.hasBathrooms} onChange={v => updateData('hasBathrooms', v)} />
                </div>
              </div>
            </section>
          </div>
        )}

        {activeTab === 2 && (
          <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in duration-300">
            <DynamicList 
              title="4. Ambientes"
              items={inspection.data.environments}
              columns={[{key:'name', label:'Ambiente'}, {key:'area', label:'Área (m²)'}, {key:'ceilingHeight', label:'Pé-direito'}, {key:'notes', label:'Observações'}]}
              onChange={(newList) => updateData('environments', newList)}
            />
            
            <DynamicList 
              title="5. Materiais Combustíveis"
              items={inspection.data.combustibleMaterials}
              columns={[{key:'material', label:'Material'}, {key:'quantity', label:'Quantidade'}, {key:'location', label:'Local'}, {key:'notes', label:'Obs'}]}
              onChange={(newList) => updateData('combustibleMaterials', newList)}
            />

            <DynamicList 
              title="6. Produtos Perigosos"
              items={inspection.data.dangerousProducts}
              columns={[{key:'product', label:'Produto'}, {key:'quantity', label:'Quantidade'}, {key:'location', label:'Local de armazenamento'}, {key:'notes', label:'Obs'}]}
              onChange={(newList) => updateData('dangerousProducts', newList)}
            />

            <DynamicList 
              title="7. Portas e Saídas"
              items={inspection.data.doorsAndExits}
              columns={[
                {key:'location', label:'Ambiente'}, {key:'width', label:'Largura'}, {key:'height', label:'Altura'},
                {key:'opensOutward', label:'Abre para fora (Sim/Não)'}, {key:'panicBar', label:'Barra antipânico (Sim/Não)'}
              ]}
              onChange={(newList) => updateData('doorsAndExits', newList)}
            />

            <DynamicList 
              title="8. Corredores"
              items={inspection.data.corridors}
              columns={[
                {key:'location', label:'Local'}, {key:'width', label:'Largura'}, {key:'length', label:'Comprimento'},
                {key:'obstacles', label:'Obstáculos (Sim/Não)'}
              ]}
              onChange={(newList) => updateData('corridors', newList)}
            />

            <DynamicList 
              title="9. Extintores"
              items={inspection.data.extinguishers}
              columns={[
                {key:'number', label:'Nº'}, {key:'type', label:'Tipo'}, {key:'capacity', label:'Capacidade'}, 
                {key:'location', label:'Local'}, {key:'expiration', label:'Validade'}, {key:'pressure', label:'Pressão'}
              ]}
              onChange={(newList) => updateData('extinguishers', newList)}
            />
          </div>
        )}

        {activeTab === 3 && (
          <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-300">
             <section className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-xl space-y-4">
              <h2 className="text-lg font-semibold text-white border-b border-zinc-800 pb-2">11. Sinalização</h2>
              <DynamicList 
                title=""
                items={inspection.data.signs}
                columns={[{key:'type', label:'Item (Ex: Saída)'}, {key:'exists', label:'Existe (Sim/Não)'}, {key:'compliant', label:'Conforme'}, {key:'notes', label:'Obs'}]}
                onChange={(newList) => updateData('signs', newList)}
              />
            </section>

            <DynamicList 
              title="10. Iluminação de Emergência"
              items={inspection.data.emergencyLights}
              columns={[{key:'number', label:'Qtdade'}, {key:'location', label:'Local'}, {key:'works', label:'Funciona (Sim/Não)'}, {key:'distance', label:'Distância'}]}
              onChange={(newList) => updateData('emergencyLights', newList)}
            />

            <section className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-xl space-y-4">
              <h2 className="text-lg font-semibold text-white border-b border-zinc-800 pb-2">12. Instalações Elétricas</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Checkbox label="Quadro identificado" checked={inspection.data.electrical.identifiedBoard} onChange={v => updateNestedData('electrical', 'identifiedBoard', v)} />
                <Checkbox label="Disjuntores identificados" checked={inspection.data.electrical.identifiedBreakers} onChange={v => updateNestedData('electrical', 'identifiedBreakers', v)} />
                <Checkbox label="Fiação exposta" checked={inspection.data.electrical.exposedWiring} onChange={v => updateNestedData('electrical', 'exposedWiring', v)} />
                <Checkbox label="Uso de benjamins" checked={inspection.data.electrical.useOfAdapters} onChange={v => updateNestedData('electrical', 'useOfAdapters', v)} />
                <Checkbox label="Tomadas sobrecarregadas" checked={inspection.data.electrical.overloadedOutlets} onChange={v => updateNestedData('electrical', 'overloadedOutlets', v)} />
              </div>
            </section>

            <section className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-xl space-y-4">
              <h2 className="text-lg font-semibold text-white border-b border-zinc-800 pb-2">15. Acessibilidade</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <Checkbox label="Existe rampa" checked={inspection.data.accessibility.hasRamp} onChange={v => updateNestedData('accessibility', 'hasRamp', v)} />
                <Checkbox label="Corrimão" checked={inspection.data.accessibility.handrail} onChange={v => updateNestedData('accessibility', 'handrail', v)} />
                <Checkbox label="Piso regular" checked={inspection.data.accessibility.regularFloor} onChange={v => updateNestedData('accessibility', 'regularFloor', v)} />
                <Checkbox label="Portas acessíveis" checked={inspection.data.accessibility.accessibleDoors} onChange={v => updateNestedData('accessibility', 'accessibleDoors', v)} />
                <Checkbox label="Desníveis" checked={inspection.data.accessibility.unevenness} onChange={v => updateNestedData('accessibility', 'unevenness', v)} />
              </div>
            </section>

            <section className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-xl space-y-4">
              <h2 className="text-lg font-semibold text-white border-b border-zinc-800 pb-2">13. Cobertura</h2>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <TextInput label="Estrutura" value={inspection.data.roofing.structure} onChange={v => updateNestedData('roofing', 'structure', v)} />
                <TextInput label="Cobertura" value={inspection.data.roofing.roof} onChange={v => updateNestedData('roofing', 'roof', v)} />
                <TextInput label="Forro" value={inspection.data.roofing.ceiling} onChange={v => updateNestedData('roofing', 'ceiling', v)} />
                <TextInput label="Estado de conservação" value={inspection.data.roofing.condition} onChange={v => updateNestedData('roofing', 'condition', v)} />
              </div>
            </section>

            <DynamicList 
              title="14. Equipamentos"
              items={inspection.data.equipment}
              columns={[{key:'name', label:'Equipamento'}, {key:'quantity', label:'Quantidade'}, {key:'location', label:'Local'}]}
              onChange={(newList) => updateData('equipment', newList)}
            />
          </div>
        )}

        {activeTab === 4 && (
          <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-300">
            <section className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-xl space-y-4">
              <h2 className="text-lg font-semibold text-white border-b border-zinc-800 pb-2">16. Registro Fotográfico (Checklist)</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                {['Fachada', 'Rua', 'Fachada lateral', 'Fundos', 'Loja', 'Depósito', 'Escritório', 'Banheiros', 'Copa', 'Quadro elétrico', 'Cobertura', 'Extintores', 'Sinalização'].map(item => (
                  <Checkbox 
                    key={item} 
                    label={item} 
                    checked={!!inspection.data.photos[item]} 
                    onChange={v => {
                      const newPhotos = {...inspection.data.photos, [item]: v};
                      updateData('photos', newPhotos);
                    }} 
                  />
                ))}
              </div>
            </section>

            <section className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-xl space-y-4">
              <h2 className="text-lg font-semibold text-white border-b border-zinc-800 pb-2">17. Documentação Recebida</h2>
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {['CNPJ', 'Alvará', 'APPCI anterior', 'PPCI anterior', 'Projeto arquitetônico', 'Projeto elétrico', 'Projeto estrutural'].map(item => (
                  <Checkbox 
                    key={item} 
                    label={item} 
                    checked={!!inspection.data.documents[item]} 
                    onChange={v => {
                      const newDocs = {...inspection.data.documents, [item]: v};
                      updateData('documents', newDocs);
                    }} 
                  />
                ))}
              </div>
            </section>

            <section className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-xl space-y-4">
              <h2 className="text-lg font-semibold text-white border-b border-zinc-800 pb-2">18. Observações Gerais</h2>
              <textarea
                value={inspection.data.generalNotes || ''}
                onChange={(e) => updateData('generalNotes', e.target.value)}
                rows={4}
                className="w-full bg-zinc-950 border border-zinc-800 text-white p-3 rounded-lg focus:outline-none focus:ring-1 focus:ring-emerald-500"
                placeholder="Insira observações gerais da vistoria..."
              />
            </section>

            <section className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-xl space-y-4">
              <h2 className="text-lg font-semibold text-white border-b border-zinc-800 pb-2">Fotos Anexadas</h2>
              <div className="space-y-4">
                <div className="flex items-center gap-4">
                  <label className="bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 cursor-pointer transition-colors text-sm">
                    <Plus className="w-4 h-4" /> Adicionar Foto
                    <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handlePhotoUpload} />
                  </label>
                  <span className="text-xs text-zinc-500">Imagens serão salvas no formulário.</span>
                </div>
                
                {(inspection.data.uploadedPhotos && inspection.data.uploadedPhotos.length > 0) ? (
                  <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4 mt-4">
                    {inspection.data.uploadedPhotos.map(photo => (
                      <div key={photo.id} className="relative group rounded-lg overflow-hidden border border-zinc-800 bg-zinc-900">
                        <img src={photo.dataUrl} alt={photo.name} className="w-full h-32 object-cover" />
                        <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                          <button 
                            type="button" 
                            onClick={() => setPhotoToDeleteInForm(photo.id)} 
                            className="bg-red-500/20 text-red-500 hover:bg-red-500 hover:text-white p-2 rounded-full transition-colors cursor-pointer"
                            title="Excluir Foto"
                          >
                            <Trash2 className="w-5 h-5" />
                          </button>
                        </div>
                        <div className="p-2 text-xs text-zinc-400 truncate bg-zinc-950">
                          {photo.name}
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-sm text-zinc-500 italic p-4 border border-zinc-800 border-dashed rounded-lg bg-zinc-900/30 text-center">
                    Nenhuma foto anexada.
                  </div>
                )}
              </div>
            </section>

            <DynamicList 
              title="19. Pendências"
              items={inspection.data.pendingItems}
              columns={[{key:'item', label:'Item'}, {key:'responsible', label:'Responsável'}, {key:'deadline', label:'Prazo'}]}
              onChange={(newList) => updateData('pendingItems', newList)}
            />

            <section className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-xl space-y-4">
              <h2 className="text-lg font-semibold text-white border-b border-zinc-800 pb-2">20. Conclusão da Vistoria</h2>
              <div className="space-y-3">
                <Checkbox label="Informações suficientes para elaboração do PPCI" checked={inspection.data.conclusion.sufficientInfo} onChange={v => updateNestedData('conclusion', 'sufficientInfo', v)} />
                <Checkbox label="Necessário retorno ao local" checked={inspection.data.conclusion.returnNeeded} onChange={v => updateNestedData('conclusion', 'returnNeeded', v)} />
                <Checkbox label="Necessário solicitar documentação complementar" checked={inspection.data.conclusion.additionalDocs} onChange={v => updateNestedData('conclusion', 'additionalDocs', v)} />
                <Checkbox label="Necessário realizar medições adicionais" checked={inspection.data.conclusion.additionalMeasurements} onChange={v => updateNestedData('conclusion', 'additionalMeasurements', v)} />
              </div>
            </section>
          </div>
        )}

        {activeTab === 5 && (
          <div className="max-w-4xl mx-auto space-y-8 animate-in fade-in duration-300 pb-12">
            <section className="bg-zinc-900/50 border border-zinc-800 p-8 rounded-2xl space-y-6 text-center">
              <div className="w-16 h-16 bg-emerald-500/10 rounded-full flex items-center justify-center mx-auto">
                <Palette className="w-8 h-8 text-emerald-400" />
              </div>
              <div className="space-y-2 max-w-lg mx-auto">
                <h2 className="text-2xl font-bold text-white">Prancheta do Croqui da Loja</h2>
                <p className="text-zinc-400 text-sm">
                  Desenhe as paredes, insira medidas e coloque símbolos do PPCI como extintores, sinalizações, alarmes, iluminação de emergência, portas e janelas.
                </p>
              </div>

              {linkedSketch ? (
                <div className="bg-zinc-950 p-6 rounded-xl border border-zinc-800 max-w-md mx-auto space-y-4">
                  <div className="flex items-center justify-center gap-2 text-emerald-400 font-semibold text-sm">
                    <Layers className="w-4 h-4" /> Croqui Associado Ativo
                  </div>
                  <div className="text-xs text-zinc-500 space-y-1">
                    <div>Paredes: {linkedSketch.elements.filter(e => e.type === 'wall').length}</div>
                    <div>Medidas: {linkedSketch.elements.filter(e => e.type === 'measure').length}</div>
                    <div>Símbolos PPCI/Civil: {linkedSketch.elements.filter(e => e.type === 'block').length}</div>
                  </div>
                  <button
                    onClick={() => setInnerSketchOpen(true)}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2.5 rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
                  >
                    <Palette className="w-4 h-4" /> Editar Croqui da Loja
                  </button>
                </div>
              ) : (
                <div className="bg-zinc-950 p-6 rounded-xl border border-zinc-800 border-dashed max-w-md mx-auto space-y-4">
                  <p className="text-zinc-500 text-xs">
                    Nenhum croqui desenhado para esta vistoria.
                  </p>
                  <button
                    onClick={() => setInnerSketchOpen(true)}
                    className="w-full bg-emerald-600 hover:bg-emerald-700 text-white font-medium py-2.5 rounded-lg text-sm transition-colors flex items-center justify-center gap-2"
                  >
                    <Plus className="w-4 h-4" /> Desenhar Novo Croqui
                  </button>
                </div>
              )}
            </section>
          </div>
        )}

      </div>

      <div className="p-4 border-t border-zinc-900 bg-zinc-950 flex-shrink-0 flex items-center justify-between">
        <button
          onClick={() => setActiveTab(Math.max(0, activeTab - 1))}
          disabled={activeTab === 0}
          className={`px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors ${
            activeTab === 0 ? 'bg-zinc-900 text-zinc-600 cursor-not-allowed' : 'bg-zinc-800 hover:bg-zinc-700 text-white'
          }`}
        >
          Anterior
        </button>
        <div className="flex gap-3">
          {activeTab === tabs.length - 1 ? (
            <button
              onClick={handleSave}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-6 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors"
            >
              <Save className="w-5 h-5" /> Concluir e Salvar
            </button>
          ) : (
            <button
              onClick={() => setActiveTab(Math.min(tabs.length - 1, activeTab + 1))}
              className="bg-zinc-800 hover:bg-zinc-700 text-white px-4 py-2 rounded-lg font-medium flex items-center gap-2 transition-colors"
            >
              Próximo
            </button>
          )}
        </div>
      </div>

      {innerSketchOpen && (
        <SketchCanvas 
          title={linkedSketch ? linkedSketch.name : `Croqui - ${inspection.clientName || 'Sem Nome'}`}
          initialElements={linkedSketch ? (linkedSketch.elements as any) : []}
          initialLayers={linkedSketch ? linkedSketch.layers : {
            paredes: '#ffffff',
            medidas: '#3b82f6',
            blocos_civis: '#10b981',
            ppci: '#ef4444'
          }}
          onSave={handleSaveInnerSketch}
          onCancel={() => setInnerSketchOpen(false)}
        />
      )}

      {/* Confirmation Modal for Form Photo Deletion */}
      {photoToDeleteInForm && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-sm p-6 space-y-4 shadow-2xl zoom-in-95 animate-in duration-200">
            <div className="flex items-center gap-3 text-red-500">
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base">Excluir Foto</h3>
                <p className="text-xs text-zinc-400">Esta ação não pode ser desfeita</p>
              </div>
            </div>
            <p className="text-sm text-zinc-300">
              Tem certeza de que deseja remover esta foto do formulário?
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setPhotoToDeleteInForm(null)}
                className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-lg text-xs font-semibold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  removePhoto(photoToDeleteInForm);
                  setPhotoToDeleteInForm(null);
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-lg shadow-red-600/20"
              >
                <Trash2 className="w-3.5 h-3.5" /> Excluir Foto
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ----- UI HELPERS -----

function TextInput({ label, value, onChange, type = "text" }: { label: string, value: any, onChange: (v: string) => void, type?: string }) {
  return (
    <div>
      <label className="block text-xs font-medium text-zinc-400 mb-1">{label}</label>
      <input
        type={type}
        value={value || ''}
        onChange={(e) => onChange(e.target.value)}
        className="w-full bg-zinc-950 border border-zinc-800 text-white px-3 py-2 rounded-md focus:outline-none focus:ring-1 focus:ring-emerald-500"
      />
    </div>
  );
}

const Checkbox: React.FC<{ label: string, checked: boolean, onChange: (v: boolean) => void }> = ({ label, checked, onChange }) => {
  return (
    <label className="flex items-center gap-2 cursor-pointer text-sm text-zinc-300 hover:text-white">
      <input
        type="checkbox"
        checked={checked || false}
        onChange={(e) => onChange(e.target.checked)}
        className="rounded border-zinc-700 text-emerald-500 focus:ring-emerald-500 focus:ring-offset-zinc-900 bg-zinc-900"
      />
      {label}
    </label>
  );
}

function DynamicList({ title, items = [], columns, onChange }: { title: string, items: any[], columns: {key: string, label: string}[], onChange: (items: any[]) => void }) {
  const [activePhotoIdx, setActivePhotoIdx] = useState<number | null>(null);
  const [zoomedPhoto, setZoomedPhoto] = useState<string | null>(null);
  const [isCompressing, setIsCompressing] = useState(false);
  const [rowToDeleteIdx, setRowToDeleteIdx] = useState<number | null>(null);
  const [itemPhotoToDelete, setItemPhotoToDelete] = useState<{ itemIdx: number; photoIdx: number } | null>(null);

  const handleAdd = () => {
    const newItem: any = { photos: [] };
    columns.forEach(c => newItem[c.key] = '');
    onChange([...items, newItem]);
  };

  const updateItem = (index: number, key: string, value: string) => {
    const newItems = [...items];
    newItems[index] = { ...newItems[index], [key]: value };
    onChange(newItems);
  };

  const removeItem = (index: number) => {
    const newItems = [...items];
    newItems.splice(index, 1);
    onChange(newItems);
  };

  const handleAddPhoto = async (index: number, files: FileList | null) => {
    if (!files || files.length === 0) return;
    setIsCompressing(true);
    
    try {
      const options = {
        maxSizeMB: 0.8,
        maxWidthOrHeight: 1024,
        useWebWorker: true
      };

      const newPhotos: string[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const compressedFile = await imageCompression(file, options);
        
        const dataUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (event) => resolve(event.target?.result as string);
          reader.onerror = (err) => reject(err);
          reader.readAsDataURL(compressedFile);
        });

        newPhotos.push(dataUrl);
      }

      const newItems = [...items];
      const existingPhotos = newItems[index].photos || [];
      newItems[index] = { ...newItems[index], photos: [...existingPhotos, ...newPhotos] };
      onChange(newItems);
    } catch (err) {
      console.error('Error uploading item photo:', err);
      alert('Erro ao processar as fotos.');
    } finally {
      setIsCompressing(false);
    }
  };

  const removePhotoFromItem = (itemIdx: number, photoIdx: number) => {
    const newItems = [...items];
    const existingPhotos = [...(newItems[itemIdx].photos || [])];
    existingPhotos.splice(photoIdx, 1);
    newItems[itemIdx] = { ...newItems[itemIdx], photos: existingPhotos };
    onChange(newItems);
  };

  return (
    <section className="bg-zinc-900/50 border border-zinc-800 p-6 rounded-xl space-y-4">
      <div className="flex justify-between items-center border-b border-zinc-800 pb-2">
        <h2 className="text-lg font-semibold text-white">{title}</h2>
        <button onClick={handleAdd} className="text-xs bg-zinc-800 hover:bg-zinc-700 text-white px-3 py-1 rounded flex items-center gap-1">
          <Plus className="w-3 h-3" /> Adicionar
        </button>
      </div>
      
      {items.length === 0 ? (
        <p className="text-sm text-zinc-500 italic">Nenhum item adicionado.</p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left">
            <thead className="text-xs text-zinc-400 bg-zinc-900 uppercase">
              <tr>
                {columns.map(c => <th key={c.key} className="px-3 py-2">{c.label}</th>)}
                <th className="px-3 py-2 w-28 text-center">Ações</th>
              </tr>
            </thead>
            <tbody>
              {items.map((item, idx) => (
                <tr key={idx} className="border-b border-zinc-800/50">
                  {columns.map(c => (
                    <td key={c.key} className="p-1">
                      <input
                        type="text"
                        value={item[c.key] || ''}
                        onChange={(e) => updateItem(idx, c.key, e.target.value)}
                        className="w-full bg-zinc-950 border border-zinc-800 text-white px-2 py-1.5 rounded text-sm focus:outline-none focus:border-emerald-500"
                      />
                    </td>
                  ))}
                  <td className="p-1 text-center whitespace-nowrap">
                    <div className="flex items-center gap-1.5 justify-center">
                      <button
                        type="button"
                        onClick={() => setActivePhotoIdx(idx)}
                        className={`p-1.5 rounded transition-all flex items-center gap-1 ${
                          item.photos?.length 
                            ? 'text-emerald-400 bg-emerald-500/15 hover:bg-emerald-500/25 border border-emerald-500/30' 
                            : 'text-zinc-500 hover:text-white hover:bg-zinc-800 border border-transparent'
                        }`}
                        title="Tirar/Adicionar Fotos"
                      >
                        <Camera className="w-4 h-4" />
                        {item.photos && item.photos.length > 0 && (
                          <span className="text-[10px] font-bold px-1.5 py-0.5 bg-emerald-500 text-black rounded-full min-w-4 text-center">
                            {item.photos.length}
                          </span>
                        )}
                      </button>
                      <button 
                        type="button"
                        onClick={() => setRowToDeleteIdx(idx)} 
                        className="text-zinc-500 hover:text-red-400 hover:bg-red-500/10 p-1.5 rounded transition-colors cursor-pointer"
                        title="Excluir Linha"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Custom Delete/Manage Photos Modal */}
      {activePhotoIdx !== null && items[activePhotoIdx] && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-[100] animate-in fade-in duration-200">
          <div className="bg-zinc-950 border border-zinc-900 rounded-xl max-w-2xl w-full p-6 space-y-4 zoom-in-95 animate-in duration-200 shadow-2xl flex flex-col max-h-[90vh]">
            <div className="flex justify-between items-center border-b border-zinc-900 pb-3">
              <div className="flex items-center gap-2">
                <Camera className="w-5 h-5 text-emerald-500" />
                <h3 className="font-bold text-white text-base">
                  Fotos - {title || "Item"} #{activePhotoIdx + 1}
                </h3>
              </div>
              <button 
                type="button"
                onClick={() => setActivePhotoIdx(null)}
                className="text-zinc-400 hover:text-white p-1 rounded-full hover:bg-zinc-900 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto space-y-4 pr-1">
              <p className="text-xs text-zinc-400">
                Tire fotos no local ou adicione imagens para este item específico. As fotos serão salvas junto com o relatório de vistoria.
              </p>

              {/* Upload Grid / Click to select file */}
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {/* File picker card */}
                <label className="border-2 border-dashed border-zinc-800 hover:border-emerald-500/50 bg-zinc-900/20 hover:bg-emerald-500/5 rounded-xl flex flex-col items-center justify-center p-4 cursor-pointer transition-all aspect-square text-center relative">
                  <input
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => handleAddPhoto(activePhotoIdx, e.target.files)}
                    className="absolute inset-0 opacity-0 cursor-pointer"
                    disabled={isCompressing}
                  />
                  {isCompressing ? (
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-6 h-6 border-2 border-t-transparent border-emerald-500 rounded-full animate-spin"></div>
                      <span className="text-[10px] text-zinc-400 font-semibold">Processando...</span>
                    </div>
                  ) : (
                    <>
                      <Camera className="w-8 h-8 text-zinc-500 mb-1.5" />
                      <span className="text-xs font-semibold text-zinc-300">Tirar/Adicionar Foto</span>
                      <span className="text-[10px] text-zinc-500 mt-1">Câmera ou Arquivo</span>
                    </>
                  )}
                </label>

                {/* Displaying existing photos */}
                {((items[activePhotoIdx].photos as string[]) || []).map((photo, pIdx) => (
                  <div key={pIdx} className="group relative border border-zinc-900 rounded-xl overflow-hidden aspect-square bg-zinc-900/30">
                    <img 
                      src={photo} 
                      alt={`Foto ${pIdx + 1}`} 
                      className="w-full h-full object-cover cursor-pointer hover:scale-105 transition-transform duration-200"
                      onClick={() => setZoomedPhoto(photo)}
                      referrerPolicy="no-referrer"
                    />
                    
                    <button
                      type="button"
                      onClick={() => setItemPhotoToDelete({ itemIdx: activePhotoIdx, photoIdx: pIdx })}
                      className="absolute top-1.5 right-1.5 p-1 bg-black/60 hover:bg-red-600 text-white rounded-full transition-colors shadow-md cursor-pointer"
                      title="Excluir Foto"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>

                    <div className="absolute bottom-0 inset-x-0 bg-gradient-to-t from-black/80 to-transparent p-1.5 opacity-0 group-hover:opacity-100 transition-opacity flex justify-between items-center pointer-events-none">
                      <span className="text-[10px] text-zinc-300">Foto {pIdx + 1}</span>
                      <span className="text-[10px] text-emerald-400 font-medium">Ver</span>
                    </div>
                  </div>
                ))}
              </div>

              {(!items[activePhotoIdx].photos || items[activePhotoIdx].photos.length === 0) && !isCompressing && (
                <div className="flex flex-col items-center justify-center py-6 text-center text-zinc-600">
                  <Image className="w-8 h-8 mb-2 stroke-1" />
                  <p className="text-xs">Nenhuma foto adicionada para este item ainda.</p>
                </div>
              )}
            </div>

            <div className="flex justify-end border-t border-zinc-900 pt-3">
              <button
                type="button"
                onClick={() => setActivePhotoIdx(null)}
                className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-lg text-sm font-semibold transition-colors cursor-pointer"
              >
                Concluir
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Lightbox / Zoomed image Modal */}
      {zoomedPhoto && (
        <div 
          className="fixed inset-0 bg-black/95 flex items-center justify-center p-4 z-[110] animate-in fade-in duration-200 cursor-zoom-out"
          onClick={() => setZoomedPhoto(null)}
        >
          <button 
            type="button"
            className="absolute top-4 right-4 p-2 bg-zinc-900 hover:bg-zinc-800 text-white rounded-full transition-colors"
            onClick={() => setZoomedPhoto(null)}
          >
            <X className="w-6 h-6" />
          </button>
          <img 
            src={zoomedPhoto} 
            alt="Zoomed" 
            className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
            referrerPolicy="no-referrer"
          />
        </div>
      )}

      {/* Modal for Row Deletion Confirmation */}
      {rowToDeleteIdx !== null && (
        <div className="fixed inset-0 z-[120] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-sm p-6 space-y-4 shadow-2xl zoom-in-95 animate-in duration-200">
            <div className="flex items-center gap-3 text-red-500">
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base">Excluir Item</h3>
                <p className="text-xs text-zinc-400">Esta ação não pode ser desfeita</p>
              </div>
            </div>
            <p className="text-sm text-zinc-300">
              Tem certeza de que deseja excluir este item da lista <strong className="text-white">{title}</strong>?
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setRowToDeleteIdx(null)}
                className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-lg text-xs font-semibold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  removeItem(rowToDeleteIdx);
                  setRowToDeleteIdx(null);
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-lg shadow-red-600/20"
              >
                <Trash2 className="w-3.5 h-3.5" /> Excluir Item
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal for Item Photo Deletion Confirmation */}
      {itemPhotoToDelete && (
        <div className="fixed inset-0 z-[130] flex items-center justify-center bg-black/80 backdrop-blur-sm p-4 animate-in fade-in duration-200">
          <div className="bg-zinc-950 border border-zinc-800 rounded-2xl w-full max-w-sm p-6 space-y-4 shadow-2xl zoom-in-95 animate-in duration-200">
            <div className="flex items-center gap-3 text-red-500">
              <div className="p-3 bg-red-500/10 border border-red-500/20 rounded-xl">
                <Trash2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="font-bold text-white text-base">Excluir Foto do Item</h3>
                <p className="text-xs text-zinc-400">Esta ação não pode ser desfeita</p>
              </div>
            </div>
            <p className="text-sm text-zinc-300">
              Tem certeza de que deseja remover esta foto deste item?
            </p>
            <div className="flex justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setItemPhotoToDelete(null)}
                className="px-4 py-2 bg-zinc-900 hover:bg-zinc-800 text-zinc-300 rounded-lg text-xs font-semibold cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={() => {
                  removePhotoFromItem(itemPhotoToDelete.itemIdx, itemPhotoToDelete.photoIdx);
                  setItemPhotoToDelete(null);
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-lg shadow-red-600/20"
              >
                <Trash2 className="w-3.5 h-3.5" /> Excluir Foto
              </button>
            </div>
          </div>
        </div>
      )}
    </section>
  );
}
