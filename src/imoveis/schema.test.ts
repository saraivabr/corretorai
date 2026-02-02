import { describe, expect, it } from "vitest";

import { formatarArea, formatarPreco, resumoImovel, type Imovel } from "./schema.js";

describe("schema imóvel", () => {
  const imovelExemplo: Imovel = {
    id: "123",
    tipo: "apartamento",
    negocio: "venda",
    status: "disponivel",
    titulo: "Apto 3 quartos Copacabana",
    endereco: { cidade: "Rio de Janeiro", estado: "RJ", bairro: "Copacabana" },
    quartos: 3,
    areaUtil: 85,
    preco: 75000000, // R$ 750.000
    criadoEm: "2025-01-01T00:00:00Z",
    atualizadoEm: "2025-01-01T00:00:00Z",
  };

  it("formata preço em R$", () => {
    expect(formatarPreco(50000000)).toMatch(/500\.000/);
  });

  it("formata área em m²", () => {
    expect(formatarArea(85)).toContain("m²");
  });

  it("gera resumo do imóvel", () => {
    const resumo = resumoImovel(imovelExemplo);
    expect(resumo).toContain("Apto 3 quartos Copacabana");
    expect(resumo).toContain("3 quartos");
    expect(resumo).toContain("Copacabana");
    expect(resumo).toContain("RJ");
  });
});
