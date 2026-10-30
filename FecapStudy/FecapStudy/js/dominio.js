/* ============================================================================
   FecapStudy — Domínio orientado a objetos (Aula 9, Missões 1 a 8)
   JavaScript puro (sem módulos) para funcionar com duplo-clique no index.html.
   ============================================================================ */
"use strict";

/* ---------- Missão 6: "interfaces" em JS (contrato verificado por duck typing) ---------- */
const INotificador = Object.freeze({ nome: "INotificador", metodos: ["obterCanal", "enviarAlerta"] });
const IExportavelJson = Object.freeze({ nome: "IExportavelJson", metodos: ["paraJson"] });

function implementa(obj, contrato) {
  return obj != null && contrato.metodos.every((m) => typeof obj[m] === "function");
}
function exigir(obj, contrato) {
  if (!implementa(obj, contrato)) {
    throw new TypeError(`O objeto não cumpre o contrato ${contrato.nome} (${contrato.metodos.join(", ")}).`);
  }
  return obj;
}

/* ---------- Missão 1: Abstração, Classe e Objeto ---------- */
class Disciplina {
  #codigo; #nome; #categoria; #cargaHorariaSemanalHoras;
  constructor(codigo, nome, categoria, cargaHorariaSemanalHoras) {
    this.#codigo = codigo;
    this.#nome = nome;
    this.#categoria = categoria;
    this.#cargaHorariaSemanalHoras = cargaHorariaSemanalHoras > 0 ? Math.trunc(cargaHorariaSemanalHoras) : 2;
  }
  getCodigo() { return this.#codigo; }
  getNome() { return this.#nome; }
  getCategoria() { return this.#categoria; }
  getCargaHorariaSemanalHoras() { return this.#cargaHorariaSemanalHoras; }
  calcularCargaEmMinutos() { return this.#cargaHorariaSemanalHoras * 60; }
  exibirResumo() {
    return `[${this.#codigo}] ${this.#nome} (${this.#categoria}) — ${this.#cargaHorariaSemanalHoras}h/semana (${this.calcularCargaEmMinutos()} min)`;
  }
}

/* ---------- Missão 2: Encapsulamento ---------- */
class MetaEstudo {
  #metaMinutosSemana = 0;
  #minutosCumpridos = 0;
  static MAX_POR_SESSAO = 480;
  constructor(metaMinutosSemana) { this.redefinirMeta(metaMinutosSemana); }

  /** Única porta de entrada para somar minutos. Retorna false se recusado. */
  registrarAvanco(minutos) {
    if (!Number.isInteger(minutos) || minutos <= 0 || minutos > MetaEstudo.MAX_POR_SESSAO) return false;
    this.#minutosCumpridos += minutos;
    return true;
  }
  redefinirMeta(novaMeta) {
    const n = Number.isFinite(novaMeta) ? Math.trunc(novaMeta) : 30;
    this.#metaMinutosSemana = Math.min(3000, Math.max(30, n));
  }
  getMetaMinutosSemana() { return this.#metaMinutosSemana; }
  getMinutosCumpridos() { return this.#minutosCumpridos; }
  calcularPercentual() {
    return Math.min(100, Math.round((this.#minutosCumpridos * 1000) / this.#metaMinutosSemana) / 10);
  }
  estaCumprida() { return this.#minutosCumpridos >= this.#metaMinutosSemana; }
  /** IExportavelJson */
  paraJson() {
    return JSON.stringify({ metaMinutosSemana: this.#metaMinutosSemana, minutosCumpridos: this.#minutosCumpridos });
  }
  /** Reconstrói uma meta vinda do servidor usando apenas a porta pública (registrarAvanco). */
  static restaurar(metaMinutosSemana, minutosCumpridos) {
    const meta = new MetaEstudo(metaMinutosSemana);
    let resto = Math.max(0, Math.trunc(minutosCumpridos || 0));
    while (resto > 0) {
      const parte = Math.min(resto, MetaEstudo.MAX_POR_SESSAO);
      meta.registrarAvanco(parte);
      resto -= parte;
    }
    return meta;
  }
}

/* ---------- Missão 3: Classe abstrata e Herança ---------- */
class Usuario {
  #id; #nome; #email; #senha;
  constructor(id, nome, email, senha) {
    if (new.target === Usuario) throw new Error("Usuario é abstrata e não pode ser instanciada!");
    this.#id = id; this.#nome = nome; this.#email = email; this.#senha = senha;
  }
  getId() { return this.#id; }
  getNome() { return this.#nome; }
  getEmail() { return this.#email; }
  // (de propósito: NÃO existe getSenha)
  autenticar(senhaDigitada) { return senhaDigitada === this.#senha; }
  obterTipoPerfil() { throw new Error("Método abstrato: obterTipoPerfil()"); }
  gerarPainelResumo() { throw new Error("Método abstrato: gerarPainelResumo()"); }
}

class Administrador extends Usuario {
  #cargo;
  constructor(id, nome, email, senha, cargo) { super(id, nome, email, senha); this.#cargo = cargo; }
  getCargo() { return this.#cargo; }
  obterTipoPerfil() { return "Administrador"; }
  gerarPainelResumo() { return `🛡️ ${this.getNome()} — Administrador (${this.#cargo})`; }
}

class Responsavel extends Usuario {
  #parentesco;
  #discentes = [];            // Associação: Responsavel ——> Discente
  #metas = new Map();         // id do discente -> MetaEstudo
  constructor(id, nome, email, senha, parentesco) { super(id, nome, email, senha); this.#parentesco = parentesco; }
  getParentesco() { return this.#parentesco; }
  obterTipoPerfil() { return "Responsavel"; }
  /** Missão 7: recebe um Discente criado FORA (sem duplicar). */
  vincularDiscente(d, meta = null) {
    if (!(d instanceof Discente)) throw new TypeError("Informe um Discente.");
    if (!this.#discentes.includes(d)) this.#discentes.push(d);
    if (meta) this.#metas.set(d.getId(), meta);
  }
  getDiscentes() { return [...this.#discentes]; }
  getMeta(d) { return this.#metas.get(d.getId()) ?? null; }
  gerarPainelResumo() {
    return `👪 ${this.getNome()} — ${this.#parentesco} · acompanha ${this.#discentes.length} discente(s)`;
  }
}

class Discente extends Usuario {
  #ra; #xpTotal = 0; #historico = [];
  constructor(id, nome, email, senha, ra) { super(id, nome, email, senha); this.#ra = ra; }
  getRa() { return this.#ra; }
  getXpTotal() { return this.#xpTotal; }
  adicionarXp(pontos) { if (Number.isFinite(pontos) && pontos > 0) this.#xpTotal += pontos; }
  getHistorico() { return [...this.#historico]; }
  obterTipoPerfil() { return "Discente"; }
  gerarPainelResumo() { return `🎓 ${this.getNome()} — RA ${this.#ra} · ⭐ ${this.#xpTotal} XP`; }

  /**
   * Missão 5 — Polimorfismo estático (sobrecarga simulada; JS não tem overload nativo):
   *  1) registrarEstudo(sessao)
   *  2) registrarEstudo(disciplina, minutos)                        -> Pomodoro padrão
   *  3) registrarEstudo(disciplina, horaInicio, horaFim, paginas)   -> Leitura com resumo
   * Sempre devolve a SessaoEstudo registrada.
   */
  registrarEstudo(arg1, arg2, arg3, arg4) {
    if (arg1 instanceof SessaoEstudo) {
      arg1.definirDiscente(this);
      this.#historico.push(arg1);
      this.adicionarXp(arg1.calcularXp());
      return arg1;
    }
    if (arg1 instanceof Disciplina && arg3 === undefined) {
      const ciclos = Math.max(1, Math.floor(arg2 / 25));
      return this.registrarEstudo(new SessaoPomodoro(arg1, arg2, ciclos));
    }
    if (arg1 instanceof Disciplina && arg4 !== undefined) {
      const minutos = (arg3 - arg2) * 60;
      if (!(minutos > 0)) throw new RangeError("A hora de fim deve ser maior que a de início.");
      return this.registrarEstudo(new SessaoLeitura(arg1, minutos, arg4, true));
    }
    throw new TypeError("Assinatura de registrarEstudo não suportada.");
  }
}

/* ---------- Missão 4: Polimorfismo dinâmico + Missão 6 (IExportavelJson) ---------- */
class SessaoEstudo {
  #disciplina; #duracaoMinutos; #discente = null;
  constructor(disciplina, duracaoMinutos) {
    if (new.target === SessaoEstudo) throw new Error("SessaoEstudo é abstrata!");
    this.#disciplina = disciplina;
    this.#duracaoMinutos = duracaoMinutos;
  }
  getDisciplina() { return this.#disciplina; }
  getDuracaoMinutos() { return this.#duracaoMinutos; }
  getDiscente() { return this.#discente; }
  definirDiscente(d) { if (this.#discente === null) this.#discente = d; }
  obterModalidade() { throw new Error("Método abstrato: obterModalidade()"); }
  calcularXp() { throw new Error("Método abstrato: calcularXp()"); }
  gerarFeedback() {
    return `${this.obterModalidade()} em ${this.#disciplina.getNome()} (${this.#duracaoMinutos} min) -> +${this.calcularXp()} XP`;
  }
  /** IExportavelJson — formato esperado por POST /api/sessoes */
  paraJson() {
    return JSON.stringify({
      discenteNome: this.#discente ? this.#discente.getNome() : "",
      disciplina: this.#disciplina.getNome(),
      tipoModalidade: this.obterModalidade(),
      duracaoMinutos: this.#duracaoMinutos,
      xpGanho: this.calcularXp(),
      resumoFeedback: this.gerarFeedback(),
    });
  }
}

class SessaoPomodoro extends SessaoEstudo {
  #ciclosCompletos;
  constructor(disciplina, duracaoMinutos, ciclosCompletos) { super(disciplina, duracaoMinutos); this.#ciclosCompletos = ciclosCompletos; }
  obterModalidade() { return "Pomodoro"; }
  calcularXp() { return this.getDuracaoMinutos() * 2 + this.#ciclosCompletos * 15; }
  gerarFeedback() { return `${super.gerarFeedback()} · ${this.#ciclosCompletos} ciclo(s) concluído(s)`; }
}

class SessaoExercicios extends SessaoEstudo {
  #totalQuestoes; #acertos;
  constructor(disciplina, duracaoMinutos, totalQuestoes, acertos) {
    super(disciplina, duracaoMinutos);
    this.#totalQuestoes = totalQuestoes;
    this.#acertos = Math.min(acertos, totalQuestoes);
  }
  obterModalidade() { return "Exercicios"; }
  calcularXp() { return this.getDuracaoMinutos() + this.#acertos * 10; }
  gerarFeedback() {
    const pct = this.#totalQuestoes > 0 ? Math.round((this.#acertos * 100) / this.#totalQuestoes) : 0;
    return `${super.gerarFeedback()} · ${this.#acertos}/${this.#totalQuestoes} acertos (${pct}%)`;
  }
}

class SessaoLeitura extends SessaoEstudo {
  #paginasLidas; #fezResumo;
  constructor(disciplina, duracaoMinutos, paginasLidas, fezResumo) { super(disciplina, duracaoMinutos); this.#paginasLidas = paginasLidas; this.#fezResumo = !!fezResumo; }
  obterModalidade() { return "Leitura"; }
  calcularXp() { return this.getDuracaoMinutos() + this.#paginasLidas * 3 + (this.#fezResumo ? 25 : 0); }
  gerarFeedback() { return `${super.gerarFeedback()} · ${this.#paginasLidas} pág.${this.#fezResumo ? " + resumo" : ""}`; }
}

/* ---------- Missão 6: notificadores (implementam INotificador) ---------- */
class NotificadorBase {
  #saida;
  constructor(saida = (canal, dest, msg) => console.log(`[${canal}] -> ${dest}: ${msg}`)) { this.#saida = saida; }
  obterCanal() { throw new Error("Método abstrato"); }
  enviarAlerta(destinatario, mensagem) {
    if (!destinatario || !mensagem) return false;
    this.#saida(this.obterCanal(), destinatario, mensagem);
    return true;
  }
}
class NotificadorEmail extends NotificadorBase { obterCanal() { return "E-mail"; } }
class NotificadorWhatsApp extends NotificadorBase { obterCanal() { return "WhatsApp"; } }
class NotificadorPainel extends NotificadorBase { obterCanal() { return "Painel"; } }

/* ---------- Missão 7: Agregação ---------- */
class TrilhaEstudo {
  #titulo; #administrador; #disciplinas = [];
  constructor(titulo, administrador) { this.#titulo = titulo; this.#administrador = administrador; }
  getTitulo() { return this.#titulo; }
  getAdministrador() { return this.#administrador; }
  adicionarDisciplina(d) {
    if (!(d instanceof Disciplina)) throw new TypeError("Informe uma Disciplina.");
    if (!this.#disciplinas.includes(d)) this.#disciplinas.push(d);
  }
  getDisciplinas() { return [...this.#disciplinas]; }
  calcularCargaHorariaTotal() { return this.#disciplinas.reduce((s, d) => s + d.getCargaHorariaSemanalHoras(), 0); }
}

/* ---------- Missão 8: Composição e Dependência ---------- */
class ItemCronograma {           // só PlanoEstudo cria instâncias
  #diaSemana; #minutosPlanejados;
  constructor(diaSemana, minutosPlanejados) { this.#diaSemana = diaSemana; this.#minutosPlanejados = minutosPlanejados; }
  getDiaSemana() { return this.#diaSemana; }
  getMinutosPlanejados() { return this.#minutosPlanejados; }
}
class PlanoEstudo {
  #itens = [];
  adicionarItem(diaSemana, minutos) {
    if (!diaSemana || !(minutos > 0)) return false;
    this.#itens.push(new ItemCronograma(diaSemana, Math.trunc(minutos)));
    return true;
  }
  /** Devolve apenas dados primitivos — nunca a lista interna. */
  listarResumo() { return this.#itens.map((i) => ({ dia: i.getDiaSemana(), minutos: i.getMinutosPlanejados() })); }
  calcularMinutosPlanejados() { return this.#itens.reduce((s, i) => s + i.getMinutosPlanejados(), 0); }
}
class ServicoAlertaResponsavel {   // sem campos: depende dos objetos só durante a chamada
  avaliarDiscente(d, meta, resp, notificador) {
    exigir(notificador, INotificador);
    const pct = meta.calcularPercentual();
    const msg = meta.estaCumprida()
      ? `🎉 ${d.getNome()} atingiu 100% da meta semanal! Parabéns!`
      : `${d.getNome()} está com ${pct}% da meta semanal (${meta.getMinutosCumpridos()}/${meta.getMetaMinutosSemana()} min).`;
    return notificador.enviarAlerta(resp.getEmail(), msg);
  }
}

if (typeof module !== "undefined") {
  module.exports = { INotificador, IExportavelJson, implementa, exigir, Disciplina, MetaEstudo, Usuario, Administrador, Responsavel, Discente,
    SessaoEstudo, SessaoPomodoro, SessaoExercicios, SessaoLeitura, NotificadorEmail, NotificadorWhatsApp, NotificadorPainel,
    TrilhaEstudo, PlanoEstudo, ServicoAlertaResponsavel };
}
