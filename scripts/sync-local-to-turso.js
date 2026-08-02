import { createClient } from '@libsql/client';
import dotenv from 'dotenv';

dotenv.config({ path: '.env.local' });

const localClient = createClient({
  url: 'file:db/custom.db',
});

const tursoClient = createClient({
  url: process.env.DATABASE_TURSO_DATABASE_URL,
  authToken: process.env.DATABASE_TURSO_AUTH_TOKEN,
});

async function syncToTurso() {
  console.log('=== SYNCING LOCAL DB (db/custom.db) TO TURSO ===');
  
  // 1. Get DDL (CREATE TABLE statements) from local SQLite
  const tableSchemas = await localClient.execute(
    "SELECT sql FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%'"
  );
  
  const indexSchemas = await localClient.execute(
    "SELECT sql FROM sqlite_master WHERE type='index' AND name NOT LIKE 'sqlite_%' AND sql IS NOT NULL"
  );

  // 2. Create tables on Turso
  for (const row of tableSchemas.rows) {
    if (row.sql) {
      console.log(`Executing DDL on Turso:\n${row.sql}\n`);
      await tursoClient.execute(row.sql);
    }
  }

  // Create indexes on Turso
  for (const row of indexSchemas.rows) {
    if (row.sql) {
      console.log(`Executing Index DDL on Turso:\n${row.sql}\n`);
      try {
        await tursoClient.execute(row.sql);
      } catch (err) {
        console.log(`Index notice: ${err.message}`);
      }
    }
  }

  // 3. Sync data table by table
  const userTables = ['AdminUser', 'Course', 'Student', 'Session', 'Attendance', 'QrToken', 'QuotaExtension', 'ExtensionRequest'];
  
  for (const tableName of userTables) {
    const localRows = await localClient.execute(`SELECT * FROM "${tableName}"`);
    console.log(`Pushing ${localRows.rows.length} rows for table "${tableName}" to Turso...`);
    
    if (localRows.rows.length > 0) {
      // Clear existing records in Turso table to prevent duplicate key errors during full sync
      await tursoClient.execute(`DELETE FROM "${tableName}"`);
      
      const columns = localRows.columns;
      const colNames = columns.map(c => `"${c}"`).join(', ');
      const placeholders = columns.map(() => '?').join(', ');
      const insertSql = `INSERT INTO "${tableName}" (${colNames}) VALUES (${placeholders})`;
      
      for (const row of localRows.rows) {
        const args = columns.map(col => row[col]);
        await tursoClient.execute({ sql: insertSql, args });
      }
    }
  }

  console.log('=== SYNC COMPLETED SUCCESSFULLY ===');
}

syncToTurso().catch(console.error);
