import React, { useState } from 'react';
import { useStore } from '../store';
import { 
  Car, Plus, X, Calendar, DollarSign, Fuel, MapPin, 
  Wrench, Milestone, ArrowRight, User, Gauge, AlertCircle, Trash2, CheckCircle, Search, Settings, FileText, Printer
} from 'lucide-react';
import { Vehicle, MaintenanceRecord, SupplyRecord, TripRecord } from '../types';
import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import { addStandardHeader, addStandardFooter } from '../utils/pdfHelper';

export function FleetView() {
  const { data, updateData } = useStore();
  const [activeTab, setActiveTab] = useState<'vehicles' | 'maintenances' | 'supplies' | 'trips'>('vehicles');
  const [selectedVehicleId, setSelectedVehicleId] = useState<string | null>('v1');
  const [searchTerm, setSearchTerm] = useState('');

  // Modals / Form toggles
  const [showAddVehicle, setShowAddVehicle] = useState(false);
  const [showAddMaintenance, setShowAddMaintenance] = useState(false);
  const [showAddSupply, setShowAddSupply] = useState(false);
  const [showAddTrip, setShowAddTrip] = useState(false);
  const [showFinishTripId, setShowFinishTripId] = useState<string | null>(null);
  const [showReport, setShowReport] = useState(false);

  // Forms states
  const [newVehicle, setNewVehicle] = useState<Partial<Vehicle>>({
    model: '',
    plate: '',
    year: '',
    fuelType: 'Flex',
    status: 'Disponível',
    currentKm: 0,
    renavam: '',
    insuranceExpiry: '',
  });

  const [newMaintenance, setNewMaintenance] = useState<Partial<MaintenanceRecord>>({
    vehicleId: '',
    date: new Date().toISOString().split('T')[0],
    type: 'Preventiva',
    description: '',
    cost: 0,
    providerName: '',
    odometer: 0,
    nextMaintenanceDate: '',
    nextMaintenanceKm: 0,
  });

  const [newSupply, setNewSupply] = useState<Partial<SupplyRecord>>({
    vehicleId: '',
    date: new Date().toISOString().split('T')[0],
    fuelType: 'Gasolina',
    liters: 0,
    cost: 0,
    odometer: 0,
    stationName: '',
  });

  const [newTrip, setNewTrip] = useState<Partial<TripRecord>>({
    vehicleId: '',
    date: new Date().toISOString().split('T')[0],
    driverName: '',
    purpose: '',
    startKm: 0,
  });

  const [finishKm, setFinishKm] = useState<number>(0);

  // Data selection
  const vehicles = data.vehicles || [];
  const maintenances = data.maintenances || [];
  const supplies = data.supplies || [];
  const trips = data.trips || [];

  const activeVehicle = vehicles.find(v => v.id === selectedVehicleId) || vehicles[0];

  // Calculations
  const totalMaintenanceCost = maintenances.reduce((acc, m) => acc + (m.cost || 0), 0);
  const totalSupplyCost = supplies.reduce((acc, s) => acc + (s.cost || 0), 0);
  const totalLiters = supplies.reduce((acc, s) => acc + (s.liters || 0), 0);
  const activeTripsCount = trips.filter(t => t.status === 'Ativo').length;
  const inMaintenanceCount = vehicles.filter(v => v.status === 'Em Manutenção').length;

  // Handlers
  const handleCreateVehicle = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newVehicle.model || !newVehicle.plate) {
      alert('Por favor, informe o modelo e a placa do veículo.');
      return;
    }

    const vehicle: Vehicle = {
      id: `v-${Date.now()}`,
      model: newVehicle.model,
      plate: newVehicle.plate.toUpperCase(),
      year: newVehicle.year || new Date().getFullYear().toString(),
      fuelType: (newVehicle.fuelType as any) || 'Flex',
      status: 'Disponível',
      currentKm: Number(newVehicle.currentKm) || 0,
      insuranceExpiry: newVehicle.insuranceExpiry,
      renavam: newVehicle.renavam,
    };

    updateData({ vehicles: [...vehicles, vehicle] });
    setNewVehicle({
      model: '',
      plate: '',
      year: '',
      fuelType: 'Flex',
      status: 'Disponível',
      currentKm: 0,
      renavam: '',
      insuranceExpiry: '',
    });
    setShowAddVehicle(false);
    setSelectedVehicleId(vehicle.id);
  };

  const handleCreateMaintenance = (e: React.FormEvent) => {
    e.preventDefault();
    const vId = newMaintenance.vehicleId || selectedVehicleId;
    const targetVehicle = vehicles.find(v => v.id === vId);
    if (!vId || !targetVehicle) {
      alert('Por favor, selecione um veículo válido.');
      return;
    }

    const mRecord: MaintenanceRecord = {
      id: `m-${Date.now()}`,
      vehicleId: vId,
      vehiclePlate: targetVehicle.plate,
      date: newMaintenance.date || new Date().toISOString().split('T')[0],
      type: (newMaintenance.type as any) || 'Preventiva',
      description: newMaintenance.description || '',
      cost: Number(newMaintenance.cost) || 0,
      providerName: newMaintenance.providerName || '',
      odometer: Number(newMaintenance.odometer) || targetVehicle.currentKm,
      nextMaintenanceDate: newMaintenance.nextMaintenanceDate,
      nextMaintenanceKm: Number(newMaintenance.nextMaintenanceKm) || undefined,
    };

    // Update vehicle odometer if the maintenance has higher odometer value
    const updatedVehicles = vehicles.map(v => {
      if (v.id === vId) {
        return {
          ...v,
          currentKm: Math.max(v.currentKm, mRecord.odometer),
          status: 'Disponível' as const // release from maintenance if registered
        };
      }
      return v;
    });

    updateData({
      maintenances: [...maintenances, mRecord],
      vehicles: updatedVehicles,
      // Record this as a financial expense as well if categories match
      financialTransactions: [
        ...(data.financialTransactions || []),
        {
          id: `f-${Date.now()}`,
          type: 'despesa',
          description: `Manutenção: ${targetVehicle.model} (${targetVehicle.plate}) - ${mRecord.type}`,
          amount: mRecord.cost,
          date: mRecord.date,
          category: 'Outros',
          paymentMethod: 'Pix',
          status: 'pago',
        }
      ]
    });

    setNewMaintenance({
      vehicleId: '',
      date: new Date().toISOString().split('T')[0],
      type: 'Preventiva',
      description: '',
      cost: 0,
      providerName: '',
      odometer: 0,
      nextMaintenanceDate: '',
      nextMaintenanceKm: 0,
    });
    setShowAddMaintenance(false);
  };

  const handleCreateSupply = (e: React.FormEvent) => {
    e.preventDefault();
    const vId = newSupply.vehicleId || selectedVehicleId;
    const targetVehicle = vehicles.find(v => v.id === vId);
    if (!vId || !targetVehicle) {
      alert('Por favor, selecione um veículo válido.');
      return;
    }

    const sRecord: SupplyRecord = {
      id: `s-${Date.now()}`,
      vehicleId: vId,
      vehiclePlate: targetVehicle.plate,
      date: newSupply.date || new Date().toISOString().split('T')[0],
      fuelType: newSupply.fuelType || targetVehicle.fuelType,
      liters: Number(newSupply.liters) || 0,
      cost: Number(newSupply.cost) || 0,
      odometer: Number(newSupply.odometer) || targetVehicle.currentKm,
      stationName: newSupply.stationName || '',
    };

    const updatedVehicles = vehicles.map(v => {
      if (v.id === vId) {
        return {
          ...v,
          currentKm: Math.max(v.currentKm, sRecord.odometer),
        };
      }
      return v;
    });

    updateData({
      supplies: [...supplies, sRecord],
      vehicles: updatedVehicles,
      financialTransactions: [
        ...(data.financialTransactions || []),
        {
          id: `f-${Date.now()}`,
          type: 'despesa',
          description: `Abastecimento: ${targetVehicle.model} (${targetVehicle.plate})`,
          amount: sRecord.cost,
          date: sRecord.date,
          category: 'Outros',
          paymentMethod: 'Cartão de Débito',
          status: 'pago',
        }
      ]
    });

    setNewSupply({
      vehicleId: '',
      date: new Date().toISOString().split('T')[0],
      fuelType: 'Gasolina',
      liters: 0,
      cost: 0,
      odometer: 0,
      stationName: '',
    });
    setShowAddSupply(false);
  };

  const handleStartTrip = (e: React.FormEvent) => {
    e.preventDefault();
    const vId = newTrip.vehicleId || selectedVehicleId;
    const targetVehicle = vehicles.find(v => v.id === vId);
    if (!vId || !targetVehicle) {
      alert('Por favor, selecione um veículo válido.');
      return;
    }

    if (targetVehicle.status !== 'Disponível') {
      alert('Veículo indisponível no momento.');
      return;
    }

    const tRecord: TripRecord = {
      id: `t-${Date.now()}`,
      vehicleId: vId,
      vehiclePlate: targetVehicle.plate,
      date: newTrip.date || new Date().toISOString().split('T')[0],
      driverName: newTrip.driverName || '',
      purpose: newTrip.purpose || '',
      startKm: Number(newTrip.startKm) || targetVehicle.currentKm,
      status: 'Ativo',
    };

    const updatedVehicles = vehicles.map(v => {
      if (v.id === vId) {
        return {
          ...v,
          status: 'Em Uso' as const,
          currentKm: Math.max(v.currentKm, tRecord.startKm)
        };
      }
      return v;
    });

    updateData({
      trips: [...trips, tRecord],
      vehicles: updatedVehicles,
    });

    setNewTrip({
      vehicleId: '',
      date: new Date().toISOString().split('T')[0],
      driverName: '',
      purpose: '',
      startKm: 0,
    });
    setShowAddTrip(false);
  };

  const handleFinishTrip = (tripId: string) => {
    const targetTrip = trips.find(t => t.id === tripId);
    if (!targetTrip) return;

    if (finishKm <= targetTrip.startKm) {
      alert(`O KM final deve ser maior que o KM inicial (${targetTrip.startKm} KM).`);
      return;
    }

    const updatedTrips = trips.map(t => {
      if (t.id === tripId) {
        return {
          ...t,
          endKm: finishKm,
          status: 'Concluído' as const,
        };
      }
      return t;
    });

    const updatedVehicles = vehicles.map(v => {
      if (v.id === targetTrip.vehicleId) {
        return {
          ...v,
          status: 'Disponível' as const,
          currentKm: finishKm,
        };
      }
      return v;
    });

    updateData({
      trips: updatedTrips,
      vehicles: updatedVehicles,
    });

    setShowFinishTripId(null);
    setFinishKm(0);
  };

  const handleDeleteVehicle = (id: string) => {
    if (confirm('Tem certeza de que deseja remover este veículo?')) {
      updateData({
        vehicles: vehicles.filter(v => v.id !== id),
        maintenances: maintenances.filter(m => m.vehicleId !== id),
        supplies: supplies.filter(s => s.vehicleId !== id),
        trips: trips.filter(t => t.vehicleId !== id),
      });
      if (selectedVehicleId === id) {
        setSelectedVehicleId(null);
      }
    }
  };

  const handleUpdateVehicleStatus = (id: string, status: 'Disponível' | 'Em Uso' | 'Em Manutenção') => {
    const updated = vehicles.map(v => {
      if (v.id === id) {
        return { ...v, status };
      }
      return v;
    });
    updateData({ vehicles: updated });
  };

  const filteredVehicles = vehicles.filter(v => {
    const query = searchTerm.toLowerCase();
    return v.model.toLowerCase().includes(query) || v.plate.toLowerCase().includes(query);
  });

  const handlePrintFleetReport = () => {
    try {
      const doc = new jsPDF();
      let yPos = addStandardHeader(doc, data, "RELATÓRIO ANALÍTICO DE FROTA E CUSTOS");

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.setTextColor(0, 0, 0);
      doc.text("Resumo Executivo", 14, yPos);
      yPos += 10;
      
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.text(`Total de Veículos: ${vehicles.length}`, 14, yPos);
      yPos += 6;
      doc.text(`Custo Total de Manutenções: R$ ${totalMaintenanceCost.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`, 14, yPos);
      yPos += 6;
      doc.text(`Custo Total de Abastecimentos: R$ ${totalSupplyCost.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}`, 14, yPos);
      yPos += 15;

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text("1. Inventário da Frota", 14, yPos);
      yPos += 5;

      const fleetBody = vehicles.map(v => [
        v.model,
        v.plate,
        `${v.year} / ${v.fuelType}`,
        `${v.currentKm} km`,
        v.status
      ]);

      autoTable(doc, {
        startY: yPos,
        head: [['Veículo', 'Placa', 'Ano/Combustível', 'Odômetro Atual', 'Status']],
        body: fleetBody,
        theme: 'grid',
        headStyles: { fillColor: [185, 28, 28] }, // Red-700
        styles: { fontSize: 8 },
        margin: { left: 14, right: 14 }
      });
      
      yPos = (doc as any).lastAutoTable.finalY + 15;

      if (yPos > doc.internal.pageSize.getHeight() - 40) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text("2. Manutenções Recentes (Últimas 5)", 14, yPos);
      yPos += 5;

      const maintBody = [...maintenances]
        .sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime())
        .slice(0, 5)
        .map(m => [
          new Date(m.date + 'T00:00:00').toLocaleDateString('pt-BR'),
          m.vehiclePlate,
          m.type,
          m.description.substring(0, 50) + (m.description.length > 50 ? '...' : ''),
          `R$ ${m.cost.toLocaleString('pt-BR', {minimumFractionDigits:2})}`
        ]);

      autoTable(doc, {
        startY: yPos,
        head: [['Data', 'Veículo', 'Tipo', 'Descrição', 'Custo']],
        body: maintBody,
        theme: 'grid',
        headStyles: { fillColor: [185, 28, 28] },
        styles: { fontSize: 8 },
        margin: { left: 14, right: 14 }
      });

      yPos = (doc as any).lastAutoTable.finalY + 15;

      if (yPos > doc.internal.pageSize.getHeight() - 50) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(14);
      doc.text("3. Comentários Analíticos", 14, yPos);
      yPos += 8;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(10);
      
      const splitText1 = doc.splitTextToSize(
        `A frota atual é composta por ${vehicles.length} veículos. No presente momento, ${inMaintenanceCount} veículos encontram-se inoperantes (Em Manutenção), enquanto ${activeTripsCount} estão em rotas ativas (Em Uso).`,
        182
      );
      doc.text(splitText1, 14, yPos);
      yPos += (splitText1.length * 5) + 4;

      const splitText2 = doc.splitTextToSize(
        `O investimento total em reparos ao longo do período analisado é de R$ ${totalMaintenanceCost.toLocaleString('pt-BR', {minimumFractionDigits:2})}. O gasto total consolidado em combustíveis é de R$ ${totalSupplyCost.toLocaleString('pt-BR', {minimumFractionDigits:2})} para um volume total de ${totalLiters.toFixed(1).replace('.',',')} litros registrados.`,
        182
      );
      doc.text(splitText2, 14, yPos);

      addStandardFooter(doc, data);

      doc.save(`Relatorio_Frota_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('Erro ao gerar PDF:', error);
      alert('Não foi possível gerar o PDF. Verifique o console para mais detalhes.');
    }
  };

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="flex flex-col h-full p-8 overflow-hidden bg-black text-white">
      {/* Top Header */}
      <div className="flex items-center justify-between mb-8 flex-shrink-0">
        <div>
          <h1 className="text-2xl font-semibold text-white flex items-center gap-3">
            <Car className="w-8 h-8 text-red-500" />
            Controle de Frota
          </h1>
          <p className="text-zinc-400">Gerenciamento de veículos, manutenções, abastecimentos e registro de viagens.</p>
        </div>
        <div className="flex gap-3">
          <button 
            onClick={() => {
              setNewMaintenance(prev => ({ ...prev, vehicleId: selectedVehicleId || '' }));
              setShowAddMaintenance(true);
            }}
            className="flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 px-4 py-2 rounded-md text-sm font-medium transition-colors"
          >
            <Wrench className="w-4 h-4 text-red-500" />
            Registrar Manutenção
          </button>
          <button 
            onClick={() => {
              setNewSupply(prev => ({ ...prev, vehicleId: selectedVehicleId || '' }));
              setShowAddSupply(true);
            }}
            className="flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 px-4 py-2 rounded-md text-sm font-medium transition-colors"
          >
            <Fuel className="w-4 h-4 text-orange-500" />
            Registrar Abastecimento
          </button>
          <button 
            onClick={() => setShowAddVehicle(true)}
            className="flex items-center gap-2 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-md text-sm font-medium transition-colors shadow-lg"
          >
            <Plus className="w-4 h-4" />
            Cadastrar Veículo
          </button>
          <button 
            onClick={() => setShowReport(true)}
            className="flex items-center gap-2 bg-zinc-900 hover:bg-zinc-800 border border-zinc-800 text-zinc-300 px-4 py-2 rounded-md text-sm font-medium transition-colors shadow-lg"
          >
            <FileText className="w-4 h-4 text-emerald-500" />
            Gerar Relatório
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-4 gap-6 mb-8 flex-shrink-0">
        <div className="bg-zinc-950 border border-zinc-900 p-5 rounded-xl flex items-center justify-between shadow-sm">
          <div>
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Frota Total</p>
            <p className="text-3xl font-bold mt-1 text-white">{vehicles.length}</p>
          </div>
          <div className="w-12 h-12 rounded-lg bg-zinc-900 flex items-center justify-center">
            <Car className="w-6 h-6 text-red-500" />
          </div>
        </div>

        <div className="bg-zinc-950 border border-zinc-900 p-5 rounded-xl flex items-center justify-between shadow-sm">
          <div>
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Veículos Em Uso</p>
            <p className="text-3xl font-bold mt-1 text-emerald-500">{activeTripsCount} <span className="text-sm font-normal text-zinc-500">ativo(s)</span></p>
          </div>
          <div className="w-12 h-12 rounded-lg bg-zinc-900 flex items-center justify-center">
            <Milestone className="w-6 h-6 text-emerald-500" />
          </div>
        </div>

        <div className="bg-zinc-950 border border-zinc-900 p-5 rounded-xl flex items-center justify-between shadow-sm">
          <div>
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Custo Manutenções</p>
            <p className="text-3xl font-bold mt-1 text-red-400">R$ {totalMaintenanceCost.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </div>
          <div className="w-12 h-12 rounded-lg bg-zinc-900 flex items-center justify-center">
            <Wrench className="w-6 h-6 text-red-400" />
          </div>
        </div>

        <div className="bg-zinc-950 border border-zinc-900 p-5 rounded-xl flex items-center justify-between shadow-sm">
          <div>
            <p className="text-xs font-semibold text-zinc-500 uppercase tracking-wider">Abastecimento Total</p>
            <p className="text-3xl font-bold mt-1 text-orange-400">R$ {totalSupplyCost.toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
          </div>
          <div className="w-12 h-12 rounded-lg bg-zinc-900 flex items-center justify-center">
            <Fuel className="w-6 h-6 text-orange-400" />
          </div>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex border-b border-zinc-900 mb-6 flex-shrink-0">
        <button
          onClick={() => setActiveTab('vehicles')}
          className={`px-6 py-3 text-sm font-medium border-b-2 transition-all ${
            activeTab === 'vehicles' ? 'border-red-500 text-white bg-zinc-950/20' : 'border-transparent text-zinc-400 hover:text-white'
          }`}
        >
          <span className="flex items-center gap-2">
            <Car className="w-4 h-4" /> Veículos & Cadastro
          </span>
        </button>
        <button
          onClick={() => setActiveTab('maintenances')}
          className={`px-6 py-3 text-sm font-medium border-b-2 transition-all ${
            activeTab === 'maintenances' ? 'border-red-500 text-white bg-zinc-950/20' : 'border-transparent text-zinc-400 hover:text-white'
          }`}
        >
          <span className="flex items-center gap-2">
            <Wrench className="w-4 h-4" /> Registro de Manutenções
          </span>
        </button>
        <button
          onClick={() => setActiveTab('supplies')}
          className={`px-6 py-3 text-sm font-medium border-b-2 transition-all ${
            activeTab === 'supplies' ? 'border-red-500 text-white bg-zinc-950/20' : 'border-transparent text-zinc-400 hover:text-white'
          }`}
        >
          <span className="flex items-center gap-2">
            <Fuel className="w-4 h-4" /> Abastecimentos
          </span>
        </button>
        <button
          onClick={() => setActiveTab('trips')}
          className={`px-6 py-3 text-sm font-medium border-b-2 transition-all ${
            activeTab === 'trips' ? 'border-red-500 text-white bg-zinc-950/20' : 'border-transparent text-zinc-400 hover:text-white'
          }`}
        >
          <span className="flex items-center gap-2">
            <Milestone className="w-4 h-4" /> Histórico de Viagens (KM)
          </span>
        </button>
      </div>

      {/* Tab Content Section */}
      <div className="flex-1 min-h-0 overflow-hidden">
        
        {/* TAB 1: VEHICLES */}
        {activeTab === 'vehicles' && (
          <div className="flex gap-8 h-full">
            {/* Sidebar List */}
            <div className="w-1/3 flex flex-col bg-zinc-950 rounded-xl border border-zinc-900 overflow-hidden">
              <div className="p-4 border-b border-zinc-900 flex items-center justify-between gap-2 bg-zinc-950">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 absolute left-3 top-3 text-zinc-500" />
                  <input
                    type="text"
                    placeholder="Buscar veículo ou placa..."
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    className="w-full bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 rounded-lg pl-9 pr-3 py-2.5 focus:outline-none focus:border-red-500"
                  />
                </div>
              </div>

              <div className="flex-1 overflow-y-auto p-3 space-y-2">
                {filteredVehicles.length === 0 ? (
                  <div className="text-center p-8 text-zinc-500 text-sm">Nenhum veículo encontrado.</div>
                ) : (
                  filteredVehicles.map(v => (
                    <button
                      key={v.id}
                      onClick={() => setSelectedVehicleId(v.id)}
                      className={`w-full text-left p-4 rounded-xl border transition-all duration-150 block relative ${
                        selectedVehicleId === v.id
                          ? 'bg-zinc-900 border-zinc-700 shadow-lg'
                          : 'bg-zinc-950/50 border-zinc-900 hover:bg-zinc-900/40 hover:border-zinc-800'
                      }`}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <span className="font-bold text-white text-sm tracking-tight">{v.model}</span>
                        <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold uppercase ${
                          v.status === 'Disponível' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' :
                          v.status === 'Em Uso' ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20' :
                          'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                        }`}>
                          {v.status}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs text-zinc-400 mt-2">
                        <span className="bg-zinc-800 text-zinc-300 font-mono px-2 py-0.5 rounded border border-zinc-750">{v.plate}</span>
                        <span className="flex items-center gap-1"><Gauge className="w-3.5 h-3.5 text-zinc-500" /> {v.currentKm.toLocaleString('pt-BR')} KM</span>
                      </div>
                    </button>
                  ))
                )}
              </div>
            </div>

            {/* Detailed Panel */}
            <div className="w-2/3 bg-zinc-950 rounded-xl border border-zinc-900 overflow-hidden flex flex-col">
              {activeVehicle ? (
                <div className="flex-1 overflow-y-auto p-6">
                  {/* Vehicle Hero section */}
                  <div className="flex items-start justify-between border-b border-zinc-900 pb-6 mb-6">
                    <div>
                      <div className="flex items-center gap-3">
                        <h2 className="text-xl font-bold text-white">{activeVehicle.model}</h2>
                        <span className="bg-zinc-800 font-mono px-3 py-1 rounded-md text-xs font-bold text-zinc-300 tracking-wider uppercase border border-zinc-700">
                          {activeVehicle.plate}
                        </span>
                      </div>
                      <p className="text-xs text-zinc-500 mt-1.5">Renavam: {activeVehicle.renavam || 'Não cadastrado'} • Ano: {activeVehicle.year}</p>
                    </div>

                    <div className="flex items-center gap-2">
                      {/* Action buttons inside vehicle detail */}
                      {activeVehicle.status === 'Disponível' && (
                        <button
                          onClick={() => {
                            setNewTrip(prev => ({ ...prev, vehicleId: activeVehicle.id, startKm: activeVehicle.currentKm }));
                            setShowAddTrip(true);
                          }}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold px-3 py-2 rounded-md transition-all flex items-center gap-1.5"
                        >
                          <Milestone className="w-3.5 h-3.5" /> Registrar Viagem
                        </button>
                      )}

                      <select
                        value={activeVehicle.status}
                        onChange={(e) => handleUpdateVehicleStatus(activeVehicle.id, e.target.value as any)}
                        className="bg-zinc-900 border border-zinc-800 text-xs text-zinc-300 rounded-md py-2 px-2.5 font-medium focus:outline-none focus:border-red-500"
                      >
                        <option value="Disponível">Disponível</option>
                        <option value="Em Uso">Em Uso</option>
                        <option value="Em Manutenção">Em Manutenção</option>
                      </select>

                      <button
                        onClick={() => handleDeleteVehicle(activeVehicle.id)}
                        className="p-2 border border-red-500/20 text-red-400 hover:bg-red-500/10 rounded-md transition-all ml-1"
                        title="Remover veículo"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>

                  {/* General specs and dates */}
                  <div className="grid grid-cols-3 gap-4 mb-8">
                    <div className="bg-zinc-900/40 p-4 rounded-xl border border-zinc-900">
                      <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wide block mb-1">Combustível</span>
                      <span className="text-sm font-semibold text-zinc-200">{activeVehicle.fuelType}</span>
                    </div>
                    <div className="bg-zinc-900/40 p-4 rounded-xl border border-zinc-900">
                      <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wide block mb-1">Quilometragem Atual</span>
                      <span className="text-sm font-semibold text-zinc-200 flex items-center gap-1">
                        <Gauge className="w-4 h-4 text-zinc-400" /> {activeVehicle.currentKm.toLocaleString('pt-BR')} KM
                      </span>
                    </div>
                    <div className="bg-zinc-900/40 p-4 rounded-xl border border-zinc-900">
                      <span className="text-[10px] uppercase font-bold text-zinc-500 tracking-wide block mb-1">Vencimento do Seguro</span>
                      <span className="text-sm font-semibold text-zinc-200 flex items-center gap-1.5">
                        <Calendar className="w-4 h-4 text-zinc-400" /> 
                        {activeVehicle.insuranceExpiry ? new Date(activeVehicle.insuranceExpiry).toLocaleDateString('pt-BR') : 'Não informado'}
                      </span>
                    </div>
                  </div>

                  {/* Dynamic sections: Sub logs of the vehicle */}
                  <div className="space-y-6">
                    {/* Related Active Trips */}
                    {trips.filter(t => t.vehicleId === activeVehicle.id && t.status === 'Ativo').length > 0 && (
                      <div className="border border-emerald-500/20 bg-emerald-500/5 p-4 rounded-xl">
                        <h3 className="text-xs font-bold text-emerald-400 uppercase tracking-wide mb-3 flex items-center gap-2">
                          <Milestone className="w-4 h-4 animate-bounce" /> Viagem Ativa em Andamento
                        </h3>
                        {trips.filter(t => t.vehicleId === activeVehicle.id && t.status === 'Ativo').map(trip => (
                          <div key={trip.id} className="flex justify-between items-center text-xs">
                            <div className="space-y-1 text-zinc-300">
                              <p className="font-semibold"><span className="text-zinc-500">Motorista:</span> {trip.driverName}</p>
                              <p><span className="text-zinc-500">Motivo:</span> {trip.purpose}</p>
                              <p><span className="text-zinc-500">Início em:</span> {trip.startKm} KM</p>
                            </div>
                            <div>
                              <button
                                onClick={() => {
                                  setFinishKm(activeVehicle.currentKm);
                                  setShowFinishTripId(trip.id);
                                }}
                                className="bg-emerald-600 hover:bg-emerald-700 text-white text-[11px] font-semibold px-3 py-1.5 rounded"
                              >
                                Encerrar Viagem
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}

                    {/* Latest supplies for this vehicle */}
                    <div className="bg-zinc-900/20 border border-zinc-900 rounded-xl p-4">
                      <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3 flex items-center justify-between">
                        <span>Últimos Abastecimentos</span>
                        <span className="text-[10px] text-zinc-500 font-normal">Soma: R$ {supplies.filter(s => s.vehicleId === activeVehicle.id).reduce((sum, s) => sum + s.cost, 0).toLocaleString('pt-BR')}</span>
                      </h3>
                      <div className="space-y-2.5">
                        {supplies.filter(s => s.vehicleId === activeVehicle.id).length === 0 ? (
                          <p className="text-xs text-zinc-500">Nenhum abastecimento registrado.</p>
                        ) : (
                          supplies.filter(s => s.vehicleId === activeVehicle.id).slice(0, 3).map(s => (
                            <div key={s.id} className="flex items-center justify-between text-xs border-b border-zinc-900/50 pb-2 last:border-0 last:pb-0">
                              <div className="space-y-0.5">
                                <span className="text-zinc-300 font-medium">{new Date(s.date).toLocaleDateString('pt-BR')} • {s.fuelType}</span>
                                <p className="text-[10px] text-zinc-500">{s.stationName || 'Posto sem nome'} • Odom: {s.odometer} KM</p>
                              </div>
                              <div className="text-right">
                                <p className="font-bold text-orange-400">R$ {s.cost.toFixed(2)}</p>
                                <p className="text-[10px] text-zinc-500">{s.liters} L • R$ {(s.cost / (s.liters || 1)).toFixed(2)}/L</p>
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>

                    {/* Latest maintenance for this vehicle */}
                    <div className="bg-zinc-900/20 border border-zinc-900 rounded-xl p-4">
                      <h3 className="text-xs font-bold text-zinc-400 uppercase tracking-wider mb-3 flex items-center justify-between">
                        <span>Manutenções Efetuadas</span>
                        <span className="text-[10px] text-zinc-500 font-normal">Soma: R$ {maintenances.filter(m => m.vehicleId === activeVehicle.id).reduce((sum, m) => sum + m.cost, 0).toLocaleString('pt-BR')}</span>
                      </h3>
                      <div className="space-y-2.5">
                        {maintenances.filter(m => m.vehicleId === activeVehicle.id).length === 0 ? (
                          <p className="text-xs text-zinc-500">Nenhuma manutenção registrada.</p>
                        ) : (
                          maintenances.filter(m => m.vehicleId === activeVehicle.id).slice(0, 3).map(m => (
                            <div key={m.id} className="flex items-center justify-between text-xs border-b border-zinc-900/50 pb-2 last:border-0 last:pb-0">
                              <div className="space-y-0.5">
                                <span className="text-zinc-300 font-semibold">{m.description}</span>
                                <p className="text-[10px] text-zinc-500">{new Date(m.date).toLocaleDateString('pt-BR')} • {m.type} • {m.providerName}</p>
                              </div>
                              <div className="text-right">
                                <p className="font-bold text-red-400">R$ {m.cost.toFixed(2)}</p>
                                {m.nextMaintenanceKm && <p className="text-[10px] text-zinc-500">Próxima: {m.nextMaintenanceKm} KM</p>}
                              </div>
                            </div>
                          ))
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="flex-1 flex flex-col items-center justify-center text-zinc-500 text-sm">
                  <Car className="w-12 h-12 mb-2 text-zinc-700" />
                  Selecione um veículo para ver os detalhes
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 2: MAINTENANCES */}
        {activeTab === 'maintenances' && (
          <div className="bg-zinc-950 border border-zinc-900 rounded-xl flex flex-col h-full overflow-hidden">
            <div className="p-4 border-b border-zinc-900 bg-zinc-900/40 flex justify-between items-center">
              <span className="text-xs font-bold uppercase text-zinc-400 tracking-wider">Histórico Geral de Manutenções</span>
              <button 
                onClick={() => setShowAddMaintenance(true)}
                className="bg-red-600 hover:bg-red-700 text-white text-xs font-semibold px-3 py-1.5 rounded transition-colors flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Registrar Manutenção
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {maintenances.length === 0 ? (
                <p className="text-center p-8 text-zinc-500 text-sm">Nenhuma manutenção cadastrada.</p>
              ) : (
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-zinc-900 text-zinc-400 font-bold bg-zinc-900/10">
                      <th className="p-4">Data</th>
                      <th className="p-4">Veículo / Placa</th>
                      <th className="p-4">Tipo</th>
                      <th className="p-4">Descrição / Detalhes</th>
                      <th className="p-4">Estabelecimento</th>
                      <th className="p-4 text-right">Odom. (KM)</th>
                      <th className="p-4 text-right">Custo</th>
                    </tr>
                  </thead>
                  <tbody>
                    {maintenances.map(m => (
                      <tr key={m.id} className="border-b border-zinc-900/50 hover:bg-zinc-900/20 text-zinc-300">
                        <td className="p-4">{new Date(m.date).toLocaleDateString('pt-BR')}</td>
                        <td className="p-4 font-semibold">
                          {m.vehiclePlate}
                        </td>
                        <td className="p-4">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            m.type === 'Preventiva' ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20' : 'bg-red-500/10 text-red-400 border border-red-500/20'
                          }`}>
                            {m.type}
                          </span>
                        </td>
                        <td className="p-4 max-w-[280px] truncate" title={m.description}>{m.description}</td>
                        <td className="p-4 text-zinc-400">{m.providerName || '-'}</td>
                        <td className="p-4 text-right font-mono">{m.odometer.toLocaleString('pt-BR')} KM</td>
                        <td className="p-4 text-right font-bold text-red-400">R$ {m.cost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: SUPPLIES */}
        {activeTab === 'supplies' && (
          <div className="bg-zinc-950 border border-zinc-900 rounded-xl flex flex-col h-full overflow-hidden">
            <div className="p-4 border-b border-zinc-900 bg-zinc-900/40 flex justify-between items-center">
              <span className="text-xs font-bold uppercase text-zinc-400 tracking-wider">Histórico Geral de Abastecimentos</span>
              <button 
                onClick={() => setShowAddSupply(true)}
                className="bg-red-600 hover:bg-red-700 text-white text-xs font-semibold px-3 py-1.5 rounded transition-colors flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Registrar Abastecimento
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {supplies.length === 0 ? (
                <p className="text-center p-8 text-zinc-500 text-sm">Nenhum abastecimento cadastrado.</p>
              ) : (
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-zinc-900 text-zinc-400 font-bold bg-zinc-900/10">
                      <th className="p-4">Data</th>
                      <th className="p-4">Veículo / Placa</th>
                      <th className="p-4">Combustível</th>
                      <th className="p-4">Posto</th>
                      <th className="p-4 text-right">Liters (L)</th>
                      <th className="p-4 text-right">Odom. (KM)</th>
                      <th className="p-4 text-right">Custo Unit.</th>
                      <th className="p-4 text-right">Valor Total</th>
                    </tr>
                  </thead>
                  <tbody>
                    {supplies.map(s => (
                      <tr key={s.id} className="border-b border-zinc-900/50 hover:bg-zinc-900/20 text-zinc-300">
                        <td className="p-4">{new Date(s.date).toLocaleDateString('pt-BR')}</td>
                        <td className="p-4 font-semibold">{s.vehiclePlate}</td>
                        <td className="p-4 text-zinc-400">{s.fuelType}</td>
                        <td className="p-4 text-zinc-400">{s.stationName || '-'}</td>
                        <td className="p-4 text-right font-mono text-zinc-300">{s.liters} L</td>
                        <td className="p-4 text-right font-mono">{s.odometer.toLocaleString('pt-BR')} KM</td>
                        <td className="p-4 text-right text-zinc-500">R$ {(s.cost / (s.liters || 1)).toLocaleString('pt-BR', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</td>
                        <td className="p-4 text-right font-bold text-orange-400">R$ {s.cost.toLocaleString('pt-BR', { minimumFractionDigits: 2 })}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: TRIPS */}
        {activeTab === 'trips' && (
          <div className="bg-zinc-950 border border-zinc-900 rounded-xl flex flex-col h-full overflow-hidden">
            <div className="p-4 border-b border-zinc-900 bg-zinc-900/40 flex justify-between items-center">
              <span className="text-xs font-bold uppercase text-zinc-400 tracking-wider">Registro de Viagens & Uso</span>
              <button 
                onClick={() => setShowAddTrip(true)}
                className="bg-red-600 hover:bg-red-700 text-white text-xs font-semibold px-3 py-1.5 rounded transition-colors flex items-center gap-1"
              >
                <Plus className="w-3.5 h-3.5" /> Registrar Nova Viagem
              </button>
            </div>
            <div className="flex-1 overflow-y-auto">
              {trips.length === 0 ? (
                <p className="text-center p-8 text-zinc-500 text-sm">Nenhuma viagem registrada.</p>
              ) : (
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className="border-b border-zinc-900 text-zinc-400 font-bold bg-zinc-900/10">
                      <th className="p-4">Data</th>
                      <th className="p-4">Veículo / Placa</th>
                      <th className="p-4">Motorista</th>
                      <th className="p-4">Finalidade</th>
                      <th className="p-4 text-right">KM Inicial</th>
                      <th className="p-4 text-right">KM Final</th>
                      <th className="p-4 text-right">KM Rodados</th>
                      <th className="p-4 text-center">Status</th>
                      <th className="p-4">Ação</th>
                    </tr>
                  </thead>
                  <tbody>
                    {trips.map(t => (
                      <tr key={t.id} className="border-b border-zinc-900/50 hover:bg-zinc-900/20 text-zinc-300">
                        <td className="p-4">{new Date(t.date).toLocaleDateString('pt-BR')}</td>
                        <td className="p-4 font-semibold">{t.vehiclePlate}</td>
                        <td className="p-4 text-zinc-300 font-medium">{t.driverName}</td>
                        <td className="p-4 text-zinc-400 truncate max-w-[200px]" title={t.purpose}>{t.purpose}</td>
                        <td className="p-4 text-right font-mono text-zinc-400">{t.startKm.toLocaleString('pt-BR')} KM</td>
                        <td className="p-4 text-right font-mono">{t.endKm ? `${t.endKm.toLocaleString('pt-BR')} KM` : '-'}</td>
                        <td className="p-4 text-right font-bold text-emerald-400 font-mono">
                          {t.endKm ? `${(t.endKm - t.startKm).toLocaleString('pt-BR')} KM` : '-'}
                        </td>
                        <td className="p-4 text-center">
                          <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                            t.status === 'Ativo' ? 'bg-indigo-500/15 text-indigo-400 border border-indigo-500/20' : 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                          }`}>
                            {t.status}
                          </span>
                        </td>
                        <td className="p-4">
                          {t.status === 'Ativo' && (
                            <button
                              onClick={() => {
                                const activeV = vehicles.find(v => v.id === t.vehicleId);
                                setFinishKm(activeV ? activeV.currentKm : t.startKm + 10);
                                setShowFinishTripId(t.id);
                              }}
                              className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold text-[10px] px-2.5 py-1 rounded"
                            >
                              Encerrar
                            </button>
                          )}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          </div>
        )}
      </div>

      {/* FORM MODAL 1: ADD VEHICLE */}
      {showAddVehicle && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-900 w-full max-w-md rounded-2xl p-6 shadow-2xl relative animate-in zoom-in-95 duration-150">
            <button 
              onClick={() => setShowAddVehicle(false)}
              className="absolute right-4 top-4 text-zinc-500 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
              <Car className="w-5 h-5 text-red-500" /> Cadastrar Novo Veículo
            </h3>
            <form onSubmit={handleCreateVehicle} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-zinc-500 mb-1.5 font-semibold">Modelo do Veículo *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: Fiat Strada Freedom"
                    value={newVehicle.model}
                    onChange={(e) => setNewVehicle({...newVehicle, model: e.target.value})}
                    className="w-full bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-lg p-2.5 focus:outline-none focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="block text-zinc-500 mb-1.5 font-semibold">Placa *</label>
                  <input
                    type="text"
                    required
                    placeholder="Ex: RTS4E21"
                    maxLength={8}
                    value={newVehicle.plate}
                    onChange={(e) => setNewVehicle({...newVehicle, plate: e.target.value})}
                    className="w-full bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-lg p-2.5 focus:outline-none focus:border-red-500 uppercase font-mono"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-zinc-500 mb-1.5 font-semibold">Ano de Fabricação</label>
                  <input
                    type="text"
                    placeholder="Ex: 2022"
                    value={newVehicle.year}
                    onChange={(e) => setNewVehicle({...newVehicle, year: e.target.value})}
                    className="w-full bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-lg p-2.5 focus:outline-none focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="block text-zinc-500 mb-1.5 font-semibold">KM Inicial</label>
                  <input
                    type="number"
                    placeholder="Ex: 15000"
                    value={newVehicle.currentKm || ''}
                    onChange={(e) => setNewVehicle({...newVehicle, currentKm: Number(e.target.value)})}
                    className="w-full bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-lg p-2.5 focus:outline-none focus:border-red-500"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-zinc-500 mb-1.5 font-semibold">Combustível</label>
                  <select
                    value={newVehicle.fuelType}
                    onChange={(e) => setNewVehicle({...newVehicle, fuelType: e.target.value as any})}
                    className="w-full bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-lg p-2.5 focus:outline-none focus:border-red-500"
                  >
                    <option value="Flex">Flex</option>
                    <option value="Gasolina">Gasolina</option>
                    <option value="Etanol">Etanol</option>
                    <option value="Diesel">Diesel</option>
                    <option value="Elétrico">Elétrico</option>
                  </select>
                </div>
                <div>
                  <label className="block text-zinc-500 mb-1.5 font-semibold">Renavam (opcional)</label>
                  <input
                    type="text"
                    placeholder="Ex: 123456789"
                    value={newVehicle.renavam}
                    onChange={(e) => setNewVehicle({...newVehicle, renavam: e.target.value})}
                    className="w-full bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-lg p-2.5 focus:outline-none focus:border-red-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-zinc-500 mb-1.5 font-semibold">Data de Vencimento do Seguro</label>
                <input
                  type="date"
                  value={newVehicle.insuranceExpiry}
                  onChange={(e) => setNewVehicle({...newVehicle, insuranceExpiry: e.target.value})}
                  className="w-full bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-lg p-2.5 focus:outline-none focus:border-red-500"
                />
              </div>

              <div className="pt-4 flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setShowAddVehicle(false)}
                  className="px-4 py-2 border border-zinc-800 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-900 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium shadow-md shadow-red-900/10"
                >
                  Confirmar Cadastro
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FORM MODAL 2: REGISTER MAINTENANCE */}
      {showAddMaintenance && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-900 w-full max-w-md rounded-2xl p-6 shadow-2xl relative animate-in zoom-in-95 duration-150">
            <button 
              onClick={() => setShowAddMaintenance(false)}
              className="absolute right-4 top-4 text-zinc-500 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
              <Wrench className="w-5 h-5 text-red-500" /> Registrar Manutenção
            </h3>
            <form onSubmit={handleCreateMaintenance} className="space-y-4 text-xs">
              <div>
                <label className="block text-zinc-500 mb-1.5 font-semibold">Veículo</label>
                <select
                  value={newMaintenance.vehicleId || selectedVehicleId || ''}
                  onChange={(e) => setNewMaintenance({...newMaintenance, vehicleId: e.target.value})}
                  className="w-full bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-lg p-2.5 focus:outline-none focus:border-red-500"
                >
                  <option value="">Selecione um veículo...</option>
                  {vehicles.map(v => (
                    <option key={v.id} value={v.id}>{v.model} ({v.plate})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-zinc-500 mb-1.5 font-semibold">Data da Manutenção</label>
                  <input
                    type="date"
                    required
                    value={newMaintenance.date}
                    onChange={(e) => setNewMaintenance({...newMaintenance, date: e.target.value})}
                    className="w-full bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-lg p-2.5 focus:outline-none focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="block text-zinc-500 mb-1.5 font-semibold">Tipo de Manutenção</label>
                  <select
                    value={newMaintenance.type}
                    onChange={(e) => setNewMaintenance({...newMaintenance, type: e.target.value as any})}
                    className="w-full bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-lg p-2.5 focus:outline-none focus:border-red-500"
                  >
                    <option value="Preventiva">Preventiva</option>
                    <option value="Corretiva">Corretiva</option>
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-zinc-500 mb-1.5 font-semibold">Descrição do Serviço / Peças Trocadas *</label>
                <textarea
                  required
                  placeholder="Ex: Troca de óleo de motor, correia dentada e filtros."
                  rows={2}
                  value={newMaintenance.description}
                  onChange={(e) => setNewMaintenance({...newMaintenance, description: e.target.value})}
                  className="w-full bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-lg p-2.5 focus:outline-none focus:border-red-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-zinc-500 mb-1.5 font-semibold">Valor do Serviço (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="Ex: 500.00"
                    value={newMaintenance.cost || ''}
                    onChange={(e) => setNewMaintenance({...newMaintenance, cost: Number(e.target.value)})}
                    className="w-full bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-lg p-2.5 focus:outline-none focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="block text-zinc-500 mb-1.5 font-semibold">KM Atual do Veículo</label>
                  <input
                    type="number"
                    placeholder="Ex: 45000"
                    value={newMaintenance.odometer || ''}
                    onChange={(e) => setNewMaintenance({...newMaintenance, odometer: Number(e.target.value)})}
                    className="w-full bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-lg p-2.5 focus:outline-none focus:border-red-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-zinc-500 mb-1.5 font-semibold">Oficina / Estabelecimento</label>
                <input
                  type="text"
                  placeholder="Ex: Auto Mecânica Ramos"
                  value={newMaintenance.providerName}
                  onChange={(e) => setNewMaintenance({...newMaintenance, providerName: e.target.value})}
                  className="w-full bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-lg p-2.5 focus:outline-none focus:border-red-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4 border-t border-zinc-900 pt-3 mt-1">
                <div>
                  <label className="block text-zinc-500 mb-1.5 font-semibold">Próxima Manut. (Data)</label>
                  <input
                    type="date"
                    value={newMaintenance.nextMaintenanceDate}
                    onChange={(e) => setNewMaintenance({...newMaintenance, nextMaintenanceDate: e.target.value})}
                    className="w-full bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-lg p-2.5 focus:outline-none focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="block text-zinc-500 mb-1.5 font-semibold">Próxima Manut. (KM)</label>
                  <input
                    type="number"
                    placeholder="Ex: 55000"
                    value={newMaintenance.nextMaintenanceKm || ''}
                    onChange={(e) => setNewMaintenance({...newMaintenance, nextMaintenanceKm: Number(e.target.value)})}
                    className="w-full bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-lg p-2.5 focus:outline-none focus:border-red-500"
                  />
                </div>
              </div>

              <div className="pt-2 flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setShowAddMaintenance(false)}
                  className="px-4 py-2 border border-zinc-800 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-900 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors font-medium shadow-md"
                >
                  Registrar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FORM MODAL 3: REGISTER SUPPLY */}
      {showAddSupply && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-900 w-full max-w-md rounded-2xl p-6 shadow-2xl relative animate-in zoom-in-95 duration-150">
            <button 
              onClick={() => setShowAddSupply(false)}
              className="absolute right-4 top-4 text-zinc-500 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
              <Fuel className="w-5 h-5 text-orange-500" /> Registrar Abastecimento
            </h3>
            <form onSubmit={handleCreateSupply} className="space-y-4 text-xs">
              <div>
                <label className="block text-zinc-500 mb-1.5 font-semibold">Veículo</label>
                <select
                  value={newSupply.vehicleId || selectedVehicleId || ''}
                  onChange={(e) => setNewSupply({...newSupply, vehicleId: e.target.value})}
                  className="w-full bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-lg p-2.5 focus:outline-none focus:border-red-500"
                >
                  <option value="">Selecione um veículo...</option>
                  {vehicles.map(v => (
                    <option key={v.id} value={v.id}>{v.model} ({v.plate})</option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-zinc-500 mb-1.5 font-semibold">Data</label>
                  <input
                    type="date"
                    required
                    value={newSupply.date}
                    onChange={(e) => setNewSupply({...newSupply, date: e.target.value})}
                    className="w-full bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-lg p-2.5 focus:outline-none focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="block text-zinc-500 mb-1.5 font-semibold">Tipo de Combustível</label>
                  <select
                    value={newSupply.fuelType}
                    onChange={(e) => setNewSupply({...newSupply, fuelType: e.target.value})}
                    className="w-full bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-lg p-2.5 focus:outline-none focus:border-red-500"
                  >
                    <option value="Gasolina">Gasolina</option>
                    <option value="Etanol">Etanol</option>
                    <option value="Diesel">Diesel</option>
                    <option value="GNV">GNV</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-zinc-500 mb-1.5 font-semibold">Quantidade (L)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="Ex: 45"
                    value={newSupply.liters || ''}
                    onChange={(e) => setNewSupply({...newSupply, liters: Number(e.target.value)})}
                    className="w-full bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-lg p-2.5 focus:outline-none focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="block text-zinc-500 mb-1.5 font-semibold">Valor Total (R$)</label>
                  <input
                    type="number"
                    step="0.01"
                    required
                    placeholder="Ex: 250.00"
                    value={newSupply.cost || ''}
                    onChange={(e) => setNewSupply({...newSupply, cost: Number(e.target.value)})}
                    className="w-full bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-lg p-2.5 focus:outline-none focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="block text-zinc-500 mb-1.5 font-semibold">Odômetro (KM)</label>
                  <input
                    type="number"
                    required
                    placeholder="Ex: 42350"
                    value={newSupply.odometer || ''}
                    onChange={(e) => setNewSupply({...newSupply, odometer: Number(e.target.value)})}
                    className="w-full bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-lg p-2.5 focus:outline-none focus:border-red-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-zinc-500 mb-1.5 font-semibold">Posto de Combustível</label>
                <input
                  type="text"
                  placeholder="Ex: Posto Ipiranga Central"
                  value={newSupply.stationName}
                  onChange={(e) => setNewSupply({...newSupply, stationName: e.target.value})}
                  className="w-full bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-lg p-2.5 focus:outline-none focus:border-red-500"
                />
              </div>

              <div className="pt-4 flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setShowAddSupply(false)}
                  className="px-4 py-2 border border-zinc-800 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-900 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg transition-colors font-medium shadow-md"
                >
                  Registrar
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FORM MODAL 4: START TRIP */}
      {showAddTrip && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-900 w-full max-w-md rounded-2xl p-6 shadow-2xl relative animate-in zoom-in-95 duration-150">
            <button 
              onClick={() => setShowAddTrip(false)}
              className="absolute right-4 top-4 text-zinc-500 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold text-white mb-6 flex items-center gap-2">
              <Milestone className="w-5 h-5 text-emerald-500 animate-pulse" /> Registrar Nova Viagem
            </h3>
            <form onSubmit={handleStartTrip} className="space-y-4 text-xs">
              <div>
                <label className="block text-zinc-500 mb-1.5 font-semibold">Veículo</label>
                <select
                  value={newTrip.vehicleId || selectedVehicleId || ''}
                  onChange={(e) => {
                    const selected = vehicles.find(v => v.id === e.target.value);
                    setNewTrip({
                      ...newTrip,
                      vehicleId: e.target.value,
                      startKm: selected ? selected.currentKm : 0
                    });
                  }}
                  className="w-full bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-lg p-2.5 focus:outline-none focus:border-red-500"
                >
                  <option value="">Selecione um veículo...</option>
                  {vehicles.filter(v => v.status === 'Disponível').map(v => (
                    <option key={v.id} value={v.id}>{v.model} ({v.plate})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-zinc-500 mb-1.5 font-semibold">Nome do Motorista *</label>
                <input
                  type="text"
                  required
                  placeholder="Ex: Carlos Eduardo de Souza"
                  value={newTrip.driverName}
                  onChange={(e) => setNewTrip({...newTrip, driverName: e.target.value})}
                  className="w-full bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-lg p-2.5 focus:outline-none focus:border-red-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-zinc-500 mb-1.5 font-semibold">Data</label>
                  <input
                    type="date"
                    required
                    value={newTrip.date}
                    onChange={(e) => setNewTrip({...newTrip, date: e.target.value})}
                    className="w-full bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-lg p-2.5 focus:outline-none focus:border-red-500"
                  />
                </div>
                <div>
                  <label className="block text-zinc-500 mb-1.5 font-semibold">KM Inicial</label>
                  <input
                    type="number"
                    required
                    placeholder="Ex: 42150"
                    value={newTrip.startKm || ''}
                    onChange={(e) => setNewTrip({...newTrip, startKm: Number(e.target.value)})}
                    className="w-full bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-lg p-2.5 focus:outline-none focus:border-red-500"
                  />
                </div>
              </div>

              <div>
                <label className="block text-zinc-500 mb-1.5 font-semibold">Destino / Finalidade do Uso</label>
                <textarea
                  placeholder="Ex: Entrega de extintores e vistorias no cliente Restaurante Central."
                  rows={2}
                  value={newTrip.purpose}
                  onChange={(e) => setNewTrip({...newTrip, purpose: e.target.value})}
                  className="w-full bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-lg p-2.5 focus:outline-none focus:border-red-500"
                />
              </div>

              <div className="pt-4 flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setShowAddTrip(false)}
                  className="px-4 py-2 border border-zinc-800 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-900 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors font-medium shadow-md"
                >
                  Iniciar Viagem
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* FORM MODAL 5: FINISH TRIP */}
      {showFinishTripId && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-900 w-full max-w-sm rounded-2xl p-6 shadow-2xl relative animate-in zoom-in-95 duration-150">
            <button 
              onClick={() => setShowFinishTripId(null)}
              className="absolute right-4 top-4 text-zinc-500 hover:text-white"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-lg font-bold text-white mb-4 flex items-center gap-2">
              <CheckCircle className="w-5 h-5 text-emerald-500" /> Encerrar Viagem
            </h3>
            <p className="text-xs text-zinc-400 mb-6">
              Informe a quilometragem final do veículo para encerrar esta viagem e atualizar o status do veículo para disponível.
            </p>
            <div className="space-y-4 text-xs">
              <div>
                <label className="block text-zinc-500 mb-1.5 font-semibold">Odômetro Final (KM) *</label>
                <input
                  type="number"
                  required
                  placeholder="Ex: 42230"
                  value={finishKm || ''}
                  onChange={(e) => setFinishKm(Number(e.target.value))}
                  className="w-full bg-zinc-900 border border-zinc-800 text-zinc-300 rounded-lg p-3 focus:outline-none focus:border-red-500 font-mono text-base text-emerald-400"
                />
              </div>

              <div className="pt-4 flex gap-3 justify-end">
                <button
                  type="button"
                  onClick={() => setShowFinishTripId(null)}
                  className="px-4 py-2 border border-zinc-800 text-zinc-400 hover:text-white rounded-lg hover:bg-zinc-900 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  onClick={() => handleFinishTrip(showFinishTripId)}
                  className="px-5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors font-medium shadow-md"
                >
                  Salvar e Encerrar
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      
      {/* MODAL RELATÓRIO PDF */}
      {showReport && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-zinc-950 border border-zinc-800 rounded-xl w-full max-w-4xl max-h-[90vh] flex flex-col shadow-2xl">
            <div className="p-4 border-b border-zinc-800 flex justify-between items-center bg-zinc-900 rounded-t-xl print:hidden">
              <h2 className="text-lg font-bold text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-500" />
                Relatório de Controle de Frota
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
                  onClick={handlePrintFleetReport}
                  className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium transition-colors"
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

            <div id="fleet-report-content" className="p-8 overflow-y-auto flex-1 bg-white text-zinc-900 print:p-0 print:overflow-visible">
              <div className="max-w-3xl mx-auto space-y-8">
                {/* Header */}
                <div className="text-center space-y-2 border-b-2 border-zinc-200 pb-6">
                  <h1 className="text-2xl font-bold uppercase tracking-widest text-zinc-800">Relatório Analítico de Frota</h1>
                  <p className="text-zinc-500">Indicadores de Manutenção, Abastecimento e Uso</p>
                  <p className="text-sm text-zinc-400">Data de emissão: {new Date().toLocaleDateString('pt-BR')}</p>
                </div>

                {/* Resumo Final */}
                <div className="bg-zinc-50 border border-zinc-200 p-6 rounded-lg text-center grid grid-cols-3 gap-4">
                  <div>
                    <p className="text-xs uppercase tracking-widest text-zinc-500 font-bold mb-1">Total de Veículos</p>
                    <p className="text-3xl font-black text-zinc-800">{vehicles.length}</p>
                  </div>
                  <div className="border-l border-zinc-200">
                    <p className="text-xs uppercase tracking-widest text-zinc-500 font-bold mb-1">Custo Manutenção</p>
                    <p className="text-3xl font-black text-red-600">R$ {totalMaintenanceCost.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
                  </div>
                  <div className="border-l border-zinc-200">
                    <p className="text-xs uppercase tracking-widest text-zinc-500 font-bold mb-1">Custo Abastecimento</p>
                    <p className="text-3xl font-black text-orange-500">R$ {totalSupplyCost.toLocaleString('pt-BR', {minimumFractionDigits: 2, maximumFractionDigits: 2})}</p>
                  </div>
                </div>

                {/* Seção 1: Inventário da Frota */}
                <div>
                  <h3 className="text-lg font-bold border-b border-zinc-200 pb-2 mb-4 text-zinc-800">1. Inventário da Frota</h3>
                  <table className="w-full text-sm text-left">
                    <thead>
                      <tr className="border-b border-zinc-200 text-zinc-500">
                        <th className="py-2 font-semibold">Veículo</th>
                        <th className="py-2 font-semibold">Placa</th>
                        <th className="py-2 font-semibold">Ano/Combustível</th>
                        <th className="py-2 font-semibold text-right">Odômetro Atual</th>
                        <th className="py-2 font-semibold text-right">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {vehicles.map(v => (
                        <tr key={v.id}>
                          <td className="py-3 font-medium">{v.model}</td>
                          <td className="py-3">{v.plate}</td>
                          <td className="py-3 text-zinc-600">{v.year} • {v.fuelType}</td>
                          <td className="py-3 text-right font-mono">{v.currentKm} km</td>
                          <td className="py-3 text-right">
                            <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded-full ${
                              v.status === 'Disponível' ? 'bg-emerald-100 text-emerald-700' :
                              v.status === 'Em Uso' ? 'bg-blue-100 text-blue-700' :
                              'bg-red-100 text-red-700'
                            }`}>
                              {v.status}
                            </span>
                          </td>
                        </tr>
                      ))}
                      {vehicles.length === 0 && (
                        <tr><td colSpan={5} className="py-4 text-center text-zinc-500">Nenhum veículo cadastrado.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Seção 2: Histórico Recente de Manutenções */}
                <div>
                  <h3 className="text-lg font-bold border-b border-zinc-200 pb-2 mb-4 text-zinc-800">2. Manutenções Recentes (Últimas 5)</h3>
                  <table className="w-full text-sm text-left">
                    <thead>
                      <tr className="border-b border-zinc-200 text-zinc-500">
                        <th className="py-2 font-semibold">Data</th>
                        <th className="py-2 font-semibold">Veículo</th>
                        <th className="py-2 font-semibold">Tipo</th>
                        <th className="py-2 font-semibold">Descrição</th>
                        <th className="py-2 font-semibold text-right">Custo</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-zinc-100">
                      {[...maintenances].sort((a,b) => new Date(b.date).getTime() - new Date(a.date).getTime()).slice(0, 5).map(m => (
                        <tr key={m.id}>
                          <td className="py-3">{new Date(m.date + 'T00:00:00').toLocaleDateString('pt-BR')}</td>
                          <td className="py-3 font-medium">{m.vehiclePlate}</td>
                          <td className="py-3">
                            <span className={`text-[10px] uppercase font-bold px-2 py-1 rounded-full ${
                              m.type === 'Preventiva' ? 'bg-emerald-100 text-emerald-700' : 'bg-red-100 text-red-700'
                            }`}>
                              {m.type}
                            </span>
                          </td>
                          <td className="py-3 text-zinc-600 truncate max-w-[200px]">{m.description}</td>
                          <td className="py-3 text-right font-medium text-red-600">R$ {m.cost.toLocaleString('pt-BR', {minimumFractionDigits:2})}</td>
                        </tr>
                      ))}
                      {maintenances.length === 0 && (
                        <tr><td colSpan={5} className="py-4 text-center text-zinc-500">Nenhuma manutenção registrada.</td></tr>
                      )}
                    </tbody>
                  </table>
                </div>

                {/* Seção 3: Consumo de Abastecimento (Métricas Globais) */}
                <div>
                  <h3 className="text-lg font-bold border-b border-zinc-200 pb-2 mb-4 text-zinc-800">3. Comentários Analíticos do Período</h3>
                  <div className="space-y-4">
                    <div className="text-sm text-zinc-600 text-justify bg-zinc-50 p-4 rounded-lg border border-zinc-200 space-y-3">
                      <p>
                        A frota atual é composta por <strong>{vehicles.length}</strong> veículos. No presente momento, 
                        <strong> {inMaintenanceCount}</strong> veículos encontram-se inoperantes (Em Manutenção), enquanto 
                        <strong> {activeTripsCount}</strong> estão em rotas ativas (Em Uso). 
                      </p>
                      <p>
                        O investimento total em reparos (preventivos e corretivos) ao longo do período analisado é de 
                        <strong> R$ {totalMaintenanceCost.toLocaleString('pt-BR', {minimumFractionDigits:2})}</strong>.
                        O gasto total consolidado em combustíveis é de 
                        <strong> R$ {totalSupplyCost.toLocaleString('pt-BR', {minimumFractionDigits:2})}</strong> para um volume 
                        total de <strong>{totalLiters.toFixed(1).replace('.',',')} litros</strong> registrados.
                      </p>
                    </div>
                  </div>
                </div>
                
                {/* Assinatura */}
                <div className="pt-16 pb-8 text-center border-t border-zinc-200 mt-12">
                  <div className="w-64 border-b border-zinc-400 mx-auto mb-2"></div>
                  <p className="text-sm font-bold text-zinc-800">Gestor de Frota / Responsável</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
