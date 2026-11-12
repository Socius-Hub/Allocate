import pkg from 'pg';
const { Pool } = pkg;

export const DB_CLIENT = 'postgres';

// O Render fornece a DATABASE_URL pronta para uso
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

export async function query(sql, params = []) {
  // Nota: Se preferir manter os parâmetros com '?', 
  // o Postgres usa '$1, $2'. Caso queira uma conversão automática simples 
  // ou se já usar os placeholders corretos, ajuste aqui.
  const client = await pool.connect();
  try {
    const result = await client.query(sql, params);
    return result.rows;
  } finally {
    client.release();
  }
}

export async function execute(sql, params = []) {
  const client = await pool.connect();
  try {
    const result = await client.query(sql, params);
    return result.rowCount;
  } finally {
    client.release();
  }
}

export async function insert(sql, params = [], primaryKeyName = 'id') {
  const client = await pool.connect();
  try {
    // Adiciona RETURNING id para retornar o ID inserido no Postgres
    const querySql = `${sql} RETURNING ${primaryKeyName}`;
    const result = await client.query(querySql, params);
    return result.rows[0][primaryKeyName];
  } finally {
    client.release();
  }
}

export async function transaction(callback) {
  const client = await pool.connect();
  try {
    await client.query('BEGIN');
    const tx = {
      query: (sql, params) => client.query(sql, params).then(r => r.rows),
      execute: (sql, params) => client.query(sql, params).then(r => r.rowCount),
      insert: async (sql, params, pk = 'id') => {
        const res = await client.query(`${sql} RETURNING ${pk}`, params);
        return res.rows[0][pk];
      }
    };
    const resultado = await callback(tx);
    await client.query('COMMIT');
    return resultado;
  } catch (err) {
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}