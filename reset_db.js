import { Client } from 'pg';
import fs from 'fs';

const connectionString = 'postgresql://postgres.qeglukmqnondkzddmgtr:OaMDW23jMkbW6Evf@aws-1-eu-central-1.pooler.supabase.com:6543/postgres';

async function resetAndMigrate() {
  const client = new Client({ connectionString });
  
  try {
    await client.connect();
    console.log('Connected to Supabase PostgreSQL database.');
    
    console.log('Dropping all existing tables in the public schema...');
    const dropSql = `
      DO $$ DECLARE
        r RECORD;
      BEGIN
        FOR r IN (SELECT tablename FROM pg_tables WHERE schemaname = 'public') LOOP
          EXECUTE 'DROP TABLE IF EXISTS public.' || quote_ident(r.tablename) || ' CASCADE';
        END LOOP;
      END $$;
    `;
    await client.query(dropSql);
    console.log('All public tables dropped successfully.');
    
    // Also drop the enum type if it exists to avoid type clashes
    try {
      await client.query('DROP TYPE IF EXISTS user_role CASCADE;');
      console.log('Old ENUM types dropped.');
    } catch (e) {
      // ignore
    }

    const sql = fs.readFileSync('./schema.sql', 'utf8');
    console.log('Running new schema migration...');
    await client.query(sql);
    
    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await client.end();
  }
}

resetAndMigrate();
