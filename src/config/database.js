import pkg from 'pg';
const { Pool } = pkg;

export const DB_CLIENT = 'postgres';
export const isPostgres = true;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

/**
 * Converte interrogações (?) em parâmetros posisionais do Postgres ($1, $2, $3...)
 */
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
    const formattedSql = prepararQuery(sql);
    const result = await client.query(formattedSql, params);
    return result.rowCount;
  } finally {
    client.release();
  }
}

export async function insert(sql, params = [], primaryKeyName = 'id') {
  const client = await pool.connect();
  try {
    let formattedSql = prepararQuery(sql);
    // Adiciona RETURNING no final para capturar o ID gerado pelo Postgres
    if (!formattedSql.toUpperCase().includes('RETURNING')) {
      formattedSql = `${formattedSql} RETURNING ${primaryKeyName}`;
    }
    const result = await client.query(formattedSql, params);
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