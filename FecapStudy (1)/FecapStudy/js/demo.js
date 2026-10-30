/* Demonstração das Missões 1–8 (programa principal de teste). Retorna linhas de texto. */
"use strict";
function executarDemonstracao() {
  const out = [];
  const log = (...t) => out.push(t.join(" "));

  log("=== Missão 1 — Disciplina ===");
  const poo = new Disciplina("ADS201", "Programação Orientada a Objetos", "Computação", 4);
  const bd = new Disciplina("ADS202", "Banco de Dados e Modelagem SQL", "Dados", 4);
  const pi = new Disciplina("ADS203", "Projeto Interdisciplinar (PI)", "Prática", -4); // corrige para 2h
  [poo, bd, pi].forEach((d) => log(d.exibirResumo()));

  log("\n=== Missão 2 — MetaEstudo (encapsulamento) ===");
  const meta = new MetaEstudo(100);
  log("registrarAvanco(-20):", meta.registrarAvanco(-20), "| registrarAvanco(900):", meta.registrarAvanco(900), "| cumpridos:", meta.getMinutosCumpridos());
  log("registrarAvanco(60):", meta.registrarAvanco(60), "| percentual:", meta.calcularPercentual() + "%");
  log("new MetaEstudo(5) vira", new MetaEstudo(5).getMetaMinutosSemana(), "| new MetaEstudo(99999) vira", new MetaEstudo(99999).getMetaMinutosSemana());

  log("\n=== Missão 3 — Usuario abstrata + herança ===");
  try { new Usuario(0, "x", "x", "x"); } catch (e) { log("new Usuario():", e.message); }
  const admin = new Administrador(1, "Profa. Helena", "helena@fecap.br", "adm", "Coordenação PI");
  const resp = new Responsavel(2, "Carlos Silva", "carlos@email.com", "123", "Pai");
  const lucas = new Discente(3, "Lucas Silva", "lucas@edu.fecap.br", "abc", "RA-2026101");
  [admin, resp, lucas].forEach((u) => log(u.obterTipoPerfil().padEnd(13), "|", u.gerarPainelResumo()));
  log("autenticar('abc'):", lucas.autenticar("abc"), "| getSenha existe?", typeof lucas.getSenha);

  log("\n=== Missão 4 — Polimorfismo dinâmico ===");
  const sessoes = [new SessaoPomodoro(poo, 50, 2), new SessaoExercicios(bd, 25, 10, 8), new SessaoLeitura(pi, 40, 12, true)];
  let xp = 0;
  for (const s of sessoes) { log(s.gerarFeedback()); xp += s.calcularXp(); }
  log("XP total:", xp);

  log("\n=== Missão 5 — Sobrecarga de registrarEstudo ===");
  lucas.registrarEstudo(sessoes[0]);
  lucas.registrarEstudo(bd, 60);
  lucas.registrarEstudo(poo, 19, 21, 30);
  lucas.getHistorico().forEach((s) => log(" •", s.gerarFeedback()));
  log(lucas.gerarPainelResumo());

  log("\n=== Missão 6 — Interfaces ===");
  const saida = (canal, dest, msg) => log(`[${canal}] -> ${dest}: ${msg}`);
  const email = new NotificadorEmail(saida), zap = new NotificadorWhatsApp(saida);
  log("NotificadorEmail cumpre INotificador?", implementa(email, INotificador), "| SessaoPomodoro cumpre IExportavelJson?", implementa(sessoes[0], IExportavelJson));
  log("paraJson():", sessoes[0].paraJson());
  log("MetaEstudo.paraJson():", meta.paraJson());

  log("\n=== Missão 7 — Associação e Agregação ===");
  resp.vincularDiscente(lucas, meta); resp.vincularDiscente(lucas);
  log("Discentes do responsável (sem duplicar):", resp.getDiscentes().length);
  const trilha = new TrilhaEstudo("Trilha 2º Semestre ADS", admin);
  [poo, bd, pi, poo].forEach((d) => trilha.adicionarDisciplina(d));
  log(trilha.getTitulo(), "->", trilha.getDisciplinas().length, "disciplinas,", trilha.calcularCargaHorariaTotal(), "h/semana");

  log("\n=== Missão 8 — Composição e Dependência ===");
  const plano = new PlanoEstudo();
  plano.adicionarItem("Segunda", 60); plano.adicionarItem("Quarta", 45);
  log("Plano:", JSON.stringify(plano.listarResumo()), "| total:", plano.calcularMinutosPlanejados(), "min");
  const servico = new ServicoAlertaResponsavel();
  servico.avaliarDiscente(lucas, meta, resp, email);
  meta.registrarAvanco(60);
  servico.avaliarDiscente(lucas, meta, resp, zap);
  return out.join("\n");
}
