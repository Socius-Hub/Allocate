import { query, execute, transaction } from '../config/database.js';

export const STATUS_INSCRICAO = ['SOLICITADO', 'APROVADO', 'PAGO', 'REJEITADO'];

/** Status que consomem orçamento do departamento. */
const CONSOME_ORCAMENTO = ['APROVADO', 'PAGO'];

const SELECT_INSCRICAO = `
  SELECT i.idInscricao AS id_inscricao, i.status, t.preco AS valor, i.data_inscricao,
         i.idEvento AS id_evento, e.nome AS evento, e.data_inicio, e.data_termino, e.local AS localizacao,
         i.idTier AS id_tier, t.nome AS tier,
         i.idUsuario AS id_usuario, u.nomeCompleto AS nome_completo, u.idDepto AS id_depto, d.nomeDepto AS nome_depto
  FROM inscricao i
  JOIN evento e         ON e.idEvento  = i.idEvento
  JOIN tier_inscricao t ON t.idTier    = i.idTier
  JOIN usuario u        ON u.idUsuario = i.idUsuario
  JOIN departamento d   ON d.idDepto   = u.idDepto`;

function filtros({ status, id_usuario, id_evento } = {}) {
  const where = [];
  const params = [];
  if (status) {
    where.push('i.status = ?');
    params.push(status);
  }
  if (id_usuario) {
    where.push('i.idUsuario = ?');
    params.push(id_usuario);
  }
  if (id_evento) {
    where.push('i.idEvento = ?');
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
     WHERE idDepto = ? AND idCiclo IN (SELECT idCiclo FROM ciclo_orcamento WHERE status = 'ATIVO')`,
    [delta, idDepto]
  );
}

/**
 * Estorna do orçamento as inscrições aprovadas/pagas que serão apagadas em cascata.
 */
export async function estornarInscricoes(tx, campo, id) {
  const coluna = campo === 'id_evento' ? 'i.idEvento' : 'i.idUsuario';
  const rows = await tx.query(
    `SELECT t.preco AS valor, u.idDepto AS id_depto FROM inscricao i 
     JOIN tier_inscricao t ON t.idTier = i.idTier
     JOIN usuario u ON u.idUsuario = i.idUsuario
     WHERE ${coluna} = ? AND i.status IN ('APROVADO', 'PAGO')`,
    [id]
  );
  for (const r of rows) await ajustarOrcamento(tx, r.id_depto, -r.valor);
}

export const InscricaoModel = {
  async listar(f = {}, { limite = 10, offset = 0 } = {}) {
    const { sql, params } = filtros(f);
    return query(`${SELECT_INSCRICAO}${sql} ORDER BY i.data_inscricao DESC, i.idInscricao DESC LIMIT ? OFFSET ?`, [
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

  async contarPorStatus(idUsuario = null) {
    const rows = idUsuario
      ? await query('SELECT status, COUNT(*) AS total FROM inscricao WHERE idUsuario = ? GROUP BY status', [idUsuario])
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
    const [r] = await query("SELECT COALESCE(SUM(t.preco), 0) AS total FROM inscricao i JOIN tier_inscricao t ON t.idTier = i.idTier WHERE i.status = 'SOLICITADO'");
    return r.total;
  },

  listarPorEvento: (idEvento) => query(`${SELECT_INSCRICAO} WHERE i.idEvento = ? ORDER BY u.nomeCompleto`, [idEvento]),

  listarPorUsuario: (idUsuario) =>
    query(`${SELECT_INSCRICAO} WHERE i.idUsuario = ? ORDER BY e.data_inicio DESC`, [idUsuario]),

  async buscarPorId(id) {
    const rows = await query(`${SELECT_INSCRICAO} WHERE i.idInscricao = ?`, [id]);
    return rows[0] || null;
  },

  /**
   * Cria a inscrição validando as regras de negócio e capacidades.
   */
  async criar({ id_evento, id_usuario, id_tier }) {
    return transaction(async (tx) => {
      const [evento] = await tx.query(
        'SELECT idEvento AS id_evento, capacidade, status, data_termino FROM evento WHERE idEvento = ?',
        [id_evento]
      );
      if (!evento) throw erroRegra('Evento não encontrado.');
      if (evento.status !== 'ATIVO') throw erroRegra('Este evento não está aberto para inscrições.');

      const [tier] = await tx.query(
        `SELECT idTier AS id_tier, preco, capacidade, status, idEvento AS id_evento,
                CASE WHEN prazo IS NOT NULL AND prazo < CURRENT_DATE THEN 1 ELSE 0 END AS vencido
         FROM tier_inscricao WHERE idTier = ?`,
        [id_tier]
      );
      if (!tier || tier.id_evento !== Number(id_evento)) throw erroRegra('Selecione um tier válido para este evento.');
      if (tier.status !== 'ATIVO' || Number(tier.vencido) === 1) throw erroRegra('O prazo deste tier de inscrição está encerrado.');

      const [jaInscrito] = await tx.query('SELECT idInscricao FROM inscricao WHERE idEvento = ? AND idUsuario = ?', [
        id_evento,
        id_usuario,
      ]);
      if (jaInscrito) throw erroRegra('Este colaborador já possui inscrição neste evento.');

      const [{ total: totalEvento }] = await tx.query(
        "SELECT COUNT(*) AS total FROM inscricao WHERE idEvento = ? AND status <> 'REJEITADO'",
        [id_evento]
      );
      if (totalEvento >= evento.capacidade) throw erroRegra('A capacidade máxima deste evento foi esgotada.');

      const [{ total: totalTier }] = await tx.query(
        "SELECT COUNT(*) AS total FROM inscricao WHERE idTier = ? AND status <> 'REJEITADO'",
        [id_tier]
      );
      if (totalTier >= tier.capacidade) throw erroRegra('As vagas deste tier de inscrição estão esgotadas.');

      return tx.insert(
        `INSERT INTO inscricao (idEvento, idUsuario, idTier, status)
         VALUES (?, ?, ?, 'SOLICITADO')`,
        [id_evento, id_usuario, id_tier],
        'idInscricao'
      );
    });
  },

  /**
   * Altera o status e mantém o orçamento do departamento sincronizado.
   */
  async alterarStatus(id, novoStatus) {
    return transaction(async (tx) => {
      const [insc] = await tx.query(
        `SELECT i.status, t.preco AS valor, u.idDepto AS id_depto FROM inscricao i
         JOIN tier_inscricao t ON t.idTier = i.idTier
         JOIN usuario u ON u.idUsuario = i.idUsuario WHERE i.idInscricao = ?`,
        [id]
      );
      if (!insc) return false;

      const antes = CONSOME_ORCAMENTO.includes(insc.status);
      const depois = CONSOME_ORCAMENTO.includes(novoStatus);
      if (!antes && depois) await ajustarOrcamento(tx, insc.id_depto, insc.valor);
      if (antes && !depois) await ajustarOrcamento(tx, insc.id_depto, -insc.valor);

      await tx.execute(
        'UPDATE inscricao SET status = ? WHERE idInscricao = ?',
        [novoStatus, id]
      );
      return true;
    });
  },

  async excluir(id) {
    return transaction(async (tx) => {
      const [insc] = await tx.query(
        `SELECT i.status, t.preco AS valor, u.idDepto AS id_depto FROM inscricao i
         JOIN tier_inscricao t ON t.idTier = i.idTier
         JOIN usuario u ON u.idUsuario = i.idUsuario WHERE i.idInscricao = ?`,
        [id]
      );
      if (!insc) return false;
      if (CONSOME_ORCAMENTO.includes(insc.status)) await ajustarOrcamento(tx, insc.id_depto, -insc.valor);
      await tx.execute('DELETE FROM inscricao WHERE idInscricao = ?', [id]);
      return true;
    });
  },
};