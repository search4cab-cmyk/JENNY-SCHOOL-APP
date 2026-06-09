import { supabase } from './supabase';
import type { Landlord, Payment, Estate, AuthSession } from '../types';

export class ApiService {
  static async getCurrentSession(): Promise<AuthSession | null> {
    const { data: { session }, error } = await supabase.auth.getSession();
    if (error || !session) return null;

    const { data: roleData } = await supabase
      .from('user_roles')
      .select('*')
      .eq('user_id', session.user.id)
      .single();

    if (!roleData) return null;

    return {
      user: { 
        id: session.user.id, 
        email: session.user.email, 
        full_name: session.user.user_metadata?.full_name 
      },
      role: roleData.role,
      estate_id: roleData.estate_id
    };
  }

  static async getEstateDetails(estateId: string): Promise<Estate | null> {
    const { data, error } = await supabase
      .from('estates')
      .select('*')
      .eq('id', estateId)
      .single();
    if (error) {
      console.error(error);
      return null;
    }
    return data as Estate;
  }

  static async fetchLandlords(estateId: string): Promise<Landlord[]> {
    const { data, error } = await supabase
      .from('landlords')
      .select('*')
      .eq('estate_id', estateId)
      .order('created_at', { ascending: false });
    
    if (error) throw error;
    return data as Landlord[];
  }

  static async fetchPayments(estateId: string, year: string): Promise<Payment[]> {
    const { data, error } = await supabase
      .from('payments')
      .select(`*, landlords!inner(estate_id)`)
      .eq('landlords.estate_id', estateId)
      .eq('payment_year', year);
      
    if (error) throw error;
    return data as Payment[];
  }

  static async addLandlord(landlord: Omit<Landlord, 'id' | 'created_at'>): Promise<Landlord> {
    const { data, error } = await supabase
      .from('landlords')
      .insert([landlord])
      .select()
      .single();
      
    if (error) throw error;
    return data as Landlord;
  }

  static async updatePayment(
    landlordId: string, 
    month: string, 
    year: string, 
    amount: number
  ): Promise<void> {
    // Upsert logic based on UNIQUE(landlord_id, payment_month, payment_year)
    const { error } = await supabase
      .from('payments')
      .upsert({
        landlord_id: landlordId,
        payment_month: month,
        payment_year: year,
        amount_paid: amount,
        payment_date: new Date().toISOString()
      }, { onConflict: 'landlord_id, payment_month, payment_year' });
      
    if (error) throw error;
  }

  static async deleteLandlord(id: string): Promise<void> {
    const { error } = await supabase.from('landlords').delete().eq('id', id);
    if (error) throw error;
  }

  static async saveReceipt(receipt: any): Promise<void> {
    const { error } = await supabase.from('receipts').insert([receipt]);
    if (error) throw error;
  }

  // --- SETTINGS ---
  static async fetchSettings(estateId: string): Promise<any> {
    const { data, error } = await supabase
      .from('estate_settings')
      .select('*')
      .eq('estate_id', estateId)
      .single();
    if (error) throw error;
    return data;
  }

  static async updateSettings(estateId: string, settings: any): Promise<void> {
    const { error } = await supabase
      .from('estate_settings')
      .update({ ...settings, updated_at: new Date().toISOString() })
      .eq('estate_id', estateId);
    if (error) throw error;
  }

  // --- USERS ---
  static async fetchUsers(estateId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('user_roles')
      .select('user_id, role, profiles(email, full_name, created_at)')
      .eq('estate_id', estateId);
    if (error) throw error;
    return data || [];
  }

  static async updateUserRole(userId: string, estateId: string, role: string): Promise<void> {
    const { error } = await supabase
      .from('user_roles')
      .update({ role })
      .eq('user_id', userId)
      .eq('estate_id', estateId);
    if (error) throw error;
  }

  // --- AUDIT LOGS ---
  static async logAudit(estateId: string, action: string, affectedRecord: string): Promise<void> {
    const session = await this.getCurrentSession();
    if (!session) return;
    try {
      await supabase.from('audit_logs').insert([{
        estate_id: estateId,
        user_name: session.user.full_name || session.user.email || 'Unknown',
        action,
        affected_record: affectedRecord
      }]);
    } catch (e) {
      console.warn('Audit log failed', e);
    }
  }

  static async fetchAuditLogs(estateId: string): Promise<any[]> {
    const { data, error } = await supabase
      .from('audit_logs')
      .select('*')
      .eq('estate_id', estateId)
      .order('timestamp', { ascending: false })
      .limit(100);
    if (error) throw error;
    return data || [];
  }
}
