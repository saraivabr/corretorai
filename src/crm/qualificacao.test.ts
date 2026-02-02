import { describe, expect, it } from "vitest";

import { analisarQualificacao, interpretarPreco, proximaPerguntaQualificacao, type Lead } from "./qualificacao.js";

// Re-export Lead from schema for test convenience
const baseLead: Lead = {
  id: "test",
  nome: "Maria",
  telefone: "11999",
  origem: "whatsapp" as const,
  status: "novo" as const,
  criadoEm: "2025-01-01",
  atualizadoEm: "2025-01-01",
};

describe("qualificação de leads", () => {
  it("identifica lead sem qualificação", () => {
    const resultado = analisarQualificacao(baseLead);
    expect(resultado.completa).toBe(false);
    expect(resultado.perguntasPendentes.length).toBeGreaterThan(0);
  });

  it("identifica lead qualificado", () => {
    const leadQualificado: Lead = {
      ...baseLead,
      interesse: {
        negocio: "venda",
        tipoImovel: ["apartamento"],
        quartosMin: 2,
        bairros: ["Centro"],
        precoMax: 50000000,
      },
    };
    const resultado = analisarQualificacao(leadQualificado);
    expect(resultado.completa).toBe(true);
    expect(resultado.perguntasPendentes.length).toBe(0);
  });

  it("retorna próxima pergunta para lead não qualificado", () => {
    const pergunta = proximaPerguntaQualificacao(baseLead);
    expect(pergunta).not.toBeNull();
    expect(pergunta?.pergunta).toBeTruthy();
  });

  it("retorna null para lead totalmente qualificado", () => {
    const leadQualificado: Lead = {
      ...baseLead,
      interesse: {
        negocio: "venda",
        tipoImovel: ["apartamento"],
        quartosMin: 2,
        bairros: ["Centro"],
        precoMax: 50000000,
      },
    };
    const pergunta = proximaPerguntaQualificacao(leadQualificado);
    expect(pergunta).toBeNull();
  });
});

describe("interpretação de preço", () => {
  it("interpreta '500 mil'", () => {
    const valor = interpretarPreco("500 mil");
    expect(valor).toBe(500 * 1000 * 100);
  });

  it("interpreta '1.2 milhão'", () => {
    const valor = interpretarPreco("1.2 milhão");
    expect(valor).toBe(1.2 * 1_000_000 * 100);
  });

  it("interpreta 'R$ 350.000'", () => {
    const valor = interpretarPreco("R$ 350.000");
    expect(valor).toBe(350000 * 100);
  });

  it("retorna null para texto inválido", () => {
    expect(interpretarPreco("abc")).toBeNull();
  });
});
