import { EventoModel, TierModel, STATUS_EVENTO, STATUS_TIER } from '../models/EventoModel.js';
import { InscricaoModel } from '../models/InscricaoModel.js';
import { CategoriaModel, DepartamentoModel } from '../models/CadastrosModel.js';
import { Validador } from '../utils/validador.js';
import { fmt, paraNumero, paraDataHoraSQL } from '../utils/formatadores.js';
import { controller, idParam, naoEncontrado, paginacao, montarQuery, mensagemErroBanco } from '../utils/http.js';

async function opcoesFormulario() {
  const [categorias, departamentos] = await Promise.all([CategoriaModel.listar(), DepartamentoModel.listar()]);
  return { categorias, departamentos, statusEvento: STATUS_EVENTO };
}

function validarEvento(body, { categorias, departamentos }, inscritos = 0) {
  const v = new Validador(body);
  v.campo('nome', 'Nome do evento').obrigatorio().min(3).max(250);
  v.campo('data_inicio', 'Início').obrigatorio().data();
  v.campo('data_termino', 'Término').obrigatorio().data();
  v.campo('localizacao', 'Local').obrigatorio().max(250);
  v.campo('id_cat_evento', 'Categoria').obrigatorio().em(categorias.map((c) => c.id_cat_evento));
  v.campo('id_depto', 'Centro de custo').em(departamentos.map((d) => d.id_depto));
  v.campo('capacidade', 'Capacidade').obrigatorio().numero({ min: Math.max(1, inscritos), inteiro: true });
  v.campo('custo_estimado', 'Custo estimado').obrigatorio().numero({ min: 0 });
  v.campo('status', 'Status').obrigatorio().em(STATUS_EVENTO);
  v.campo('descricao', 'Descrição').max(2000);

  if (inscritos > 0 && v.erros.capacidade?.includes('mínimo')) {
    v.erros.capacidade = `O evento já tem ${inscritos} inscrito(s); a capacidade não pode ser menor.`;
  }
  if (!v.erros.data_inicio && !v.erros.data_termino && new Date(body.data_termino) < new Date(body.data_inicio)) {
    v.erros.data_termino = 'O término deve ser depois do início.';
  }

  const dados = {
    nome: body.nome?.trim(),
    data_inicio: paraDataHoraSQL(body.data_inicio),
    data_termino: paraDataHoraSQL(body.data_termino),
    localizacao: body.localizacao?.trim(),
    id_cat_evento: Number(body.id_cat_evento),
    id_depto: body.id_depto ? Number(body.id_depto) : null,
    capacidade: Number(body.capacidade),
    custo_estimado: paraNumero(body.custo_estimado),
    status: body.status,
    descricao: body.descricao?.trim(),
  };
  return { v, dados };
}

async function carregarEvento(req) {
  const id = idParam(req.params.id);
  const evento = id && (await EventoModel.buscarPorId(id));
  if (!evento) throw naoEncontrado('Evento');
  return evento;
}

export const EventoController = controller({
  async listar(req, res) {
    const filtros = {
      status: STATUS_EVENTO.includes(req.query.status) ? req.query.status : '',
      id_cat_evento: idParam(req.query.categoria),
      data: /^\d{4}-\d{2}-\d{2}$/.test(req.query.data || '') ? req.query.data : '',
      busca: (req.query.busca || '').trim(),
    };
    const { pagina, porPagina, offset } = paginacao(req);
    const [eventos, total, contagem, categorias] = await Promise.all([
      EventoModel.listar(filtros, { limite: porPagina, offset }),
      EventoModel.contar(filtros),
      EventoModel.contarPorStatus(),
      CategoriaModel.listar(),
    ]);
    const atual = { status: filtros.status, categoria: req.query.categoria, data: filtros.data, busca: filtros.busca };
    res.render('eventos', {
      titulo: 'Gestão de Eventos',
      pagina: 'eventos',
      eventos,
      total,
      contagem,
      categorias,
      filtros,
      paginaAtual: pagina,
      porPagina,
      totalPaginas: Math.max(1, Math.ceil(total / porPagina)),
      link: (mudancas) => `/eventos${montarQuery(atual, mudancas)}`,
    });
  },

  async detalhes(req, res) {
    const evento = await carregarEvento(req);
    const [tiers, inscricoes, alocado] = await Promise.all([
      TierModel.listarPorEvento(evento.id_evento),
      InscricaoModel.listarPorEvento(evento.id_evento),
      EventoModel.totalAlocado(evento.id_evento),
    ]);
    res.render('evento-detalhes', { titulo: evento.nome, tituloHeader: 'Detalhes do Evento', pagina: 'eventos', evento, tiers, inscricoes, alocado });
  },

  async novo(req, res) {
    res.render('evento-form', {
      titulo: 'Criar Evento',
      pagina: 'eventos',
      evento: null,
      dados: { status: 'PLANEJAMENTO' },
      ...(await opcoesFormulario()),
    });
  },

  async criar(req, res) {
    const opcoes = await opcoesFormulario();
    const { v, dados } = validarEvento(req.body, opcoes);
    if (!v.valido) {
      return res.status(400).render('evento-form', { titulo: 'Criar Evento', pagina: 'eventos', evento: null, dados: req.body, erros: v.erros, ...opcoes });
    }
    const id = await EventoModel.criar(dados);
    req.flash('sucesso', 'Evento criado com sucesso! Agora cadastre os tiers de inscrição.');
    res.redirect(`/eventos/${id}/tiers`);
  },

  async editar(req, res) {
    const evento = await carregarEvento(req);
    res.render('evento-form', {
      titulo: 'Editar Evento',
      pagina: 'eventos',
      evento,
      dados: {
        ...evento,
        data_inicio: fmt.inputDataHora(evento.data_inicio),
        data_termino: fmt.inputDataHora(evento.data_termino),
      },
      ...(await opcoesFormulario()),
    });
  },

  async atualizar(req, res) {
    const evento = await carregarEvento(req);
    const opcoes = await opcoesFormulario();
    const { v, dados } = validarEvento(req.body, opcoes, evento.inscritos);
    if (!v.valido) {
      return res.status(400).render('evento-form', { titulo: 'Editar Evento', pagina: 'eventos', evento, dados: req.body, erros: v.erros, ...opcoes });
    }
    await EventoModel.atualizar(evento.id_evento, dados);
    req.flash('sucesso', 'Evento atualizado com sucesso.');
    res.redirect(`/eventos/${evento.id_evento}`);
  },

  async excluir(req, res) {
    const evento = await carregarEvento(req);
    try {
      await EventoModel.excluir(evento.id_evento);
      req.flash('sucesso', `Evento "${evento.nome}" excluído.`);
      res.redirect('/eventos');
    } catch (err) {
      const msg = mensagemErroBanco(err);
      if (!msg) throw err;
      req.flash('erro', msg);
      res.redirect(`/eventos/${evento.id_evento}`);
    }
  },

  async tiers(req, res) {
    const evento = await carregarEvento(req);
    const tiers = await TierModel.listarPorEvento(evento.id_evento);
    const idEdicao = idParam(req.query.editar);
    const tierEdicao = idEdicao ? tiers.find((t) => t.id_tier === idEdicao) : null;
    res.render('evento-tiers', {
      titulo: 'Tiers de Inscrição',
      pagina: 'eventos',
      evento,
      tiers,
      tierEdicao,
      statusTier: STATUS_TIER,
      dados: tierEdicao || { status: 'ATIVO' },
    });
  },

  async salvarTier(req, res) {
    const evento = await carregarEvento(req);
    const idTier = idParam(req.params.idTier);
    const tiers = await TierModel.listarPorEvento(evento.id_evento);
    const tierEdicao = idTier ? tiers.find((t) => t.id_tier === idTier) : null;
    if (idTier && !tierEdicao) throw naoEncontrado('Tier');

    const v = new Validador(req.body);
    v.campo('nome', 'Nome do tier').obrigatorio().max(250);
    v.campo('descricao', 'Descrição').max(250);
    v.campo('preco', 'Preço').obrigatorio().numero({ min: 0 });
    v.campo('capacidade', 'Capacidade').obrigatorio().numero({ min: Math.max(1, tierEdicao?.inscritos || 0), inteiro: true });
    v.campo('prazo', 'Prazo').data();
    v.campo('status', 'Status').obrigatorio().em(STATUS_TIER);
    if (!v.erros.capacidade && Number(req.body.capacidade) > evento.capacidade) {
      v.erros.capacidade = `Não pode ser maior que a capacidade do evento (${evento.capacidade}).`;
    }

    if (!v.valido) {
      return res.status(400).render('evento-tiers', {
        titulo: 'Tiers de Inscrição', pagina: 'eventos', evento, tiers, tierEdicao, statusTier: STATUS_TIER, dados: req.body, erros: v.erros,
      });
    }

    const dados = {
      id_evento: evento.id_evento,
      nome: req.body.nome.trim(),
      descricao: req.body.descricao?.trim(),
      preco: paraNumero(req.body.preco),
      capacidade: Number(req.body.capacidade),
      prazo: req.body.prazo || null,
      status: req.body.status,
    };
    if (tierEdicao) {
      await TierModel.atualizar(idTier, dados);
      req.flash('sucesso', 'Tier atualizado.');
    } else {
      await TierModel.criar(dados);
      req.flash('sucesso', 'Tier criado.');
    }
    res.redirect(`/eventos/${evento.id_evento}/tiers`);
  },

  async excluirTier(req, res) {
    const evento = await carregarEvento(req);
    const tier = await TierModel.buscarPorId(idParam(req.params.idTier));
    if (!tier || tier.id_evento !== evento.id_evento) throw naoEncontrado('Tier');
    if (tier.inscritos > 0) {
      req.flash('erro', `O tier "${tier.nome}" possui ${tier.inscritos} inscrição(ões). Exclua-as ou altere o status do tier para "Encerrado".`);
      return res.redirect(`/eventos/${evento.id_evento}/tiers`);
    }
    await TierModel.excluir(tier.id_tier);
    req.flash('sucesso', `Tier "${tier.nome}" excluído.`);
    res.redirect(`/eventos/${evento.id_evento}/tiers`);
  },
});