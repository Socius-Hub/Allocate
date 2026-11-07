/**
 * Tabelas auxiliares (cadastros simples): perfis, departamentos e categorias de evento.
 */
import { query, insert, execute } from '../config/database.js';

export const PerfilModel = {
  listar: () => query('SELECT id_perfil, tipo FROM perfil_acesso ORDER BY tipo'),

  async buscarPorTipo(tipo) {
    const [r] = await query('SELECT id_perfil, tipo FROM perfil_acesso WHERE tipo = ?', [tipo]);
    return r || null;
  },
};

export const DepartamentoModel = {
  listar: () =>
    query(
      `SELECT d.id_depto, d.nome_depto, d.descricao,
              (SELECT COUNT(*) FROM usuario u WHERE u.id_depto = d.id_depto) AS total_usuarios
       FROM departamento d ORDER BY d.nome_depto`
    ),

  async buscarPorId(id) {
    const [r] = await query('SELECT * FROM departamento WHERE id_depto = ?', [id]);
    return r || null;
  },

  criar: (d) =>
    insert('INSERT INTO departamento (nome_depto, descricao) VALUES (?, ?)', [d.nome_depto, d.descricao || null], 'id_depto'),

  atualizar: (id, d) =>
    execute('UPDATE departamento SET nome_depto = ?, descricao = ? WHERE id_depto = ?', [d.nome_depto, d.descricao || null, id]),

  excluir: (id) => execute('DELETE FROM departamento WHERE id_depto = ?', [id]),
};

export const CategoriaModel = {
  listar: () =>
    query(
      `SELECT c.id_cat_evento, c.categoria, c.descricao,
              (SELECT COUNT(*) FROM evento e WHERE e.id_cat_evento = c.id_cat_evento) AS total_eventos
       FROM categoria_evento c ORDER BY c.categoria`
    ),

  async buscarPorId(id) {
    const [r] = await query('SELECT * FROM categoria_evento WHERE id_cat_evento = ?', [id]);
    return r || null;
  },

  criar: (d) =>
    insert('INSERT INTO categoria_evento (categoria, descricao) VALUES (?, ?)', [d.categoria, d.descricao || null], 'id_cat_evento'),

  atualizar: (id, d) =>
    execute('UPDATE categoria_evento SET categoria = ?, descricao = ? WHERE id_cat_evento = ?', [d.categoria, d.descricao || null, id]),

  excluir: (id) => execute('DELETE FROM categoria_evento WHERE id_cat_evento = ?', [id]),
};
