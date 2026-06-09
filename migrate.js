import { Client } from 'pg';
import fs from 'fs';

const connectionString = 'postgresql://postgres.qeglukmqnondkzddmgtr:OaMDW23jMkbW6Evf@aws-1-eu-central-1.pooler.supabase.com:6543/postgres';

async function runMigration() {
  const client = new Client({ connectionString });
  
  try {
    await client.connect();
    console.log('Connected to Supabase PostgreSQL database.');
    
    const sql = fs.readFileSync('./schema.sql', 'utf8');
    
    console.log('Running schema migration...');
    await client.query(sql);
    
    console.log('Migration completed successfully!');
  } catch (error) {
    console.error('Migration failed:', error);
  } finally {
    await client.end();
  }
}

runMigration();
