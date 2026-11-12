import pkg from 'pg';
const { Pool } = pkg;

export const DB_CLIENT = 'postgres';
export const isPostgres = true;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
});

/**
 * Converte interrogações (?) em parâmetros posicionais do Postgres ($1, $2, $3...)
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
    await client.query('ROLLBACK');
    throw err;
  } finally {
    client.release();
  }
}