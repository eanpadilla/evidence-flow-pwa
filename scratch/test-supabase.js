const { createClient } = require('@supabase/supabase-js');
const fs = require('fs');
const path = require('path');

// Manually parse .env.local
let supabaseUrl = '';
let supabaseAnonKey = '';

try {
  const envPath = path.resolve(__dirname, '../.env.local');
  const envContent = fs.readFileSync(envPath, 'utf8');
  const lines = envContent.split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const parts = trimmed.split('=');
    if (parts.length >= 2) {
      const key = parts[0].trim();
      const val = parts.slice(1).join('=').trim();
      if (key === 'NEXT_PUBLIC_SUPABASE_URL') supabaseUrl = val;
      if (key === 'NEXT_PUBLIC_SUPABASE_ANON_KEY') supabaseAnonKey = val;
    }
  }
} catch (err) {
  console.error('Error reading .env.local:', err.message);
}

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function inspectSchema() {
  console.log('\n--- Inspecting profiles table schema ---');
  const { data, error } = await supabase.rpc('get_schema_info_for_debug'); // Let's try raw select
  
  // If rpc is not defined, let's use a standard query to postgres if possible.
  // Wait! We can execute arbitrary SQL queries using supabase.rpc if we define a helper,
  // or we can select from pg_catalog if we have permissions, or just do a standard query:
  const { data: cols, error: colError } = await supabase
    .from('profiles')
    .select('*')
    .limit(0); // This will return metadata or succeed if columns exist
  
  if (colError) {
    console.error('Profiles select failed:', colError);
  } else {
    console.log('Profiles table exists. Testing insert of dummy profile to check constraints...');
    // Let's try inserting a dummy profile with a random UUID to see if it succeeds or what constraint it hits
    const tempUuid = '00000000-0000-0000-0000-000000000001';
    
    // First, let's try to delete it if it exists
    await supabase.from('profiles').delete().eq('id', tempUuid);

    const { data: insData, error: insError } = await supabase
      .from('profiles')
      .insert({
        id: tempUuid,
        email: 'test-insert@example.com',
        full_name: 'Test Insert',
        role: 'user'
      });
      
    if (insError) {
      console.error('Insert failed with error:');
      console.dir(insError, { depth: null });
    } else {
      console.log('Insert succeeded! Cleaning up...');
      await supabase.from('profiles').delete().eq('id', tempUuid);
    }
  }
}

async function run() {
  await inspectSchema();
}

run();
