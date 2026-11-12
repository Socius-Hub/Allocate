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
    // Retorna o valor da primeira coluna retornada pelo PostgreSQL, independentemente do casing
    return row[Object.keys(row)[0]];
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
        return row[Object.keys(row)[0]]; // Captura dinâmica do ID
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