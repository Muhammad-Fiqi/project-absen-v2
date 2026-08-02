import { createClient } from '@libsql/client';

const client = createClient({
  url: 'file:db/custom.db',
});

async function checkDb() {
  console.log('--- Checking db/custom.db ---');
  const tables = await client.execute("SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT LIKE '__drizzle%'");
  console.log('Tables found:', tables.rows.map(r => r.name));
  
  let totalRows = 0;
  for (const row of tables.rows) {
    const tableName = row.name;
    const res = await client.execute(`SELECT COUNT(*) as count FROM "${tableName}"`);
    const count = Number(res.rows[0].count);
    totalRows += count;
    console.log(`Table "${tableName}": ${count} rows`);
  }
  
  console.log(`Total data rows across user tables: ${totalRows}`);
}

checkDb().catch(console.error);
