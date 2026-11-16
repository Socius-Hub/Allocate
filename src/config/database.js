/*
  OBS: Este arquivo é responsável por configurar a conexão com o banco de dados PostgreSQL 
       e fornecer funções para executar consultas, transações e inserções de forma segura e eficiente

*/

import pkg from "pg";
const { Pool } = pkg;

export const DB_CLIENT = "postgres";
export const isPostgres = true;

export const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl:
    process.env.NODE_ENV === "production"
      ? { rejectUnauthorized: false }
      : false,
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
    // Garante que o cliente é devolvido ao pool mesmo se houver erro
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

export async function insert(sql, params = [], primaryKeyName = "id") {
  const client = await pool.connect();
  try {
    let formattedSql = prepararQuery(sql);
    // Adiciona a cláusula RETURNING para obter o ID gerado, se não estiver presente
    if (!formattedSql.toUpperCase().includes("RETURNING")) {
      formattedSql = `${formattedSql} RETURNING ${primaryKeyName}`;
    }
    const result = await client.query(formattedSql, params);
    const row = result.rows[0];
    if (!row) return null;
    // Retorna o valor do ID gerado, independentemente do nome da coluna ou de maiúsculas/minúsculas
    return row[Object.keys(row)[0]];
  } finally {
    client.release();
  }
}

export async function transaction(callback) {
  const client = await pool.connect();
  try {
    await client.query("BEGIN");
    const tx = {
      query: async (sql, params) => {
        const res = await client.query(prepararQuery(sql), params);
        return res.rows;
      },
      execute: async (sql, params) => {
        const res = await client.query(prepararQuery(sql), params);
        return res.rowCount;
      },
      insert: async (sql, params, pk = "id") => {
        let fmtSql = prepararQuery(sql);
        if (!fmtSql.toUpperCase().includes("RETURNING")) {
          fmtSql = `${fmtSql} RETURNING ${pk}`;
        }
        const res = await client.query(fmtSql, params);
        const row = res.rows[0];
        if (!row) return null;
        return row[Object.keys(row)[0]];
      },
    };

    // Executa a função de callback passando o objeto de transação
    const resultado = await callback(tx);
    await client.query("COMMIT");
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
