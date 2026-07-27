import { supabase, testSupabaseConnection } from './supabase';
import { AppData } from '../types';

export { testSupabaseConnection };

/**
 * Maps local AppData to Supabase tables
 */
export async function syncDataToSupabase(data: AppData): Promise<{ success: boolean; error?: string }> {
  try {
    // 1. Sync Company Settings
    const { error: companyError } = await supabase.from('company_settings').upsert({
      id: 'default',
      company_name: data.companyName,
      company_phone: data.companyPhone,
      company_email: data.companyEmail,
      company_cnpj: data.companyCnpj,
      company_cep: data.companyCep,
      company_address: data.companyAddress,
      logo_url: data.logoUrl,
    }, { onConflict: 'id' });

    if (companyError) console.warn('Supabase company_settings upsert:', companyError.message);

    // 2. Sync Clients
    if (data.clients && data.clients.length > 0) {
      const clientPayload = data.clients.map(c => ({
        id: c.id,
        name: c.name,
        document: c.document,
        contact_name: c.contactName,
        email: c.email,
        phone: c.phone,
        address: c.address,
        city: c.city,
        state: c.state,
        cep: c.cep,
        extinguishers: c.extinguishers || [],
      }));
      const { error } = await supabase.from('clients').upsert(clientPayload, { onConflict: 'id' });
      if (error) console.warn('Supabase clients upsert:', error.message);
    }

    // 3. Sync Projects
    // Remove sample projects if present in Supabase
    await supabase.from('projects').delete().in('id', ['1', '2']);
    await supabase.from('projects').delete().in('client_name', ['Restaurante Central', 'Depósito de Gás Litoral']);

    if (data.projects && data.projects.length > 0) {
      const validProjects = data.projects.filter(p => p.id !== '1' && p.id !== '2' && p.clientName !== 'Restaurante Central' && p.clientName !== 'Depósito de Gás Litoral');
      if (validProjects.length > 0) {
        const projectPayload = validProjects.map(p => ({
          id: p.id,
          client_id: p.clientId,
          client_name: p.clientName,
          address: p.address,
          status: p.status,
          type: p.type,
          value: p.value || 0,
          payment_methods: p.paymentMethods || [],
          discount_percentage: p.discountPercentage || 0,
          interest_percentage: p.interestPercentage || 0,
          checklist: p.checklist,
          notes: p.notes,
          last_visit: p.lastVisit,
          budgets: p.budgets || [],
          actions: p.actions || {},
        }));
        const { error } = await supabase.from('projects').upsert(projectPayload, { onConflict: 'id' });
        if (error) console.warn('Supabase projects upsert:', error.message);
      }
    }

    // 4. Sync Inventory
    if (data.inventory && data.inventory.length > 0) {
      const invPayload = data.inventory.map(i => ({
        id: i.id,
        codigo_interno: i.codigo_interno,
        simbolo_tipo: i.simbolo_tipo,
        codigo_norma: i.codigo_norma,
        significado: i.significado,
        dimensoes: i.dimensoes,
        qtd_estoque: i.qtd_estoque || 0,
        qtd_venda: i.qtd_venda || 0,
        custo_unitario: i.custo_unitario || 0,
        margem: i.margem || 0,
        valor_pago: i.valor_pago || 0,
        preco_sugerido: i.preco_sugerido || 0,
      }));
      const { error } = await supabase.from('inventory').upsert(invPayload, { onConflict: 'id' });
      if (error) console.warn('Supabase inventory upsert:', error.message);
    }

    // 5. Sync Services
    if (data.services && data.services.length > 0) {
      const srvPayload = data.services.map(s => ({
        id: s.id,
        codigo_interno: s.codigo_interno,
        name: s.name,
        unit: s.unit,
        price: s.price || 0,
      }));
      const { error } = await supabase.from('services').upsert(srvPayload, { onConflict: 'id' });
      if (error) console.warn('Supabase services upsert:', error.message);
    }

    // 6. Sync Agenda
    if (data.agenda && data.agenda.length > 0) {
      const agendaPayload = data.agenda.map(a => ({
        id: a.id,
        title: a.title,
        date: a.date,
        time: a.time,
        type: a.type,
        project_id: a.projectId,
        completed: !!a.completed,
      }));
      const { error } = await supabase.from('agenda').upsert(agendaPayload, { onConflict: 'id' });
      if (error) console.warn('Supabase agenda upsert:', error.message);
    }

    // 7. Sync Leads
    if (data.leads && data.leads.length > 0) {
      const leadPayload = data.leads.map(l => ({
        id: l.id,
        name: l.name,
        phone: l.phone,
        address: l.address,
        city: l.city,
        neighborhood: l.neighborhood,
        status: l.status,
        notes: l.notes,
        responsible: l.responsible,
        next_contact_date: l.nextContactDate,
        ppc: l.ppc,
        alvara_status: l.alvaraStatus,
        alvara_expiry_date: l.alvaraExpiryDate,
        enterprise_name: l.enterpriseName,
      }));
      const { error } = await supabase.from('leads').upsert(leadPayload, { onConflict: 'id' });
      if (error) console.warn('Supabase leads upsert:', error.message);
    }

    // 8. Sync Providers
    if (data.providers && data.providers.length > 0) {
      const provPayload = data.providers.map(p => ({
        id: p.id,
        name: p.name,
        service_type: p.serviceType,
        phone: p.phone,
        email: p.email,
        document: p.document,
        address: p.address,
      }));
      const { error } = await supabase.from('providers').upsert(provPayload, { onConflict: 'id' });
      if (error) console.warn('Supabase providers upsert:', error.message);
    }

    // 9. Sync Suppliers
    if (data.suppliers && data.suppliers.length > 0) {
      const suppPayload = data.suppliers.map(s => ({
        id: s.id,
        name: s.name,
        product_type: s.productType,
        phone: s.phone,
        email: s.email,
        document: s.document,
        address: s.address,
      }));
      const { error } = await supabase.from('suppliers').upsert(suppPayload, { onConflict: 'id' });
      if (error) console.warn('Supabase suppliers upsert:', error.message);
    }

    // 10. Sync Financial Transactions
    if (data.financialTransactions && data.financialTransactions.length > 0) {
      const finPayload = data.financialTransactions.map(f => ({
        id: f.id,
        project_id: f.projectId,
        project_name: f.projectName,
        client_name: f.clientName,
        type: f.type,
        description: f.description,
        amount: f.amount || 0,
        date: f.date,
        category: f.category,
        payment_method: f.paymentMethod,
        status: f.status,
        due_date: f.dueDate,
        payment_date: f.paymentDate,
      }));
      const { error } = await supabase.from('financial_transactions').upsert(finPayload, { onConflict: 'id' });
      if (error) console.warn('Supabase financial_transactions upsert:', error.message);
    }

    // 11. Sync Inspections
    if (data.inspections && data.inspections.length > 0) {
      const inspPayload = data.inspections.map(i => ({
        id: i.id,
        date: i.date,
        client_id: i.clientId,
        client_name: i.clientName,
        company_name: i.companyName,
        address: i.address,
        city: i.city,
        inspector: i.inspector,
        status: i.status,
        data: i.data || {},
      }));
      const { error } = await supabase.from('inspections').upsert(inspPayload, { onConflict: 'id' });
      if (error) console.warn('Supabase inspections upsert:', error.message);
    }

    // 12. Sync Vehicles
    if (data.vehicles && data.vehicles.length > 0) {
      const vehPayload = data.vehicles.map(v => ({
        id: v.id,
        model: v.model,
        plate: v.plate,
        year: v.year,
        fuel_type: v.fuelType,
        status: v.status,
        current_km: v.currentKm || 0,
        insurance_expiry: v.insuranceExpiry,
        renavam: v.renavam,
      }));
      const { error } = await supabase.from('vehicles').upsert(vehPayload, { onConflict: 'id' });
      if (error) console.warn('Supabase vehicles upsert:', error.message);
    }

    // 13. Sync Inventory Transactions
    if (data.inventoryTransactions && data.inventoryTransactions.length > 0) {
      const txPayload = data.inventoryTransactions.map(t => ({
        id: t.id,
        item_id: t.itemId,
        item_name: t.itemName,
        item_codigo_norma: t.itemCodigoNorma,
        type: t.type,
        quantity: t.quantity || 1,
        valor_pago: t.valor_pago || 0,
        date: t.date,
        supplier_id: t.supplierId,
        supplier_name: t.supplierName,
        notes: t.notes,
      }));
      const { error } = await supabase.from('inventory_transactions').upsert(txPayload, { onConflict: 'id' });
      if (error) console.warn('Supabase inventory_transactions upsert:', error.message);
    }

    // 14. Sync Maintenances
    if (data.maintenances && data.maintenances.length > 0) {
      const maintPayload = data.maintenances.map(m => ({
        id: m.id,
        vehicle_id: m.vehicleId,
        vehicle_plate: m.vehiclePlate,
        date: m.date,
        type: m.type,
        description: m.description,
        cost: m.cost || 0,
        provider_name: m.providerName,
        odometer: m.odometer || 0,
        next_maintenance_date: m.nextMaintenanceDate,
        next_maintenance_km: m.nextMaintenanceKm,
      }));
      const { error } = await supabase.from('maintenances').upsert(maintPayload, { onConflict: 'id' });
      if (error) console.warn('Supabase maintenances upsert:', error.message);
    }

    // 15. Sync Supplies
    if (data.supplies && data.supplies.length > 0) {
      const suppPayload = data.supplies.map(s => ({
        id: s.id,
        vehicle_id: s.vehicleId,
        vehicle_plate: s.vehiclePlate,
        date: s.date,
        fuel_type: s.fuelType,
        liters: s.liters || 0,
        cost: s.cost || 0,
        odometer: s.odometer || 0,
        station_name: s.stationName,
      }));
      const { error } = await supabase.from('supplies').upsert(suppPayload, { onConflict: 'id' });
      if (error) console.warn('Supabase supplies upsert:', error.message);
    }

    // 16. Sync Trips
    if (data.trips && data.trips.length > 0) {
      const tripPayload = data.trips.map(t => ({
        id: t.id,
        vehicle_id: t.vehicleId,
        vehicle_plate: t.vehiclePlate,
        date: t.date,
        driver_name: t.driverName,
        purpose: t.purpose,
        start_km: t.startKm || 0,
        end_km: t.endKm,
        status: t.status,
      }));
      const { error } = await supabase.from('trips').upsert(tripPayload, { onConflict: 'id' });
      if (error) console.warn('Supabase trips upsert:', error.message);
    }

    return { success: true };
  } catch (err: any) {
    console.error('Error syncing to Supabase:', err);
    return { success: false, error: err?.message || 'Erro ao sincronizar com Supabase' };
  }
}

/**
 * Loads AppData from Supabase tables
 */
export async function fetchFromSupabase(): Promise<Partial<AppData> | null> {
  try {
    const test = await testSupabaseConnection();
    if (!test.success) return null;

    const result: Partial<AppData> = {};

    // Company Settings
    const { data: company } = await supabase.from('company_settings').select('*').eq('id', 'default').single();
    if (company) {
      if (company.company_name) result.companyName = company.company_name;
      if (company.company_phone) result.companyPhone = company.company_phone;
      if (company.company_email) result.companyEmail = company.company_email;
      if (company.company_cnpj) result.companyCnpj = company.company_cnpj;
      if (company.company_cep) result.companyCep = company.company_cep;
      if (company.company_address) result.companyAddress = company.company_address;
      if (company.logo_url) result.logoUrl = company.logo_url;
    }

    // Clients
    const { data: clients } = await supabase.from('clients').select('*');
    if (clients && clients.length > 0) {
      result.clients = clients.map(c => ({
        id: c.id,
        name: c.name,
        document: c.document,
        contactName: c.contact_name,
        email: c.email,
        phone: c.phone,
        address: c.address,
        city: c.city,
        state: c.state,
        cep: c.cep,
        extinguishers: c.extinguishers || [],
      }));
    }

    // Projects
    const { data: projects } = await supabase.from('projects').select('*');
    if (projects && projects.length > 0) {
      result.projects = projects.map(p => ({
        id: p.id,
        clientId: p.client_id,
        clientName: p.client_name,
        address: p.address,
        status: p.status,
        type: p.type,
        value: Number(p.value) || 0,
        paymentMethods: p.payment_methods || [],
        discountPercentage: Number(p.discount_percentage) || 0,
        interestPercentage: Number(p.interest_percentage) || 0,
        checklist: p.checklist || {},
        notes: p.notes,
        lastVisit: p.last_visit,
        budgets: p.budgets || [],
        actions: p.actions || {},
      }));
    }

    // Inventory
    const { data: inventory } = await supabase.from('inventory').select('*');
    if (inventory && inventory.length > 0) {
      result.inventory = inventory.map(i => ({
        id: i.id,
        codigo_interno: i.codigo_interno,
        simbolo_tipo: i.simbolo_tipo,
        codigo_norma: i.codigo_norma,
        significado: i.significado,
        dimensoes: i.dimensoes,
        qtd_estoque: i.qtd_estoque,
        qtd_venda: i.qtd_venda,
        custo_unitario: Number(i.custo_unitario),
        margem: Number(i.margem),
        valor_pago: Number(i.valor_pago),
        preco_sugerido: Number(i.preco_sugerido),
      }));
    }

    // Services
    const { data: services } = await supabase.from('services').select('*');
    if (services && services.length > 0) {
      result.services = services.map(s => ({
        id: s.id,
        codigo_interno: s.codigo_interno,
        name: s.name,
        unit: s.unit,
        price: Number(s.price),
      }));
    }

    // Agenda
    const { data: agenda } = await supabase.from('agenda').select('*');
    if (agenda && agenda.length > 0) {
      result.agenda = agenda.map(a => ({
        id: a.id,
        title: a.title,
        date: a.date,
        time: a.time,
        type: a.type,
        projectId: a.project_id,
        completed: a.completed,
      }));
    }

    // Leads
    const { data: leads } = await supabase.from('leads').select('*');
    if (leads && leads.length > 0) {
      result.leads = leads.map(l => ({
        id: l.id,
        name: l.name,
        phone: l.phone,
        address: l.address,
        city: l.city,
        neighborhood: l.neighborhood,
        status: l.status,
        notes: l.notes,
        createdAt: l.created_at || new Date().toISOString(),
        responsible: l.responsible,
        nextContactDate: l.next_contact_date,
        ppc: l.ppc,
        alvaraStatus: l.alvara_status,
        alvaraExpiryDate: l.alvara_expiry_date,
        enterpriseName: l.enterprise_name,
      }));
    }

    // Providers
    const { data: providers } = await supabase.from('providers').select('*');
    if (providers && providers.length > 0) {
      result.providers = providers.map(p => ({
        id: p.id,
        name: p.name,
        serviceType: p.service_type,
        phone: p.phone,
        email: p.email,
        document: p.document,
        address: p.address,
      }));
    }

    // Suppliers
    const { data: suppliers } = await supabase.from('suppliers').select('*');
    if (suppliers && suppliers.length > 0) {
      result.suppliers = suppliers.map(s => ({
        id: s.id,
        name: s.name,
        productType: s.product_type,
        phone: s.phone,
        email: s.email,
        document: s.document,
        address: s.address,
      }));
    }

    // Financial Transactions
    const { data: financials } = await supabase.from('financial_transactions').select('*');
    if (financials && financials.length > 0) {
      result.financialTransactions = financials.map(f => ({
        id: f.id,
        projectId: f.project_id,
        projectName: f.project_name,
        clientName: f.client_name,
        type: f.type,
        description: f.description,
        amount: Number(f.amount),
        date: f.date,
        category: f.category,
        paymentMethod: f.payment_method,
        status: f.status,
        dueDate: f.due_date,
        paymentDate: f.payment_date,
      }));
    }

    // Inspections
    const { data: inspections } = await supabase.from('inspections').select('*');
    if (inspections && inspections.length > 0) {
      result.inspections = inspections.map(i => ({
        id: i.id,
        date: i.date,
        clientId: i.client_id,
        clientName: i.client_name,
        companyName: i.company_name,
        address: i.address,
        city: i.city,
        inspector: i.inspector,
        status: i.status,
        data: i.data || {},
      }));
    }

    // Vehicles
    const { data: vehicles } = await supabase.from('vehicles').select('*');
    if (vehicles && vehicles.length > 0) {
      result.vehicles = vehicles.map(v => ({
        id: v.id,
        model: v.model,
        plate: v.plate,
        year: v.year,
        fuelType: v.fuel_type,
        status: v.status,
        currentKm: Number(v.current_km),
        insuranceExpiry: v.insurance_expiry,
        renavam: v.renavam,
      }));
    }

    // Inventory Transactions
    const { data: invTx } = await supabase.from('inventory_transactions').select('*');
    if (invTx && invTx.length > 0) {
      result.inventoryTransactions = invTx.map(t => ({
        id: t.id,
        itemId: t.item_id,
        itemName: t.item_name,
        itemCodigoNorma: t.item_codigo_norma,
        type: t.type,
        quantity: t.quantity,
        valor_pago: Number(t.valor_pago),
        date: t.date,
        supplierId: t.supplier_id,
        supplierName: t.supplier_name,
        notes: t.notes,
      }));
    }

    // Maintenances
    const { data: maintenances } = await supabase.from('maintenances').select('*');
    if (maintenances && maintenances.length > 0) {
      result.maintenances = maintenances.map(m => ({
        id: m.id,
        vehicleId: m.vehicle_id,
        vehiclePlate: m.vehicle_plate,
        date: m.date,
        type: m.type,
        description: m.description,
        cost: Number(m.cost),
        providerName: m.provider_name,
        odometer: Number(m.odometer),
        nextMaintenanceDate: m.next_maintenance_date,
        nextMaintenanceKm: m.next_maintenance_km ? Number(m.next_maintenance_km) : undefined,
      }));
    }

    // Supplies
    const { data: supplies } = await supabase.from('supplies').select('*');
    if (supplies && supplies.length > 0) {
      result.supplies = supplies.map(s => ({
        id: s.id,
        vehicleId: s.vehicle_id,
        vehiclePlate: s.vehicle_plate,
        date: s.date,
        fuelType: s.fuel_type,
        liters: Number(s.liters),
        cost: Number(s.cost),
        odometer: Number(s.odometer),
        stationName: s.station_name,
      }));
    }

    // Trips
    const { data: trips } = await supabase.from('trips').select('*');
    if (trips && trips.length > 0) {
      result.trips = trips.map(t => ({
        id: t.id,
        vehicleId: t.vehicle_id,
        vehiclePlate: t.vehicle_plate,
        date: t.date,
        driverName: t.driver_name,
        purpose: t.purpose,
        startKm: Number(t.start_km),
        endKm: t.end_km ? Number(t.end_km) : undefined,
        status: t.status,
      }));
    }

    return result;
  } catch (err) {
    console.error('Failed to fetch from Supabase:', err);
    return null;
  }
}
