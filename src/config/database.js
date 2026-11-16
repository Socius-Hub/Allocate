/*
  OBS: Este arquivo é responsável por configurar a conexão com o banco de dados PostgreSQL 
       e fornecer funções para executar consultas, transações e inserções de forma segura e eficiente

*/

import pkg from "pg";
const { Pool, types } = pkg;

export const DB_CLIENT = "postgres";
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
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

/* converte interrogações (?) em parâmetros posicionais do Postgres ($1, $2, $3...)
permitindo que o mesmo código SQL seja usado tanto para MySQL quanto para PostgreSQL. */
function prepararQuery(sql) {
  let index = 0;
  return sql.replace(/\?/g, () => `$${++index}`);
}

export async function query(sql, params = []) {
  const client = await pool.connect();
  try {
    const formattedSql = prepararQuery(sql);
    const result = await client.query(formattedSql, params);
    return result.rows;
  } finally {
    client.release();
  }
}

export async function execute(sql, params = []) {
  const client = await pool.connect();
  try {
    return await client.query(prepararQuery(sql), params);
  } catch (err) {
    if (TIPOS_ERRO[err.code]) err.tipo = TIPOS_ERRO[err.code];
    throw err;
  }
}

export async function insert(sql, params = [], primaryKeyName = 'id') {
  const client = await pool.connect();
  try {
    let formattedSql = prepararQuery(sql);
    if (!formattedSql.toUpperCase().includes('RETURNING')) {
      formattedSql = `${formattedSql} RETURNING ${primaryKeyName}`;
    }
    const result = await client.query(formattedSql, params);
    const row = result.rows[0];
    if (!row) return null;
    return row[Object.keys(row)[0]]; // Retorna o ID gerado independentemente do nome ou maiúsculas/minúsculas
  } finally {
    client.release();
  }
}

export async function transaction(callback) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const tx = {
      query: async (sql, params) => {
        const res = await client.query(prepararQuery(sql), params);
        return res.rows;
      },
      execute: async (sql, params) => {
        const res = await client.query(prepararQuery(sql), params);
        return res.rowCount;
      },
      insert: async (sql, params, pk = 'id') => {
        let fmtSql = prepararQuery(sql);
        if (!fmtSql.toUpperCase().includes('RETURNING')) {
          fmtSql = `${fmtSql} RETURNING ${pk}`;
        }
        const res = await client.query(fmtSql, params);
        const row = res.rows[0];
        if (!row) return null;
        return row[Object.keys(row)[0]];
      }
    };
    const resultado = await callback(tx);
    await client.query('COMMIT');
    return resultado;
  } catch (err) {
    // Reverte todas as operações caso ocorra qualquer erro
    await client.query("ROLLBACK");
    throw err;
  } finally {
    // Libera a conexão de volta para o pool
    client.release();
  }
}
