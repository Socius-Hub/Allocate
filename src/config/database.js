import pkg from 'pg';
const { Pool, types } = pkg;

export const DB_CLIENT = 'postgres';
export const isPostgres = true;

// O Postgres devolve BIGINT (ex: COUNT(*)) e NUMERIC (ex: DECIMAL) como texto.
// Convertendo para número evitamos somas virando concatenação ("0" + "1" = "01").
types.setTypeParser(types.builtins.INT8, (v) => parseInt(v, 10));
types.setTypeParser(types.builtins.NUMERIC, (v) => parseFloat(v));

// SSL: obrigatório no Render. Ative com DB_SSL=true para acessar o banco do Render pela
// External Database URL a partir do seu computador.
const usarSSL = process.env.DB_SSL === 'true' || (process.env.NODE_ENV === 'production' && process.env.DB_SSL !== 'false');

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: usarSSL ? { rejectUnauthorized: false } : false,
});

/**
 * Converte interrogações (?) em parâmetros posicionais do Postgres ($1, $2, $3...)
 */
function prepararQuery(sql) {
  let index = 0;
  return sql.replace(/\?/g, () => `$${++index}`);
}

/** Códigos de erro do Postgres -> tipos usados pelos controllers (ver utils/http.js). */
const TIPOS_ERRO = { 23505: 'UNIQUE', 23503: 'FK', 23514: 'CHECK' };

async function executar(client, sql, params = []) {
  try {
    return await client.query(prepararQuery(sql), params);
  } catch (err) {
    if (TIPOS_ERRO[err.code]) err.tipo = TIPOS_ERRO[err.code];
    throw err;
  }
}

function comRetorno(sql, primaryKeyName) {
  return sql.toUpperCase().includes('RETURNING') ? sql : `${sql} RETURNING ${primaryKeyName}`;
}

/** Retorna o ID gerado independentemente do nome ou maiúsculas/minúsculas da coluna. */
function primeiroValor(result) {
  const row = result.rows[0];
  return row ? row[Object.keys(row)[0]] : null;
}

/** Operações disponíveis tanto no pool quanto dentro de uma transação. */
function operacoes(client) {
  return {
    query: async (sql, params) => (await executar(client, sql, params)).rows,
    execute: async (sql, params) => (await executar(client, sql, params)).rowCount,
    insert: async (sql, params, primaryKeyName = 'id') =>
      primeiroValor(await executar(client, comRetorno(sql, primaryKeyName), params)),
  };
}

const viaPool = operacoes(pool);
export const query = viaPool.query;
export const execute = viaPool.execute;
export const insert = viaPool.insert;

export async function transaction(callback) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const resultado = await callback(operacoes(client));
    await client.query('COMMIT');
    return resultado;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}
