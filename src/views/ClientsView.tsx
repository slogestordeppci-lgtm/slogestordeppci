import React, { useState } from 'react';
import { useStore } from '../store';
import { Users, Plus, X, Building, MapPin, Phone, Mail, FileText, Trash2, AlertTriangle, Edit } from 'lucide-react';
import { Client } from '../types';

export function ClientsView() {
  const { data, updateData } = useStore();
  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterType, setFilterType] = useState<'all' | 'with-projects' | 'without-projects'>('all');
  
  const [clientToDelete, setClientToDelete] = useState<string | null>(null);
  
  const [newClient, setNewClient] = useState<Partial<Client>>({
    name: '',
    document: '',
    contactName: '',
    email: '',
    address: '',
    number: '',
    complement: '',
    city: '',
    state: '',
    cep: '',
    phone: '',
  });

  const clients = data.clients || [];

  const filteredClients = clients.filter(client => {
    const matchesSearch = client.name.toLowerCase().includes(searchQuery.toLowerCase()) || 
                          client.address?.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          client.document?.toLowerCase().includes(searchQuery.toLowerCase());
                          
    if (!matchesSearch) return false;
    
    if (filterType === 'all') return true;
    
    const hasProjects = data.projects.some(p => p.clientId === client.id);
    if (filterType === 'with-projects') return hasProjects;
    if (filterType === 'without-projects') return !hasProjects;
    
    return true;
  });

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'Orçamento': return 'bg-blue-500/10 text-blue-500 border border-blue-500/20';
      case 'Aprovado': return 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20';
      case 'Reprovado': return 'bg-red-500/10 text-red-500 border border-red-500/20';
      case 'Levantamento': return 'bg-amber-500/10 text-amber-500 border border-amber-500/20';
      case 'Elaboração': return 'bg-purple-500/10 text-purple-500 border border-purple-500/20';
      case 'Protocolado': return 'bg-sky-500/10 text-sky-500 border border-sky-500/20';
      case 'Concluído': return 'bg-teal-500/10 text-teal-500 border border-teal-500/20';
      default: return 'bg-zinc-800 text-zinc-300 border border-zinc-700';
    }
  };
  const activeClient = clients.find(c => c.id === selectedClient);

  const handleAddClient = (e: React.FormEvent) => {
    e.preventDefault();

    const client: Client = {
      id: `c-${Date.now()}`,
      name: newClient.name || '',
      document: newClient.document || '',
      contactName: newClient.contactName || '',
      email: newClient.email || '',
      address: newClient.address || '',
      city: newClient.city || '',
      state: newClient.state || '',
      cep: newClient.cep || '',
      phone: newClient.phone || '',
      extinguishers: [],
    };

    updateData({ clients: [...clients, client] });
    setShowAddForm(false);
    setNewClient({
      name: '',
      document: '',
      contactName: '',
      email: '',
      address: '',
      city: '',
      state: '',
      cep: '',
      phone: '',
    });
    setSelectedClient(client.id);
  };

  const [editingClient, setEditingClient] = useState<Client | null>(null);

  const handleEditClientOpen = (client: Client) => {
    setEditingClient(client);
  };

  const handleSaveEditedClient = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingClient) return;

    const updatedClients = clients.map(c => c.id === editingClient.id ? editingClient : c);
    updateData({ clients: updatedClients });
    setEditingClient(null);
  };

  const confirmDeleteClient = () => {
    if (!clientToDelete) return;
    updateData({ clients: clients.filter(c => c.id !== clientToDelete) });
    if (selectedClient === clientToDelete) setSelectedClient(null);
    setClientToDelete(null);
  };

  return (
    <div className="flex flex-col h-full p-8 overflow-hidden">
      <div className="flex items-center justify-between mb-8 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-semibold text-white">Clientes</h1>
          <p className="text-zinc-400">Cadastro geral de clientes do escritório.</p>
        </div>
        <button 
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Novo Cliente
        </button>
      </div>

      <div className="flex gap-8 flex-1 min-h-0">
        {/* Client List */}
        <div className="w-1/3 flex flex-col overflow-hidden bg-zinc-950 rounded-xl border border-zinc-900 shadow-sm">
          <div className="p-4 border-b border-zinc-900 bg-zinc-900 font-semibold text-white flex flex-col gap-3">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-red-500" />
              Lista de Clientes
            </div>
            <div className="flex flex-col gap-2">
              <input
                type="text"
                placeholder="Buscar cliente (nome, doc, endereço)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full px-3 py-1.5 bg-zinc-950 border border-zinc-800 text-white rounded text-sm focus:outline-none focus:ring-1 focus:ring-red-500"
              />
              <select
                value={filterType}
                onChange={(e) => setFilterType(e.target.value as any)}
                className="w-full px-3 py-1.5 bg-zinc-950 border border-zinc-800 text-white rounded text-sm focus:outline-none focus:ring-1 focus:ring-red-500"
              >
                <option value="all">Todos os Clientes</option>
                <option value="with-projects">Com Projetos Cadastrados</option>
                <option value="without-projects">Sem Projetos</option>
              </select>
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {filteredClients.length === 0 ? (
              <div className="p-4 text-sm text-zinc-500 text-center">Nenhum cliente encontrado.</div>
            ) : (
              filteredClients.map((client) => (
                <button
                  key={client.id}
                  onClick={() => setSelectedClient(client.id)}
                  className={`w-full text-left p-4 rounded-lg mb-2 transition-all ${
                    selectedClient === client.id
                      ? 'bg-zinc-900 border border-zinc-700 shadow-sm'
                      : 'hover:bg-zinc-900/50 border border-transparent'
                  }`}
                >
                  <h3 className="font-semibold text-white truncate">{client.name}</h3>
                  <p className="text-xs text-zinc-500 mt-1 truncate">{client.address}</p>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Client Details */}
        <div className="w-2/3 bg-zinc-950 rounded-xl border border-zinc-900 shadow-sm flex flex-col overflow-hidden">
          {activeClient ? (
            <div className="flex-1 p-6 overflow-y-auto">
              <div className="flex items-start justify-between mb-8">
                <div>
                  <h2 className="text-2xl font-bold text-white mb-4">{activeClient.name}</h2>
                  <div className="grid grid-cols-2 gap-4 text-sm text-zinc-400">
                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-zinc-900 flex items-center justify-center shrink-0">
                          <MapPin className="w-4 h-4 text-zinc-500" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-base text-zinc-300">{activeClient.address}</span>
                          <span className="text-xs text-zinc-500">
                            {[activeClient.city, activeClient.state, activeClient.cep].filter(Boolean).join(' - ')}
                          </span>
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-zinc-900 flex items-center justify-center shrink-0">
                          <Building className="w-4 h-4 text-zinc-500" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm text-zinc-400">CNPJ / CPF</span>
                          <span className="text-base text-zinc-300">{activeClient.document || '-'}</span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 rounded-full bg-zinc-900 flex items-center justify-center shrink-0">
                          <Users className="w-4 h-4 text-zinc-500" />
                        </div>
                        <div className="flex flex-col">
                          <span className="text-sm text-zinc-400">Contato</span>
                          <span className="text-base text-zinc-300">{activeClient.contactName || '-'}</span>
                        </div>
                      </div>

                      {(activeClient.phone || activeClient.email) && (
                        <div className="flex items-center gap-3">
                          <div className="w-8 h-8 rounded-full bg-zinc-900 flex items-center justify-center shrink-0">
                            <Phone className="w-4 h-4 text-zinc-500" />
                          </div>
                          <div className="flex flex-col">
                            {activeClient.phone && <span className="text-base text-zinc-300">{activeClient.phone}</span>}
                            {activeClient.email && <span className="text-sm text-zinc-500">{activeClient.email}</span>}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => handleEditClientOpen(activeClient)}
                    className="px-3 py-1.5 text-xs font-semibold rounded border border-zinc-700 text-zinc-300 hover:bg-zinc-800 transition-colors flex items-center gap-1.5"
                  >
                    <Edit className="w-3.5 h-3.5" />
                    Editar Cliente
                  </button>
                  <button
                    onClick={() => setClientToDelete(activeClient.id)}
                    className="px-3 py-1.5 text-xs font-semibold rounded border border-red-500/20 text-red-500 hover:bg-red-500/10 transition-colors"
                  >
                    Excluir Cliente
                  </button>
                </div>
              </div>

              <div className="mt-8 border-t border-zinc-900 pt-8">
                <h3 className="text-lg font-semibold text-white mb-4 flex items-center gap-2">
                  <FileText className="w-5 h-5 text-zinc-500" />
                  Projetos Vinculados
                </h3>
                <div className="space-y-3">
                  {data.projects.filter(p => p.clientId === activeClient.id).length === 0 ? (
                    <p className="text-zinc-500 text-sm">Este cliente não possui projetos cadastrados no sistema.</p>
                  ) : (
                    data.projects.filter(p => p.clientId === activeClient.id).map(project => (
                      <div key={project.id} className="p-4 bg-zinc-900/50 border border-zinc-800 rounded-lg flex flex-col gap-3">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-2">
                            <span className="font-semibold text-zinc-200">{project.type}</span>
                            <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${getStatusBadge(project.status)}`}>
                              {project.status}
                            </span>
                          </div>
                          <span className="text-xs font-mono text-zinc-400 font-bold bg-zinc-800 px-2 py-0.5 rounded">ID: {project.id}</span>
                        </div>
                        <div className="grid grid-cols-3 gap-2 text-sm text-zinc-400">
                          <div className="flex flex-col">
                            <span className="text-xs text-zinc-500">Valor</span>
                            <span className="text-zinc-200 font-medium">
                              {project.value ? `R$ ${project.value.toFixed(2).replace('.', ',')}` : '-'}
                            </span>
                          </div>
                          <div className="flex flex-col">
                            <span className="text-xs text-zinc-500">Formas de Pagamento</span>
                            <span className="text-zinc-200">
                              {project.paymentMethods && project.paymentMethods.length > 0 
                                ? project.paymentMethods.map(m => {
                                    if (m === 'À vista com desconto' && project.discountPercentage) return `${m} (${project.discountPercentage}%)`;
                                    if (m === 'Até 12x Cartão de Crédito + Juros' && project.interestPercentage) return `Cartão 12x (${project.interestPercentage}%)`;
                                    return m.replace('Até 12x Cartão de Crédito + Juros', 'Cartão 12x');
                                  }).join(' / ')
                                : '-'
                              }
                            </span>
                          </div>
                          <div className="flex flex-col text-right">
                            <span className="text-xs text-zinc-500">Data Base</span>
                            <span className="text-zinc-200">{project.lastVisit || '-'}</span>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-zinc-500">
              <Users className="w-12 h-12 mb-4 opacity-20" />
              <p>Selecione um cliente para visualizar os detalhes.</p>
            </div>
          )}
        </div>
      </div>

      {showAddForm && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-zinc-950 rounded-xl border border-zinc-900 shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-4 border-b border-zinc-900 flex justify-between items-center bg-zinc-900">
              <h2 className="font-semibold text-white flex items-center gap-2">
                <Building className="w-5 h-5 text-red-600" />
                Novo Cliente
              </h2>
              <button
                onClick={() => setShowAddForm(false)}
                className="text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddClient} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-zinc-300 mb-1">Nome / Edificação</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Condomínio XYZ"
                    value={newClient.name}
                    onChange={(e) => setNewClient({ ...newClient, name: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-zinc-300 mb-1">Documento (CNPJ / CPF)</label>
                  <input
                    type="text"
                    placeholder="00.000.000/0001-00"
                    value={newClient.document}
                    onChange={(e) => setNewClient({ ...newClient, document: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1">Contato (Pessoa)</label>
                  <input
                    type="text"
                    placeholder="Ex: João Silva"
                    value={newClient.contactName}
                    onChange={(e) => setNewClient({ ...newClient, contactName: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1">Telefone / WhatsApp *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: (00) 00000-0000"
                    value={newClient.phone}
                    onChange={(e) => setNewClient({ ...newClient, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-zinc-300 mb-1">Email</label>
                  <input
                    type="email"
                    placeholder="Ex: contato@condominio.com"
                    value={newClient.email}
                    onChange={(e) => setNewClient({ ...newClient, email: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-zinc-300 mb-1">Endereço</label>
                  <input
                    type="text"
                    placeholder="Ex: Rua Central, 100"
                    value={newClient.address}
                    onChange={(e) => setNewClient({ ...newClient, address: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1">Cidade / UF</label>
                  <input
                    type="text"
                    placeholder="Ex: São Paulo / SP"
                    value={newClient.city}
                    onChange={(e) => setNewClient({ ...newClient, city: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1">CEP</label>
                  <input
                    type="text"
                    placeholder="Ex: 00000-000"
                    value={newClient.cep}
                    onChange={(e) => setNewClient({ ...newClient, cep: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-zinc-900 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-white transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-md transition-colors"
                >
                  Salvar Cliente
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {clientToDelete && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-[100] animate-in fade-in duration-200">
          <div className="bg-zinc-950 border border-zinc-900 rounded-xl max-w-sm w-full p-6 space-y-4 zoom-in-95 animate-in duration-200 shadow-2xl">
            <div className="flex items-center gap-3 text-red-500">
              <div className="p-2 rounded-lg bg-red-500/10 border border-red-500/20">
                <Trash2 className="w-6 h-6" />
              </div>
              <h3 className="font-bold text-white text-lg">Excluir Cliente</h3>
            </div>
            
            <p className="text-sm text-zinc-400">
              Tem certeza que deseja remover este cliente? Todos os extintores e dados vinculados a ele também serão perdidos permanentemente.
            </p>

            <div className="flex gap-3 pt-2">
              <button
                type="button"
                onClick={() => setClientToDelete(null)}
                className="flex-1 px-4 py-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 rounded-lg text-sm font-semibold transition-colors cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmDeleteClient}
                className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm font-semibold transition-colors cursor-pointer"
              >
                Excluir
              </button>
            </div>
          </div>
        </div>
      )}

      {editingClient && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-zinc-950 rounded-xl border border-zinc-900 shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-4 border-b border-zinc-900 flex justify-between items-center bg-zinc-900">
              <h2 className="font-semibold text-white flex items-center gap-2">
                <Edit className="w-5 h-5 text-red-600" />
                Editar Cliente
              </h2>
              <button
                onClick={() => setEditingClient(null)}
                className="text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSaveEditedClient} className="p-6 space-y-4 max-h-[80vh] overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-zinc-300 mb-1">Nome / Edificação</label>
                  <input
                    type="text"
                    required
                    value={editingClient.name}
                    onChange={(e) => setEditingClient({ ...editingClient, name: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-zinc-300 mb-1">Documento (CNPJ / CPF)</label>
                  <input
                    type="text"
                    value={editingClient.document || ''}
                    onChange={(e) => setEditingClient({ ...editingClient, document: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1">Contato (Pessoa)</label>
                  <input
                    type="text"
                    value={editingClient.contactName || ''}
                    onChange={(e) => setEditingClient({ ...editingClient, contactName: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1">Telefone / WhatsApp</label>
                  <input
                    type="text"
                    value={editingClient.phone || ''}
                    onChange={(e) => setEditingClient({ ...editingClient, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-zinc-300 mb-1">Email</label>
                  <input
                    type="email"
                    value={editingClient.email || ''}
                    onChange={(e) => setEditingClient({ ...editingClient, email: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>

                <div className="col-span-2">
                  <label className="block text-sm font-medium text-zinc-300 mb-1">Endereço</label>
                  <input
                    type="text"
                    value={editingClient.address || ''}
                    onChange={(e) => setEditingClient({ ...editingClient, address: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1">Cidade / UF</label>
                  <input
                    type="text"
                    value={editingClient.city || ''}
                    onChange={(e) => setEditingClient({ ...editingClient, city: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1">CEP</label>
                  <input
                    type="text"
                    value={editingClient.cep || ''}
                    onChange={(e) => setEditingClient({ ...editingClient, cep: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-zinc-900 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingClient(null)}
                  className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-white transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-md transition-colors"
                >
                  Salvar Alterações
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
