/**
 * Camada de acesso ao banco de dados.
 *
 * Funciona com dois bancos, escolhido pela variável DB_CLIENT:
 *   - "postgres" (padrão em produção / Render) -> usa DATABASE_URL ou DB_HOST/DB_USER/...
 *   - "mysql"    (testes offline)               -> usa DB_HOST/DB_USER/DB_PASSWORD/DB_NAME/DB_PORT
 *
 * Os models escrevem SQL padrão usando "?" como placeholder; aqui ele é
 * convertido para "$1, $2..." quando o banco é Postgres.
 *
 * API exportada:
 *   query(sql, params)              -> array de linhas (SELECT)
 *   insert(sql, params, idColuna)   -> id da linha inserida
 *   execute(sql, params)            -> número de linhas afetadas (UPDATE/DELETE)
 *   transaction(async (tx) => ...)  -> tx tem query/insert/execute
 */
import 'dotenv/config';

export const DB_CLIENT = (
  process.env.DB_CLIENT || (process.env.DATABASE_URL ? 'postgres' : 'mysql')
).toLowerCase();

const isPostgres = DB_CLIENT === 'postgres' || DB_CLIENT === 'pg';

let pool;

if (isPostgres) {
  const pg = (await import('pg')).default;

  // Faz o Postgres devolver números como Number (e não string) e DATE como 'AAAA-MM-DD'
  pg.types.setTypeParser(20, (v) => parseInt(v, 10));   // BIGINT (COUNT)
  pg.types.setTypeParser(1700, (v) => parseFloat(v));   // NUMERIC / DECIMAL
  pg.types.setTypeParser(1082, (v) => v);               // DATE

  const usarSSL =
    process.env.DB_SSL === 'true' ||
    (process.env.DB_SSL !== 'false' && /render\.com|neon\.tech|supabase/.test(process.env.DATABASE_URL || ''));

  pool = new pg.Pool(
    process.env.DATABASE_URL
      ? { connectionString: process.env.DATABASE_URL, ssl: usarSSL ? { rejectUnauthorized: false } : false }
      : {
          host: process.env.DB_HOST,
          user: process.env.DB_USER,
          password: process.env.DB_PASSWORD,
          database: process.env.DB_NAME,
          port: Number(process.env.DB_PORT) || 5432,
          ssl: usarSSL ? { rejectUnauthorized: false } : false,
        }
  );
} else {
  const mysql = (await import('mysql2/promise')).default;
  pool = mysql.createPool({
    host: process.env.DB_HOST || 'localhost',
    user: process.env.DB_USER || 'root',
    password: process.env.DB_PASSWORD || '',
    database: process.env.DB_NAME || 'allocate_db',
    port: Number(process.env.DB_PORT) || 3306,
    waitForConnections: true,
    connectionLimit: 10,
    decimalNumbers: true,      // DECIMAL -> Number
    dateStrings: ['DATE'],     // DATE -> 'AAAA-MM-DD'
    charset: 'utf8mb4',
  });
}

/** Converte "?" em "$1, $2, ..." para o Postgres. */
function paraPostgres(sql) {
  let i = 0;
  return sql.replace(/\?/g, () => `$${++i}`);
}

/** Padroniza erros dos dois bancos em err.tipo: UNIQUE | FK | CHECK | REGRA */
function normalizarErro(err) {
  const code = String(err.code || '');
  if (code === '23505' || code === 'ER_DUP_ENTRY') err.tipo = 'UNIQUE';
  else if (code === '23503' || code.startsWith('ER_ROW_IS_REFERENCED') || code.startsWith('ER_NO_REFERENCED_ROW')) err.tipo = 'FK';
  else if (code === '23514' || code === 'ER_CHECK_CONSTRAINT_VIOLATED') err.tipo = 'CHECK';
  else if (code === 'P0001' || err.sqlState === '45000') err.tipo = 'REGRA'; // mensagens de triggers
  return err;
}

/** Cria as funções query/insert/execute em cima de uma conexão (pool ou transação). */
function criarExecutor(conn) {
  async function bruto(sql, params = []) {
    try {
      if (isPostgres) {
        const r = await conn.query(paraPostgres(sql), params);
        return { rows: r.rows, affected: r.rowCount };
      }
      const [r] = await conn.query(sql, params);
      return Array.isArray(r) ? { rows: r, affected: r.length } : { rows: [], affected: r.affectedRows, insertId: r.insertId };
    } catch (err) {
      throw normalizarErro(err);
    }
  }

  return {
    async query(sql, params) {
      return (await bruto(sql, params)).rows;
    },
    async insert(sql, params, idColuna) {
      if (isPostgres) {
        const r = await bruto(`${sql} RETURNING ${idColuna}`, params);
        return r.rows[0][idColuna];
      }
      return (await bruto(sql, params)).insertId;
    },
    async execute(sql, params) {
      return (await bruto(sql, params)).affected;
    },
  };
}

const db = criarExecutor(pool);

export const query = db.query;
export const insert = db.insert;
export const execute = db.execute;

/** Executa várias operações de forma atômica (tudo ou nada). */
export async function transaction(fn) {
  if (isPostgres) {
    const client = await pool.connect();
    try {
      await client.query('BEGIN');
      const resultado = await fn(criarExecutor(client));
      await client.query('COMMIT');
      return resultado;
    } catch (err) {
      await client.query('ROLLBACK');
      throw err;
    } finally {
      client.release();
    }
  }
  const conn = await pool.getConnection();
  try {
    await conn.beginTransaction();
    const resultado = await fn(criarExecutor(conn));
    await conn.commit();
    return resultado;
  } catch (err) {
    await conn.rollback();
    throw err;
  } finally {
    conn.release();
  }
}

export { pool, isPostgres };