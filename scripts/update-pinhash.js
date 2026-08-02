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

async function updatePinHash() {
  console.log('=== UPDATING Student.pinHash TO "sukseswhv2026" ===');

  // 1. Update Local DB
  console.log('Updating local DB (db/custom.db)...');
  const localResult = await localClient.execute({
    sql: `UPDATE "Student" SET "pinHash" = ?`,
    args: ['sukseswhv2026'],
  });
  console.log(`Local DB updated (${localResult.rowsAffected} rows affected).`);

  // 2. Update Turso DB
  console.log('Updating Turso DB...');
  const tursoResult = await tursoClient.execute({
    sql: `UPDATE "Student" SET "pinHash" = ?`,
    args: ['sukseswhv2026'],
  });
  console.log(`Turso DB updated (${tursoResult.rowsAffected} rows affected).`);

  // 3. Verify
  console.log('\n--- Verifying Local Student pinHash Values ---');
  const localStudents = await localClient.execute(`SELECT studentCode, name, pinHash FROM "Student"`);
  console.log(localStudents.rows);

  console.log('\n--- Verifying Turso Student pinHash Values ---');
  const tursoStudents = await tursoClient.execute(`SELECT studentCode, name, pinHash FROM "Student"`);
  console.log(tursoStudents.rows);
}

updatePinHash().catch(console.error);
