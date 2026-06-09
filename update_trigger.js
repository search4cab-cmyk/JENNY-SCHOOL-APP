import { Client } from 'pg';

const connectionString = 'postgresql://postgres.qeglukmqnondkzddmgtr:OaMDW23jMkbW6Evf@aws-1-eu-central-1.pooler.supabase.com:6543/postgres';

async function updateTrigger() {
  const client = new Client({ connectionString });
  
  try {
    await client.connect();
    
    const sql = `
      CREATE OR REPLACE FUNCTION public.handle_new_user() 
      RETURNS TRIGGER AS $$
      DECLARE
        user_count INT;
        default_estate_id UUID;
      BEGIN
        SELECT COUNT(*) INTO user_count FROM auth.users;
        
        IF user_count = 1 THEN
          -- First user, create default estate
          INSERT INTO public.estates (estate_name) VALUES ('Main Estate') RETURNING id INTO default_estate_id;
          -- Assign SUPER_ADMIN
          INSERT INTO public.user_roles (user_id, estate_id, role)
          VALUES (new.id, default_estate_id, 'SUPER_ADMIN');
        ELSE
          -- Subsequent users
          INSERT INTO public.user_roles (user_id, role)
          VALUES (new.id, 'VIEW_ONLY');
        END IF;
        
        RETURN new;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;
    `;
    
    await client.query(sql);
    console.log('Trigger function updated successfully!');
  } catch (error) {
    console.error('Update failed:', error);
  } finally {
    await client.end();
  }
}

updateTrigger();
