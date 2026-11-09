import { paraNumero } from './formatadores.js';

/**
 * Validação simples de formulários no servidor.
 *
 *   const v = new Validador(req.body);
 *   v.campo('email', 'E-mail').obrigatorio().email();
 *   v.campo('capacidade', 'Capacidade').obrigatorio().numero({ min: 1, inteiro: true });
 *   if (!v.valido) -> renderiza o formulário com v.erros
 *
 * As regras (exceto obrigatorio) só são verificadas quando o campo foi preenchido.
 * Apenas o primeiro erro de cada campo é guardado.
 */
export class Validador {
  constructor(dados = {}) {
    this.dados = dados;
    this.erros = {};
    this.nome = null;
    this.rotulo = null;
    this.valor = '';
  }

  campo(nome, rotulo) {
    this.nome = nome;
    this.rotulo = rotulo;
    this.valor = String(this.dados[nome] ?? '').trim();
    return this;
  }

  erro(mensagem) {
    if (this.nome && !this.erros[this.nome]) {
      this.erros[this.nome] = mensagem;
    }
    return this;
  }

  get vazio() {
    return this.valor === '';
  }

  obrigatorio() {
    return this.vazio ? this.erro(`${this.rotulo} é obrigatório.`) : this;
  }

  min(n) {
    return !this.vazio && this.valor.length < n ? this.erro(`${this.rotulo} deve ter pelo menos ${n} caracteres.`) : this;
  }

  max(n) {
    return !this.vazio && this.valor.length > n ? this.erro(`${this.rotulo} deve ter no máximo ${n} caracteres.`) : this;
  }

  email() {
    return !this.vazio && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(this.valor) ? this.erro('Informe um e-mail válido.') : this;
  }

  telefone() {
    const digitos = this.valor.replace(/\D/g, '');
    return !this.vazio && (digitos.length < 10 || digitos.length > 11)
      ? this.erro('Informe um telefone válido com DDD.')
      : this;
  }

  numero({ min, max, inteiro = false } = {}) {
    if (this.vazio) return this;
    const n = paraNumero(this.valor);
    if (Number.isNaN(n)) return this.erro(`${this.rotulo} deve ser um número.`);
    if (inteiro && !Number.isInteger(n)) return this.erro(`${this.rotulo} deve ser um número inteiro.`);
    if (min !== undefined && n < min) return this.erro(`${this.rotulo} deve ser no mínimo ${min}.`);
    if (max !== undefined && n > max) return this.erro(`${this.rotulo} deve ser no máximo ${max}.`);
    return this;
  }

  data() {
    return !this.vazio && Number.isNaN(Date.parse(this.valor)) ? this.erro(`${this.rotulo} é uma data inválida.`) : this;
  }

  em(lista) {
    return !this.vazio && !lista.map(String).includes(this.valor) ? this.erro(`${this.rotulo} possui um valor inválido.`) : this;
  }

  igual(outroCampo, mensagem) {
    return this.valor !== String(this.dados[outroCampo] ?? '').trim() ? this.erro(mensagem) : this;
  }

  get valido() {
    return Object.keys(this.erros).length === 0;
  }
}