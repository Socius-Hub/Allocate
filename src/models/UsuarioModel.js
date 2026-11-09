import { query, execute, transaction } from '../config/database.js';
import { estornarInscricoes } from './inscricaoModel.js';

const SELECT_DETALHADO = `
  SELECT u.idUsuario AS id_usuario, u.nomeCompleto AS nome_completo, u.CRM_matricula AS crm_matricula, u.telefone, u.status,
         u.idPerfil AS id_perfil, p.tipo AS perfil, u.idDepto AS id_depto, d.nomeDepto AS nome_depto,
         u.idLogin AS id_login, l.email, l.status AS status_login, l.criado_em, l.ultimo_login
  FROM usuario u
  JOIN login l         ON l.idLogin  = u.idLogin
  JOIN perfil_acesso p ON p.idPerfil = u.idPerfil
  JOIN departamento d  ON d.idDepto  = u.idDepto`;

function filtros({ idDepto, busca } = {}) {
  const where = [];
  const params = [];
  if (idDepto) {
    where.push('u.idDepto = ?');
    params.push(idDepto);
  }
  if (busca) {
    where.push('(LOWER(u.nomeCompleto) LIKE ? OR LOWER(l.email) LIKE ?)');
    params.push(`%${busca.toLowerCase()}%`, `%${busca.toLowerCase()}%`);
  }
  return { sql: where.length ? ` WHERE ${where.join(' AND ')}` : '', params };
}

export const UsuarioModel = {
  async buscarParaLogin(email) {
    const rows = await query(
      `SELECT l.idLogin AS id_login, l.email, l.senha_hash, l.status AS status_login,
              u.idUsuario AS id_usuario, u.nomeCompleto AS nome_completo, u.status AS status_usuario, u.idDepto AS id_depto, p.tipo AS perfil
       FROM login l
       JOIN usuario u       ON u.idLogin  = l.idLogin
       JOIN perfil_acesso p ON p.idPerfil = u.idPerfil
       WHERE LOWER(l.email) = LOWER(?)`,
      [email]
    );
    return rows[0] || null;
  },

  async registrarAcesso(idLogin) {
    await execute('UPDATE login SET ultimo_login = CURRENT_TIMESTAMP WHERE idLogin = ?', [idLogin]);
  },

  async emailEmUso(email, ignorarIdLogin = null) {
    const rows = await query('SELECT idLogin FROM login WHERE LOWER(email) = LOWER(?)', [email]);
    return rows.some((r) => r.idLogin !== ignorarIdLogin);
  },

  async criar(d) {
    return transaction(async (tx) => {
      const idLogin = await tx.insert(
        'INSERT INTO login (email, senha_hash, status) VALUES (?, ?, ?)',
        [d.email.toLowerCase(), d.senhaHash, 'ativo'],
        'idLogin'
      );
      return tx.insert(
        `INSERT INTO usuario (nomeCompleto, CRM_matricula, telefone, idPerfil, idDepto, idLogin, status)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [d.nome_completo, d.crm_matricula, d.telefone, d.id_perfil, d.id_depto, idLogin, d.status || 'ATIVO'],
        'idUsuario'
      );
    });
  },

  async listar(f = {}, { limite = 10, offset = 0 } = {}) {
    const { sql, params } = filtros(f);
    return query(`${SELECT_DETALHADO}${sql} ORDER BY u.nomeCompleto LIMIT ? OFFSET ?`, [...params, limite, offset]);
  },

  async contar(f = {}) {
    const { sql, params } = filtros(f);
    const [r] = await query(`SELECT COUNT(*) AS total FROM usuario u JOIN login l ON l.idLogin = u.idLogin${sql}`, params);
    return r.total;
  },

  async listarAtivos() {
    return query(
      `SELECT u.idUsuario AS id_usuario, u.nomeCompleto AS nome_completo, d.nomeDepto AS nome_depto
       FROM usuario u JOIN departamento d ON d.idDepto = u.idDepto
       WHERE u.status = 'ATIVO' ORDER BY u.nomeCompleto`
    );
  },

  async buscarPorId(id) {
    const rows = await query(`${SELECT_DETALHADO} WHERE u.idUsuario = ?`, [id]);
    return rows[0] || null;
  },

  async atualizar(id, d) {
    return transaction(async (tx) => {
      const [u] = await tx.query('SELECT idLogin FROM usuario WHERE idUsuario = ?', [id]);
      if (!u) return false;
      await tx.execute(
        `UPDATE usuario SET nomeCompleto = ?, CRM_matricula = ?, telefone = ?,
                idPerfil = ?, idDepto = ?, status = ?
         WHERE idUsuario = ?`,
        [d.nome_completo, d.crm_matricula, d.telefone, d.id_perfil, d.id_depto, d.status, id]
      );
      await tx.execute('UPDATE login SET email = ? WHERE idLogin = ?', [d.email.toLowerCase(), u.idLogin]);
      if (d.senhaHash) {
        await tx.execute('UPDATE login SET senha_hash = ? WHERE idLogin = ?', [d.senhaHash, u.idLogin]);
      }
      return true;
    });
  },

  async buscarHashSenha(idLogin) {
    const [r] = await query('SELECT senha_hash FROM login WHERE idLogin = ?', [idLogin]);
    return r?.senha_hash || null;
  },

  async alterarSenha(idLogin, senhaHash) {
    await execute('UPDATE login SET senha_hash = ? WHERE idLogin = ?', [senhaHash, idLogin]);
  },

  async excluir(id) {
    return transaction(async (tx) => {
      const [u] = await tx.query('SELECT idLogin FROM usuario WHERE idUsuario = ?', [id]);
      if (!u) return false;
      await estornarInscricoes(tx, 'id_usuario', id);
      return (await tx.execute('DELETE FROM login WHERE idLogin = ?', [u.idLogin])) > 0;
    });
  },

  async contarAdmins() {
    const [r] = await query(
      `SELECT COUNT(*) AS total FROM usuario u JOIN perfil_acesso p ON p.idPerfil = u.idPerfil
       WHERE p.tipo = 'Administrador' AND u.status = 'ATIVO'`
    );
    return r.total;
  },
};