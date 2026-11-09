import { InscricaoModel, STATUS_INSCRICAO } from '../models/inscricaoModel.js';
import { EventoModel, TierModel } from '../models/EventoModel.js';
import { UsuarioModel } from '../models/UsuarioModel.js';
import { OrcamentoModel } from '../models/OrcamentoModel.js';
import { ehAdmin } from '../middlewares/auth.js';
import { Validador } from '../utils/validador.js';
import { fmt } from '../utils/formatadores.js';
import { controller, idParam, naoEncontrado, paginacao, montarQuery, mensagemErroBanco, ErroHttp } from '../utils/http.js';

async function dadosFormulario(req, idEvento) {
  const admin = ehAdmin(req.session?.usuario);
  const [eventos, usuarios] = await Promise.all([
    EventoModel.abertosParaInscricao(),
    admin ? UsuarioModel.listarAtivos() : [],
  ]);
  const evento = idEvento && eventos.some((e) => e.id_evento === idEvento) ? await EventoModel.buscarPorId(idEvento) : null;
  const tiers = evento ? await TierModel.listarDisponiveis(evento.id_evento) : [];
  return { eventos, usuarios, evento, tiers, admin };
}

export const InscricaoController = controller({
  async listar(req, res) {
    const admin = ehAdmin(req.session?.usuario);
    const status = STATUS_INSCRICAO.includes(req.query.status) ? req.query.status : '';
    const filtros = { status, id_usuario: admin ? null : req.session?.usuario?.id_usuario };
    const { pagina, porPagina, offset } = paginacao(req);
    const [inscricoes, total, contagem] = await Promise.all([
      InscricaoModel.listar(filtros, { limite: porPagina, offset }),
      InscricaoModel.contar(filtros),
      InscricaoModel.contarPorStatus(filtros.id_usuario),
    ]);
    res.render('inscricoes-lista', {
      titulo: admin ? 'Inscrições' : 'Minhas Inscrições',
      pagina: 'inscricoes',
      inscricoes,
      total,
      contagem,
      status,
      statusInscricao: STATUS_INSCRICAO,
      paginaAtual: pagina,
      porPagina,
      totalPaginas: Math.max(1, Math.ceil(total / porPagina)),
      link: (m) => `/inscricoes${montarQuery({ status }, m)}`,
    });
  },

  async nova(req, res) {
    const dados = await dadosFormulario(req, idParam(req.query.evento));
    res.render('inscricao-nova', {
      titulo: 'Nova Inscrição',
      pagina: 'inscricoes',
      ...dados,
      dados: { id_usuario: req.session?.usuario?.id_usuario, id_tier: dados.tiers[0]?.id_tier },
    });
  },

  async criar(req, res) {
    const usuario = req.session?.usuario;
    const idEvento = idParam(req.body.id_evento);
    const form = await dadosFormulario(req, idEvento);

    const idUsuario = form.admin ? idParam(req.body.id_usuario) : usuario?.id_usuario;

    const v = new Validador(req.body);
    v.campo('id_evento', 'Evento').obrigatorio().em(form.eventos.map((e) => e.id_evento));
    v.campo('id_tier', 'Tier').obrigatorio().em(form.tiers.map((t) => t.id_tier));
    if (form.admin) v.campo('id_usuario', 'Participante').obrigatorio().em(form.usuarios.map((u) => u.id_usuario));

    const renderErro = (erroGeral) =>
      res.status(400).render('inscricao-nova', {
        titulo: 'Nova Inscrição', pagina: 'inscricoes', ...form, dados: req.body, erros: v.erros, erroGeral,
      });

    if (!v.valido) return renderErro(null);

    try {
      await InscricaoModel.criar({
        id_evento: idEvento,
        id_usuario: idUsuario,
        id_tier: Number(req.body.id_tier),
      });
    } catch (err) {
      const msg = err.tipo === 'UNIQUE' ? 'Este colaborador já possui inscrição neste evento.' : mensagemErroBanco(err);
      if (!msg) throw err;
      return renderErro(msg);
    }
    req.flash('sucesso', 'Inscrição enviada! Ela aparecerá na fila de aprovação.');
    res.redirect('/inscricoes');
  },

  async alterarStatus(req, res) {
    const insc = await InscricaoModel.buscarPorId(idParam(req.params.id));
    if (!insc) throw naoEncontrado('Inscrição');
    if (!STATUS_INSCRICAO.includes(req.body.status)) throw new ErroHttp(400, 'Status inválido.');
    await InscricaoModel.alterarStatus(insc.id_inscricao, req.body.status);
    req.flash('sucesso', `Inscrição #${insc.id_inscricao} atualizada para "${fmt.status(req.body.status).rotulo}".`);
    res.redirect(req.get('Referrer')?.includes('/eventos/') ? `/eventos/${insc.id_evento}` : '/inscricoes');
  },

  async excluir(req, res) {
    const usuario = req.session?.usuario;
    const insc = await InscricaoModel.buscarPorId(idParam(req.params.id));
    if (!insc) throw naoEncontrado('Inscrição');
    const podeExcluir = ehAdmin(usuario) || (insc.id_usuario === usuario?.id_usuario && insc.status === 'SOLICITADO');
    if (!podeExcluir) {
      req.flash('erro', 'Você só pode cancelar suas próprias inscrições que ainda não foram analisadas.');
      return res.redirect('/inscricoes');
    }
    await InscricaoModel.excluir(insc.id_inscricao);
    req.flash('sucesso', `Inscrição #${insc.id_inscricao} removida.`);
    res.redirect('/inscricoes');
  },

  async filaAprovacoes(req, res) {
    const { pagina, porPagina, offset } = paginacao(req);
    const [pendentes, total, totalSolicitado] = await Promise.all([
      InscricaoModel.listar({ status: 'SOLICITADO' }, { limite: porPagina, offset }),
      InscricaoModel.contar({ status: 'SOLICITADO' }),
      InscricaoModel.totalSolicitado(),
    ]);
    const recentes = await InscricaoModel.listar({}, { limite: 50 });
    res.render('aprovacoes', {
      titulo: 'Fila de Aprovações',
      pagina: 'aprovacoes',
      pendentes,
      total,
      totalSolicitado,
      revisadas: recentes.filter((i) => i.status !== 'SOLICITADO').slice(0, 5),
      paginaAtual: pagina,
      porPagina,
      totalPaginas: Math.max(1, Math.ceil(total / porPagina)),
    });
  },

  async detalheAprovacao(req, res) {
    const insc = await InscricaoModel.buscarPorId(idParam(req.params.id));
    if (!insc) throw naoEncontrado('Solicitação');
    const orcamento = await OrcamentoModel.doDepartamentoNoCicloAtivo(insc.id_depto);
    res.render('aprovacao-detalhe', { titulo: `Solicitação #${insc.id_inscricao}`, pagina: 'aprovacoes', insc, orcamento });
  },

  async decidir(req, res) {
    const insc = await InscricaoModel.buscarPorId(idParam(req.params.id));
    if (!insc) throw naoEncontrado('Solicitação');

    const acao = req.body.acao;
    const erros = {};
    if (!['aprovar', 'rejeitar'].includes(acao)) erros.acao = 'Ação inválida.';

    if (Object.keys(erros).length) {
      const orcamento = await OrcamentoModel.doDepartamentoNoCicloAtivo(insc.id_depto);
      return res.status(400).render('aprovacao-detalhe', {
        titulo: `Solicitação #${insc.id_inscricao}`, pagina: 'aprovacoes', insc, orcamento, erros, dados: req.body,
      });
    }

    const novo = acao === 'aprovar' ? 'APROVADO' : 'REJEITADO';
    await InscricaoModel.alterarStatus(insc.id_inscricao, novo);
    req.flash('sucesso', `Solicitação de ${insc.nome_completo} ${acao === 'aprovar' ? 'aprovada' : 'rejeitada'}.`);
    res.redirect('/aprovacoes');
  },
});