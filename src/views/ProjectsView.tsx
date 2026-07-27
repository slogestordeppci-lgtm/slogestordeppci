import React, { useState, useEffect } from 'react';
import { useStore } from '../store';
import { 
  FileText, 
  MapPin, 
  CheckCircle, 
  AlertTriangle, 
  FileCheck, 
  FolderGit2, 
  Plus, 
  X, 
  Building, 
  Calculator, 
  Coins, 
  Download,
  Trash2,
  Printer,
  Receipt,
  Check,
  Edit,
  ArrowLeft,
  Sparkles,
  Percent,
  Calendar,
  ClipboardCheck
} from 'lucide-react';
import { Project, FinancialTransaction, ProjectBudget, ProjectBudgetItem, Client } from '../types';
import { ProjectDriveFiles } from '../components/ProjectDriveFiles';
import { InspectionReport } from '../components/InspectionReport';
import { jsPDF } from 'jspdf';
import { addStandardHeader, addStandardFooter } from '../utils/pdfHelper';

export function ProjectsView() {
  const { data, updateData } = useStore();
  const [selectedProject, setSelectedProject] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [newProject, setNewProject] = useState<Partial<Project>>({
    clientName: '',
    address: '',
    type: 'Comercial',
    paymentMethods: [],
  });

  // Budget States
  const [showBudgetModal, setShowBudgetModal] = useState(false);
  const [editingBudget, setEditingBudget] = useState<ProjectBudget | null>(null);
  const [budgetToDelete, setBudgetToDelete] = useState<{ projectId: string, budgetId: string } | null>(null);
  const [catalogSearch, setCatalogSearch] = useState('');

  // Intercepting Approval States for Financial Movements
  const [showApprovalModal, setShowApprovalModal] = useState(false);
  const [projectToApprove, setProjectToApprove] = useState<Project | null>(null);
  const [approvalValue, setApprovalValue] = useState<number>(0);
  const [selectedApprovalMethod, setSelectedApprovalMethod] = useState<string>('À vista com desconto');
  const [paymentStatus, setPaymentStatus] = useState<'recebido' | 'pendente'>('recebido');

  // Auto select active project from navigation session storage if set
  useEffect(() => {
    const savedProjectId = sessionStorage.getItem('active_project_id');
    if (savedProjectId) {
      setSelectedProject(savedProjectId);
      sessionStorage.removeItem('active_project_id');
    }
  }, []);

  const handleAddProject = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newProject.clientName || !newProject.address) return;

    let clientId = '';
    let newClients = data.clients || [];
    const existingClient = newClients.find(c => c.name.toLowerCase() === newProject.clientName!.toLowerCase());
    
    if (existingClient) {
      clientId = existingClient.id;
    } else {
      clientId = `c-${Date.now()}`;
      newClients = [...data.clients, {
        id: clientId,
        name: newProject.clientName,
        address: newProject.address,
        extinguishers: []
      }];
    }

    const projectCodes = data.projects
      .map(p => parseInt(p.id))
      .filter(id => !isNaN(id));
    const nextId = projectCodes.length > 0 ? Math.max(...projectCodes) + 1 : 1000;

    const project: Project = {
      id: nextId.toString(),
      clientId,
      clientName: newProject.clientName,
      address: newProject.address,
      status: 'Orçamento',
      type: newProject.type as any,
      value: newProject.value || 0,
      paymentMethods: newProject.paymentMethods || [],
      discountPercentage: newProject.discountPercentage || 5, // Default 5%
      interestPercentage: newProject.interestPercentage || 12, // Default 12%
      checklist: {
        plantas_arquitetonicas: false,
        extintores: false,
        sinalizacao: false,
        iluminacao_emergencia: false,
        central_glp: false,
        saidas_emergencia: false,
      },
      notes: '',
      lastVisit: new Date().toLocaleDateString('pt-BR'),
    };

    updateData({ projects: [...data.projects, project], clients: newClients });
    setShowAddForm(false);
    setNewProject({ clientName: '', address: '', type: 'Comercial', paymentMethods: [] });
    setSelectedProject(project.id);
  };

  const activeProject = data.projects.find(p => p.id === selectedProject);

  const updateProjectField = (projectId: string, field: keyof Project, value: any) => {
    const updated = data.projects.map(p => p.id === projectId ? { ...p, [field]: value } : p);
    updateData({ projects: updated });
  };

  const toggleChecklist = (projectId: string, key: keyof Project['checklist']) => {
    const updated = data.projects.map(p => {
      if (p.id === projectId) {
        return {
          ...p,
          checklist: { ...p.checklist, [key]: !p.checklist[key] }
        };
      }
      return p;
    });
    updateData({ projects: updated });
  };

  const updateNotes = (projectId: string, notes: string) => {
    const updated = data.projects.map(p => p.id === projectId ? { ...p, notes } : p);
    updateData({ projects: updated });
  };

  const updateProjectAction = (projectId: string, actionKey: string, field: 'date' | 'checked' | 'protocolNumber' | 'analyzed' | 'analyzedDate', value: any) => {
    const updated = data.projects.map(p => {
      if (p.id === projectId) {
        const existingActions = p.actions || {};
        const action = existingActions[actionKey] || { date: '', checked: false, protocolNumber: '', analyzed: false, analyzedDate: '' };
        const updatedAction = { ...action, [field]: value };
        return {
          ...p,
          actions: {
            ...existingActions,
            [actionKey]: updatedAction
          }
        };
      }
      return p;
    });
    updateData({ projects: updated });
  };

  useEffect(() => {
    if (activeProject && (!activeProject.value || activeProject.value === 0) && activeProject.budgets && activeProject.budgets.length > 0) {
      const mostRecentBudget = [...activeProject.budgets].sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())[0];
      const totalValue = mostRecentBudget.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
      
      if (totalValue > 0) {
        updateProjectField(activeProject.id, 'value', totalValue);
      }
    }
  }, [activeProject?.id, activeProject?.budgets]);

  const saveProjectBudget = (projectId: string, budget: ProjectBudget) => {
    const updated = data.projects.map(p => {
      if (p.id === projectId) {
        const existingBudgets = p.budgets || [];
        const index = existingBudgets.findIndex(b => b.id === budget.id);
        let nextBudgets;
        if (index >= 0) {
          nextBudgets = [...existingBudgets];
          nextBudgets[index] = budget;
        } else {
          nextBudgets = [...existingBudgets, budget];
        }
        return { ...p, budgets: nextBudgets };
      }
      return p;
    });
    updateData({ projects: updated });
  };

  const deleteProjectBudget = (projectId: string, budgetId: string) => {
    const updated = data.projects.map(p => {
      if (p.id === projectId) {
        return {
          ...p,
          budgets: (p.budgets || []).filter(b => b.id !== budgetId)
        };
      }
      return p;
    });
    updateData({ projects: updated });
  };

  const syncExtinguishersFromBudget = (project: Project, budget: ProjectBudget, currentClients: Client[]) => {
    const clientIndex = currentClients.findIndex(c => c.id === project.clientId || c.name.toLowerCase() === project.clientName.toLowerCase());
    if (clientIndex === -1) {
      console.log("Cliente não encontrado para sincronização de extintores.");
      return currentClients;
    }

    const client = currentClients[clientIndex];
    const existingExtinguishers = [...(client.extinguishers || [])];
    let updatedExts = [...existingExtinguishers];
    let changed = false;
    let addedCount = 0;
    let rechargedCount = 0;

    budget.items.forEach(item => {
      const desc = item.description.toLowerCase();
      const isExtinguisherRelated = desc.includes('extintor') || desc.includes('recarga') || desc.includes('carga') || desc.includes('venda') || desc.includes('manutenção') || desc.includes('manutencao');
      
      if (isExtinguisherRelated) {
        let type = 'PQS';
        if (desc.includes('co2')) {
          type = 'CO2';
        } else if (desc.includes('agua') || desc.includes('água') || desc.includes('h2o')) {
          type = 'Água';
        } else if (desc.includes('espuma')) {
          type = 'Espuma';
        }

        let capacity = '4 kg';
        const capRegex = /(\d+)\s*(kg|l|L)/i;
        const match = item.description.match(capRegex);
        if (match) {
          capacity = `${match[1]} ${match[2].toUpperCase()}`;
        } else if (type === 'Água') {
          capacity = '10 L';
        }

        const isRecharge = desc.includes('recarga') || desc.includes('carga') || desc.includes('manutenção') || desc.includes('manutencao');

        const lastRechargeDate = new Date().toISOString().split('T')[0];
        const nextDateObj = new Date();
        nextDateObj.setFullYear(nextDateObj.getFullYear() + 1);
        const nextRechargeDate = nextDateObj.toISOString().split('T')[0];

        if (isRecharge) {
          let qtyToRecharge = item.quantity;
          updatedExts = updatedExts.map(ext => {
            if (qtyToRecharge > 0 && ext.type.toLowerCase() === type.toLowerCase() && ext.lastRecharge !== lastRechargeDate) {
              qtyToRecharge--;
              rechargedCount++;
              changed = true;
              return {
                ...ext,
                lastRecharge: lastRechargeDate,
                nextRecharge: nextRechargeDate,
              };
            }
            return ext;
          });

          for (let i = 0; i < qtyToRecharge; i++) {
            const randId = 'ext-' + Math.random().toString(36).substr(2, 9);
            const randCylinder = 'CIL-' + Math.floor(10000 + Math.random() * 90000);
            updatedExts.push({
              id: randId,
              numero_cilindro: randCylinder,
              type,
              capacity,
              location: 'A definir (via Orçamento)',
              lastRecharge: lastRechargeDate,
              nextRecharge: nextRechargeDate,
              warningDays: 30
            });
            addedCount++;
            changed = true;
          }
        } else {
          for (let i = 0; i < item.quantity; i++) {
            const randId = 'ext-' + Math.random().toString(36).substr(2, 9);
            const randCylinder = 'CIL-' + Math.floor(10000 + Math.random() * 90000);
            updatedExts.push({
              id: randId,
              numero_cilindro: randCylinder,
              type,
              capacity,
              location: 'A definir (via Venda)',
              lastRecharge: lastRechargeDate,
              nextRecharge: nextRechargeDate,
              warningDays: 30
            });
            addedCount++;
            changed = true;
          }
        }
      }
    });

    if (changed) {
      const updatedClients = [...currentClients];
      updatedClients[clientIndex] = {
        ...client,
        extinguishers: updatedExts
      };
      
      let message = `Sincronização de Extintores Concluída:\n`;
      if (addedCount > 0) message += `• ${addedCount} novos extintores adicionados ao cliente.\n`;
      if (rechargedCount > 0) message += `• ${rechargedCount} extintores existentes recarregados com sucesso.\n`;
      message += `Estes dados já estão disponíveis no menu "Extintores (CBM)".`;
      alert(message);

      return updatedClients;
    }

    return currentClients;
  };

  // Beautiful PDF Compliance Report for Active Project
  const generateReport = (project: Project) => {
    if (!project) return;
    const doc = new jsPDF();
    
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
    doc.text("LAUDO TÉCNICO DE CONFORMIDADE E REGULARIDADE PPCI", 105, 51, { align: 'center' });

    // 3. CONTRATADO Section
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(185, 28, 28); // Red-700
    doc.text("CONTRATADO:", 14, 59);

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

    // 4. CONTRATANTE Section
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(185, 28, 28); // Red-700
    doc.text("CONTRATANTE:", 14, 89);

    doc.setDrawColor(0, 0, 0); // Black border
    doc.rect(14, 90, 182, 24);

    const clientRecord = data.clients?.find(c => 
      c.id === project.clientId || 
      c.name.toLowerCase() === project.clientName.toLowerCase()
    );
    const clientDoc = clientRecord?.document || '11.264.047/0001-89';
    const clientCEP = clientRecord?.cep || '95520-000';
    const clientPhone = clientRecord?.phone || '';
    const clientAddress = project.address || clientRecord?.address || 'Rua 15 de novembro 519 centro Osório';
    const formattedDate = new Date().toLocaleDateString('pt-BR');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(0, 0, 0);

    // Line 1
    doc.text("Cliente: ", 17, 95);
    doc.setFont('helvetica', 'normal');
    doc.text(project.clientName, 29, 95);

    doc.setFont('helvetica', 'bold');
    doc.text("CEP: ", 110, 95);
    doc.setFont('helvetica', 'normal');
    doc.text(clientCEP, 120, 95);

    // Line 2
    doc.setFont('helvetica', 'bold');
    doc.text("CPF/CNPJ: ", 17, 101);
    doc.setFont('helvetica', 'normal');
    doc.text(clientDoc, 36, 101);

    doc.setFont('helvetica', 'bold');
    doc.text("Data: ", 110, 101);
    doc.setFont('helvetica', 'normal');
    doc.text(formattedDate, 120, 101);

    // Line 3
    doc.setFont('helvetica', 'bold');
    doc.text("Endereço do imóvel: ", 17, 107);
    doc.setFont('helvetica', 'normal');
    const displayClientAddress = clientAddress.length > 50 ? clientAddress.substring(0, 50) + "..." : clientAddress;
    doc.text(displayClientAddress, 50, 107);

    doc.setFont('helvetica', 'bold');
    doc.text("Telefone: ", 110, 107);
    doc.setFont('helvetica', 'normal');
    doc.text(clientPhone || "---", 126, 107);

    // Line 4
    doc.setFont('helvetica', 'bold');
    doc.text("Tipo / Ocupação: ", 17, 112);
    doc.setFont('helvetica', 'normal');
    doc.text(project.type, 44, 112);

    doc.setFont('helvetica', 'bold');
    doc.text("Status no Órgão: ", 110, 112);
    doc.setFont('helvetica', 'normal');
    doc.text(project.status, 137, 112);

    // Checklist Section
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text("CONFORMIDADE TÉCNICA EM VISTORIA IN LOCO", 14, 121);

    const checklistItems = [
      { key: 'plantas_arquitetonicas', label: 'Plantas Arquitetônicas Simplificadas' },
      { key: 'extintores', label: 'Sinalização e Extintores de Incêndio (CBM-RS)' },
      { key: 'sinalizacao', label: 'Sinalização de Rota de Fuga e Saídas' },
      { key: 'iluminacao_emergencia', label: 'Iluminação de Emergência de Balizamento' },
      { key: 'central_glp', label: 'Central de Gás Liquefeito de Petróleo (GLP)' },
      { key: 'saidas_emergencia', label: 'Saídas de Emergência e Desobstrução' },
    ];

    let yPos = 127;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);

    checklistItems.forEach(item => {
      const isCompliant = project.checklist[item.key as keyof typeof project.checklist];
      
      doc.setFillColor(244, 244, 245); // Zinc-100 banner
      doc.rect(14, yPos - 4, 182, 7, 'F');

      doc.setTextColor(0, 0, 0);
      doc.text(item.label, 18, yPos + 1);

      if (isCompliant) {
        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'bold');
        doc.text("[ CONFORME ]", 162, yPos + 1);
      } else {
        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'bold');
        doc.text("[ PENDENTE / REPROVADO ]", 146, yPos + 1);
      }
      
      doc.setFont('helvetica', 'normal');
      yPos += 9;
    });

    doc.setDrawColor(228, 228, 231);
    doc.line(14, yPos, 196, yPos);
    yPos += 7;

    // Notes
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text("PARECER E OBSERVAÇÕES TÉCNICAS ADICIONAIS", 14, yPos);
    yPos += 6;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);

    const notesText = project.notes || "O imóvel passou por vistoria prévia e não foram registradas não conformidades críticas adicionais. O projeto segue as diretrizes vigentes do Corpo de Bombeiros Militar do Estado.";
    
    const wrappedNotes = doc.splitTextToSize(notesText, 182);
    wrappedNotes.forEach((line: string) => {
      if (yPos > 260) {
        doc.addPage();
        yPos = 20;
      }
      doc.text(line, 14, yPos);
      yPos += 5;
    });

    yPos += 15;
    if (yPos > 245) {
      doc.addPage();
      yPos = 30;
    }

    // Signatures
    doc.setDrawColor(161, 161, 170);
    doc.line(14, yPos, 90, yPos);
    doc.line(120, yPos, 196, yPos);

    yPos += 5;
    doc.setFontSize(8);
    doc.setTextColor(0, 0, 0);
    doc.text("RESPONSÁVEL TÉCNICO", 14, yPos);
    doc.text(`${companyName.toUpperCase()} - ENGENHARIA E CONFORMIDADE`, 14, yPos + 4);
    doc.text(`LAUDO EMITIDO VIA REGISTRO INTEGRADO • Direitos Reservados Alessandro M. Zandoná • APP em desenvolvimento`, 14, yPos + 8);

    doc.text("REPRESENTANTE LEGAL DO CLIENTE", 120, yPos);
    doc.text(project.clientName.toUpperCase(), 120, yPos + 4);
    doc.text("CIÊNCIA DA VISTORIA / ASSINATURA", 120, yPos + 8);

    doc.save(`laudo_tecnico_ppci_${project.clientName.toLowerCase().replace(/\s+/g, '_')}.pdf`);
  };

  const generateProposalPDF = (project: Project, budget: ProjectBudget) => {
    if (!project || !budget) return;
    const doc = new jsPDF();
    
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
        // Draw the uploaded logo centered at the top (without red box/border)
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
    doc.text(`PROPOSTA TÉCNICA E COMERCIAL – Nº ${budget.proposalNumber}`, 105, 51, { align: 'center' });

    // 3. CONTRATADO Section
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(185, 28, 28); // Red-700
    doc.text("CONTRATADO:", 14, 59);

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

    // 4. CONTRATANTE Section
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(185, 28, 28); // Red-700
    doc.text("CONTRATANTE:", 14, 89);

    doc.setDrawColor(0, 0, 0); // Black border
    doc.rect(14, 90, 182, 24);

    const clientRecord = data.clients?.find(c => 
      c.id === project.clientId || 
      c.name.toLowerCase() === project.clientName.toLowerCase()
    );
    const clientDoc = clientRecord?.document || '11.264.047/0001-89';
    const clientCEP = clientRecord?.cep || '95520-000';
    const clientPhone = clientRecord?.phone || '';
    const clientEmail = clientRecord?.email || '';
    const clientAddress = project.address || clientRecord?.address || 'Rua 15 de novembro 519 centro Osório';
    const formattedDate = new Date(budget.date + 'T12:00:00').toLocaleDateString('pt-BR');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(0, 0, 0);

    // Line 1
    doc.text("Cliente: ", 17, 95);
    doc.setFont('helvetica', 'normal');
    doc.text(project.clientName, 29, 95);

    doc.setFont('helvetica', 'bold');
    doc.text("CEP: ", 110, 95);
    doc.setFont('helvetica', 'normal');
    doc.text(clientCEP, 120, 95);

    // Line 2
    doc.setFont('helvetica', 'bold');
    doc.text("CPF/CNPJ: ", 17, 101);
    doc.setFont('helvetica', 'normal');
    doc.text(clientDoc, 36, 101);

    doc.setFont('helvetica', 'bold');
    doc.text("Data: ", 110, 101);
    doc.setFont('helvetica', 'normal');
    doc.text(formattedDate, 120, 101);

    // Line 3
    doc.setFont('helvetica', 'bold');
    doc.text("Endereço da obra/serviço: ", 17, 107);
    doc.setFont('helvetica', 'normal');
    const displayClientAddress = clientAddress.length > 50 ? clientAddress.substring(0, 50) + "..." : clientAddress;
    doc.text(displayClientAddress, 59, 107);

    doc.setFont('helvetica', 'bold');
    doc.text("Telefone: ", 110, 107);
    doc.setFont('helvetica', 'normal');
    doc.text(clientPhone || "---", 126, 107);

    // Line 4
    if (clientEmail) {
      doc.setFont('helvetica', 'bold');
      doc.text("E-mail: ", 110, 112);
      doc.setFont('helvetica', 'normal');
      doc.text(clientEmail, 123, 112);
    }

    // 5. SERVICES TABLE WITH SHARP GRID LINES
    let yPos = 124;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text("1. DESCRIÇÃO DOS SERVIÇOS", 14, yPos);
    yPos += 5;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    doc.text("1.1 Serviços Técnicos", 14, yPos);
    yPos += 4;

    const tableStartY = yPos;
    
    // Draw table header fill
    doc.setFillColor(241, 156, 121); // Peach-orange
    doc.rect(14, tableStartY, 182, 7, 'F');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(0, 0, 0);
    doc.text("Serviço", 17, tableStartY + 4.5);
    doc.text("Quantidade", 109, tableStartY + 4.5, { align: 'center' });
    doc.text("Un.", 126, tableStartY + 4.5, { align: 'center' });
    doc.text("Valor unitário (R$)", 147, tableStartY + 4.5, { align: 'center' });
    doc.text("Subtotal (R$)", 179, tableStartY + 4.5, { align: 'center' });

    yPos += 7;

    // Draw Items
    let totalSum = 0;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);

    budget.items.forEach(item => {
      const subtotal = item.quantity * item.unitPrice;
      totalSum += subtotal;

      const wrappedDesc = doc.splitTextToSize(item.description, 80);
      doc.text(wrappedDesc[0], 17, yPos + 4.5);

      doc.text(item.quantity.toString(), 109, yPos + 4.5, { align: 'center' });
      doc.text(item.unit || "Un.", 126, yPos + 4.5, { align: 'center' });
      doc.text(item.unitPrice.toFixed(2).replace('.', ','), 147, yPos + 4.5, { align: 'center' });
      doc.text(subtotal.toFixed(2).replace('.', ','), 179, yPos + 4.5, { align: 'center' });

      yPos += 6;
    });

    // Draw all grid borders for the table!
    doc.setDrawColor(0, 0, 0);
    doc.setLineWidth(0.25);
    // Horizontal lines
    let tempY = tableStartY;
    doc.line(14, tempY, 196, tempY); // Top boundary
    tempY += 7; // Header divider
    doc.line(14, tempY, 196, tempY);
    budget.items.forEach(() => {
      tempY += 6;
      doc.line(14, tempY, 196, tempY);
    });

    // Vertical columns lines
    doc.line(14, tableStartY, 14, tempY); // Left boundary
    doc.line(98, tableStartY, 98, tempY); // Col 1
    doc.line(120, tableStartY, 120, tempY); // Col 2
    doc.line(132, tableStartY, 132, tempY); // Col 3
    doc.line(162, tableStartY, 162, tempY); // Col 4
    doc.line(196, tableStartY, 196, tempY); // Right boundary

    // Valor Total row in grey!
    doc.setFillColor(228, 228, 231); // Zinc-200
    doc.rect(132, tempY, 64, 7, 'F');
    doc.rect(132, tempY, 64, 7, 'D');
    doc.line(162, tempY, 162, tempY + 7); // Divider

    doc.setFont('helvetica', 'bold');
    doc.text("Valor total:", 147, tempY + 4.8, { align: 'center' });
    doc.text(`R$ ${totalSum.toFixed(2).replace('.', ',')}`, 179, tempY + 4.8, { align: 'center' });

    yPos = tempY + 14;

    // 2. PRAZO DE ENTREGA
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text("2. PRAZO DE ENTREGA", 14, yPos);
    yPos += 5;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(0, 0, 0);
    doc.text(budget.deliveryTime || "Prazo estimado de 14 dias úteis após aprovação e recolhimento dos extintores.", 14, yPos);

    yPos += 11;

    // 3. OBSERVAÇÕES
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text("3. OBSERVAÇÕES", 14, yPos);
    yPos += 5;

    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7.5);
    doc.setTextColor(0, 0, 0);

    const obsText = budget.observations || "";
    const obsLines = obsText.split('\n');
    obsLines.forEach(line => {
      const wrappedLine = doc.splitTextToSize(line.trim(), 182);
      wrappedLine.forEach((subLine: string) => {
        if (yPos > 265) {
          doc.addPage();
          yPos = 20;
        }
        doc.text(subLine, 14, yPos);
        yPos += 4;
      });
      yPos += 1;
    });

    yPos += 8;
    if (yPos > 250) {
      doc.addPage();
      yPos = 25;
    }

    // Signatures
    doc.setDrawColor(161, 161, 170);
    doc.line(14, yPos, 90, yPos);
    doc.line(120, yPos, 196, yPos);

    yPos += 4;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(185, 28, 28); // Red-700
    doc.text("CONTRATANTE", 14, yPos);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0); // Black
    doc.text(project.clientName.toUpperCase(), 14, yPos + 4);

    doc.setFont('helvetica', 'bold');
    doc.setTextColor(185, 28, 28); // Red-700
    doc.text("CONTRATADO", 120, yPos);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0); // Black
    doc.text(companyName.toUpperCase(), 120, yPos + 4);
    doc.text("ENGENHARIA DE SEGURANÇA CONTRA INCÊNDIO", 120, yPos + 8);

    // Bottom contacts bar
    const pageHeight = doc.internal.pageSize.height;
    doc.setDrawColor(228, 228, 231);
    doc.line(14, pageHeight - 20, 196, pageHeight - 20);
    
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(7);
    doc.setTextColor(0, 0, 0);
    doc.text("Documento confidencial. Uso exclusivo do contratante. Reprodução ou compartilhamento não autorizado sujeita às medidas cabíveis.", 105, pageHeight - 16, { align: 'center' });
    
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(0, 0, 0);
    doc.text(`${companyPhone}    |    ${companyEmail}    |    ${companyAddress}`, 105, pageHeight - 11, { align: 'center' });

    doc.save(`proposta_comercial_${budget.proposalNumber.replace('/', '_')}_${project.clientName.toLowerCase().replace(/\s+/g, '_')}.pdf`);
  };

  // General Projects PDF List Report Generator
  const generateGeneralProjectsReport = () => {
    const doc = new jsPDF();
    
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
    doc.text("RELATÓRIO DE BALANÇO E PORTFÓLIO DE PROJETOS PPCI", 105, 51, { align: 'center' });

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

    // 4. METADADOS DO RELATÓRIO Section
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(185, 28, 28); // Red-700
    doc.text("DADOS DE EMISSÃO DO RELATÓRIO:", 14, 89);

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
    doc.text("Portfólio Geral e Balanço de Projetos PPCI", 31, 95);

    doc.setFont('helvetica', 'bold');
    doc.text("Data: ", 110, 95);
    doc.setFont('helvetica', 'normal');
    doc.text(formattedDate, 120, 95);

    // Line 2
    doc.setFont('helvetica', 'bold');
    doc.text("Solicitante: ", 17, 101);
    doc.setFont('helvetica', 'normal');
    doc.text(companyName, 33, 101);

    doc.setFont('helvetica', 'bold');
    doc.text("Hora: ", 110, 101);
    doc.setFont('helvetica', 'normal');
    doc.text(formattedTime, 120, 101);

    // Line 3
    doc.setFont('helvetica', 'bold');
    doc.text("Ativos / Contratos: ", 17, 107);
    doc.setFont('helvetica', 'normal');
    doc.text(`${data.projects.length} Projetos`, 42, 107);

    doc.setFont('helvetica', 'bold');
    doc.text("Status: ", 110, 107);
    doc.setFont('helvetica', 'normal');
    doc.text("Homologado / Oficial", 121, 107);

    // Line 4
    doc.setFont('helvetica', 'bold');
    doc.text("Ambiente: ", 17, 112);
    doc.setFont('helvetica', 'normal');
    doc.text("Painel de Gestão e Segurança", 32, 112);

    let yPos = 124;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text("LISTAGEM DE CONTRATOS E PROPOSTAS ATIVAS", 14, yPos);
    yPos += 8;

    // Table Header Band
    doc.setFillColor(244, 244, 245);
    doc.rect(14, yPos - 4, 182, 8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(0, 0, 0);
    doc.text("ID", 16, yPos + 1);
    doc.text("CLIENTE / EDIFICAÇÃO", 28, yPos + 1);
    doc.text("TIPO", 85, yPos + 1);
    doc.text("STATUS", 125, yPos + 1);
    doc.text("VALOR TOTAL", 160, yPos + 1);

    yPos += 8;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(0, 0, 0);
    
    let totalValue = 0;
    let approvedCount = 0;
    let pendingCount = 0;

    data.projects.forEach(p => {
      if (yPos > 270) {
        doc.addPage();
        yPos = 20;
      }

      totalValue += p.value || 0;
      if (p.status === 'Aprovado') approvedCount++;
      else pendingCount++;

      doc.text(p.id, 16, yPos);
      doc.text(p.clientName.substring(0, 24), 28, yPos);
      doc.text(p.type || 'Comercial', 85, yPos);
      doc.text(p.status, 125, yPos);
      doc.text(`R$ ${(p.value || 0).toFixed(2).replace('.', ',')}`, 160, yPos);
      
      doc.setDrawColor(244, 244, 245);
      doc.line(14, yPos + 2, 196, yPos + 2);
      yPos += 8;
    });

    yPos += 6;
    if (yPos > 255) {
      doc.addPage();
      yPos = 20;
    }

    // Summary panel
    doc.setFillColor(250, 250, 250);
    doc.rect(14, yPos, 182, 25, 'F');
    doc.setDrawColor(228, 228, 231);
    doc.rect(14, yPos, 182, 25, 'S');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    doc.text("MÉTRICAS TÉCNICAS E PORTFÓLIO", 18, yPos + 6);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(0, 0, 0);
    doc.text(`Quantidade total: ${data.projects.length}`, 18, yPos + 12);
    doc.text(`Aprovados & Faturados: ${approvedCount}`, 18, yPos + 17);
    doc.text(`Em negociação / Orçamentos: ${pendingCount}`, 85, yPos + 12);
    
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(0, 0, 0);
    doc.text(`Volume Financeiro Projetado: R$ ${totalValue.toFixed(2).replace('.', ',')}`, 85, yPos + 17);

    // App development footer
    yPos += 30;
    if (yPos > 270) {
      doc.addPage();
      yPos = 20;
    }
    doc.setDrawColor(228, 228, 231);
    doc.line(14, yPos, 196, yPos);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(0, 0, 0);
    doc.text(`© ${companyName} • Direitos Reservados`, 14, yPos + 5);
    doc.text("APP em desenvolvimento", 14, yPos + 9);

    doc.save("balanco_geral_projetos.pdf");
  };

  // Submission handler for approving project and generating financials
  const handleConfirmApproval = () => {
    if (!projectToApprove) return;
    const finalVal = approvalValue || projectToApprove.value || 0;
    
    const transactionsToAdd: FinancialTransaction[] = [];
    
    if (selectedApprovalMethod === 'À vista com desconto') {
      const disc = projectToApprove.discountPercentage || 5;
      const finalAmt = finalVal * (1 - disc / 100);
      transactionsToAdd.push({
        id: `tx-app-${Date.now()}-0`,
        projectId: projectToApprove.id,
        projectName: `Projeto PPCI - ${projectToApprove.clientName}`,
        clientName: projectToApprove.clientName,
        type: 'receita',
        description: `Faturamento À Vista (PPCI): ${projectToApprove.clientName} (Desconto de ${disc}%)`,
        amount: finalAmt,
        category: 'Projetos PPCI',
        paymentMethod: 'Pix',
        status: paymentStatus,
        date: new Date().toISOString().split('T')[0],
      });
    } else if (selectedApprovalMethod === '50% Entrada + 50%') {
      const half = finalVal / 2;
      // Parcela 1 (Entrada)
      transactionsToAdd.push({
        id: `tx-app-${Date.now()}-1`,
        projectId: projectToApprove.id,
        projectName: `Projeto PPCI - ${projectToApprove.clientName}`,
        clientName: projectToApprove.clientName,
        type: 'receita',
        description: `Entrada (50%): Projeto PPCI - ${projectToApprove.clientName}`,
        amount: half,
        category: 'Projetos PPCI',
        paymentMethod: 'Pix',
        status: paymentStatus,
        date: new Date().toISOString().split('T')[0],
      });
      // Parcela 2 (30 dias)
      const nextMonth = new Date();
      nextMonth.setDate(nextMonth.getDate() + 30);
      transactionsToAdd.push({
        id: `tx-app-${Date.now()}-2`,
        projectId: projectToApprove.id,
        projectName: `Projeto PPCI - ${projectToApprove.clientName}`,
        clientName: projectToApprove.clientName,
        type: 'receita',
        description: `Parcela Final (50%): Projeto PPCI - ${projectToApprove.clientName}`,
        amount: half,
        category: 'Projetos PPCI',
        paymentMethod: 'Boleto',
        status: 'pendente',
        date: new Date().toISOString().split('T')[0],
        dueDate: nextMonth.toISOString().split('T')[0],
      });
    } else if (selectedApprovalMethod === 'Até 3x no Boleto') {
      const installment = finalVal / 3;
      for (let i = 1; i <= 3; i++) {
        const dueDate = new Date();
        dueDate.setDate(dueDate.getDate() + (i - 1) * 30);
        transactionsToAdd.push({
          id: `tx-app-${Date.now()}-${i}`,
          projectId: projectToApprove.id,
          projectName: `Projeto PPCI - ${projectToApprove.clientName}`,
          clientName: projectToApprove.clientName,
          type: 'receita',
          description: `Parcela Boleto ${i}/3: PPCI - ${projectToApprove.clientName}`,
          amount: installment,
          category: 'Projetos PPCI',
          paymentMethod: 'Boleto',
          status: i === 1 ? paymentStatus : 'pendente',
          date: new Date().toISOString().split('T')[0],
          dueDate: dueDate.toISOString().split('T')[0],
        });
      }
    } else if (selectedApprovalMethod === 'Até 12x Cartão de Crédito + Juros') {
      const interest = projectToApprove.interestPercentage || 12;
      const finalAmt = finalVal * (1 + interest / 100);
      transactionsToAdd.push({
        id: `tx-app-${Date.now()}-0`,
        projectId: projectToApprove.id,
        projectName: `Projeto PPCI - ${projectToApprove.clientName}`,
        clientName: projectToApprove.clientName,
        type: 'receita',
        description: `Faturamento Cartão (12x): PPCI - ${projectToApprove.clientName} (+Juros)`,
        amount: finalAmt,
        category: 'Projetos PPCI',
        paymentMethod: 'Cartão de Crédito',
        status: 'recebido',
        date: new Date().toISOString().split('T')[0],
      });
    } else {
      // Outros/Default
      transactionsToAdd.push({
        id: `tx-app-${Date.now()}-0`,
        projectId: projectToApprove.id,
        projectName: `Projeto PPCI - ${projectToApprove.clientName}`,
        clientName: projectToApprove.clientName,
        type: 'receita',
        description: `Faturamento Integral: PPCI - ${projectToApprove.clientName}`,
        amount: finalVal,
        category: 'Projetos PPCI',
        paymentMethod: selectedApprovalMethod,
        status: paymentStatus,
        date: new Date().toISOString().split('T')[0],
      });
    }

    const updatedProjects = data.projects.map(p => {
      if (p.id === projectToApprove.id) {
        return { ...p, status: 'Aprovado' as const, value: finalVal };
      }
      return p;
    });

    const existingTransactions = data.financialTransactions || [];

    updateData({
      projects: updatedProjects,
      financialTransactions: [...transactionsToAdd, ...existingTransactions],
    });

    setShowApprovalModal(false);
    setProjectToApprove(null);
  };

  const togglePaymentMethod = (projectId: string, method: string) => {
    const updated = data.projects.map(p => {
      if (p.id === projectId) {
        const methods = p.paymentMethods || [];
        const newMethods = methods.includes(method) ? methods.filter(m => m !== method) : [...methods, method];
        return { ...p, paymentMethods: newMethods };
      }
      return p;
    });
    updateData({ projects: updated });
  };

  const getStatusBadge = (status: string) => {
    switch(status) {
      case 'Orçamento': return 'bg-blue-500/10 text-blue-500 border border-blue-500/20';
      case 'Aprovado': return 'bg-emerald-500/10 text-emerald-500 border border-emerald-500/20';
      case 'Reprovado': return 'bg-red-500/10 text-red-500 border border-red-500/20';
      case 'Levantamento': return 'bg-amber-500/10 text-amber-500 border border-amber-500/20';
      case 'Elaboração': return 'bg-purple-500/10 text-purple-500 border border-purple-500/20';
      case 'Protocolado': return 'bg-sky-500/10 text-sky-500 border border-sky-500/20';
      case 'Protocolo': return 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20';
      case 'Concluído': return 'bg-teal-500/10 text-teal-500 border border-teal-500/20';
      default: return 'bg-zinc-800 text-zinc-300 border border-zinc-700';
    }
  };

  const renderSimulation = (project: Project, compact = false) => {
    if (!project.value || (!project.paymentMethods || project.paymentMethods.length === 0)) return null;
    const value = project.value;

    if (compact) {
      return (
        <div className="mt-3 pt-3 border-t border-zinc-800/60 w-full">
          <div className="flex items-center gap-1.5 mb-2">
            <Calculator className="w-3.5 h-3.5 text-red-500"/>
            <span className="text-[11px] font-semibold text-white uppercase tracking-wider">Simulação de Valores</span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {project.paymentMethods.includes('À vista com desconto') && (
              <div className="bg-zinc-950/60 p-2 rounded border border-zinc-800/80">
                <div className="text-[10px] text-zinc-400 mb-0.5">À vista (-{project.discountPercentage || 0}%)</div>
                <div className="text-sm font-semibold text-emerald-500">R$ {(value * (1 - (project.discountPercentage || 0)/100)).toFixed(2).replace('.', ',')}</div>
              </div>
            )}
            {project.paymentMethods.includes('50% Entrada + 50%') && (
              <div className="bg-zinc-950/60 p-2 rounded border border-zinc-800/80">
                <div className="text-[10px] text-zinc-400 mb-0.5">50% + 50%</div>
                <div className="text-sm font-semibold text-zinc-200">2x R$ {(value / 2).toFixed(2).replace('.', ',')}</div>
              </div>
            )}
            {project.paymentMethods.includes('Até 12x Cartão de Crédito + Juros') && (
              <div className="bg-zinc-950/60 p-2 rounded border border-zinc-800/80 col-span-2 md:col-span-1">
                <div className="text-[10px] text-zinc-400 mb-0.5">12x Cartão (+{project.interestPercentage || 0}%)</div>
                <div className="text-sm font-semibold text-zinc-200">
                  12x R$ {((value * (1 + (project.interestPercentage || 0)/100)) / 12).toFixed(2).replace('.', ',')}
                </div>
              </div>
            )}
            {project.paymentMethods.includes('Até 3x no Boleto') && (
              <div className="bg-zinc-950/60 p-2 rounded border border-zinc-800/80 col-span-2 md:col-span-1">
                <div className="text-[10px] text-zinc-400 mb-0.5">Até 3x no Boleto</div>
                <div className="text-sm font-semibold text-zinc-200">3x R$ {(value / 3).toFixed(2).replace('.', ',')}</div>
              </div>
            )}
          </div>
        </div>
      );
    }

    return (
      <div className="mt-6 bg-zinc-900 border border-zinc-800 rounded-lg p-4">
        <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
          <Calculator className="w-4 h-4 text-zinc-400"/>
          Simulação de Valores
        </h3>
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {project.paymentMethods.includes('À vista com desconto') && (
            <div className="bg-zinc-950 p-3 rounded border border-zinc-800">
              <div className="text-xs text-zinc-400 mb-1">À vista (Desconto de {project.discountPercentage || 0}%)</div>
              <div className="text-lg font-semibold text-emerald-500">R$ {(value * (1 - (project.discountPercentage || 0)/100)).toFixed(2).replace('.', ',')}</div>
            </div>
          )}
          {project.paymentMethods.includes('50% Entrada + 50%') && (
            <div className="bg-zinc-950 p-3 rounded border border-zinc-800">
              <div className="text-xs text-zinc-400 mb-1">50% Entrada + 50%</div>
              <div className="text-lg font-semibold text-zinc-200">2x de R$ {(value / 2).toFixed(2).replace('.', ',')}</div>
              <div className="text-xs text-zinc-500 mt-1">Total: R$ {value.toFixed(2).replace('.', ',')}</div>
            </div>
          )}
          {project.paymentMethods.includes('Até 12x Cartão de Crédito + Juros') && (
            <div className="bg-zinc-950 p-3 rounded border border-zinc-800">
              <div className="text-xs text-zinc-400 mb-1">Até 12x Cartão (+ {project.interestPercentage || 0}% juros)</div>
              <div className="text-lg font-semibold text-zinc-200">
                12x de R$ {((value * (1 + (project.interestPercentage || 0)/100)) / 12).toFixed(2).replace('.', ',')}
              </div>
              <div className="text-xs text-zinc-500 mt-1">Total: R$ {(value * (1 + (project.interestPercentage || 0)/100)).toFixed(2).replace('.', ',')}</div>
            </div>
          )}
          {project.paymentMethods.includes('Até 3x no Boleto') && (
            <div className="bg-zinc-950 p-3 rounded border border-zinc-800">
              <div className="text-xs text-zinc-400 mb-1">Até 3x no Boleto</div>
              <div className="text-lg font-semibold text-zinc-200">3x de R$ {(value / 3).toFixed(2).replace('.', ',')}</div>
              <div className="text-xs text-zinc-500 mt-1">Total: R$ {value.toFixed(2).replace('.', ',')}</div>
            </div>
          )}
        </div>
      </div>
    );
  };

  return (
    <div className="p-8 h-full flex flex-col overflow-hidden">
      {!selectedProject && (
        <div className="flex justify-between items-center mb-8 animate-in fade-in slide-in-from-top-4 duration-200">
          <div>
            <h1 className="text-2xl font-semibold text-white">Projetos PPCI</h1>
            <p className="text-zinc-400">Gerenciamento de memoriais, checklists in loco e conformidade.</p>
          </div>
          <div className="flex gap-3">
            <button 
              onClick={generateGeneralProjectsReport}
              className="flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 px-4 py-2 rounded-md text-sm font-medium transition-colors"
            >
              <Download className="w-4 h-4 text-zinc-400" />
              Balanço Geral (PDF)
            </button>
            <button 
              onClick={() => setShowAddForm(true)}
              className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
            >
              <Plus className="w-4 h-4" />
              Novo Projeto
            </button>
          </div>
        </div>
      )}

      <div className="flex flex-1 gap-6 min-h-0 relative">
        {/* Projects List */}
        {!selectedProject && (
          <div className="w-1/3 bg-zinc-950 rounded-xl border border-zinc-900 overflow-y-auto shadow-sm animate-in fade-in slide-in-from-left-4 duration-200">
            {data.projects.map((project) => (
              <button
                key={project.id}
                onClick={() => setSelectedProject(project.id)}
                className={`w-full text-left p-4 border-b border-zinc-900 transition-colors ${
                  selectedProject === project.id ? 'bg-zinc-900 border-l-4 border-l-red-600' : 'hover:bg-zinc-900'
                }`}
              >
                <div className="flex justify-between items-start mb-1">
                  <span className="font-semibold text-white">{project.clientName}</span>
                  <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full ${getStatusBadge(project.status)}`}>
                    {project.status}
                  </span>
                </div>
                <div className="text-xs text-zinc-500 flex items-center gap-1 mb-2">
                  <MapPin className="w-3 h-3" /> {project.address}
                </div>
              </button>
            ))}
          </div>
        )}

        {/* Project Details */}
        <div className={`flex-1 bg-zinc-950 rounded-xl border border-zinc-900 overflow-y-auto shadow-sm p-6 relative ${selectedProject ? 'w-full h-full' : ''}`}>
          {activeProject ? (
            <div className="animate-in fade-in zoom-in-95 duration-200">
              <div className="flex justify-between items-start border-b border-zinc-900 pb-4 mb-6">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2">
                    <h2 className="text-xl font-bold text-white">{activeProject.clientName}</h2>
                    <select
                      value={activeProject.status}
                      onChange={(e) => {
                        const nextStatus = e.target.value;
                        if (nextStatus === 'Aprovado') {
                          // Intercept to launch finance modal!
                          setProjectToApprove(activeProject);
                          
                          // Fetch value from the approved proposal, or the first proposal
                          const approvedBudget = activeProject.budgets?.find(b => b.status === 'Aprovado') || activeProject.budgets?.[0];
                          const proposalVal = approvedBudget 
                            ? approvedBudget.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0)
                            : 0;
                          
                          const finalVal = proposalVal > 0 ? proposalVal : (activeProject.value || 0);
                          
                          // Sync service value to project state if fetched from proposal
                          if (proposalVal > 0 && proposalVal !== activeProject.value) {
                            updateProjectField(activeProject.id, 'value', proposalVal);
                          }
                          
                          setApprovalValue(finalVal);
                          setSelectedApprovalMethod(activeProject.paymentMethods?.[0] || 'À vista com desconto');
                          setPaymentStatus('recebido');
                          setShowApprovalModal(true);
                        } else {
                          const updatedProjects = data.projects.map(p => p.id === activeProject.id ? { ...p, status: nextStatus as any } : p);
                          if (nextStatus === 'Concluído') {
                            const projectBudgets = activeProject.budgets || [];
                            const eligibleBudgets = projectBudgets.filter(b => b.status === 'Aprovado' || b.status === 'Concluído');
                            if (eligibleBudgets.length > 0) {
                              let updatedClients = [...(data.clients || [])];
                              eligibleBudgets.forEach(b => {
                                updatedClients = syncExtinguishersFromBudget(activeProject, b, updatedClients);
                              });
                              updateData({ projects: updatedProjects, clients: updatedClients });
                            } else {
                              updateData({ projects: updatedProjects });
                            }
                          } else {
                            updateData({ projects: updatedProjects });
                          }
                        }
                      }}
                      className={`text-xs font-semibold px-2 py-1 flex items-center justify-center rounded focus:outline-none focus:ring-1 focus:ring-red-600 uppercase ${getStatusBadge(activeProject.status)} appearance-none cursor-pointer`}
                    >
                      <option value="Orçamento">Orçamento</option>
                      <option value="Aprovado">Aprovado (Financeiro)</option>
                      <option value="Reprovado">Reprovado</option>
                      <option value="Levantamento">Levantamento</option>
                      <option value="Elaboração">Elaboração</option>
                      <option value="Protocolado">Protocolado</option>
                      <option value="Concluído">Concluído</option>
                    </select>
                  </div>
                  <p className="text-sm text-zinc-400">{activeProject.type} • Vistoriado em {activeProject.lastVisit}</p>
                </div>
                <div className="flex items-center gap-3 ml-4">
                  <button 
                    onClick={() => generateReport(activeProject)}
                    className="flex items-center gap-2 bg-zinc-900 border border-zinc-800 hover:bg-zinc-850 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
                  >
                    <FileCheck className="w-4 h-4 text-red-500" />
                    Gerar Laudo PDF
                  </button>
                  {selectedProject && (
                    <button
                      onClick={() => setSelectedProject(null)}
                      className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-semibold transition-all shadow-md"
                    >
                      <ArrowLeft className="w-4 h-4" />
                      <span>Voltar</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Budgets & Technical Proposals Section */}
              <div className="mt-4 mb-8">
                <div className="flex justify-between items-center mb-4">
                  <div>
                    <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                      <Receipt className="w-4 h-4 text-red-500"/>
                      Orçamentos e Propostas Técnicas
                    </h3>
                    <p className="text-xs text-zinc-500 mt-0.5">Gerencie propostas e gere orçamentos em PDF com a identidade {data.companyName || "Alessandro M. Zandoná"}.</p>
                  </div>
                  <button
                    onClick={() => {
                      const year = new Date().getFullYear();
                      const proposalNum = `${(activeProject.budgets?.length || 0) + 117}/${year}`;
                      setEditingBudget({
                        id: `b-${Date.now()}`,
                        proposalNumber: proposalNum,
                        date: new Date().toISOString().split('T')[0],
                        deliveryTime: "Prazo estimado de 14 dias úteis após aprovação e recolhimento dos extintores.",
                        observations: `1. Os extintores submetidos a manutenção, serão substituídos, temporariamente, por extintores reserva com as mesmas características de peso, agente extintor e capacidade extintora estabelecidos no CLCB/PSPCI/PPCI, garantindo a segurança da edificação durante o período de manutenção;\n2. Em caso de utilização em situação de emergência, bem como de rompimento, avaria ou dano de qualquer natureza ao extintor reserva disponibilizado durante o período de manutenção, será de responsabilidade do contratante o custeio da recarga e/ou da substituição das peças eventualmente danificadas, conforme apuração técnica;\n3. Caso seja constatada, durante a desmontagem para manutenção, a necessidade de substituição de qualquer peça danificada, o proprietário será previamente notificado, sendo o respectivo valor acrescido ao orçamento.`,
                        items: [],
                        status: 'Pendente'
                      });
                      setShowBudgetModal(true);
                    }}
                    className="flex items-center gap-1.5 bg-red-600 hover:bg-red-700 text-white text-xs font-semibold px-3 py-1.5 rounded transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    Novo Orçamento
                  </button>
                </div>

                {(!activeProject.budgets || activeProject.budgets.length === 0) ? (
                  <div className="bg-zinc-900/40 border border-zinc-800/80 rounded-lg p-6 text-center text-zinc-500 text-sm">
                    Nenhum orçamento gerado para este projeto ainda. Clique em "Novo Orçamento" para começar.
                  </div>
                ) : (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    {activeProject.budgets.map((budget) => {
                      const total = budget.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0);
                      return (
                        <div key={budget.id} className="bg-zinc-900 border border-zinc-800 rounded-lg p-4 flex flex-col justify-between">
                          <div>
                            <div className="flex justify-between items-start mb-2">
                              <div>
                                <span className="text-sm font-bold text-white block">Proposta #{budget.proposalNumber}</span>
                                <span className="text-xs text-zinc-500">{new Date(budget.date + 'T12:00:00').toLocaleDateString('pt-BR')}</span>
                              </div>
                              <select
                                value={budget.status}
                                onChange={(e) => {
                                  const nextStatus = e.target.value as 'Pendente' | 'Aprovado' | 'Recusado' | 'Concluído';
                                  const updatedBudget = { ...budget, status: nextStatus };
                                  
                                  // Update both the budget list and project fields in a single step to avoid state race conditions
                                  const updatedProjects = data.projects.map(p => {
                                    if (p.id === activeProject.id) {
                                      const existingBudgets = p.budgets || [];
                                      const index = existingBudgets.findIndex(b => b.id === budget.id);
                                      const nextBudgets = [...existingBudgets];
                                      if (index >= 0) {
                                        nextBudgets[index] = updatedBudget;
                                      } else {
                                        nextBudgets.push(updatedBudget);
                                      }
                                      
                                      if ((nextStatus === 'Aprovado' || nextStatus === 'Concluído') && total > 0) {
                                        return { ...p, budgets: nextBudgets, value: total };
                                      }
                                      return { ...p, budgets: nextBudgets };
                                    }
                                    return p;
                                  });

                                  if (nextStatus === 'Concluído') {
                                    const updatedClients = syncExtinguishersFromBudget(activeProject, updatedBudget, data.clients || []);
                                    updateData({ projects: updatedProjects, clients: updatedClients });
                                  } else {
                                    updateData({ projects: updatedProjects });
                                  }
                                  
                                  // If approved or completed, automatically open financial approval with correct parameters
                                  if ((nextStatus === 'Aprovado' || nextStatus === 'Concluído') && total > 0) {
                                    setProjectToApprove({ ...activeProject, value: total }); // Ensure activeProject has updated value immediately for modal
                                    setApprovalValue(total);
                                    setSelectedApprovalMethod(activeProject.paymentMethods?.[0] || 'À vista com desconto');
                                    setPaymentStatus('recebido');
                                    setShowApprovalModal(true);
                                  }
                                }}
                                className={`text-[10px] font-bold px-2 py-0.5 rounded border ${
                                  budget.status === 'Aprovado'
                                    ? 'bg-emerald-500/10 text-emerald-500 border-emerald-500/20'
                                    : budget.status === 'Concluído'
                                    ? 'bg-teal-500/10 text-teal-500 border-teal-500/20'
                                    : budget.status === 'Recusado'
                                    ? 'bg-red-500/10 text-red-500 border-red-500/20'
                                    : 'bg-amber-500/10 text-amber-500 border-amber-500/20'
                                } uppercase cursor-pointer focus:outline-none`}
                              >
                                <option value="Pendente" className="bg-zinc-950 text-white">Pendente</option>
                                <option value="Aprovado" className="bg-zinc-950 text-white">Aprovada</option>
                                <option value="Recusado" className="bg-zinc-950 text-white">Recusada</option>
                                <option value="Concluído" className="bg-zinc-950 text-white">Concluída</option>
                              </select>
                            </div>
                            <div className="text-xs text-zinc-400 mt-2 space-y-1">
                              <p className="flex justify-between">
                                <span>Itens cadastrados:</span>
                                <span className="font-semibold text-white">{budget.items.length}</span>
                              </p>
                              <p className="flex justify-between text-zinc-300">
                                <span>Valor total da proposta:</span>
                                <span className="font-bold text-white">R$ {total.toFixed(2).replace('.', ',')}</span>
                              </p>
                            </div>
                          </div>

                          <div className="mt-4 pt-3 border-t border-zinc-800/60 flex items-center justify-between gap-2">
                            <button
                              onClick={() => {
                                setEditingBudget(budget);
                                setShowBudgetModal(true);
                              }}
                              className="text-[11px] text-zinc-400 hover:text-white flex items-center gap-1 hover:bg-zinc-800 px-2 py-1 rounded transition-colors"
                            >
                              <Edit className="w-3.5 h-3.5" />
                              Editar
                            </button>
                            <div className="flex gap-1.5">
                              <button
                                onClick={() => setBudgetToDelete({ projectId: activeProject.id, budgetId: budget.id })}
                                className="text-[11px] text-zinc-500 hover:text-red-500 flex items-center gap-1 hover:bg-red-500/10 px-2 py-1 rounded transition-colors"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                                Excluir
                              </button>
                              <button
                                onClick={() => generateProposalPDF(activeProject, budget)}
                                className="bg-red-600/10 hover:bg-red-600/20 text-red-500 text-[11px] font-semibold px-2.5 py-1 rounded flex items-center gap-1 transition-all"
                              >
                                <Printer className="w-3.5 h-3.5" />
                                Proposta PDF
                              </button>
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Service Value, Payment Methods & Steps Timeline Section */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 mb-6 pt-6 border-t border-zinc-900">
                {/* Column 1: Valor do Serviço & Formas de Pagamento */}
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4 flex flex-col gap-3 justify-between">
                  <div className="space-y-3">
                    <div>
                      <label className="block text-xs font-medium text-zinc-400 mb-1">Valor do Serviço (R$)</label>
                      <input
                        type="number"
                        value={activeProject.value || ''}
                        onChange={(e) => updateProjectField(activeProject.id, 'value', Number(e.target.value))}
                        placeholder="0.00"
                        className="w-full px-3 py-2 bg-zinc-950 border border-zinc-800 text-white rounded-md focus:outline-none focus:ring-1 focus:ring-red-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-zinc-400 mb-2">Formas de Pagamento (Selecione uma ou mais)</label>
                      <div className="grid grid-cols-2 gap-2">
                        {['À vista com desconto', '50% Entrada + 50%', 'Até 12x Cartão de Crédito + Juros', 'Até 3x no Boleto'].map(method => (
                           <label key={method} className="flex items-center gap-2 cursor-pointer">
                              <input 
                                 type="checkbox" 
                                 checked={(activeProject.paymentMethods || []).includes(method)} 
                                 onChange={() => togglePaymentMethod(activeProject.id, method)}
                                 className="w-4 h-4 rounded border-zinc-700 bg-zinc-950 text-red-600 focus:ring-red-600"
                              />
                              <span className="text-sm text-zinc-300">{method}</span>
                           </label>
                        ))}
                      </div>
                    </div>
                  </div>
                  
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-zinc-800/60 empty:hidden">
                    {(activeProject.paymentMethods || []).includes('À vista com desconto') && (
                      <div>
                        <label className="block text-xs font-medium text-zinc-400 mb-1">Desconto À vista (%)</label>
                        <input
                          type="number"
                          value={activeProject.discountPercentage || ''}
                          onChange={(e) => updateProjectField(activeProject.id, 'discountPercentage', Number(e.target.value))}
                          placeholder="Ex: 5"
                          className="w-full px-3 py-1.5 bg-zinc-950 border border-zinc-800 text-white rounded-md focus:outline-none focus:ring-1 focus:ring-red-500 text-xs"
                        />
                      </div>
                    )}
                    {(activeProject.paymentMethods || []).includes('Até 12x Cartão de Crédito + Juros') && (
                      <div>
                        <label className="block text-xs font-medium text-zinc-400 mb-1">Acréscimo Cartão (%)</label>
                        <input
                          type="number"
                          value={activeProject.interestPercentage || ''}
                          onChange={(e) => updateProjectField(activeProject.id, 'interestPercentage', Number(e.target.value))}
                          placeholder="Ex: 12.5"
                          className="w-full px-3 py-1.5 bg-zinc-950 border border-zinc-800 text-white rounded-md focus:outline-none focus:ring-1 focus:ring-red-500 text-xs"
                        />
                      </div>
                    )}
                  </div>

                  {renderSimulation(activeProject, true)}
                </div>

                {/* Column 2: Cronograma de Etapas do Projeto */}
                <div className="bg-zinc-900/50 border border-zinc-800 rounded-lg p-4 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center gap-2 mb-1">
                      <Calendar className="w-4 h-4 text-red-500" />
                      <h3 className="text-xs font-semibold text-white">
                        Cronograma de Etapas e Ações
                      </h3>
                    </div>
                    <p className="text-[10px] text-zinc-500 mb-3">
                      As datas selecionadas são sincronizadas automaticamente com o **Planner &amp; Agenda** do engenheiro.
                    </p>
                    <div className="overflow-hidden border border-zinc-800 rounded-md bg-zinc-950/20">
                      <table className="w-full text-left border-collapse">
                        <thead>
                          <tr className="border-b border-zinc-800 bg-zinc-950/60">
                            <th className="px-2 py-1 text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Ação</th>
                            <th className="px-2 py-1 text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Cor</th>
                            <th className="px-2 py-1 text-[10px] font-semibold text-zinc-400 uppercase tracking-wider">Data Programada</th>
                            <th className="px-2 py-1 text-[10px] font-semibold text-zinc-400 uppercase tracking-wider text-center">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-zinc-800/40">
                          {[
                            { key: 'vistoria', label: 'Vistoria', colorClass: 'bg-amber-500' },
                            { key: 'orcamento', label: 'Orçamento', colorClass: 'bg-sky-500' },
                            { key: 'aprovado', label: 'Aprovado', colorClass: 'bg-emerald-500' },
                            { key: 'protocolado_cbm', label: 'Protocolado CBM', colorClass: 'bg-indigo-500' },
                            { key: 'reprovada', label: 'Reprovada', colorClass: 'bg-rose-500' },
                            { key: 'entrega', label: 'Entrega', colorClass: 'bg-violet-500' },
                          ].map((action) => {
                            const actVal = (activeProject.actions || {})[action.key] || { date: '', checked: false };
                            const isProtocolRow = action.key === 'protocolado_cbm';
                            return (
                              <React.Fragment key={action.key}>
                                <tr className="hover:bg-zinc-900/10 transition-colors">
                                  <td className="px-2 py-1 text-xs font-medium text-zinc-300">
                                    {action.label}
                                  </td>
                                  <td className="px-2 py-1">
                                    <div className={`w-2 h-2 rounded-full ${action.colorClass}`} />
                                  </td>
                                  <td className="px-2 py-1">
                                    <input
                                      type="date"
                                      value={actVal.date || ''}
                                      onChange={(e) => updateProjectAction(activeProject.id, action.key, 'date', e.target.value)}
                                      className="px-1.5 py-0.5 bg-zinc-950 border border-zinc-800 text-white text-[10px] rounded focus:outline-none focus:ring-1 focus:ring-red-500 cursor-pointer"
                                    />
                                  </td>
                                  <td className="px-2 py-1 text-center">
                                    <div className="flex items-center justify-center">
                                      <input
                                        type="checkbox"
                                        checked={actVal.checked || false}
                                        onChange={(e) => updateProjectAction(activeProject.id, action.key, 'checked', e.target.checked)}
                                        className="w-3.5 h-3.5 rounded border-zinc-700 bg-zinc-950 text-red-600 focus:ring-red-600 cursor-pointer"
                                      />
                                    </div>
                                  </td>
                                </tr>
                                {isProtocolRow && actVal.checked && (
                                  <tr className="bg-indigo-950/30 border-t border-b border-indigo-900/40 animate-in fade-in duration-200">
                                    <td colSpan={4} className="px-2 py-2 space-y-2">
                                      <div className="flex items-center gap-2">
                                        <span className="text-[10px] font-bold text-indigo-400 shrink-0 uppercase tracking-wider">
                                          Nº do Protocolo:
                                        </span>
                                        <input
                                          type="text"
                                          placeholder="Ex: 12345/2026"
                                          value={actVal.protocolNumber || ''}
                                          onChange={(e) => updateProjectAction(activeProject.id, 'protocolado_cbm', 'protocolNumber', e.target.value)}
                                          className="w-full px-2 py-1 bg-zinc-950 border border-indigo-800/60 text-white text-xs rounded focus:outline-none focus:ring-1 focus:ring-indigo-500 font-mono"
                                        />
                                      </div>
                                      <div className="flex items-center justify-between pt-1 border-t border-indigo-900/30">
                                        <label className="flex items-center gap-1.5 text-[11px] font-semibold text-zinc-300 cursor-pointer">
                                          <input
                                            type="checkbox"
                                            checked={actVal.analyzed || false}
                                            onChange={(e) => {
                                              const isChecked = e.target.checked;
                                              updateProjectAction(activeProject.id, 'protocolado_cbm', 'analyzed', isChecked);
                                              if (isChecked && !actVal.analyzedDate) {
                                                updateProjectAction(activeProject.id, 'protocolado_cbm', 'analyzedDate', new Date().toISOString().split('T')[0]);
                                              }
                                            }}
                                            className="w-3.5 h-3.5 rounded border-zinc-700 bg-zinc-950 text-emerald-600 focus:ring-emerald-600 cursor-pointer"
                                          />
                                          <span>Analisado pelo CBM</span>
                                        </label>
                                        {actVal.analyzed ? (
                                          <div className="flex items-center gap-1.5 text-[10px] text-emerald-400 font-medium">
                                            <span>Data:</span>
                                            <input
                                              type="date"
                                              value={actVal.analyzedDate || ''}
                                              onChange={(e) => updateProjectAction(activeProject.id, 'protocolado_cbm', 'analyzedDate', e.target.value)}
                                              className="px-1 py-0.5 bg-zinc-950 border border-emerald-800/60 text-white text-[10px] rounded focus:outline-none"
                                            />
                                          </div>
                                        ) : (
                                          <span className="text-[10px] font-bold text-red-400 bg-red-500/10 px-1.5 py-0.5 rounded border border-red-500/20">
                                            Em Análise
                                          </span>
                                        )}
                                      </div>
                                    </td>
                                  </tr>
                                )}
                              </React.Fragment>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              </div>

              {/* Checklist & Notes Section */}
              <div className="grid grid-cols-2 gap-6 mt-6 pt-6 border-t border-zinc-900">
                {/* Checklist Section */}
                <div>
                  <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-500"/>
                    Checklist de Vistoria (In Loco)
                  </h3>
                  <div className="space-y-3 bg-zinc-900 p-4 rounded-lg border border-zinc-800">
                    {Object.entries(activeProject.checklist).map(([key, val]) => (
                      <label key={key} className="flex items-center gap-3 cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={val}
                          onChange={() => toggleChecklist(activeProject.id, key as any)}
                          className="w-4 h-4 rounded border-zinc-700 bg-zinc-950 text-red-600 focus:ring-red-600"
                        />
                        <span className="text-sm text-zinc-300 capitalize">
                          {key.replace('_', ' ')}
                        </span>
                      </label>
                    ))}
                  </div>
                </div>

                {/* Notes Section */}
                <div>
                  <h3 className="text-sm font-semibold text-white mb-3 flex items-center gap-2">
                    <FileText className="w-4 h-4 text-zinc-400"/>
                    Observações e Parecer Técnico
                  </h3>
                  <textarea 
                    className="w-full h-32 p-3 text-sm bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:ring-2 focus:ring-red-600 focus:border-transparent outline-none resize-none"
                    value={activeProject.notes || ''}
                    onChange={(e) => updateNotes(activeProject.id, e.target.value)}
                    placeholder="Adicione observações ou pendências técnicas..."
                  />
                  
                  {activeProject.status === 'Levantamento' && (
                    <div className="mt-4 flex items-start gap-3 bg-amber-950 text-amber-500 p-3 rounded-lg border border-amber-900 text-sm">
                      <AlertTriangle className="w-5 h-5 shrink-0" />
                      <p>Este projeto precisa de levantamento arquitetônico. Relembre-se de conferir o croqui gerado in loco.</p>
                    </div>
                  )}
                </div>
              </div>


              {/* Technical Inspection Report (Laudo de Vistoria de Campo) */}
              {(() => {
                const projectInspection = (data.inspections || []).find(i => 
                  (i.clientId && i.clientId === activeProject.clientId) || 
                  (i.clientName && i.clientName.toLowerCase() === activeProject.clientName.toLowerCase())
                );

                const clientRecord = data.clients?.find(c => 
                  c.id === activeProject.clientId || 
                  c.name.toLowerCase() === activeProject.clientName.toLowerCase()
                );

                const companySettings = {
                  companyName: data.companyName,
                  companyCnpj: data.companyCnpj,
                  companyAddress: data.companyAddress,
                  companyCep: data.companyCep,
                  companyPhone: data.companyPhone,
                  companyEmail: data.companyEmail
                };

                return (
                  <div className="mt-6 pt-6 border-t border-zinc-900">
                    {projectInspection ? (
                      <InspectionReport 
                        inspection={projectInspection} 
                        sketches={data.sketches || []} 
                        logoUrl={data.logoUrl}
                        clientRecord={clientRecord}
                        companySettings={companySettings}
                      />
                    ) : (
                      <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-6 space-y-4">
                        <div className="flex items-center gap-2 border-b border-zinc-900 pb-3">
                          <ClipboardCheck className="w-5 h-5 text-zinc-500" />
                          <h3 className="text-sm font-bold text-zinc-400">Laudo Técnico de Vistoria de Campo</h3>
                        </div>
                        <div className="text-center py-6 text-zinc-600">
                          <ClipboardCheck className="w-10 h-10 mx-auto mb-2 opacity-40 stroke-1" />
                          <p className="text-xs">Nenhum laudo de vistoria em campo encontrado para este cliente.</p>
                          <p className="text-[10px] text-zinc-500 mt-1 max-w-md mx-auto">
                            Crie um relatório de vistoria na aba <strong className="text-zinc-400">Checklist de Vistorias</strong> para que o laudo técnico completo de vistoria e o croqui de campo apareçam aqui automaticamente.
                          </p>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })()}


              {/* Google Drive Integration Section */}
              <div className="mt-6 mb-6 pt-6 border-t border-zinc-900">
                <ProjectDriveFiles projectId={activeProject.id} />
              </div>
            </div>
          ) : (
            <div className="h-full flex flex-col items-center justify-center text-zinc-600">
              <FolderGit2 className="w-12 h-12 mb-3" />
              <p>Selecione um projeto à esquerda para ver os detalhes e checklists.</p>
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
                Novo Projeto
              </h2>
              <button
                onClick={() => setShowAddForm(false)}
                className="text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddProject} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">Cliente / Edificação</label>
                <input
                  type="text"
                  list="clients-list"
                  required
                  placeholder="Ex: Restaurante Central"
                  value={newProject.clientName}
                  onChange={(e) => {
                    const val = e.target.value;
                    const existing = data.clients?.find(c => c.name.toLowerCase() === val.toLowerCase());
                    setNewProject({ ...newProject, clientName: val, address: existing ? existing.address : newProject.address });
                  }}
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                />
                <datalist id="clients-list">
                  {data.clients?.map(client => (
                    <option key={client.id} value={client.name} />
                  ))}
                </datalist>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">Endereço</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Av. Principal, 1000 - Centro"
                  value={newProject.address}
                  onChange={(e) => setNewProject({ ...newProject, address: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">Tipo de Ocupação</label>
                <select
                  value={newProject.type}
                  onChange={(e) => setNewProject({ ...newProject, type: e.target.value as any })}
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                >
                  <option value="Comercial">Comercial</option>
                  <option value="Residencial">Residencial</option>
                  <option value="Industrial">Industrial</option>
                  <option value="Depósito de GLP">Depósito de GLP</option>
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-zinc-300 mb-1">Valor do Serviço (Opcional)</label>
                  <input
                    type="number"
                    placeholder="0.00"
                    value={newProject.value || ''}
                    onChange={(e) => setNewProject({ ...newProject, value: Number(e.target.value) })}
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  />
                </div>
                <div className="col-span-2">
                  <label className="block text-sm font-medium text-zinc-300 mb-2">Formas de Pagamento (Opcional - Escolha várias)</label>
                  <div className="grid grid-cols-2 gap-3">
                    {['À vista com desconto', '50% Entrada + 50%', 'Até 12x Cartão de Crédito + Juros', 'Até 3x no Boleto'].map(method => (
                      <label key={method} className="flex items-center gap-2 cursor-pointer">
                        <input 
                          type="checkbox" 
                          checked={(newProject.paymentMethods || []).includes(method)} 
                          onChange={() => {
                            const methods = newProject.paymentMethods || [];
                            const updated = methods.includes(method) ? methods.filter(m => m !== method) : [...methods, method];
                            setNewProject({ ...newProject, paymentMethods: updated });
                          }}
                          className="w-4 h-4 rounded border-zinc-700 bg-zinc-950 text-red-600 focus:ring-red-600"
                        />
                        <span className="text-sm text-zinc-300">{method}</span>
                      </label>
                    ))}
                  </div>
                </div>
                {(newProject.paymentMethods || []).includes('À vista com desconto') && (
                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-1">Desconto À vista (%)</label>
                    <input
                      type="number"
                      placeholder="Ex: 5"
                      value={newProject.discountPercentage || ''}
                      onChange={(e) => setNewProject({ ...newProject, discountPercentage: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    />
                  </div>
                )}
                {(newProject.paymentMethods || []).includes('Até 12x Cartão de Crédito + Juros') && (
                  <div>
                    <label className="block text-sm font-medium text-zinc-300 mb-1">Acréscimo Cartão (%)</label>
                    <input
                      type="number"
                      placeholder="Ex: 12.5"
                      value={newProject.interestPercentage || ''}
                      onChange={(e) => setNewProject({ ...newProject, interestPercentage: Number(e.target.value) })}
                      className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                    />
                  </div>
                )}
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
                  Criar Projeto
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Modal: Intercept & Approve Proposal and Select Payment Details */}
      {showApprovalModal && projectToApprove && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-zinc-950 rounded-xl border border-zinc-900 shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-4 border-b border-zinc-900 flex justify-between items-center bg-zinc-900">
              <h2 className="font-semibold text-white flex items-center gap-2">
                <Coins className="w-5 h-5 text-emerald-500" />
                Aprovação de Proposta PPCI
              </h2>
              <button
                onClick={() => {
                  setShowApprovalModal(false);
                  setProjectToApprove(null);
                }}
                className="text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div className="bg-zinc-900 p-3 rounded border border-zinc-850">
                <div className="text-[10px] text-zinc-500 font-bold uppercase tracking-wider">Cliente / Obra</div>
                <div className="text-sm font-semibold text-white">{projectToApprove.clientName}</div>
                <div className="text-xs text-zinc-400 mt-1">{projectToApprove.address}</div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-1">Confirmar Valor Final do Projeto (R$)</label>
                <input
                  type="number"
                  value={approvalValue}
                  onChange={(e) => setApprovalValue(Number(e.target.value))}
                  placeholder="0.00"
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-transparent text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-zinc-400 uppercase tracking-wider mb-2">Forma de Pagamento Escolhida</label>
                <div className="space-y-2">
                  {[
                    'À vista com desconto', 
                    '50% Entrada + 50%', 
                    'Até 12x Cartão de Crédito + Juros', 
                    'Até 3x no Boleto',
                    'Pix',
                    'Dinheiro',
                    'Boleto Bancário'
                  ].map((method) => {
                    const isConfiguredOnProject = projectToApprove.paymentMethods?.includes(method);
                    return (
                      <label 
                        key={method} 
                        className={`flex items-center justify-between p-2.5 rounded-lg border cursor-pointer transition-all ${
                          selectedApprovalMethod === method 
                            ? 'bg-red-900/10 border-red-500/50 text-white' 
                            : 'bg-zinc-900/50 border-zinc-850 hover:bg-zinc-900 text-zinc-300'
                        }`}
                      >
                        <div className="flex items-center gap-2">
                          <input 
                            type="radio" 
                            name="approval-payment-method"
                            checked={selectedApprovalMethod === method}
                            onChange={() => setSelectedApprovalMethod(method)}
                            className="w-4 h-4 text-red-600 bg-zinc-950 border-zinc-700 focus:ring-red-500"
                          />
                          <span className="text-xs font-semibold">{method}</span>
                        </div>
                        {isConfiguredOnProject && (
                          <span className="text-[9px] uppercase font-bold text-red-500 bg-red-950/40 px-1.5 py-0.5 rounded">
                            Sugestão
                          </span>
                        )}
                      </label>
                    );
                  })}
                </div>
              </div>

              {/* Status and breakdown preview */}
              <div className="bg-zinc-900 p-4 rounded-lg border border-zinc-800 space-y-3">
                <div className="text-xs font-bold text-white uppercase tracking-wider border-b border-zinc-800 pb-2">
                  Planejamento de Lançamento
                </div>
                
                {selectedApprovalMethod === 'À vista com desconto' && (
                  <div className="text-xs text-zinc-400 space-y-1">
                    <p>• Aplica desconto de <span className="text-emerald-400 font-bold">{projectToApprove.discountPercentage || 5}%</span></p>
                    <p>• Total líquido: <span className="text-white font-bold font-mono">R$ {(approvalValue * (1 - (projectToApprove.discountPercentage || 5)/100)).toFixed(2).replace('.', ',')}</span></p>
                    <p>• Lançamento: 1 receita de faturamento único</p>
                  </div>
                )}

                {selectedApprovalMethod === '50% Entrada + 50%' && (
                  <div className="text-xs text-zinc-400 space-y-1">
                    <p>• Parcela 1 (Entrada 50%): <span className="text-white font-bold font-mono">R$ {(approvalValue / 2).toFixed(2).replace('.', ',')}</span> (Hoje)</p>
                    <p>• Parcela 2 (Final 50%): <span className="text-white font-bold font-mono">R$ {(approvalValue / 2).toFixed(2).replace('.', ',')}</span> (em 30 dias - Pendente)</p>
                  </div>
                )}

                {selectedApprovalMethod === 'Até 3x no Boleto' && (
                  <div className="text-xs text-zinc-400 space-y-1">
                    <p>• Boleto 1: <span className="text-white font-bold font-mono">R$ {(approvalValue / 3).toFixed(2).replace('.', ',')}</span> (Hoje)</p>
                    <p>• Boleto 2: <span className="text-white font-bold font-mono">R$ {(approvalValue / 3).toFixed(2).replace('.', ',')}</span> (em 30 dias)</p>
                    <p>• Boleto 3: <span className="text-white font-bold font-mono">R$ {(approvalValue / 3).toFixed(2).replace('.', ',')}</span> (em 60 dias)</p>
                  </div>
                )}

                {selectedApprovalMethod === 'Até 12x Cartão de Crédito + Juros' && (
                  <div className="text-xs text-zinc-400 space-y-1">
                    <p>• Acréscimo Juros: <span className="text-red-400 font-bold">+{projectToApprove.interestPercentage || 12}%</span></p>
                    <p>• Valor total cartão: <span className="text-white font-bold font-mono">R$ {(approvalValue * (1 + (projectToApprove.interestPercentage || 12)/100)).toFixed(2).replace('.', ',')}</span></p>
                    <p>• Lançado integral como recebido via cartão</p>
                  </div>
                )}

                {['Pix', 'Dinheiro', 'Boleto Bancário'].includes(selectedApprovalMethod) && (
                  <div className="text-xs text-zinc-400 space-y-1">
                    <p>• Faturamento direto de <span className="text-white font-bold font-mono">R$ {approvalValue.toFixed(2).replace('.', ',')}</span></p>
                    <p>• Lançamento: 1 receita de faturamento único</p>
                  </div>
                )}

                {/* Status selection for current payments */}
                {!['Até 12x Cartão de Crédito + Juros'].includes(selectedApprovalMethod) && (
                  <div className="pt-2 border-t border-zinc-800">
                    <label className="block text-[10px] font-bold text-zinc-500 uppercase tracking-wider mb-1">Status da Primeira Parcela / Entrada</label>
                    <div className="flex gap-2">
                      <button 
                        type="button"
                        onClick={() => setPaymentStatus('recebido')}
                        className={`flex-1 py-1 px-2 rounded text-xs font-bold transition-all border ${
                          paymentStatus === 'recebido' 
                            ? 'bg-emerald-600/15 border-emerald-500 text-emerald-400' 
                            : 'bg-zinc-950 border-zinc-800 text-zinc-500 hover:text-zinc-300'
                        }`}
                      >
                        Já Recebido (Pix / Caixa)
                      </button>
                      <button 
                        type="button"
                        onClick={() => setPaymentStatus('pendente')}
                        className={`flex-1 py-1 px-2 rounded text-xs font-bold transition-all border ${
                          paymentStatus === 'pendente' 
                            ? 'bg-amber-600/15 border-amber-500 text-amber-400' 
                            : 'bg-zinc-950 border-zinc-800 text-zinc-500 hover:text-zinc-300'
                        }`}
                      >
                        Pendente de Pagamento
                      </button>
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-4 border-t border-zinc-900 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowApprovalModal(false);
                    setProjectToApprove(null);
                  }}
                  className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-white transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="button"
                  onClick={handleConfirmApproval}
                  className="px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-sm font-bold rounded-md transition-colors flex items-center gap-1.5"
                >
                  Aprovar e Lançar Financeiro
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {showBudgetModal && editingBudget && (
        <div className="fixed inset-0 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-zinc-950 rounded-xl border border-zinc-900 shadow-xl w-full max-w-[96vw] xl:max-w-[92vw] 2xl:max-w-[85vw] overflow-hidden flex flex-col max-h-[95vh]">
            {/* Header */}
            <div className="p-4 border-b border-zinc-900 flex justify-between items-center bg-zinc-900">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-red-600/10 rounded">
                  <Receipt className="w-5 h-5 text-red-600" />
                </div>
                <div>
                  <h2 className="font-semibold text-white text-base">
                    {editingBudget.items.length > 0 ? 'Editar Proposta Técnica e Comercial' : 'Gerador de Orçamentos e Propostas de PPCI'}
                  </h2>
                  <p className="text-xs text-zinc-500 mt-0.5">Criação rápida baseada em vistorias, checklists e catálogo integrado.</p>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowBudgetModal(false);
                  setEditingBudget(null);
                  setCatalogSearch('');
                }}
                className="text-zinc-500 hover:text-zinc-300 transition-colors p-1"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Split Screen Body */}
            <div className="flex flex-col lg:flex-row flex-1 overflow-hidden min-h-0">
              {/* Left Column: Budget Assistant & Quick Add (4 cols equivalent) */}
              <div className="w-full lg:w-96 border-r border-zinc-900 bg-zinc-950/50 p-4 overflow-y-auto flex flex-col gap-4">
                {/* Section A: Vistoria Checklist Link */}
                <div className="bg-zinc-900/60 border border-zinc-800 rounded-lg p-3">
                  <h3 className="text-xs font-bold text-red-500 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <CheckCircle className="w-3.5 h-3.5" />
                    1. Importar da Vistoria In Loco
                  </h3>
                  <p className="text-[11px] text-zinc-400 mb-3">
                    Insira automaticamente os serviços relacionados aos itens verificados na vistoria técnica.
                  </p>
                  
                  {/* Miniature representation of checklist */}
                  <div className="space-y-1.5 mb-3 bg-zinc-950 p-2.5 rounded border border-zinc-900 text-xs">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-zinc-400">PPCI / Plantas:</span>
                      <span className={activeProject.checklist?.plantas_arquitetonicas ? 'text-emerald-500 font-semibold' : 'text-zinc-600'}>
                        {activeProject.checklist?.plantas_arquitetonicas ? '✓ Marcado' : 'Não'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-zinc-400">Extintores:</span>
                      <span className={activeProject.checklist?.extintores ? 'text-emerald-500 font-semibold' : 'text-zinc-600'}>
                        {activeProject.checklist?.extintores ? '✓ Marcado' : 'Não'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-zinc-400">Sinalização:</span>
                      <span className={activeProject.checklist?.sinalizacao ? 'text-emerald-500 font-semibold' : 'text-zinc-600'}>
                        {activeProject.checklist?.sinalizacao ? '✓ Marcado' : 'Não'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-zinc-400">Ilum. Emergência:</span>
                      <span className={activeProject.checklist?.iluminacao_emergencia ? 'text-emerald-500 font-semibold' : 'text-zinc-600'}>
                        {activeProject.checklist?.iluminacao_emergencia ? '✓ Marcado' : 'Não'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-zinc-400">Central GLP / Gás:</span>
                      <span className={activeProject.checklist?.central_glp ? 'text-emerald-500 font-semibold' : 'text-zinc-600'}>
                        {activeProject.checklist?.central_glp ? '✓ Marcado' : 'Não'}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="text-zinc-400">Saídas de Emergência:</span>
                      <span className={activeProject.checklist?.saidas_emergencia ? 'text-emerald-500 font-semibold' : 'text-zinc-600'}>
                        {activeProject.checklist?.saidas_emergencia ? '✓ Marcado' : 'Não'}
                      </span>
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => {
                      const currentItems = [...editingBudget.items];
                      const checklistItems: ProjectBudgetItem[] = [];
                      const timestamp = Date.now();
                      
                      if (activeProject.checklist?.plantas_arquitetonicas) {
                        if (!currentItems.some(it => it.description.includes('Planta e Projeto'))) {
                          checklistItems.push({
                            id: `bi-chk-1-${timestamp}`,
                            description: 'Elaboração de Planta e Projeto Técnico Arquitetônico de Incêndio',
                            quantity: 1,
                            unit: 'Un.',
                            unitPrice: 1500.00
                          });
                        }
                      }
                      if (activeProject.checklist?.extintores) {
                        if (!currentItems.some(it => it.description.includes('Manutenção / Recarga'))) {
                          checklistItems.push({
                            id: `bi-chk-2-${timestamp}`,
                            description: 'Manutenção / Recarga e Inspeção Técnica de Extintores de Incêndio',
                            quantity: 1,
                            unit: 'Ver.',
                            unitPrice: 450.00
                          });
                        }
                      }
                      if (activeProject.checklist?.sinalizacao) {
                        if (!currentItems.some(it => it.description.includes('Sinalização Fotoluminescente'))) {
                          checklistItems.push({
                            id: `bi-chk-3-${timestamp}`,
                            description: 'Fornecimento e Instalação de Placas de Sinalização Fotoluminescente',
                            quantity: 1,
                            unit: 'Ver.',
                            unitPrice: 350.00
                          });
                        }
                      }
                      if (activeProject.checklist?.iluminacao_emergencia) {
                        if (!currentItems.some(it => it.description.includes('Luminárias de Emergência'))) {
                          checklistItems.push({
                            id: `bi-chk-4-${timestamp}`,
                            description: 'Instalação / Regularização de Luminárias de Emergência e Balizamento',
                            quantity: 1,
                            unit: 'Un.',
                            unitPrice: 280.00
                          });
                        }
                      }
                      if (activeProject.checklist?.central_glp) {
                        if (!currentItems.some(it => it.description.includes('Laudo de Estanqueidade'))) {
                          checklistItems.push({
                            id: `bi-chk-5-${timestamp}`,
                            description: 'Emissão de Laudo de Estanqueidade e Central de GLP com ART',
                            quantity: 1,
                            unit: 'Un.',
                            unitPrice: 650.00
                          });
                        }
                      }
                      if (activeProject.checklist?.saidas_emergencia) {
                        if (!currentItems.some(it => it.description.includes('Barra Antipânico'))) {
                          checklistItems.push({
                            id: `bi-chk-6-${timestamp}`,
                            description: 'Adequação / Instalação de Barra Antipânico e Portas Corta-Fogo',
                            quantity: 1,
                            unit: 'Un.',
                            unitPrice: 850.00
                          });
                        }
                      }

                      if (checklistItems.length === 0) {
                        alert("Nenhum item pendente do checklist para importar ou itens já presentes.");
                        return;
                      }

                      setEditingBudget({
                        ...editingBudget,
                        items: [...currentItems, ...checklistItems]
                      });
                    }}
                    className="w-full bg-red-600/10 hover:bg-red-600/20 border border-red-500/25 text-red-500 hover:text-red-400 text-xs font-bold py-2 px-3 rounded transition-all flex items-center justify-center gap-1.5"
                  >
                    <Sparkles className="w-3.5 h-3.5" />
                    Auto-Importar do Checklist
                  </button>
                </div>

                {/* Section B: Preset Catalog */}
                <div className="bg-zinc-900/60 border border-zinc-800 rounded-lg p-3 flex-1 flex flex-col min-h-[300px]">
                  <h3 className="text-xs font-bold text-zinc-300 uppercase tracking-wider mb-2 flex items-center gap-1.5">
                    <Building className="w-3.5 h-3.5 text-zinc-400" />
                    2. Catálogo de Itens Rápidos
                  </h3>
                  
                  {/* Search bar inside catalog */}
                  <div className="mb-2">
                    <input
                      type="text"
                      placeholder="Filtrar catálogo..."
                      value={catalogSearch}
                      onChange={(e) => setCatalogSearch(e.target.value)}
                      className="w-full px-2 py-1 bg-zinc-950 border border-zinc-800 text-white text-xs rounded focus:outline-none focus:ring-1 focus:ring-red-500"
                    />
                  </div>

                  {/* Predefined catalog list */}
                  <div className="flex-1 overflow-y-auto space-y-3 pr-1 max-h-[350px] lg:max-h-[550px]">
                    {(() => {
                      const inventoryMapped = (data.inventory || []).map(item => {
                        const salePrice = item.simbolo_tipo === 'Projeto' && item.preco_sugerido !== undefined
                          ? item.preco_sugerido
                          : item.custo_unitario * (1 + (item.margem / 100));
                        return {
                          name: `${item.significado} (${item.codigo_norma || item.codigo_interno} - ${item.dimensoes})`,
                          unit: 'Un.',
                          price: salePrice,
                          stock: item.qtd_estoque
                        };
                      });

                      const servicesMapped = (data.services || []).map(service => ({
                        name: service.codigo_interno ? `${service.name} (${service.codigo_interno})` : service.name,
                        unit: service.unit,
                        price: service.price,
                        stock: undefined
                      }));

                      const categories = [];
                      if (servicesMapped.length > 0) {
                        categories.push({
                          category: 'Serviços (Projetos e Laudos)',
                          items: servicesMapped
                        });
                      }
                      if (inventoryMapped.length > 0) {
                        categories.push({
                          category: 'Equipamentos e Materiais',
                          items: inventoryMapped
                        });
                      }

                      return categories.map((grp) => {
                        // Filter items
                        const filteredItems = grp.items.filter(it => 
                          it.name.toLowerCase().includes(catalogSearch.toLowerCase())
                        );

                        if (filteredItems.length === 0) return null;

                        return (
                          <div key={grp.category} className="space-y-1.5">
                            <span className="text-[10px] uppercase font-semibold text-zinc-500 tracking-wider block">{grp.category}</span>
                            <div className="grid grid-cols-1 gap-1.5">
                              {filteredItems.map((catalogItem) => (
                                <button
                                  key={catalogItem.name}
                                  type="button"
                                  onClick={() => {
                                    const newItem: ProjectBudgetItem = {
                                      id: `bi-cat-${Date.now()}-${Math.random()}`,
                                      description: catalogItem.name,
                                      quantity: 1,
                                      unit: catalogItem.unit,
                                      unitPrice: catalogItem.price
                                    };
                                    setEditingBudget({
                                      ...editingBudget,
                                      items: [...editingBudget.items, newItem]
                                    });
                                  }}
                                  className="text-left p-2 bg-zinc-950 border border-zinc-900 rounded hover:border-red-600/50 hover:bg-zinc-900 transition-all flex justify-between items-center group"
                                >
                                  <div>
                                    <span className="text-xs text-zinc-200 block font-medium group-hover:text-white truncate max-w-[200px] lg:max-w-[320px]">{catalogItem.name}</span>
                                    <div className="flex items-center gap-2 mt-0.5">
                                      <span className="text-[10px] text-zinc-500">{catalogItem.unit} • R$ {catalogItem.price.toFixed(2).replace('.', ',')}</span>
                                      {catalogItem.stock !== undefined && (
                                        <span className={`text-[9px] px-1.5 py-0.5 rounded font-semibold ${catalogItem.stock > 0 ? 'bg-emerald-500/10 text-emerald-500' : 'bg-red-500/10 text-red-500'}`}>
                                          Qtd. Estoque: {catalogItem.stock}
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                  <span className="bg-zinc-900 border border-zinc-800 text-zinc-400 group-hover:bg-red-600 group-hover:text-white group-hover:border-transparent text-xs p-1 rounded font-bold transition-all">
                                    + Add
                                  </span>
                                </button>
                              ))}
                            </div>
                          </div>
                        );
                      });
                    })()}
                  </div>
                </div>
              </div>

              {/* Right Column: Main Editor & Table (8 cols equivalent) */}
              <div className="flex-1 p-6 overflow-y-auto space-y-6 flex flex-col justify-between min-h-0">
                <div className="space-y-6">
                  {/* Row 1: General Info */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div>
                      <label className="block text-xs font-semibold text-zinc-400 mb-1">Nº Proposta</label>
                      <input
                        type="text"
                        required
                        value={editingBudget.proposalNumber}
                        onChange={(e) => setEditingBudget({ ...editingBudget, proposalNumber: e.target.value })}
                        className="w-full px-3 py-1.5 bg-zinc-900 border border-zinc-800 text-white text-sm rounded-md focus:outline-none focus:ring-1 focus:ring-red-500"
                        placeholder="Ex: 117/2026"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-zinc-400 mb-1">Data da Proposta</label>
                      <input
                        type="date"
                        required
                        value={editingBudget.date}
                        onChange={(e) => setEditingBudget({ ...editingBudget, date: e.target.value })}
                        className="w-full px-3 py-1.5 bg-zinc-900 border border-zinc-800 text-white text-sm rounded-md focus:outline-none focus:ring-1 focus:ring-red-500"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-semibold text-zinc-400 mb-1">Prazo de Entrega</label>
                      <input
                        type="text"
                        required
                        value={editingBudget.deliveryTime}
                        onChange={(e) => setEditingBudget({ ...editingBudget, deliveryTime: e.target.value })}
                        className="w-full px-3 py-1.5 bg-zinc-900 border border-zinc-800 text-white text-sm rounded-md focus:outline-none focus:ring-1 focus:ring-red-500"
                        placeholder="Ex: 14 dias úteis..."
                      />
                    </div>
                  </div>

                  {/* Payment Methods Section */}
                  <div className="bg-zinc-950/40 border border-zinc-900 rounded-lg p-3">
                    <label className="block text-xs font-semibold text-zinc-400 mb-2">Formas de Pagamento do Projeto (Selecione uma ou mais)</label>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                      {['À vista com desconto', '50% Entrada + 50%', 'Até 12x Cartão de Crédito + Juros', 'Até 3x no Boleto'].map(method => (
                         <label key={method} className="flex items-center gap-2 cursor-pointer select-none">
                            <input 
                               type="checkbox" 
                               checked={(activeProject.paymentMethods || []).includes(method)} 
                               onChange={() => togglePaymentMethod(activeProject.id, method)}
                               className="w-4 h-4 rounded border-zinc-700 bg-zinc-950 text-red-600 focus:ring-red-600 cursor-pointer"
                            />
                            <span className="text-xs text-zinc-300">{method}</span>
                         </label>
                      ))}
                    </div>
                  </div>

                  {/* Row 2: Table Section */}
                  <div>
                    <div className="flex justify-between items-center mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-zinc-300 uppercase tracking-wide">Tabela de Itens e Preços</span>
                        <span className="text-[10px] bg-zinc-900 px-2 py-0.5 rounded text-zinc-400 border border-zinc-800">
                          {editingBudget.items.length} {editingBudget.items.length === 1 ? 'item' : 'itens'}
                        </span>
                      </div>
                      
                      <div className="flex items-center gap-3">
                        {/* Batch multiplier shortcuts */}
                        {editingBudget.items.length > 0 && (
                          <div className="flex items-center gap-1.5 border-r border-zinc-800 pr-3 text-[11px] text-zinc-400">
                            <span>Ajustar Lote:</span>
                            <button
                              type="button"
                              onClick={() => {
                                const adjusted = editingBudget.items.map(it => ({
                                  ...it,
                                  unitPrice: Math.round(it.unitPrice * 1.1 * 100) / 100
                                }));
                                setEditingBudget({ ...editingBudget, items: adjusted });
                              }}
                              className="px-1.5 py-0.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-white rounded transition-colors"
                              title="Aumentar todos os preços unitários em 10%"
                            >
                              +10%
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const adjusted = editingBudget.items.map(it => ({
                                  ...it,
                                  unitPrice: Math.round(it.unitPrice * 1.25 * 100) / 100
                                }));
                                setEditingBudget({ ...editingBudget, items: adjusted });
                              }}
                              className="px-1.5 py-0.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-white rounded transition-colors"
                              title="Aumentar todos os preços unitários em 25%"
                            >
                              +25%
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                const adjusted = editingBudget.items.map(it => ({
                                  ...it,
                                  unitPrice: Math.round(it.unitPrice * 0.95 * 100) / 100
                                }));
                                setEditingBudget({ ...editingBudget, items: adjusted });
                              }}
                              className="px-1.5 py-0.5 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-white rounded transition-colors"
                              title="Desconto de 5% em lote"
                            >
                              -5%
                            </button>
                          </div>
                        )}

                        <button
                          type="button"
                          onClick={() => {
                            const newItem: ProjectBudgetItem = {
                              id: `bi-${Date.now()}-${Math.random()}`,
                              description: '',
                              quantity: 1,
                              unit: 'Un.',
                              unitPrice: 0
                            };
                            setEditingBudget({
                              ...editingBudget,
                              items: [...editingBudget.items, newItem]
                            });
                          }}
                          className="flex items-center gap-1 text-red-500 hover:text-red-400 text-xs font-bold transition-colors"
                        >
                          <Plus className="w-3.5 h-3.5" />
                          Adicionar Item Manual
                        </button>
                      </div>
                    </div>

                    {editingBudget.items.length === 0 ? (
                      <div className="bg-zinc-900/40 border border-zinc-800 rounded-lg p-8 text-center text-zinc-500 text-sm flex flex-col items-center justify-center gap-2">
                        <Sparkles className="w-8 h-8 text-zinc-600 mb-1 animate-pulse" />
                        <span className="font-semibold text-zinc-400">Nenhum item cadastrado no orçamento.</span>
                        <p className="text-xs text-zinc-600 max-w-sm">Use o Assistente à esquerda para auto-importar itens da vistoria técnica ou clique no catálogo rápido de itens frequentes.</p>
                      </div>
                    ) : (
                      <div className="border border-zinc-900 rounded-lg overflow-hidden bg-zinc-900/20 max-h-[250px] overflow-y-auto">
                        <table className="w-full text-left border-collapse">
                          <thead>
                            <tr className="bg-zinc-900/80 border-b border-zinc-900 text-[11px] font-semibold text-zinc-400 sticky top-0 z-10">
                              <th className="p-3 w-[45%]">Descrição do Serviço / Equipamento</th>
                              <th className="p-3 w-[12%] text-center">Quantidade</th>
                              <th className="p-3 w-[12%] text-center">Un.</th>
                              <th className="p-3 w-[15%]">Valor Unitário</th>
                              <th className="p-3 w-[16%]">Subtotal</th>
                              <th className="p-3 w-[10%] text-center"></th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-zinc-900 text-xs">
                            {editingBudget.items.map((item, index) => (
                              <tr key={item.id} className="hover:bg-zinc-900/30">
                                <td className="p-2">
                                  <input
                                    type="text"
                                    required
                                    value={item.description}
                                    onChange={(e) => {
                                      const updatedItems = [...editingBudget.items];
                                      updatedItems[index] = { ...item, description: e.target.value };
                                      setEditingBudget({ ...editingBudget, items: updatedItems });
                                    }}
                                    className="w-full px-2 py-1 bg-zinc-950 border border-zinc-800 text-white text-xs rounded focus:outline-none focus:ring-1 focus:ring-red-500"
                                    placeholder="Descreva o serviço..."
                                  />
                                </td>
                                <td className="p-2 text-center">
                                  <input
                                    type="number"
                                    required
                                    min="1"
                                    value={item.quantity}
                                    onChange={(e) => {
                                      const updatedItems = [...editingBudget.items];
                                      updatedItems[index] = { ...item, quantity: Number(e.target.value) };
                                      setEditingBudget({ ...editingBudget, items: updatedItems });
                                    }}
                                    className="w-16 px-1 py-1 bg-zinc-950 border border-zinc-800 text-white text-xs rounded text-center focus:outline-none focus:ring-1 focus:ring-red-500"
                                  />
                                </td>
                                <td className="p-2 text-center">
                                  <input
                                    type="text"
                                    required
                                    value={item.unit}
                                    onChange={(e) => {
                                      const updatedItems = [...editingBudget.items];
                                      updatedItems[index] = { ...item, unit: e.target.value };
                                      setEditingBudget({ ...editingBudget, items: updatedItems });
                                    }}
                                    className="w-16 px-1 py-1 bg-zinc-950 border border-zinc-800 text-white text-xs rounded text-center focus:outline-none focus:ring-1 focus:ring-red-500"
                                    placeholder="Un."
                                  />
                                </td>
                                <td className="p-2">
                                  <input
                                    type="number"
                                    required
                                    step="0.01"
                                    value={item.unitPrice || ''}
                                    onChange={(e) => {
                                      const updatedItems = [...editingBudget.items];
                                      updatedItems[index] = { ...item, unitPrice: Number(e.target.value) };
                                      setEditingBudget({ ...editingBudget, items: updatedItems });
                                    }}
                                    className="w-full px-2 py-1 bg-zinc-950 border border-zinc-800 text-white text-xs rounded focus:outline-none focus:ring-1 focus:ring-red-500"
                                    placeholder="0.00"
                                  />
                                </td>
                                <td className="p-2 text-zinc-300 font-medium text-xs">
                                  R$ {(item.quantity * item.unitPrice).toFixed(2).replace('.', ',')}
                                </td>
                                <td className="p-2 text-center">
                                  <button
                                    type="button"
                                    onClick={() => {
                                      const updatedItems = editingBudget.items.filter(it => it.id !== item.id);
                                      setEditingBudget({ ...editingBudget, items: updatedItems });
                                    }}
                                    className="text-zinc-500 hover:text-red-500 transition-colors px-1"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    )}
                  </div>

                  {/* Row 3: Contractual observations and terms */}
                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="block text-xs font-bold text-zinc-300 uppercase tracking-wide">3. Observações e Termos Contratuais</label>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingBudget({ ...editingBudget, items: [] });
                        }}
                        className="text-zinc-500 hover:text-zinc-300 text-xs transition-colors"
                      >
                        Limpar Todos os Itens
                      </button>
                    </div>
                    <textarea
                      value={editingBudget.observations}
                      onChange={(e) => setEditingBudget({ ...editingBudget, observations: e.target.value })}
                      className="w-full h-24 p-3 text-xs bg-zinc-900 border border-zinc-800 rounded-lg text-white focus:ring-1 focus:ring-red-500 outline-none resize-none"
                      placeholder="Instruções de manutenção, regras para cilindros reservas, etc..."
                    />
                  </div>
                </div>

                {/* Footer sum info inside the right panel */}
                <div className="pt-4 border-t border-zinc-900 flex justify-between items-center mt-4">
                  <div className="text-left">
                    <span className="text-zinc-500 text-[10px] uppercase font-bold tracking-wider block">Valor Total do Orçamento:</span>
                    <span className="text-emerald-500 text-2xl font-extrabold">
                      R$ {editingBudget.items.reduce((sum, item) => sum + (item.quantity * item.unitPrice), 0).toFixed(2).replace('.', ',')}
                    </span>
                  </div>
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setShowBudgetModal(false);
                        setEditingBudget(null);
                        setCatalogSearch('');
                      }}
                      className="px-4 py-2 bg-zinc-900 hover:bg-zinc-850 border border-zinc-800 text-zinc-400 hover:text-white rounded-md text-sm font-medium transition-colors"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        saveProjectBudget(activeProject.id, editingBudget);
                        setShowBudgetModal(false);
                        setEditingBudget(null);
                        setCatalogSearch('');
                      }}
                      className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md text-sm font-semibold transition-colors flex items-center gap-1.5 shadow-lg shadow-red-900/20 animate-pulse-subtle"
                    >
                      <Check className="w-4 h-4" />
                      Salvar Orçamento
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Custom Delete Budget Modal */}
      {budgetToDelete && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-zinc-950 rounded-xl border border-zinc-900 shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-4 border-b border-zinc-900 bg-zinc-900 flex justify-between items-center">
              <h3 className="font-semibold text-white flex items-center gap-2">
                <Trash2 className="w-5 h-5 text-red-500" />
                Confirmar Exclusão
              </h3>
              <button
                onClick={() => setBudgetToDelete(null)}
                className="text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-6 space-y-4">
              <p className="text-zinc-300 text-sm">
                Tem certeza de que deseja excluir este orçamento permanentemente? Esta ação não pode ser desfeita.
              </p>
            </div>
            <div className="p-4 bg-zinc-900/50 border-t border-zinc-900 flex justify-end gap-3">
              <button
                onClick={() => setBudgetToDelete(null)}
                className="px-4 py-2 text-zinc-400 hover:text-white text-sm font-medium transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={() => {
                  deleteProjectBudget(budgetToDelete.projectId, budgetToDelete.budgetId);
                  setBudgetToDelete(null);
                }}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white text-sm font-medium rounded transition-colors"
              >
                Excluir Orçamento
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
