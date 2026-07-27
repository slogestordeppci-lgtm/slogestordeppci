import React, { useState } from 'react';
import { useStore } from '../store';
import { Briefcase, Plus, X, Phone, Mail, FileText, MapPin, Building } from 'lucide-react';
import { ServiceProvider } from '../types';

export function ProvidersView() {
  const { data, updateData } = useStore();
  const [selectedProvider, setSelectedProvider] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  
  const [newProvider, setNewProvider] = useState<Partial<ServiceProvider>>({
    name: '',
    serviceType: '',
    phone: '',
    email: '',
    document: '',
    address: '',
  });

  const providers = data.providers || [];
  const activeProvider = providers.find(p => p.id === selectedProvider);

  const handleAddProvider = (e: React.FormEvent) => {
    e.preventDefault();

    const provider: ServiceProvider = {
      id: `p-${Date.now()}`,
      name: newProvider.name || '',
      serviceType: newProvider.serviceType || '',
      phone: newProvider.phone || '',
      email: newProvider.email || '',
      document: newProvider.document || '',
      address: newProvider.address || '',
    };

    updateData({ providers: [...providers, provider] });
    setShowAddForm(false);
    setNewProvider({
      name: '',
      serviceType: '',
      phone: '',
      email: '',
      document: '',
      address: '',
    });
    setSelectedProvider(provider.id);
  };

  const removeProvider = (providerId: string) => {
    if (confirm('Tem certeza que deseja remover este prestador de serviço?')) {
      updateData({ providers: providers.filter(p => p.id !== providerId) });
      if (selectedProvider === providerId) setSelectedProvider(null);
    }
  };

  return (
    <div className="flex flex-col h-full p-8 overflow-hidden">
      <div className="flex items-center justify-between mb-8 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-semibold text-white">Prestadores de Serviço</h1>
          <p className="text-zinc-400">Gerencie engenheiros, eletricistas, instaladores e parceiros técnicos.</p>
        </div>
        <button 
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Novo Prestador
        </button>
      </div>

      <div className="flex gap-8 flex-1 min-h-0">
        {/* Providers List */}
        <div className="w-1/3 flex flex-col overflow-hidden bg-zinc-950 rounded-xl border border-zinc-900 shadow-sm">
          <div className="p-4 border-b border-zinc-900 bg-zinc-900 font-semibold text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Briefcase className="w-4 h-4 text-red-500" />
              Lista de Prestadores
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {providers.length === 0 ? (
              <div className="p-4 text-sm text-zinc-500 text-center">Nenhum prestador cadastrado.</div>
            ) : (
              providers.map((provider) => (
                <button
                  key={provider.id}
                  onClick={() => setSelectedProvider(provider.id)}
                  className={`w-full text-left p-4 rounded-lg mb-2 transition-all ${
                    selectedProvider === provider.id
                      ? 'bg-zinc-900 border border-zinc-700 shadow-sm'
                      : 'hover:bg-zinc-900/50 border border-transparent'
                  }`}
                >
                  <h3 className="font-semibold text-white truncate">{provider.name}</h3>
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-xs bg-red-500/10 text-red-400 border border-red-500/10 px-2 py-0.5 rounded-full font-medium">
                      {provider.serviceType}
                    </span>
                    <span className="text-xs text-zinc-500 truncate max-w-[120px]">{provider.phone || ''}</span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Provider Details */}
        <div className="w-2/3 bg-zinc-950 rounded-xl border border-zinc-900 shadow-sm flex flex-col overflow-hidden">
          {activeProvider ? (
            <div className="flex-1 p-6 overflow-y-auto">
              <div className="flex items-start justify-between mb-8 pb-6 border-b border-zinc-900">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-2xl font-bold text-white">{activeProvider.name}</h2>
                    <span className="text-sm bg-red-900/30 text-red-500 border border-red-900/40 px-3 py-1 rounded-full font-semibold">
                      {activeProvider.serviceType}
                    </span>
                  </div>
                  <p className="text-sm text-zinc-500">ID: {activeProvider.id}</p>
                </div>
                <button
                  onClick={() => removeProvider(activeProvider.id)}
                  className="px-3 py-1.5 text-xs font-semibold rounded border border-red-500/20 text-red-500 hover:bg-red-500/10 transition-colors"
                >
                  Excluir Prestador
                </button>
              </div>

              <div className="grid grid-cols-2 gap-6 text-sm text-zinc-400">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-zinc-900 flex items-center justify-center shrink-0">
                      <Briefcase className="w-5 h-5 text-zinc-500" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs text-zinc-500 font-medium">Especialidade / Serviço</span>
                      <span className="text-base text-zinc-300 font-semibold">{activeProvider.serviceType}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-zinc-900 flex items-center justify-center shrink-0">
                      <Building className="w-5 h-5 text-zinc-500" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs text-zinc-500 font-medium">CNPJ / CPF</span>
                      <span className="text-base text-zinc-300">{activeProvider.document || '-'}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-zinc-900 flex items-center justify-center shrink-0">
                      <MapPin className="w-5 h-5 text-zinc-500" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs text-zinc-500 font-medium">Endereço</span>
                      <span className="text-base text-zinc-300">{activeProvider.address || '-'}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-zinc-900 flex items-center justify-center shrink-0">
                      <Phone className="w-5 h-5 text-zinc-500" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs text-zinc-500 font-medium">Telefone / WhatsApp</span>
                      <span className="text-base text-zinc-300">{activeProvider.phone || '-'}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-zinc-900 flex items-center justify-center shrink-0">
                      <Mail className="w-5 h-5 text-zinc-500" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs text-zinc-500 font-medium">Email</span>
                      <span className="text-base text-zinc-300 truncate max-w-[280px]">{activeProvider.email || '-'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-zinc-500">
              <Briefcase className="w-12 h-12 mb-4 opacity-20" />
              <p>Selecione um prestador para visualizar os detalhes.</p>
            </div>
          )}
        </div>
      </div>

      {showAddForm && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-zinc-950 rounded-xl border border-zinc-900 shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-4 border-b border-zinc-900 flex justify-between items-center bg-zinc-900">
              <h2 className="font-semibold text-white flex items-center gap-2">
                <Briefcase className="w-5 h-5 text-red-600" />
                Novo Prestador de Serviço
              </h2>
              <button
                onClick={() => setShowAddForm(false)}
                className="text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddProvider} className="p-6 space-y-4">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1">Nome Completo / Empresa</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Carlos Silva Instalações"
                    value={newProvider.name}
                    onChange={(e) => setNewProvider({ ...newProvider, name: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1">Especialidade / Tipo de Serviço</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Instalação Hidráulica, Elétrica, Pintura, etc."
                    value={newProvider.serviceType}
                    onChange={(e) => setNewProvider({ ...newProvider, serviceType: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-1">CPF / CNPJ</label>
                    <input
                      type="text"
                      placeholder="000.000.000-00"
                      value={newProvider.document}
                      onChange={(e) => setNewProvider({ ...newProvider, document: e.target.value })}
                      className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-1">Telefone</label>
                    <input
                      type="text"
                      placeholder="(00) 00000-0000"
                      value={newProvider.phone}
                      onChange={(e) => setNewProvider({ ...newProvider, phone: e.target.value })}
                      className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1">Email</label>
                  <input
                    type="email"
                    placeholder="contato@prestador.com"
                    value={newProvider.email}
                    onChange={(e) => setNewProvider({ ...newProvider, email: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1">Endereço</label>
                  <input
                    type="text"
                    placeholder="Rua, Número, Bairro, Cidade"
                    value={newProvider.address}
                    onChange={(e) => setNewProvider({ ...newProvider, address: e.target.value })}
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
                  Salvar Prestador
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
