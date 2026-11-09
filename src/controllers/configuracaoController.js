import bcrypt from 'bcrypt';
import { CategoriaModel, DepartamentoModel } from '../models/CadastrosModel.js';
import { CicloModel, STATUS_CICLO } from '../models/OrcamentoModel.js';
import { UsuarioModel } from '../models/UsuarioModel.js';
import { ehAdmin } from '../middlewares/auth.js';
import { SALT_ROUNDS, validarSenha } from './authController.js';
import { Validador } from '../utils/validador.js';
import { paraNumero } from '../utils/formatadores.js';
import { controller, idParam, naoEncontrado, mensagemErroBanco } from '../utils/http.js';

function crudSimples({ model, nome, validar, normalizar, mensagemDuplicado }) {
  return {
    async salvar(req, res) {
      const id = idParam(req.params.id);
      const v = new Validador(req.body);
      validar(v);
      if (!v.valido) {
        req.flash('erro', Object.values(v.erros).join(' '));
        return res.redirect('/configuracoes');
      }
      try {
        if (id) {
          if (!(await model.atualizar(id, normalizar(req.body)))) throw naoEncontrado(nome);
          req.flash('sucesso', `${nome} atualizado(a).`);
        } else {
          await model.criar(normalizar(req.body));
          req.flash('sucesso', `${nome} cadastrado(a).`);
        }
      } catch (err) {
        const msg = err.tipo === 'UNIQUE' ? mensagemDuplicado : mensagemErroBanco(err);
        if (!msg) throw err;
        req.flash('erro', msg);
      }
      res.redirect('/configuracoes');
    },

    async excluir(req, res) {
      try {
        if (!(await model.excluir(idParam(req.params.id)))) throw naoEncontrado(nome);
        req.flash('sucesso', `${nome} excluído(a).`);
      } catch (err) {
        if (err.tipo !== 'FK') throw err;
        req.flash('erro', `Não é possível excluir: existem registros usando este(a) ${nome.toLowerCase()}.`);
      }
      res.redirect('/configuracoes');
    },
  };
}

const categorias = crudSimples({
  model: CategoriaModel,
  nome: 'Categoria',
  mensagemDuplicado: 'Já existe uma categoria com esse nome.',
  validar: (v) => {
    v.campo('categoria', 'Nome da categoria').obrigatorio().max(250);
  },
  normalizar: (b) => ({ categoria: b.categoria.trim() }),
});

const departamentos = crudSimples({
  model: DepartamentoModel,
  nome: 'Departamento',
  mensagemDuplicado: 'Já existe um departamento com esse nome.',
  validar: (v) => {
    v.campo('nome_depto', 'Nome do departamento').obrigatorio().max(250);
  },
  normalizar: (b) => ({ nome_depto: b.nome_depto.trim() }),
});

const ciclos = crudSimples({
  model: CicloModel,
  nome: 'Ciclo',
  mensagemDuplicado: 'Já existe um ciclo com esse nome.',
  validar: (v) => {
    v.campo('nome', 'Nome do ciclo').obrigatorio().max(250);
    v.campo('limite_total', 'Limite total').obrigatorio().numero({ min: 0 });
    v.campo('status', 'Status').obrigatorio().em(STATUS_CICLO);
  },
  normalizar: (b) => ({ nome: b.nome.trim(), limite_total: paraNumero(b.limite_total), status: b.status }),
});

export const ConfiguracaoController = controller({
  async index(req, res) {
    const admin = ehAdmin(req.session?.usuario);
    const [cats, deps, cics] = admin
      ? await Promise.all([CategoriaModel.listar(), DepartamentoModel.listar(), CicloModel.listar()])
      : [[], [], []];
    res.render('configuracoes', {
      titulo: 'Configurações',
      pagina: 'configuracoes',
      categorias: cats,
      departamentos: deps,
      ciclos: cics,
      statusCiclo: STATUS_CICLO,
    });
  },

  async alterarSenha(req, res) {
    const usuario = req.session?.usuario;
    const v = new Validador(req.body);
    v.campo('senha_atual', 'Senha atual').obrigatorio();
    validarSenha(v, 'nova_senha', 'Nova senha');
    v.campo('confirmar_senha', 'Confirmação').obrigatorio().igual('nova_senha', 'A confirmação não confere com a nova senha.');

    if (v.valido) {
      const hash = await UsuarioModel.buscarHashSenha(usuario.id_login);
      if (!hash || !(await bcrypt.compare(req.body.senha_atual, hash))) v.erros.senha_atual = 'A senha atual está incorreta.';
    }
    if (!v.valido) {
      req.flash('erro', Object.values(v.erros).join(' '));
      return res.redirect('/configuracoes');
    }
    await UsuarioModel.alterarSenha(usuario.id_login, await bcrypt.hash(req.body.nova_senha, SALT_ROUNDS));
    req.flash('sucesso', 'Senha alterada com sucesso.');
    res.redirect('/configuracoes');
  },

  salvarCategoria: categorias.salvar,
  excluirCategoria: categorias.excluir,
  salvarDepartamento: departamentos.salvar,
  excluirDepartamento: departamentos.excluir,
  salvarCiclo: ciclos.salvar,
  excluirCiclo: ciclos.excluir,
});