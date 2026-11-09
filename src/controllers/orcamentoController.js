import { CicloModel, OrcamentoModel, CenarioModel, STATUS_CENARIO } from '../models/OrcamentoModel.js';
//import { DepartamentoModel } from '../models/CadastrosModel.js';
import { UsuarioModel } from '../models/UsuarioModel.js';
import { Validador } from '../utils/validador.js';
import { paraNumero } from '../utils/formatadores.js';
import { controller, idParam, naoEncontrado, mensagemErroBanco, ErroHttp } from '../utils/http.js';

/** Ciclo escolhido em ?ciclo= ou, por padrão, o ciclo ativo (ou o mais recente). */
async function escolherCiclo(req, ciclos) {
  const id = idParam(req.query.ciclo);
  return ciclos.find((c) => c.id_ciclo === id) || ciclos.find((c) => c.status === 'ATIVO') || ciclos[0] || null;
}

const csv = (v) => `"${String(v ?? '').replace(/"/g, '""')}"`;

export const OrcamentoController = controller({
  async departamentos(req, res) {
    const ciclos = await CicloModel.listar();
    const ciclo = await escolherCiclo(req, ciclos);
    const [linhas, resumo, departamentos, usuarios] = await Promise.all([
      ciclo ? OrcamentoModel.listarPorCiclo(ciclo.id_ciclo) : [],
      ciclo ? OrcamentoModel.resumo(ciclo.id_ciclo) : { limite: 0, utilizado: 0, disponivel: 0 },
      DepartamentoModel.listar(),
      UsuarioModel.listarAtivos(),
    ]);
    const idEdicao = idParam(req.query.editar);
    res.render('orcamento-departamento', {
      titulo: 'Orçamento por Departamento',
      pagina: 'orcamento',
      ciclos,
      ciclo,
      linhas,
      resumo,
      departamentos,
      usuarios,
      edicao: linhas.find((l) => l.id_orcamento_depto === idEdicao) || null,
      // departamentos que ainda não têm orçamento neste ciclo
      deptosLivres: departamentos.filter((d) => !linhas.some((l) => l.id_depto === d.id_depto)),
    });
  },

  /** Cria ou atualiza o orçamento de um departamento no ciclo (admin). */
  async salvar(req, res) {
    const ciclo = await CicloModel.buscarPorId(idParam(req.body.id_ciclo));
    if (!ciclo) throw naoEncontrado('Ciclo');
    const idOrc = idParam(req.params.id);
    const voltar = `/orcamento-departamento?ciclo=${ciclo.id_ciclo}`;

    const v = new Validador(req.body);
    if (!idOrc) v.campo('id_depto', 'Departamento').obrigatorio();
    v.campo('limite', 'Limite').obrigatorio().numero({ min: 0 });
    v.campo('utilizado', 'Utilizado').numero({ min: 0 });
    if (!v.valido) {
      req.flash('erro', Object.values(v.erros).join(' '));
      return res.redirect(idOrc ? `${voltar}&editar=${idOrc}` : voltar);
    }

    const dados = {
      id_ciclo: ciclo.id_ciclo,
      id_depto: Number(req.body.id_depto),
      id_usuario: idParam(req.body.id_usuario),
      limite: paraNumero(req.body.limite),
      utilizado: paraNumero(req.body.utilizado) || 0,
    };
    try {
      if (idOrc) {
        if (!(await OrcamentoModel.atualizar(idOrc, dados))) throw naoEncontrado('Orçamento');
        req.flash('sucesso', 'Orçamento atualizado.');
      } else {
        await OrcamentoModel.criar(dados);
        req.flash('sucesso', 'Orçamento do departamento adicionado ao ciclo.');
      }
    } catch (err) {
      const msg = err.tipo === 'UNIQUE' ? 'Este departamento já possui orçamento neste ciclo.' : mensagemErroBanco(err);
      if (!msg) throw err;
      req.flash('erro', msg);
    }
    res.redirect(voltar);
  },

  async excluir(req, res) {
    const orc = await OrcamentoModel.buscarPorId(idParam(req.params.id));
    if (!orc) throw naoEncontrado('Orçamento');
    await OrcamentoModel.excluir(orc.id_orcamento_depto);
    req.flash('sucesso', 'Orçamento do departamento removido do ciclo.');
    res.redirect(`/orcamento-departamento?ciclo=${orc.id_ciclo}`);
  },

  /** Exporta o relatório do ciclo em CSV (abre no Excel). */
  async exportar(req, res) {
    const ciclos = await CicloModel.listar();
    const ciclo = await escolherCiclo(req, ciclos);
    if (!ciclo) throw new ErroHttp(400, 'Nenhum ciclo orçamentário cadastrado.');
    const linhas = await OrcamentoModel.listarPorCiclo(ciclo.id_ciclo);
    const corpo = [
      ['Ciclo', 'Departamento', 'Líder', 'Limite', 'Utilizado', 'Disponível', '% Utilizado', 'Status'].map(csv).join(';'),
      ...linhas.map((l) =>
        [ciclo.nome, l.departamento, l.lider || '', l.limite, l.utilizado, l.disponivel, l.percentual_utilizado, l.status_alerta]
          .map((x) => csv(typeof x === 'number' ? String(x).replace('.', ',') : x))
          .join(';')
      ),
    ].join('\r\n');
    res.setHeader('Content-Type', 'text/csv; charset=utf-8');
    res.setHeader('Content-Disposition', `attachment; filename="orcamento-${ciclo.nome.replace(/\W+/g, '-')}.csv"`);
    res.send('﻿' + corpo); // BOM para o Excel reconhecer acentos
  },

  /* ------------------------------ SIMULADOR ------------------------------ */
  async simulador(req, res) {
    const [cenarios, ciclos] = await Promise.all([CenarioModel.listar(), CicloModel.listar()]);
    const id = idParam(req.query.cenario);
    const cenario = cenarios.find((c) => c.id_cenario === id) || cenarios[0] || null;
    const itens = cenario ? await CenarioModel.itens(cenario.id_cenario) : [];
    res.render('simulador-orcamento', { titulo: 'Simulador de Orçamento', pagina: 'simulador', cenarios, ciclos, cenario, itens });
  },

  async criarCenario(req, res) {
    const v = new Validador(req.body);
    v.campo('nome_cenario', 'Nome do cenário').obrigatorio().max(250);
    v.campo('id_ciclo', 'Ciclo').obrigatorio();
    v.campo('custo_base', 'Custo base mensal').obrigatorio().numero({ min: 0 });
    const ciclo = await CicloModel.buscarPorId(idParam(req.body.id_ciclo));
    if (!ciclo && !v.erros.id_ciclo) v.erros.id_ciclo = 'Ciclo inválido.';
    if (!v.valido) {
      req.flash('erro', Object.values(v.erros).join(' '));
      return res.redirect('/simulador-orcamento');
    }
    const id = await CenarioModel.criar({
      nome_cenario: req.body.nome_cenario.trim(),
      id_ciclo: ciclo.id_ciclo,
      custo_base: paraNumero(req.body.custo_base),
    });
    req.flash('sucesso', 'Cenário criado. Adicione os recursos para simular o impacto.');
    res.redirect(`/simulador-orcamento?cenario=${id}`);
  },

  async adicionarItem(req, res) {
    const cenario = await CenarioModel.buscarPorId(idParam(req.params.id));
    if (!cenario) throw naoEncontrado('Cenário');
    const voltar = `/simulador-orcamento?cenario=${cenario.id_cenario}`;
    if (cenario.status !== 'RASCUNHO') {
      req.flash('erro', 'Só é possível alterar cenários em rascunho.');
      return res.redirect(voltar);
    }
    const v = new Validador(req.body);
    v.campo('funcao', 'Função').obrigatorio().max(250);
    v.campo('tier_nivel', 'Nível').obrigatorio().max(50);
    v.campo('quantidade', 'Quantidade').obrigatorio().numero({ min: 1, max: 1000, inteiro: true });
    v.campo('custo_mensal_est', 'Custo mensal unitário').obrigatorio().numero({ min: 0 });
    if (req.body.inicio_previsto && !/^\d{4}-\d{2}$/.test(req.body.inicio_previsto)) v.erros.inicio_previsto = 'Mês de início inválido.';
    if (!v.valido) {
      req.flash('erro', Object.values(v.erros).join(' '));
      return res.redirect(voltar);
    }
    await CenarioModel.adicionarItem(cenario.id_cenario, {
      funcao: req.body.funcao.trim(),
      tier_nivel: req.body.tier_nivel.trim(),
      quantidade: Number(req.body.quantidade),
      custo_mensal_est: paraNumero(req.body.custo_mensal_est),
      inicio_previsto: req.body.inicio_previsto || null,
    });
    req.flash('sucesso', 'Recurso adicionado ao cenário.');
    res.redirect(voltar);
  },

  async removerItem(req, res) {
    const item = await CenarioModel.buscarItem(idParam(req.params.idItem));
    if (!item) throw naoEncontrado('Item');
    const cenario = await CenarioModel.buscarPorId(item.id_cenario);
    if (cenario.status !== 'RASCUNHO') {
      req.flash('erro', 'Só é possível alterar cenários em rascunho.');
    } else {
      await CenarioModel.removerItem(item.id_item_cenario);
      req.flash('sucesso', 'Recurso removido do cenário.');
    }
    res.redirect(`/simulador-orcamento?cenario=${item.id_cenario}`);
  },

  async statusCenario(req, res) {
    const cenario = await CenarioModel.buscarPorId(idParam(req.params.id));
    if (!cenario) throw naoEncontrado('Cenário');
    if (!STATUS_CENARIO.includes(req.body.status)) throw new ErroHttp(400, 'Status inválido.');
    await CenarioModel.atualizarStatus(cenario.id_cenario, req.body.status);
    const textos = { APROVADO: 'aprovado', REJEITADO: 'rejeitado', RASCUNHO: 'reaberto como rascunho' };
    req.flash('sucesso', `Cenário "${cenario.nome_cenario}" ${textos[req.body.status]}.`);
    res.redirect(`/simulador-orcamento?cenario=${cenario.id_cenario}`);
  },

  async excluirCenario(req, res) {
    const cenario = await CenarioModel.buscarPorId(idParam(req.params.id));
    if (!cenario) throw naoEncontrado('Cenário');
    await CenarioModel.excluir(cenario.id_cenario);
    req.flash('sucesso', `Cenário "${cenario.nome_cenario}" excluído.`);
    res.redirect('/simulador-orcamento');
  },
});