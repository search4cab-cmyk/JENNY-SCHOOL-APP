import { Client } from 'pg';

const connectionString = 'postgresql://postgres.qeglukmqnondkzddmgtr:OaMDW23jMkbW6Evf@aws-1-eu-central-1.pooler.supabase.com:6543/postgres';

async function runMigration() {
  const client = new Client({ connectionString });
  
  try {
    await client.connect();
    
    const sql = `
      -- 1. Estate Settings
      CREATE TABLE IF NOT EXISTS public.estate_settings (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        estate_id UUID REFERENCES public.estates(id) ON DELETE CASCADE UNIQUE,
        manager_name VARCHAR(255) DEFAULT 'Mr Macurley',
        treasurer_name VARCHAR(255) DEFAULT 'Anointing Umude',
        bank_account_name VARCHAR(255) DEFAULT 'Umude Anointing',
        bank_account_number VARCHAR(100) DEFAULT '0257831096',
        bank_name VARCHAR(100) DEFAULT 'GTBank',
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
      );

      ALTER TABLE public.estate_settings ENABLE ROW LEVEL SECURITY;
      DROP POLICY IF EXISTS "Anyone in estate can view settings" ON public.estate_settings;
      CREATE POLICY "Anyone in estate can view settings" ON public.estate_settings FOR SELECT USING (
        estate_id IN (SELECT estate_id FROM public.user_roles WHERE user_id = auth.uid())
      );
      DROP POLICY IF EXISTS "Super Admins can edit settings" ON public.estate_settings;
      CREATE POLICY "Super Admins can edit settings" ON public.estate_settings FOR UPDATE USING (
        estate_id IN (SELECT estate_id FROM public.user_roles WHERE user_id = auth.uid() AND role = 'SUPER_ADMIN')
      );

      -- 2. Audit Logs
      CREATE TABLE IF NOT EXISTS public.audit_logs (
        id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
        estate_id UUID REFERENCES public.estates(id) ON DELETE CASCADE,
        user_name VARCHAR(255) NOT NULL,
        action VARCHAR(255) NOT NULL,
        affected_record TEXT,
        timestamp TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
      );

      ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
      DROP POLICY IF EXISTS "Super Admins can view audit logs" ON public.audit_logs;
      CREATE POLICY "Super Admins can view audit logs" ON public.audit_logs FOR SELECT USING (
        estate_id IN (SELECT estate_id FROM public.user_roles WHERE user_id = auth.uid() AND role = 'SUPER_ADMIN')
      );
      DROP POLICY IF EXISTS "Anyone can insert audit logs" ON public.audit_logs;
      CREATE POLICY "Anyone can insert audit logs" ON public.audit_logs FOR INSERT WITH CHECK (
        estate_id IN (SELECT estate_id FROM public.user_roles WHERE user_id = auth.uid())
      );

      -- 3. Profiles (Sync with auth.users)
      CREATE TABLE IF NOT EXISTS public.profiles (
        id UUID REFERENCES auth.users(id) ON DELETE CASCADE PRIMARY KEY,
        email VARCHAR(255) NOT NULL,
        full_name VARCHAR(255),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now())
      );

      ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
      DROP POLICY IF EXISTS "Super Admins can view profiles" ON public.profiles;
      CREATE POLICY "Super Admins can view profiles" ON public.profiles FOR SELECT USING (
        EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = auth.uid() AND role = 'SUPER_ADMIN')
      );
      -- View own profile
      DROP POLICY IF EXISTS "Users can view own profile" ON public.profiles;
      CREATE POLICY "Users can view own profile" ON public.profiles FOR SELECT USING (id = auth.uid());

      CREATE OR REPLACE FUNCTION public.handle_user_profile() 
      RETURNS TRIGGER AS $$
      BEGIN
        INSERT INTO public.profiles (id, email, full_name)
        VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name')
        ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name;
        RETURN new;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;

      DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
      CREATE TRIGGER on_auth_user_created
        AFTER INSERT OR UPDATE ON auth.users
        FOR EACH ROW EXECUTE PROCEDURE public.handle_user_profile();

      -- Sync existing users
      INSERT INTO public.profiles (id, email, full_name)
      SELECT id, email, raw_user_meta_data->>'full_name' FROM auth.users
      ON CONFLICT DO NOTHING;

      -- 4. Settings trigger
      CREATE OR REPLACE FUNCTION public.handle_new_estate() 
      RETURNS TRIGGER AS $$
      BEGIN
        INSERT INTO public.estate_settings (estate_id) VALUES (new.id);
        RETURN new;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;

      DROP TRIGGER IF EXISTS on_estate_created ON public.estates;
      CREATE TRIGGER on_estate_created
        AFTER INSERT ON public.estates
        FOR EACH ROW EXECUTE PROCEDURE public.handle_new_estate();

      -- Sync existing estates
      INSERT INTO public.estate_settings (estate_id)
      SELECT id FROM public.estates
      ON CONFLICT DO NOTHING;
    `;
    
    await client.query(sql);
    console.log('Security schemas migrated successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await client.end();
  }
}

runMigration();
