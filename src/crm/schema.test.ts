import { describe, expect, it } from "vitest";

import { resumoLead, transicaoValida, type Lead } from "./schema.js";

describe("schema lead/CRM", () => {
  const leadExemplo: Lead = {
    id: "abc",
    nome: "João Silva",
    telefone: "+5511999999999",
    origem: "whatsapp",
    status: "novo",
    interesse: {
      negocio: "venda",
      bairros: ["Centro", "Pinheiros"],
      precoMax: 50000000,
    },
    criadoEm: "2025-01-01T00:00:00Z",
    atualizadoEm: "2025-01-01T00:00:00Z",
  };

  it("gera resumo do lead", () => {
    const resumo = resumoLead(leadExemplo);
    expect(resumo).toContain("João Silva");
    expect(resumo).toContain("[novo]");
  });

  describe("transições de pipeline", () => {
    it("permite novo → contato_inicial", () => {
      expect(transicaoValida("novo", "contato_inicial")).toBe(true);
    });

    it("permite novo → fechado_perdido", () => {
      expect(transicaoValida("novo", "fechado_perdido")).toBe(true);
    });

    it("bloqueia novo → qualificado (pula etapa)", () => {
      expect(transicaoValida("novo", "qualificado")).toBe(false);
    });

    it("bloqueia fechado_ganho → qualquer coisa", () => {
      expect(transicaoValida("fechado_ganho", "novo")).toBe(false);
      expect(transicaoValida("fechado_ganho", "contato_inicial")).toBe(false);
    });

    it("permite fechado_perdido → novo (reabrir)", () => {
      expect(transicaoValida("fechado_perdido", "novo")).toBe(true);
    });

    it("permite qualificado → visita_agendada", () => {
      expect(transicaoValida("qualificado", "visita_agendada")).toBe(true);
    });

    it("permite negociacao → fechado_ganho", () => {
      expect(transicaoValida("negociacao", "fechado_ganho")).toBe(true);
    });
  });
});
