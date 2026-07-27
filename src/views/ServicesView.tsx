import React, { useState } from 'react';
import { PackageOpen, Search, Plus, Edit2, Trash2, X } from 'lucide-react';
import { Service } from '../types';
import { useStore } from '../store';

export function ServicesView() {
  const { data, updateData } = useStore();
  const [searchTerm, setSearchTerm] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);

  const [newService, setNewService] = useState<Partial<Service>>({
    codigo_interno: '',
    name: '',
    unit: 'Un.',
    price: 0
  });

  const services = data.services || [];

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();

    if (editingService) {
      const updated = services.map(s => s.id === editingService.id ? { ...editingService } as Service : s);
      updateData({ services: updated });
    } else {
      const service: Service = {
        id: `svc-${Date.now()}`,
        codigo_interno: newService.codigo_interno || '',
        name: newService.name || '',
        unit: newService.unit || 'Un.',
        price: Number(newService.price) || 0
      };
      updateData({ services: [...services, service] });
    }

    closeModal();
  };

  const handleDelete = (id: string) => {
    if (confirm('Tem certeza que deseja excluir este serviço?')) {
      updateData({ services: services.filter(s => s.id !== id) });
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingService(null);
    setNewService({
      codigo_interno: '',
      name: '',
      unit: 'Un.',
      price: 0
    });
  };

  const filteredServices = services.filter(s =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
    (s.codigo_interno && s.codigo_interno.toLowerCase().includes(searchTerm.toLowerCase()))
  );

  return (
    <div className="h-full flex flex-col p-8 animate-in fade-in duration-500">
      <div className="flex justify-between items-center mb-8">
        <div>
          <h1 className="text-3xl font-bold text-white tracking-tight flex items-center gap-3">
            <PackageOpen className="w-8 h-8 text-red-500" />
            Serviços
          </h1>
          <p className="text-zinc-400 mt-2">Catálogo de serviços para propostas e laudos.</p>
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-5 py-2.5 rounded-lg text-sm font-semibold transition-all shadow-lg shadow-red-900/20"
        >
          <Plus className="w-4 h-4" />
          Novo Serviço
        </button>
      </div>

      <div className="bg-zinc-900 border border-zinc-800 rounded-xl flex-1 flex flex-col overflow-hidden shadow-xl">
        <div className="p-4 border-b border-zinc-800 flex gap-4">
          <div className="relative flex-1 max-w-md">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
            <input
              type="text"
              placeholder="Buscar serviço..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full pl-9 pr-4 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm text-white focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
            />
          </div>
        </div>

        <div className="flex-1 overflow-auto">
          <table className="w-full text-sm text-left whitespace-nowrap">
            <thead className="bg-zinc-950/50 text-zinc-400 uppercase text-[11px] font-bold tracking-wider sticky top-0 z-10 backdrop-blur-sm">
              <tr>
                <th className="px-6 py-4">Cód. Interno</th>
                <th className="px-6 py-4">Nome do Serviço</th>
                <th className="px-6 py-4">Unidade</th>
                <th className="px-6 py-4">Preço Base</th>
                <th className="px-6 py-4 text-right">Ações</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-zinc-800">
              {filteredServices.map(service => (
                <tr key={service.id} className="hover:bg-zinc-800/50 transition-colors group">
                  <td className="px-6 py-4 text-zinc-400 font-mono text-xs">{service.codigo_interno || '-'}</td>
                  <td className="px-6 py-4 text-white font-medium">{service.name}</td>
                  <td className="px-6 py-4 text-zinc-400">{service.unit}</td>
                  <td className="px-6 py-4 text-emerald-400 font-medium">
                    R$ {service.price.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                  </td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex justify-end gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={() => {
                          setEditingService(service);
                          setShowModal(true);
                        }}
                        className="p-2 text-zinc-400 hover:text-white hover:bg-zinc-700 rounded-lg transition-colors"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(service.id)}
                        className="p-2 text-zinc-400 hover:text-red-400 hover:bg-red-900/30 rounded-lg transition-colors"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
              {filteredServices.length === 0 && (
                <tr>
                  <td colSpan={4} className="px-6 py-8 text-center text-zinc-500">
                    Nenhum serviço encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {showModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50 animate-in fade-in duration-200">
          <div className="bg-zinc-950 rounded-2xl border border-zinc-800 shadow-2xl w-full max-w-md overflow-hidden animate-in zoom-in-95 duration-200">
            <div className="p-6 border-b border-zinc-800 flex justify-between items-center bg-zinc-900/50">
              <h2 className="text-xl font-bold text-white flex items-center gap-2">
                <PackageOpen className="w-5 h-5 text-red-500" />
                {editingService ? 'Editar Serviço' : 'Novo Serviço'}
              </h2>
              <button
                onClick={closeModal}
                className="text-zinc-500 hover:text-white transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-6 space-y-5">
              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Cód. Interno (Opcional)</label>
                <input
                  type="text"
                  placeholder="Ex: SRV-01"
                  value={editingService ? editingService.codigo_interno || '' : newService.codigo_interno || ''}
                  onChange={e => {
                    if (editingService) setEditingService({ ...editingService, codigo_interno: e.target.value });
                    else setNewService({ ...newService, codigo_interno: e.target.value });
                  }}
                  className="w-full px-4 py-2.5 bg-zinc-900 border border-zinc-800 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Nome do Serviço</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Elaboração de Projeto PPCI"
                  value={editingService ? editingService.name : newService.name}
                  onChange={e => {
                    if (editingService) setEditingService({ ...editingService, name: e.target.value });
                    else setNewService({ ...newService, name: e.target.value });
                  }}
                  className="w-full px-4 py-2.5 bg-zinc-900 border border-zinc-800 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                />
              </div>

              <div className="grid grid-cols-2 gap-5">
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Unidade</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Un., Hora, m²"
                    value={editingService ? editingService.unit : newService.unit}
                    onChange={e => {
                      if (editingService) setEditingService({ ...editingService, unit: e.target.value });
                      else setNewService({ ...newService, unit: e.target.value });
                    }}
                    className="w-full px-4 py-2.5 bg-zinc-900 border border-zinc-800 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Preço Base (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    required
                    value={editingService ? editingService.price : newService.price}
                    onChange={e => {
                      const val = parseFloat(e.target.value) || 0;
                      if (editingService) setEditingService({ ...editingService, price: val });
                      else setNewService({ ...newService, price: val });
                    }}
                    className="w-full px-4 py-2.5 bg-zinc-900 border border-zinc-800 text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent transition-all"
                  />
                </div>
              </div>

              <div className="pt-6 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={closeModal}
                  className="px-5 py-2.5 text-sm font-semibold text-zinc-400 hover:text-white transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-6 py-2.5 bg-red-600 hover:bg-red-700 text-white text-sm font-semibold rounded-lg transition-all shadow-lg shadow-red-900/20"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
