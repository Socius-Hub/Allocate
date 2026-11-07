import { query, insert, execute, transaction } from '../config/database.js';
import { estornarInscricoes } from './InscricaoModel.js';

export const STATUS_EVENTO = ['PLANEJAMENTO', 'ATIVO', 'CONCLUIDO', 'CANCELADO'];

const SELECT_EVENTO = `
  SELECT e.id_evento, e.nome, e.data_inicio, e.data_termino, e.localizacao, e.capacidade,
         e.descricao, e.custo_estimado, e.status, e.id_cat_evento, c.categoria,
         e.id_depto, d.nome_depto,
         (SELECT COUNT(*) FROM inscricao i WHERE i.id_evento = e.id_evento AND i.status <> 'REJEITADO') AS inscritos
  FROM evento e
  JOIN categoria_evento c ON c.id_cat_evento = e.id_cat_evento
  LEFT JOIN departamento d ON d.id_depto = e.id_depto`;

function filtros({ status, id_cat_evento, data, busca, publico } = {}) {
  const where = [];
  const params = [];
  if (status) {
    where.push('e.status = ?');
    params.push(status);
  }
  if (id_cat_evento) {
    where.push('e.id_cat_evento = ?');
    params.push(id_cat_evento);
  }
  if (data) {
    // eventos que acontecem a partir da data escolhida
    where.push('e.data_termino >= ?');
    params.push(`${data} 00:00:00`);
  }
  if (busca) {
    where.push('(LOWER(e.nome) LIKE ? OR LOWER(e.localizacao) LIKE ?)');
    params.push(`%${busca.toLowerCase()}%`, `%${busca.toLowerCase()}%`);
  }
  if (publico) {
    where.push("e.status IN ('ATIVO', 'PLANEJAMENTO') AND e.data_termino >= CURRENT_TIMESTAMP");
  }
  return { sql: where.length ? ` WHERE ${where.join(' AND ')}` : '', params };
}

const valores = (d) => [
  d.nome, d.data_inicio, d.data_termino, d.localizacao, d.id_cat_evento,
  d.id_depto || null, d.capacidade, d.descricao || null, d.custo_estimado, d.status,
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

  /** { TODOS: n, ATIVO: n, PLANEJAMENTO: n, ... } */
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

  /** Eventos que aceitam inscrições (ativos e ainda não encerrados). */
  async abertosParaInscricao() {
    return query(
      `SELECT e.id_evento, e.nome, e.data_inicio FROM evento e
       WHERE e.status = 'ATIVO' AND e.data_termino >= CURRENT_TIMESTAMP
       ORDER BY e.data_inicio`
    );
  },

  async buscarPorId(id) {
    const rows = await query(`${SELECT_EVENTO} WHERE e.id_evento = ?`, [id]);
    return rows[0] || null;
  },

  criar: (d) =>
    insert(
      `INSERT INTO evento (nome, data_inicio, data_termino, localizacao, id_cat_evento, id_depto,
                           capacidade, descricao, custo_estimado, status)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      valores(d),
      'id_evento'
    ),

  atualizar: (id, d) =>
    execute(
      `UPDATE evento SET nome = ?, data_inicio = ?, data_termino = ?, localizacao = ?, id_cat_evento = ?,
              id_depto = ?, capacidade = ?, descricao = ?, custo_estimado = ?, status = ?
       WHERE id_evento = ?`,
      [...valores(d), id]
    ),

  /** Tiers e inscrições do evento são removidos junto (ON DELETE CASCADE), com estorno do orçamento. */
  excluir: (id) =>
    transaction(async (tx) => {
      await estornarInscricoes(tx, 'id_evento', id);
      return tx.execute('DELETE FROM evento WHERE id_evento = ?', [id]);
    }),

  /** Soma dos valores das inscrições aprovadas/pagas (quanto do orçamento já foi alocado). */
  async totalAlocado(id) {
    const [r] = await query(
      "SELECT COALESCE(SUM(valor), 0) AS total FROM inscricao WHERE id_evento = ? AND status IN ('APROVADO', 'PAGO')",
      [id]
    );
    return r.total;
  },
};

export const STATUS_TIER = ['ATIVO', 'RASCUNHO', 'ENCERRADO'];

const SELECT_TIER = `
  SELECT t.*, (SELECT COUNT(*) FROM inscricao i WHERE i.id_tier = t.id_tier AND i.status <> 'REJEITADO') AS inscritos
  FROM tier_inscricao t`;

export const TierModel = {
  listarPorEvento: (idEvento) => query(`${SELECT_TIER} WHERE t.id_evento = ? ORDER BY t.preco DESC, t.nome`, [idEvento]),

  /** Tiers que aceitam inscrição: ativos e dentro do prazo. */
  listarDisponiveis: (idEvento) =>
    query(
      `${SELECT_TIER} WHERE t.id_evento = ? AND t.status = 'ATIVO'
       AND (t.prazo IS NULL OR t.prazo >= CURRENT_DATE) ORDER BY t.preco`,
      [idEvento]
    ),

  async buscarPorId(id) {
    const rows = await query(`${SELECT_TIER} WHERE t.id_tier = ?`, [id]);
    return rows[0] || null;
  },

  criar: (d) =>
    insert(
      `INSERT INTO tier_inscricao (id_evento, nome, descricao, preco, capacidade, prazo, status)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [d.id_evento, d.nome, d.descricao || null, d.preco, d.capacidade, d.prazo || null, d.status],
      'id_tier'
    ),

  atualizar: (id, d) =>
    execute(
      `UPDATE tier_inscricao SET nome = ?, descricao = ?, preco = ?, capacidade = ?, prazo = ?, status = ?
       WHERE id_tier = ?`,
      [d.nome, d.descricao || null, d.preco, d.capacidade, d.prazo || null, d.status, id]
    ),

  excluir: (id) => execute('DELETE FROM tier_inscricao WHERE id_tier = ?', [id]),
};
