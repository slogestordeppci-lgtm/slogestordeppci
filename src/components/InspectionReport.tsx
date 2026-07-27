import React, { useState } from 'react';
import { Inspection, StoreSketch } from '../types';
import { jsPDF } from 'jspdf';
import { uploadFileToProject } from '../lib/drive-service';
import { 
  ClipboardCheck, 
  User, 
  Calendar, 
  MapPin, 
  Building, 
  FileText, 
  ShieldAlert, 
  Printer, 
  AlertTriangle, 
  Camera, 
  Check, 
  X, 
  Maximize2,
  ChevronDown,
  ChevronUp,
  Zap,
  Home,
  Layers,
  HelpCircle,
  Edit2,
  Cloud,
  Loader2,
  CheckCircle2
} from 'lucide-react';

interface InspectionReportProps {
  inspection: Inspection;
  sketches: StoreSketch[];
  logoUrl?: string;
  clientRecord?: any;
  companySettings?: {
    companyName?: string;
    companyCnpj?: string;
    companyAddress?: string;
    companyCep?: string;
    companyPhone?: string;
    companyEmail?: string;
  };
}

export function InspectionReport({ inspection, sketches, logoUrl, clientRecord, companySettings }: InspectionReportProps) {
  const [zoomedPhoto, setZoomedPhoto] = useState<string | null>(null);
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({
    identificacao: true,
    entorno: true,
    ocupacao: true,
    eletrica: true,
    sistemas: true,
    croqui: true
  });

  const toggleSection = (section: string) => {
    setOpenSections(prev => ({ ...prev, [section]: !prev[section] }));
  };

  const linkedSketch = sketches.find(s => s.inspectionId === inspection.id);

  const [savingDrive, setSavingDrive] = useState(false);
  const [driveSuccess, setDriveSuccess] = useState('');

  const generatePdfDocument = (): jsPDF => {
    const doc = new jsPDF();
    let y = 20;

    const checkNewPage = (heightNeeded: number) => {
      if (y + heightNeeded > 280) {
        doc.addPage();
        y = 20;
        // Running header
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(0, 0, 0);
        doc.text(`Laudo de Vistoria de Campo - Cliente: ${inspection.clientName || 'Alessandro M. Zandoná'}`, 14, 10);
        doc.line(14, 12, 196, 12);
        y = 18;
      }
    };

    // Retrieve company settings from prop or defaults
    const companyName = companySettings?.companyName || "SLO – Engenharia de Segurança Contra Incêndio LTDA";
    const companyCnpj = companySettings?.companyCnpj || "64.610.803/0001-40";
    const companyAddress = companySettings?.companyAddress || "Rua João Sarmento, 987 - Centro, Osório/RS";
    const companyCep = companySettings?.companyCep || "94.660-186";
    const companyPhone = companySettings?.companyPhone || "(51) 9 9919-1194";
    const companyEmail = companySettings?.companyEmail || "sloprevencao.adm@gmail.com";

    // 1. Draw centered logo at the top (if loaded), leaving it blank otherwise
    if (logoUrl) {
      try {
        let imgType = 'PNG';
        if (logoUrl.includes('image/jpeg') || logoUrl.includes('image/jpg')) {
          imgType = 'JPEG';
        }
        // Draw the uploaded logo centered at the top (without red box/border)
        doc.addImage(logoUrl, imgType, 50, 12, 110, 28, undefined, 'FAST');
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
    doc.text("LAUDO TÉCNICO DE VISTORIA DE CAMPO", 105, 51, { align: 'center' });

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

    // 4. CONTRATANTE Section (Dados do Cliente / Geral da Vistoria)
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(185, 28, 28); // Red-700
    doc.text("CONTRATANTE:", 14, 89);

    doc.setDrawColor(0, 0, 0); // Black border
    doc.rect(14, 90, 182, 24);

    const clientDoc = clientRecord?.document || '11.264.047/0001-89';
    const clientCEP = clientRecord?.cep || '95520-000';
    const clientPhone = clientRecord?.phone || '';
    const clientEmail = clientRecord?.email || '';
    const clientAddress = inspection.address || clientRecord?.address || 'Rua 15 de novembro 519 centro Osório';
    const formattedDate = inspection.date || new Date().toLocaleDateString('pt-BR');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(0, 0, 0);

    // Line 1
    doc.text("Cliente: ", 17, 95);
    doc.setFont('helvetica', 'normal');
    doc.text(inspection.clientName || "---", 29, 95);

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
    if (clientEmail || inspection.inspector) {
      doc.setFont('helvetica', 'bold');
      doc.text("Vistoriador: ", 17, 112);
      doc.setFont('helvetica', 'normal');
      doc.text(inspection.inspector || "Não Informado", 34, 112);

      doc.setFont('helvetica', 'bold');
      doc.text("E-mail: ", 110, 112);
      doc.setFont('helvetica', 'normal');
      doc.text(clientEmail || "---", 123, 112);
    }

    y = 124;

    // Section title helper - Matching the Budget/Proposal style!
    const drawSectionTitle = (title: string) => {
      checkNewPage(18);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(0, 0, 0); // Black section title
      doc.text(title, 14, y);
      doc.setDrawColor(234, 88, 12); // Orange-600 line
      doc.setLineWidth(0.5);
      doc.line(14, y + 2, 196, y + 2);
      doc.setLineWidth(0.2); // reset
      y += 8;
    };

    // 1. Identificação
    drawSectionTitle("1. IDENTIFICAÇÃO DA EDIFICAÇÃO");
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.setTextColor(0, 0, 0);
    
    checkNewPage(24);
    doc.text(`Atividade Principal: ${inspection.data?.activity || 'Não informada'}`, 14, y);
    doc.text(`Área Construída: ${inspection.data?.builtArea ? `${inspection.data.builtArea} m²` : 'Não informada'}`, 105, y);
    y += 6;
    doc.text(`Área do Terreno: ${inspection.data?.landArea ? `${inspection.data.landArea} m²` : 'Não informada'}`, 14, y);
    doc.text(`Número de Pavimentos: ${inspection.data?.floors || 'Não informado'}`, 105, y);
    y += 6;
    doc.text(`Altura Aproximada: ${inspection.data?.height || 'Não informada'}`, 14, y);
    doc.text(`Pé-direito Médio: ${inspection.data?.ceilingHeight || 'Não informado'}`, 105, y);
    y += 6;
    doc.text(`Ano de Construção: ${inspection.data?.constructionYear || 'Não informado'}`, 14, y);
    doc.text(`Tipo de Construção: ${inspection.data?.constructionType || 'Não informado'}`, 105, y);
    y += 8;

    // Structures tag list
    const structures: string[] = [];
    if (inspection.data?.hasMezzanine) structures.push("Possui Mezanino");
    if (inspection.data?.hasBasement) structures.push("Possui Subsolo");
    if (inspection.data?.hasStorage) structures.push("Possui Depósito / Estoque");
    
    if (structures.length > 0) {
      checkNewPage(8);
      doc.setFont('helvetica', 'bold');
      doc.text(`Estruturas Especiais: ${structures.join(" | ")}`, 14, y);
      doc.setFont('helvetica', 'normal');
      y += 8;
    } else {
      y += 2;
    }

    // 2. Características do Entorno
    drawSectionTitle("2. CARACTERÍSTICAS DO ENTORNO");
    checkNewPage(18);
    const entornoItems = [
      { label: 'Edificação Isolada', val: inspection.data?.isolatedBuilding },
      { label: 'Acesso Lateral', val: inspection.data?.sideAccess },
      { label: 'Acesso Fundos', val: inspection.data?.backAccess },
      { label: 'Acesso p/ Viatura do CBM', val: inspection.data?.fireTruckAccess },
      { label: 'Hidrante Público Próximo', val: inspection.data?.publicHydrant },
      { label: 'Vizinhos Encostados', val: inspection.data?.attachedNeighbors },
      { label: 'Risco Externo', val: inspection.data?.externalRisk },
    ];
    let col = 0;
    entornoItems.forEach((item) => {
      const text = `${item.val ? '[X]' : '[ ]'} ${item.label}`;
      doc.text(text, 14 + (col * 60), y);
      col++;
      if (col === 3) {
        col = 0;
        y += 6;
      }
    });
    y += 8;

    // 3. Ocupação e Funcionamento
    drawSectionTitle("3. OCUPAÇÃO, ATIVIDADE & FUNCIONAMENTO");
    checkNewPage(18);
    doc.text(`Funcionários: ${inspection.data?.employees || 'Não informado'}`, 14, y);
    doc.text(`Público Máximo Estimado: ${inspection.data?.maxPublic || 'Não informado'}`, 105, y);
    y += 6;
    doc.text(`Horário de Funcionamento: ${inspection.data?.operatingHours || 'Não informado'}`, 14, y);
    doc.text(`Atividade Desenvolvida: ${inspection.data?.developedActivity || 'Não informada'}`, 105, y);
    y += 8;

    const opCheks = [
      { label: 'Possui Estoque', val: inspection.data?.hasStock },
      { label: 'Possui Escritório', val: inspection.data?.hasOffice },
      { label: 'Possui Cozinha Industrial', val: inspection.data?.hasKitchen },
      { label: 'Possui Banheiros', val: inspection.data?.hasBathrooms },
    ];
    col = 0;
    opCheks.forEach(item => {
      const text = `${item.val ? '[X]' : '[ ]'} ${item.label}`;
      doc.text(text, 14 + (col * 45), y);
      col++;
    });
    y += 12;

    // 4. Instalações Elétricas & Cobertura
    drawSectionTitle("4. INSTALAÇÕES ELÉTRICAS & COBERTURA");
    if (inspection.data?.electrical) {
      checkNewPage(24);
      doc.setFont('helvetica', 'bold');
      doc.text("Parâmetros Elétricos Levantados:", 14, y);
      doc.setFont('helvetica', 'normal');
      y += 6;
      const elecItems = [
        { label: 'QDC Identificado', val: inspection.data.electrical.identifiedBoard },
        { label: 'Disjuntores Identificados', val: inspection.data.electrical.identifiedBreakers },
        { label: 'Ausência de Fiação Exposta', val: !inspection.data.electrical.exposedWiring },
        { label: 'Sem Adaptadores ("Benjamins")', val: !inspection.data.electrical.useOfAdapters },
        { label: 'Sem Extensões Permanentes', val: !inspection.data.electrical.permanentExtensions },
        { label: 'Sem Tomadas Sobrecarregadas', val: !inspection.data.electrical.overloadedOutlets },
        { label: 'Seguro para Equipamentos de Alta Potência', val: !inspection.data.electrical.highPowerEquipment },
      ];
      col = 0;
      elecItems.forEach(item => {
        const text = `${item.val ? '[X]' : '[ ]'} ${item.label}`;
        doc.text(text, 14 + (col * 90), y);
        col++;
        if (col === 2) {
          col = 0;
          y += 6;
        }
      });
      y += 6;
    }

    if (inspection.data?.roofing) {
      checkNewPage(18);
      doc.setFont('helvetica', 'bold');
      doc.text("Estrutura da Cobertura:", 14, y);
      doc.setFont('helvetica', 'normal');
      y += 6;
      doc.text(`Estrutura de Apoio: ${inspection.data.roofing.structure || 'Não informada'}`, 14, y);
      doc.text(`Material do Telhado: ${inspection.data.roofing.roof || 'Não informado'}`, 105, y);
      y += 6;
      doc.text(`Material do Forro: ${inspection.data.roofing.ceiling || 'Não informado'}`, 14, y);
      doc.text(`Estado de Conservação: ${inspection.data.roofing.condition || 'Não informado'}`, 105, y);
      y += 12;
    }

    // 5. Sistemas Levantados
    drawSectionTitle("5. SISTEMAS LEVANTADOS EM CAMPO");
    
    // Extintores Table
    if (inspection.data?.extinguishers && inspection.data.extinguishers.length > 0) {
      checkNewPage(20);
      doc.setFont('helvetica', 'bold');
      doc.text(`5.1 Extintores de Incêndio Encontrados (${inspection.data.extinguishers.length})`, 14, y);
      y += 6;
      
      doc.setFillColor(254, 215, 170); // soft orange (from budget table header)
      doc.rect(14, y, 182, 6, 'F');
      doc.setFontSize(8);
      doc.setFont('helvetica', 'bold');
      doc.text("Nº", 16, y + 4.5);
      doc.text("Tipo / Agente", 24, y + 4.5);
      doc.text("Capacidade", 55, y + 4.5);
      doc.text("Localização", 80, y + 4.5);
      doc.text("Validade", 125, y + 4.5);
      doc.text("Pressão", 150, y + 4.5);
      doc.text("Sinalizado", 175, y + 4.5);
      
      doc.setFont('helvetica', 'normal');
      y += 6;
      
      inspection.data.extinguishers.forEach((ext, idx) => {
        checkNewPage(8);
        doc.text(String(ext.number || idx + 1), 16, y + 4.5);
        doc.text(ext.type || '-', 24, y + 4.5);
        doc.text(ext.capacity || '-', 55, y + 4.5);
        doc.text(ext.location || '-', 80, y + 4.5);
        doc.text(ext.expiration || '-', 125, y + 4.5);
        doc.text(ext.pressure || '-', 150, y + 4.5);
        doc.text(ext.signaled ? 'Sim' : 'Não', 175, y + 4.5);
        doc.line(14, y + 6.5, 196, y + 6.5);
        y += 7;
      });
      y += 6;
    }

    // Iluminação
    if (inspection.data?.emergencyLights && inspection.data.emergencyLights.length > 0) {
      checkNewPage(20);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text(`5.2 Blocos de Iluminação de Emergência (${inspection.data.emergencyLights.length})`, 14, y);
      y += 6;
      
      doc.setFillColor(254, 215, 170); // soft orange (from budget table header)
      doc.rect(14, y, 182, 6, 'F');
      doc.setFontSize(8);
      doc.text("Nº", 16, y + 4.5);
      doc.text("Localização", 24, y + 4.5);
      doc.text("Funcionamento", 75, y + 4.5);
      doc.text("Distância (m)", 110, y + 4.5);
      doc.text("Observações", 135, y + 4.5);
      
      doc.setFont('helvetica', 'normal');
      y += 6;
      
      inspection.data.emergencyLights.forEach((light, idx) => {
        checkNewPage(8);
        doc.text(String(light.number || idx + 1), 16, y + 4.5);
        doc.text(light.location || '-', 24, y + 4.5);
        doc.text(light.works ? 'Adequado' : 'Inadequado', 75, y + 4.5);
        doc.text(String(light.distance || '-'), 110, y + 4.5);
        doc.text(light.notes || '-', 135, y + 4.5);
        doc.line(14, y + 6.5, 196, y + 6.5);
        y += 7;
      });
      y += 6;
    }

    // Saídas de emergência
    if (inspection.data?.doorsAndExits && inspection.data.doorsAndExits.length > 0) {
      checkNewPage(20);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text(`5.3 Portas e Saídas de Emergência (${inspection.data.doorsAndExits.length})`, 14, y);
      y += 6;
      
      doc.setFillColor(254, 215, 170); // soft orange (from budget table header)
      doc.rect(14, y, 182, 6, 'F');
      doc.setFontSize(8);
      doc.text("Localização", 16, y + 4.5);
      doc.text("Largura (m)", 60, y + 4.5);
      doc.text("Altura (m)", 85, y + 4.5);
      doc.text("Abre p/ fora", 110, y + 4.5);
      doc.text("Barra Antipânico", 135, y + 4.5);
      doc.text("Observações", 165, y + 4.5);
      
      doc.setFont('helvetica', 'normal');
      y += 6;
      
      inspection.data.doorsAndExits.forEach((door) => {
        checkNewPage(8);
        doc.text(door.location || '-', 16, y + 4.5);
        doc.text(String(door.width || '-'), 60, y + 4.5);
        doc.text(String(door.height || '-'), 85, y + 4.5);
        doc.text(door.opensOutward ? 'Sim' : 'Não', 110, y + 4.5);
        doc.text(door.panicBar ? 'Possui' : 'Não', 135, y + 4.5);
        doc.text(door.notes || '-', 165, y + 4.5);
        doc.line(14, y + 6.5, 196, y + 6.5);
        y += 7;
      });
      y += 6;
    }

    // Ambientes Vistoriados
    if (inspection.data?.environments && inspection.data.environments.length > 0) {
      checkNewPage(20);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text(`5.4 Ambientes Vistoriados (${inspection.data.environments.length})`, 14, y);
      y += 6;
      doc.setFontSize(8);
      inspection.data.environments.forEach((env, idx) => {
        checkNewPage(12);
        doc.setFont('helvetica', 'bold');
        doc.text(`${idx + 1}. ${env.name}`, 14, y);
        doc.setFont('helvetica', 'normal');
        doc.text(`Área: ${env.area ? `${env.area} m²` : '-'} | Pé-direito: ${env.ceilingHeight ? `${env.ceilingHeight} m` : '-'} | Notas: ${env.notes || 'Nenhuma'}`, 14, y + 4.5);
        doc.line(14, y + 6.5, 196, y + 6.5);
        y += 8;
      });
      y += 6;
    }

    // Sinalização
    if (inspection.data?.signs && inspection.data.signs.length > 0) {
      checkNewPage(20);
      doc.setFontSize(9);
      doc.setFont('helvetica', 'bold');
      doc.text(`5.5 Placas de Sinalização de Emergência (${inspection.data.signs.length})`, 14, y);
      y += 6;
      doc.setFontSize(8);
      inspection.data.signs.forEach((sign, idx) => {
        checkNewPage(12);
        doc.setFont('helvetica', 'bold');
        doc.text(`${idx + 1}. ${sign.type}`, 14, y);
        doc.setFont('helvetica', 'normal');
        doc.text(`Existe: ${sign.exists ? 'Sim' : 'Não'} | Conforme CBM: ${sign.compliant ? 'Sim' : 'Não'} | Observações: ${sign.notes || 'Nenhuma'}`, 14, y + 4.5);
        doc.line(14, y + 6.5, 196, y + 6.5);
        y += 8;
      });
      y += 6;
    }

    // 6. Croqui
    drawSectionTitle("6. CROQUI E LEVANTAMENTO MÉTRICO DE CAMPO");
    checkNewPage(25);
    if (linkedSketch) {
      doc.setFont('helvetica', 'bold');
      doc.text(`Croqui Vinculado: ${linkedSketch.name}`, 14, y);
      doc.setFont('helvetica', 'normal');
      y += 5;
      doc.text(`ID do Croqui Técnico: ${linkedSketch.id.split('-')[1] || linkedSketch.id}`, 14, y);
      y += 5;
      const wallsCount = linkedSketch.elements?.filter(e => e.type === 'wall').length || 0;
      const measuresCount = linkedSketch.elements?.filter(e => e.type === 'measure').length || 0;
      const blocksCount = linkedSketch.elements?.filter(e => e.type === 'block').length || 0;
      doc.text(`Resumo do Levantamento Métrico: ${wallsCount} paredes desenhadas, ${measuresCount} cotas métricas, ${blocksCount} blocos de equipamentos inseridos.`, 14, y);
      y += 8;
    } else {
      doc.text("Nenhum croqui técnico foi desenhado ou vinculado a este laudo de vistoria de campo ainda.", 14, y);
      y += 8;
    }

    // Notes
    if (inspection.data?.generalNotes) {
      drawSectionTitle("7. CONSIDERAÇÕES FINAIS E RECOMENDAÇÕES");
      checkNewPage(30);
      doc.setFont('helvetica', 'normal');
      const lines = doc.splitTextToSize(inspection.data.generalNotes, 182);
      lines.forEach((line: string) => {
        checkNewPage(6);
        doc.text(line, 14, y);
        y += 5;
      });
      y += 10;
    }

    // Signatures block
    checkNewPage(40);
    y += 15;
    doc.setDrawColor(161, 161, 170);
    doc.line(14, y, 90, y);
    doc.line(120, y, 196, y);

    y += 5;
    doc.setFontSize(8);
    doc.setTextColor(0, 0, 0);
    doc.setFont('helvetica', 'bold');
    doc.text("RESPONSÁVEL TÉCNICO", 14, y);
    doc.setFont('helvetica', 'normal');
    doc.text("ALESSANDRO M. ZANDONÁ - ENGENHARIA DE SEGURANÇA", 14, y + 4);
    doc.text("CREA/RS • REGISTRO DE VISTORIA INTEGRADO", 14, y + 8);

    doc.setFont('helvetica', 'bold');
    doc.text("REPRESENTANTE LEGAL DO CLIENTE", 120, y);
    doc.setFont('helvetica', 'normal');
    doc.text((inspection.clientName || '').toUpperCase(), 120, y + 4);
    doc.text("ASSINATURA DO RESPONSÁVEL DO IMÓVEL", 120, y + 8);

    // Photo attachments rendering
    const photoEntries: { label: string; dataUrl: string }[] = [];
    if (inspection.data?.extinguishers) {
      inspection.data.extinguishers.forEach((ext, idx) => {
        if (ext.photos && ext.photos.length > 0) {
          ext.photos.forEach((photo, pIdx) => {
            photoEntries.push({ label: `Extintor #${ext.number || idx + 1} - Foto ${pIdx + 1}`, dataUrl: photo });
          });
        }
      });
    }
    if (inspection.data?.emergencyLights) {
      inspection.data.emergencyLights.forEach((light, idx) => {
        if (light.photos && light.photos.length > 0) {
          light.photos.forEach((photo, pIdx) => {
            photoEntries.push({ label: `Iluminação #${light.number || idx + 1} - Foto ${pIdx + 1}`, dataUrl: photo });
          });
        }
      });
    }
    if (inspection.data?.doorsAndExits) {
      inspection.data.doorsAndExits.forEach((door, idx) => {
        if (door.photos && door.photos.length > 0) {
          door.photos.forEach((photo, pIdx) => {
            photoEntries.push({ label: `Saída ${door.location || ''} - Foto ${pIdx + 1}`, dataUrl: photo });
          });
        }
      });
    }
    if (inspection.data?.environments) {
      inspection.data.environments.forEach((env, idx) => {
        if (env.photos && env.photos.length > 0) {
          env.photos.forEach((photo, pIdx) => {
            photoEntries.push({ label: `Ambiente ${env.name || ''} - Foto ${pIdx + 1}`, dataUrl: photo });
          });
        }
      });
    }
    if (inspection.data?.signs) {
      inspection.data.signs.forEach((sign, idx) => {
        if (sign.photos && sign.photos.length > 0) {
          sign.photos.forEach((photo, pIdx) => {
            photoEntries.push({ label: `Sinaliz. ${sign.type || ''} - Foto ${pIdx + 1}`, dataUrl: photo });
          });
        }
      });
    }

    if (photoEntries.length > 0) {
      doc.addPage();
      y = 20;
      doc.setFontSize(11);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(0, 0, 0);
      doc.text("ANEXO: REGISTRO FOTOGRÁFICO DE VISTORIA", 14, y);
      doc.setDrawColor(234, 88, 12); // Orange-600 line
      doc.line(14, y + 2, 196, y + 2);
      y += 15;

      let colIdx = 0;
      const imgWidth = 80;
      const imgHeight = 60;

      photoEntries.forEach((entry) => {
        if (y + imgHeight + 15 > 280) {
          doc.addPage();
          y = 20;
          colIdx = 0;
        }

        const posX = 14 + (colIdx * 90);

        try {
          doc.setFillColor(254, 215, 170); // soft orange background for placeholders
          doc.rect(posX, y, imgWidth, imgHeight, 'F');
          doc.setDrawColor(200, 200, 200);
          doc.rect(posX, y, imgWidth, imgHeight, 'D');

          doc.addImage(entry.dataUrl, 'JPEG', posX, y, imgWidth, imgHeight, undefined, 'FAST');
        } catch (err) {
          doc.setFontSize(8);
          doc.setTextColor(0, 0, 0);
          doc.text("[Imagem Anexa]", posX + 25, y + 30);
        }

        doc.setFontSize(8);
        doc.setTextColor(0, 0, 0);
        doc.setFont('helvetica', 'normal');
        doc.text(entry.label, posX, y + imgHeight + 5);

        colIdx++;
        if (colIdx === 2) {
          colIdx = 0;
          y += imgHeight + 15;
        }
      });
    }

    return doc;
  };

  const handlePrint = () => {
    const doc = generatePdfDocument();
    doc.save(`laudo_vistoria_campo_${(inspection.clientName || 'cliente').toLowerCase().replace(/\s+/g, '_')}.pdf`);
  };

  const handleSaveToDrive = async () => {
    setSavingDrive(true);
    setDriveSuccess('');
    try {
      const doc = generatePdfDocument();
      const pdfBlob = doc.output('blob');
      const fileName = `laudo_vistoria_${(inspection.clientName || 'cliente').toLowerCase().replace(/\s+/g, '_')}_${new Date().toISOString().slice(0, 10)}.pdf`;
      const pdfFile = new File([pdfBlob], fileName, { type: 'application/pdf' });
      const targetProjectId = inspection.projectId || inspection.id;
      
      await uploadFileToProject(targetProjectId, pdfFile, 'elaborado');
      setDriveSuccess('Laudo PDF enviado e salvo com sucesso no Google Drive!');
      setTimeout(() => setDriveSuccess(''), 6000);
    } catch (err: any) {
      console.error(err);
      alert('Erro ao enviar para o Google Drive: ' + (err.message || err));
    } finally {
      setSavingDrive(false);
    }
  };

  const renderPhotoThumbs = (photos?: string[]) => {
    if (!photos || photos.length === 0) return null;
    return (
      <div className="flex flex-wrap gap-1.5 mt-2">
        {photos.map((photo, idx) => (
          <div 
            key={idx} 
            className="relative w-12 h-12 rounded border border-zinc-700 overflow-hidden cursor-pointer hover:border-emerald-500 transition-colors group"
            onClick={() => setZoomedPhoto(photo)}
          >
            <img 
              src={photo} 
              alt="Miniatura" 
              className="w-full h-full object-cover group-hover:scale-110 transition-transform duration-200"
              referrerPolicy="no-referrer"
            />
            <div className="absolute inset-0 bg-black/40 opacity-0 group-hover:opacity-100 flex items-center justify-center transition-opacity">
              <Maximize2 className="w-3 h-3 text-white" />
            </div>
          </div>
        ))}
      </div>
    );
  };

  return (
    <div className="bg-zinc-950 border border-zinc-900 rounded-xl p-6 space-y-6 shadow-xl print:bg-white print:text-black print:border-none print:shadow-none print:p-0">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-zinc-900 pb-5 print:border-zinc-300">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <ClipboardCheck className="w-5 h-5 text-emerald-500 print:text-zinc-700" />
            <h2 className="text-lg font-bold text-white print:text-black">
              Laudo Técnico de Vistoria de Campo
            </h2>
            <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
              inspection.status === 'Concluída' 
                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 print:border-zinc-300 print:text-zinc-800' 
                : 'bg-amber-500/10 text-amber-400 border border-amber-500/20 print:border-zinc-300 print:text-zinc-800'
            }`}>
              {inspection.status}
            </span>
          </div>
          <p className="text-xs text-zinc-400 print:text-zinc-600">
            Relatório de levantamento de dados em loco para projetos de PPCI.
          </p>
        </div>
        
        <div className="flex flex-wrap items-center gap-2 print:hidden">
          <button
            onClick={() => {
              sessionStorage.setItem('draft_inspection', JSON.stringify(inspection));
              window.dispatchEvent(new CustomEvent('change-view', { detail: 'inspections' }));
            }}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-white bg-red-600 hover:bg-red-700 hover:scale-[1.02] active:scale-[0.98] rounded-lg transition-all cursor-pointer shrink-0"
          >
            <Edit2 className="w-4 h-4" />
            Editar Laudo
          </button>

          <button
            onClick={handleSaveToDrive}
            disabled={savingDrive}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-blue-300 hover:text-white bg-blue-950/60 hover:bg-blue-900/80 border border-blue-800/80 rounded-lg transition-all cursor-pointer shrink-0 disabled:opacity-50"
            title="Salvar cópia em PDF na pasta do projeto no Google Drive"
          >
            {savingDrive ? <Loader2 className="w-4 h-4 animate-spin text-blue-400" /> : <Cloud className="w-4 h-4 text-blue-400" />}
            <span>Salvar no Google Drive</span>
          </button>

          <button
            onClick={handlePrint}
            className="flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-zinc-300 hover:text-white bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 rounded-lg transition-all cursor-pointer shrink-0"
          >
            <Printer className="w-4 h-4" />
            Imprimir Laudo
          </button>
        </div>
      </div>

      {driveSuccess && (
        <div className="p-3 bg-emerald-950/80 border border-emerald-800 rounded-xl text-xs text-emerald-300 flex items-center gap-2 animate-in fade-in duration-200">
          <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
          <span>{driveSuccess}</span>
        </div>
      )}

      {/* Meta Info Grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 bg-zinc-900/30 p-4 rounded-xl border border-zinc-900/50 print:bg-zinc-100 print:border-zinc-300 print:text-black">
        <div className="space-y-1">
          <span className="text-[10px] text-zinc-500 uppercase font-semibold block">Vistoriador</span>
          <div className="flex items-center gap-1.5">
            <User className="w-3.5 h-3.5 text-zinc-400" />
            <span className="text-xs font-medium text-zinc-200 print:text-black">{inspection.inspector || 'Não informado'}</span>
          </div>
        </div>
        <div className="space-y-1">
          <span className="text-[10px] text-zinc-500 uppercase font-semibold block">Data da Vistoria</span>
          <div className="flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5 text-zinc-400" />
            <span className="text-xs font-medium text-zinc-200 print:text-black">{inspection.date}</span>
          </div>
        </div>
        <div className="space-y-1 col-span-2">
          <span className="text-[10px] text-zinc-500 uppercase font-semibold block">Endereço & Cidade</span>
          <div className="flex items-center gap-1.5">
            <MapPin className="w-3.5 h-3.5 text-zinc-400" />
            <span className="text-xs font-medium text-zinc-200 truncate print:text-black">
              {inspection.address}, {inspection.city}
            </span>
          </div>
        </div>
      </div>

      {/* 1. Identificação da Edificação */}
      <div className="border border-zinc-900 rounded-xl overflow-hidden print:border-zinc-300">
        <button
          type="button"
          onClick={() => toggleSection('identificacao')}
          className="w-full flex items-center justify-between p-4 bg-zinc-900/20 hover:bg-zinc-900/40 text-left transition-colors print:bg-zinc-100"
        >
          <div className="flex items-center gap-2">
            <Building className="w-4 h-4 text-emerald-400 print:text-zinc-700" />
            <h3 className="text-sm font-bold text-white print:text-black">1. Identificação da Edificação</h3>
          </div>
          {openSections.identificacao ? <ChevronUp className="w-4 h-4 text-zinc-400 print:hidden" /> : <ChevronDown className="w-4 h-4 text-zinc-400 print:hidden" />}
        </button>

        {openSections.identificacao && (
          <div className="p-4 border-t border-zinc-900 space-y-4 print:border-zinc-300">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="space-y-0.5">
                <span className="text-[10px] text-zinc-500 font-medium">Atividade Principal</span>
                <p className="text-xs text-zinc-200 print:text-black font-semibold">{inspection.data?.activity || 'Não informada'}</p>
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] text-zinc-500 font-medium">Área Construída</span>
                <p className="text-xs text-zinc-200 print:text-black font-semibold">{inspection.data?.builtArea ? `${inspection.data.builtArea} m²` : 'Não informada'}</p>
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] text-zinc-500 font-medium">Área do Terreno</span>
                <p className="text-xs text-zinc-200 print:text-black font-semibold">{inspection.data?.landArea ? `${inspection.data.landArea} m²` : 'Não informada'}</p>
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] text-zinc-500 font-medium font-semibold">Pavimentos</span>
                <p className="text-xs text-zinc-200 print:text-black font-semibold">{inspection.data?.floors || 'Não informado'}</p>
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] text-zinc-500 font-medium">Altura Aproximada</span>
                <p className="text-xs text-zinc-200 print:text-black font-semibold">{inspection.data?.height || 'Não informada'}</p>
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] text-zinc-500 font-medium font-semibold">Pé-direito</span>
                <p className="text-xs text-zinc-200 print:text-black font-semibold">{inspection.data?.ceilingHeight || 'Não informado'}</p>
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] text-zinc-500 font-medium">Ano de Construção</span>
                <p className="text-xs text-zinc-200 print:text-black font-semibold">{inspection.data?.constructionYear || 'Não informado'}</p>
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] text-zinc-500 font-medium">Tipo de Construção</span>
                <p className="text-xs text-zinc-200 print:text-black font-semibold">{inspection.data?.constructionType || 'Não informado'}</p>
              </div>
            </div>

            <div className="flex flex-wrap gap-2 pt-2 border-t border-zinc-900/50 print:border-zinc-200">
              {inspection.data?.hasMezzanine && (
                <span className="text-[10px] font-bold px-2.5 py-1 bg-zinc-900 text-zinc-300 rounded border border-zinc-800 print:bg-zinc-100 print:text-black print:border-zinc-300">
                  Possui Mezanino
                </span>
              )}
              {inspection.data?.hasBasement && (
                <span className="text-[10px] font-bold px-2.5 py-1 bg-zinc-900 text-zinc-300 rounded border border-zinc-800 print:bg-zinc-100 print:text-black print:border-zinc-300">
                  Possui Subsolo
                </span>
              )}
              {inspection.data?.hasStorage && (
                <span className="text-[10px] font-bold px-2.5 py-1 bg-zinc-900 text-zinc-300 rounded border border-zinc-800 print:bg-zinc-100 print:text-black print:border-zinc-300">
                  Possui Depósito / Estoque
                </span>
              )}
              {!inspection.data?.hasMezzanine && !inspection.data?.hasBasement && !inspection.data?.hasStorage && (
                <span className="text-xs text-zinc-500 italic">Sem outras estruturas especiais cadastradas.</span>
              )}
            </div>
          </div>
        )}
      </div>

      {/* 2. Análise do Entorno */}
      <div className="border border-zinc-900 rounded-xl overflow-hidden print:border-zinc-300">
        <button
          type="button"
          onClick={() => toggleSection('entorno')}
          className="w-full flex items-center justify-between p-4 bg-zinc-900/20 hover:bg-zinc-900/40 text-left transition-colors print:bg-zinc-100"
        >
          <div className="flex items-center gap-2">
            <Home className="w-4 h-4 text-emerald-400 print:text-zinc-700" />
            <h3 className="text-sm font-bold text-white print:text-black">2. Características do Entorno</h3>
          </div>
          {openSections.entorno ? <ChevronUp className="w-4 h-4 text-zinc-400 print:hidden" /> : <ChevronDown className="w-4 h-4 text-zinc-400 print:hidden" />}
        </button>

        {openSections.entorno && (
          <div className="p-4 border-t border-zinc-900 space-y-3 print:border-zinc-300">
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
              {[
                { label: 'Edificação Isolada', val: inspection.data?.isolatedBuilding },
                { label: 'Acesso Lateral', val: inspection.data?.sideAccess },
                { label: 'Acesso Fundos', val: inspection.data?.backAccess },
                { label: 'Acesso p/ Viatura do CBM', val: inspection.data?.fireTruckAccess },
                { label: 'Hidrante Público Próximo', val: inspection.data?.publicHydrant },
                { label: 'Vizinhos Encostados', val: inspection.data?.attachedNeighbors },
                { label: 'Risco Externo', val: inspection.data?.externalRisk },
              ].map((item, idx) => (
                <div key={idx} className="flex items-center gap-2 bg-zinc-900/30 p-2.5 rounded-lg border border-zinc-900 print:border-zinc-200 print:bg-transparent">
                  {item.val ? (
                    <Check className="w-4 h-4 text-emerald-500 shrink-0" />
                  ) : (
                    <X className="w-4 h-4 text-zinc-600 shrink-0 print:text-zinc-300" />
                  )}
                  <span className={`text-xs ${item.val ? 'text-zinc-200 font-semibold print:text-black' : 'text-zinc-500'}`}>
                    {item.label}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 3. Ocupação e Funcionamento */}
      <div className="border border-zinc-900 rounded-xl overflow-hidden print:border-zinc-300">
        <button
          type="button"
          onClick={() => toggleSection('ocupacao')}
          className="w-full flex items-center justify-between p-4 bg-zinc-900/20 hover:bg-zinc-900/40 text-left transition-colors print:bg-zinc-100"
        >
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-emerald-400 print:text-zinc-700" />
            <h3 className="text-sm font-bold text-white print:text-black">3. Ocupação, Atividade & Funcionamento</h3>
          </div>
          {openSections.ocupacao ? <ChevronUp className="w-4 h-4 text-zinc-400 print:hidden" /> : <ChevronDown className="w-4 h-4 text-zinc-400 print:hidden" />}
        </button>

        {openSections.ocupacao && (
          <div className="p-4 border-t border-zinc-900 space-y-4 print:border-zinc-300">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="space-y-0.5">
                <span className="text-[10px] text-zinc-500 font-medium">Funcionários</span>
                <p className="text-xs text-zinc-200 print:text-black font-semibold">{inspection.data?.employees || 'Não informado'}</p>
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] text-zinc-500 font-medium">Público Máximo estimado</span>
                <p className="text-xs text-zinc-200 print:text-black font-semibold">{inspection.data?.maxPublic || 'Não informado'}</p>
              </div>
              <div className="space-y-0.5">
                <span className="text-[10px] text-zinc-500 font-medium">Horário de Funcionamento</span>
                <p className="text-xs text-zinc-200 print:text-black font-semibold">{inspection.data?.operatingHours || 'Não informado'}</p>
              </div>
              <div className="space-y-0.5 col-span-2 sm:col-span-1">
                <span className="text-[10px] text-zinc-500 font-medium">Atividade Desenvolvida</span>
                <p className="text-xs text-zinc-200 print:text-black font-semibold truncate" title={inspection.data?.developedActivity}>
                  {inspection.data?.developedActivity || 'Não informada'}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 pt-2 border-t border-zinc-900/50 print:border-zinc-200">
              {[
                { label: 'Possui Estoque', val: inspection.data?.hasStock },
                { label: 'Possui Escritório', val: inspection.data?.hasOffice },
                { label: 'Possui Cozinha industrial', val: inspection.data?.hasKitchen },
                { label: 'Possui Banheiros', val: inspection.data?.hasBathrooms },
              ].map((item, idx) => (
                <div key={idx} className="flex items-center gap-2 p-2 bg-zinc-900/10 rounded border border-zinc-900/50 print:border-zinc-200 print:bg-transparent">
                  {item.val ? <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" /> : <X className="w-3.5 h-3.5 text-zinc-600 shrink-0 print:text-zinc-300" />}
                  <span className={`text-xs ${item.val ? 'text-zinc-200 font-semibold print:text-black' : 'text-zinc-500'}`}>{item.label}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* 4. Instalações Elétricas & Cobertura */}
      <div className="border border-zinc-900 rounded-xl overflow-hidden print:border-zinc-300">
        <button
          type="button"
          onClick={() => toggleSection('eletrica')}
          className="w-full flex items-center justify-between p-4 bg-zinc-900/20 hover:bg-zinc-900/40 text-left transition-colors print:bg-zinc-100"
        >
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-emerald-400 print:text-zinc-700" />
            <h3 className="text-sm font-bold text-white print:text-black">4. Instalações Elétricas & Cobertura</h3>
          </div>
          {openSections.eletrica ? <ChevronUp className="w-4 h-4 text-zinc-400 print:hidden" /> : <ChevronDown className="w-4 h-4 text-zinc-400 print:hidden" />}
        </button>

        {openSections.eletrica && (
          <div className="p-4 border-t border-zinc-900 space-y-4 print:border-zinc-300">
            {/* Electrical indicators */}
            {inspection.data?.electrical && (
              <div className="space-y-2">
                <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Instalações Elétricas</h4>
                <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5">
                  {[
                    { label: 'QDC Identificado', val: inspection.data.electrical.identifiedBoard },
                    { label: 'Disjuntores Identificados', val: inspection.data.electrical.identifiedBreakers },
                    { label: 'Sem fiação exposta', val: !inspection.data.electrical.exposedWiring, isInverse: true },
                    { label: 'Sem adaptadores ("Benjamins")', val: !inspection.data.electrical.useOfAdapters, isInverse: true },
                    { label: 'Sem extensões permanentes', val: !inspection.data.electrical.permanentExtensions, isInverse: true },
                    { label: 'Sem tomadas sobrecarregadas', val: !inspection.data.electrical.overloadedOutlets, isInverse: true },
                    { label: 'Seguro para Equip. Alta Potência', val: !inspection.data.electrical.highPowerEquipment, isInverse: true },
                  ].map((item, idx) => (
                    <div key={idx} className="flex items-center gap-2 p-2 bg-zinc-900/20 rounded border border-zinc-900 print:border-zinc-200 print:bg-transparent">
                      {item.val ? (
                        <Check className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                      ) : (
                        <AlertTriangle className="w-3.5 h-3.5 text-amber-500 shrink-0" />
                      )}
                      <span className={`text-xs ${item.val ? 'text-zinc-300 print:text-black' : 'text-amber-500 font-semibold'}`}>
                        {item.label}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Roofing */}
            {inspection.data?.roofing && (
              <div className="pt-3 border-t border-zinc-900/50 space-y-2 print:border-zinc-200">
                <h4 className="text-xs font-semibold text-zinc-400 uppercase tracking-wider">Estrutura e Cobertura</h4>
                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 bg-zinc-900/10 p-3 rounded-lg border border-zinc-900/60 print:bg-transparent print:border-zinc-200">
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-zinc-500">Estrutura de Apoio</span>
                    <p className="text-xs font-semibold text-zinc-200 print:text-black">{inspection.data.roofing.structure || 'Não informada'}</p>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-zinc-500">Material do Telhado</span>
                    <p className="text-xs font-semibold text-zinc-200 print:text-black">{inspection.data.roofing.roof || 'Não informado'}</p>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-zinc-500">Material do Forro</span>
                    <p className="text-xs font-semibold text-zinc-200 print:text-black">{inspection.data.roofing.ceiling || 'Não informado'}</p>
                  </div>
                  <div className="space-y-0.5">
                    <span className="text-[10px] text-zinc-500">Estado de Conservação</span>
                    <p className="text-xs font-semibold text-zinc-200 print:text-black">{inspection.data.roofing.condition || 'Não informado'}</p>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 5. Sistemas de Segurança e Equipamentos Levantados */}
      <div className="border border-zinc-900 rounded-xl overflow-hidden print:border-zinc-300">
        <button
          type="button"
          onClick={() => toggleSection('sistemas')}
          className="w-full flex items-center justify-between p-4 bg-zinc-900/20 hover:bg-zinc-900/40 text-left transition-colors print:bg-zinc-100"
        >
          <div className="flex items-center gap-2">
            <ShieldAlert className="w-4 h-4 text-emerald-400 print:text-zinc-700" />
            <h3 className="text-sm font-bold text-white print:text-black">5. Sistemas Levantados em Campo</h3>
          </div>
          {openSections.sistemas ? <ChevronUp className="w-4 h-4 text-zinc-400 print:hidden" /> : <ChevronDown className="w-4 h-4 text-zinc-400 print:hidden" />}
        </button>

        {openSections.sistemas && (
          <div className="p-4 border-t border-zinc-900 space-y-6 print:border-zinc-300">
            {/* Extinguidores */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5 border-b border-zinc-900 pb-1.5 print:border-zinc-200 print:text-black">
                🚒 Extintores de Incêndio ({inspection.data?.extinguishers?.length || 0})
              </h4>
              {inspection.data?.extinguishers && inspection.data.extinguishers.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-zinc-300 print:text-black">
                    <thead>
                      <tr className="bg-zinc-900/50 text-zinc-400 font-semibold uppercase text-[10px] print:bg-zinc-100 print:text-zinc-700">
                        <th className="p-2 w-12 text-center">Nº</th>
                        <th className="p-2">Tipo / Agente</th>
                        <th className="p-2">Capacidade</th>
                        <th className="p-2">Localização</th>
                        <th className="p-2">Validade</th>
                        <th className="p-2 text-center">Pressão</th>
                        <th className="p-2 text-center">Sinalizado</th>
                        <th className="p-2">Fotos</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-900 print:divide-zinc-200">
                      {inspection.data.extinguishers.map((ext, idx) => (
                        <tr key={idx} className="hover:bg-zinc-900/10">
                          <td className="p-2 font-bold text-center text-zinc-400 print:text-zinc-800">{ext.number || idx + 1}</td>
                          <td className="p-2 font-semibold text-zinc-100 print:text-black">{ext.type || '-'}</td>
                          <td className="p-2">{ext.capacity || '-'}</td>
                          <td className="p-2">{ext.location || '-'}</td>
                          <td className="p-2">{ext.expiration || '-'}</td>
                          <td className="p-2 text-center">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              ext.pressure === 'Adequada' ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                            }`}>
                              {ext.pressure || '-'}
                            </span>
                          </td>
                          <td className="p-2 text-center">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              ext.signaled ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                            }`}>
                              {ext.signaled ? 'Sim' : 'Não'}
                            </span>
                          </td>
                          <td className="p-2">
                            {renderPhotoThumbs(ext.photos)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-xs text-zinc-500 italic">Nenhum extintor cadastrado na vistoria de campo.</p>
              )}
            </div>

            {/* Iluminação de Emergência */}
            <div className="space-y-2 pt-2">
              <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5 border-b border-zinc-900 pb-1.5 print:border-zinc-200 print:text-black">
                💡 Iluminação de Emergência ({inspection.data?.emergencyLights?.length || 0})
              </h4>
              {inspection.data?.emergencyLights && inspection.data.emergencyLights.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-zinc-300 print:text-black">
                    <thead>
                      <tr className="bg-zinc-900/50 text-zinc-400 font-semibold uppercase text-[10px] print:bg-zinc-100 print:text-zinc-700">
                        <th className="p-2 w-12 text-center">Nº</th>
                        <th className="p-2">Localização</th>
                        <th className="p-2 text-center">Funciona</th>
                        <th className="p-2">Distância entre blocos (m)</th>
                        <th className="p-2">Observações</th>
                        <th className="p-2">Fotos</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-900 print:divide-zinc-200">
                      {inspection.data.emergencyLights.map((light, idx) => (
                        <tr key={idx} className="hover:bg-zinc-900/10">
                          <td className="p-2 font-bold text-center text-zinc-400 print:text-zinc-800">{light.number || idx + 1}</td>
                          <td className="p-2 font-semibold text-zinc-100 print:text-black">{light.location || '-'}</td>
                          <td className="p-2 text-center">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              light.works ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                            }`}>
                              {light.works ? 'Sim' : 'Não'}
                            </span>
                          </td>
                          <td className="p-2 text-center">{light.distance || '-'}</td>
                          <td className="p-2 text-zinc-400 print:text-zinc-600">{light.notes || '-'}</td>
                          <td className="p-2">
                            {renderPhotoThumbs(light.photos)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-xs text-zinc-500 italic">Nenhuma iluminação de emergência cadastrada.</p>
              )}
            </div>

            {/* Saídas e Portas de Emergência */}
            <div className="space-y-2 pt-2">
              <h4 className="text-xs font-bold text-zinc-400 uppercase tracking-wider flex items-center gap-1.5 border-b border-zinc-900 pb-1.5 print:border-zinc-200 print:text-black">
                🚪 Portas, Saídas & Rotas de Fuga ({inspection.data?.doorsAndExits?.length || 0})
              </h4>
              {inspection.data?.doorsAndExits && inspection.data.doorsAndExits.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-zinc-300 print:text-black">
                    <thead>
                      <tr className="bg-zinc-900/50 text-zinc-400 font-semibold uppercase text-[10px] print:bg-zinc-100 print:text-zinc-700">
                        <th className="p-2">Localização</th>
                        <th className="p-2 text-center">Largura (m)</th>
                        <th className="p-2 text-center">Altura (m)</th>
                        <th className="p-2 text-center">Abre para fora</th>
                        <th className="p-2 text-center">Barra Antipânico</th>
                        <th className="p-2">Observações</th>
                        <th className="p-2">Fotos</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-900 print:divide-zinc-200">
                      {inspection.data.doorsAndExits.map((door, idx) => (
                        <tr key={idx} className="hover:bg-zinc-900/10">
                          <td className="p-2 font-semibold text-zinc-100 print:text-black">{door.location || '-'}</td>
                          <td className="p-2 text-center">{door.width || '-'}</td>
                          <td className="p-2 text-center">{door.height || '-'}</td>
                          <td className="p-2 text-center">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              door.opensOutward ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'
                            }`}>
                              {door.opensOutward ? 'Sim' : 'Não'}
                            </span>
                          </td>
                          <td className="p-2 text-center">
                            <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                              door.panicBar ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'
                            }`}>
                              {door.panicBar ? 'Possui' : 'Não possui'}
                            </span>
                          </td>
                          <td className="p-2 text-zinc-400 print:text-zinc-600">{door.notes || '-'}</td>
                          <td className="p-2">
                            {renderPhotoThumbs(door.photos)}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              ) : (
                <p className="text-xs text-zinc-500 italic">Nenhuma porta ou saída cadastrada.</p>
              )}
            </div>

            {/* Outros Sistemas - Corredores, Ambientes, Sinalizações em grid resumido */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6 pt-2">
              {/* Ambientes */}
              <div className="space-y-2 bg-zinc-900/10 p-3 rounded-lg border border-zinc-900/80 print:border-zinc-200">
                <h5 className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider print:text-black">🏬 Ambientes Vistoriados ({inspection.data?.environments?.length || 0})</h5>
                {inspection.data?.environments && inspection.data.environments.length > 0 ? (
                  <ul className="space-y-2 divide-y divide-zinc-900 text-xs print:divide-zinc-200">
                    {inspection.data.environments.map((env, idx) => (
                      <li key={idx} className="pt-1.5 first:pt-0">
                        <div className="flex justify-between font-medium">
                          <span className="text-zinc-100 print:text-black">{env.name}</span>
                          <span className="text-zinc-400 print:text-zinc-700">{env.area ? `${env.area}m²` : ''} {env.ceilingHeight ? `| PD: ${env.ceilingHeight}m` : ''}</span>
                        </div>
                        {env.notes && <p className="text-[10px] text-zinc-500 mt-0.5">{env.notes}</p>}
                        {renderPhotoThumbs(env.photos)}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-[11px] text-zinc-600 italic">Nenhum ambiente registrado.</p>
                )}
              </div>

              {/* Sinalização */}
              <div className="space-y-2 bg-zinc-900/10 p-3 rounded-lg border border-zinc-900/80 print:border-zinc-200">
                <h5 className="text-[11px] font-bold text-zinc-400 uppercase tracking-wider print:text-black">🪧 Sinalização de Emergência ({inspection.data?.signs?.length || 0})</h5>
                {inspection.data?.signs && inspection.data.signs.length > 0 ? (
                  <ul className="space-y-2 divide-y divide-zinc-900 text-xs print:divide-zinc-200">
                    {inspection.data.signs.map((sign, idx) => (
                      <li key={idx} className="pt-1.5 first:pt-0 flex flex-col">
                        <div className="flex justify-between items-center">
                          <span className="text-zinc-100 font-medium print:text-black">{sign.type}</span>
                          <div className="flex gap-1">
                            <span className={`px-1 rounded text-[9px] font-bold ${sign.exists ? 'bg-emerald-500/10 text-emerald-400' : 'bg-red-500/10 text-red-400'}`}>
                              {sign.exists ? 'Existe' : 'Inexistente'}
                            </span>
                            {sign.exists && (
                              <span className={`px-1 rounded text-[9px] font-bold ${sign.compliant ? 'bg-emerald-500/10 text-emerald-400' : 'bg-amber-500/10 text-amber-400'}`}>
                                {sign.compliant ? 'Em Conformidade' : 'Inadequada'}
                              </span>
                            )}
                          </div>
                        </div>
                        {sign.notes && <p className="text-[10px] text-zinc-500 mt-0.5">{sign.notes}</p>}
                        {renderPhotoThumbs(sign.photos)}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-[11px] text-zinc-600 italic">Nenhuma placa de sinalização cadastrada.</p>
                )}
              </div>
            </div>

            {/* General Notes */}
            {inspection.data?.generalNotes && (
              <div className="p-3 bg-zinc-900/30 border border-zinc-900 rounded-lg space-y-1 print:border-zinc-200">
                <span className="text-[10px] font-bold uppercase tracking-wider text-zinc-500">Observações Gerais da Vistoria</span>
                <p className="text-xs text-zinc-300 print:text-black whitespace-pre-line">{inspection.data.generalNotes}</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* 6. Croqui e Esboço Arquitetônico de Campo */}
      <div className="border border-zinc-900 rounded-xl overflow-hidden print:border-zinc-300">
        <button
          type="button"
          onClick={() => toggleSection('croqui')}
          className="w-full flex items-center justify-between p-4 bg-zinc-900/20 hover:bg-zinc-900/40 text-left transition-colors print:bg-zinc-100"
        >
          <div className="flex items-center gap-2">
            <Layers className="w-4 h-4 text-emerald-400 print:text-zinc-700" />
            <h3 className="text-sm font-bold text-white print:text-black">6. Croqui / Esboço Arquitetônico do Local</h3>
          </div>
          {openSections.croqui ? <ChevronUp className="w-4 h-4 text-zinc-400 print:hidden" /> : <ChevronDown className="w-4 h-4 text-zinc-400 print:hidden" />}
        </button>

        {openSections.croqui && (
          <div className="p-4 border-t border-zinc-900 space-y-3 print:border-zinc-300">
            {linkedSketch ? (
              <div className="bg-zinc-900 p-4 rounded-lg border border-zinc-800 space-y-3 print:bg-transparent print:border-zinc-300">
                <div className="flex justify-between items-center border-b border-zinc-800/60 pb-2 print:border-zinc-200">
                  <div className="space-y-0.5">
                    <h4 className="text-xs font-semibold text-zinc-100 print:text-black">{linkedSketch.name}</h4>
                    <p className="text-[10px] text-zinc-500">Croqui gerado para a vistoria técnica e levantamento métrico.</p>
                  </div>
                  <span className="text-[10px] font-semibold text-zinc-400 bg-zinc-950/80 px-2 py-0.5 rounded border border-zinc-800 print:bg-zinc-100 print:text-black print:border-zinc-300">
                    ID do Croqui: {linkedSketch.id.split('-')[1] || linkedSketch.id}
                  </span>
                </div>

                {/* Metrics counts */}
                <div className="grid grid-cols-3 gap-2.5 text-center">
                  <div className="bg-zinc-950/30 p-2 rounded border border-zinc-900/80 print:bg-transparent print:border-zinc-200">
                    <span className="text-[10px] text-zinc-500 block">Paredes</span>
                    <span className="text-xs font-bold text-zinc-200 print:text-black">
                      {linkedSketch.elements?.filter(e => e.type === 'wall').length || 0} linhas
                    </span>
                  </div>
                  <div className="bg-zinc-950/30 p-2 rounded border border-zinc-900/80 print:bg-transparent print:border-zinc-200">
                    <span className="text-[10px] text-zinc-500 block">Medidas de Campo</span>
                    <span className="text-xs font-bold text-zinc-200 print:text-black">
                      {linkedSketch.elements?.filter(e => e.type === 'measure').length || 0} cotas
                    </span>
                  </div>
                  <div className="bg-zinc-950/30 p-2 rounded border border-zinc-900/80 print:bg-transparent print:border-zinc-200">
                    <span className="text-[10px] text-zinc-500 block">Blocos de PPCI</span>
                    <span className="text-xs font-bold text-zinc-200 print:text-black">
                      {linkedSketch.elements?.filter(e => e.type === 'block').length || 0} itens
                    </span>
                  </div>
                </div>

                <div className="p-3 bg-emerald-500/5 text-emerald-400/80 rounded border border-emerald-500/10 text-[11px] flex items-start gap-2 print:border-zinc-200 print:text-black">
                  <Check className="w-4 h-4 text-emerald-500 shrink-0 mt-0.5" />
                  <p>O croqui está vinculado com sucesso e pode ser visualizado ou editado na aba <strong>Checklist de Vistorias</strong>.</p>
                </div>
              </div>
            ) : (
              <div className="bg-zinc-900/30 border border-dashed border-zinc-800 p-4 rounded-lg text-center text-zinc-500 print:border-zinc-300">
                <Layers className="w-6 h-6 mx-auto mb-1.5 opacity-40" />
                <p className="text-xs">Nenhum croqui/desenho vinculado a esta vistoria ainda.</p>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Lightbox / Zoomed image Modal */}
      {zoomedPhoto && (
        <div 
          className="fixed inset-0 bg-black/95 flex items-center justify-center p-4 z-[110] animate-in fade-in duration-200 cursor-zoom-out print:hidden"
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
    </div>
  );
}
