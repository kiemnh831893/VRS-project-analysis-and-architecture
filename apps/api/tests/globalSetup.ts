import fs from 'node:fs';
import path from 'node:path';
import pg from 'pg';

export default async function globalSetup() {
  const url = 'postgresql://vrs:change_me_local_only@localhost:5432/vrs_test';
  const client = new pg.Client({ connectionString: url });
  await client.connect();
  await client.query('DROP SCHEMA IF EXISTS public CASCADE; CREATE SCHEMA public;');
  const migrationPath = path.join(
    process.cwd(),
    'prisma',
    'migrations',
    '20261123181556_init_phase1_schema',
    'migration.sql',
  );
  const sql = fs.readFileSync(migrationPath, 'utf8');
  await client.query(sql);
  await client.end();
}
