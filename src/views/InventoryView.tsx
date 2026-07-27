import React, { useState, useMemo } from 'react';
import { useStore } from '../store';
import { 
  Plus, 
  ArrowRightLeft, 
  Search, 
  Trash2, 
  X, 
  Edit2, 
  TrendingUp, 
  TrendingDown,
  DollarSign, 
  Package, 
  Tag, 
  Percent, 
  Save,
  Calendar,
  History,
  Truck,
  Info,
  Filter
} from 'lucide-react';
import { InventoryItem, InventoryTransaction, Supplier } from '../types';

export function InventoryView() {
  const { data, updateData } = useStore();
  
  // Tab state
  const [activeTab, setActiveTab] = useState<'estoque' | 'historico'>('estoque');
  
  // Modals state
  const [showAddModal, setShowAddModal] = useState(false);
  const [showTransactionModal, setShowTransactionModal] = useState(false);
  const [editingItem, setEditingItem] = useState<InventoryItem | null>(null);
  
  // Filter and search state
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<string | null>(null);

  // History filters
  const [historySearch, setHistorySearch] = useState('');
  const [historyTypeFilter, setHistoryTypeFilter] = useState<'all' | 'entrada' | 'saida'>('all');

  // New Item form state
  const [newItem, setNewItem] = useState({
    codigo_interno: '',
    codigo_norma: '',
    simbolo_tipo: 'Proibição' as 'Proibição' | 'Alerta' | 'Emergência' | 'Extintor' | 'Serviço' | 'Projeto',
    significado: '',
    dimensoes: '',
    qtd_estoque: 0,
    valor_pago: 0,
    custo_unitario: 0,
    margem: 50,
    preco_sugerido: undefined as number | undefined,
    supplierId: 'none',
    notes: 'Estoque Inicial',
  });

  // Transaction form state
  const [transaction, setTransaction] = useState({
    itemId: '',
    type: 'entrada' as 'entrada' | 'saida',
    quantity: 1,
    valor_pago: 0,
    date: new Date().toISOString().split('T')[0],
    supplierId: 'none',
    notes: '',
  });

  const inventory = data.inventory || [];
  const suppliers = data.suppliers || [];
  const transactions = data.inventoryTransactions || [];

  // Summary statistics for current stock
  const stats = useMemo(() => {
    let totalItems = 0;
    let totalInvested = 0;
    let totalPotentialSales = 0;

    inventory.forEach(item => {
      totalItems += item.qtd_estoque;
      const cost = item.valor_pago !== undefined ? item.valor_pago : item.custo_unitario;
      totalInvested += item.qtd_estoque * cost;
      const salePrice = item.simbolo_tipo === 'Projeto' && item.preco_sugerido !== undefined
        ? item.preco_sugerido
        : item.custo_unitario * (1 + (item.margem / 100));
      totalPotentialSales += item.qtd_estoque * salePrice;
    });

    return {
      totalItems,
      totalInvested,
      totalPotentialSales,
    };
  }, [inventory]);

  // Summary statistics for transaction history
  const historyStats = useMemo(() => {
    let totalEntradasValue = 0;
    let totalEntradasQty = 0;
    let totalSaidasValue = 0;
    let totalSaidasQty = 0;

    transactions.forEach(tx => {
      if (tx.type === 'entrada') {
        totalEntradasValue += tx.quantity * tx.valor_pago;
        totalEntradasQty += tx.quantity;
      } else {
        totalSaidasValue += tx.quantity * tx.valor_pago;
        totalSaidasQty += tx.quantity;
      }
    });

    return {
      totalEntradasValue,
      totalEntradasQty,
      totalSaidasValue,
      totalSaidasQty,
    };
  }, [transactions]);

  // Handle Add Item
  const handleAddItem = (e: React.FormEvent) => {
    e.preventDefault();

    const valorPagoNum = Number(newItem.valor_pago) || 0;
    const custoNum = Number(newItem.custo_unitario) || valorPagoNum || 0;
    const qtyEstoque = Number(newItem.qtd_estoque) || 0;

    const createdItem: InventoryItem = {
      id: `i-${Date.now()}`,
      codigo_interno: newItem.codigo_interno,
      codigo_norma: newItem.codigo_norma,
      simbolo_tipo: newItem.simbolo_tipo,
      significado: newItem.significado,
      dimensoes: newItem.dimensoes || '-',
      qtd_estoque: qtyEstoque,
      qtd_venda: 0,
      custo_unitario: custoNum,
      valor_pago: valorPagoNum,
      margem: Number(newItem.margem) || 0,
      preco_sugerido: newItem.preco_sugerido,
    };

    // If initial quantity is greater than 0, create an entry transaction record
    let updatedTransactions = [...transactions];
    if (qtyEstoque > 0) {
      const selectedSup = suppliers.find(s => s.id === newItem.supplierId);
      const initialTx: InventoryTransaction = {
        id: `t-${Date.now()}`,
        itemId: createdItem.id,
        itemName: createdItem.significado,
        itemCodigoNorma: createdItem.codigo_norma,
        type: 'entrada',
        quantity: qtyEstoque,
        valor_pago: valorPagoNum,
        date: new Date().toISOString().split('T')[0],
        supplierId: newItem.supplierId !== 'none' ? newItem.supplierId : undefined,
        supplierName: newItem.supplierId !== 'none' ? selectedSup?.name : undefined,
        notes: newItem.notes || 'Estoque Inicial',
      };
      updatedTransactions = [initialTx, ...updatedTransactions];
    }

    updateData({ 
      inventory: [...inventory, createdItem],
      inventoryTransactions: updatedTransactions
    });

    setShowAddModal(false);
    
    // Reset form
    setNewItem({
      codigo_interno: '',
      codigo_norma: '',
      simbolo_tipo: 'Proibição',
      significado: '',
      dimensoes: '',
      qtd_estoque: 0,
      valor_pago: 0,
      custo_unitario: 0,
      margem: 50,
      supplierId: 'none',
      notes: 'Estoque Inicial',
    });
  };

  // Handle transaction (Entrada / Saída)
  const handleTransactionSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!transaction.itemId) return;

    const targetItem = inventory.find(i => i.id === transaction.itemId);
    if (!targetItem) return;

    const qtyChange = Number(transaction.quantity) || 0;
    const isEntrada = transaction.type === 'entrada';
    const valPago = isEntrada ? (Number(transaction.valor_pago) || targetItem.custo_unitario) : targetItem.custo_unitario;

    const updatedInventory = inventory.map(item => {
      if (item.id === transaction.itemId) {
        const newQty = isEntrada 
          ? item.qtd_estoque + qtyChange 
          : Math.max(0, item.qtd_estoque - qtyChange);

        const updated = {
          ...item,
          qtd_estoque: newQty,
        };

        if (isEntrada) {
          updated.valor_pago = valPago;
          updated.custo_unitario = valPago; // Sync unit cost to the latest purchase cost
        }

        return updated;
      }
      return item;
    });

    // Create Transaction history entry
    const selectedSup = suppliers.find(s => s.id === transaction.supplierId);
    const newTx: InventoryTransaction = {
      id: `t-${Date.now()}`,
      itemId: targetItem.id,
      itemName: targetItem.significado,
      itemCodigoNorma: targetItem.codigo_norma,
      type: transaction.type,
      quantity: qtyChange,
      valor_pago: valPago,
      date: transaction.date || new Date().toISOString().split('T')[0],
      supplierId: transaction.supplierId !== 'none' ? transaction.supplierId : undefined,
      supplierName: transaction.supplierId !== 'none' ? selectedSup?.name : undefined,
      notes: transaction.notes || (isEntrada ? 'Compra / Reposição' : 'Consumo / Saída'),
    };

    updateData({ 
      inventory: updatedInventory,
      inventoryTransactions: [newTx, ...transactions]
    });

    setShowTransactionModal(false);
    
    // Reset transaction form
    setTransaction({
      itemId: inventory[0]?.id || '',
      type: 'entrada',
      quantity: 1,
      valor_pago: 0,
      date: new Date().toISOString().split('T')[0],
      supplierId: 'none',
      notes: '',
    });
  };

  // Handle Edit Item
  const handleEditItemSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingItem) return;

    const updatedInventory = inventory.map(item => {
      if (item.id === editingItem.id) {
        return {
          ...editingItem,
          qtd_estoque: Number(editingItem.qtd_estoque) || 0,
          custo_unitario: Number(editingItem.custo_unitario) || 0,
          valor_pago: Number(editingItem.valor_pago) || 0,
          margem: Number(editingItem.margem) || 0,
        };
      }
      return item;
    });

    updateData({ inventory: updatedInventory });
    setEditingItem(null);
  };

  // Handle Delete Item
  const handleDeleteItem = (itemId: string) => {
    if (confirm('Tem certeza que deseja remover este material do estoque?')) {
      const updatedInventory = inventory.filter(i => i.id !== itemId);
      updateData({ inventory: updatedInventory });
    }
  };

  // Handle Delete Transaction history record
  const handleDeleteTransaction = (txId: string) => {
    if (confirm('Tem certeza que deseja remover este registro do histórico de movimentação? Isso NÃO reverterá a quantidade física atual do estoque.')) {
      const updatedTransactions = transactions.filter(t => t.id !== txId);
      updateData({ inventoryTransactions: updatedTransactions });
    }
  };

  // Filter items
  const filteredInventory = useMemo(() => {
    return inventory.filter(item => {
      const matchesSearch = 
        item.significado.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.codigo_norma.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.codigo_interno.toLowerCase().includes(searchQuery.toLowerCase());
      
      const matchesFilter = activeFilter ? item.simbolo_tipo === activeFilter : true;
      
      return matchesSearch && matchesFilter;
    });
  }, [inventory, searchQuery, activeFilter]);

  // Filtered transactions
  const filteredTransactions = useMemo(() => {
    return transactions.filter(tx => {
      const matchesSearch = 
        tx.itemName.toLowerCase().includes(historySearch.toLowerCase()) ||
        tx.itemCodigoNorma.toLowerCase().includes(historySearch.toLowerCase()) ||
        (tx.supplierName && tx.supplierName.toLowerCase().includes(historySearch.toLowerCase())) ||
        (tx.notes && tx.notes.toLowerCase().includes(historySearch.toLowerCase()));
      
      const matchesType = historyTypeFilter === 'all' ? true : tx.type === historyTypeFilter;

      return matchesSearch && matchesType;
    });
  }, [transactions, historySearch, historyTypeFilter]);

  return (
    <div className="p-8 h-full flex flex-col overflow-hidden">
      
      {/* Header */}
      <div className="flex justify-between items-center mb-6 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-semibold text-white">Estoque e Materiais</h1>
          <p className="text-zinc-400">Controle de equipamentos, produtos e materiais em estoque.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => {
              if (inventory.length > 0) {
                setTransaction({
                  itemId: inventory[0].id,
                  type: 'entrada',
                  quantity: 1,
                  valor_pago: inventory[0].custo_unitario,
                  date: new Date().toISOString().split('T')[0],
                  supplierId: 'none',
                  notes: '',
                });
              }
              setShowTransactionModal(true);
            }}
            className="flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 px-4 py-2 rounded-md text-sm font-medium transition-colors"
          >
            <ArrowRightLeft className="w-4 h-4 text-red-500" />
            Lançar Movimentação
          </button>
          <button 
            onClick={() => setShowAddModal(true)}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Cadastrar Item
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 mb-4 flex-shrink-0 border-b border-zinc-900">
        <button
          onClick={() => setActiveTab('estoque')}
          className={`pb-3 text-sm font-semibold border-b-2 px-1 transition-colors flex items-center gap-2 ${
            activeTab === 'estoque' 
              ? 'border-red-600 text-white' 
              : 'border-transparent text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <Package className="w-4 h-4" />
          Estoque Atual
        </button>
        <button
          onClick={() => setActiveTab('historico')}
          className={`pb-3 text-sm font-semibold border-b-2 px-1 transition-colors flex items-center gap-2 ${
            activeTab === 'historico' 
              ? 'border-red-600 text-white' 
              : 'border-transparent text-zinc-500 hover:text-zinc-300'
          }`}
        >
          <History className="w-4 h-4" />
          Histórico de Compras e Entradas
        </button>
      </div>

      {/* Summary Cards */}
      {activeTab === 'estoque' ? (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 flex-shrink-0">
          <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-900 flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-red-500/10 flex items-center justify-center border border-red-500/20">
              <Package className="w-6 h-6 text-red-500" />
            </div>
            <div>
              <span className="text-xs text-zinc-500 font-semibold block uppercase">Unidades em Estoque</span>
              <span className="text-2xl font-bold text-white block">{stats.totalItems}</span>
            </div>
          </div>

          <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-900 flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
              <DollarSign className="w-6 h-6 text-emerald-500" />
            </div>
            <div>
              <span className="text-xs text-zinc-500 font-semibold block uppercase">Total Investido (Valor Pago)</span>
              <span className="text-2xl font-bold text-emerald-400 block">
                R$ {stats.totalInvested.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>

          <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-900 flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-blue-500/10 flex items-center justify-center border border-blue-500/20">
              <TrendingUp className="w-6 h-6 text-blue-500" />
            </div>
            <div>
              <span className="text-xs text-zinc-500 font-semibold block uppercase">Valor Estimado de Venda</span>
              <span className="text-2xl font-bold text-blue-400 block">
                R$ {stats.totalPotentialSales.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6 flex-shrink-0">
          <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-900 flex items-center gap-4 col-span-1 md:col-span-2">
            <div className="w-12 h-12 rounded-lg bg-emerald-500/10 flex items-center justify-center border border-emerald-500/20">
              <TrendingUp className="w-6 h-6 text-emerald-500" />
            </div>
            <div className="grid grid-cols-2 gap-4 w-full">
              <div>
                <span className="text-xs text-zinc-500 font-semibold block uppercase">Total Gasto em Compras</span>
                <span className="text-xl font-bold text-emerald-400 block">
                  R$ {historyStats.totalEntradasValue.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
                </span>
              </div>
              <div>
                <span className="text-xs text-zinc-500 font-semibold block uppercase">Materiais Comprados</span>
                <span className="text-xl font-bold text-white block">
                  {historyStats.totalEntradasQty} unidades
                </span>
              </div>
            </div>
          </div>

          <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-900 flex items-center gap-4">
            <div className="w-12 h-12 rounded-lg bg-red-500/10 flex items-center justify-center border border-red-500/20">
              <TrendingDown className="w-6 h-6 text-red-500" />
            </div>
            <div>
              <span className="text-xs text-zinc-500 font-semibold block uppercase">Materiais Retirados (Saídas)</span>
              <span className="text-xl font-bold text-red-400 block">
                {historyStats.totalSaidasQty} unidades
              </span>
            </div>
          </div>
        </div>
      )}

      {/* Table & Controls wrapper */}
      <div className="bg-zinc-950 rounded-xl border border-zinc-900 shadow-sm flex flex-col flex-1 min-h-0 overflow-hidden">
        
        {/* TAB 1: ESTOQUE ATUAL */}
        {activeTab === 'estoque' && (
          <>
            {/* Table Filters header */}
            <div className="p-4 border-b border-zinc-900 flex flex-col sm:flex-row gap-4 items-center justify-between bg-zinc-900/30">
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input 
                  type="text" 
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  placeholder="Buscar material pelo nome ou código..." 
                  className="pl-9 pr-4 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm w-full text-white focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                />
              </div>
              
              <div className="flex gap-2 text-sm text-zinc-400 font-medium overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0 scrollbar-none">
                <button
                  onClick={() => setActiveFilter(null)}
                  className={`px-3 py-1.5 rounded-full whitespace-nowrap text-xs font-semibold transition-all ${
                    activeFilter === null 
                      ? 'bg-red-600 text-white shadow-md shadow-red-900/20' 
                      : 'bg-zinc-900 hover:bg-zinc-850 text-zinc-400 hover:text-white border border-zinc-800'
                  }`}
                >
                  TODOS
                </button>
                {['Proibição', 'Alerta', 'Emergência', 'Extintor', 'Serviço', 'Projeto'].map((type) => (
                  <button
                    key={type}
                    onClick={() => setActiveFilter(type)}
                    className={`px-3 py-1.5 rounded-full whitespace-nowrap text-xs font-semibold transition-all ${
                      activeFilter === type 
                        ? 'bg-red-600 text-white shadow-md shadow-red-900/20' 
                        : 'bg-zinc-900 hover:bg-zinc-850 text-zinc-400 hover:text-white border border-zinc-800'
                    }`}
                  >
                    {type.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {/* Inventory List Table */}
            <div className="overflow-auto flex-1">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-zinc-900/80 text-zinc-400 sticky top-0 uppercase text-[11px] font-bold tracking-wider border-b border-zinc-900 z-10">
                  <tr>
                    <th className="px-5 py-3.5">Cód. Interno</th>
                    <th className="px-5 py-3.5">Código Norma</th>
                    <th className="px-5 py-3.5">Tipo</th>
                    <th className="px-5 py-3.5 w-1/4">Significado / Material</th>
                    <th className="px-5 py-3.5">Dimensões (mm)</th>
                    <th className="px-5 py-3.5 text-center">Qtd. Estoque</th>
                    <th className="px-5 py-3.5 text-right">Preço de Compra (Último)</th>
                    <th className="px-5 py-3.5 text-right">Margem</th>
                    <th className="px-5 py-3.5 text-right">Preço Venda (Sugerido)</th>
                    <th className="px-5 py-3.5 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-900 text-zinc-300">
                  {filteredInventory.map((item) => {
                    const precoVenda = item.simbolo_tipo === 'Projeto' && item.preco_sugerido !== undefined 
                      ? item.preco_sugerido 
                      : item.custo_unitario * (1 + (item.margem / 100));
                    const displayValorPago = item.valor_pago !== undefined ? item.valor_pago : item.custo_unitario;

                    return (
                      <tr key={item.id} className="hover:bg-zinc-900/40 transition-colors">
                        <td className="px-5 py-3.5 text-zinc-500 font-mono text-xs">{item.codigo_interno || '-'}</td>
                        <td className="px-5 py-3.5 font-semibold text-white font-mono">{item.codigo_norma}</td>
                        <td className="px-5 py-3.5">
                          <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold border ${
                            item.simbolo_tipo === 'Proibição' ? 'bg-red-500/10 text-red-400 border-red-500/20' :
                            item.simbolo_tipo === 'Alerta' ? 'bg-amber-500/10 text-amber-400 border-amber-500/20' :
                            item.simbolo_tipo === 'Emergência' ? 'bg-green-500/10 text-green-400 border-green-500/20' :
                            item.simbolo_tipo === 'Serviço' ? 'bg-purple-500/10 text-purple-400 border-purple-500/20' :
                            item.simbolo_tipo === 'Projeto' ? 'bg-teal-500/10 text-teal-400 border-teal-500/20' :
                            'bg-blue-500/10 text-blue-400 border-blue-500/20'
                          }`}>
                            {item.simbolo_tipo}
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-zinc-200 truncate max-w-xs">{item.significado}</td>
                        <td className="px-5 py-3.5 text-zinc-400 font-mono text-xs">{item.dimensoes}</td>
                        <td className="px-5 py-3.5 text-center">
                          <span className={`font-bold px-2.5 py-1 rounded text-xs ${
                            item.qtd_estoque <= 2 ? 'bg-red-500/15 text-red-400 border border-red-500/20' :
                            item.qtd_estoque <= 5 ? 'bg-amber-500/15 text-amber-400 border border-amber-500/20' :
                            'bg-zinc-900 text-white'
                          }`}>
                            {item.qtd_estoque} un
                          </span>
                        </td>
                        <td className="px-5 py-3.5 text-right text-zinc-300 font-mono">
                          R$ {displayValorPago.toFixed(2).replace('.', ',')}
                        </td>
                        <td className="px-5 py-3.5 text-right text-zinc-500 font-mono">{item.margem}%</td>
                        <td className="px-5 py-3.5 text-right font-semibold text-emerald-400 font-mono">
                          R$ {precoVenda.toFixed(2).replace('.', ',')}
                        </td>
                        <td className="px-5 py-3.5 text-center">
                          <div className="flex items-center justify-center gap-2">
                            <button 
                              onClick={() => setEditingItem(item)}
                              className="p-1 text-zinc-400 hover:text-white hover:bg-zinc-800 rounded transition-colors"
                              title="Editar Item"
                            >
                              <Edit2 className="w-3.5 h-3.5" />
                            </button>
                            <button 
                              onClick={() => handleDeleteItem(item.id)}
                              className="p-1 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                              title="Remover Item"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredInventory.length === 0 && (
                    <tr>
                      <td colSpan={10} className="px-5 py-12 text-center text-zinc-600">
                        Nenhum item encontrado com os filtros aplicados.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}

        {/* TAB 2: HISTÓRICO DE COMPRAS E MOVIMENTAÇÃO */}
        {activeTab === 'historico' && (
          <>
            {/* Table Filters header */}
            <div className="p-4 border-b border-zinc-900 flex flex-col sm:flex-row gap-4 items-center justify-between bg-zinc-900/30">
              <div className="relative w-full sm:w-64">
                <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
                <input 
                  type="text" 
                  value={historySearch}
                  onChange={(e) => setHistorySearch(e.target.value)}
                  placeholder="Buscar histórico por produto ou fornecedor..." 
                  className="pl-9 pr-4 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm w-full text-white focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
                />
              </div>
              
              <div className="flex gap-2 text-sm text-zinc-400 font-medium">
                <button
                  onClick={() => setHistoryTypeFilter('all')}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all ${
                    historyTypeFilter === 'all' 
                      ? 'bg-red-600 text-white shadow-md shadow-red-900/20' 
                      : 'bg-zinc-900 hover:bg-zinc-850 text-zinc-400 hover:text-white border border-zinc-800'
                  }`}
                >
                  TODAS
                </button>
                <button
                  onClick={() => setHistoryTypeFilter('entrada')}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1 ${
                    historyTypeFilter === 'entrada' 
                      ? 'bg-emerald-600 text-white shadow-md shadow-emerald-900/20' 
                      : 'bg-zinc-900 hover:bg-zinc-850 text-zinc-400 hover:text-white border border-zinc-800'
                  }`}
                >
                  <TrendingUp className="w-3.5 h-3.5 text-emerald-400" />
                  ENTRADAS (COMPRAS)
                </button>
                <button
                  onClick={() => setHistoryTypeFilter('saida')}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all flex items-center gap-1 ${
                    historyTypeFilter === 'saida' 
                      ? 'bg-red-650 text-white shadow-md shadow-red-900/20' 
                      : 'bg-zinc-900 hover:bg-zinc-850 text-zinc-400 hover:text-white border border-zinc-800'
                  }`}
                >
                  <TrendingDown className="w-3.5 h-3.5 text-red-400" />
                  SAÍDAS (RETIRADAS)
                </button>
              </div>
            </div>

            {/* Transactions History Table */}
            <div className="overflow-auto flex-1">
              <table className="w-full text-left text-sm whitespace-nowrap">
                <thead className="bg-zinc-900/80 text-zinc-400 sticky top-0 uppercase text-[11px] font-bold tracking-wider border-b border-zinc-900 z-10">
                  <tr>
                    <th className="px-5 py-3.5">Data</th>
                    <th className="px-5 py-3.5">Cód. Norma</th>
                    <th className="px-5 py-3.5 w-1/4">Material / Produto</th>
                    <th className="px-5 py-3.5">Tipo</th>
                    <th className="px-5 py-3.5 text-center">Quantidade</th>
                    <th className="px-5 py-3.5 text-right">Custo de Compra (Unitário)</th>
                    <th className="px-5 py-3.5 text-right">Valor Total</th>
                    <th className="px-5 py-3.5">Fornecedor</th>
                    <th className="px-5 py-3.5">Notas/Observações</th>
                    <th className="px-5 py-3.5 text-center">Ações</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-zinc-900 text-zinc-300">
                  {filteredTransactions.map((tx) => {
                    const totalTxVal = tx.quantity * tx.valor_pago;
                    const formattedDate = tx.date ? new Date(tx.date + 'T12:00:00').toLocaleDateString('pt-BR') : '-';

                    return (
                      <tr key={tx.id} className="hover:bg-zinc-900/40 transition-colors">
                        <td className="px-5 py-3.5 text-zinc-400 font-mono text-xs flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-zinc-600" />
                          {formattedDate}
                        </td>
                        <td className="px-5 py-3.5 font-semibold text-white font-mono">{tx.itemCodigoNorma}</td>
                        <td className="px-5 py-3.5 text-zinc-200 truncate max-w-xs">{tx.itemName}</td>
                        <td className="px-5 py-3.5">
                          {tx.type === 'entrada' ? (
                            <span className="text-[10px] px-2.5 py-0.5 rounded-full font-bold border bg-emerald-500/10 text-emerald-400 border-emerald-500/20 flex items-center gap-1 w-fit">
                              <TrendingUp className="w-3 h-3 text-emerald-400" />
                              Entrada
                            </span>
                          ) : (
                            <span className="text-[10px] px-2.5 py-0.5 rounded-full font-bold border bg-red-500/10 text-red-400 border-red-500/20 flex items-center gap-1 w-fit">
                              <TrendingDown className="w-3 h-3 text-red-400" />
                              Saída
                            </span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-center font-semibold text-white">
                          {tx.quantity} un
                        </td>
                        <td className="px-5 py-3.5 text-right text-zinc-400 font-mono">
                          R$ {tx.valor_pago.toFixed(2).replace('.', ',')}
                        </td>
                        <td className={`px-5 py-3.5 text-right font-semibold font-mono ${tx.type === 'entrada' ? 'text-emerald-400' : 'text-zinc-400'}`}>
                          R$ {totalTxVal.toFixed(2).replace('.', ',')}
                        </td>
                        <td className="px-5 py-3.5 text-zinc-400 max-w-xs truncate">
                          {tx.supplierName ? (
                            <span className="flex items-center gap-1.5 text-zinc-300 font-medium">
                              <Truck className="w-3.5 h-3.5 text-zinc-500" />
                              {tx.supplierName}
                            </span>
                          ) : (
                            <span className="text-zinc-600 italic">Não informado</span>
                          )}
                        </td>
                        <td className="px-5 py-3.5 text-zinc-500 text-xs italic max-w-xs truncate" title={tx.notes}>
                          {tx.notes || '-'}
                        </td>
                        <td className="px-5 py-3.5 text-center">
                          <button 
                            onClick={() => handleDeleteTransaction(tx.id)}
                            className="p-1 text-zinc-600 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                            title="Remover Registro Histórico"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                  {filteredTransactions.length === 0 && (
                    <tr>
                      <td colSpan={10} className="px-5 py-12 text-center text-zinc-600">
                        Nenhum registro de movimentação encontrado.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </>
        )}
      </div>

      {/* Modal: Novo Item */}
      {showAddModal && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50 overflow-y-auto">
          <div className="bg-zinc-950 rounded-xl border border-zinc-900 shadow-xl w-full max-w-lg my-8 overflow-hidden flex flex-col">
            <div className="p-4 border-b border-zinc-900 flex justify-between items-center bg-zinc-900">
              <h2 className="font-semibold text-white flex items-center gap-2">
                <Package className="w-5 h-5 text-red-600" />
                Cadastrar Novo Material
              </h2>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleAddItem} className="p-6 space-y-4 overflow-y-auto">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">Cód. Interno</label>
                  <input
                    type="text"
                    required={newItem.simbolo_tipo === 'Projeto'}
                    placeholder="Ex: 35"
                    value={newItem.codigo_interno}
                    onChange={(e) => setNewItem({ ...newItem, codigo_interno: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">Cód. Norma / Identificação</label>
                  <input
                    type="text"
                    required={newItem.simbolo_tipo !== 'Projeto'}
                    placeholder="Ex: P1, E1, M2"
                    value={newItem.codigo_norma}
                    onChange={(e) => setNewItem({ ...newItem, codigo_norma: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">Classificação / Tipo</label>
                  <select
                    value={newItem.simbolo_tipo}
                    onChange={(e) => setNewItem({ ...newItem, simbolo_tipo: e.target.value as any })}
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
                  >
                    <option value="Proibição">Proibição</option>
                    <option value="Alerta">Alerta</option>
                    <option value="Emergência">Emergência</option>
                    <option value="Extintor">Extintor</option>
                    <option value="Serviço">Serviço</option>
                    <option value="Projeto">Projeto</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">Dimensões (mm)</label>
                  <input
                    type="text"
                    placeholder="Ex: 200 x 200"
                    value={newItem.dimensoes}
                    onChange={(e) => setNewItem({ ...newItem, dimensoes: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">Significado / Descrição do Material</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Placa Proibido Fumar, Extintor CO2 6Kg"
                  value={newItem.significado}
                  onChange={(e) => setNewItem({ ...newItem, significado: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">Qtd. Inicial</label>
                  <input
                    type="number"
                    min="0"
                    required={newItem.simbolo_tipo !== 'Projeto'}
                    placeholder="0"
                    value={newItem.qtd_estoque || ''}
                    onChange={(e) => setNewItem({ ...newItem, qtd_estoque: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
                  />
                </div>

                {newItem.simbolo_tipo === 'Projeto' ? (
                  <div className="col-span-2">
                    <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">Preço Sugerido de Venda</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-xs">R$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        placeholder="0,00"
                        value={newItem.preco_sugerido || ''}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          setNewItem({ ...newItem, preco_sugerido: val, valor_pago: 0, custo_unitario: 0, margem: 0 });
                        }}
                        className="w-full pl-8 pr-3 py-2 bg-zinc-900 border border-zinc-800 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
                      />
                    </div>
                  </div>
                ) : (
                  <>
                    <div>
                      <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">Valor de Compra (Un)</label>
                      <div className="relative">
                        <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-xs">R$</span>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          required
                          placeholder="0,00"
                          value={newItem.valor_pago || ''}
                          onChange={(e) => {
                            const val = parseFloat(e.target.value) || 0;
                            setNewItem({ ...newItem, valor_pago: val, custo_unitario: val });
                          }}
                          className="w-full pl-8 pr-3 py-2 bg-zinc-900 border border-zinc-800 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
                        />
                      </div>
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">Margem Lucro (%)</label>
                      <div className="relative">
                        <input
                          type="number"
                          min="0"
                          required
                          placeholder="50"
                          value={newItem.margem || ''}
                          onChange={(e) => setNewItem({ ...newItem, margem: parseInt(e.target.value) || 0 })}
                          className="w-full pr-7 pl-3 py-2 bg-zinc-900 border border-zinc-800 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
                        />
                        <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 text-xs">%</span>
                      </div>
                    </div>
                  </>
                )}
              </div>

              {newItem.qtd_estoque > 0 && (
                <div className="grid grid-cols-2 gap-4 pt-2 border-t border-zinc-900">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">Fornecedor Inicial</label>
                    <select
                      value={newItem.supplierId}
                      onChange={(e) => setNewItem({ ...newItem, supplierId: e.target.value })}
                      className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
                    >
                      <option value="none">Nenhum / Não informado</option>
                      {suppliers.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">Nota Inicial</label>
                    <input
                      type="text"
                      value={newItem.notes}
                      onChange={(e) => setNewItem({ ...newItem, notes: e.target.value })}
                      className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
                    />
                  </div>
                </div>
              )}

              {/* Live Preview Price Calculation */}
              <div className="bg-zinc-900 p-3 rounded-lg border border-zinc-850">
                <div className="flex justify-between text-xs text-zinc-400">
                  <span>Preço Sugerido de Venda:</span>
                  <span className="font-bold text-emerald-400">
                    R$ {(newItem.simbolo_tipo === 'Projeto' ? (newItem.preco_sugerido || 0) : ((newItem.custo_unitario || newItem.valor_pago || 0) * (1 + (newItem.margem / 100)))).toFixed(2).replace('.', ',')}
                  </span>
                </div>
              </div>

              <div className="pt-4 border-t border-zinc-900 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-white transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-md transition-colors"
                >
                  Salvar Material
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Lançar Movimentação / Compra */}
      {showTransactionModal && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-zinc-950 rounded-xl border border-zinc-900 shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-4 border-b border-zinc-900 flex justify-between items-center bg-zinc-900">
              <h2 className="font-semibold text-white flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5 text-red-600" />
                Registrar Movimentação de Estoque
              </h2>
              <button
                onClick={() => setShowTransactionModal(false)}
                className="text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {inventory.length === 0 ? (
              <div className="p-6 text-center text-zinc-500 space-y-4">
                <p>Nenhum material cadastrado para movimentar. Cadastre um item primeiro.</p>
                <button
                  onClick={() => {
                    setShowTransactionModal(false);
                    setShowAddModal(true);
                  }}
                  className="bg-red-600 hover:bg-red-700 text-white text-xs px-3 py-1.5 rounded font-medium"
                >
                  Criar Primeiro Item
                </button>
              </div>
            ) : (
              <form onSubmit={handleTransactionSubmit} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">Selecionar Material</label>
                  <select
                    required
                    value={transaction.itemId}
                    onChange={(e) => {
                      const selId = e.target.value;
                      const selItem = inventory.find(i => i.id === selId);
                      setTransaction({ 
                        ...transaction, 
                        itemId: selId,
                        valor_pago: selItem ? selItem.custo_unitario : 0
                      });
                    }}
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
                  >
                    {inventory.map((item) => (
                      <option key={item.id} value={item.id}>
                        [{item.codigo_norma}] {item.significado} (Atual: {item.qtd_estoque} un)
                      </option>
                    ))}
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">Tipo de Movimentação</label>
                    <select
                      value={transaction.type}
                      onChange={(e) => setTransaction({ ...transaction, type: e.target.value as any })}
                      className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
                    >
                      <option value="entrada">Entrada / Compra (+)</option>
                      <option value="saida">Saída / Retirada (-)</option>
                    </select>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">Quantidade</label>
                    <input
                      type="number"
                      min="1"
                      required
                      value={transaction.quantity}
                      onChange={(e) => setTransaction({ ...transaction, quantity: parseInt(e.target.value) || 1 })}
                      className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">Data da Movimentação</label>
                  <input
                    type="date"
                    required
                    value={transaction.date}
                    onChange={(e) => setTransaction({ ...transaction, date: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">
                      {transaction.type === 'entrada' ? 'Preço de Compra (Un)' : 'Preço de Custo (Un)'}
                    </label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-xs">R$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        required
                        value={transaction.valor_pago || ''}
                        onChange={(e) => setTransaction({ ...transaction, valor_pago: parseFloat(e.target.value) || 0 })}
                        className="w-full pl-8 pr-3 py-2 bg-zinc-900 border border-zinc-800 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">Fornecedor (Opcional)</label>
                    <select
                      value={transaction.supplierId}
                      onChange={(e) => setTransaction({ ...transaction, supplierId: e.target.value })}
                      className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
                    >
                      <option value="none">Nenhum / Não informado</option>
                      {suppliers.map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                    </select>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">Notas / Nº Nota Fiscal / Observações</label>
                  <input
                    type="text"
                    placeholder="Ex: Nota Fiscal nº 450, Reposição de estoque"
                    value={transaction.notes}
                    onChange={(e) => setTransaction({ ...transaction, notes: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
                  />
                </div>

                <div className="pt-4 border-t border-zinc-900 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowTransactionModal(false)}
                    className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-white transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-md transition-colors"
                  >
                    Confirmar Lançamento
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}

      {/* Modal: Editar Item */}
      {editingItem && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-zinc-950 rounded-xl border border-zinc-900 shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-4 border-b border-zinc-900 flex justify-between items-center bg-zinc-900">
              <h2 className="font-semibold text-white flex items-center gap-2">
                <Edit2 className="w-5 h-5 text-red-600" />
                Editar Material
              </h2>
              <button
                onClick={() => setEditingItem(null)}
                className="text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <form onSubmit={handleEditItemSubmit} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">Cód. Interno</label>
                  <input
                    type="text"
                    required={editingItem.simbolo_tipo === 'Projeto'}
                    value={editingItem.codigo_interno}
                    onChange={(e) => setEditingItem({ ...editingItem, codigo_interno: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
                  />
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">Cód. Norma</label>
                  <input
                    type="text"
                    required={editingItem.simbolo_tipo !== 'Projeto'}
                    value={editingItem.codigo_norma}
                    onChange={(e) => setEditingItem({ ...editingItem, codigo_norma: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">Classificação / Tipo</label>
                <select
                  value={editingItem.simbolo_tipo}
                  onChange={(e) => setEditingItem({ ...editingItem, simbolo_tipo: e.target.value as any })}
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm mb-4"
                >
                  <option value="Proibição">Proibição</option>
                  <option value="Alerta">Alerta</option>
                  <option value="Emergência">Emergência</option>
                  <option value="Extintor">Extintor</option>
                  <option value="Serviço">Serviço</option>
                  <option value="Projeto">Projeto</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">Significado / Material</label>
                <input
                  type="text"
                  required
                  value={editingItem.significado}
                  onChange={(e) => setEditingItem({ ...editingItem, significado: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">Dimensões (mm)</label>
                  <input
                    type="text"
                    value={editingItem.dimensoes}
                    onChange={(e) => setEditingItem({ ...editingItem, dimensoes: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">Qtd Estoque</label>
                  <input
                    type="number"
                    min="0"
                    required={editingItem.simbolo_tipo !== 'Projeto'}
                    value={editingItem.qtd_estoque}
                    onChange={(e) => setEditingItem({ ...editingItem, qtd_estoque: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
                  />
                </div>
              </div>

              {editingItem.simbolo_tipo === 'Projeto' ? (
                <div className="grid grid-cols-1 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">Preço Sugerido de Venda</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-xs">R$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        value={editingItem.preco_sugerido || ''}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          setEditingItem({ ...editingItem, preco_sugerido: val, valor_pago: 0, custo_unitario: 0, margem: 0 });
                        }}
                        className="w-full pl-8 pr-3 py-2 bg-zinc-900 border border-zinc-800 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
                      />
                    </div>
                  </div>
                </div>
              ) : (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">Valor Pago (Un)</label>
                    <div className="relative">
                      <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-xs">R$</span>
                      <input
                        type="number"
                        step="0.01"
                        min="0"
                        required
                        value={editingItem.valor_pago !== undefined ? editingItem.valor_pago : editingItem.custo_unitario}
                        onChange={(e) => {
                          const val = parseFloat(e.target.value) || 0;
                          setEditingItem({ ...editingItem, valor_pago: val, custo_unitario: val });
                        }}
                        className="w-full pl-8 pr-3 py-2 bg-zinc-900 border border-zinc-800 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">Margem Lucro (%)</label>
                    <div className="relative">
                      <input
                        type="number"
                        min="0"
                        required
                        value={editingItem.margem}
                        onChange={(e) => setEditingItem({ ...editingItem, margem: parseInt(e.target.value) || 0 })}
                        className="w-full pr-7 pl-3 py-2 bg-zinc-900 border border-zinc-800 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
                      />
                      <span className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 text-xs">%</span>
                    </div>
                  </div>
                </div>
              )}

              <div className="bg-zinc-900 p-3 rounded-lg border border-zinc-850 flex justify-between text-xs text-zinc-400">
                <span>Preço Sugerido de Venda:</span>
                <span className="font-bold text-emerald-400 font-mono">
                  R$ {(editingItem.simbolo_tipo === 'Projeto' ? (editingItem.preco_sugerido || 0) : ((editingItem.custo_unitario) * (1 + (editingItem.margem / 100)))).toFixed(2).replace('.', ',')}
                </span>
              </div>

              <div className="pt-4 border-t border-zinc-900 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setEditingItem(null)}
                  className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-white transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-md transition-colors flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
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
