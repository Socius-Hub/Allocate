/*

  OBS: Utilitários de Formatação e Parsing (formatadores).
       Fornece funções de formatação monetária, numérica, de datas, horários, conversões para inputs,
       cálculo de percentuais, mapeamento de badges de status e funções de conversão para dados de base de dados.
       (Disponibilizado globalmente nas views EJS através de `app.locals.fmt`)

 */

//Array com as abreviações textuais dos meses
const MESES = [
  "Jan",
  "Fev",
  "Mar",
  "Abr",
  "Mai",
  "Jun",
  "Jul",
  "Ago",
  "Set",
  "Out",
  "Nov",
  "Dez",
];

//Formata um número para o padrão numérico brasileiro
const numeroBR = (v, casas = 2) =>
  Number(v || 0).toLocaleString("pt-BR", {
    minimumFractionDigits: casas,
    maximumFractionDigits: casas,
  });

//Converte diversos formatos de data (string ISO, objetos Date, strings YYYY-MM-DD) num objeto Date seguro
const paraData = (d) => {
  if (!d) return null;
  if (d instanceof Date) return isNaN(d.getTime()) ? null : d;

  // 'AAAA-MM-DD' (coluna DATE) -> data local, sem deslocamento de fuso
  if (/^\d{4}-\d{2}-\d{2}$/.test(d)) {
    const [a, m, dia] = d.split("-").map(Number);
    const dataLocal = new Date(a, m - 1, dia);
    return isNaN(dataLocal.getTime()) ? null : dataLocal;
  }

  const dataParsed = new Date(d);
  return isNaN(dataParsed.getTime()) ? null : dataParsed;
};

//Garante que um número ou string tenha sempre dois dígitos, preenchendo com zero à esquerda se necessário
const dois = (n) => String(n).padStart(2, "0");

//Objeto principal contendo todas as funções de formatação para as views
export const fmt = {
  // 1234.5 -> "R$ 1.234,50"
  moeda: (v) => `R$ ${numeroBR(v)}`,

  // 15400000 -> "R$ 15,4M" | 150000 -> "R$ 150 mil"
  moedaCurta(v) {
    const n = Number(v || 0);
    if (Math.abs(n) >= 1e6) return `R$ ${numeroBR(n / 1e6, 1)}M`;
    if (Math.abs(n) >= 1e4) return `R$ ${numeroBR(n / 1e3, 0)} mil`;
    return `R$ ${numeroBR(n, 0)}`;
  },

  numero: (v, casas = 0) => numeroBR(v, casas),

  //Formata uma data para o padrão de exibição DD/MM/AAAA
  data(d) {
    const x = paraData(d);
    return x
      ? `${dois(x.getDate())}/${dois(x.getMonth() + 1)}/${x.getFullYear()}`
      : "—";
  },

  //Formata uma data para o padrão curto descritivo (ex: "15 Out 2026")
  dataCurta(d) {
    const x = paraData(d);
    return x
      ? `${dois(x.getDate())} ${MESES[x.getMonth()]} ${x.getFullYear()}`
      : "—";
  },

  //Formata uma data e hora para o padrão DD/MM/AAAA HH:mm
  dataHora(d) {
    const x = paraData(d);
    return x
      ? `${fmt.data(x)} ${dois(x.getHours())}:${dois(x.getMinutes())}`
      : "—";
  },

  // Período de um evento: "10 Mar 2027" ou "10–12 Mar 2027"
  periodo(inicio, fim) {
    const a = paraData(inicio);
    const b = paraData(fim);
    if (!a) return "—";
    if (!b || a.toDateString() === b.toDateString()) return fmt.dataCurta(a);
    if (a.getMonth() === b.getMonth() && a.getFullYear() === b.getFullYear())
      return `${dois(a.getDate())}–${dois(b.getDate())} ${MESES[a.getMonth()]} ${a.getFullYear()}`;
    return `${fmt.dataCurta(a)} – ${fmt.dataCurta(b)}`;
  },

  //Formata uma data/hora para preenchimento de `<input type="datetime-local">`
  inputDataHora(d) {
    const x = paraData(d);
    if (!x) return typeof d === "string" ? d : "";
    return `${x.getFullYear()}-${dois(x.getMonth() + 1)}-${dois(x.getDate())}T${dois(x.getHours())}:${dois(x.getMinutes())}`;
  },

  //Formata uma data para preenchimento de `<input type="date">`
  inputData(d) {
    const x = paraData(d);
    if (!x) return typeof d === "string" ? d : "";
    return `${x.getFullYear()}-${dois(x.getMonth() + 1)}-${dois(x.getDate())}`;
  },

  //Extrai as iniciais de um nome, removendo tratamentos médicos/profissionais (ex: "Dra. Ana Silva" -> "AS")
  iniciais(nome = "") {
    const partes = String(nome)
      .replace(/^(dr|dra|enf|prof)\.?\s+/i, "")
      .trim()
      .split(/\s+/);
    return (
      (partes[0]?.[0] || "") +
      (partes.length > 1 ? partes[partes.length - 1][0] : "")
    ).toUpperCase();
  },

  //Calcula o percentual de uma parte em relação ao total
  percentual(parte, total) {
    const t = Number(total);
    return t > 0 ? Math.round((Number(parte) / t) * 100) : 0;
  },

  // Rótulo e classes CSS de cada status, para os "badges"
  status(valor) {
    const mapa = {
      ATIVO:        ['Ativo',        'bg-[#E6F4EA] text-[#006341] border-primary/20'],
      PLANEJAMENTO: ['Planejamento', 'bg-tertiary-fixed/30 text-tertiary border-tertiary/20'],
      CONCLUIDO:    ['Concluído',    'bg-surface-container-high text-on-surface-variant border-outline-variant'],
      CANCELADO:    ['Cancelado',    'bg-error-container text-on-error-container border-error/20'],
      INATIVO:      ['Inativo',      'bg-surface-container-high text-on-surface-variant border-outline-variant'],
      BLOQUEADO:    ['Bloqueado',    'bg-error-container text-on-error-container border-error/20'],
      RASCUNHO:     ['Rascunho',     'bg-surface-container-high text-on-surface-variant border-outline-variant'],
      ENCERRADO:    ['Encerrado',    'bg-error-container text-on-error-container border-error/20'],
      SOLICITADO:   ['Solicitada',   'bg-[#fef0c7] text-[#b54708] border-[#fec84b]'],
      APROVADO:     ['Aprovada',     'bg-[#ecfdf3] text-[#027a48] border-[#a6f4c5]'],
      PAGO:         ['Paga',         'bg-primary-container text-on-primary-container border-primary'],
      REJEITADO:    ['Rejeitada',    'bg-error-container text-on-error-container border-[#fec3c6]'],
      FECHADO:      ['Fechado',      'bg-surface-container-high text-on-surface-variant border-outline-variant'],
      CRITICO:      ['Crítico',      'bg-error-container text-on-error-container border-error/20'],
      ATENCAO:      ['Atenção',      'bg-secondary-fixed-dim/30 text-secondary border-secondary/20'],
      NORMAL:       ['Normal',       'bg-primary-container/10 text-primary border-primary/20'],
    };
    const [rotulo, classe] = mapa[valor] || [
      valor,
      "bg-surface-container-high text-on-surface-variant border-outline-variant",
    ];
    return { rotulo, classe };
  },
};

//*Converte strings numéricas formatadas (ex: "1.234,56", "1234.56" ou "R$ 1.234") num tipo Number puro (NaN se inválido)
export function paraNumero(valor) {
  if (valor === undefined || valor === null || valor === "") return NaN;
  if (typeof valor === "number") return valor;
  let s = String(valor).replace(/R\$|\s/g, "");
  if (s.includes(",")) s = s.replace(/\./g, "").replace(",", ".");
  return s === "" ? NaN : Number(s);
}

//Converte strings de formulários datetime-local ('AAAA-MM-DDTHH:mm')
//para o formato compatível com bases de dados ('AAAA-MM-DD HH:mm:00')
export function paraDataHoraSQL(valor) {
  if (!valor) return null;
  const s = String(valor).replace("T", " ");
  return s.length === 16 ? `${s}:00` : s;
}
