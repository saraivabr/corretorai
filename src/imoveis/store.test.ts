import { existsSync, mkdirSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { ImoveisStore } from "./store.js";

describe("ImoveisStore", () => {
  let store: ImoveisStore;
  let dbPath: string;

  beforeEach(() => {
    dbPath = path.join(tmpdir(), `corretorai-test-${Date.now()}.db`);
    store = new ImoveisStore(dbPath);
  });

  afterEach(() => {
    store.close();
    if (existsSync(dbPath)) unlinkSync(dbPath);
    // Limpa WAL/SHM
    for (const suffix of ["-wal", "-shm"]) {
      const f = dbPath + suffix;
      if (existsSync(f)) unlinkSync(f);
    }
  });

  it("cria e busca imóvel por ID", () => {
    const imovel = store.criar({
      tipo: "apartamento",
      negocio: "venda",
      status: "disponivel",
      titulo: "Apto teste",
      endereco: { cidade: "São Paulo", estado: "SP", bairro: "Centro" },
      quartos: 2,
      preco: 30000000,
    });

    expect(imovel.id).toBeTruthy();
    expect(imovel.titulo).toBe("Apto teste");

    const encontrado = store.buscarPorId(imovel.id);
    expect(encontrado).not.toBeNull();
    expect(encontrado!.titulo).toBe("Apto teste");
    expect(encontrado!.quartos).toBe(2);
    expect(encontrado!.preco).toBe(30000000);
  });

  it("lista imóveis com filtro de status", () => {
    store.criar({
      tipo: "casa",
      negocio: "aluguel",
      status: "disponivel",
      titulo: "Casa 1",
      endereco: { cidade: "RJ", estado: "RJ" },
    });
    store.criar({
      tipo: "casa",
      negocio: "venda",
      status: "vendido",
      titulo: "Casa 2",
      endereco: { cidade: "RJ", estado: "RJ" },
    });

    const disponiveis = store.listar({ status: "disponivel" });
    expect(disponiveis.length).toBe(1);
    expect(disponiveis[0].titulo).toBe("Casa 1");
  });

  it("busca por critérios: tipo + preço máximo", () => {
    store.criar({
      tipo: "apartamento",
      negocio: "venda",
      status: "disponivel",
      titulo: "Apto barato",
      endereco: { cidade: "SP", estado: "SP" },
      preco: 20000000,
    });
    store.criar({
      tipo: "apartamento",
      negocio: "venda",
      status: "disponivel",
      titulo: "Apto caro",
      endereco: { cidade: "SP", estado: "SP" },
      preco: 80000000,
    });

    const resultados = store.buscar({ tipo: ["apartamento"], precoMax: 50000000 });
    expect(resultados.length).toBe(1);
    expect(resultados[0].titulo).toBe("Apto barato");
  });

  it("atualiza imóvel", () => {
    const imovel = store.criar({
      tipo: "terreno",
      negocio: "venda",
      status: "disponivel",
      titulo: "Terreno teste",
      endereco: { cidade: "Campinas", estado: "SP" },
      preco: 10000000,
    });

    const atualizado = store.atualizar(imovel.id, { preco: 12000000 });
    expect(atualizado).not.toBeNull();
    expect(atualizado!.preco).toBe(12000000);
  });

  it("remove imóvel", () => {
    const imovel = store.criar({
      tipo: "casa",
      negocio: "aluguel",
      status: "disponivel",
      titulo: "Casa remover",
      endereco: { cidade: "SP", estado: "SP" },
    });

    expect(store.remover(imovel.id)).toBe(true);
    expect(store.buscarPorId(imovel.id)).toBeNull();
  });

  it("conta por status", () => {
    store.criar({
      tipo: "casa",
      negocio: "venda",
      status: "disponivel",
      titulo: "A",
      endereco: { cidade: "SP", estado: "SP" },
    });
    store.criar({
      tipo: "casa",
      negocio: "venda",
      status: "disponivel",
      titulo: "B",
      endereco: { cidade: "SP", estado: "SP" },
    });
    store.criar({
      tipo: "casa",
      negocio: "venda",
      status: "vendido",
      titulo: "C",
      endereco: { cidade: "SP", estado: "SP" },
    });

    const contagem = store.contarPorStatus();
    expect(contagem.disponivel).toBe(2);
    expect(contagem.vendido).toBe(1);
  });
});
