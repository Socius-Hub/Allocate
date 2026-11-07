import { query, execute, transaction } from '../config/database.js';

export const STATUS_INSCRICAO = ['SOLICITADO', 'APROVADO', 'PAGO', 'REJEITADO'];

/** Status que consomem orçamento do departamento. */
const CONSOME_ORCAMENTO = ['APROVADO', 'PAGO'];

const SELECT_INSCRICAO = `
  SELECT i.id_inscricao, i.status, i.valor, i.justificativa, i.comentario_revisao, i.data_inscricao,
         i.id_evento, e.nome AS evento, e.data_inicio, e.data_termino, e.localizacao,
         i.id_tier, t.nome AS tier,
         i.id_usuario, u.nome_completo, u.cargo, u.id_depto, d.nome_depto
  FROM inscricao i
  JOIN evento e         ON e.id_evento  = i.id_evento
  JOIN tier_inscricao t ON t.id_tier    = i.id_tier
  JOIN usuario u        ON u.id_usuario = i.id_usuario
  JOIN departamento d   ON d.id_depto   = u.id_depto`;

function filtros({ status, id_usuario, id_evento } = {}) {
  const where = [];
  const params = [];
  if (status) {
    where.push('i.status = ?');
    params.push(status);
  }
  if (id_usuario) {
    where.push('i.id_usuario = ?');
    params.push(id_usuario);
  }
  if (id_evento) {
    where.push('i.id_evento = ?');
    params.push(id_evento);
  }
  return { sql: where.length ? ` WHERE ${where.join(' AND ')}` : '', params };
}

function erroRegra(mensagem) {
  const e = new Error(mensagem);
  e.tipo = 'REGRA';
  return e;
}

/** Soma (ou subtrai) um valor do orçamento do departamento no ciclo ATIVO. */
async function ajustarOrcamento(tx, idDepto, delta) {
  if (!delta) return;
  await tx.execute(
    `UPDATE orcamento_departamento SET utilizado = GREATEST(utilizado + ?, 0)
     WHERE id_depto = ? AND id_ciclo IN (SELECT id_ciclo FROM ciclo_orcamento WHERE status = 'ATIVO')`,
    [delta, idDepto]
  );
}

/**
 * Estorna do orçamento as inscrições aprovadas/pagas que serão apagadas em cascata
 * (ao excluir um evento ou um usuário). Deve rodar dentro de uma transação.
 * @param campo 'id_evento' | 'id_usuario'
 */
export async function estornarInscricoes(tx, campo, id) {
  const coluna = campo === 'id_evento' ? 'i.id_evento' : 'i.id_usuario';
  const rows = await tx.query(
    `SELECT i.valor, u.id_depto FROM inscricao i JOIN usuario u ON u.id_usuario = i.id_usuario
     WHERE ${coluna} = ? AND i.status IN ('APROVADO', 'PAGO')`,
    [id]
  );
  for (const r of rows) await ajustarOrcamento(tx, r.id_depto, -r.valor);
}

export const InscricaoModel = {
  async listar(f = {}, { limite = 10, offset = 0 } = {}) {
    const { sql, params } = filtros(f);
    return query(`${SELECT_INSCRICAO}${sql} ORDER BY i.data_inscricao DESC, i.id_inscricao DESC LIMIT ? OFFSET ?`, [
      ...params,
      limite,
      offset,
    ]);
  },

  async contar(f = {}) {
    const { sql, params } = filtros(f);
    const [r] = await query(`SELECT COUNT(*) AS total FROM inscricao i${sql}`, params);
    return r.total;
  },

  /** { TODOS, SOLICITADO, APROVADO, PAGO, REJEITADO } (opcionalmente de um usuário) */
  async contarPorStatus(idUsuario = null) {
    const rows = idUsuario
      ? await query('SELECT status, COUNT(*) AS total FROM inscricao WHERE id_usuario = ? GROUP BY status', [idUsuario])
      : await query('SELECT status, COUNT(*) AS total FROM inscricao GROUP BY status');
    const r = { TODOS: 0 };
    for (const s of STATUS_INSCRICAO) r[s] = 0;
    for (const row of rows) {
      r[row.status] = row.total;
      r.TODOS += row.total;
    }
    return r;
  },

  async totalSolicitado() {
    const [r] = await query("SELECT COALESCE(SUM(valor), 0) AS total FROM inscricao WHERE status = 'SOLICITADO'");
    return r.total;
  },

  listarPorEvento: (idEvento) => query(`${SELECT_INSCRICAO} WHERE i.id_evento = ? ORDER BY u.nome_completo`, [idEvento]),

  listarPorUsuario: (idUsuario) =>
    query(`${SELECT_INSCRICAO} WHERE i.id_usuario = ? ORDER BY e.data_inicio DESC`, [idUsuario]),

  async buscarPorId(id) {
    const rows = await query(`${SELECT_INSCRICAO} WHERE i.id_inscricao = ?`, [id]);
    return rows[0] || null;
  },

  /**
   * Cria a inscrição validando as regras de negócio
   * (o trigger do banco faz a mesma checagem de capacidade como segurança extra).
   */
  async criar({ id_evento, id_usuario, id_tier, justificativa }) {
    return transaction(async (tx) => {
      const [evento] = await tx.query(
        'SELECT id_evento, capacidade, status, data_termino FROM evento WHERE id_evento = ?',
        [id_evento]
      );
      if (!evento) throw erroRegra('Evento não encontrado.');
      if (evento.status !== 'ATIVO') throw erroRegra('Este evento não está aberto para inscrições.');

      const [tier] = await tx.query(
        `SELECT id_tier, preco, capacidade, status, id_evento,
                CASE WHEN prazo IS NOT NULL AND prazo < CURRENT_DATE THEN 1 ELSE 0 END AS vencido
         FROM tier_inscricao WHERE id_tier = ?`,
        [id_tier]
      );
      if (!tier || tier.id_evento !== Number(id_evento)) throw erroRegra('Selecione um tier válido para este evento.');
      if (tier.status !== 'ATIVO' || Number(tier.vencido) === 1) throw erroRegra('O prazo deste tier de inscrição está encerrado.');

      const [jaInscrito] = await tx.query('SELECT id_inscricao FROM inscricao WHERE id_evento = ? AND id_usuario = ?', [
        id_evento,
        id_usuario,
      ]);
      if (jaInscrito) throw erroRegra('Este colaborador já possui inscrição neste evento.');

      const [{ total: totalEvento }] = await tx.query(
        "SELECT COUNT(*) AS total FROM inscricao WHERE id_evento = ? AND status <> 'REJEITADO'",
        [id_evento]
      );
      if (totalEvento >= evento.capacidade) throw erroRegra('A capacidade máxima deste evento foi esgotada.');

      const [{ total: totalTier }] = await tx.query(
        "SELECT COUNT(*) AS total FROM inscricao WHERE id_tier = ? AND status <> 'REJEITADO'",
        [id_tier]
      );
      if (totalTier >= tier.capacidade) throw erroRegra('As vagas deste tier de inscrição estão esgotadas.');

      return tx.insert(
        `INSERT INTO inscricao (id_evento, id_usuario, id_tier, valor, status, justificativa)
         VALUES (?, ?, ?, ?, 'SOLICITADO', ?)`,
        [id_evento, id_usuario, id_tier, tier.preco, justificativa || null],
        'id_inscricao'
      );
    });
  },

  /**
   * Muda o status e mantém o orçamento do departamento coerente:
   * ao aprovar, o valor é debitado; ao rejeitar/voltar, é estornado.
   */
  async alterarStatus(id, novoStatus, comentario = null) {
    return transaction(async (tx) => {
      const [insc] = await tx.query(
        `SELECT i.status, i.valor, u.id_depto FROM inscricao i
         JOIN usuario u ON u.id_usuario = i.id_usuario WHERE i.id_inscricao = ?`,
        [id]
      );
      if (!insc) return false;

      const antes = CONSOME_ORCAMENTO.includes(insc.status);
      const depois = CONSOME_ORCAMENTO.includes(novoStatus);
      if (!antes && depois) await ajustarOrcamento(tx, insc.id_depto, insc.valor);
      if (antes && !depois) await ajustarOrcamento(tx, insc.id_depto, -insc.valor);

      await tx.execute(
        'UPDATE inscricao SET status = ?, comentario_revisao = COALESCE(?, comentario_revisao) WHERE id_inscricao = ?',
        [novoStatus, comentario || null, id]
      );
      return true;
    });
  },

  async excluir(id) {
    return transaction(async (tx) => {
      const [insc] = await tx.query(
        `SELECT i.status, i.valor, u.id_depto FROM inscricao i
         JOIN usuario u ON u.id_usuario = i.id_usuario WHERE i.id_inscricao = ?`,
        [id]
      );
      if (!insc) return false;
      if (CONSOME_ORCAMENTO.includes(insc.status)) await ajustarOrcamento(tx, insc.id_depto, -insc.valor);
      await tx.execute('DELETE FROM inscricao WHERE id_inscricao = ?', [id]);
      return true;
    });
  },
};
