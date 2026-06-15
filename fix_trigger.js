import { Client } from 'pg';

const connectionString = 'postgresql://postgres.qeglukmqnondkzddmgtr:OaMDW23jMkbW6Evf@aws-1-eu-central-1.pooler.supabase.com:6543/postgres';

async function fixTrigger() {
  const client = new Client({ connectionString });
  
  try {
    await client.connect();
    
    const sql = `
      CREATE OR REPLACE FUNCTION public.handle_user_profile_and_role() 
      RETURNS TRIGGER AS $$
      DECLARE
        new_estate_id UUID;
        user_count INT;
      BEGIN
        -- 1. Insert Profile
        INSERT INTO public.profiles (id, email, full_name)
        VALUES (new.id, new.email, new.raw_user_meta_data->>'full_name')
        ON CONFLICT (id) DO UPDATE SET full_name = EXCLUDED.full_name;

        -- 2. Insert Role (if not exists)
        IF NOT EXISTS (SELECT 1 FROM public.user_roles WHERE user_id = new.id) THEN
          SELECT count(*) INTO user_count FROM public.user_roles;
          
          IF user_count = 0 THEN
            -- First user gets an estate and SUPER_ADMIN
            INSERT INTO public.estates (name) VALUES ('Main Estate') RETURNING id INTO new_estate_id;
            INSERT INTO public.user_roles (user_id, estate_id, role) VALUES (new.id, new_estate_id, 'SUPER_ADMIN');
          ELSE
            -- Subsequent users get VIEW_ONLY in the existing estate
            SELECT id INTO new_estate_id FROM public.estates LIMIT 1;
            INSERT INTO public.user_roles (user_id, estate_id, role) VALUES (new.id, new_estate_id, 'VIEW_ONLY');
          END IF;
        END IF;

        RETURN new;
      END;
      $$ LANGUAGE plpgsql SECURITY DEFINER;

      DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
      CREATE TRIGGER on_auth_user_created
        AFTER INSERT OR UPDATE ON auth.users
        FOR EACH ROW EXECUTE PROCEDURE public.handle_user_profile_and_role();

      -- Backfill any missing users into user_roles
      DO $$
      DECLARE
        missing_user RECORD;
        target_estate_id UUID;
      BEGIN
        SELECT id INTO target_estate_id FROM public.estates LIMIT 1;
        FOR missing_user IN 
          SELECT id FROM auth.users WHERE id NOT IN (SELECT user_id FROM public.user_roles)
        LOOP
          INSERT INTO public.user_roles (user_id, estate_id, role) 
          VALUES (missing_user.id, target_estate_id, 'VIEW_ONLY');
        END LOOP;
      END $$;
    `;
    
    await client.query(sql);
    console.log('Trigger fixed and backfill complete!');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await client.end();
  }
}

fixTrigger();
