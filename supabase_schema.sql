-- ==============================================================================
-- SCRIPT SQL PARA O SUPABASE - SISTEMA PPCI & GESTÃO COMPLETA
-- ==============================================================================
-- Instruções:
-- 1. Acesse o painel do Supabase: https://app.supabase.com
-- 2. Selecione seu projeto e vá em "SQL Editor"
-- 3. Cole este script completo e clique em "Run"
-- ==============================================================================

-- 1. Extensões úteis
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- Function para atualizar 'updated_at' automaticamente
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;


-- ------------------------------------------------------------------------------
-- TABELA: CONFIGURAÇÕES DA EMPRESA (company_settings)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS company_settings (
    id TEXT PRIMARY KEY DEFAULT 'default',
    company_name TEXT,
    company_phone TEXT,
    company_email TEXT,
    company_cnpj TEXT,
    company_cep TEXT,
    company_address TEXT,
    logo_url TEXT,
    google_account_email TEXT,
    google_account_name TEXT,
    google_account_photo TEXT,
    is_google_connected BOOLEAN DEFAULT FALSE,
    google_connected_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Trigger para updated_at
DROP TRIGGER IF EXISTS set_company_settings_updated_at ON company_settings;
CREATE TRIGGER set_company_settings_updated_at
BEFORE UPDATE ON company_settings
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ------------------------------------------------------------------------------
-- TABELA: CLIENTES (clients)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS clients (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name TEXT NOT NULL,
    document TEXT,
    contact_name TEXT,
    email TEXT,
    phone TEXT,
    address TEXT,
    city TEXT,
    state TEXT,
    cep TEXT,
    extinguishers JSONB DEFAULT '[]'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

DROP TRIGGER IF EXISTS set_clients_updated_at ON clients;
CREATE TRIGGER set_clients_updated_at
BEFORE UPDATE ON clients
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ------------------------------------------------------------------------------
-- TABELA: EXTINTORES INDIVIDUAIS (extinguishers - opcional/normalizada)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS extinguishers (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    client_id TEXT REFERENCES clients(id) ON DELETE CASCADE,
    numero_cilindro TEXT,
    type TEXT,
    capacity TEXT,
    location TEXT,
    last_recharge DATE,
    next_recharge DATE,
    warning_days INT DEFAULT 30,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

DROP TRIGGER IF EXISTS set_extinguishers_updated_at ON extinguishers;
CREATE TRIGGER set_extinguishers_updated_at
BEFORE UPDATE ON extinguishers
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ------------------------------------------------------------------------------
-- TABELA: PROJETOS PPCI (projects)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS projects (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    client_id TEXT REFERENCES clients(id) ON DELETE SET NULL,
    client_name TEXT NOT NULL,
    address TEXT,
    status TEXT NOT NULL CHECK (status IN ('Orçamento', 'Aprovado', 'Reprovado', 'Levantamento', 'Elaboração', 'Protocolado', 'Concluído')),
    type TEXT NOT NULL CHECK (type IN ('Comercial', 'Residencial', 'Industrial', 'Depósito de GLP')),
    value NUMERIC(12, 2) DEFAULT 0.00,
    payment_methods JSONB DEFAULT '[]'::jsonb,
    discount_percentage NUMERIC(5, 2) DEFAULT 0,
    interest_percentage NUMERIC(5, 2) DEFAULT 0,
    checklist JSONB DEFAULT '{
        "plantas_arquitetonicas": false,
        "extintores": false,
        "sinalizacao": false,
        "iluminacao_emergencia": false,
        "central_glp": false,
        "saidas_emergencia": false
    }'::jsonb,
    notes TEXT,
    last_visit DATE,
    budgets JSONB DEFAULT '[]'::jsonb,
    actions JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

DROP TRIGGER IF EXISTS set_projects_updated_at ON projects;
CREATE TRIGGER set_projects_updated_at
BEFORE UPDATE ON projects
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ------------------------------------------------------------------------------
-- TABELA: INVENTÁRIO / ESTOQUE DE MATERIAIS (inventory)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS inventory (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    codigo_interno TEXT,
    simbolo_tipo TEXT CHECK (simbolo_tipo IN ('Proibição', 'Alerta', 'Emergência', 'Extintor', 'Serviço', 'Projeto')),
    codigo_norma TEXT,
    significado TEXT,
    dimensoes TEXT,
    qtd_estoque INT DEFAULT 0,
    qtd_venda INT DEFAULT 0,
    custo_unitario NUMERIC(12, 2) DEFAULT 0.00,
    margem NUMERIC(5, 2) DEFAULT 0.00,
    valor_pago NUMERIC(12, 2) DEFAULT 0.00,
    preco_sugerido NUMERIC(12, 2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

DROP TRIGGER IF EXISTS set_inventory_updated_at ON inventory;
CREATE TRIGGER set_inventory_updated_at
BEFORE UPDATE ON inventory
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ------------------------------------------------------------------------------
-- TABELA: CATÁLOGO DE SERVIÇOS (services)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS services (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    codigo_interno TEXT,
    name TEXT NOT NULL,
    unit TEXT DEFAULT 'un',
    price NUMERIC(12, 2) DEFAULT 0.00,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

DROP TRIGGER IF EXISTS set_services_updated_at ON services;
CREATE TRIGGER set_services_updated_at
BEFORE UPDATE ON services
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ------------------------------------------------------------------------------
-- TABELA: AGENDA / COMPROMISSOS (agenda)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS agenda (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    title TEXT NOT NULL,
    date DATE NOT NULL,
    time TEXT,
    type TEXT CHECK (type IN ('Vistoria', 'Reunião', 'Protocolo', 'Manutenção', 'Prazo', 'Visita', 'Orçamento', 'Aprovado', 'Reprovada', 'Entrega')),
    project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
    completed BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

DROP TRIGGER IF EXISTS set_agenda_updated_at ON agenda;
CREATE TRIGGER set_agenda_updated_at
BEFORE UPDATE ON agenda
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ------------------------------------------------------------------------------
-- TABELA: CAPTAÇÃO / LEADS (leads)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS leads (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name TEXT NOT NULL,
    phone TEXT,
    address TEXT,
    city TEXT,
    neighborhood TEXT,
    status TEXT DEFAULT 'A Contatar' CHECK (status IN ('A Contatar', 'Em Contato', 'Sem Interesse', 'Orçamento Solicitado')),
    notes TEXT,
    responsible TEXT,
    next_contact_date DATE,
    ppc TEXT,
    alvara_status TEXT,
    alvara_expiry_date DATE,
    enterprise_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

DROP TRIGGER IF EXISTS set_leads_updated_at ON leads;
CREATE TRIGGER set_leads_updated_at
BEFORE UPDATE ON leads
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ------------------------------------------------------------------------------
-- TABELA: PRESTADORES DE SERVIÇO (providers)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS providers (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name TEXT NOT NULL,
    service_type TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    document TEXT,
    address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

DROP TRIGGER IF EXISTS set_providers_updated_at ON providers;
CREATE TRIGGER set_providers_updated_at
BEFORE UPDATE ON providers
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ------------------------------------------------------------------------------
-- TABELA: FORNECEDORES (suppliers)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS suppliers (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name TEXT NOT NULL,
    product_type TEXT NOT NULL,
    phone TEXT,
    email TEXT,
    document TEXT,
    address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

DROP TRIGGER IF EXISTS set_suppliers_updated_at ON suppliers;
CREATE TRIGGER set_suppliers_updated_at
BEFORE UPDATE ON suppliers
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ------------------------------------------------------------------------------
-- TABELA: TRANSAÇÕES DE ESTOQUE (inventory_transactions)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS inventory_transactions (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    item_id TEXT REFERENCES inventory(id) ON DELETE SET NULL,
    item_name TEXT NOT NULL,
    item_codigo_norma TEXT,
    type TEXT NOT NULL CHECK (type IN ('entrada', 'saida')),
    quantity INT NOT NULL DEFAULT 1,
    valor_pago NUMERIC(12, 2) DEFAULT 0.00,
    date TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    supplier_id TEXT REFERENCES suppliers(id) ON DELETE SET NULL,
    supplier_name TEXT,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

DROP TRIGGER IF EXISTS set_inventory_transactions_updated_at ON inventory_transactions;
CREATE TRIGGER set_inventory_transactions_updated_at
BEFORE UPDATE ON inventory_transactions
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ------------------------------------------------------------------------------
-- TABELA: TRANSAÇÕES FINANCEIRAS (financial_transactions)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS financial_transactions (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    project_id TEXT REFERENCES projects(id) ON DELETE SET NULL,
    project_name TEXT,
    client_name TEXT,
    type TEXT NOT NULL CHECK (type IN ('receita', 'despesa')),
    description TEXT NOT NULL,
    amount NUMERIC(12, 2) NOT NULL DEFAULT 0.00,
    date DATE NOT NULL,
    category TEXT NOT NULL,
    payment_method TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'pendente' CHECK (status IN ('recebido', 'pago', 'pendente')),
    due_date DATE,
    payment_date DATE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

DROP TRIGGER IF EXISTS set_financial_transactions_updated_at ON financial_transactions;
CREATE TRIGGER set_financial_transactions_updated_at
BEFORE UPDATE ON financial_transactions
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ------------------------------------------------------------------------------
-- TABELA: RELATÓRIOS DE VISTORIA (inspections)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS inspections (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    date DATE NOT NULL,
    client_id TEXT REFERENCES clients(id) ON DELETE SET NULL,
    client_name TEXT NOT NULL,
    company_name TEXT NOT NULL,
    address TEXT,
    city TEXT,
    inspector TEXT,
    status TEXT NOT NULL DEFAULT 'Pendente' CHECK (status IN ('Pendente', 'Concluída')),
    data JSONB DEFAULT '{}'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

DROP TRIGGER IF EXISTS set_inspections_updated_at ON inspections;
CREATE TRIGGER set_inspections_updated_at
BEFORE UPDATE ON inspections
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ------------------------------------------------------------------------------
-- TABELA: CROQUIS E DESENHOS TÉCNICOS (sketches)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS sketches (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    name TEXT NOT NULL,
    inspection_id TEXT REFERENCES inspections(id) ON DELETE CASCADE,
    elements JSONB DEFAULT '[]'::jsonb,
    layers JSONB DEFAULT '{
        "paredes": "#ffffff",
        "medidas": "#eab308",
        "blocos_civis": "#3b82f6",
        "ppci": "#ef4444"
    }'::jsonb,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

DROP TRIGGER IF EXISTS set_sketches_updated_at ON sketches;
CREATE TRIGGER set_sketches_updated_at
BEFORE UPDATE ON sketches
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ------------------------------------------------------------------------------
-- TABELA: VEÍCULOS DA FROTA (vehicles)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS vehicles (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    model TEXT NOT NULL,
    plate TEXT NOT NULL UNIQUE,
    year TEXT,
    fuel_type TEXT CHECK (fuel_type IN ('Gasolina', 'Etanol', 'Diesel', 'Flex', 'Elétrico')),
    status TEXT DEFAULT 'Disponível' CHECK (status IN ('Disponível', 'Em Uso', 'Em Manutenção')),
    current_km NUMERIC(10, 2) DEFAULT 0,
    insurance_expiry DATE,
    renavam TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

DROP TRIGGER IF EXISTS set_vehicles_updated_at ON vehicles;
CREATE TRIGGER set_vehicles_updated_at
BEFORE UPDATE ON vehicles
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ------------------------------------------------------------------------------
-- TABELA: MANUTENÇÕES DE VEÍCULOS (maintenances)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS maintenances (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    vehicle_id TEXT REFERENCES vehicles(id) ON DELETE CASCADE,
    vehicle_plate TEXT NOT NULL,
    date DATE NOT NULL,
    type TEXT CHECK (type IN ('Preventiva', 'Corretiva')),
    description TEXT NOT NULL,
    cost NUMERIC(12, 2) DEFAULT 0.00,
    provider_name TEXT,
    odometer NUMERIC(10, 2) DEFAULT 0,
    next_maintenance_date DATE,
    next_maintenance_km NUMERIC(10, 2),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

DROP TRIGGER IF EXISTS set_maintenances_updated_at ON maintenances;
CREATE TRIGGER set_maintenances_updated_at
BEFORE UPDATE ON maintenances
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ------------------------------------------------------------------------------
-- TABELA: ABASTECIMENTOS (supplies)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS supplies (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    vehicle_id TEXT REFERENCES vehicles(id) ON DELETE CASCADE,
    vehicle_plate TEXT NOT NULL,
    date DATE NOT NULL,
    fuel_type TEXT,
    liters NUMERIC(8, 2) DEFAULT 0.00,
    cost NUMERIC(12, 2) DEFAULT 0.00,
    odometer NUMERIC(10, 2) DEFAULT 0,
    station_name TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

DROP TRIGGER IF EXISTS set_supplies_updated_at ON supplies;
CREATE TRIGGER set_supplies_updated_at
BEFORE UPDATE ON supplies
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ------------------------------------------------------------------------------
-- TABELA: VIAGENS / REGISTRO DE DESLOCAMENTOS (trips)
-- ------------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS trips (
    id TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
    vehicle_id TEXT REFERENCES vehicles(id) ON DELETE CASCADE,
    vehicle_plate TEXT NOT NULL,
    date DATE NOT NULL,
    driver_name TEXT NOT NULL,
    purpose TEXT,
    start_km NUMERIC(10, 2) DEFAULT 0,
    end_km NUMERIC(10, 2),
    status TEXT DEFAULT 'Ativo' CHECK (status IN ('Ativo', 'Concluído')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

DROP TRIGGER IF EXISTS set_trips_updated_at ON trips;
CREATE TRIGGER set_trips_updated_at
BEFORE UPDATE ON trips
FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();


-- ------------------------------------------------------------------------------
-- POLÍTICAS DE SEGURANÇA (ROW LEVEL SECURITY - RLS)
-- ------------------------------------------------------------------------------
-- 1. Habilitar RLS em todas as 18 tabelas da aplicação
ALTER TABLE company_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE extinguishers ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory ENABLE ROW LEVEL SECURITY;
ALTER TABLE services ENABLE ROW LEVEL SECURITY;
ALTER TABLE agenda ENABLE ROW LEVEL SECURITY;
ALTER TABLE leads ENABLE ROW LEVEL SECURITY;
ALTER TABLE providers ENABLE ROW LEVEL SECURITY;
ALTER TABLE suppliers ENABLE ROW LEVEL SECURITY;
ALTER TABLE inventory_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE financial_transactions ENABLE ROW LEVEL SECURITY;
ALTER TABLE inspections ENABLE ROW LEVEL SECURITY;
ALTER TABLE sketches ENABLE ROW LEVEL SECURITY;
ALTER TABLE vehicles ENABLE ROW LEVEL SECURITY;
ALTER TABLE maintenances ENABLE ROW LEVEL SECURITY;
ALTER TABLE supplies ENABLE ROW LEVEL SECURITY;
ALTER TABLE trips ENABLE ROW LEVEL SECURITY;

-- 2. Limpar políticas antigas se existirem (evita erro "policy already exists" ao re-executar)
DROP POLICY IF EXISTS "company_settings_policy" ON company_settings;
DROP POLICY IF EXISTS "clients_policy" ON clients;
DROP POLICY IF EXISTS "extinguishers_policy" ON extinguishers;
DROP POLICY IF EXISTS "projects_policy" ON projects;
DROP POLICY IF EXISTS "inventory_policy" ON inventory;
DROP POLICY IF EXISTS "services_policy" ON services;
DROP POLICY IF EXISTS "agenda_policy" ON agenda;
DROP POLICY IF EXISTS "leads_policy" ON leads;
DROP POLICY IF EXISTS "providers_policy" ON providers;
DROP POLICY IF EXISTS "suppliers_policy" ON suppliers;
DROP POLICY IF EXISTS "inventory_transactions_policy" ON inventory_transactions;
DROP POLICY IF EXISTS "financial_transactions_policy" ON financial_transactions;
DROP POLICY IF EXISTS "inspections_policy" ON inspections;
DROP POLICY IF EXISTS "sketches_policy" ON sketches;
DROP POLICY IF EXISTS "vehicles_policy" ON vehicles;
DROP POLICY IF EXISTS "maintenances_policy" ON maintenances;
DROP POLICY IF EXISTS "supplies_policy" ON supplies;
DROP POLICY IF EXISTS "trips_policy" ON trips;

-- Limpar também nomes de políticas legados em português se existirem
DROP POLICY IF EXISTS "Permitir leitura total em company_settings" ON company_settings;
DROP POLICY IF EXISTS "Permitir modificação total em company_settings" ON company_settings;
DROP POLICY IF EXISTS "Permitir leitura total em clients" ON clients;
DROP POLICY IF EXISTS "Permitir modificação total em clients" ON clients;
DROP POLICY IF EXISTS "Permitir leitura total em extinguishers" ON extinguishers;
DROP POLICY IF EXISTS "Permitir modificação total em extinguishers" ON extinguishers;
DROP POLICY IF EXISTS "Permitir leitura total em projects" ON projects;
DROP POLICY IF EXISTS "Permitir modificação total em projects" ON projects;
DROP POLICY IF EXISTS "Permitir leitura total em inventory" ON inventory;
DROP POLICY IF EXISTS "Permitir modificação total em inventory" ON inventory;
DROP POLICY IF EXISTS "Permitir leitura total em services" ON services;
DROP POLICY IF EXISTS "Permitir modificação total em services" ON services;
DROP POLICY IF EXISTS "Permitir leitura total em agenda" ON agenda;
DROP POLICY IF EXISTS "Permitir modificação total em agenda" ON agenda;
DROP POLICY IF EXISTS "Permitir leitura total em leads" ON leads;
DROP POLICY IF EXISTS "Permitir modificação total em leads" ON leads;
DROP POLICY IF EXISTS "Permitir leitura total em providers" ON providers;
DROP POLICY IF EXISTS "Permitir modificação total em providers" ON providers;
DROP POLICY IF EXISTS "Permitir leitura total em suppliers" ON suppliers;
DROP POLICY IF EXISTS "Permitir modificação total em suppliers" ON suppliers;
DROP POLICY IF EXISTS "Permitir leitura total em inventory_transactions" ON inventory_transactions;
DROP POLICY IF EXISTS "Permitir modificação total em inventory_transactions" ON inventory_transactions;
DROP POLICY IF EXISTS "Permitir leitura total em financial_transactions" ON financial_transactions;
DROP POLICY IF EXISTS "Permitir modificação total em financial_transactions" ON financial_transactions;
DROP POLICY IF EXISTS "Permitir leitura total em inspections" ON inspections;
DROP POLICY IF EXISTS "Permitir modificação total em inspections" ON inspections;
DROP POLICY IF EXISTS "Permitir leitura total em sketches" ON sketches;
DROP POLICY IF EXISTS "Permitir modificação total em sketches" ON sketches;
DROP POLICY IF EXISTS "Permitir leitura total em vehicles" ON vehicles;
DROP POLICY IF EXISTS "Permitir modificação total em vehicles" ON vehicles;
DROP POLICY IF EXISTS "Permitir leitura total em maintenances" ON maintenances;
DROP POLICY IF EXISTS "Permitir modificação total em maintenances" ON maintenances;
DROP POLICY IF EXISTS "Permitir leitura total em supplies" ON supplies;
DROP POLICY IF EXISTS "Permitir modificação total em supplies" ON supplies;
DROP POLICY IF EXISTS "Permitir leitura total em trips" ON trips;
DROP POLICY IF EXISTS "Permitir modificação total em trips" ON trips;

-- 3. Criar Políticas RLS Idempotentes e Seguras para Acesso Anon/API Key do App
CREATE POLICY "company_settings_policy" ON company_settings FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "clients_policy" ON clients FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "extinguishers_policy" ON extinguishers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "projects_policy" ON projects FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "inventory_policy" ON inventory FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "services_policy" ON services FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "agenda_policy" ON agenda FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "leads_policy" ON leads FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "providers_policy" ON providers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "suppliers_policy" ON suppliers FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "inventory_transactions_policy" ON inventory_transactions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "financial_transactions_policy" ON financial_transactions FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "inspections_policy" ON inspections FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "sketches_policy" ON sketches FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "vehicles_policy" ON vehicles FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "maintenances_policy" ON maintenances FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "supplies_policy" ON supplies FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "trips_policy" ON trips FOR ALL USING (true) WITH CHECK (true);

-- ------------------------------------------------------------------------------
-- ÍNDICES PARA ALTA PERFORMANCE DE CONSULTA
-- ------------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_client_id ON projects(client_id);
CREATE INDEX IF NOT EXISTS idx_agenda_date ON agenda(date);
CREATE INDEX IF NOT EXISTS idx_inspections_client_id ON inspections(client_id);
CREATE INDEX IF NOT EXISTS idx_financial_date ON financial_transactions(date);
CREATE INDEX IF NOT EXISTS idx_financial_type ON financial_transactions(type);
CREATE INDEX IF NOT EXISTS idx_maintenances_vehicle ON maintenances(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_supplies_vehicle ON supplies(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_trips_vehicle ON trips(vehicle_id);
