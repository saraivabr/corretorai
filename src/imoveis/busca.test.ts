import { describe, expect, it } from "vitest";

import { interpretarBusca } from "./busca.js";

describe("busca inteligente de imóveis", () => {
  it("extrai tipo de imóvel", () => {
    const resultado = interpretarBusca("apartamento no centro");
    expect(resultado.tipo).toContain("apartamento");
  });

  it("extrai quartos", () => {
    const resultado = interpretarBusca("casa com 3 quartos");
    expect(resultado.quartosMin).toBe(3);
  });

  it("extrai preço máximo com 'até X mil'", () => {
    const resultado = interpretarBusca("apartamento até 500 mil");
    expect(resultado.precoMax).toBe(500 * 1000 * 100);
  });

  it("extrai tipo de negócio", () => {
    const resultado = interpretarBusca("casa para alugar");
    expect(resultado.negocio).toBe("aluguel");
  });

  it("extrai vagas", () => {
    const resultado = interpretarBusca("apto com 2 vagas");
    expect(resultado.vagasMin).toBe(2);
  });

  it("extrai suítes", () => {
    const resultado = interpretarBusca("casa com 2 suítes");
    expect(resultado.suitesMin).toBe(2);
  });

  it("extrai área mínima", () => {
    const resultado = interpretarBusca("terreno acima de 300m²");
    expect(resultado.areaUtilMin).toBe(300);
  });

  it("query complexa: apartamento 3 quartos até 500 mil", () => {
    const resultado = interpretarBusca("apartamento 3 quartos até 500 mil");
    expect(resultado.tipo).toContain("apartamento");
    expect(resultado.quartosMin).toBe(3);
    expect(resultado.precoMax).toBe(500 * 1000 * 100);
  });

  it("usa texto livre quando não encontra critérios estruturados", () => {
    const resultado = interpretarBusca("perto da praia com vista");
    expect(resultado.texto).toBe("perto da praia com vista");
  });
});
