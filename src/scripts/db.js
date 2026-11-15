/**
 * Utilitário de linha de comando para o banco (lê o DATABASE_URL do arquivo .env).
 *   npm run db:init   -> cria as tabelas se ainda não existirem
 *   npm run db:reset  -> APAGA tudo e recria com os dados iniciais
 */
import 'dotenv/config';
import { inicializarBanco } from '../config/initDB.js';
import { pool } from '../config/database.js';

const comando = process.argv[2] || 'init';

if (!['init', 'reset'].includes(comando)) {
  console.error(`[db] Comando desconhecido: "${comando}". Use "init" ou "reset".`);
  process.exit(1);
}

if (!process.env.DATABASE_URL) {
  console.error('[db] DATABASE_URL não definido. Configure o arquivo .env (veja .env.example).');
  process.exit(1);
}

try {
  const forcar = comando === 'reset';
  const criado = await inicializarBanco({ forcar });

  if (criado) {
    console.log(`[db] Banco de dados ${forcar ? 'recriado' : 'inicializado'} com sucesso!`);
  } else {
    console.log('[db] As tabelas já existem. Use "npm run db:reset" para recriar.');
  }
} catch (err) {
  console.error('[db] Falha:', err.message || err.code || err);
  process.exitCode = 1;
} finally {
  await pool.end();
}
