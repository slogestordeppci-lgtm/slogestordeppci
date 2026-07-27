import React, { useState } from 'react';
import { Calculator, DollarSign, Clock, Briefcase, Receipt, ArrowRight, FileText, Printer, X } from 'lucide-react';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { addStandardHeader, addStandardFooter } from '../utils/pdfHelper';
import { useStore } from '../store';

export function HourlyRateCalculatorView() {
  const { data } = useStore();
  const [costs, setCosts] = useState({
    office: 1500,
    accountant: 300,
    legal: 200,
    engineer: 5000,
    other: 0,
  });

  const [workload, setWorkload] = useState({
    hoursPerDay: 8,
    daysPerWeek: 5,
  });

  const [taxesPercent, setTaxesPercent] = useState(15);
  const [profitPercent, setProfitPercent] = useState(20);
  const [showReport, setShowReport] = useState(false);

  const totalMonthlyCosts = costs.office + costs.accountant + costs.legal + costs.engineer + costs.other;
  const weeksPerMonth = 4.33; // Average weeks in a month
  const totalMonthlyHours = workload.hoursPerDay * workload.daysPerWeek * weeksPerMonth;
  
  const costPerHour = totalMonthlyHours > 0 ? totalMonthlyCosts / totalMonthlyHours : 0;
  
  // Price = Cost / (1 - Taxes% - Profit%)
  // If taxes + profit >= 100, we cap it or handle it.
  const markupFactor = 1 - (taxesPercent / 100) - (profitPercent / 100);
  const suggestedHourlyRate = markupFactor > 0 && costPerHour > 0 ? costPerHour / markupFactor : costPerHour;

  const handleCostChange = (field: keyof typeof costs, value: string) => {
    setCosts(prev => ({ ...prev, [field]: parseFloat(value) || 0 }));
  };

  const handlePrintNative = () => {
    try {
      const doc = new jsPDF();
      let yPos = addStandardHeader(doc, data, "RELATÓRIO DE COMPOSIÇÃO DE PREÇO (HORA TÉCNICA)");

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      doc.text("Resumo Executivo", 14, yPos);
      yPos += 10;
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text("Valor Sugerido para Venda (Hora):", 14, yPos);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(185, 28, 28);
      doc.setFontSize(14);
      doc.text(`R$ ${markupFactor > 0 ? suggestedHourlyRate.toFixed(2).replace('.', ',') : "Erro"}`, 14, yPos + 6);
      yPos += 18;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.text("1. Custos Fixos Mensais", 14, yPos);
      yPos += 5;

      const costsBody = [
        ['Pró-Labore / Salário', `R$ ${costs.engineer.toFixed(2).replace('.', ',')}`, 'Remuneração base do profissional técnico responsável.'],
        ['Escritório', `R$ ${costs.office.toFixed(2).replace('.', ',')}`, 'Aluguel, energia elétrica, internet, água e manutenção.'],
        ['Contador', `R$ ${costs.accountant.toFixed(2).replace('.', ',')}`, 'Honorários contábeis para manutenção fiscal da empresa.'],
        ['Assessoria Jurídica', `R$ ${costs.legal.toFixed(2).replace('.', ',')}`, 'Respaldo jurídico para contratos, distratos e consultoria.'],
        ['Outros Custos', `R$ ${costs.other.toFixed(2).replace('.', ',')}`, 'Softwares, marketing, anuidades de conselho, etc.']
      ];

      autoTable(doc, {
        startY: yPos,
        head: [['Item de Custo', 'Valor (R$)', 'Justificativa']],
        body: costsBody,
        theme: 'grid',
        headStyles: { fillColor: [185, 28, 28] },
        styles: { fontSize: 8 },
        margin: { left: 14, right: 14 },
        foot: [['Total de Custos Fixos', { content: `R$ ${totalMonthlyCosts.toFixed(2).replace('.', ',')} / mês`, colSpan: 2 }]],
        footStyles: { fillColor: [240, 240, 240], textColor: [185, 28, 28], fontStyle: 'bold' }
      });
      
      yPos = (doc as any).lastAutoTable.finalY + 15;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.text("2. Capacidade Produtiva (Carga Horária)", 14, yPos);
      yPos += 8;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Horas dedicadas por dia: ${workload.hoursPerDay} horas`, 14, yPos);
      yPos += 6;
      doc.text(`Dias trabalhados por semana: ${workload.daysPerWeek} dias`, 14, yPos);
      yPos += 6;
      doc.text(`Total Mensal de Horas Vendáveis: ${totalMonthlyHours.toFixed(1).replace('.', ',')} horas / mês`, 14, yPos);
      yPos += 4;
      doc.setFontSize(8);
      doc.setTextColor(100, 100, 100);
      doc.text("*(Considerando média de 4,33 semanas por mês)*", 14, yPos);
      yPos += 12;

      if (yPos > doc.internal.pageSize.getHeight() - 60) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(12);
      doc.setTextColor(0, 0, 0);
      doc.text("3. Formação do Preço de Venda", 14, yPos);
      yPos += 8;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Custo Base da Hora: R$ ${costPerHour.toFixed(2).replace('.', ',')}`, 14, yPos);
      yPos += 8;
      
      doc.text(`Previsão de Impostos (${taxesPercent}%): R$ ${markupFactor > 0 ? (suggestedHourlyRate * (taxesPercent/100)).toFixed(2).replace('.', ',') : '0,00'} por hora`, 14, yPos);
      yPos += 6;
      
      doc.text(`Margem de Lucro (${profitPercent}%): R$ ${markupFactor > 0 ? (suggestedHourlyRate * (profitPercent/100)).toFixed(2).replace('.', ',') : '0,00'} por hora`, 14, yPos);
      yPos += 10;

      doc.setFontSize(8);
      const splitText = doc.splitTextToSize(
        `Markup Utilizado: O valor final é calculado pelo método de Mark-up Divisor (Preço = Custo ÷ (1 - Impostos - Lucro)). Isso garante que, ao faturar o valor sugerido, após pagar os ${taxesPercent}% de impostos e retirar os ${profitPercent}% de lucro, o valor que sobra paga exatamente o custo base da hora.`,
        182
      );
      doc.text(splitText, 14, yPos);

      addStandardFooter(doc, data);

      doc.save(`Relatorio_Hora_Tecnica_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      alert('Não foi possível gerar o PDF. Verifique o console para mais detalhes.');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="h-full flex flex-col p-6 animate-in fade-in duration-500 overflow-y-auto">
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className="text-2xl font-semibold text-white flex items-center gap-2">
            <Calculator className="w-6 h-6 text-red-500" />
            Calculadora de Valor Hora
          </h1>
          <p className="text-zinc-400">Calcule o valor ideal da sua hora de trabalho técnica.</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <div className="lg:col-span-2 space-y-6">
          {/* CUSTOS FIXOS */}
          <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 shadow-sm">
            <div className="flex items-center gap-2 mb-4">
              <Briefcase className="w-4 h-4 text-zinc-400" />
              <h2 className="text-sm font-semibold text-white uppercase tracking-wider">Custos Fixos Mensais (R$)</h2>
            </div>
            
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Pró-Labore / Salário Engenheiro</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-zinc-500 text-sm">R$</span>
                  <input
                    type="number"
                    value={costs.engineer}
                    onChange={e => handleCostChange('engineer', e.target.value)}
                    className="w-full bg-black border border-zinc-800 text-white rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-red-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Escritório (Aluguel, Luz, Net)</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-zinc-500 text-sm">R$</span>
                  <input
                    type="number"
                    value={costs.office}
                    onChange={e => handleCostChange('office', e.target.value)}
                    className="w-full bg-black border border-zinc-800 text-white rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-red-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Contador</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-zinc-500 text-sm">R$</span>
                  <input
                    type="number"
                    value={costs.accountant}
                    onChange={e => handleCostChange('accountant', e.target.value)}
                    className="w-full bg-black border border-zinc-800 text-white rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-red-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Assessoria Jurídica</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-zinc-500 text-sm">R$</span>
                  <input
                    type="number"
                    value={costs.legal}
                    onChange={e => handleCostChange('legal', e.target.value)}
                    className="w-full bg-black border border-zinc-800 text-white rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-red-500"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs font-medium text-zinc-400 mb-1">Outros Custos Fixos</label>
                <div className="relative">
                  <span className="absolute left-3 top-2.5 text-zinc-500 text-sm">R$</span>
                  <input
                    type="number"
                    value={costs.other}
                    onChange={e => handleCostChange('other', e.target.value)}
                    className="w-full bg-black border border-zinc-800 text-white rounded-lg pl-9 pr-3 py-2 text-sm focus:outline-none focus:border-red-500"
                  />
                </div>
              </div>
            </div>
            <div className="mt-4 pt-4 border-t border-zinc-800 flex justify-between items-center text-sm">
              <span className="text-zinc-400 font-medium">Custo Fixo Total:</span>
              <span className="text-white font-bold text-lg">R$ {totalMonthlyCosts.toFixed(2)}</span>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* CARGA HORÁRIA */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Clock className="w-4 h-4 text-zinc-400" />
                <h2 className="text-sm font-semibold text-white uppercase tracking-wider">Carga Horária Desejada</h2>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">Horas por Dia</label>
                  <input
                    type="number"
                    value={workload.hoursPerDay}
                    onChange={e => setWorkload(prev => ({ ...prev, hoursPerDay: parseFloat(e.target.value) || 0 }))}
                    className="w-full bg-black border border-zinc-800 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">Dias por Semana</label>
                  <input
                    type="number"
                    value={workload.daysPerWeek}
                    onChange={e => setWorkload(prev => ({ ...prev, daysPerWeek: parseFloat(e.target.value) || 0 }))}
                    className="w-full bg-black border border-zinc-800 text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:border-red-500"
                  />
                </div>
                <div className="pt-4 border-t border-zinc-800">
                  <p className="text-xs text-zinc-500 mb-1">Total de Horas Mensais (aprox.):</p>
                  <p className="text-white font-bold">{totalMonthlyHours.toFixed(1)} horas</p>
                </div>
              </div>
            </div>

            {/* MARGEM & IMPOSTOS */}
            <div className="bg-zinc-900 border border-zinc-800 rounded-xl p-5 shadow-sm">
              <div className="flex items-center gap-2 mb-4">
                <Receipt className="w-4 h-4 text-zinc-400" />
                <h2 className="text-sm font-semibold text-white uppercase tracking-wider">Margem & Impostos</h2>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">Impostos (%)</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={taxesPercent}
                      onChange={e => setTaxesPercent(parseFloat(e.target.value) || 0)}
                      className="w-full bg-black border border-zinc-800 text-white rounded-lg pl-3 pr-8 py-2 text-sm focus:outline-none focus:border-red-500"
                    />
                    <span className="absolute right-3 top-2.5 text-zinc-500 text-sm">%</span>
                  </div>
                </div>
                <div>
                  <label className="block text-xs font-medium text-zinc-400 mb-1">Margem de Lucro Desejada (%)</label>
                  <div className="relative">
                    <input
                      type="number"
                      value={profitPercent}
                      onChange={e => setProfitPercent(parseFloat(e.target.value) || 0)}
                      className="w-full bg-black border border-zinc-800 text-white rounded-lg pl-3 pr-8 py-2 text-sm focus:outline-none focus:border-red-500"
                    />
                    <span className="absolute right-3 top-2.5 text-zinc-500 text-sm">%</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* RESULTADO */}
        <div>
          <div className="bg-black border border-zinc-800 rounded-xl p-6 shadow-xl sticky top-6">
            <h3 className="text-sm font-bold text-zinc-400 uppercase tracking-widest mb-6">Resultado</h3>
            
            <div className="space-y-6">
              <div>
                <p className="text-xs text-zinc-500 font-medium mb-1">Custo da Hora (Sem Lucro/Imposto)</p>
                <div className="text-2xl font-semibold text-zinc-300">
                  R$ {costPerHour.toFixed(2)}
                </div>
              </div>
              
              <div className="border-t border-zinc-800 pt-6">
                <p className="text-xs text-red-500 font-bold uppercase tracking-widest mb-2">Valor Sugerido para Venda</p>
                <div className="text-4xl font-bold text-white flex items-center gap-2">
                  <span className="text-zinc-500 text-2xl">R$</span>
                  {markupFactor > 0 ? suggestedHourlyRate.toFixed(2) : "Erro"}
                </div>
                <p className="text-[10px] text-zinc-500 mt-2">
                  Considerando {taxesPercent}% de impostos e {profitPercent}% de lucro sobre o valor final.
                </p>
              </div>

              <div className="bg-zinc-900 rounded-lg p-4 space-y-2 mt-6">
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-400">Repasse Custos:</span>
                  <span className="text-zinc-300">R$ {costPerHour.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-400">Previsão Impostos:</span>
                  <span className="text-zinc-300">R$ {markupFactor > 0 ? (suggestedHourlyRate * (taxesPercent/100)).toFixed(2) : '0.00'}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-zinc-400">Previsão Lucro Liquido (Hora):</span>
                  <span className="text-emerald-400 font-medium">R$ {markupFactor > 0 ? (suggestedHourlyRate * (profitPercent/100)).toFixed(2) : '0.00'}</span>
                </div>
              </div>

              <button
                onClick={() => setShowReport(true)}
                className="w-full mt-6 bg-red-600 hover:bg-red-700 text-white font-bold py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-colors"
              >
                <FileText className="w-5 h-5" />
                Gerar Relatório Detalhado
              </button>
            </div>
          </div>
        </div>
      </div>

      {showReport && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl">
            <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900 rounded-t-xl print:hidden">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-red-500" />
                Relatório de Composição de Preço (Hora Técnica)
              </h2>
              <div className="flex items-center gap-3">
                <button
                  onClick={handlePrint}
                  className="flex items-center gap-2 bg-zinc-800 hover:bg-zinc-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                >
                  <Printer className="w-4 h-4" />
                  Imprimir
                </button>
                <button
                  onClick={handlePrintNative}
                  className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
                >
                  <FileText className="w-4 h-4" />
                  Baixar PDF
                </button>
                <button
                  onClick={() => setShowReport(false)}
                  className="text-zinc-400 hover:text-white p-1 ml-2"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>
            </div>

            <div id="report-content" className="p-8 overflow-y-auto flex-1 bg-white text-zinc-900 print:p-0 print:overflow-visible">
              <div className="max-w-3xl mx-auto space-y-8">
                {/* Header */}
                <div className="text-center space-y-2 border-b-2 border-zinc-200 pb-6">
                  <h1 className="text-2xl font-bold uppercase tracking-widest text-zinc-800">Relatório de Composição de Preço</h1>
                  <p className="text-zinc-500">Cálculo Estrutural de Hora Técnica</p>
                  <p className="text-sm text-zinc-400">Data de emissão: {new Date().toLocaleDateString('pt-BR')}</p>
                </div>

                {/* Resumo Final */}
                <div className="bg-zinc-50 border border-zinc-200 p-6 rounded-lg text-center">
                  <p className="text-sm uppercase tracking-widest text-zinc-500 font-bold mb-2">Valor Sugerido para Venda (Hora)</p>
                  <p className="text-5xl font-black text-red-600">
                    R$ {markupFactor > 0 ? suggestedHourlyRate.toFixed(2).replace('.', ',') : "Erro"}
                  </p>
                </div>

                {/* Seção 1: Custos Fixos */}
                <div>
                  <h3 className="text-lg font-bold border-b border-zinc-200 pb-2 mb-4 text-zinc-800">1. Custos Fixos Mensais</h3>
                  <table className="w-full text-sm text-left">
                    <thead>
                      <tr className="border-b border-zinc-200 text-zinc-500">
                        <th className="py-2 font-semibold">Item de Custo</th>
                        <th className="py-2 font-semibold">Valor (R$)</th>
                        <th className="py-2 font-semibold">Justificativa</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      <tr>
                        <td className="py-3 font-medium">Pró-Labore / Salário</td>
                        <td className="py-3">R$ {costs.engineer.toFixed(2).replace('.', ',')}</td>
                        <td className="py-3 text-zinc-600">Remuneração base do profissional técnico responsável.</td>
                      </tr>
                      <tr>
                        <td className="py-3 font-medium">Escritório</td>
                        <td className="py-3">R$ {costs.office.toFixed(2).replace('.', ',')}</td>
                        <td className="py-3 text-zinc-600">Aluguel, energia elétrica, internet, água e manutenção.</td>
                      </tr>
                      <tr>
                        <td className="py-3 font-medium">Contador</td>
                        <td className="py-3">R$ {costs.accountant.toFixed(2).replace('.', ',')}</td>
                        <td className="py-3 text-zinc-600">Honorários contábeis para manutenção fiscal da empresa.</td>
                      </tr>
                      <tr>
                        <td className="py-3 font-medium">Assessoria Jurídica</td>
                        <td className="py-3">R$ {costs.legal.toFixed(2).replace('.', ',')}</td>
                        <td className="py-3 text-zinc-600">Respaldo jurídico para contratos, distratos e consultoria.</td>
                      </tr>
                      <tr>
                        <td className="py-3 font-medium">Outros Custos</td>
                        <td className="py-3">R$ {costs.other.toFixed(2).replace('.', ',')}</td>
                        <td className="py-3 text-zinc-600">Softwares, marketing, anuidades de conselho, etc.</td>
                      </tr>
                    </tbody>
                    <tfoot>
                      <tr className="border-t-2 border-zinc-200 font-bold bg-zinc-50">
                        <td className="py-3 px-2">Total de Custos Fixos</td>
                        <td className="py-3 px-2 text-red-600" colSpan={2}>R$ {totalMonthlyCosts.toFixed(2).replace('.', ',')} / mês</td>
                      </tr>
                    </tfoot>
                  </table>
                </div>

                {/* Seção 2: Capacidade Produtiva */}
                <div>
                  <h3 className="text-lg font-bold border-b border-zinc-200 pb-2 mb-4 text-zinc-800">2. Capacidade Produtiva (Carga Horária)</h3>
                  <div className="grid grid-cols-2 gap-4 text-sm bg-zinc-50 p-4 rounded-lg border border-zinc-200">
                    <div>
                      <p className="text-zinc-500 mb-1">Horas dedicadas por dia:</p>
                      <p className="font-bold">{workload.hoursPerDay} horas</p>
                    </div>
                    <div>
                      <p className="text-zinc-500 mb-1">Dias trabalhados por semana:</p>
                      <p className="font-bold">{workload.daysPerWeek} dias</p>
                    </div>
                    <div className="col-span-2 pt-2 border-t border-zinc-200 mt-2">
                      <p className="text-zinc-500 mb-1">Total Mensal de Horas Vendáveis:</p>
                      <p className="font-bold text-lg text-zinc-800">{totalMonthlyHours.toFixed(1).replace('.', ',')} horas / mês</p>
                      <p className="text-xs text-zinc-500 mt-1">*(Considerando média de 4,33 semanas por mês)*</p>
                    </div>
                  </div>
                </div>

                {/* Seção 3: Formação do Preço */}
                <div>
                  <h3 className="text-lg font-bold border-b border-zinc-200 pb-2 mb-4 text-zinc-800">3. Formação do Preço de Venda</h3>
                  <div className="space-y-4">
                    <div className="flex justify-between items-center p-3 border border-zinc-200 rounded-lg">
                      <div>
                        <p className="font-bold text-sm">Custo Base da Hora</p>
                        <p className="text-xs text-zinc-500">(Custos Fixos Totais ÷ Total de Horas Mensais)</p>
                      </div>
                      <p className="font-bold text-lg">R$ {costPerHour.toFixed(2).replace('.', ',')}</p>
                    </div>
                    
                    <div className="grid grid-cols-2 gap-4">
                      <div className="p-3 bg-red-50 rounded-lg border border-red-100">
                        <p className="font-bold text-sm text-red-900">Previsão de Impostos</p>
                        <p className="text-xl font-bold text-red-700">{taxesPercent}%</p>
                        <p className="text-xs text-red-800 mt-1">R$ {markupFactor > 0 ? (suggestedHourlyRate * (taxesPercent/100)).toFixed(2).replace('.', ',') : '0,00'} por hora</p>
                      </div>
                      <div className="p-3 bg-emerald-50 rounded-lg border border-emerald-100">
                        <p className="font-bold text-sm text-emerald-900">Margem de Lucro</p>
                        <p className="text-xl font-bold text-emerald-700">{profitPercent}%</p>
                        <p className="text-xs text-emerald-800 mt-1">R$ {markupFactor > 0 ? (suggestedHourlyRate * (profitPercent/100)).toFixed(2).replace('.', ',') : '0,00'} por hora</p>
                      </div>
                    </div>

                    <div className="text-xs text-zinc-500 text-justify bg-zinc-50 p-4 rounded-lg border border-zinc-200">
                      <strong>Markup Utilizado:</strong> O valor final é calculado pelo método de Mark-up Divisor (Preço = Custo ÷ (1 - Impostos - Lucro)). 
                      Isso garante que, ao faturar o valor sugerido, após pagar os {taxesPercent}% de impostos e retirar os {profitPercent}% de lucro, o valor que sobra paga exatamente o custo base da hora.
                    </div>
                  </div>
                </div>
                
                {/* Assinatura */}
                <div className="pt-16 pb-8 text-center border-t border-zinc-200 mt-12">
                  <div className="w-64 border-b border-zinc-400 mx-auto mb-2"></div>
                  <p className="text-sm font-bold text-zinc-800">Responsável / Gestor</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
