# 📚 FecapStudy — Plataforma de Apoio ao Estudo

Fala, professor(a)! Esse é o meu mini-projeto da **Aula 9 (Oficina PBL)** de POO. A ideia do cenário era criar uma plataforma onde o aluno registra o que estudou, o responsável acompanha a meta da semana e a coordenação organiza as disciplinas. Eu fiz tudo em **JavaScript** (HTML + CSS + JS puro) e conectei no **backend em C# + MySQL** que veio pronto na pasta da aula.

---

## 🚀 Como rodar

1. Abre a pasta `Backend` e dá dois cliques no **`iniciar_backend.bat`** (ele sobe em `http://localhost:5080`).
   - Se o seu MySQL tiver senha, é só editar o `mysql_config.txt`. Se o MySQL estiver desligado, o backend usa o arquivo JSON de reserva e as rotas continuam iguais.
2. Dá dois cliques no **`index.html`**. Não precisa instalar nada nem rodar `npm install`, abre direto no navegador.
3. Entra com uma das contas que já vêm no banco:

| Perfil | E-mail | Código de acesso |
|---|---|---|
| Discente | `lucas.silva@edu.fecap.br` | `RA-2026101` |
| Discente | `mariana.costa@edu.fecap.br` | `RA-2026102` |
| Responsável | `carlos@email.com` | `Responsável Legal` |
| Administrador | `helena@fecap.br` | `Coordenação PI` |

Ou então clica em **Criar conta** e cadastra uma nova (ela vai direto pro banco).

> Se o backend estiver desligado, o site avisa e entra em **modo demonstração** com os mesmos dados de exemplo, só que nada é salvo.

---

## 🖥️ O que o site faz

**Login / Criar conta** (tema roxo 💜)
- Confere e-mail e código de acesso com os usuários salvos no servidor (`GET /api/usuarios`).
- O cadastro grava com `POST /api/usuarios`, não deixa repetir e-mail e já entra logado.

**Aba Estudar**
- Mostra o resumo do discente, do responsável e do administrador.
- Formulário de nova sessão: disciplina, modalidade (Pomodoro, Exercícios ou Leitura), duração e o dado extra de cada modalidade (ciclos, acertos ou páginas + resumo).
- Barra de progresso da meta semanal, histórico das sessões (com uma etiqueta dizendo se foi salvo no servidor) e botão **Notificar Responsável** (e-mail, WhatsApp ou painel).
- Atalhos que testam a sobrecarga do `registrarEstudo` (registro rápido e registro por horário).

**Aba Servidor / Relatório**
- Botão que busca no backend as sessões gravadas e o relatório do discente (total de minutos, XP, % da meta).

**Aba Trilha & Plano**
- A trilha de estudo com as disciplinas e a carga horária total, e o plano de estudo semanal.
- O administrador pode cadastrar disciplina nova (vai pro servidor também).

**Aba Missões 1–8** (só admin)
- Roda um teste de mesa com todas as classes e mostra a saída na tela, igual o "programa principal" que a aula pedia.

**Cada perfil enxerga uma coisa:**
- 🎓 Discente: só os próprios dados.
- 👪 Responsável: os discentes ligados a ele; pode redefinir a meta.
- 🛡️ Administrador: todo mundo, cadastra disciplina e vê os testes.

---

## 🧱 Como eu desenvolvi

Primeiro li as 10 missões da aula e montei o projeto em camadas, pra **a tela não ter regra de negócio**. O botão só lê os campos, cria o objeto e pede pra ele se calcular (a própria aula falava isso na Missão 9).

```
FecapStudy/
├── index.html        ← estrutura da tela (login + abas)
├── css/estilo.css    ← visual (verde FECAP + roxo)
└── js/
    ├── dominio.js    ← classes de POO (Missões 1 a 8)
    ├── cliente.js    ← ClienteBackendEstudo (Missão 10)
    ├── demo.js       ← teste de mesa das missões
    └── app.js        ← tela, eventos, login e perfis (Missões 9 e 10)
```

### Onde cada conceito de POO apareceu

| Missão | Conceito | Onde está no código |
|---|---|---|
| 1 | Abstração, classe e objeto | `Disciplina` (carga horária inválida vira 2h) |
| 2 | Encapsulamento | `MetaEstudo`: campos privados `#`, só muda por `registrarAvanco()` (recusa ≤ 0 e > 480 min) |
| 3 | Classe abstrata e herança | `Usuario` (não dá pra dar `new`, não tem `getSenha`) → `Administrador`, `Responsavel`, `Discente` |
| 4 | Polimorfismo dinâmico | `SessaoEstudo` → `SessaoPomodoro`, `SessaoExercicios`, `SessaoLeitura` (cada uma calcula o XP do seu jeito, sem `if` de tipo) |
| 5 | Polimorfismo estático | `Discente.registrarEstudo()` com 3 formas de chamada (em JS não existe sobrecarga, então um método só trata os 3 casos) |
| 6 | Interfaces | `INotificador` e `IExportavelJson`, verificadas por *duck typing* |
| 7 | Associação e agregação | `Responsavel` ——> `Discente` e `TrilhaEstudo` ◇── `Disciplina` |
| 8 | Composição e dependência | `PlanoEstudo` ◆── `ItemCronograma` e `ServicoAlertaResponsavel` - - -> `INotificador` |
| 9 | Interface gráfica | HTML + CSS + DOM, sem biblioteca nenhuma |
| 10 | Integração | `ClienteBackendEstudo` com `fetch` |

### A parte do backend

Li o `Program.cs` pra descobrir as rotas e como cada uma funciona antes de escrever o cliente. O `ClienteBackendEstudo` usa:

- `GET /api/status`, `/api/usuarios`, `/api/disciplinas`, `/api/metas`, `/api/sessoes`, `/api/relatorio/{nome}`
- `POST /api/sessoes` (cada sessão manda o próprio JSON, pelo `paraJson()`), `/api/metas`, `/api/usuarios` e `/api/disciplinas`

Como o backend já liberou CORS com `AllowAnyOrigin()`, o `index.html` abre direto do computador sem dar erro.

### Coisas que aprendi e decisões que tomei

- **Login sem senha de verdade.** O backend não tem campo de senha nem rota de login. Então usei o `matriculaOuCargo` (RA ou cargo) como "código de acesso". Serve pra identificar o usuário no trabalho, mas **não é segurança real**, já que esse dado também aparece em `GET /api/usuarios`. Num projeto de verdade eu mudaria o `Program.cs` pra guardar senha com hash e devolver um token.
- **Metas duplicadas.** Com MySQL ligado, `POST /api/metas` cria uma linha nova toda vez em vez de atualizar. Por isso a tela sempre usa a meta mais recente do aluno e reenvia os minutos já cumpridos.
- **O servidor casa tudo por nome.** Sessões e metas ligam pelo *nome* do discente, então o nome do responsável no cadastro tem que ser igual ao cadastrado.
- **O histórico da tela é só da visita atual.** O que fica salvo de verdade é o que foi pro servidor (aba Servidor / Relatório).
- **Sem módulos ES.** Usei `<script>` normal porque o navegador bloqueia `import` quando abre por `file://`.
- **Testei** o domínio no Node e a tela com um navegador automatizado, contra um servidor de mentira que imita as rotas do backend. Ainda **não** testei com o `.exe` + MySQL de verdade, então vale conferir no laboratório.

---

## ✅ Checklist da Missão 10

- [x] Abstração, classes e objetos
- [x] Encapsulamento
- [x] Classe abstrata e herança
- [x] Polimorfismo dinâmico
- [x] Polimorfismo estático (sobrecarga)
- [x] Interfaces
- [x] Associação, agregação, composição e dependência
- [x] Tela visual enviando `POST /api/sessoes` para `http://localhost:5080`
- [x] Tela de login integrada ao backend

Feito com muito café e Ctrl+Z. ☕
