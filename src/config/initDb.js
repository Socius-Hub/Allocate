/**
 * Criação automática das tabelas.
 *
 * - Na inicialização do servidor, se as tabelas ainda não existirem,
 *   executa database/<banco>/schema.sql + database/seed.sql.
 *   (Assim o deploy no Render funciona sem precisar rodar SQL manualmente.)
 * - `npm run db:reset` apaga tudo e recria do zero.
 */
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { pool, isPostgres } from './database.js';

const raiz = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const arquivoSchema = path.join(raiz, 'database', isPostgres ? 'postgres' : 'mysql', 'schema.sql');
const arquivoSeed = path.join(raiz, 'database', 'seed.sql');

/** Divide um script MySQL em comandos, respeitando "DELIMITER //" dos triggers. */
function dividirComandosMySQL(sql) {
  const comandos = [];
  let delimitador = ';';
  let atual = '';
  for (const linha of sql.split(/\r?\n/)) {
    const limpa = linha.trim();
    if (/^DELIMITER\s+/i.test(limpa)) {
      delimitador = limpa.split(/\s+/)[1];
      continue;
    }
    if (!atual && (limpa === '' || limpa.startsWith('--'))) continue;
    atual += linha + '\n';
    if (limpa.endsWith(delimitador)) {
      comandos.push(atual.trim().slice(0, -delimitador.length));
      atual = '';
    }
  }
  if (atual.trim()) comandos.push(atual.trim());
  return comandos.filter((c) => c.replace(/--.*$/gm, '').trim());
}

async function executarArquivo(arquivo) {
  const sql = await fs.readFile(arquivo, 'utf8');
  if (isPostgres) {
    await pool.query(sql); // o Postgres aceita vários comandos numa única chamada sem parâmetros
    return;
  }
  for (const comando of dividirComandosMySQL(sql)) {
    await pool.query(comando);
  }
}

/** No MySQL local, cria o database (ex: allocate_db) se ele ainda não existir. */
async function garantirDatabaseMySQL() {
  const mysql = (await import('mysql2/promise')).default;
  const conn = await mysql.createConnection({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    port: Number(process.env.DB_PORT) || 3306,
  });
  const nome = (process.env.DB_NAME || 'allocate_db').replace(/[^a-zA-Z0-9_]/g, '');
  await conn.query(`CREATE DATABASE IF NOT EXISTS \`${nome}\` CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci`);
  await conn.end();
}

async function tabelasExistem() {
  try {
    await pool.query('SELECT 1 FROM perfil_acesso LIMIT 1');
    return true;
  } catch (err) {
    if (err.code === '42P01' || err.code === 'ER_NO_SUCH_TABLE') return false;
    throw err;
  }
}

/**
 * @param {{ forcar?: boolean }} opcoes  forcar=true apaga e recria tudo
 * @returns {Promise<boolean>} true se o banco foi (re)criado
 */
export async function inicializarBanco({ forcar = false } = {}) {
  if (!isPostgres) await garantirDatabaseMySQL();
  if (!forcar && (await tabelasExistem())) return false;

  console.log(`[db] Criando tabelas (${isPostgres ? 'PostgreSQL' : 'MySQL'})...`);
  await executarArquivo(arquivoSchema);
  console.log('[db] Inserindo dados iniciais...');
  await executarArquivo(arquivoSeed);
  console.log('[db] Banco pronto.');
  return true;
}
