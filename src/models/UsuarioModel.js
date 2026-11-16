/*

  OBS: Modelo de Utilizadores (UsuarioModel).
       Agrupa as operações de acesso à base de dados para a gestão de utilizadores e credenciais de login,
       incluindo autenticação, registo de acessos, validações de e-mail único, listagens paginadas com filtros,
       transações para criação e atualização de registos associados, gestão de senhas e controlo de administradores ativos.

*/

import { query, execute, transaction } from "../config/database.js";
import { estornarInscricoes } from "./inscricaoModel.js";

const SELECT_DETALHADO = `
  SELECT u.idUsuario AS id_usuario, u.nomeCompleto AS nome_completo, u.CRM_matricula AS crm_matricula, u.telefone, u.status,
         u.idPerfil AS id_perfil, p.tipo AS perfil, u.idDepto AS id_depto, d.nomeDepto AS nome_depto,
         u.idLogin AS id_login, l.email, l.status AS status_login, l.criado_em, l.ultimo_login
  FROM usuario u
  JOIN login l         ON l.idLogin  = u.idLogin
  JOIN perfil_acesso p ON p.idPerfil = u.idPerfil
  JOIN departamento d  ON d.idDepto  = u.idDepto`;

//Constrói dinamicamente as cláusulas WHERE e os parâmetros para filtragem de utilizadores
function filtros({ idDepto, busca } = {}) {
  const where = [];
  const params = [];
  if (idDepto) {
    where.push("u.idDepto = ?");
    params.push(idDepto);
  }
  if (busca) {
    where.push("(LOWER(u.nomeCompleto) LIKE ? OR LOWER(l.email) LIKE ?)");
    params.push(`%${busca.toLowerCase()}%`, `%${busca.toLowerCase()}%`);
  }
  return { sql: where.length ? ` WHERE ${where.join(" AND ")}` : "", params };
}

export const UsuarioModel = {
  //Busca um utilizador pelas credenciais de e-mail para efeitos de autenticação (login)
  async buscarParaLogin(email) {
    const rows = await query(
      `SELECT l.idLogin AS id_login, l.email, l.senha_hash, l.status AS status_login,
              u.idUsuario AS id_usuario, u.nomeCompleto AS nome_completo, u.status AS status_usuario, u.idDepto AS id_depto, p.tipo AS perfil
       FROM login l
       JOIN usuario u       ON u.idLogin  = l.idLogin
       JOIN perfil_acesso p ON p.idPerfil = u.idPerfil
       WHERE LOWER(l.email) = LOWER(?)`,
      [email],
    );
    return rows[0] || null;
  },

  //Atualiza a data e hora do último acesso realizado por um utilizador
  async registrarAcesso(idLogin) {
    await execute(
      "UPDATE login SET ultimo_login = CURRENT_TIMESTAMP WHERE idLogin = ?",
      [idLogin],
    );
  },

  //Verifica se um determinado e-mail já está em uso por outro registo de login
  async emailEmUso(email, ignorarIdLogin = null) {
    const rows = await query(
      "SELECT idLogin FROM login WHERE LOWER(email) = LOWER(?)",
      [email],
    );
    return rows.some((r) => r.idLogin !== ignorarIdLogin);
  },

  //Cria um novo utilizador e as respetivas credenciais de login dentro de uma transação segura
  async criar(d) {
    return transaction(async (tx) => {
      // Cria primeiro a credencial de login
      const idLogin = await tx.insert(
        "INSERT INTO login (email, senha_hash, status) VALUES (?, ?, ?)",
        [d.email.toLowerCase(), d.senhaHash, "ativo"],
        "idLogin",
      );
      // Cria de seguida o perfil de utilizador associado ao login gerado
      return tx.insert(
        `INSERT INTO usuario (nomeCompleto, CRM_matricula, telefone, idPerfil, idDepto, idLogin, status)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [
          d.nome_completo,
          d.crm_matricula,
          d.telefone,
          d.id_perfil,
          d.id_depto,
          idLogin,
          d.status || "ATIVO",
        ],
        "idUsuario",
      );
    });
  },

  //Lista os utilizadores com base em filtros e paginação
  async listar(f = {}, { limite = 10, offset = 0 } = {}) {
    const { sql, params } = filtros(f);
    return query(
      `${SELECT_DETALHADO}${sql} ORDER BY u.nomeCompleto LIMIT ? OFFSET ?`,
      [...params, limite, offset],
    );
  },

  //Conta o total de utilizadores que correspondem aos filtros aplicado
  async contar(f = {}) {
    const { sql, params } = filtros(f);
    const [r] = await query(
      `SELECT COUNT(*) AS total FROM usuario u JOIN login l ON l.idLogin = u.idLogin${sql}`,
      params,
    );
    return r.total;
  },

  //Lista apenas os utilizadores que se encontram com status 'ATIVO'
  async listarAtivos() {
    return query(
      `SELECT u.idUsuario AS id_usuario, u.nomeCompleto AS nome_completo, d.nomeDepto AS nome_depto
       FROM usuario u JOIN departamento d ON d.idDepto = u.idDepto
       WHERE u.status = 'ATIVO' ORDER BY u.nomeCompleto`,
    );
  },

  //Busca os detalhes completos de um utilizador específico pelo seu ID
  async buscarPorId(id) {
    const rows = await query(`${SELECT_DETALHADO} WHERE u.idUsuario = ?`, [id]);
    return rows[0] || null;
  },

  //Atualiza os dados de um utilizador e respetivas credenciais de login numa transação
  async atualizar(id, d) {
    return transaction(async (tx) => {
      const [u] = await tx.query(
        "SELECT idLogin FROM usuario WHERE idUsuario = ?",
        [id],
      );
      if (!u) return false;

      // Atualiza os dados da tabela de utilizador
      await tx.execute(
        `UPDATE usuario SET nomeCompleto = ?, CRM_matricula = ?, telefone = ?,
                idPerfil = ?, idDepto = ?, status = ?
         WHERE idUsuario = ?`,
        [
          d.nome_completo,
          d.crm_matricula,
          d.telefone,
          d.id_perfil,
          d.id_depto,
          d.status,
          id,
        ],
      );

      // Atualiza o e-mail na tabela de login
      await tx.execute("UPDATE login SET email = ? WHERE idLogin = ?", [
        d.email.toLowerCase(),
        u.idLogin,
      ]);

      // Atualiza a senha apenas se houver uma nova senha encriptada informada
      if (d.senhaHash) {
        await tx.execute("UPDATE login SET senha_hash = ? WHERE idLogin = ?", [
          d.senhaHash,
          u.idLogin,
        ]);
      }
      return true;
    });
  },

  //Busca o hash da senha de um utilizador com base no seu ID de login
  async buscarHashSenha(idLogin) {
    const [r] = await query("SELECT senha_hash FROM login WHERE idLogin = ?", [
      idLogin,
    ]);
    return r?.senha_hash || null;
  },

  //Altera a senha de um utilizador através do respetivo ID de login
  async alterarSenha(idLogin, senhaHash) {
    await execute("UPDATE login SET senha_hash = ? WHERE idLogin = ?", [
      senhaHash,
      idLogin,
    ]);
  },

  /*Exclui um utilizador e o registo de login associado, estornando em cascata
  as inscrições ativas que estivessem consumindo orçamento*/
  async excluir(id) {
    return transaction(async (tx) => {
      const [u] = await tx.query(
        "SELECT idLogin FROM usuario WHERE idUsuario = ?",
        [id],
      );
      if (!u) return false;

      // Estorna do orçamento as inscrições do utilizador antes de apagar
      await estornarInscricoes(tx, "id_usuario", id);

      // Remove o registo de login (a tabela de utilizadores é apagada em cascata ou por dependência)
      return (
        (await tx.execute("DELETE FROM login WHERE idLogin = ?", [u.idLogin])) >
        0
      );
    });
  },

  //Conta a quantidade total de administradores atualmente ativos no sistema
  async contarAdmins() {
    const [r] = await query(
      `SELECT COUNT(*) AS total FROM usuario u JOIN perfil_acesso p ON p.idPerfil = u.idPerfil
       WHERE p.tipo = 'Administrador' AND u.status = 'ATIVO'`,
    );
    return r.total;
  },
};