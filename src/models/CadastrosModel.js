import { query, insert, execute } from '../config/database.js';

export const CategoriaModel = {
  listar: () => query('SELECT id_cat_evento, categoria FROM categoria_evento ORDER BY categoria'),
  async buscarPorId(id) {
    const [r] = await query('SELECT id_cat_evento, categoria FROM categoria_evento WHERE id_cat_evento = ?', [id]);
    return r || null;
  },
  criar: (d) => insert('INSERT INTO categoria_evento (categoria) VALUES (?)', [d.categoria], 'id_cat_evento'),
  atualizar: (id, d) => execute('UPDATE categoria_evento SET categoria = ? WHERE id_cat_evento = ?', [d.categoria, id]),
  excluir: (id) => execute('DELETE FROM categoria_evento WHERE id_cat_evento = ?', [id]),
};

export const DepartamentoModel = {
  listar: () => query('SELECT idDepto AS id_depto, nomeDepto AS nome_depto FROM departamento ORDER BY nomeDepto'),
  async buscarPorId(id) {
    const [r] = await query('SELECT idDepto AS id_depto, nomeDepto AS nome_depto FROM departamento WHERE idDepto = ?', [id]);
    return r || null;
  },
  criar: (d) => insert('INSERT INTO departamento (nomeDepto) VALUES (?)', [d.nome_depto], 'idDepto'),
  atualizar: (id, d) => execute('UPDATE departamento SET nomeDepto = ? WHERE idDepto = ?', [d.nome_depto, id]),
  excluir: (id) => execute('DELETE FROM departamento WHERE idDepto = ?', [id]),
};

export const PerfilModel = {
  listar: () => query('SELECT idPerfil AS id_perfil, tipo FROM perfil_acesso ORDER BY tipo'),
  async buscarPorId(id) {
    const [r] = await query('SELECT idPerfil AS id_perfil, tipo FROM perfil_acesso WHERE idPerfil = ?', [id]);
    return r || null;
  },
  async buscarPorTipo(tipo) {
    const [r] = await query('SELECT idPerfil AS id_perfil, tipo FROM perfil_acesso WHERE tipo = ?', [tipo]);
    return r || null;
  },
};