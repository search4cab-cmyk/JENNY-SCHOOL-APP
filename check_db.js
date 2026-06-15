import { Client } from 'pg';

const connectionString = 'postgresql://postgres.qeglukmqnondkzddmgtr:OaMDW23jMkbW6Evf@aws-1-eu-central-1.pooler.supabase.com:6543/postgres';

async function checkDb() {
  const client = new Client({ connectionString });
  
  try {
    await client.connect();
    
    const { rows: users } = await client.query('SELECT id, email FROM auth.users');
    console.log('Auth Users:', users);

    const { rows: profiles } = await client.query('SELECT * FROM public.profiles');
    console.log('Profiles:', profiles);

    const { rows: roles } = await client.query('SELECT * FROM public.user_roles');
    console.log('User Roles:', roles);

  } catch (error) {
    console.error('Error:', error);
  } finally {
    await client.end();
  }
}

checkDb();
