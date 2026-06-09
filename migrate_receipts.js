import { Client } from 'pg';

const connectionString = 'postgresql://postgres.qeglukmqnondkzddmgtr:OaMDW23jMkbW6Evf@aws-1-eu-central-1.pooler.supabase.com:6543/postgres';

async function runMigration() {
  const client = new Client({ connectionString });
  
  try {
    await client.connect();
    
    const sql = `
      CREATE TABLE IF NOT EXISTS public.receipts (
          id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
          receipt_number VARCHAR(100) UNIQUE NOT NULL,
          transaction_id VARCHAR(100) UNIQUE NOT NULL,
          landlord_id UUID REFERENCES public.landlords(id) ON DELETE CASCADE NOT NULL,
          payment_ids UUID[] NOT NULL,
          total_amount DECIMAL(12, 2) NOT NULL,
          generated_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
          created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
      );

      ALTER TABLE public.receipts ENABLE ROW LEVEL SECURITY;

      DROP POLICY IF EXISTS "Users can view receipts in their estate" ON public.receipts;
      CREATE POLICY "Users can view receipts in their estate" 
      ON public.receipts FOR SELECT USING (
          landlord_id IN (SELECT id FROM public.landlords WHERE estate_id IN (SELECT estate_id FROM public.user_roles WHERE user_id = auth.uid()))
      );

      DROP POLICY IF EXISTS "Managers and Admins can create receipts" ON public.receipts;
      CREATE POLICY "Managers and Admins can create receipts" 
      ON public.receipts FOR INSERT WITH CHECK (
          landlord_id IN (SELECT id FROM public.landlords WHERE estate_id IN (SELECT estate_id FROM public.user_roles WHERE user_id = auth.uid() AND role IN ('SUPER_ADMIN', 'ESTATE_MANAGER', 'ACCOUNT_OFFICER')))
      );
    `;
    
    await client.query(sql);
    console.log('Receipts table migrated successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await client.end();
  }
}

runMigration();
