import React, { useState } from 'react';
import { useStore } from '../store';
import { Calendar as CalendarIcon, Plus, CheckCircle2, Circle, Clock, Building, X, ChevronLeft, ChevronRight, Download } from 'lucide-react';
import { AgendaEvent } from '../types';
import { jsPDF } from 'jspdf';

export function AgendaView() {
  const { data, updateData } = useStore();
  const [showAddForm, setShowAddForm] = useState(false);
  const [selectedDateFilter, setSelectedDateFilter] = useState<string | null>(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [viewMode, setViewMode] = useState<'week' | 'month'>('month');
  const [newEvent, setNewEvent] = useState<Partial<AgendaEvent>>({
    title: '',
    date: new Date().toISOString().split('T')[0],
    time: '',
    type: 'Vistoria',
    projectId: '',
  });

  const handleAddEvent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newEvent.title || !newEvent.date) return;

    const event: AgendaEvent = {
      id: `ev-${Date.now()}`,
      title: newEvent.title,
      date: newEvent.date,
      time: newEvent.time,
      type: newEvent.type as any,
      projectId: newEvent.projectId || undefined,
      completed: false,
    };

    updateData({ agenda: [...data.agenda, event] });
    setShowAddForm(false);
    setNewEvent({
      title: '',
      date: new Date().toISOString().split('T')[0],
      time: '',
      type: 'Vistoria',
      projectId: '',
    });
  };

  const toggleComplete = (id: string) => {
    if (id.startsWith('proj-act-')) {
      const parts = id.split('-');
      // parts will be: ['proj', 'act', 'projectId', 'actionKey']
      const projectId = parts[2];
      const actionKey = parts[3];
      const updatedProjects = data.projects.map(p => {
        if (p.id === projectId) {
          const existingActions = (p.actions || {}) as Record<string, { date: string; checked: boolean }>;
          const act = existingActions[actionKey] || { date: '', checked: false };
          return {
            ...p,
            actions: {
              ...existingActions,
              [actionKey]: { ...act, checked: !act.checked }
            }
          };
        }
        return p;
      });
      updateData({ projects: updatedProjects });
      return;
    }

    if (id.startsWith('ext-')) {
      // parts will be: ['ext', 'clientId', 'extinguisherId']
      const parts = id.split('-');
      if (parts.length >= 3) {
        const clientId = parts[1];
        const extId = parts[2];
        const updatedClients = (data.clients || []).map(c => {
          if (c.id === clientId) {
            const updatedExts = (c.extinguishers || []).map(ext => {
              if (ext.id === extId) {
                const todayStr = new Date().toISOString().split('T')[0];
                const nextYear = new Date();
                nextYear.setFullYear(nextYear.getFullYear() + 1);
                const nextYearStr = nextYear.toISOString().split('T')[0];
                return {
                  ...ext,
                  lastRecharge: todayStr,
                  nextRecharge: nextYearStr
                };
              }
              return ext;
            });
            return { ...c, extinguishers: updatedExts };
          }
          return c;
        });
        updateData({ clients: updatedClients });
      }
      return;
    }

    const updated = data.agenda.map((a) =>
      a.id === id ? { ...a, completed: !a.completed } : a
    );
    updateData({ agenda: updated });
  };

  const allEvents = [...data.agenda];
  
  const todayDate = new Date();
  todayDate.setHours(0,0,0,0);

  if (data.projects) {
    data.projects.forEach(project => {
      if (project.actions) {
        Object.entries(project.actions).forEach(([actionKey, entry]) => {
          const actionVal = entry as { date: string; checked: boolean } | undefined;
          if (actionVal && actionVal.date) {
            const actionName = actionKey === 'reprovada' ? 'Reprovada' :
                               actionKey === 'vistoria' ? 'Vistoria' :
                               actionKey === 'orcamento' ? 'Orçamento' :
                               actionKey === 'aprovado' ? 'Aprovado' :
                               actionKey === 'entrega' ? 'Entrega' : actionKey;
            allEvents.push({
              id: `proj-act-${project.id}-${actionKey}`,
              title: `${actionName}: ${project.clientName} (${project.type || 'PPCI'})`,
              date: actionVal.date,
              type: actionName as any,
              completed: actionVal.checked || false,
              projectId: project.id
            });
          }
        });
      }
    });
  }

  if (data.clients) {
    data.clients.forEach(client => {
      if (client.extinguishers) {
        client.extinguishers.forEach(ext => {
          if (ext.nextRecharge) {
            allEvents.push({
              id: `ext-${client.id}-${ext.id}`,
              title: `Recarga: Extintor ${ext.type} (${client.name})`,
              date: ext.nextRecharge,
              type: 'Manutenção',
              completed: false,
              warningDays: ext.warningDays ?? 30,
            } as any);
          }
        });
      }
    });
  }

  const sortedEvents = allEvents.sort(
    (a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()
  );

  const upcomingEvents = sortedEvents.filter((e) => !e.completed);
  const completedEvents = sortedEvents.filter((e) => e.completed && !e.id.startsWith('ext-'));

  const displayEvents = selectedDateFilter 
    ? upcomingEvents.filter(e => e.date === selectedDateFilter)
    : upcomingEvents.filter(e => {
        if (e.id.startsWith('ext-')) {
           const nextRecharge = new Date(e.date + 'T00:00:00');
           const diffTime = nextRecharge.getTime() - todayDate.getTime();
           const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
           const warningDays = (e as any).warningDays ?? 30;
           return diffDays <= warningDays;
        }
        return true;
      });

  const today = new Date();

  // Navigation Logic
  const handlePrev = () => {
    const newDate = new Date(currentDate);
    if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() - 7);
    } else {
      newDate.setMonth(newDate.getMonth() - 1);
    }
    setCurrentDate(newDate);
  };

  const handleNext = () => {
    const newDate = new Date(currentDate);
    if (viewMode === 'week') {
      newDate.setDate(newDate.getDate() + 7);
    } else {
      newDate.setMonth(newDate.getMonth() + 1);
    }
    setCurrentDate(newDate);
  };

  // Generate calendar days
  let displayDays: Date[] = [];
  const startOfWeek = new Date(currentDate);
  startOfWeek.setDate(currentDate.getDate() - currentDate.getDay());
  
  if (viewMode === 'week') {
    displayDays = Array.from({ length: 7 }).map((_, i) => {
      const d = new Date(startOfWeek);
      d.setDate(startOfWeek.getDate() + i);
      return d;
    });
  } else {
    const firstDayOfMonth = new Date(currentDate.getFullYear(), currentDate.getMonth(), 1);
    const startDay = firstDayOfMonth.getDay();
    const startOfCalendar = new Date(firstDayOfMonth);
    startOfCalendar.setDate(firstDayOfMonth.getDate() - startDay);
    
    // Always show 6 weeks (42 days) to cover any month configuration
    displayDays = Array.from({ length: 42 }).map((_, i) => {
      const d = new Date(startOfCalendar);
      d.setDate(startOfCalendar.getDate() + i);
      return d;
    });
  }

  const getEventColorClass = (type: string) => {
    switch (type) {
      case 'Vistoria': return 'bg-amber-500';
      case 'Orçamento': return 'bg-sky-500';
      case 'Aprovado': return 'bg-emerald-500';
      case 'Reprovada': return 'bg-rose-500';
      case 'Entrega': return 'bg-indigo-500';
      case 'Prazo': return 'bg-red-500';
      case 'Protocolo': return 'bg-blue-500';
      case 'Reunião': return 'bg-purple-500';
      case 'Visita': return 'bg-emerald-500';
      case 'Manutenção': return 'bg-orange-500';
      default: return 'bg-zinc-500';
    }
  };

  const getTypeStyle = (type: string) => {
    switch (type) {
      case 'Prazo':
        return 'bg-red-950 text-red-500 border-red-900';
      case 'Vistoria':
        return 'bg-amber-950 text-amber-500 border-amber-900';
      case 'Orçamento':
        return 'bg-sky-950 text-sky-400 border-sky-900';
      case 'Aprovado':
        return 'bg-emerald-950 text-emerald-400 border-emerald-900';
      case 'Reprovada':
        return 'bg-rose-950 text-rose-400 border-rose-900';
      case 'Entrega':
        return 'bg-indigo-950 text-indigo-400 border-indigo-900';
      case 'Protocolo':
        return 'bg-blue-950 text-blue-500 border-blue-900';
      case 'Reunião':
        return 'bg-purple-950 text-purple-500 border-purple-900';
      case 'Visita':
        return 'bg-emerald-950 text-emerald-500 border-emerald-900';
      case 'Manutenção':
        return 'bg-orange-950 text-orange-500 border-orange-900';
      default:
        return 'bg-zinc-900 text-zinc-400 border-zinc-800';
    }
  };

  const generatePlannerReport = () => {
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
    doc.text("CRONOGRAMA DE ATIVIDADES E PLANNER MENSAL", 105, 51, { align: 'center' });

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

    // 4. METADADOS DO PLANNER Section
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(185, 28, 28); // Red-700
    doc.text("DADOS DE EMISSÃO DO CRONOGRAMA:", 14, 89);

    doc.setDrawColor(0, 0, 0); // Black border
    doc.rect(14, 90, 182, 24);

    const periodText = currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' });
    const formattedDate = new Date().toLocaleDateString('pt-BR');
    const formattedTime = new Date().toLocaleTimeString('pt-BR');

    // Filter events strictly for the currently selected month and year
    const targetMonth = currentDate.getMonth();
    const targetYear = currentDate.getFullYear();

    const monthlyUpcoming = sortedEvents.filter(e => {
      if (e.completed) return false;
      const d = new Date(e.date + 'T12:00:00');
      return d.getMonth() === targetMonth && d.getFullYear() === targetYear;
    });

    const monthlyCompleted = sortedEvents.filter(e => {
      if (!e.completed || e.id.startsWith('ext-')) return false;
      const d = new Date(e.date + 'T12:00:00');
      return d.getMonth() === targetMonth && d.getFullYear() === targetYear;
    });

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8.5);
    doc.setTextColor(0, 0, 0);

    // Line 1
    doc.text("Relatório: ", 17, 95);
    doc.setFont('helvetica', 'normal');
    doc.text(`Cronograma e Planner Mensal - ${periodText.toUpperCase()}`, 31, 95);

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
    doc.text("Pendentes no Mês: ", 17, 107);
    doc.setFont('helvetica', 'normal');
    doc.text(`${monthlyUpcoming.length} Compromissos`, 42, 107);

    doc.setFont('helvetica', 'bold');
    doc.text("Concluídos no Mês: ", 110, 107);
    doc.setFont('helvetica', 'normal');
    doc.text(`${monthlyCompleted.length} Atividades`, 137, 107);

    // Line 4
    doc.setFont('helvetica', 'bold');
    doc.text("Controle: ", 17, 112);
    doc.setFont('helvetica', 'normal');
    doc.text("Interno / Planejamento Estratégico", 30, 112);

    let yPos = 124;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(0, 0, 0);
    doc.text(`PLANEJAMENTO MENSAL: ${periodText.toUpperCase()}`, 14, yPos);
    yPos += 8;

    doc.line(14, yPos, 196, yPos);
    yPos += 8;

    // Upcoming Events Table Header
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(39, 39, 42);
    doc.text("COMPROMISSOS E PRAZOS AGENDADOS NO MÊS", 14, yPos);
    yPos += 6;

    doc.setFillColor(244, 244, 245);
    doc.rect(14, yPos - 4, 182, 8, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(63, 63, 70);
    doc.text("DATA", 16, yPos + 1);
    doc.text("COMPROMISSO / DESCRIÇÃO", 40, yPos + 1);
    doc.text("TIPO", 130, yPos + 1);
    doc.text("PROJETO", 160, yPos + 1);

    yPos += 8;
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(82, 82, 91);

    if (monthlyUpcoming.length === 0) {
      doc.text("Nenhum compromisso pendente agendado para este mês.", 16, yPos);
      yPos += 8;
    } else {
      monthlyUpcoming.forEach(e => {
        if (yPos > 270) {
          doc.addPage();
          yPos = 20;
        }

        const project = data.projects.find((p) => p.id === e.projectId);
        const formattedDate = new Date(e.date + 'T00:00:00').toLocaleDateString('pt-BR');

        doc.text(formattedDate, 16, yPos);
        
        const textLimit = 48;
        const shortTitle = e.title.length > textLimit ? e.title.substring(0, textLimit) + "..." : e.title;
        doc.text(shortTitle, 40, yPos);
        
        doc.text(e.type || 'Compromisso', 130, yPos);
        doc.text(project ? project.clientName.substring(0, 20) : '-', 160, yPos);

        doc.setDrawColor(244, 244, 245);
        doc.line(14, yPos + 2, 196, yPos + 2);
        yPos += 8;
      });
    }

    // Completed events section (brief list)
    if (monthlyCompleted.length > 0) {
      yPos += 8;
      if (yPos > 250) {
        doc.addPage();
        yPos = 20;
      }
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(39, 39, 42);
      doc.text("COMPROMISSOS JÁ CONCLUÍDOS NO MÊS", 14, yPos);
      yPos += 8;

      doc.setFillColor(244, 244, 245);
      doc.rect(14, yPos - 4, 182, 8, 'F');
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(63, 63, 70);
      doc.text("DATA", 16, yPos + 1);
      doc.text("COMPROMISSO CONCLUÍDO", 40, yPos + 1);
      doc.text("TIPO", 160, yPos + 1);

      yPos += 8;
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(113, 113, 122);

      monthlyCompleted.forEach(e => {
        if (yPos > 270) {
          doc.addPage();
          yPos = 20;
        }
        const formattedDate = new Date(e.date + 'T00:00:00').toLocaleDateString('pt-BR');
        doc.text(formattedDate, 16, yPos);
        doc.text(e.title.substring(0, 60), 40, yPos);
        doc.text(e.type || 'Compromisso', 160, yPos);

        doc.setDrawColor(244, 244, 245);
        doc.line(14, yPos + 2, 196, yPos + 2);
        yPos += 8;
      });
    }

    yPos += 15;
    if (yPos > 250) {
      doc.addPage();
      yPos = 30;
    }

    // Signature/Footer area
    doc.setDrawColor(228, 228, 231);
    doc.line(14, yPos, 196, yPos);
    yPos += 6;
    
    doc.setFontSize(8);
    doc.setTextColor(113, 113, 122);
    doc.text(`${companyName.toUpperCase()} - ENGENHARIA DE SEGURANÇA CONTRA INCÊNDIO`, 14, yPos);
    doc.text(`Planner exportado para controle interno em ${new Date().toLocaleDateString('pt-BR')} • Direitos Reservados ${companyName} • APP em desenvolvimento`, 14, yPos + 4);

    doc.save(`agenda_planner_mensal_${periodText.toLowerCase().replace(/\s+/g, '_')}.pdf`);
  };

  return (
    <div className="p-8 h-full flex flex-col overflow-hidden relative">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-white">Agenda e Prazos</h1>
          <p className="text-zinc-400">Agendamentos de vistorias e acompanhamento de prazos de projetos.</p>
        </div>
        
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <button onClick={handlePrev} className="p-2 text-zinc-400 hover:text-white bg-zinc-900 hover:bg-zinc-800 rounded-md transition-colors border border-zinc-800">
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-white font-medium capitalize w-40 text-center">
              {viewMode === 'month' 
                ? currentDate.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' }) 
                : `Semana de ${startOfWeek.getDate()}/${startOfWeek.getMonth() + 1}`}
            </span>
            <button onClick={handleNext} className="p-2 text-zinc-400 hover:text-white bg-zinc-900 hover:bg-zinc-800 rounded-md transition-colors border border-zinc-800">
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <div className="flex items-center bg-zinc-900 border border-zinc-800 rounded-lg p-1">
            <button 
              onClick={() => setViewMode('week')} 
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === 'week' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              Semana
            </button>
            <button 
              onClick={() => setViewMode('month')} 
              className={`px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${viewMode === 'month' ? 'bg-zinc-800 text-white' : 'text-zinc-500 hover:text-zinc-300'}`}
            >
              Mês
            </button>
          </div>

          <button
            onClick={generatePlannerReport}
            className="flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-400 px-4 py-2 rounded-md text-sm font-medium transition-colors"
          >
            <Download className="w-4 h-4 text-zinc-400" />
            Salvar Visualização (PDF)
          </button>

          <button
            onClick={() => setShowAddForm(true)}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors"
          >
            <Plus className="w-4 h-4" />
            Novo
          </button>
        </div>
      </div>

      <div className={`grid grid-cols-7 gap-2 mb-6 ${viewMode === 'month' ? 'text-xs' : ''}`}>
        {viewMode === 'month' && (
          <div className="col-span-7 grid grid-cols-7 gap-2 mb-2">
            {['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'].map(day => (
              <div key={day} className="text-center font-semibold text-zinc-500 text-xs uppercase tracking-wider">{day}</div>
            ))}
          </div>
        )}
        
        {displayDays.map((day, i) => {
          const dt = new Date(day.getTime() - (day.getTimezoneOffset() * 60000));
          const dateStr = dt.toISOString().split('T')[0];
          
          const dtToday = new Date(today.getTime() - (today.getTimezoneOffset() * 60000));
          const todayStr = dtToday.toISOString().split('T')[0];
          const isToday = dateStr === todayStr;
          const isSelected = dateStr === selectedDateFilter;
          const isCurrentMonth = day.getMonth() === currentDate.getMonth();

          const dayEvents = upcomingEvents.filter((e) => e.date === dateStr);

          return (
            <button
              key={`${dateStr}-${i}`}
              onClick={() => setSelectedDateFilter(prev => prev === dateStr ? null : dateStr)}
              className={`${viewMode === 'week' ? 'p-4' : 'p-2 min-h-[60px]'} rounded-xl border flex flex-col items-center justify-start transition-colors cursor-pointer ${
                isSelected ? 'bg-red-950/40 border-red-600 ring-1 ring-red-600/50' :
                isToday
                  ? 'bg-red-950/20 border-red-900/50 hover:bg-red-950/40'
                  : `bg-zinc-950 border-zinc-900 hover:border-zinc-700 hover:bg-zinc-900 shadow-sm ${!isCurrentMonth && viewMode === 'month' ? 'opacity-40' : ''}`
              }`}
            >
              {viewMode === 'week' && (
                <div
                  className={`text-[10px] font-bold uppercase tracking-wider mb-1 ${
                    isToday || isSelected ? 'text-red-500' : 'text-zinc-500'
                  }`}
                >
                  {day.toLocaleDateString('pt-BR', { weekday: 'short' }).replace('.', '')}
                </div>
              )}
              
              <div
                className={`${viewMode === 'week' ? 'text-2xl' : 'text-sm'} font-bold ${
                  isToday ? 'text-red-500' : 'text-white'
                }`}
              >
                {day.getDate()}
              </div>
              
              <div className={`mt-1 flex items-center justify-center w-full flex-wrap gap-1 ${viewMode === 'month' ? 'overflow-hidden' : ''}`}>
                {dayEvents.length > 0 ? (
                  viewMode === 'week' ? (
                    <span className="bg-red-500/10 border border-red-500/20 text-red-500 px-2 py-0.5 rounded-full text-xs font-semibold">
                      {dayEvents.length} {dayEvents.length === 1 ? 'evento' : 'eventos'}
                    </span>
                  ) : (
                    <div className="flex gap-1 flex-wrap justify-center max-w-full px-1">
                      {dayEvents.slice(0, 4).map((e) => (
                        <div key={e.id} className={`w-1.5 h-1.5 rounded-full ${getEventColorClass(e.type)}`} title={`${e.type}: ${e.title}`} />
                      ))}
                      {dayEvents.length > 4 && (
                        <span className="text-[8px] text-zinc-500 font-bold leading-none">+</span>
                      )}
                    </div>
                  )
                ) : (
                  viewMode === 'week' && <span className="text-zinc-700 font-bold text-xs">-</span>
                )}
              </div>
            </button>
          );
        })}
      </div>

      <div className="flex gap-6 flex-1 min-h-0">
        <div className="w-2/3 flex flex-col overflow-hidden bg-zinc-950 rounded-xl border border-zinc-900 shadow-sm">
          <div className="p-4 border-b border-zinc-900 bg-zinc-900/50 font-semibold text-white flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Clock className="w-5 h-5 text-zinc-500" />
              Próximos Compromissos e Prazos
            </div>
            {selectedDateFilter && (
              <span className="text-xs bg-red-500/10 text-red-500 px-2 py-1 rounded-full border border-red-500/20">
                Filtrado: {selectedDateFilter.split('-').reverse().join('/')}
              </span>
            )}
          </div>
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {displayEvents.length === 0 ? (
              <div className="text-center py-12 flex flex-col items-center justify-center">
                <CalendarIcon className="w-12 h-12 text-zinc-800 mb-3" />
                <span className="text-zinc-500">Nenhum compromisso para exibição.</span>
              </div>
            ) : (
              displayEvents.map((event) => {
                const project = data.projects.find((p) => p.id === event.projectId);
                return (
                  <div
                    key={event.id}
                    className="flex items-start gap-4 p-4 border border-zinc-900 bg-zinc-900/30 rounded-lg hover:border-zinc-800 hover:bg-zinc-900/60 transition-colors"
                  >
                    {!event.id.startsWith('ext-') ? (
                      <button
                        onClick={() => toggleComplete(event.id)}
                        className="mt-0.5 text-zinc-600 hover:text-emerald-500 transition-colors"
                      >
                        <Circle className="w-6 h-6" />
                      </button>
                    ) : (
                      <div className="mt-0.5 text-orange-500/60">
                        <Clock className="w-6 h-6" />
                      </div>
                    )}
                    <div className="flex-1">
                      <div className="flex justify-between items-start mb-2">
                        <h3 className="font-semibold text-white text-base leading-tight">{event.title}</h3>
                        <span
                          className={`text-xs px-2.5 py-1 rounded-full border font-medium whitespace-nowrap ml-3 ${getTypeStyle(
                            event.type
                          )}`}
                        >
                          {event.type}
                        </span>
                      </div>
                      <div className="flex items-center gap-4 text-sm text-zinc-400">
                        <div className="flex items-center gap-1.5">
                          <CalendarIcon className="w-4 h-4" />
                          {new Date(event.date + 'T00:00:00').toLocaleDateString('pt-BR')} {event.time ? `às ${event.time}` : ''}
                        </div>
                        {project && (
                          <div className="flex items-center gap-1.5 text-blue-400/80">
                            <Building className="w-4 h-4" />
                            {project.clientName}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>

        <div className="w-1/3 flex flex-col overflow-hidden bg-zinc-950 rounded-xl border border-zinc-900 shadow-sm">
          <div className="p-4 border-b border-zinc-900 bg-zinc-900/50 font-semibold text-white flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-500/70" />
            Concluídos
          </div>
          <div className="flex-1 overflow-y-auto p-3 space-y-2">
            {completedEvents.length === 0 ? (
              <div className="text-center py-8 text-zinc-600 text-sm">Nenhum concluído.</div>
            ) : (
              completedEvents.map((event) => (
                <div
                  key={event.id}
                  className="flex items-start gap-3 p-3 bg-zinc-900/20 border border-zinc-900/50 rounded-lg opacity-70 hover:opacity-100 transition-opacity"
                >
                  <button
                    onClick={() => toggleComplete(event.id)}
                    className="mt-0.5 text-emerald-500 hover:text-zinc-500 transition-colors"
                  >
                    <CheckCircle2 className="w-5 h-5" />
                  </button>
                  <div>
                    <h3 className="font-medium text-zinc-300 line-through text-sm">{event.title}</h3>
                    <div className="text-xs text-zinc-500 mt-1">
                      {new Date(event.date + 'T00:00:00').toLocaleDateString('pt-BR')} • {event.type}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {showAddForm && (
        <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 z-50">
          <div className="bg-zinc-950 rounded-xl border border-zinc-900 shadow-xl w-full max-w-md overflow-hidden">
            <div className="p-4 border-b border-zinc-900 flex justify-between items-center bg-zinc-900">
              <h2 className="font-semibold text-white flex items-center gap-2">
                <CalendarIcon className="w-5 h-5 text-red-600" />
                Novo Agendamento
              </h2>
              <button
                onClick={() => setShowAddForm(false)}
                className="text-zinc-500 hover:text-zinc-300 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleAddEvent} className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">Título</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Entrega Projeto Bombeiros"
                  value={newEvent.title}
                  onChange={(e) => setNewEvent({ ...newEvent, title: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500 placeholder:text-zinc-600"
                />
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div className="col-span-1">
                  <label className="block text-sm font-medium text-zinc-300 mb-1">Data</label>
                  <input
                    type="date"
                    required
                    value={newEvent.date}
                    onChange={(e) => setNewEvent({ ...newEvent, date: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  />
                </div>
                <div className="col-span-1">
                  <label className="block text-sm font-medium text-zinc-300 mb-1">Horário</label>
                  <input
                    type="time"
                    value={newEvent.time}
                    onChange={(e) => setNewEvent({ ...newEvent, time: e.target.value })}
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  />
                </div>
                <div className="col-span-1">
                  <label className="block text-sm font-medium text-zinc-300 mb-1">Tipo</label>
                  <select
                    value={newEvent.type}
                    onChange={(e) => setNewEvent({ ...newEvent, type: e.target.value as any })}
                    className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                  >
                    <option value="Prazo">Prazo</option>
                    <option value="Vistoria">Vistoria</option>
                    <option value="Protocolo">Protocolo</option>
                    <option value="Reunião">Reunião</option>
                    <option value="Manutenção">Manutenção</option>
                    <option value="Visita">Visita</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-zinc-300 mb-1">
                  Projeto Relacionado (Opcional)
                </label>
                <select
                  value={newEvent.projectId}
                  onChange={(e) => setNewEvent({ ...newEvent, projectId: e.target.value })}
                  className="w-full px-3 py-2 bg-zinc-900 border border-zinc-800 text-white rounded-md focus:outline-none focus:ring-2 focus:ring-red-500 focus:border-red-500"
                >
                  <option value="">Nenhum</option>
                  {data.projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.clientName}
                    </option>
                  ))}
                </select>
              </div>

              <div className="pt-4 border-t border-zinc-900 flex justify-end gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowAddForm(false)}
                  className="px-4 py-2 text-sm font-medium text-zinc-400 hover:text-white hover:bg-zinc-900 rounded-md transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 bg-red-600 text-white text-sm font-medium rounded-md hover:bg-red-700 transition-colors"
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

