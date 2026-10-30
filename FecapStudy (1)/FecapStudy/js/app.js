/* ============================================================================
   Missões 9 e 10 — Interface (DOM) + integração com o backend.
   Regra de ouro: a tela só LÊ controles, instancia objetos e pede para eles calcularem.
   ============================================================================ */
"use strict";

const $ = (id) => document.getElementById(id);
const cliente = new ClienteBackendEstudo("http://localhost:5080");
const servicoAlerta = new ServicoAlertaResponsavel();

/* ---------- Estado da aplicação (objetos de domínio) ---------- */
const estado = {
  online: false,
  catalogo: [],
  admin: null,
  responsavel: null,
  discentes: [],
  metas: new Map(),      // id do discente -> MetaEstudo
  planos: new Map(),     // id do discente -> PlanoEstudo
  trilha: null,
  atual: null,
  sync: new Map(),       // SessaoEstudo -> "ok" | "erro" | "local"
  alertas: [],
  usuario: null,         // registro (DTO) do usuário logado
  dados: null,           // últimos dados carregados (usuarios, disciplinas, metas)
};

const CODIGOS_PADRAO = { "Programação Orientada a Objetos": "ADS201", "Banco de Dados e Modelagem SQL": "ADS202", "Projeto Interdisciplinar (PI)": "ADS203" };

function dadosDemonstracao() {
  return {
    usuarios: [
      { id: 1, nome: "Profa. Helena (Coordenação)", email: "helena@fecap.br", tipoPerfil: "Administrador", matriculaOuCargo: "Coordenação PI" },
      { id: 2, nome: "Carlos Silva (Pai do Lucas)", email: "carlos@email.com", tipoPerfil: "Responsavel", matriculaOuCargo: "Responsável Legal" },
      { id: 3, nome: "Lucas Silva", email: "lucas.silva@edu.fecap.br", tipoPerfil: "Discente", matriculaOuCargo: "RA-2026101", responsavelNome: "Carlos Silva (Pai do Lucas)" },
      { id: 4, nome: "Mariana Costa", email: "mariana.costa@edu.fecap.br", tipoPerfil: "Discente", matriculaOuCargo: "RA-2026102", responsavelNome: "Carlos Silva (Pai do Lucas)" },
    ],
    disciplinas: [
      { id: 1, nome: "Programação Orientada a Objetos", categoria: "Computação", cargaHorariaSemanal: 4 },
      { id: 2, nome: "Banco de Dados e Modelagem SQL", categoria: "Dados", cargaHorariaSemanal: 4 },
      { id: 3, nome: "Projeto Interdisciplinar (PI)", categoria: "Prática", cargaHorariaSemanal: 6 },
    ],
    metas: [
      { id: 1, discenteNome: "Lucas Silva", responsavelNome: "Carlos Silva (Pai do Lucas)", metaMinutosSemana: 180, minutosCumpridos: 75 },
      { id: 2, discenteNome: "Mariana Costa", responsavelNome: "Carlos Silva (Pai do Lucas)", metaMinutosSemana: 240, minutosCumpridos: 90 },
    ],
  };
}

/* ---------- Utilidades de UI ---------- */
function toast(texto, tipo = "info") {
  const el = document.createElement("div");
  el.className = `toast ${tipo}`;
  el.textContent = texto;
  $("toasts").appendChild(el);
  setTimeout(() => el.classList.add("sai"), 3600);
  setTimeout(() => el.remove(), 4000);
}
function li(texto, classe) {
  const e = document.createElement("li");
  e.textContent = texto;
  if (classe) e.className = classe;
  return e;
}
function opcao(valor, texto) { const o = document.createElement("option"); o.value = valor; o.textContent = texto; return o; }
const num = (id) => Number($(id).value);

/* ---------- Construção dos objetos a partir dos dados (servidor ou demonstração) ---------- */
function montarDominio(dados) {
  estado.dados = dados;
  estado.catalogo = dados.disciplinas.map((d, i) =>
    new Disciplina(CODIGOS_PADRAO[d.nome] ?? `SRV${String(d.id ?? i + 1).padStart(3, "0")}`, d.nome, d.categoria, d.cargaHorariaSemanal));

  const u = dados.usuarios, eu = estado.usuario;
  const dto = (x) => [x.id, x.nome, x.email, "", x.matriculaOuCargo];
  const a = eu?.tipoPerfil === "Administrador" ? eu : u.find((x) => x.tipoPerfil === "Administrador");
  let discentesDto = u.filter((x) => x.tipoPerfil === "Discente");
  let r = eu?.tipoPerfil === "Responsavel" ? eu : null;
  if (eu?.tipoPerfil === "Discente") {
    discentesDto = discentesDto.filter((x) => x.id === eu.id);
    r = u.find((x) => x.tipoPerfil === "Responsavel" && x.nome === eu.responsavelNome);
  } else if (r) {
    discentesDto = discentesDto.filter((x) => x.responsavelNome === r.nome);
  }
  r = r ?? u.find((x) => x.tipoPerfil === "Responsavel");

  estado.admin = a ? new Administrador(...dto(a)) : new Administrador(0, "Administração", "admin@fecap.br", "", "Coordenação");
  estado.responsavel = r ? new Responsavel(...dto(r)) : new Responsavel(0, "Responsável não vinculado", "", "", "—");

  estado.discentes = discentesDto.map((x) => new Discente(x.id, x.nome, x.email, "", x.matriculaOuCargo || "—"));
  estado.metas.clear(); estado.planos.clear();
  for (const d of estado.discentes) {
    // o servidor pode ter linhas duplicadas por discente: vale a mais recente (maior id)
    const linhas = dados.metas.filter((m) => m.discenteNome === d.getNome()).sort((p, q) => p.id - q.id);
    const m = linhas[linhas.length - 1];
    const meta = m ? MetaEstudo.restaurar(m.metaMinutosSemana, m.minutosCumpridos) : new MetaEstudo(180);
    estado.metas.set(d.getId(), meta);
    estado.planos.set(d.getId(), new PlanoEstudo());
    estado.responsavel.vincularDiscente(d, meta);
  }
  estado.trilha = new TrilhaEstudo("Trilha 2º Semestre ADS", estado.admin);
  estado.catalogo.forEach((d) => estado.trilha.adicionarDisciplina(d));
  estado.atual = estado.discentes[0] ?? null;
}

async function carregarDados() {
  try {
    const [status, usuarios, disciplinas, metas] = await Promise.all([
      cliente.obterStatus(), cliente.listarUsuarios(), cliente.listarDisciplinas(), cliente.listarMetas(),
    ]);
    estado.online = true;
    mostrarConexao(status);
    montarDominio({ usuarios, disciplinas, metas });
  } catch (e) {
    estado.online = false;
    mostrarConexao(null);
    montarDominio(dadosDemonstracao());
  }
  if (estado.usuario) renderTudo();
}

function mostrarConexao(status) {
  const ok = !!status;
  $("conexaoPonto").className = "ponto " + (ok ? (status.usandoMySql ? "mysql" : "json") : "off");
  $("conexaoTexto").textContent = ok ? `Online · ${status.modoBanco}` : "Backend offline";
  $("avisoOffline").hidden = ok;
  $("loginStatus").textContent = ok ? `Conectado ao backend · ${status.modoBanco}` : "Backend offline — o login usará contas de demonstração.";
  $("loginStatus").className = "login-status " + (ok ? "on" : "off");
}

/* ---------- Renderização ---------- */
function renderTudo() {
  renderSelects();
  renderPerfis();
  renderMeta();
  renderHistorico();
  renderAlertas();
  renderTrilha();
  renderPlano();
}

function renderSelects() {
  const sd = $("selDiscente"), antes = sd.value;
  sd.replaceChildren(...estado.discentes.map((d) => opcao(d.getId(), d.getNome())));
  if (estado.atual) sd.value = estado.atual.getId();
  else if (antes) sd.value = antes;
  const sp = $("selDisciplina"), disc = sp.value;
  sp.replaceChildren(...estado.catalogo.map((d, i) => opcao(i, `${d.getCodigo()} · ${d.getNome()}`)));
  if (disc) sp.value = disc;
}

function renderPerfis() {
  $("resumoDiscente").textContent = estado.atual ? estado.atual.gerarPainelResumo() : "—";
  $("resumoResponsavel").textContent = estado.responsavel.gerarPainelResumo();
  $("resumoAdmin").textContent = estado.admin.gerarPainelResumo();
}

function temDiscente() {
  if (estado.atual) return true;
  toast("Nenhum discente vinculado a este perfil.", "erro");
  return false;
}
function metaAtual() { return estado.metas.get(estado.atual.getId()); }

function renderMeta() {
  if (!estado.atual) return;
  const m = metaAtual(), pct = m.calcularPercentual();
  $("barraFill").style.width = pct + "%";
  $("barraFill").classList.toggle("cheia", m.estaCumprida());
  $("barra").setAttribute("aria-valuenow", pct);
  $("metaTexto").textContent = `${pct}% — ${m.getMinutosCumpridos()} de ${m.getMetaMinutosSemana()} min` + (m.estaCumprida() ? " · meta cumprida! 🎉" : "");
  $("inpNovaMeta").value = m.getMetaMinutosSemana();
}

function renderHistorico() {
  const ul = $("listaHistorico");
  const hist = estado.atual ? estado.atual.getHistorico().reverse() : [];
  if (!hist.length) { ul.replaceChildren(li("Nenhuma sessão registrada ainda nesta tela.", "vazio")); return; }
  ul.replaceChildren(...hist.map((s) => {
    const e = li(s.gerarFeedback());
    const tag = document.createElement("span");
    const st = estado.sync.get(s) ?? "local";
    tag.className = "tag " + st;
    tag.textContent = st === "ok" ? "salvo no servidor" : st === "erro" ? "falha ao salvar" : "só local";
    e.appendChild(tag);
    return e;
  }));
}

function renderAlertas() {
  const ul = $("listaAlertas");
  if (!estado.alertas.length) { ul.replaceChildren(li("Nenhum alerta enviado.", "vazio")); return; }
  ul.replaceChildren(...estado.alertas.slice(-6).reverse().map((a) => li(`[${a.canal}] ${a.dest}: ${a.msg}`)));
}

function renderTrilha() {
  $("trilhaTitulo").textContent = `${estado.trilha.getTitulo()} · coord.: ${estado.trilha.getAdministrador().getNome()}`;
  $("listaTrilha").replaceChildren(...estado.trilha.getDisciplinas().map((d) => li(d.exibirResumo())));
  $("trilhaCarga").textContent = `Carga horária total: ${estado.trilha.calcularCargaHorariaTotal()} h/semana`;
}

function renderPlano() {
  if (!estado.atual) return;
  const p = estado.planos.get(estado.atual.getId());
  const itens = p.listarResumo();
  $("listaPlano").replaceChildren(...(itens.length ? itens.map((i) => li(`${i.dia}: ${i.minutos} min`)) : [li("Plano vazio.", "vazio")]));
  $("planoTotal").textContent = `${estado.atual.getNome()} · planejado: ${p.calcularMinutosPlanejados()} min/semana`;
}

/* ---------- Ações: registrar estudo (Missões 9 e 10) ---------- */
function criarSessaoDoFormulario() {
  const disciplina = estado.catalogo[num("selDisciplina")];
  const minutos = num("inpDuracao");
  switch ($("selModalidade").value) {
    case "Exercicios": return new SessaoExercicios(disciplina, minutos, num("inpQuestoes"), num("inpAcertos"));
    case "Leitura":    return new SessaoLeitura(disciplina, minutos, num("inpPaginas"), $("chkResumo").checked);
    default:           return new SessaoPomodoro(disciplina, minutos, num("inpCiclos"));
  }
}

/** Núcleo compartilhado: valida a meta, registra nos objetos e envia ao backend. */
async function concluirRegistro(obterSessao, minutos) {
  if (!estado.atual) return;
  const meta = metaAtual();
  if (!meta.registrarAvanco(minutos)) {
    toast("Duração inválida: use de 1 a 480 minutos por sessão.", "erro");
    return;
  }
  let sessao;
  try { sessao = obterSessao(); }
  catch (e) { toast(e.message, "erro"); return; }
  estado.sync.set(sessao, "local");
  renderTudo();
  toast(`+${sessao.calcularXp()} XP! ${sessao.obterModalidade()} registrado.`, "ok");

  try {
    await cliente.salvarSessao(sessao);
    estado.sync.set(sessao, "ok");
  } catch (e) {
    estado.sync.set(sessao, "erro");
    toast("Registrado na tela, mas não foi salvo no backend: " + e.message, "erro");
  }
  renderHistorico();
}

function ligarEventos() {
  document.querySelectorAll(".aba").forEach((b) => b.addEventListener("click", () => {
    document.querySelectorAll(".aba").forEach((x) => x.classList.toggle("ativa", x === b));
    document.querySelectorAll(".painel").forEach((p) => p.classList.toggle("ativo", p.id === "aba-" + b.dataset.aba));
  }));

  $("selModalidade").addEventListener("change", () => {
    document.querySelectorAll(".extra").forEach((e) => { e.hidden = e.dataset.modalidade !== $("selModalidade").value; });
  });
  $("selDiscente").addEventListener("change", () => {
    estado.atual = estado.discentes.find((d) => String(d.getId()) === $("selDiscente").value);
    renderTudo();
  });

  $("formSessao").addEventListener("submit", (ev) => {
    ev.preventDefault();
    const min = num("inpDuracao");
    concluirRegistro(() => estado.atual.registrarEstudo(criarSessaoDoFormulario()), min);
  });
  $("formRapido").addEventListener("submit", (ev) => {
    ev.preventDefault();
    const d = estado.catalogo[num("selDisciplina")], min = num("inpRapidoMin");
    concluirRegistro(() => estado.atual.registrarEstudo(d, min), min);
  });
  $("formHorario").addEventListener("submit", (ev) => {
    ev.preventDefault();
    const d = estado.catalogo[num("selDisciplina")], ini = num("inpHoraIni"), fim = num("inpHoraFim");
    concluirRegistro(() => estado.atual.registrarEstudo(d, ini, fim, num("inpHoraPag")), (fim - ini) * 60);
  });

  $("btnNotificar").addEventListener("click", () => {
    if (!temDiscente()) return;
    const canal = $("selCanal").value;
    const saida = (c, dest, msg) => { estado.alertas.push({ canal: c, dest, msg }); };
    const notificador = canal === "WhatsApp" ? new NotificadorWhatsApp(saida) : canal === "Painel" ? new NotificadorPainel(saida) : new NotificadorEmail(saida);
    const ok = servicoAlerta.avaliarDiscente(estado.atual, metaAtual(), estado.responsavel, notificador);
    renderAlertas();
    const ult = estado.alertas[estado.alertas.length - 1];
    toast(ok ? `${canal}: ${ult.msg}` : "Falha ao enviar alerta.", ok ? "ok" : "erro");
  });

  $("formMeta").addEventListener("submit", async (ev) => {
    ev.preventDefault();
    if (!temDiscente()) return;
    const meta = metaAtual();
    meta.redefinirMeta(num("inpNovaMeta"));
    renderMeta();
    try {
      await cliente.salvarMeta(meta, estado.atual.getNome(), estado.responsavel.getNome());
      toast(`Meta de ${meta.getMetaMinutosSemana()} min salva no servidor.`, "ok");
    } catch (e) { toast("Meta ajustada na tela, mas não salva no backend: " + e.message, "erro"); }
  });

  $("btnCarregarHistorico").addEventListener("click", carregarServidor);
  $("btnReconectar").addEventListener("click", async () => { toast("Atualizando dados do backend…"); await carregarDados(); if (estado.online) toast("Dados atualizados.", "ok"); });

  $("formDisciplina").addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const d = new Disciplina($("inpDiscCodigo").value.trim(), $("inpDiscNome").value.trim(), $("inpDiscCat").value.trim(), num("inpDiscHoras"));
    estado.catalogo.push(d);
    estado.trilha.adicionarDisciplina(d);
    renderSelects(); renderTrilha();
    ev.target.reset();
    try { await cliente.salvarDisciplina(d); toast("Disciplina salva no servidor.", "ok"); }
    catch (e) { toast("Disciplina só na tela (backend: " + e.message + ")", "erro"); }
  });

  $("formPlano").addEventListener("submit", (ev) => {
    ev.preventDefault();
    if (!temDiscente()) return;
    const ok = estado.planos.get(estado.atual.getId()).adicionarItem($("selDia").value, num("inpPlanoMin"));
    if (!ok) toast("Informe dia e minutos válidos.", "erro");
    renderPlano();
  });

  $("btnMissoes").addEventListener("click", () => { $("consoleMissoes").textContent = executarDemonstracao(); });
}

/* ---------- Missão 10: GET no servidor ---------- */
async function carregarServidor() {
  if (!temDiscente()) return;
  const nome = estado.atual.getNome();
  try {
    const [sessoes, rel] = await Promise.all([cliente.listarSessoes(nome), cliente.obterRelatorio(nome)]);
    const box = $("relatorio");
    box.hidden = false;
    box.replaceChildren();
    [["Sessões", rel.totalSessoes], ["Minutos estudados", rel.totalMinutosEstudados], ["XP acumulado", rel.totalXpAcumulado],
     ["Meta semanal", rel.metaMinutosSemana + " min"], ["Meta concluída", rel.percentualMetaConcluida + "%"]].forEach(([k, v]) => {
      const c = document.createElement("div"); c.className = "kpi";
      const a = document.createElement("small"); a.textContent = k;
      const b = document.createElement("b"); b.textContent = v;
      c.append(a, b); box.appendChild(c);
    });
    const st = document.createElement("p"); st.className = "status-rel"; st.textContent = rel.statusAcompanhamento; box.appendChild(st);

    const tb = $("tabelaSessoes");
    tb.hidden = false;
    tb.tBodies[0].replaceChildren(...sessoes.map((s) => {
      const tr = document.createElement("tr");
      [s.id, s.dataRegistro, s.disciplina, s.tipoModalidade, s.duracaoMinutos, s.xpGanho, s.resumoFeedback].forEach((v) => {
        const td = document.createElement("td"); td.textContent = v; tr.appendChild(td);
      });
      return tr;
    }));
    $("servidorInfo").textContent = `${sessoes.length} sessão(ões) de ${nome} lidas de ${cliente.getUrlBase()}.`;
  } catch (e) {
    toast("Não foi possível ler o servidor: " + e.message, "erro");
  }
}

/* ============================================================================
   Login / cadastro — integrado a GET /api/usuarios e POST /api/usuarios.
   O backend não possui senha nem token: o "código de acesso" é o campo
   matriculaOuCargo (RA, cargo...) gravado no servidor e conferido aqui.
   ============================================================================ */
const CHAVE_SESSAO = "fecapstudy.email";
const lerSessao = () => { try { return sessionStorage.getItem(CHAVE_SESSAO); } catch { return null; } };
const gravarSessao = (v) => { try { v ? sessionStorage.setItem(CHAVE_SESSAO, v) : sessionStorage.removeItem(CHAVE_SESSAO); } catch { /* sem storage */ } };
const norm = (t) => (t ?? "").trim().toLowerCase();

function erroLogin(msg) { const e = $("loginErro"); e.textContent = msg; e.hidden = !msg; }

async function obterUsuarios() {
  try { const u = await cliente.listarUsuarios(); estado.online = true; return u; }
  catch { estado.online = false; return dadosDemonstracao().usuarios; }
}

function aplicarPerfil() {
  const u = estado.usuario, tipo = u.tipoPerfil;
  $("telaLogin").hidden = true;
  $("app").hidden = false;
  $("usuarioChip").hidden = false;
  $("usuarioNome").textContent = u.nome;
  $("usuarioPerfil").textContent = tipo === "Responsavel" ? "Responsável" : tipo;
  $("btnSair").hidden = false;
  // o que cada perfil pode fazer
  $("selDiscente").closest(".campo").hidden = tipo === "Discente";
  $("formMeta").hidden = tipo === "Discente";
  $("formDisciplina").hidden = tipo !== "Administrador";
  document.querySelector(".aba[data-aba=missoes]").hidden = tipo !== "Administrador";
  document.querySelector(".aba.ativa")?.click();
  renderTudo();
}

async function entrar(usuario) {
  estado.usuario = usuario;
  gravarSessao(usuario.email);
  await carregarDados();
  aplicarPerfil();
}

function sair() {
  gravarSessao(null);
  estado.usuario = null;
  estado.sync.clear(); estado.alertas = [];
  $("app").hidden = true; $("telaLogin").hidden = false;
  $("usuarioChip").hidden = true; $("btnSair").hidden = true;
  $("formLogin").reset(); erroLogin("");
  document.querySelector(".aba[data-aba=estudar]").click();
}

function ligarLogin() {
  document.querySelectorAll(".login-aba").forEach((b) => b.addEventListener("click", () => {
    document.querySelectorAll(".login-aba").forEach((x) => x.classList.toggle("ativa", x === b));
    $("formLogin").hidden = b.dataset.modo !== "entrar";
    $("formCadastro").hidden = b.dataset.modo !== "cadastrar";
    erroLogin("");
  }));

  $("formLogin").addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const btn = ev.submitter; btn.disabled = true;
    const email = norm($("loginEmail").value), codigo = norm($("loginCodigo").value);
    const lista = await obterUsuarios();
    const u = lista.find((x) => norm(x.email) === email);
    btn.disabled = false;
    if (!u || norm(u.matriculaOuCargo) !== codigo) { erroLogin("E-mail ou código de acesso incorretos."); return; }
    erroLogin("");
    await entrar(u);
    if (!estado.online) toast("Backend offline: entrou em modo demonstração.", "erro");
  });

  $("cadPerfil").addEventListener("change", () => { $("cadRespBox").hidden = $("cadPerfil").value !== "Discente"; });

  $("formCadastro").addEventListener("submit", async (ev) => {
    ev.preventDefault();
    const btn = ev.submitter; btn.disabled = true;
    try {
      const lista = await cliente.listarUsuarios();
      const email = $("cadEmail").value.trim();
      if (lista.some((x) => norm(x.email) === norm(email))) { erroLogin("Este e-mail já está cadastrado."); return; }
      const tipo = $("cadPerfil").value;
      const criado = await cliente.salvarUsuario({
        nome: $("cadNome").value.trim(), email, tipoPerfil: tipo,
        matriculaOuCargo: $("cadCodigo").value.trim(),
        responsavelNome: tipo === "Discente" ? $("cadResp").value : "",
      });
      erroLogin("");
      toast("Conta criada no servidor!", "ok");
      await entrar(criado);
    } catch (e) {
      erroLogin(estado.online || e.message !== "Failed to fetch" ? e.message : "Backend offline: não é possível criar conta agora.");
    } finally { btn.disabled = false; }
  });
}

async function preencherResponsaveis() {
  const lista = (await obterUsuarios()).filter((x) => x.tipoPerfil === "Responsavel");
  $("cadResp").replaceChildren(...lista.map((r) => opcao(r.nome, r.nome)), opcao("", "(sem responsável)"));
}

async function iniciar() {
  ligarEventos();
  ligarLogin();
  $("btnSair").addEventListener("click", sair);
  await preencherResponsaveis();
  const lembrado = lerSessao();
  if (lembrado) {
    const u = (await obterUsuarios()).find((x) => norm(x.email) === norm(lembrado));
    if (u) { await entrar(u); return; }
  }
  mostrarConexao(estado.online ? await cliente.obterStatus().catch(() => null) : null);
}
iniciar();
setInterval(async () => { try { mostrarConexao(await cliente.obterStatus()); estado.online = true; } catch { estado.online = false; mostrarConexao(null); } }, 8000);
