/* ============================================================================
   Missão 10 — ClienteBackendEstudo: conversa com BackendEstudoAPI.exe (porta 5080).
   Dependência: não guarda nenhum objeto de domínio em atributos, só recebe por parâmetro.
   ============================================================================ */
"use strict";

class ClienteBackendEstudo {
  #urlBase; #timeoutMs;
  constructor(urlBase = "http://localhost:5080", timeoutMs = 4000) {
    this.#urlBase = urlBase.replace(/\/$/, "");
    this.#timeoutMs = timeoutMs;
  }
  getUrlBase() { return this.#urlBase; }

  async #requisitar(caminho, opcoes = {}) {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), this.#timeoutMs);
    try {
      const r = await fetch(this.#urlBase + caminho, { ...opcoes, signal: ctrl.signal });
      const dados = await r.json().catch(() => null);
      if (!r.ok) throw new Error((dados && dados.erro) || `HTTP ${r.status}`);
      return dados;
    } finally { clearTimeout(t); }
  }
  #post(caminho, jsonString) {
    return this.#requisitar(caminho, { method: "POST", headers: { "Content-Type": "application/json" }, body: jsonString });
  }

  obterStatus() { return this.#requisitar("/api/status"); }
  listarDisciplinas() { return this.#requisitar("/api/disciplinas"); }
  listarUsuarios(perfil = "") { return this.#requisitar(`/api/usuarios?perfil=${encodeURIComponent(perfil)}`); }
  listarMetas(discenteNome = "") { return this.#requisitar(`/api/metas?discente=${encodeURIComponent(discenteNome)}`); }
  listarSessoes(discenteNome = "") { return this.#requisitar(`/api/sessoes?discente=${encodeURIComponent(discenteNome)}`); }
  obterRelatorio(discenteNome) { return this.#requisitar(`/api/relatorio/${encodeURIComponent(discenteNome)}`); }

  /** POST /api/sessoes com o JSON do próprio objeto (IExportavelJson). */
  salvarSessao(sessao) {
    exigir(sessao, IExportavelJson);
    return this.#post("/api/sessoes", sessao.paraJson());
  }
  /** POST /api/metas — completa o JSON da meta com os nomes (a meta não conhece as pessoas). */
  salvarMeta(meta, discenteNome, responsavelNome) {
    exigir(meta, IExportavelJson);
    const corpo = { ...JSON.parse(meta.paraJson()), discenteNome, responsavelNome };
    return this.#post("/api/metas", JSON.stringify(corpo));
  }
  salvarUsuario(dados) { return this.#post("/api/usuarios", JSON.stringify(dados)); }
  salvarDisciplina(d) {
    return this.#post("/api/disciplinas", JSON.stringify({
      nome: d.getNome(), categoria: d.getCategoria(), cargaHorariaSemanal: d.getCargaHorariaSemanalHoras(),
    }));
  }
}
