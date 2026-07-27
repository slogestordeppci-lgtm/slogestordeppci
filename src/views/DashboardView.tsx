import React from 'react';
import { useStore } from '../store';
import { CheckCircle2, Clock, CalendarDays, ExternalLink, HardHat } from 'lucide-react';

export function DashboardView() {
  const { data } = useStore();

  const activeProjects = data.projects.filter(p => p.status === 'Elaboração' || p.status === 'Levantamento').length;
  const underReviewProjects = data.projects.filter(p => p.status === 'Protocolado').length;

  const currentMonth = new Date().getMonth();
  const currentYear = new Date().getFullYear();
  const completedInspectionsThisMonth = (data.inspections || []).filter(i => {
    if (i.status !== 'Concluída') return false;
    const d = new Date(i.date);
    return !isNaN(d.getTime()) && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  }).length;
  
  const completedAgendaVistoriasThisMonth = (data.agenda || []).filter(a => {
    if (!a.completed || a.type !== 'Vistoria') return false;
    const d = new Date(a.date + 'T00:00:00');
    return !isNaN(d.getTime()) && d.getMonth() === currentMonth && d.getFullYear() === currentYear;
  }).length;

  const totalCompletedVistorias = Math.max(completedInspectionsThisMonth, completedAgendaVistoriasThisMonth, (data.inspections || []).filter(i => i.status === 'Concluída').length);

  return (
    <div className="p-8 overflow-y-auto h-full">
       <div className="mb-8 flex justify-between items-start flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-semibold text-white">Bom dia, Engenheiro.</h1>
          <p className="text-zinc-400">Resumo das atividades de Engenharia Contra Incêndio.</p>
        </div>
        <div className="flex flex-col items-end text-right">
          <span className="bg-amber-500/10 text-amber-500 text-[10px] font-bold px-2.5 py-1 rounded border border-amber-500/20 uppercase tracking-wider animate-pulse">
            APP em desenvolvimento
          </span>
          <span className="text-[10px] text-zinc-500 mt-1">
            Direitos reservados Alessandro M. Zandoná
          </span>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6 mb-8">
        <div className="bg-zinc-950 p-6 rounded-xl border border-zinc-900 shadow-sm flex items-center gap-4">
           <div className="w-12 h-12 bg-red-950 text-red-500 rounded-full flex items-center justify-center shrink-0">
              <HardHat className="w-6 h-6" />
           </div>
           <div>
             <div className="text-sm text-zinc-400 font-medium mb-1">Projetos em Elaboração</div>
             <div className="text-3xl font-bold text-white">{activeProjects}</div>
           </div>
        </div>
        <div className="bg-zinc-950 p-6 rounded-xl border border-zinc-900 shadow-sm flex items-center gap-4">
           <div className="w-12 h-12 bg-amber-950 text-amber-500 rounded-full flex items-center justify-center shrink-0">
              <Clock className="w-6 h-6" />
           </div>
           <div>
             <div className="text-sm text-zinc-400 font-medium mb-1">Protocolos CBM-RS</div>
             <div className="text-3xl font-bold text-white">{underReviewProjects}</div>
           </div>
        </div>
        <div className="bg-zinc-950 p-6 rounded-xl border border-zinc-900 shadow-sm flex items-center gap-4">
           <div className="w-12 h-12 bg-emerald-950 text-emerald-500 rounded-full flex items-center justify-center shrink-0">
              <CheckCircle2 className="w-6 h-6" />
           </div>
           <div>
             <div className="text-sm text-zinc-400 font-medium mb-1">Vistorias Concluídas</div>
             <div className="text-3xl font-bold text-white">{totalCompletedVistorias}</div>
           </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-zinc-950 rounded-xl border border-zinc-900 shadow-sm p-6">
          <h2 className="text-base font-bold text-white mb-4 flex items-center gap-2">
            <CalendarDays className="w-5 h-5 text-zinc-500" />
            Agenda Próximos 7 Dias
          </h2>
          <div className="space-y-4">
            {data.agenda.filter(a => !a.completed).map(task => (
               <div key={task.id} className="flex gap-4 items-start pb-4 border-b border-zinc-900 last:border-0 last:pb-0">
                 <div className="bg-zinc-900 border border-zinc-800 rounded text-center px-3 py-1 shrink-0">
                   <div className="text-xs text-zinc-400 uppercase font-medium">{new Date(task.date + 'T00:00:00').toLocaleDateString('pt-br', { month: 'short'})}</div>
                   <div className="text-lg font-bold text-white">{new Date(task.date + 'T00:00:00').getDate()}</div>
                 </div>
                 <div>
                   <div className="text-sm font-semibold text-white">{task.title}</div>
                   <div className="text-xs text-zinc-400 mt-1 flex items-center gap-1">📍 {task.type} {task.time ? `• ${task.time}` : ''}</div>
                 </div>
               </div>
            ))}
            {data.agenda.every(a => a.completed) && (
              <p className="text-sm text-zinc-500">Nenhum compromisso próximo.</p>
            )}
          </div>
        </div>

        <div className="bg-zinc-950 rounded-xl border border-zinc-900 shadow-sm p-6">
          <h2 className="text-base font-bold text-white mb-4">Projetos Recentes</h2>
          <div className="space-y-3">
             {data.projects.slice(0, 4).map(p => (
               <div key={p.id} className="flex justify-between items-center p-3 hover:bg-zinc-900 rounded-lg border border-transparent hover:border-zinc-800 transition-colors cursor-pointer">
                 <div>
                   <div className="text-sm font-semibold text-white">{p.clientName}</div>
                   <div className="text-xs text-zinc-400 line-clamp-1">{p.address}</div>
                 </div>
                 <div className="text-xs font-medium text-zinc-300 bg-zinc-800 px-2 py-1 rounded-full uppercase tracking-wider">
                   {p.status}
                 </div>
               </div>
             ))}
          </div>
        </div>
      </div>
    </div>
  );
}
