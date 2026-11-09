import { query, insert, execute } from '../config/database.js';

export const STATUS_CICLO = ['PLANEJAMENTO', 'ATIVO', 'FECHADO'];
export const STATUS_CENARIO = ['RASCUNHO', 'APROVADO', 'REJEITADO'];

export const CicloModel = {
  listar: () =>
    query(
      `SELECT c.idCiclo AS id_ciclo, c.nome, c.limite_total, c.status, 
              (SELECT COUNT(*) FROM orcamento_departamento o WHERE o.idCiclo = c.idCiclo) AS total_departamentos
       FROM ciclo_orcamento c ORDER BY c.idCiclo DESC`
    ),

  async buscarPorId(id) {
    const [r] = await query('SELECT idCiclo AS id_ciclo, nome, limite_total, status FROM ciclo_orcamento WHERE idCiclo = ?', [id]);
    return r || null;
  },

  async ativo() {
    const [r] = await query("SELECT idCiclo AS id_ciclo, nome, limite_total, status FROM ciclo_orcamento WHERE status = 'ATIVO' ORDER BY idCiclo DESC LIMIT 1");
    return r || null;
  },

  criar: (d) =>
    insert('INSERT INTO ciclo_orcamento (nome, limite_total, status) VALUES (?, ?, ?)', [d.nome, d.limite_total, d.status], 'idCiclo'),

  atualizar: (id, d) =>
    execute('UPDATE ciclo_orcamento SET nome = ?, limite_total = ?, status = ? WHERE idCiclo = ?', [
      d.nome,
      d.limite_total,
      d.status,
      id,
    ]),

  excluir: (id) => execute('DELETE FROM ciclo_orcamento WHERE idCiclo = ?', [id]),
};

export const OrcamentoModel = {
  listarPorCiclo: (idCiclo) =>
    query(`SELECT o.idOrcamentoDepto AS id_orcamento_depto, o.idDepto AS id_depto, o.idCiclo AS id_ciclo,
                  o.idUsuario AS id_usuario, o.limite, o.utilizado,
                  (o.limite - o.utilizado) AS disponivel,
                  ROUND((o.utilizado / o.limite) * 100, 2) AS percentual_utilizado,
                  d.nomeDepto AS departamento, u.nomeCompleto AS lider,
                  CASE 
                    WHEN o.utilizado > o.limite THEN 'CRITICO'
                    WHEN (o.utilizado / o.limite) >= 0.85 THEN 'ATENCAO'
                    ELSE 'NORMAL'
                  END AS status_alerta
           FROM orcamento_departamento o
           JOIN departamento d ON d.idDepto = o.idDepto
           LEFT JOIN usuario u ON u.idUsuario = o.idUsuario
           WHERE o.idCiclo = ? ORDER BY percentual_utilizado DESC`, [idCiclo]),

  async resumo(idCiclo) {
    const [r] = await query(
      `SELECT COALESCE(SUM(limite), 0) AS limite, COALESCE(SUM(utilizado), 0) AS utilizado
       FROM orcamento_departamento WHERE idCiclo = ?`,
      [idCiclo]
    );
    return { limite: r.limite, utilizado: r.utilizado, disponivel: r.limite - r.utilizado };
  },

  async doDepartamentoNoCicloAtivo(idDepto) {
    const [r] = await query(
      `SELECT o.idOrcamentoDepto AS id_orcamento_depto, o.idDepto AS id_depto, o.idCiclo AS id_ciclo,
              o.idUsuario AS id_usuario, o.limite, o.utilizado, c.nome AS ciclo 
       FROM orcamento_departamento o
       JOIN ciclo_orcamento c ON c.idCiclo = o.idCiclo
       WHERE o.idDepto = ? AND c.status = 'ATIVO' ORDER BY c.idCiclo DESC LIMIT 1`,
      [idDepto]
    );
    return r || null;
  },

  async buscarPorId(id) {
    const [r] = await query('SELECT idOrcamentoDepto AS id_orcamento_depto, idDepto AS id_depto, idCiclo AS id_ciclo, idUsuario AS id_usuario, limite, utilizado FROM orcamento_departamento WHERE idOrcamentoDepto = ?', [id]);
    return r || null;
  },

  criar: (d) =>
    insert(
      'INSERT INTO orcamento_departamento (idDepto, idCiclo, idUsuario, limite, utilizado) VALUES (?, ?, ?, ?, ?)',
      [d.id_depto, d.id_ciclo, d.id_usuario || null, d.limite, d.utilizado || 0],
      'idOrcamentoDepto'
    ),

  atualizar: (id, d) =>
    execute('UPDATE orcamento_departamento SET idUsuario = ?, limite = ?, utilizado = ? WHERE idOrcamentoDepto = ?', [
      d.id_usuario || null,
      d.limite,
      d.utilizado || 0,
      id,
    ]),

  excluir: (id) => execute('DELETE FROM orcamento_departamento WHERE idOrcamentoDepto = ?', [id]),
};

const SELECT_CENARIO = `
  SELECT ce.idCenario AS id_cenario, ce.nome_cenario, ce.idCiclo AS id_ciclo, ce.custo_base, 
         ce.novo_custo_projetado, ce.status, ce.criado_em, ci.nome AS ciclo, ci.limite_total,
         COALESCE((SELECT SUM(it.quantidade * it.custo_mensal_est) FROM item_cenario_orcamento it
                   WHERE it.idCenario = ce.idCenario), 0) AS custo_adicional
  FROM cenario_orcamento ce
  JOIN ciclo_orcamento ci ON ci.idCiclo = ce.idCiclo`;

export const CenarioModel = {
  listar: () => query(`${SELECT_CENARIO} ORDER BY ce.criado_em DESC, ce.idCenario DESC`),

  async buscarPorId(id) {
    const rows = await query(`${SELECT_CENARIO} WHERE ce.idCenario = ?`, [id]);
    return rows[0] || null;
  },

  itens: (idCenario) =>
    query('SELECT idItemCenario AS id_item_cenario, idCenario AS id_cenario, funcao, tier_nivel, quantidade, custo_mensal_est, inicio_previsto FROM item_cenario_orcamento WHERE idCenario = ? ORDER BY idItemCenario', [idCenario]),

  criar: (d) =>
    insert(
      'INSERT INTO cenario_orcamento (nome_cenario, idCiclo, custo_base, status) VALUES (?, ?, ?, ?)',
      [d.nome_cenario, d.id_ciclo, d.custo_base, 'RASCUNHO'],
      'idCenario'
    ),

  atualizarStatus: (id, status) => execute('UPDATE cenario_orcamento SET status = ? WHERE idCenario = ?', [status, id]),

  excluir: (id) => execute('DELETE FROM cenario_orcamento WHERE idCenario = ?', [id]),

  adicionarItem: (idCenario, d) =>
    insert(
      `INSERT INTO item_cenario_orcamento (idCenario, funcao, tier_nivel, quantidade, custo_mensal_est, inicio_previsto)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [idCenario, d.funcao, d.tier_nivel, d.quantidade, d.custo_mensal_est, d.inicio_previsto || null],
      'idItemCenario'
    ),

  async buscarItem(idItem) {
    const [r] = await query('SELECT idItemCenario AS id_item_cenario, idCenario AS id_cenario, funcao, tier_nivel, quantidade, custo_mensal_est, inicio_previsto FROM item_cenario_orcamento WHERE idItemCenario = ?', [idItem]);
    return r || null;
  },

  removerItem: (idItem) => execute('DELETE FROM item_cenario_orcamento WHERE idItemCenario = ?', [idItem]),
};