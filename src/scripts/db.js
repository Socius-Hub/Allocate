/**
 * Utilitário de linha de comando para o banco.
 *   npm run db:init   -> cria as tabelas se ainda não existirem
 *   npm run db:reset  -> APAGA tudo e recria com os dados iniciais
 */
import { inicializarBanco } from '../config/initDb.js';
import { pool } from '../config/database.js';

const comando = process.argv[2] || 'init';

try {
  const criado = await inicializarBanco({ forcar: comando === 'reset' });
  if (!criado) console.log('[db] As tabelas já existem. Use "npm run db:reset" para recriar.');
} catch (err) {
  console.error('[db] Falha:', err.message);
  process.exitCode = 1;
} finally {
  await pool.end();
}
