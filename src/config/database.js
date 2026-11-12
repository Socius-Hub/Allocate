import pkg from 'pg';
const { Pool } = pkg;

export const DB_CLIENT = 'postgres';
export const isPostgres = true;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

export async function query(sql, params = []) {
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