import { query, insert, execute } from '../config/database.js';

export const STATUS_CICLO = ['PLANEJAMENTO', 'ATIVO', 'FECHADO'];
export const STATUS_CENARIO = ['RASCUNHO', 'APROVADO', 'REJEITADO'];

/* ------------------------------------------------------------------ */
/* Ciclos orçamentários (ex: Q4 2026)                                  */
/* ------------------------------------------------------------------ */
export const CicloModel = {
  listar: () =>
    query(
      `SELECT c.*, (SELECT COUNT(*) FROM orcamento_departamento o WHERE o.id_ciclo = c.id_ciclo) AS total_departamentos
       FROM ciclo_orcamento c ORDER BY c.id_ciclo DESC`
    ),

  async buscarPorId(id) {
    const [r] = await query('SELECT * FROM ciclo_orcamento WHERE id_ciclo = ?', [id]);
    return r || null;
  },

  async ativo() {
    const [r] = await query("SELECT * FROM ciclo_orcamento WHERE status = 'ATIVO' ORDER BY id_ciclo DESC LIMIT 1");
    return r || null;
  },

  criar: (d) =>
    insert('INSERT INTO ciclo_orcamento (nome, limite_total, status) VALUES (?, ?, ?)', [d.nome, d.limite_total, d.status], 'id_ciclo'),

  atualizar: (id, d) =>
    execute('UPDATE ciclo_orcamento SET nome = ?, limite_total = ?, status = ? WHERE id_ciclo = ?', [
      d.nome,
      d.limite_total,
      d.status,
      id,
    ]),

  excluir: (id) => execute('DELETE FROM ciclo_orcamento WHERE id_ciclo = ?', [id]),
};

/* ------------------------------------------------------------------ */
/* Orçamento de cada departamento dentro de um ciclo                    */
/* ------------------------------------------------------------------ */
export const OrcamentoModel = {
  /** Usa a VIEW vw_orcamento_departamentos (calcula disponível, % e alerta). */
  listarPorCiclo: (idCiclo) =>
    query('SELECT * FROM vw_orcamento_departamentos WHERE id_ciclo = ? ORDER BY percentual_utilizado DESC', [idCiclo]),

  async resumo(idCiclo) {
    const [r] = await query(
      `SELECT COALESCE(SUM(limite), 0) AS limite, COALESCE(SUM(utilizado), 0) AS utilizado
       FROM orcamento_departamento WHERE id_ciclo = ?`,
      [idCiclo]
    );
    return { limite: r.limite, utilizado: r.utilizado, disponivel: r.limite - r.utilizado };
  },

  /** Orçamento do departamento no ciclo ativo (usado na tela de aprovação). */
  async doDepartamentoNoCicloAtivo(idDepto) {
    const [r] = await query(
      `SELECT o.*, c.nome AS ciclo FROM orcamento_departamento o
       JOIN ciclo_orcamento c ON c.id_ciclo = o.id_ciclo
       WHERE o.id_depto = ? AND c.status = 'ATIVO' ORDER BY c.id_ciclo DESC LIMIT 1`,
      [idDepto]
    );
    return r || null;
  },

  async buscarPorId(id) {
    const [r] = await query('SELECT * FROM orcamento_departamento WHERE id_orcamento_depto = ?', [id]);
    return r || null;
  },

  criar: (d) =>
    insert(
      'INSERT INTO orcamento_departamento (id_depto, id_ciclo, id_usuario, limite, utilizado) VALUES (?, ?, ?, ?, ?)',
      [d.id_depto, d.id_ciclo, d.id_usuario || null, d.limite, d.utilizado || 0],
      'id_orcamento_depto'
    ),

  atualizar: (id, d) =>
    execute('UPDATE orcamento_departamento SET id_usuario = ?, limite = ?, utilizado = ? WHERE id_orcamento_depto = ?', [
      d.id_usuario || null,
      d.limite,
      d.utilizado || 0,
      id,
    ]),

  excluir: (id) => execute('DELETE FROM orcamento_departamento WHERE id_orcamento_depto = ?', [id]),
};

/* ------------------------------------------------------------------ */
/* Simulador: cenários e seus itens                                     */
/* ------------------------------------------------------------------ */
const SELECT_CENARIO = `
  SELECT ce.*, ci.nome AS ciclo, ci.limite_total,
         COALESCE((SELECT SUM(it.quantidade * it.custo_mensal_est) FROM item_cenario_orcamento it
                   WHERE it.id_cenario = ce.id_cenario), 0) AS custo_adicional
  FROM cenario_orcamento ce
  JOIN ciclo_orcamento ci ON ci.id_ciclo = ce.id_ciclo`;

export const CenarioModel = {
  listar: () => query(`${SELECT_CENARIO} ORDER BY ce.criado_em DESC, ce.id_cenario DESC`),

  async buscarPorId(id) {
    const rows = await query(`${SELECT_CENARIO} WHERE ce.id_cenario = ?`, [id]);
    return rows[0] || null;
  },

  itens: (idCenario) =>
    query('SELECT * FROM item_cenario_orcamento WHERE id_cenario = ? ORDER BY id_item_cenario', [idCenario]),

  criar: (d) =>
    insert(
      'INSERT INTO cenario_orcamento (nome_cenario, id_ciclo, custo_base, status) VALUES (?, ?, ?, ?)',
      [d.nome_cenario, d.id_ciclo, d.custo_base, 'RASCUNHO'],
      'id_cenario'
    ),

  atualizarStatus: (id, status) => execute('UPDATE cenario_orcamento SET status = ? WHERE id_cenario = ?', [status, id]),

  excluir: (id) => execute('DELETE FROM cenario_orcamento WHERE id_cenario = ?', [id]),

  adicionarItem: (idCenario, d) =>
    insert(
      `INSERT INTO item_cenario_orcamento (id_cenario, funcao, tier_nivel, quantidade, custo_mensal_est, inicio_previsto)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [idCenario, d.funcao, d.tier_nivel, d.quantidade, d.custo_mensal_est, d.inicio_previsto || null],
      'id_item_cenario'
    ),

  async buscarItem(idItem) {
    const [r] = await query('SELECT * FROM item_cenario_orcamento WHERE id_item_cenario = ?', [idItem]);
    return r || null;
  },

  removerItem: (idItem) => execute('DELETE FROM item_cenario_orcamento WHERE id_item_cenario = ?', [idItem]),
};
