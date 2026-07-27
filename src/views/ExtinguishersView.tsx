import React, { useState } from 'react';
import { useStore } from '../store';
import { Users, Plus, X, Building, MapPin, Phone, Flame, FileText, ShoppingCart, Coins, Check, Receipt } from 'lucide-react';
import { Client, Extinguisher } from '../types';
import { jsPDF } from 'jspdf';

export function ExtinguishersView() {
  const { data, updateData } = useStore();
  const [selectedClient, setSelectedClient] = useState<string | null>(null);
  const [showExtinguisherForm, setShowExtinguisherForm] = useState(false);
  const [showReportModal, setShowReportModal] = useState(false);
  const [reportClientFilter, setReportClientFilter] = useState('all');
  const [reportMonthFilter, setReportMonthFilter] = useState('all');
  const [reportYearFilter, setReportYearFilter] = useState('all');
  
  const [showAddCompanyForm, setShowAddCompanyForm] = useState(false);
  const [newCompany, setNewCompany] = useState<Partial<Client>>({
    name: '',
    address: '',
    phone: '',
    email: '',
    document: '',
    city: '',
    state: '',
    cep: '',
  });
  const [selectedProjectForClient, setSelectedProjectForClient] = useState('');

  const [newExtinguisher, setNewExtinguisher] = useState<Partial<Extinguisher>>({
    numero_cilindro: '',
    type: 'Água Pressurizada',
    capacity: '10L',
    location: '',
    lastRecharge: new Date().toISOString().split('T')[0],
    nextRecharge: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
    warningDays: 30,
  });

  // State for sale recording to approved budgets
  const [showSaleModal, setShowSaleModal] = useState(false);
  const [saleExtinguisher, setSaleExtinguisher] = useState<Extinguisher | null>(null);
  const [selectedBudgetRef, setSelectedBudgetRef] = useState<string>(''); // format: "projectId|budgetId"
  const [salePrice, setSalePrice] = useState<number>(180);
  const [saleQuantity, setSaleQuantity] = useState<number>(1);
  const [saleDescription, setSaleDescription] = useState<string>('');
  const [saleSuccessMessage, setSaleSuccessMessage] = useState<string | null>(null);

  const handleOpenSaleModal = (ext: Extinguisher) => {
    setSaleExtinguisher(ext);
    let defaultPrice = 180;
    const typeLower = ext.type.toLowerCase();
    if (typeLower.includes('co2') || typeLower.includes('carbono')) {
      defaultPrice = 280;
    } else if (typeLower.includes('pqs') || typeLower.includes('pó')) {
      defaultPrice = 160;
    } else if (typeLower.includes('água') || typeLower.includes('ap')) {
      defaultPrice = 140;
    }
    setSalePrice(defaultPrice);
    setSaleQuantity(1);
    setSaleDescription(`Venda de Extintor: ${ext.type} - ${ext.capacity}`);
    
    // Automatically select the first approved budget if available
    const clientProjects = data.projects.filter(p => p.clientId === activeClient?.id || (activeClient && p.clientName.toLowerCase() === activeClient.name.toLowerCase()));
    const approvedBudgets = clientProjects.flatMap(project => 
      (project.budgets || [])
        .filter(b => b.status === 'Aprovado' || b.status === 'Concluído')
        .map(b => ({ project, budget: b }))
    );
    if (approvedBudgets.length > 0) {
      setSelectedBudgetRef(`${approvedBudgets[0].project.id}|${approvedBudgets[0].budget.id}`);
    } else {
      setSelectedBudgetRef('');
    }
    
    setShowSaleModal(true);
  };

  const handleConfirmSale = (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedBudgetRef || !saleExtinguisher) return;

    const [projectId, budgetId] = selectedBudgetRef.split('|');
    
    const updatedProjects = data.projects.map(proj => {
      if (proj.id === projectId) {
        const updatedBudgets = (proj.budgets || []).map(bud => {
          if (bud.id === budgetId) {
            const newItem = {
              id: `item-${Date.now()}`,
              description: saleDescription || `Extintor de ${saleExtinguisher.type} - ${saleExtinguisher.capacity}`,
              quantity: saleQuantity,
              unit: 'Unid',
              unitPrice: salePrice,
            };
            return {
              ...bud,
              items: [...bud.items, newItem]
            };
          }
          return bud;
        });
        return { ...proj, budgets: updatedBudgets };
      }
      return proj;
    });

    updateData({ projects: updatedProjects });
    
    // Also add to client extinguishers
    if (activeClient && saleExtinguisher) {
      const [projectId, budgetId] = selectedBudgetRef.split('|');
      const project = data.projects.find(p => p.id === projectId);
      const budget = project?.budgets?.find(b => b.id === budgetId);
      
      const proposalDate = budget ? budget.date : new Date().toISOString().split('T')[0];
      const rechargeDate = new Date(proposalDate);
      rechargeDate.setFullYear(rechargeDate.getFullYear() + 1);
      const nextRechargeDate = rechargeDate.toISOString().split('T')[0];
      
      const newExtinguisher: Extinguisher = {
        id: `ext-${Date.now()}`,
        numero_cilindro: saleExtinguisher.numero_cilindro || 'Novo',
        type: saleExtinguisher.type || 'Tipo',
        capacity: saleExtinguisher.capacity || 'N/A',
        location: saleExtinguisher.location || 'Local não definido',
        lastRecharge: proposalDate,
        nextRecharge: nextRechargeDate,
        warningDays: 30,
      };

      const updatedClients = clients.map(c => {
        if (c.id === activeClient.id) {
          return { ...c, extinguishers: [...c.extinguishers, newExtinguisher] };
        }
        return c;
      });
      updateData({ clients: updatedClients });
    }
    
    setSaleSuccessMessage("Venda lançada com sucesso na Proposta Comercial e Extintores!");
    setTimeout(() => {
      setSaleSuccessMessage(null);
      setShowSaleModal(false);
      setSaleExtinguisher(null);
    }, 2000);
  };

  const clients = data.clients || [];

  const availableYears = React.useMemo(() => {
    const yearsSet = new Set<number>();
    yearsSet.add(new Date().getFullYear());
    clients.forEach(c => {
      (c.extinguishers || []).forEach(ext => {
        if (ext.nextRecharge) {
          const yr = new Date(ext.nextRecharge + 'T00:00:00').getFullYear();
          if (!isNaN(yr)) {
            yearsSet.add(yr);
          }
        }
      });
    });
    return Array.from(yearsSet).sort((a, b) => a - b);
  }, [clients]);

  const activeClient = clients.find(c => c.id === selectedClient);

  const handleAddCompany = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newCompany.name) return;

    const company: Client = {
      id: `c-${Date.now()}`,
      name: newCompany.name,
      address: newCompany.address || '',
      phone: newCompany.phone || '',
      email: newCompany.email || '',
      document: newCompany.document || '',
      city: newCompany.city || '',
      state: newCompany.state || '',
      cep: newCompany.cep || '',
      extinguishers: newCompany.extinguishers || [],
    };

    updateData({ clients: [...clients, company] });
    setShowAddCompanyForm(false);
    setNewCompany({
      name: '',
      address: '',
      phone: '',
      email: '',
      document: '',
      city: '',
      state: '',
      cep: '',
    });
    setSelectedClient(company.id);
  };

  const handleAddExtinguisher = (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeClient) return;

    const extinguisher: Extinguisher = {
      id: `ext-${Date.now()}`,
      numero_cilindro: newExtinguisher.numero_cilindro || '',
      type: newExtinguisher.type || '',
      capacity: newExtinguisher.capacity || '',
      location: newExtinguisher.location || '',
      lastRecharge: newExtinguisher.lastRecharge || '',
      nextRecharge: newExtinguisher.nextRecharge || '',
      warningDays: newExtinguisher.warningDays || 30,
    };

    const updatedClients = clients.map(c => {
      if (c.id === activeClient.id) {
        return { ...c, extinguishers: [...c.extinguishers, extinguisher] };
      }
      return c;
    });

    updateData({ clients: updatedClients });
    setShowExtinguisherForm(false);
    setNewExtinguisher({
      numero_cilindro: '',
      type: 'Água Pressurizada',
      capacity: '10L',
      location: '',
      lastRecharge: new Date().toISOString().split('T')[0],
      nextRecharge: new Date(new Date().setFullYear(new Date().getFullYear() + 1)).toISOString().split('T')[0],
      warningDays: 30,
    });
  };

  const removeExtinguisher = (clientId: string, extinguisherId: string) => {
    const updatedClients = clients.map(c => {
      if (c.id === clientId) {
        return { ...c, extinguishers: c.extinguishers.filter(e => e.id !== extinguisherId) };
      }
      return c;
    });
    updateData({ clients: updatedClients });
  };

  const getStatusColor = (nextRecharge: string) => {
    const today = new Date();
    const rechargeDate = new Date(nextRecharge);
    const diffTime = rechargeDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return 'text-red-500 bg-red-500/10 border-red-500/20'; // Vencido
    if (diffDays <= 30) return 'text-amber-500 bg-amber-500/10 border-amber-500/20'; // Próximo
    return 'text-emerald-500 bg-emerald-500/10 border-emerald-500/20'; // Ok
  };

  const getStatusText = (nextRecharge: string) => {
    const today = new Date();
    const rechargeDate = new Date(nextRecharge);
    const diffTime = rechargeDate.getTime() - today.getTime();
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays < 0) return 'Vencido';
    if (diffDays <= 30) return 'Vence em breve';
    return 'Ok';
  };

  const generateReport = () => {
    if (clients.length === 0) {
      alert("Nenhum cliente cadastrado.");
      return;
    }

    const monthNames = [
      "Janeiro", "Fevereiro", "Março", "Abril", "Maio", "Junho",
      "Julho", "Agosto", "Setembro", "Outubro", "Novembro", "Dezembro"
    ];

    let filterSubtitle = "Filtros: ";
    if (reportClientFilter === 'all') {
      filterSubtitle += "Todos os Clientes";
    } else {
      const selectedC = clients.find(c => c.id === reportClientFilter);
      filterSubtitle += selectedC ? selectedC.name : "Cliente Especificado";
    }

    if (reportMonthFilter !== 'all') {
      filterSubtitle += ` | Vencimento em: ${monthNames[parseInt(reportMonthFilter)]}`;
    } else {
      filterSubtitle += " | Qualquer Mês";
    }

    if (reportYearFilter !== 'all') {
      filterSubtitle += ` / ${reportYearFilter}`;
    } else {
      filterSubtitle += " | Qualquer Ano";
    }

    // Filter clients & extinguishers based on settings
    const filteredClientsData = clients
      .map(client => {
        if (reportClientFilter !== 'all' && client.id !== reportClientFilter) {
          return { ...client, extinguishers: [] };
        }

        const filteredExts = (client.extinguishers || []).filter(ext => {
          if (!ext.nextRecharge) return false;
          const nextRechargeDate = new Date(ext.nextRecharge + 'T00:00:00');
          
          if (reportMonthFilter !== 'all') {
            if (nextRechargeDate.getMonth() !== parseInt(reportMonthFilter)) {
              return false;
            }
          }

          if (reportYearFilter !== 'all') {
            if (nextRechargeDate.getFullYear() !== parseInt(reportYearFilter)) {
              return false;
            }
          }
          
          return true;
        });

        return { ...client, extinguishers: filteredExts };
      })
      .filter(client => client.extinguishers.length > 0);

    if (filteredClientsData.length === 0) {
      alert("Nenhum extintor encontrado com os filtros selecionados.");
      return;
    }

    let totalExtinguishers = 0;
    let okExtinguishers = 0;
    let warningExtinguishers = 0;
    let expiredExtinguishers = 0;

    // Calculate stats first
    filteredClientsData.forEach(client => {
      client.extinguishers.forEach(ext => {
        totalExtinguishers++;
        const status = getStatusText(ext.nextRecharge);
        if (status === 'Vencido') expiredExtinguishers++;
        else if (status === 'Vence em breve') warningExtinguishers++;
        else okExtinguishers++;
      });
    });

    const doc = new jsPDF();
    let yPos = 15;

    // Helper to add new page if needed
    const checkPage = (heightNeeded: number) => {
      if (yPos + heightNeeded > 280) {
        doc.addPage();
        yPos = 15;
        // Header on new page
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(150, 150, 150);
        const companyName = data.companyName || "Alessandro M. Zandoná";
        doc.text(`Relatório de Extintores - ${companyName}`, 14, 10);
        doc.line(14, 11, 196, 11);
        yPos = 18;
      }
    };

    // Retrieve dynamic company info with correct fallbacks
    const companyName = data.companyName || "SLO – Engenharia de Segurança Contra Incêndio LTDA";
    const companyCnpj = data.companyCnpj || "64.610.803/0001-40";
    const companyAddress = data.companyAddress || "Rua João Sarmento, 987 - Centro, Osório/RS";
    const companyCep = data.companyCep || "94.660-186";
    const companyPhone = data.companyPhone || "(51) 9 9919-1194";
    const companyEmail = data.companyEmail || "sloprevencao.adm@gmail.com";

    // 1. Draw centered logo at the top (if loaded), leaving it blank otherwise
    if (data.logoUrl) {
      try {
        let imgType = 'PNG';
        if (data.logoUrl.includes('image/jpeg') || data.logoUrl.includes('image/jpg')) {
          imgType = 'JPEG';
        }
        // Draw the uploaded logo centered at the top
        doc.addImage(data.logoUrl, imgType, 50, 12, 110, 28, undefined, 'FAST');
      } catch (err) {
        console.error("Erro ao adicionar logo ao PDF:", err);
      }
    }

    // 2. Peach-orange title banner
    doc.setFillColor(241, 156, 121); // Peach-orange
    doc.rect(14, 46, 182, 8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0); // Black text on peach bg
    doc.text("RELATÓRIO DE MANUTENÇÃO E CONTROLE DE EXTINTORES", 105, 51, { align: 'center' });

    // 3. EMISSOR Section
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(185, 28, 28); // Red-700
    doc.text("EMISSOR:", 14, 59);

    doc.setDrawColor(0, 0, 0); // Black border
    doc.setLineWidth(0.25);
    doc.rect(14, 60, 182, 24);

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(0, 0, 0);
    
    // Line 1
    doc.text("Empresa: ", 17, 65);
    doc.setFont('helvetica', 'normal');
    doc.text(companyName, 32, 65);
    
    // Line 2
    doc.setFont('helvetica', 'bold');
    doc.text("CNPJ: ", 17, 71);
    doc.setFont('helvetica', 'normal');
    doc.text(companyCnpj, 28, 71);

    doc.setFont('helvetica', 'bold');
    doc.text("CEP: ", 110, 71);
    doc.setFont('helvetica', 'normal');
    doc.text(companyCep, 120, 71);

    // Line 3
    doc.setFont('helvetica', 'bold');
    doc.text("Endereço: ", 17, 77);
    doc.setFont('helvetica', 'normal');
    const displayCompAddress = companyAddress.length > 52 ? companyAddress.substring(0, 52) + "..." : companyAddress;
    doc.text(displayCompAddress, 33, 77);

    doc.setFont('helvetica', 'bold');
    doc.text("Telefone: ", 110, 77);
    doc.setFont('helvetica', 'normal');
    doc.text(companyPhone, 126, 77);

    // Line 4
    doc.setFont('helvetica', 'bold');
    doc.text("E-mail: ", 110, 82);
    doc.setFont('helvetica', 'normal');
    doc.text(companyEmail, 123, 82);

    // 4. METADADOS Section
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(185, 28, 28); // Red-700
    doc.text("DADOS DE EMISSÃO E FILTROS:", 14, 89);

    doc.setDrawColor(0, 0, 0); // Black border
    doc.rect(14, 90, 182, 24);

    const formattedDate = new Date().toLocaleDateString('pt-BR');
    const formattedTime = new Date().toLocaleTimeString('pt-BR');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(0, 0, 0);

    // Line 1
    doc.text("Relatório: ", 17, 95);
    doc.setFont('helvetica', 'normal');
    doc.text("Controle, Recarga e Vencimento de Extintores PPCI", 31, 95);

    doc.setFont('helvetica', 'bold');
    doc.text("Data: ", 110, 95);
    doc.setFont('helvetica', 'normal');
    doc.text(formattedDate, 120, 95);

    // Line 2
    doc.setFont('helvetica', 'bold');
    doc.text("Filtro: ", 17, 101);
    doc.setFont('helvetica', 'normal');
    const displaySubtitle = filterSubtitle.length > 50 ? filterSubtitle.substring(0, 47) + "..." : filterSubtitle;
    doc.text(displaySubtitle, 27, 101);

    doc.setFont('helvetica', 'bold');
    doc.text("Hora: ", 110, 101);
    doc.setFont('helvetica', 'normal');
    doc.text(formattedTime, 120, 101);

    // Line 3
    doc.setFont('helvetica', 'bold');
    doc.text("Total Extintores: ", 17, 107);
    doc.setFont('helvetica', 'normal');
    doc.text(`${totalExtinguishers} Equipamentos`, 40, 107);

    doc.setFont('helvetica', 'bold');
    doc.text("Status Ok: ", 110, 107);
    doc.setFont('helvetica', 'normal');
    doc.text(`${okExtinguishers} Equipamentos`, 126, 107);

    // Line 4
    doc.setFont('helvetica', 'bold');
    doc.text("Vencidos: ", 17, 112);
    doc.setFont('helvetica', 'normal');
    doc.text(`${expiredExtinguishers} Vencidos`, 31, 112);

    doc.setFont('helvetica', 'bold');
    doc.text("A Vencer: ", 110, 112);
    doc.setFont('helvetica', 'normal');
    doc.text(`${warningExtinguishers} Equipamentos (Alerta)`, 125, 112);

    yPos = 124;

    filteredClientsData.forEach((client) => {
      const clientExts = client.extinguishers;

      // Header of client section
      checkPage(35);
      
      // Draw a subtle background line
      doc.setDrawColor(228, 228, 231); // zinc-200
      doc.setLineWidth(0.5);
      doc.line(14, yPos, 196, yPos);
      yPos += 6;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(11);
      doc.setTextColor(24, 24, 27);
      doc.text(client.name, 14, yPos);
      yPos += 5;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);
      doc.setTextColor(113, 113, 122); // zinc-500
      doc.text(`Endereço: ${client.address || 'Não informado'}`, 14, yPos);
      yPos += 7;

      // Table Headers
      doc.setFillColor(244, 244, 245);
      doc.rect(14, yPos, 182, 7, 'F');
      
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(63, 63, 70); // zinc-700
      
      doc.text("Nº Cilindro", 16, yPos + 5);
      doc.text("Tipo", 42, yPos + 5);
      doc.text("Capac.", 78, yPos + 5);
      doc.text("Localização", 98, yPos + 5);
      doc.text("Última Rec.", 140, yPos + 5);
      doc.text("Próx. Rec.", 165, yPos + 5);
      doc.text("Status", 188, yPos + 5);
      yPos += 7;

      // Extinguisher items
      clientExts.forEach((ext) => {
        checkPage(10);
        
        // Alternating row color or simple line separating
        doc.setDrawColor(244, 244, 245);
        doc.line(14, yPos + 6, 196, yPos + 6);
        
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(39, 39, 42); // zinc-800
        
        doc.text(ext.numero_cilindro || '-', 16, yPos + 4);
        doc.text(ext.type || '-', 42, yPos + 4);
        doc.text(ext.capacity || '-', 78, yPos + 4);
        
        // Truncate location if too long to avoid overlapping
        const loc = ext.location || '-';
        const truncatedLoc = loc.length > 25 ? loc.substring(0, 22) + "..." : loc;
        doc.text(truncatedLoc, 98, yPos + 4);
        
        doc.text(ext.lastRecharge ? new Date(ext.lastRecharge + 'T00:00:00').toLocaleDateString('pt-BR') : '-', 140, yPos + 4);
        doc.text(ext.nextRecharge ? new Date(ext.nextRecharge + 'T00:00:00').toLocaleDateString('pt-BR') : '-', 165, yPos + 4);
        
        const status = getStatusText(ext.nextRecharge);
        if (status === 'Vencido') {
          doc.setTextColor(220, 38, 38); // red-600
          doc.setFont('helvetica', 'bold');
        } else if (status === 'Vence em breve') {
          doc.setTextColor(217, 119, 6); // amber-600
          doc.setFont('helvetica', 'bold');
        } else {
          doc.setTextColor(5, 150, 105); // emerald-600
          doc.setFont('helvetica', 'normal');
        }
        doc.text(status, 188, yPos + 4);
        
        yPos += 7;
      });

      yPos += 5; // spacing after client
    });

    // App development footer
    yPos += 15;
    if (yPos > 270) {
      doc.addPage();
      yPos = 20;
    }
    doc.setDrawColor(228, 228, 231);
    doc.line(14, yPos, 196, yPos);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(113, 113, 122);
    doc.text(`© Alessandro M. Zandoná • Direitos Reservados`, 14, yPos + 5);
    doc.text("APP em desenvolvimento", 14, yPos + 9);

    doc.save(`relatorio_extintores_${new Date().toISOString().split('T')[0]}.pdf`);
    setShowReportModal(false);
  };

  const clientProjects = activeClient ? (data.projects || []).filter(p => p.clientId === activeClient.id || p.clientName.toLowerCase() === activeClient.name.toLowerCase()) : [];
  const approvedBudgets = clientProjects.flatMap(project => 
    (project.budgets || [])
      .filter(b => b.status === 'Aprovado' || b.status === 'Concluído')
      .map(b => ({ project, budget: b }))
  );

  return (
    <div className="flex flex-col h-full p-8 overflow-hidden">
      <div className="flex items-center justify-between mb-8 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-semibold text-white">Controle de Extintores</h1>
          <p className="text-zinc-400">Gerencie a recarga e consulta de extintores das empresas e clientes cadastrados.</p>
        </div>
        <button
          onClick={() => {
            setReportClientFilter('all');
            setReportMonthFilter('all');
            setReportYearFilter('all');
            setShowReportModal(true);
          }}
          className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
        >
          <FileText className="w-4 h-4" />
          Gerar Relatório PDF
        </button>
      </div>

      <div className="flex gap-8 flex-1 min-h-0">
        {/* Client List */}
        <div className="w-1/3 flex flex-col overflow-hidden bg-zinc-950 rounded-xl border border-zinc-900 shadow-sm">
          <div className="p-4 border-b border-zinc-900 bg-zinc-900 font-semibold text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Building className="w-4 h-4 text-red-500" />
              Empresas / Clientes
            </div>
            <button
              onClick={() => setShowAddCompanyForm(true)}
              className="flex items-center gap-1 bg-red-600 hover:bg-red-700 text-white px-2 py-1 rounded text-xs font-semibold transition-colors"
              title="Adicionar Empresa"
            >
              <Plus className="w-3.5 h-3.5" />
              Empresa
            </button>
          </div>
          <div className="flex-1 overflow-y-auto p-2">
            {clients.length === 0 ? (
              <div className="p-4 text-sm text-zinc-500 text-center">Nenhuma empresa ou cliente cadastrado.</div>
            ) : (
              clients.map((client) => (
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

        {/* Extinguishers Details */}
        <div className="w-2/3 bg-zinc-950 rounded-xl border border-zinc-900 shadow-sm flex flex-col overflow-hidden">
          {activeClient ? (
            <>
              <div className="p-6 border-b border-zinc-900 bg-zinc-900/50 shrink-0">
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-xl font-bold text-white mb-2">{activeClient.name}</h2>
                    <div className="flex flex-col gap-2 text-sm text-zinc-400">
                      <span className="flex items-center gap-2"><MapPin className="w-4 h-4" /> {activeClient.address}</span>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowExtinguisherForm(true)}
                    className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                  >
                    <Plus className="w-4 h-4" />
                    Adicionar Extintor
                  </button>
                </div>
              </div>
              
              <div className="p-6 flex-1 overflow-y-auto">
                <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                  <Flame className="w-4 h-4 text-red-500" />
                  Extintores Cadastrados
                </h3>
                
                {(!activeClient.extinguishers || activeClient.extinguishers.length === 0) ? (
                  <div className="text-center p-8 border border-dashed border-zinc-800 rounded-lg text-zinc-500 mb-6">
                    Nenhum extintor cadastrado para este cliente.
                  </div>
                ) : (
                  <div className="space-y-3 mb-6">
                    {activeClient.extinguishers.map(ext => (
                      <div key={ext.id} className="p-4 border border-zinc-800 bg-zinc-900/50 rounded-lg flex items-center justify-between">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="font-semibold text-white">{ext.type} - {ext.capacity}</span>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full border uppercase tracking-wider font-bold ${getStatusColor(ext.nextRecharge)}`}>
                              {getStatusText(ext.nextRecharge)}
                            </span>
                          </div>
                          <div className="text-xs text-zinc-400 mt-1 flex gap-4">
                            <span>Loc: {ext.location || 'N/A'}</span>
                            {ext.numero_cilindro && <span>Cilindro: {ext.numero_cilindro}</span>}
                          </div>
                        </div>
                        <div className="flex items-center gap-4">
                          <button
                            onClick={() => handleOpenSaleModal(ext)}
                            className="text-emerald-500 hover:text-emerald-400 hover:bg-emerald-500/10 transition-all px-2.5 py-1.5 rounded border border-emerald-500/20 flex items-center gap-1 text-xs font-semibold"
                            title="Lançar Venda deste Extintor em uma Proposta Aprovada"
                          >
                            <ShoppingCart className="w-3.5 h-3.5" />
                            <span>Lançar Venda</span>
                          </button>
                          <div className="text-right shrink-0">
                            <div className="text-[10px] text-zinc-500 uppercase tracking-widest mb-1">Próx. Recarga</div>
                            <div className="text-sm text-zinc-300 font-mono">
                              {new Date(ext.nextRecharge).toLocaleDateString('pt-BR')}
                            </div>
                          </div>
                          <button 
                            onClick={() => removeExtinguisher(activeClient.id, ext.id)}
                            className="text-zinc-600 hover:text-red-500 transition-colors p-2 shrink-0"
                            title="Remover"
                          >
                            <X className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                <h3 className="font-semibold text-white mb-4 flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-emerald-500" />
                  Vendas e Orçamentos Associados
                </h3>
                {approvedBudgets.length === 0 ? (
                  <div className="text-center p-4 border border-dashed border-zinc-800 rounded-lg text-zinc-500 text-sm">
                    Nenhuma proposta aprovada ou concluída encontrada para este cliente.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {approvedBudgets.map(({ project, budget }) => (
                      <div key={`${project.id}-${budget.id}`} className="p-3 border border-zinc-800 bg-zinc-900/30 rounded-lg flex items-center justify-between">
                        <div className="text-xs text-zinc-300">
                          <span className="font-semibold">{budget.proposalNumber}</span> - {project.type} ({budget.status})
                        </div>
                        <div className="text-xs font-mono text-emerald-500">
                          R$ {budget.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0).toFixed(2).replace('.', ',')}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="flex flex-col items-center justify-center h-full text-zinc-500">
              <Flame className="w-12 h-12 mb-4 opacity-20" />
              <p>Selecione um cliente para visualizar ou adicionar extintores.</p>
            </div>
          )}
        </div>
      </div>

      {showExtinguisherForm && activeClient && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-zinc-950 rounded-xl border border-zinc-900 shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-4 border-b border-zinc-900 flex justify-between items-center bg-zinc-900">
              <h2 className="font-semibold text-white flex items-center gap-2">
                <Flame className="w-5 h-5 text-red-600" />
                Novo Extintor
              </h2>
              <button
                onClick={() => setShowExtinguisherForm(false)}
                className="text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddExtinguisher} className="p-6 space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1">Tipo</label>
                  <select
                    value={newExtinguisher.type}
                    onChange={(e) => setNewExtinguisher({ ...newExtinguisher, type: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  >
                    <option value="Água Pressurizada">Água Pressurizada</option>
                    <option value="Pó Químico (BC)">Pó Químico (BC)</option>
                    <option value="Pó Químico (ABC)">Pó Químico (ABC)</option>
                    <option value="CO2">CO2</option>
                    <option value="Espuma Mecânica">Espuma Mecânica</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1">Capacidade</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: 10L, 6kg, 4kg"
                    value={newExtinguisher.capacity}
                    onChange={(e) => setNewExtinguisher({ ...newExtinguisher, capacity: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                   <label className="block text-sm font-medium text-zinc-300 mb-1">Nº Cilindro (opcional)</label>
                   <input
                    type="text"
                    placeholder="Ex: 123456"
                    value={newExtinguisher.numero_cilindro}
                    onChange={(e) => setNewExtinguisher({ ...newExtinguisher, numero_cilindro: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1">Localização</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Recepção"
                    value={newExtinguisher.location}
                    onChange={(e) => setNewExtinguisher({ ...newExtinguisher, location: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                 <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1">Última Recarga</label>
                  <input
                    type="date"
                    required
                    value={newExtinguisher.lastRecharge}
                    onChange={(e) => setNewExtinguisher({ ...newExtinguisher, lastRecharge: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                </div>
                <div>
                   <label className="block text-sm font-medium text-zinc-300 mb-1">Próxima Recarga</label>
                   <input
                    type="date"
                    required
                    value={newExtinguisher.nextRecharge}
                    onChange={(e) => setNewExtinguisher({ ...newExtinguisher, nextRecharge: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4">
                <div>
                   <label className="block text-sm font-medium text-zinc-300 mb-1">Avisar com antecedência (dias)</label>
                   <input
                    type="number"
                    min="0"
                    required
                    value={newExtinguisher.warningDays}
                    onChange={(e) => setNewExtinguisher({ ...newExtinguisher, warningDays: parseInt(e.target.value) || 0 })}
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-zinc-900 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowExtinguisherForm(false)}
                  className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-white transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-md transition-colors"
                >
                  Salvar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showReportModal && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-zinc-950 rounded-xl border border-zinc-900 shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-4 border-b border-zinc-900 flex justify-between items-center bg-zinc-900">
              <h2 className="font-semibold text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-red-600" />
                Opções de Relatório PDF
              </h2>
              <button
                onClick={() => setShowReportModal(false)}
                className="text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">Filtrar por Cliente</label>
                <select
                  value={reportClientFilter}
                  onChange={(e) => setReportClientFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent bg-zinc-900"
                >
                  <option value="all">Todos os Clientes</option>
                  {clients.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">Mês de Vencimento</label>
                <select
                  value={reportMonthFilter}
                  onChange={(e) => setReportMonthFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent bg-zinc-900"
                >
                  <option value="all">Qualquer Mês (Todos)</option>
                  <option value="0">Janeiro</option>
                  <option value="1">Fevereiro</option>
                  <option value="2">Março</option>
                  <option value="3">Abril</option>
                  <option value="4">Maio</option>
                  <option value="5">Junho</option>
                  <option value="6">Julho</option>
                  <option value="7">Agosto</option>
                  <option value="8">Setembro</option>
                  <option value="9">Outubro</option>
                  <option value="10">Novembro</option>
                  <option value="11">Dezembro</option>
                </select>
                <p className="text-xs text-zinc-500 mt-1">
                  Filtra extintores com próxima recarga prevista para o mês selecionado.
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">Ano de Vencimento</label>
                <select
                  value={reportYearFilter}
                  onChange={(e) => setReportYearFilter(e.target.value)}
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent bg-zinc-900"
                >
                  <option value="all">Qualquer Ano (Todos)</option>
                  {availableYears.map((yr) => (
                    <option key={yr} value={yr.toString()}>
                      {yr}
                    </option>
                  ))}
                </select>
                <p className="text-xs text-zinc-500 mt-1">
                  Filtra extintores com próxima recarga prevista para o ano selecionado.
                </p>
              </div>

              <div className="pt-4 border-t border-zinc-900 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowReportModal(false)}
                  className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-white transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={generateReport}
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-md transition-colors flex items-center gap-2"
                >
                  <FileText className="w-4 h-4" />
                  Gerar PDF
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showAddCompanyForm && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-zinc-950 rounded-xl border border-zinc-900 shadow-xl w-full max-w-lg overflow-hidden">
            <div className="p-4 border-b border-zinc-900 flex justify-between items-center bg-zinc-900">
              <h2 className="font-semibold text-white flex items-center gap-2">
                <Building className="w-5 h-5 text-red-600" />
                Cadastrar Nova Empresa / Cliente
              </h2>
              <button
                onClick={() => setShowAddCompanyForm(false)}
                className="text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddCompany} className="p-6 space-y-4">
              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1">Nome da Empresa / Razão Social *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Condomínio Residencial Jardim"
                  value={newCompany.name || ''}
                  onChange={(e) => {
                    setNewCompany({ ...newCompany, name: e.target.value });
                    setSelectedProjectForClient('');
                  }}
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 text-white rounded focus:outline-none focus:ring-1 focus:ring-red-500 text-sm"
                />
                
                <div className="mt-2">
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">Ou selecione um Projeto PPCI Aprovado/Concluído</label>
                  <select
                    value={selectedProjectForClient}
                    onChange={(e) => {
                      const projectId = e.target.value;
                      setSelectedProjectForClient(projectId);
                      if (projectId) {
                        const project = data.projects.find(p => p.id === projectId);
                        if (project) {
                          setNewCompany({
                            ...newCompany,
                            name: project.clientName,
                            address: project.address,
                            extinguishers: project.extinguishers || [],
                          });
                        }
                      }
                    }}
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 text-white rounded focus:outline-none focus:ring-1 focus:ring-red-500 text-sm"
                  >
                    <option value="">-- Selecione um Projeto --</option>
                    {data.projects
                      .filter(p => (p.status === 'Aprovado' || p.status === 'Concluído') && 
                                   (p.extinguishers && p.extinguishers.length > 0))
                      .map(p => (
                        <option key={p.id} value={p.id}>{p.clientName} - {p.type}</option>
                      ))}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 mb-1">Endereço Completo</label>
                <input
                  type="text"
                  placeholder="Ex: Av. Principal, 1000 - Centro"
                  value={newCompany.address || ''}
                  onChange={(e) => setNewCompany({ ...newCompany, address: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 text-white rounded focus:outline-none focus:ring-1 focus:ring-red-500 text-sm"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">CNPJ / CPF</label>
                  <input
                    type="text"
                    placeholder="Ex: 00.000.000/0001-00"
                    value={newCompany.document || ''}
                    onChange={(e) => setNewCompany({ ...newCompany, document: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 text-white rounded focus:outline-none focus:ring-1 focus:ring-red-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">CEP</label>
                  <input
                    type="text"
                    placeholder="Ex: 00000-000"
                    value={newCompany.cep || ''}
                    onChange={(e) => setNewCompany({ ...newCompany, cep: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 text-white rounded focus:outline-none focus:ring-1 focus:ring-red-500 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">Cidade</label>
                  <input
                    type="text"
                    placeholder="Ex: Osório"
                    value={newCompany.city || ''}
                    onChange={(e) => setNewCompany({ ...newCompany, city: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 text-white rounded focus:outline-none focus:ring-1 focus:ring-red-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">Estado (UF)</label>
                  <input
                    type="text"
                    placeholder="Ex: RS"
                    value={newCompany.state || ''}
                    onChange={(e) => setNewCompany({ ...newCompany, state: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 text-white rounded focus:outline-none focus:ring-1 focus:ring-red-500 text-sm"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">Telefone *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: (51) 99999-9999"
                    value={newCompany.phone || ''}
                    onChange={(e) => setNewCompany({ ...newCompany, phone: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 text-white rounded focus:outline-none focus:ring-1 focus:ring-red-500 text-sm"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">E-mail</label>
                  <input
                    type="email"
                    placeholder="Ex: contato@empresa.com.br"
                    value={newCompany.email || ''}
                    onChange={(e) => setNewCompany({ ...newCompany, email: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 text-white rounded focus:outline-none focus:ring-1 focus:ring-red-500 text-sm"
                  />
                </div>
              </div>

              <div className="pt-4 border-t border-zinc-900 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setShowAddCompanyForm(false)}
                  className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-white transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded-md transition-colors"
                >
                  Salvar Empresa
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showSaleModal && saleExtinguisher && activeClient && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-zinc-950 rounded-xl border border-zinc-900 shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-4 border-b border-zinc-900 flex justify-between items-center bg-zinc-900">
              <h2 className="font-semibold text-white flex items-center gap-2">
                <ShoppingCart className="w-5 h-5 text-emerald-500" />
                Lançar Venda de Extintor na Proposta
              </h2>
              <button
                onClick={() => {
                  setShowSaleModal(false);
                  setSaleExtinguisher(null);
                }}
                className="text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            
            {saleSuccessMessage ? (
              <div className="p-8 text-center space-y-3">
                <div className="w-12 h-12 bg-emerald-500/10 text-emerald-500 rounded-full flex items-center justify-center mx-auto animate-bounce">
                  <Check className="w-6 h-6" />
                </div>
                <h3 className="text-white font-semibold">{saleSuccessMessage}</h3>
                <p className="text-zinc-400 text-xs">O orçamento foi atualizado com o novo item de venda.</p>
              </div>
            ) : (
              <form onSubmit={handleConfirmSale} className="p-6 space-y-4">
                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">Extintor Selecionado</label>
                  <div className="bg-zinc-900 p-3 rounded border border-zinc-800 text-sm text-zinc-300">
                    <span className="font-bold text-white">{saleExtinguisher.type}</span> - {saleExtinguisher.capacity}
                    {saleExtinguisher.numero_cilindro && <p className="text-xs text-zinc-500 mt-1">Cilindro: {saleExtinguisher.numero_cilindro}</p>}
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-zinc-400 mb-1">Selecione a Proposta Comercial Aprovada ou Concluída *</label>
                  {approvedBudgets.length === 0 ? (
                    <div className="text-xs text-amber-500 bg-amber-500/10 border border-amber-500/20 p-3 rounded space-y-1">
                      <p className="font-bold">Nenhuma proposta aprovada ou concluída encontrada!</p>
                      <p>Para lançar esta venda, acesse a aba de <span className="font-semibold underline">Projetos</span>, crie uma proposta técnica/comercial para este cliente e marque o status como <strong>Aprovado</strong> ou <strong>Concluído</strong>.</p>
                    </div>
                  ) : (
                    <select
                      required
                      value={selectedBudgetRef}
                      onChange={(e) => setSelectedBudgetRef(e.target.value)}
                      className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 text-white rounded focus:outline-none focus:ring-1 focus:ring-emerald-500 text-sm"
                    >
                      <option value="">-- Selecione uma Proposta --</option>
                      {approvedBudgets.map(item => (
                        <option key={item.budget.id} value={`${item.project.id}|${item.budget.id}`}>
                          Nº {item.budget.proposalNumber || item.budget.id.substring(0, 8)} ({item.project.type}) - Total: R$ {item.budget.items.reduce((s, i) => s + (i.quantity * i.unitPrice), 0).toFixed(2)}
                        </option>
                      ))}
                    </select>
                  )}
                </div>

                {approvedBudgets.length > 0 && (
                  <>
                    <div>
                      <label className="block text-xs font-semibold text-zinc-400 mb-1">Descrição do Item na Proposta *</label>
                      <input
                        type="text"
                        required
                        value={saleDescription}
                        onChange={(e) => setSaleDescription(e.target.value)}
                        className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 text-white rounded focus:outline-none focus:ring-1 focus:ring-emerald-500 text-sm"
                      />
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-semibold text-zinc-400 mb-1">Valor Unitário de Venda (R$) *</label>
                        <input
                          type="number"
                          required
                          min="0"
                          step="0.01"
                          value={salePrice}
                          onChange={(e) => setSalePrice(Number(e.target.value))}
                          className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 text-white rounded focus:outline-none focus:ring-1 focus:ring-emerald-500 text-sm"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-zinc-400 mb-1">Quantidade *</label>
                        <input
                          type="number"
                          required
                          min="1"
                          value={saleQuantity}
                          onChange={(e) => setSaleQuantity(Number(e.target.value))}
                          className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 text-white rounded focus:outline-none focus:ring-1 focus:ring-emerald-500 text-sm"
                        />
                      </div>
                    </div>
                  </>
                )}

                <div className="pt-4 border-t border-zinc-900 flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowSaleModal(false);
                      setSaleExtinguisher(null);
                    }}
                    className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-white transition-colors"
                  >
                    Cancelar
                  </button>
                  <button
                    type="submit"
                    disabled={approvedBudgets.length === 0 || !selectedBudgetRef}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-medium rounded transition-colors flex items-center gap-1"
                  >
                    <Check className="w-4 h-4" />
                    Lançar Venda
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
