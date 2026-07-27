import { createClient } from '@supabase/supabase-js';

const metaEnv = (import.meta as any).env || {};
const SUPABASE_URL = metaEnv.VITE_SUPABASE_URL || 'https://gohbjaqkrbkitcmipjrq.supabase.co';
const SUPABASE_ANON_KEY = metaEnv.VITE_SUPABASE_ANON_KEY || 'sb_publishable_UIV4Voe_Hg10zw98Vjp_Eg_uYwFIWbt';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

export async function testSupabaseConnection(): Promise<{ success: boolean; error?: string }> {
  try {
    const { data, error } = await supabase.from('company_settings').select('id').limit(1);
    if (error) {
      console.warn('Supabase test connection notice:', error.message);
      return { success: false, error: error.message };
    }
    return { success: true };
  } catch (err: any) {
    return { success: false, error: err?.message || 'Erro de conexão' };
  }
}
