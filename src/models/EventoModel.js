import { query, insert, execute, transaction } from '../config/database.js';
import { estornarInscricoes } from './inscricaoModel.js';

export const STATUS_EVENTO = ['PLANEJAMENTO', 'ATIVO', 'CONCLUIDO', 'CANCELADO'];

const SELECT_EVENTO = `
  SELECT e.idEvento AS id_evento, e.nome, e.data_inicio, e.data_termino, e.local AS localizacao, e.capacidade,
         e.descricao, e.custo_estimado, e.status, e.idCatEvento AS id_cat_evento, c.categoria,
         u.idDepto AS id_depto, d.nomeDepto AS nome_depto,
         (SELECT COUNT(*) FROM inscricao i WHERE i.idEvento = e.idEvento AND i.status <> 'REJEITADO') AS inscritos
  FROM evento e
  JOIN categoria_evento c ON c.idCatEvento = e.idCatEvento
  LEFT JOIN inscricao i_depto ON i_depto.idEvento = e.idEvento
  LEFT JOIN usuario u ON u.idUsuario = i_depto.idUsuario
  LEFT JOIN departamento d ON d.idDepto = u.idDepto`;

function filtros({ status, id_cat_evento, data, busca, publico } = {}) {
  const where = [];
  const params = [];
  if (status) {
    where.push('e.status = ?');
    params.push(status);
  }
  if (id_cat_evento) {
    where.push('e.idCatEvento = ?');
    params.push(id_cat_evento);
  }
  if (data) {
    where.push('e.data_termino >= ?');
    params.push(`${data} 00:00:00`);
  }
  if (busca) {
    where.push('(LOWER(e.nome) LIKE ? OR LOWER(e.local) LIKE ?)');
    params.push(`%${busca.toLowerCase()}%`, `%${busca.toLowerCase()}%`);
  }
  if (publico) {
    where.push("e.status IN ('ATIVO', 'PLANEJAMENTO') AND e.data_termino >= CURRENT_TIMESTAMP");
  }
  return { sql: where.length ? ` WHERE ${where.join(' AND ')}` : '', params };
}

const valores = (d) => [
  d.nome, d.data_inicio, d.data_termino, d.localizacao, d.id_cat_evento,
  d.capacidade, d.descricao || null, d.custo_estimado, d.status || 'PLANEJAMENTO',
];

export const EventoModel = {
  async listar(f = {}, { limite = 10, offset = 0 } = {}) {
    const { sql, params } = filtros(f);
    const ordem = f.publico ? 'e.data_inicio ASC' : 'e.data_inicio DESC';
    return query(`${SELECT_EVENTO}${sql} ORDER BY ${ordem} LIMIT ? OFFSET ?`, [...params, limite, offset]);
  },

  async contar(f = {}) {
    const { sql, params } = filtros(f);
    const [r] = await query(`SELECT COUNT(*) AS total FROM evento e${sql}`, params);
    return r.total;
  },

  async contarPorStatus() {
    const rows = await query('SELECT status, COUNT(*) AS total FROM evento GROUP BY status');
    const r = { TODOS: 0 };
    for (const s of STATUS_EVENTO) r[s] = 0;
    for (const row of rows) {
      r[row.status] = row.total;
      r.TODOS += row.total;
    }
    return r;
  },

  async proximos(limite = 5) {
    return query(
      `${SELECT_EVENTO} WHERE e.data_termino >= CURRENT_TIMESTAMP AND e.status <> 'CANCELADO'
       ORDER BY e.data_inicio ASC LIMIT ?`,
      [limite]
    );
  },

  async abertosParaInscricao() {
    return query(
      `SELECT e.idEvento AS id_evento, e.nome, e.data_inicio FROM evento e
       WHERE e.status = 'ATIVO' AND e.data_termino >= CURRENT_TIMESTAMP
       ORDER BY e.data_inicio`
    );
  },

  async buscarPorId(id) {
    const rows = await query(`${SELECT_EVENTO} WHERE e.idEvento = ?`, [id]);
    return rows[0] || null;
  },

  criar: (d) =>
    insert(
      `INSERT INTO evento (nome, data_inicio, data_termino, local, idCatEvento,
                           capacidade, descricao, custo_estimado, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      valores(d),
      'idEvento'
    ),

  atualizar: (id, d) =>
    execute(
      `UPDATE evento SET nome = ?, data_inicio = ?, data_termino = ?, local = ?, idCatEvento = ?,
              capacidade = ?, descricao = ?, custo_estimado = ?, status = ?
       WHERE idEvento = ?`,
      [...valores(d), id]
    ),

  excluir: (id) =>
    transaction(async (tx) => {
      await estornarInscricoes(tx, 'id_evento', id);
      return tx.execute('DELETE FROM evento WHERE idEvento = ?', [id]);
    }),

  async totalAlocado(id) {
    const [r] = await query(
      "SELECT COALESCE(SUM(t.preco), 0) AS total FROM inscricao i JOIN tier_inscricao t ON t.idTier = i.idTier WHERE i.idEvento = ? AND i.status IN ('APROVADO', 'PAGO')",
      [id]
    );
    return r.total;
  },
};

export const STATUS_TIER = ['ATIVO', 'RASCUNHO', 'ENCERRADO'];

const SELECT_TIER = `
  SELECT t.idTier AS id_tier, t.nome, t.descricao, t.preco, t.capacidade, t.status, t.idEvento AS id_evento, t.prazo,
         (SELECT COUNT(*) FROM inscricao i WHERE i.idTier = t.idTier AND i.status <> 'REJEITADO') AS inscritos
  FROM tier_inscricao t`;

export const TierModel = {
  listarPorEvento: (idEvento) => query(`${SELECT_TIER} WHERE t.idEvento = ? ORDER BY t.preco DESC, t.nome`, [idEvento]),

  listarDisponiveis: (idEvento) =>
    query(
      `${SELECT_TIER} WHERE t.idEvento = ? AND t.status = 'ATIVO'
       AND (t.prazo IS NULL OR t.prazo >= CURRENT_DATE) ORDER BY t.preco`,
      [idEvento]
    ),

  async buscarPorId(id) {
    const rows = await query(`${SELECT_TIER} WHERE t.idTier = ?`, [id]);
    return rows[0] || null;
  },

  criar: (d) =>
    insert(
      `INSERT INTO tier_inscricao (idEvento, nome, descricao, preco, capacidade, prazo, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [d.id_evento, d.nome, d.descricao || null, d.preco, d.capacidade, d.prazo || null, d.status],
      'idTier'
    ),

  atualizar: (id, d) =>
    execute(
      `UPDATE tier_inscricao SET nome = ?, descricao = ?, preco = ?, capacidade = ?, prazo = ?, status = ?
       WHERE idTier = ?`,
      [d.nome, d.descricao || null, d.preco, d.capacidade, d.prazo || null, d.status, id]
    ),

  excluir: (id) => execute('DELETE FROM tier_inscricao WHERE idTier = ?', [id]),
};