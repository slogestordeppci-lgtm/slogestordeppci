export interface Extinguisher {
  id: string;
  numero_cilindro: string;
  type: string;
  capacity: string;
  location: string;
  lastRecharge: string;
  nextRecharge: string;
  warningDays?: number;
}

export interface Client {
  id: string;
  name: string;
  document?: string;
  contactName?: string;
  email?: string;
  phone?: string;
  address: string;
  city?: string;
  state?: string;
  cep?: string;
  extinguishers: Extinguisher[];
}

export interface ProjectAction {
  date: string;
  checked: boolean;
  protocolNumber?: string;
  analyzed?: boolean;
  analyzedDate?: string;
}

export interface Project {
  id: string;
  clientId?: string;
  clientName: string;
  address: string;
  status: 'Orçamento' | 'Aprovado' | 'Reprovado' | 'Levantamento' | 'Elaboração' | 'Protocolado' | 'Concluído';
  type: 'Comercial' | 'Residencial' | 'Industrial' | 'Depósito de GLP';
  value?: number;
  paymentMethods?: string[];
  discountPercentage?: number;
  interestPercentage?: number;
  checklist: {
    plantas_arquitetonicas: boolean;
    extintores: boolean;
    sinalizacao: boolean;
    iluminacao_emergencia: boolean;
    central_glp: boolean;
    saidas_emergencia: boolean;
  };
  notes: string;
  lastVisit?: string;
  budgets?: ProjectBudget[];
  actions?: {
    vistoria?: ProjectAction;
    orcamento?: ProjectAction;
    aprovado?: ProjectAction;
    reprovada?: ProjectAction;
    entrega?: ProjectAction;
    protocolado_cbm?: ProjectAction;
  };
}

export interface ProjectBudgetItem {
  id: string;
  description: string;
  quantity: number;
  unit: string;
  unitPrice: number;
}

export interface ProjectBudget {
  id: string;
  proposalNumber: string;
  date: string;
  deliveryTime: string;
  observations: string;
  items: ProjectBudgetItem[];
  status: 'Pendente' | 'Aprovado' | 'Recusado' | 'Concluído';
  protocolDate?: string;
  protocolNumber?: string;
}

export interface InventoryItem {
  id: string;
  codigo_interno: string;
  simbolo_tipo: 'Proibição' | 'Alerta' | 'Emergência' | 'Extintor' | 'Serviço' | 'Projeto';
  codigo_norma: string;
  significado: string;
  dimensoes: string;
  qtd_estoque: number;
  qtd_venda: number;
  custo_unitario: number;
  margem: number; // Percentage like 56
  valor_pago?: number;
  preco_sugerido?: number;
}

export interface AgendaEvent {
  id: string;
  title: string;
  date: string;
  time?: string;
  type: 'Vistoria' | 'Reunião' | 'Protocolo' | 'Manutenção' | 'Prazo' | 'Visita' | 'Orçamento' | 'Aprovado' | 'Reprovada' | 'Entrega';
  projectId?: string;
  completed: boolean;
}

export interface ServiceProvider {
  id: string;
  name: string;
  serviceType: string; // e.g. Elétrica, Hidráulica, Pintura, Recarga, etc.
  phone?: string;
  email?: string;
  document?: string; // CPF or CNPJ
  address?: string;
}

export interface Supplier {
  id: string;
  name: string;
  productType: string; // e.g. Extintores, Sinalização, Mangueiras, Central de Gás
  phone?: string;
  email?: string;
  document?: string; // CNPJ or CPF
  address?: string;
}

export interface InventoryTransaction {
  id: string;
  itemId: string;
  itemName: string;
  itemCodigoNorma: string;
  type: 'entrada' | 'saida';
  quantity: number;
  valor_pago: number;
  date: string;
  supplierId?: string;
  supplierName?: string;
  notes?: string;
}

export interface FinancialTransaction {
  id: string;
  projectId?: string;
  projectName?: string;
  clientName?: string;
  type: 'receita' | 'despesa';
  description: string;
  amount: number;
  date: string;
  category: string; // 'Projetos PPCI' | 'Venda de Materiais' | 'Serviços de Terceiros' | 'Compra de Materiais' | 'Outros'
  paymentMethod: string; // 'Dinheiro' | 'Pix' | 'Cartão de Crédito' | 'Cartão de Débito' | 'Boleto' | 'Transferência Bancária'
  status: 'recebido' | 'pago' | 'pendente';
  dueDate?: string;
  paymentDate?: string;
}

export interface Lead {
  id: string;
  name: string;
  phone?: string;
  address?: string;
  city?: string;
  status: 'A Contatar' | 'Em Contato' | 'Sem Interesse' | 'Orçamento Solicitado';
  notes?: string;
  createdAt: string;
  responsible?: string;
  nextContactDate?: string;
  ppc?: string;
  alvaraStatus?: string;
  alvaraExpiryDate?: string;
  enterpriseName?: string;
  neighborhood?: string;
}

export interface Inspection {
  id: string;
  projectId?: string;
  date: string;
  clientId?: string;
  clientName: string;
  companyName: string;
  address: string;
  city: string;
  inspector: string;
  status: 'Pendente' | 'Concluída';
  data: {
    // 1. IDENTIFICAÇÃO DA EDIFICAÇÃO
    activity?: string;
    builtArea?: string;
    landArea?: string;
    floors?: string;
    height?: string;
    ceilingHeight?: string;
    constructionYear?: string;
    constructionType?: string;
    hasMezzanine?: boolean;
    hasBasement?: boolean;
    hasStorage?: boolean;
    
    // 2. ENTORNO
    isolatedBuilding?: boolean;
    sideAccess?: boolean;
    backAccess?: boolean;
    fireTruckAccess?: boolean;
    publicHydrant?: boolean;
    attachedNeighbors?: boolean;
    externalRisk?: boolean;
    
    // 3. OCUPAÇÃO
    employees?: string;
    maxPublic?: string;
    operatingHours?: string;
    developedActivity?: string;
    hasStock?: boolean;
    hasOffice?: boolean;
    hasKitchen?: boolean;
    hasBathrooms?: boolean;
    
    // Arrays for dynamic lists
    environments: { name: string; area: string; ceilingHeight: string; notes: string; photos?: string[] }[];
    combustibleMaterials: { material: string; quantity: string; location: string; notes: string; photos?: string[] }[];
    dangerousProducts: { product: string; quantity: string; location: string; notes: string; photos?: string[] }[];
    doorsAndExits: { location: string; width: string; height: string; opensOutward: boolean; panicBar: boolean; notes: string; photos?: string[] }[];
    corridors: { location: string; width: string; length: string; obstacles: boolean; notes: string; photos?: string[] }[];
    extinguishers: { number: string; type: string; capacity: string; location: string; expiration: string; pressure: string; signaled: boolean; notes: string; photos?: string[] }[];
    emergencyLights: { number: string; location: string; works: boolean; distance: string; notes: string; photos?: string[] }[];
    
    // 11. SINALIZAÇÃO
    signs: { type: string; exists: boolean; compliant: boolean; notes: string; photos?: string[] }[];
    
    // 12. INSTALAÇÕES ELÉTRICAS
    electrical: {
      identifiedBoard?: boolean;
      identifiedBreakers?: boolean;
      exposedWiring?: boolean;
      useOfAdapters?: boolean;
      permanentExtensions?: boolean;
      overloadedOutlets?: boolean;
      highPowerEquipment?: boolean;
    };
    
    // 13. COBERTURA
    roofing: {
      structure?: string;
      roof?: string;
      ceiling?: string;
      condition?: string;
    };
    
    // 14. EQUIPAMENTOS
    equipment: { name: string; quantity: string; location: string }[];
    
    // 15. ACESSIBILIDADE
    accessibility: {
      hasRamp?: boolean;
      handrail?: boolean;
      regularFloor?: boolean;
      accessibleDoors?: boolean;
      unevenness?: boolean;
    };
    
    // 16. REGISTRO FOTOGRÁFICO
    photos: Record<string, boolean>; // e.g. { 'Fachada': true }
    uploadedPhotos?: { id: string; name: string; dataUrl: string }[];
    
    // 17. DOCUMENTAÇÃO
    documents: Record<string, boolean>; // e.g. { 'CNPJ': true }
    
    // 18. OBSERVAÇÕES GERAIS
    generalNotes?: string;
    
    // 19. PENDÊNCIAS
    pendingItems: { item: string; responsible: string; deadline: string }[];
    
    // 20. CONCLUSÃO DA VISTORIA
    conclusion: {
      sufficientInfo: boolean;
      returnNeeded: boolean;
      additionalDocs: boolean;
      additionalMeasurements: boolean;
    };
  };
}

export interface StoreSketch {
  id: string;
  name: string;
  inspectionId?: string;
  elements: {
    id: string;
    type: 'wall' | 'measure' | 'block' | 'text';
    layer: 'paredes' | 'medidas' | 'blocos_civis' | 'ppci';
    x1?: number;
    y1?: number;
    x2?: number;
    y2?: number;
    x?: number;
    y?: number;
    rotation?: number;
    blockType?: 'door' | 'window' | 'extinguisher' | 'light' | 'exit_sign' | 'alarm' | 'hydrant';
    label?: string;
    width?: number;
    height?: number;
    fontSize?: number;
    widthM?: number;
    heightM?: number;
    mirrored?: boolean;
  }[];
  layers: {
    paredes: string;
    medidas: string;
    blocos_civis: string;
    ppci: string;
    paredesThickness?: number;
    medidasThickness?: number;
    blocos_civisThickness?: number;
    ppciThickness?: number;
  };
  createdAt: string;
}

export interface Service {
  id: string;
  codigo_interno?: string;
  name: string;
  unit: string;
  price: number;
}

export interface AppData {
  projects: Project[];
  inventory: InventoryItem[];
  services?: Service[];
  agenda: AgendaEvent[];
  clients: Client[];
  leads?: Lead[];
  providers?: ServiceProvider[];
  suppliers?: Supplier[];
  inventoryTransactions?: InventoryTransaction[];
  financialTransactions?: FinancialTransaction[];
  inspections?: Inspection[];
  sketches?: StoreSketch[];
  vehicles?: Vehicle[];
  maintenances?: MaintenanceRecord[];
  supplies?: SupplyRecord[];
  trips?: TripRecord[];
  logoUrl?: string;
  companyName?: string;
  companyPhone?: string;
  companyEmail?: string;
  companyCnpj?: string;
  companyCep?: string;
  companyAddress?: string;
  googleAccountEmail?: string;
  googleAccountName?: string;
  googleAccountPhoto?: string;
  isGoogleConnected?: boolean;
  googleConnectedAt?: string;
}

export interface Vehicle {
  id: string;
  model: string;
  plate: string;
  year: string;
  fuelType: 'Gasolina' | 'Etanol' | 'Diesel' | 'Flex' | 'Elétrico';
  status: 'Disponível' | 'Em Uso' | 'Em Manutenção';
  currentKm: number;
  insuranceExpiry?: string;
  renavam?: string;
}

export interface MaintenanceRecord {
  id: string;
  vehicleId: string;
  vehiclePlate: string;
  date: string;
  type: 'Preventiva' | 'Corretiva';
  description: string;
  cost: number;
  providerName?: string;
  odometer: number;
  nextMaintenanceDate?: string;
  nextMaintenanceKm?: number;
}

export interface SupplyRecord {
  id: string;
  vehicleId: string;
  vehiclePlate: string;
  date: string;
  fuelType: string;
  liters: number;
  cost: number;
  odometer: number;
  stationName?: string;
}

export interface TripRecord {
  id: string;
  vehicleId: string;
  vehiclePlate: string;
  date: string;
  driverName: string;
  purpose: string;
  startKm: number;
  endKm?: number;
  status: 'Ativo' | 'Concluído';
}

