import React, { useState } from 'react';
import { useStore } from '../store';
import { Truck, Plus, X, Phone, Mail, FileText, MapPin, Building, ShoppingBag } from 'lucide-react';
import { Supplier } from '../types';

export function SuppliersView() {
  const { data, updateData } = useStore();
  const [selectedSupplier, setSelectedSupplier] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  
  const [newSupplier, setNewSupplier] = useState<Partial<Supplier>>({
    name: '',
    productType: '',
    phone: '',
    email: '',
    document: '',
    address: '',
  });

  const suppliers = data.suppliers || [];
  const activeSupplier = suppliers.find(s => s.id === selectedSupplier);

  const handleAddSupplier = (e: React.FormEvent) => {
    e.preventDefault();

    const supplier: Supplier = {
      id: `s-${Date.now()}`,
      name: newSupplier.name || '',
      productType: newSupplier.productType || '',
      phone: newSupplier.phone || '',
      email: newSupplier.email || '',
      document: newSupplier.document || '',
      address: newSupplier.address || '',
    };

    updateData({ suppliers: [...suppliers, supplier] });
    setShowAddForm(false);
    setNewSupplier({
      name: '',
      productType: '',
      phone: '',
      email: '',
      document: '',
      address: '',
    });
    setSelectedSupplier(supplier.id);
  };

  const removeSupplier = (supplierId: string) => {
    if (confirm('Tem certeza que deseja remover este fornecedor?')) {
      updateData({ suppliers: suppliers.filter(s => s.id !== supplierId) });
      if (selectedSupplier === supplierId) setSelectedSupplier(null);
    }
  };

  return (
    <div className="flex flex-col h-full p-8 overflow-hidden">
      <div className="flex items-center justify-between mb-8 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-semibold text-white">Fornecedores</h1>
          <p className="text-zinc-400">Gerencie fabricantes e revendedores de extintores, sinalizações, mangueiras, etc.</p>
        </div>
        <button 
          onClick={() => setShowAddForm(true)}
          className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
        >
          <Plus className="w-4 h-4" />
          Novo Fornecedor
        </button>
      </div>

      <div className="flex gap-8 flex-1 min-h-0">
        {/* Suppliers List */}
        <div className="w-1/3 flex flex-col overflow-hidden bg-zinc-950 rounded-xl border border-zinc-900 shadow-sm">
          <div className="p-4 border-b border-zinc-900 bg-zinc-900 font-semibold text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Truck className="w-4 h-4 text-red-500" />
              Lista de Fornecedores
            </div>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {suppliers.length === 0 ? (
              <div className="p-4 text-sm text-zinc-500 text-center">Nenhum fornecedor cadastrado.</div>
            ) : (
              suppliers.map((supplier) => (
                <button
                  key={supplier.id}
                  onClick={() => setSelectedSupplier(supplier.id)}
                  className={`w-full text-left p-4 rounded-lg mb-2 transition-all ${
                    selectedSupplier === supplier.id
                      ? 'bg-zinc-900 border border-zinc-700 shadow-sm'
                      : 'hover:bg-zinc-900/50 border border-transparent'
                  }`}
                >
                  <h3 className="font-semibold text-white truncate">{supplier.name}</h3>
                  <div className="flex justify-between items-center mt-1">
                    <span className="text-xs bg-red-500/10 text-red-400 border border-red-500/10 px-2 py-0.5 rounded-full font-medium">
                      {supplier.productType}
                    </span>
                    <span className="text-xs text-zinc-500 truncate max-w-[120px]">{supplier.phone || ''}</span>
                  </div>
                </button>
              ))
            )}
          </div>
        </div>

        {/* Supplier Details */}
        <div className="w-2/3 bg-zinc-950 rounded-xl border border-zinc-900 shadow-sm flex flex-col overflow-hidden">
          {activeSupplier ? (
            <div className="flex-1 p-6 overflow-y-auto">
              <div className="flex items-start justify-between mb-8 pb-6 border-b border-zinc-900">
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-2xl font-bold text-white">{activeSupplier.name}</h2>
                    <span className="text-sm bg-red-900/30 text-red-500 border border-red-900/40 px-3 py-1 rounded-full font-semibold">
                      {activeSupplier.productType}
                    </span>
                  </div>
                  <p className="text-sm text-zinc-500">ID: {activeSupplier.id}</p>
                </div>
                <button
                  onClick={() => removeSupplier(activeSupplier.id)}
                  className="px-3 py-1.5 text-xs font-semibold rounded border border-red-500/20 text-red-500 hover:bg-red-500/10 transition-colors"
                >
                  Excluir Fornecedor
                </button>
              </div>

              <div className="grid grid-cols-2 gap-6 text-sm text-zinc-400">
                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-zinc-900 flex items-center justify-center shrink-0">
                      <ShoppingBag className="w-5 h-5 text-zinc-500" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs text-zinc-500 font-medium">Linha de Produtos</span>
                      <span className="text-base text-zinc-300 font-semibold">{activeSupplier.productType}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-zinc-900 flex items-center justify-center shrink-0">
                      <Building className="w-5 h-5 text-zinc-500" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs text-zinc-500 font-medium">CNPJ / CPF</span>
                      <span className="text-base text-zinc-300">{activeSupplier.document || '-'}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-zinc-900 flex items-center justify-center shrink-0">
                      <MapPin className="w-5 h-5 text-zinc-500" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs text-zinc-500 font-medium">Endereço</span>
                      <span className="text-base text-zinc-300">{activeSupplier.address || '-'}</span>
                    </div>
                  </div>
                </div>

                <div className="space-y-4">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-zinc-900 flex items-center justify-center shrink-0">
                      <Phone className="w-5 h-5 text-zinc-500" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs text-zinc-500 font-medium">Telefone</span>
                      <span className="text-base text-zinc-300">{activeSupplier.phone || '-'}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-full bg-zinc-900 flex items-center justify-center shrink-0">
                      <Mail className="w-5 h-5 text-zinc-500" />
                    </div>
                    <div className="flex flex-col">
                      <span className="text-xs text-zinc-500 font-medium">Email</span>
                      <span className="text-base text-zinc-300 truncate max-w-[280px]">{activeSupplier.email || '-'}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-zinc-500">
              <Truck className="w-12 h-12 mb-4 opacity-20" />
              <p>Selecione um fornecedor para visualizar os detalhes.</p>
            </div>
          )}
        </div>
      </div>

      {showAddForm && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-zinc-950 rounded-xl border border-zinc-900 shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-4 border-b border-zinc-900 flex justify-between items-center bg-zinc-900">
              <h2 className="font-semibold text-white flex items-center gap-2">
                <Truck className="w-5 h-5 text-red-600" />
                Novo Fornecedor
              </h2>
              <button
                onClick={() => setShowAddForm(false)}
                className="text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddSupplier} className="p-6 space-y-4">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1">Razão Social / Nome Fantasia</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Extintores Sul Distribuidora"
                    value={newSupplier.name}
                    onChange={(e) => setNewSupplier({ ...newSupplier, name: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1">Linha de Produtos / Materiais</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Placas Fotoluminescentes, Equipamentos contra Incêndio"
                    value={newSupplier.productType}
                    onChange={(e) => setNewSupplier({ ...newSupplier, productType: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-1">CPF / CNPJ</label>
                    <input
                      type="text"
                      placeholder="00.000.000/0001-00"
                      value={newSupplier.document}
                      onChange={(e) => setNewSupplier({ ...newSupplier, document: e.target.value })}
                      className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-1">Telefone</label>
                    <input
                      type="text"
                      placeholder="(00) 00000-0000"
                      value={newSupplier.phone}
                      onChange={(e) => setNewSupplier({ ...newSupplier, phone: e.target.value })}
                      className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1">Email</label>
                  <input
                    type="email"
                    placeholder="contato@fornecedor.com"
                    value={newSupplier.email}
                    onChange={(e) => setNewSupplier({ ...newSupplier, email: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1">Endereço Comercial</label>
                  <input
                    type="text"
                    placeholder="Rua, Número, Bairro, Cidade"
                    value={newSupplier.address}
                    onChange={(e) => setNewSupplier({ ...newSupplier, address: e.target.value })}
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
                  Salvar Fornecedor
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
