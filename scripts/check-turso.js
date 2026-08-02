import { createClient } from '@libsql/client';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const url = process.env.DATABASE_TURSO_DATABASE_URL;
const authToken = process.env.DATABASE_TURSO_AUTH_TOKEN;

console.log('Connecting to Turso:', url);

const client = createClient({
  url,
  authToken,
});

async function checkTurso() {
  console.log('--- Checking Turso Remote Database ---');
  const tables = await client.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '__drizzle%'");
  console.log('Turso tables found:', tables.rows.map(r => r.name));
  
  let totalRows = 0;
  for (const row of tables.rows) {
    const tableName = row.name;
    const res = await client.execute(`SELECT COUNT(*) as count FROM "${tableName}"`);
    const count = Number(res.rows[0].count);
    totalRows += count;
    console.log(`Turso Table "${tableName}": ${count} rows`);
  }
  
  console.log(`Total data rows across user tables in Turso: ${totalRows}`);
}

checkTurso().catch(console.error);
