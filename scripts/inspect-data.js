import { createClient } from '@libsql/client';

const client = createClient({
  url: 'file:db/custom.db',
});

async function inspectData() {
  const tables = ['AdminUser', 'Course', 'Student', 'Session', 'Attendance', 'QrToken', 'QuotaExtension', 'ExtensionRequest'];
  for (const table of tables) {
    const res = await client.execute(`SELECT * FROM "${table}"`);
    console.log(`\n=== Table: ${table} (${res.rows.length} rows) ===`);
    if (res.rows.length > 0) {
      console.log(JSON.stringify(res.rows, null, 2));
    }
  }
}

inspectData().catch(console.error);
