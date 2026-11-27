import { readFileSync } from 'node:fs';

const [statePath] = process.argv.slice(2);
if (!statePath) throw new Error('MIGRATION_READBACK_PATH_REQUIRED');

const state = readFileSync(statePath, 'utf8');
if (!state.includes('No migrations to apply!')) {
  throw new Error('REMOTE_MIGRATIONS_ARE_NOT_CURRENT');
}

console.log('Verified remote migrations are current');
