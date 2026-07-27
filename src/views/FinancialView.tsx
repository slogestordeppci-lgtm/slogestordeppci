import React, { useState, useMemo } from 'react';
import { useStore } from '../store';
import { 
  DollarSign, 
  TrendingUp, 
  TrendingDown, 
  Calendar, 
  Search, 
  Plus, 
  CheckCircle2, 
  X, 
  FileText, 
  AlertCircle, 
  Trash2, 
  Building,
  CreditCard,
  Briefcase,
  Layers,
  ArrowRightLeft,
  Coins,
  BarChart3
} from 'lucide-react';
import { FinancialTransaction, Project } from '../types';

export function FinancialView() {
  const { data, updateData } = useStore();
  
  // Modals
  const [showAddTxModal, setShowAddTxModal] = useState(false);
  const [txType, setTxType] = useState<'receita' | 'despesa'>('receita');
  
  // Filters and Search
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<'todos' | 'receitas' | 'despesas' | 'pendentes' | 'recebidos'>('todos');
  const [selectedYear, setSelectedYear] = useState<string>('all');
  const [txToDelete, setTxToDelete] = useState<string | null>(null);
  const [txToEdit, setTxToEdit] = useState<string | null>(null);
  const [showReportModal, setShowReportModal] = useState(false);
  
  // Manual Transaction Form
  const [newTx, setNewTx] = useState({
    description: '',
    amount: '',
    type: 'receita' as 'receita' | 'despesa',
    category: 'Projetos PPCI',
    paymentMethod: 'Pix',
    status: 'recebido' as 'recebido' | 'pago' | 'pendente',
    date: new Date().toISOString().split('T')[0],
    dueDate: new Date().toISOString().split('T')[0],
    clientName: '',
  });

  const transactions = data.financialTransactions || [];
  const projects = data.projects || [];

  const availableYears = useMemo(() => {
    const years = new Set<string>();
    transactions.forEach(tx => {
      if (tx.date) years.add(tx.date.substring(0, 4));
    });
    return Array.from(years).sort().reverse();
  }, [transactions]);

  const yearFilteredTransactions = useMemo(() => {
    if (selectedYear === 'all') return transactions;
    return transactions.filter(tx => tx.date && tx.date.substring(0, 4) === selectedYear);
  }, [transactions, selectedYear]);

  // Categorize stats
  const stats = useMemo(() => {
    let totalReceived = 0; // receitas recebidas
    let totalPendingReceita = 0; // receitas pendentes
    let totalPaidExpenses = 0; // despesas pagas
    let totalPendingExpenses = 0; // despesas pendentes

    yearFilteredTransactions.forEach(tx => {
      const amt = Number(tx.amount) || 0;
      if (tx.type === 'receita') {
        if (tx.status === 'recebido') {
          totalReceived += amt;
        } else if (tx.status === 'pendente') {
          totalPendingReceita += amt;
        }
      } else {
        if (tx.status === 'pago') {
          totalPaidExpenses += amt;
        } else if (tx.status === 'pendente') {
          totalPendingExpenses += amt;
        }
      }
    });

    const netCash = totalReceived - totalPaidExpenses;

    return {
      totalReceived,
      totalPendingReceita,
      totalPaidExpenses,
      totalPendingExpenses,
      netCash
    };
  }, [yearFilteredTransactions]);

  // Handle Add Manual Transaction
  const handleAddTx = (e: React.FormEvent) => {
    e.preventDefault();
    const amountNum = Number(newTx.amount) || 0;
    if (amountNum <= 0) return;

    // determine correct status based on type
    let finalStatus: 'recebido' | 'pago' | 'pendente' = newTx.status as any;
    if (newTx.status === 'recebido' && newTx.type === 'despesa') {
      finalStatus = 'pago';
    } else if (newTx.status === 'pago' && newTx.type === 'receita') {
      finalStatus = 'recebido';
    }

    if (txToEdit) {
      const updated = transactions.map(t => {
        if (t.id === txToEdit) {
          return {
            ...t,
            type: newTx.type,
            description: newTx.description,
            amount: amountNum,
            category: newTx.category,
            paymentMethod: newTx.paymentMethod,
            status: finalStatus,
            date: newTx.date,
            dueDate: finalStatus === 'pendente' ? newTx.dueDate : undefined,
            clientName: newTx.clientName || undefined,
            paymentDate: finalStatus !== 'pendente' ? new Date().toISOString().split('T')[0] : undefined
          };
        }
        return t;
      });
      updateData({ financialTransactions: updated });
    } else {
      const tx: FinancialTransaction = {
        id: `tx-${Date.now()}`,
        type: newTx.type,
        description: newTx.description,
        amount: amountNum,
        category: newTx.category,
        paymentMethod: newTx.paymentMethod,
        status: finalStatus,
        date: newTx.date,
        dueDate: finalStatus === 'pendente' ? newTx.dueDate : undefined,
        clientName: newTx.clientName || undefined,
        paymentDate: finalStatus !== 'pendente' ? new Date().toISOString().split('T')[0] : undefined
      };

      updateData({
        financialTransactions: [tx, ...transactions]
      });
    }

    setShowAddTxModal(false);
    setTxToEdit(null);
    // Reset
    setNewTx({
      description: '',
      amount: '',
      type: 'receita',
      category: 'Projetos PPCI',
      paymentMethod: 'Pix',
      status: 'recebido',
      date: new Date().toISOString().split('T')[0],
      dueDate: new Date().toISOString().split('T')[0],
      clientName: '',
    });
  };

  // Toggle status (receber ou pagar pendentes)
  const toggleStatus = (id: string) => {
    const updated = transactions.map(tx => {
      if (tx.id === id) {
        if (tx.status === 'pendente') {
          return {
            ...tx,
            status: tx.type === 'receita' ? ('recebido' as const) : ('pago' as const)
          };
        } else {
          return {
            ...tx,
            status: 'pendente' as const
          };
        }
      }
      return tx;
    });
    updateData({ financialTransactions: updated });
  };

  // Delete transaction
  const handleDeleteTx = (id: string) => {
    const updated = transactions.filter(t => t.id !== id);
    updateData({ financialTransactions: updated });
    setTxToDelete(null);
  };

  // Filter transactions
  const filteredTransactions = useMemo(() => {
    return yearFilteredTransactions.filter(tx => {
      const matchesSearch = 
        tx.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (tx.clientName && tx.clientName.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (tx.category && tx.category.toLowerCase().includes(searchQuery.toLowerCase())) ||
        (tx.paymentMethod && tx.paymentMethod.toLowerCase().includes(searchQuery.toLowerCase()));

      let matchesFilter = true;
      if (activeFilter === 'receitas') matchesFilter = tx.type === 'receita';
      else if (activeFilter === 'despesas') matchesFilter = tx.type === 'despesa';
      else if (activeFilter === 'pendentes') matchesFilter = tx.status === 'pendente';
      else if (activeFilter === 'recebidos') matchesFilter = tx.status === 'recebido' || tx.status === 'pago';

      return matchesSearch && matchesFilter;
    });
  }, [yearFilteredTransactions, searchQuery, activeFilter]);

  // Approved proposals that do not have any associated transaction yet (helpful to find "orphaned" ones)
  const pendingApprovals = useMemo(() => {
    const approvedProjIds = new Set(transactions.map(t => t.projectId).filter(Boolean));
    return projects.filter(p => (p.status === 'Aprovado' || p.status === 'Concluído') && !approvedProjIds.has(p.id));
  }, [projects, transactions]);

  // Dynamic cashflow visualization data (6-month period simplified)
  const cashFlowChartData = useMemo(() => {
    const months: { [key: string]: { receita: number, despesa: number, label: string } } = {};
    const monthNames = ["Jan", "Fev", "Mar", "Abr", "Mai", "Jun", "Jul", "Ago", "Set", "Out", "Nov", "Dez"];
    
    if (selectedYear === 'all') {
      const now = new Date();
      for (let i = 5; i >= 0; i--) {
        const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
        const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
        months[key] = { receita: 0, despesa: 0, label: `${monthNames[d.getMonth()]}/${String(d.getFullYear()).substring(2)}` };
      }
    } else {
      const yearNum = parseInt(selectedYear);
      for (let i = 0; i < 12; i++) {
        const key = `${yearNum}-${String(i + 1).padStart(2, '0')}`;
        months[key] = { receita: 0, despesa: 0, label: `${monthNames[i]}` };
      }
    }

    yearFilteredTransactions.forEach(tx => {
      if (!tx.date) return;
      const monthKey = tx.date.substring(0, 7); // YYYY-MM
      if (months[monthKey]) {
        const amt = Number(tx.amount) || 0;
        if (tx.type === 'receita' && tx.status === 'recebido') {
          months[monthKey].receita += amt;
        } else if (tx.type === 'despesa' && tx.status === 'pago') {
          months[monthKey].despesa += amt;
        }
      }
    });

    return Object.values(months);
  }, [yearFilteredTransactions, selectedYear]);

  // Max value in chart for scaling
  const chartMaxVal = useMemo(() => {
    const maxVal = Math.max(
      ...cashFlowChartData.map(d => Math.max(d.receita, d.despesa)),
      1000 // default minimum scale height
    );
    return maxVal * 1.15; // 15% padding
  }, [cashFlowChartData]);

  const generateReportAnalysis = () => {
    const { totalReceived, totalPaidExpenses, netCash, totalPendingReceita, totalPendingExpenses } = stats;
    let comments = [];
    
    if (totalReceived === 0 && totalPaidExpenses === 0) {
      return ["Não há dados financeiros suficientes para análise no período selecionado."];
    }
    
    if (netCash > 0) {
      comments.push(`O período selecionado apresentou um resultado positivo (superávit) de R$ ${netCash.toLocaleString('pt-BR', {minimumFractionDigits: 2})}.`);
    } else if (netCash < 0) {
      comments.push(`O período apresentou um resultado negativo (déficit) de R$ ${Math.abs(netCash).toLocaleString('pt-BR', {minimumFractionDigits: 2})}. Recomenda-se uma revisão cuidadosa dos custos operacionais.`);
    } else {
      comments.push(`O período apresentou resultado neutro, com as receitas empatando com as despesas.`);
    }
    
    if (totalReceived > 0) {
      const margin = (netCash / totalReceived) * 100;
      if (margin > 0) {
        comments.push(`A margem de lucro líquido sobre as receitas realizadas (margem líquida) foi de ${margin.toFixed(1)}%.`);
      }
    }
    
    if (totalPaidExpenses > totalReceived && totalReceived > 0) {
      comments.push(`Atenção: As despesas superaram as receitas em ${((totalPaidExpenses / totalReceived) * 100 - 100).toFixed(1)}%.`);
    }

    if (totalPendingReceita > 0 || totalPendingExpenses > 0) {
      const futureNet = netCash + totalPendingReceita - totalPendingExpenses;
      comments.push(`Considerando os valores ainda pendentes (a receber e a pagar), o saldo projetado futuro (fluxo de caixa projetado) é de R$ ${futureNet.toLocaleString('pt-BR', {minimumFractionDigits: 2})}.`);
    }

    // Category analysis
    const categories: { [key: string]: number } = {};
    yearFilteredTransactions.forEach(tx => {
      if (tx.type === 'despesa' && tx.status === 'pago') {
        categories[tx.category] = (categories[tx.category] || 0) + Number(tx.amount);
      }
    });
    
    const entries = Object.entries(categories).sort((a, b) => b[1] - a[1]);
    if (entries.length > 0) {
      comments.push(`A maior categoria de despesa no período foi "${entries[0][0]}", representando R$ ${entries[0][1].toLocaleString('pt-BR', {minimumFractionDigits: 2})}.`);
    }

    return comments;
  };

  return (
    <div className="p-8 h-full flex flex-col overflow-hidden">
      
      {/* Header */}
      <div className="flex justify-between items-center mb-6 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-semibold text-white">Menu Financeiro</h1>
          <p className="text-zinc-400">Controle de caixa, faturamento de propostas aprovadas e fluxo de despesas.</p>
        </div>
        <div className="flex gap-3">
          <select 
            value={selectedYear}
            onChange={(e) => setSelectedYear(e.target.value)}
            className="bg-zinc-900 border border-zinc-800 text-white px-4 py-2 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-red-500 font-medium"
          >
            <option value="all">Todos os Anos</option>
            {availableYears.map(year => (
              <option key={year} value={year}>{year}</option>
            ))}
          </select>
          <button 
            onClick={() => setShowReportModal(true)}
            className="flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 px-4 py-2 rounded-md text-sm font-medium transition-colors"
          >
            <BarChart3 className="w-4 h-4 text-zinc-400" />
            Gerar Relatório
          </button>
          <button 
            onClick={() => {
              setTxType('despesa');
              setNewTx(prev => ({ 
                ...prev, 
                type: 'despesa', 
                category: 'Compra de Materiais',
                status: 'pago' 
              }));
              setShowAddTxModal(true);
            }}
            className="flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-red-500 px-4 py-2 rounded-md text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4 text-red-500" />
            Nova Despesa
          </button>
          <button 
            onClick={() => {
              setTxType('receita');
              setNewTx(prev => ({ 
                ...prev, 
                type: 'receita', 
                category: 'Projetos PPCI',
                status: 'recebido' 
              }));
              setShowAddTxModal(true);
            }}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Nova Receita
          </button>
        </div>
      </div>

      {/* Main Stats Summary Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6 flex-shrink-0">
        
        {/* Card: Saldo Caixa Real */}
        <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-900 flex flex-col justify-between">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs text-zinc-500 font-semibold uppercase">Saldo em Caixa</span>
            <Coins className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <span className={`text-xl font-bold block ${stats.netCash >= 0 ? 'text-emerald-400' : 'text-red-400'}`}>
              R$ {stats.netCash.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-[10px] text-zinc-500 block mt-1">(Recebido - Pago)</span>
          </div>
        </div>

        {/* Card: Total Faturado / Recebido */}
        <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-900 flex flex-col justify-between">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs text-zinc-500 font-semibold uppercase">Receitas Recebidas</span>
            <TrendingUp className="w-4 h-4 text-emerald-500" />
          </div>
          <div>
            <span className="text-xl font-bold text-white block">
              R$ {stats.totalReceived.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-[10px] text-emerald-500 block mt-1">+ Faturamento Liquidado</span>
          </div>
        </div>

        {/* Card: Previsão a Receber */}
        <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-900 flex flex-col justify-between">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs text-zinc-500 font-semibold uppercase">A Receber (Pendentes)</span>
            <Coins className="w-4 h-4 text-blue-400" />
          </div>
          <div>
            <span className="text-xl font-bold text-blue-400 block">
              R$ {stats.totalPendingReceita.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-[10px] text-zinc-500 block mt-1">Previsão Propostas / Parcelas</span>
          </div>
        </div>

        {/* Card: Despesas Pagas */}
        <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-900 flex flex-col justify-between">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs text-zinc-500 font-semibold uppercase">Despesas Pagas</span>
            <TrendingDown className="w-4 h-4 text-red-500" />
          </div>
          <div>
            <span className="text-xl font-bold text-zinc-300 block">
              R$ {stats.totalPaidExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-[10px] text-zinc-500 block mt-1">Custos operacionais liquidados</span>
          </div>
        </div>

        {/* Card: Contas a Pagar */}
        <div className="bg-zinc-950 p-4 rounded-xl border border-zinc-900 flex flex-col justify-between">
          <div className="flex justify-between items-center mb-2">
            <span className="text-xs text-zinc-500 font-semibold uppercase">A Pagar (Despesas)</span>
            <AlertCircle className="w-4 h-4 text-amber-500" />
          </div>
          <div>
            <span className="text-xl font-bold text-amber-500 block">
              R$ {stats.totalPendingExpenses.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}
            </span>
            <span className="text-[10px] text-zinc-500 block mt-1">Compromissos pendentes</span>
          </div>
        </div>

      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 flex-1 min-h-0">
        
        {/* Left column: Transaction List & Filters */}
        <div className="lg:col-span-2 bg-zinc-950 rounded-xl border border-zinc-900 flex flex-col overflow-hidden">
          
          {/* Filters Bar */}
          <div className="p-4 border-b border-zinc-900 flex flex-col md:flex-row gap-3 items-center justify-between bg-zinc-900/30">
            <div className="relative w-full md:w-64">
              <Search className="w-4 h-4 text-zinc-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input 
                type="text" 
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Buscar por descrição, cliente..." 
                className="pl-9 pr-4 py-2 bg-zinc-950 border border-zinc-800 rounded-lg text-sm w-full text-white focus:outline-none focus:border-red-500 focus:ring-1 focus:ring-red-500"
              />
            </div>

            <div className="flex gap-1.5 overflow-x-auto w-full md:w-auto pb-1 md:pb-0 scrollbar-none">
              {[
                { id: 'todos', label: 'Todos' },
                { id: 'receitas', label: 'Receitas' },
                { id: 'despesas', label: 'Despesas' },
                { id: 'pendentes', label: 'Pendentes' },
                { id: 'recebidos', label: 'Realizados' }
              ].map(f => (
                <button
                  key={f.id}
                  onClick={() => setActiveFilter(f.id as any)}
                  className={`px-3 py-1.5 rounded-full text-xs font-semibold transition-all whitespace-nowrap ${
                    activeFilter === f.id 
                      ? 'bg-red-600 text-white' 
                      : 'bg-zinc-900 text-zinc-400 hover:text-white hover:bg-zinc-850'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Transactions Table */}
          <div className="flex-1 overflow-auto">
            <table className="w-full text-left text-sm whitespace-nowrap">
              <thead className="bg-zinc-900/80 text-zinc-400 sticky top-0 uppercase text-[11px] font-bold tracking-wider border-b border-zinc-900 z-10">
                <tr>
                  <th className="px-5 py-3.5">Data</th>
                  <th className="px-5 py-3.5">Descrição</th>
                  <th className="px-5 py-3.5">Categoria</th>
                  <th className="px-5 py-3.5">Pagamento</th>
                  <th className="px-5 py-3.5 text-right">Valor</th>
                  <th className="px-5 py-3.5 text-center">Status</th>
                  <th className="px-5 py-3.5 text-center">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-zinc-900 text-zinc-300">
                {filteredTransactions.map((tx) => {
                  const isReceita = tx.type === 'receita';
                  const formattedDate = tx.date ? new Date(tx.date + 'T12:00:00').toLocaleDateString('pt-BR') : '-';
                  const isPending = tx.status === 'pendente';

                  return (
                    <tr key={tx.id} className="hover:bg-zinc-900/40 transition-colors">
                      <td className="px-5 py-3.5 text-zinc-400 font-mono text-xs flex items-center gap-1.5">
                        <Calendar className="w-3.5 h-3.5 text-zinc-600" />
                        {formattedDate}
                      </td>
                      <td className="px-5 py-3.5">
                        <div className="font-semibold text-white">{tx.description}</div>
                        {tx.clientName && (
                          <div className="text-xs text-zinc-500 font-medium flex items-center gap-1 mt-0.5">
                            <Building className="w-3 h-3" />
                            {tx.clientName}
                          </div>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-zinc-400 text-xs">
                        <span className="bg-zinc-900 px-2 py-1 rounded border border-zinc-800">
                          {tx.category}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-zinc-400 text-xs flex items-center gap-1 mt-2.5">
                        <CreditCard className="w-3.5 h-3.5 text-zinc-600" />
                        {tx.paymentMethod}
                      </td>
                      <td className={`px-5 py-3.5 text-right font-semibold font-mono ${isReceita ? 'text-emerald-400' : 'text-red-400'}`}>
                        {isReceita ? '+' : '-'} R$ {tx.amount.toFixed(2).replace('.', ',')}
                      </td>
                      <td className="px-5 py-3.5 text-center">
                        <button
                          onClick={() => toggleStatus(tx.id)}
                          className={`text-[10px] px-2.5 py-1 rounded-full font-bold transition-all border ${
                            isPending 
                              ? 'bg-amber-500/10 text-amber-400 border-amber-500/20 hover:bg-amber-500/20' 
                              : isReceita 
                                ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20 hover:bg-emerald-500/20'
                                : 'bg-zinc-800 text-zinc-300 border-zinc-700 hover:bg-zinc-700'
                          }`}
                          title={isPending ? (isReceita ? "Confirmar Recebimento" : "Confirmar Pagamento") : "Marcar como Pendente"}
                        >
                          {isPending ? 'Pendente' : isReceita ? 'Recebido' : 'Pago'}
                        </button>
                      </td>
                      <td className="px-5 py-3.5 text-center flex items-center justify-center gap-2">
                        <button 
                          onClick={() => {
                            setTxToEdit(tx.id);
                            setTxType(tx.type);
                            setNewTx({
                              description: tx.description,
                              amount: String(tx.amount),
                              type: tx.type,
                              category: tx.category,
                              paymentMethod: tx.paymentMethod || 'Pix',
                              status: tx.status as any,
                              date: tx.date,
                              dueDate: tx.dueDate || new Date().toISOString().split('T')[0],
                              clientName: tx.clientName || '',
                            });
                            setShowAddTxModal(true);
                          }}
                          className="p-1 text-zinc-500 hover:text-amber-400 hover:bg-amber-500/10 rounded transition-colors"
                          title="Editar Transação"
                        >
                          <FileText className="w-3.5 h-3.5" />
                        </button>
                        <button 
                          onClick={() => setTxToDelete(tx.id)}
                          className="p-1 text-zinc-500 hover:text-red-400 hover:bg-red-500/10 rounded transition-colors"
                          title="Remover Transação"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </td>
                    </tr>
                  );
                })}
                {filteredTransactions.length === 0 && (
                  <tr>
                    <td colSpan={7} className="px-5 py-12 text-center text-zinc-600">
                      Nenhuma transação financeira encontrada.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Right Column: Chart Flow & Unlinked Projects */}
        <div className="flex flex-col gap-6">
          
          {/* Mini Chart Component using Beautiful SVG layout */}
          <div className="bg-zinc-950 p-5 rounded-xl border border-zinc-900 flex flex-col">
            <h3 className="text-sm font-semibold text-white mb-4 flex items-center gap-2">
              <Coins className="w-4 h-4 text-emerald-400" />
              Gráfico de Fluxo de Caixa (Realizado)
            </h3>
            
            {/* SVG Interactive Chart Bar Chart */}
            <div className="h-44 flex items-end justify-between px-2 pt-2 relative">
              {/* grid lines */}
              <div className="absolute inset-0 flex flex-col justify-between pointer-events-none opacity-10 border-b border-zinc-800 pb-8">
                <div className="border-t border-zinc-400 w-full"></div>
                <div className="border-t border-zinc-400 w-full"></div>
                <div className="border-t border-zinc-400 w-full"></div>
              </div>

              {cashFlowChartData.map((d, idx) => {
                const recHeight = (d.receita / chartMaxVal) * 100;
                const desHeight = (d.despesa / chartMaxVal) * 100;

                return (
                  <div key={idx} className="flex flex-col items-center flex-1 h-full justify-end z-10 relative group">
                    <div className="flex gap-1 items-end h-32 w-full justify-center">
                      {/* Receita bar */}
                      <div 
                        style={{ height: `${Math.max(3, recHeight)}%` }} 
                        className="w-3 bg-emerald-500 rounded-t transition-all duration-300 group-hover:bg-emerald-400"
                        title={`Receitas: R$ ${d.receita}`}
                      />
                      {/* Despesa bar */}
                      <div 
                        style={{ height: `${Math.max(3, desHeight)}%` }} 
                        className="w-3 bg-red-500 rounded-t transition-all duration-300 group-hover:bg-red-400"
                        title={`Despesas: R$ ${d.despesa}`}
                      />
                    </div>
                    <span className="text-[10px] text-zinc-500 font-semibold mt-2">{d.label}</span>
                    
                    {/* Tooltip on hover */}
                    <div className="absolute bottom-12 hidden group-hover:flex flex-col bg-zinc-900 border border-zinc-800 text-[10px] p-2 rounded shadow-xl z-20 pointer-events-none whitespace-nowrap">
                      <div className="font-semibold text-white mb-0.5">{d.label}</div>
                      <div className="text-emerald-400 flex justify-between gap-4">Receita: <span>R$ {d.receita.toFixed(0)}</span></div>
                      <div className="text-red-400 flex justify-between gap-4">Despesa: <span>R$ {d.despesa.toFixed(0)}</span></div>
                      <div className="text-zinc-300 font-medium border-t border-zinc-800 mt-1 pt-1 flex justify-between">Net: <span>R$ {(d.receita - d.despesa).toFixed(0)}</span></div>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="flex gap-4 justify-center text-[10px] text-zinc-400 font-semibold mt-4 pt-4 border-t border-zinc-900">
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 bg-emerald-500 rounded-sm"></div>
                Receitas Liquidadas
              </div>
              <div className="flex items-center gap-1.5">
                <div className="w-2.5 h-2.5 bg-red-500 rounded-sm"></div>
                Despesas Liquidadas
              </div>
            </div>
          </div>

          {/* Warning / Notification Panel for approved proposals not yet integrated */}
          <div className="bg-zinc-950 p-5 rounded-xl border border-zinc-900 flex-1 overflow-hidden flex flex-col">
            <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-amber-500" />
              Propostas Aprovadas Sem Lançamento
            </h3>
            
            <div className="overflow-y-auto flex-1 space-y-3 pr-1">
              {pendingApprovals.map((p) => (
                <div key={p.id} className="p-3 bg-zinc-900/50 border border-zinc-850 rounded-lg flex justify-between items-center hover:bg-zinc-900 transition-colors">
                  <div className="min-w-0 pr-3">
                    <div className="text-xs font-bold text-white truncate">{p.clientName}</div>
                    <div className="text-[10px] text-zinc-500 font-medium font-mono mt-0.5">Projeto #{p.id}</div>
                    <div className="text-xs font-semibold text-emerald-400 font-mono mt-1">
                      R$ {p.value ? p.value.toLocaleString('pt-BR', { minimumFractionDigits: 2 }) : '0,00'}
                    </div>
                  </div>
                  
                  {/* Quick button to approve / import finance */}
                  <button
                    onClick={() => {
                      if (!p.value) {
                        alert("Defina um valor para o projeto antes de lançar o financeiro!");
                        return;
                      }
                      
                      // Auto-launch Pix full payment for backwards compatibility
                      const initialTx: FinancialTransaction = {
                        id: `tx-${Date.now()}`,
                        projectId: p.id,
                        projectName: `Projeto PPCI - ${p.clientName}`,
                        clientName: p.clientName,
                        type: 'receita',
                        description: `Faturamento integral: Projeto PPCI - ${p.clientName}`,
                        amount: p.value,
                        category: 'Projetos PPCI',
                        paymentMethod: p.paymentMethods?.[0] || 'Pix',
                        status: 'recebido',
                        date: new Date().toISOString().split('T')[0],
                      };

                      updateData({
                        financialTransactions: [initialTx, ...transactions]
                      });
                      
                      alert(`Financeiro de R$ ${p.value.toFixed(2)} lançado com sucesso para ${p.clientName}!`);
                    }}
                    className="flex-shrink-0 bg-red-600/10 text-red-500 hover:bg-red-600 hover:text-white text-[11px] font-bold px-2.5 py-1.5 rounded transition-all"
                  >
                    Lançar Pix
                  </button>
                </div>
              ))}
              {pendingApprovals.length === 0 && (
                <div className="text-zinc-600 text-xs italic text-center py-8">
                  Nenhuma pendência. Todas propostas aprovadas possuem faturamento registrado!
                </div>
              )}
            </div>
          </div>

        </div>

      </div>

      {/* Modal: Add Manual Transaction */}
      {showAddTxModal && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-zinc-950 rounded-xl border border-zinc-900 shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-4 border-b border-zinc-900 flex justify-between items-center bg-zinc-900">
              <h2 className="font-semibold text-white flex items-center gap-2">
                <ArrowRightLeft className="w-5 h-5 text-red-600" />
                {txToEdit ? 'Editar' : 'Lançar Nova'} {txType === 'receita' ? 'Receita' : 'Despesa'}
              </h2>
              <button
                onClick={() => {
                  setShowAddTxModal(false);
                  setTxToEdit(null);
                  setNewTx({
                    description: '',
                    amount: '',
                    type: 'receita',
                    category: 'Projetos PPCI',
                    paymentMethod: 'Pix',
                    status: 'recebido',
                    date: new Date().toISOString().split('T')[0],
                    dueDate: new Date().toISOString().split('T')[0],
                    clientName: '',
                  });
                }}
                className="text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAddTx} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">Descrição</label>
                <input
                  type="text"
                  required
                  placeholder={txType === 'receita' ? "Ex: Venda de Placas de Sinalização" : "Ex: Compra de Cilindros de Co2"}
                  value={newTx.description}
                  onChange={(e) => setNewTx({ ...newTx, description: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">Valor (R$)</label>
                  <div className="relative">
                    <span className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500 text-xs">R$</span>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      required
                      placeholder="0,00"
                      value={newTx.amount}
                      onChange={(e) => setNewTx({ ...newTx, amount: e.target.value })}
                      className="w-full pl-8 pr-3 py-2 bg-zinc-900 border border-zinc-800 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">Forma de Pagamento</label>
                  <select
                    value={newTx.paymentMethod}
                    onChange={(e) => setNewTx({ ...newTx, paymentMethod: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
                  >
                    <option value="Pix">Pix</option>
                    <option value="Dinheiro">Dinheiro</option>
                    <option value="Boleto">Boleto Bancário</option>
                    <option value="Cartão de Crédito">Cartão de Crédito</option>
                    <option value="Cartão de Débito">Cartão de Débito</option>
                    <option value="Transferência Bancária">Transferência Bancária</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">Categoria</label>
                  {txType === 'receita' ? (
                    <select
                      value={newTx.category}
                      onChange={(e) => setNewTx({ ...newTx, category: e.target.value })}
                      className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
                    >
                      <option value="Projetos PPCI">Projetos PPCI</option>
                      <option value="Venda de Materiais">Venda de Materiais</option>
                      <option value="Laudos e Vistorias">Laudos e Vistorias</option>
                      <option value="Outros">Outros</option>
                    </select>
                  ) : (
                    <select
                      value={newTx.category}
                      onChange={(e) => setNewTx({ ...newTx, category: e.target.value })}
                      className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
                    >
                      <option value="Compra de Materiais">Compra de Insumos/Materiais</option>
                      <option value="Serviços de Terceiros">Serviços de Terceiros</option>
                      <option value="Aluguel e Infraestrutura">Aluguel e Infraestrutura</option>
                      <option value="Salários e Encargos">Salários e Encargos</option>
                      <option value="Impostos">Impostos</option>
                      <option value="Outros">Outros</option>
                    </select>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">Status</label>
                  <select
                    value={newTx.status}
                    onChange={(e) => setNewTx({ ...newTx, status: e.target.value as any })}
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
                  >
                    <option value="pendente">Pendente</option>
                    {txType === 'receita' ? (
                      <option value="recebido">Recebido / Liquidado</option>
                    ) : (
                      <option value="pago">Pago / Liquidado</option>
                    )}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">Data de Lançamento</label>
                  <input
                    type="date"
                    required
                    value={newTx.date}
                    onChange={(e) => setNewTx({ ...newTx, date: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
                  />
                </div>

                {newTx.status === 'pendente' && (
                  <div>
                    <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">Data de Vencimento</label>
                    <input
                      type="date"
                      required
                      value={newTx.dueDate}
                      onChange={(e) => setNewTx({ ...newTx, dueDate: e.target.value })}
                      className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">Nome do Cliente/Fornecedor (Opcional)</label>
                <input
                  type="text"
                  placeholder="Ex: João da Silva / Metalúrgica Sul"
                  value={newTx.clientName}
                  onChange={(e) => setNewTx({ ...newTx, clientName: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
                />
              </div>

              <div className="pt-4 border-t border-zinc-900 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowAddTxModal(false);
                    setTxToEdit(null);
                    setNewTx({
                      description: '',
                      amount: '',
                      type: 'receita',
                      category: 'Projetos PPCI',
                      paymentMethod: 'Pix',
                      status: 'recebido',
                      date: new Date().toISOString().split('T')[0],
                      dueDate: new Date().toISOString().split('T')[0],
                      clientName: '',
                    });
                  }}
                  className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-white transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-md transition-colors"
                >
                  {txToEdit ? 'Salvar Alterações' : 'Confirmar Lançamento'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modern custom delete confirmation modal */}
      {txToDelete && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-zinc-950 rounded-xl border border-zinc-900 shadow-xl w-full max-w-sm overflow-hidden animate-in fade-in zoom-in-95 duration-200">
            <div className="p-4 border-b border-zinc-900 flex justify-between items-center bg-zinc-900">
              <h2 className="font-semibold text-white flex items-center gap-2 text-sm">
                <Trash2 className="w-4 h-4 text-red-500" />
                Excluir Lançamento
              </h2>
              <button
                onClick={() => setTxToDelete(null)}
                className="text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            <div className="p-5 space-y-4">
              <p className="text-xs text-zinc-300 leading-relaxed">
                Tem certeza de que deseja remover esta transação do histórico financeiro? Esta ação é permanente e não poderá ser desfeita.
              </p>
              {(() => {
                const tx = transactions.find(t => t.id === txToDelete);
                if (!tx) return null;
                return (
                  <div className="bg-zinc-900 p-3 rounded-lg border border-zinc-850 text-xs">
                    <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Descrição</div>
                    <div className="text-white font-semibold mb-3 truncate">{tx.description}</div>
                    <div className="grid grid-cols-2 gap-2 border-t border-zinc-800/60 pt-2">
                      <div>
                        <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Valor</div>
                        <div className={`font-bold font-mono text-xs ${tx.type === 'receita' ? 'text-emerald-400' : 'text-red-400'}`}>
                          R$ {tx.amount.toFixed(2).replace('.', ',')}
                        </div>
                      </div>
                      <div>
                        <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Data</div>
                        <div className="text-zinc-300 font-mono text-xs">
                          {tx.date ? new Date(tx.date + 'T12:00:00').toLocaleDateString('pt-BR') : '-'}
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })()}
              <div className="pt-3 border-t border-zinc-900 flex justify-end gap-2.5">
                <button
                  type="button"
                  onClick={() => setTxToDelete(null)}
                  className="px-3.5 py-1.5 text-xs font-semibold text-zinc-400 hover:text-white transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => handleDeleteTx(txToDelete)}
                  className="px-3.5 py-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold rounded-md transition-colors"
                >
                  Excluir Permanentemente
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Report Modal */}
      {showReportModal && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-zinc-950 rounded-xl border border-zinc-900 shadow-xl w-full max-w-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200 flex flex-col max-h-[90vh]">
            <div className="p-5 border-b border-zinc-900 flex justify-between items-center bg-zinc-900">
              <div>
                <h2 className="font-semibold text-white flex items-center gap-2">
                  <FileText className="w-5 h-5 text-red-600" />
                  Relatório Financeiro Analítico
                </h2>
                <p className="text-xs text-zinc-400 mt-1">
                  Período: {selectedYear === 'all' ? 'Todos os anos' : selectedYear}
                </p>
              </div>
              <button
                onClick={() => setShowReportModal(false)}
                className="text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            <div className="p-6 overflow-y-auto flex-1 space-y-6">
              
              {/* Summary Cards */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-zinc-900/50 p-4 rounded-lg border border-zinc-800">
                  <div className="text-[11px] text-zinc-500 font-bold uppercase tracking-wider mb-1">Total Realizado (Receitas)</div>
                  <div className="text-xl font-bold text-emerald-400 font-mono">
                    R$ {stats.totalReceived.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                  </div>
                </div>
                <div className="bg-zinc-900/50 p-4 rounded-lg border border-zinc-800">
                  <div className="text-[11px] text-zinc-500 font-bold uppercase tracking-wider mb-1">Total Pago (Despesas)</div>
                  <div className="text-xl font-bold text-red-400 font-mono">
                    R$ {stats.totalPaidExpenses.toLocaleString('pt-BR', {minimumFractionDigits: 2})}
                  </div>
                </div>
              </div>

              {/* Analysis Section */}
              <div>
                <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                  <BarChart3 className="w-4 h-4 text-zinc-400" />
                  Análise Detalhada
                </h3>
                <div className="space-y-3">
                  {generateReportAnalysis().map((comment, i) => (
                    <div key={i} className="flex gap-3 items-start bg-zinc-900 p-3 rounded-lg border border-zinc-850">
                      <div className="w-1.5 h-1.5 rounded-full bg-red-600 mt-2 flex-shrink-0"></div>
                      <p className="text-sm text-zinc-300 leading-relaxed">{comment}</p>
                    </div>
                  ))}
                </div>
              </div>

            </div>
            
            <div className="p-4 border-t border-zinc-900 bg-zinc-900/50 flex justify-end">
              <button
                onClick={() => setShowReportModal(false)}
                className="px-4 py-2 bg-zinc-800 hover:bg-zinc-700 text-white text-sm font-semibold rounded-md transition-colors"
              >
                Fechar Relatório
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
