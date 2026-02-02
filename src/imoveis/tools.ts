/**
 * Agent tools para gestão de imóveis no CorretorAI.
 * Registrados como tools do agente AI para uso via chat.
 */
import { Type } from "@sinclair/typebox";

import { resolveStateDir } from "../config/paths.js";
import { ImoveisStore } from "./store.js";
import { formatarPreco, formatarArea, resumoImovel } from "./schema.js";
import type { CriteriosBusca, Imovel, TipoImovel, TipoNegocio } from "./schema.js";

function getStore(): ImoveisStore {
  const dbPath = `${resolveStateDir()}/data/corretorai.db`;
  return new ImoveisStore(dbPath);
}

export function createImovelCadastrarTool() {
  return {
    name: "imovel_cadastrar",
    description:
      "Cadastrar um novo imóvel no catálogo. Informe tipo, título, cidade, estado, negócio (venda/aluguel) e opcionalmente: preço, quartos, área, bairro, etc.",
    inputSchema: Type.Object({
      tipo: Type.String({ description: "Tipo: apartamento, casa, terreno, sala_comercial, loja, galpao, cobertura, kitnet, chacara, fazenda" }),
      negocio: Type.String({ description: "Tipo de negócio: venda, aluguel, venda_aluguel" }),
      titulo: Type.String({ description: "Título descritivo do imóvel" }),
      cidade: Type.String({ description: "Cidade" }),
      estado: Type.String({ description: "Estado (sigla, ex: SP)" }),
      bairro: Type.Optional(Type.String({ description: "Bairro" })),
      preco: Type.Optional(Type.Number({ description: "Preço em centavos (ex: 50000000 = R$ 500.000,00)" })),
      quartos: Type.Optional(Type.Number({ description: "Número de quartos" })),
      suites: Type.Optional(Type.Number({ description: "Número de suítes" })),
      banheiros: Type.Optional(Type.Number({ description: "Número de banheiros" })),
      vagas: Type.Optional(Type.Number({ description: "Vagas de garagem" })),
      areaUtil: Type.Optional(Type.Number({ description: "Área útil em m²" })),
      descricao: Type.Optional(Type.String({ description: "Descrição detalhada" })),
      logradouro: Type.Optional(Type.String()),
      cep: Type.Optional(Type.String()),
      precoCondominio: Type.Optional(Type.Number({ description: "Condomínio em centavos" })),
      precoIptu: Type.Optional(Type.Number({ description: "IPTU anual em centavos" })),
      amenidades: Type.Optional(Type.String({ description: "Amenidades separadas por vírgula" })),
    }),
    async execute(input: Record<string, unknown>): Promise<string> {
      const store = getStore();
      try {
        const imovel = store.criar({
          tipo: input.tipo as TipoImovel,
          negocio: input.negocio as TipoNegocio,
          status: "disponivel",
          titulo: input.titulo as string,
          descricao: (input.descricao as string) ?? undefined,
          endereco: {
            logradouro: (input.logradouro as string) ?? undefined,
            bairro: (input.bairro as string) ?? undefined,
            cidade: input.cidade as string,
            estado: input.estado as string,
            cep: (input.cep as string) ?? undefined,
          },
          quartos: (input.quartos as number) ?? undefined,
          suites: (input.suites as number) ?? undefined,
          banheiros: (input.banheiros as number) ?? undefined,
          vagas: (input.vagas as number) ?? undefined,
          areaUtil: (input.areaUtil as number) ?? undefined,
          preco: (input.preco as number) ?? undefined,
          precoCondominio: (input.precoCondominio as number) ?? undefined,
          precoIptu: (input.precoIptu as number) ?? undefined,
          amenidades: input.amenidades
            ? (input.amenidades as string).split(",").map((a) => a.trim())
            : undefined,
        });
        return `Imóvel cadastrado com sucesso!\nID: ${imovel.id}\n${resumoImovel(imovel)}`;
      } finally {
        store.close();
      }
    },
  };
}

export function createImovelBuscarTool() {
  return {
    name: "imovel_buscar",
    description:
      "Buscar imóveis no catálogo por critérios: tipo, cidade, bairro, faixa de preço, quartos, área, texto livre, etc.",
    inputSchema: Type.Object({
      tipo: Type.Optional(Type.String({ description: "Tipo(s) separados por vírgula" })),
      negocio: Type.Optional(Type.String({ description: "venda, aluguel" })),
      cidade: Type.Optional(Type.String()),
      estado: Type.Optional(Type.String()),
      bairro: Type.Optional(Type.String()),
      precoMin: Type.Optional(Type.Number({ description: "Preço mínimo em centavos" })),
      precoMax: Type.Optional(Type.Number({ description: "Preço máximo em centavos" })),
      quartosMin: Type.Optional(Type.Number()),
      quartosMax: Type.Optional(Type.Number()),
      vagasMin: Type.Optional(Type.Number()),
      areaUtilMin: Type.Optional(Type.Number()),
      areaUtilMax: Type.Optional(Type.Number()),
      texto: Type.Optional(Type.String({ description: "Busca por texto livre no título, descrição ou bairro" })),
    }),
    async execute(input: Record<string, unknown>): Promise<string> {
      const store = getStore();
      try {
        const criterios: CriteriosBusca = {
          tipo: input.tipo
            ? (input.tipo as string).split(",").map((t) => t.trim() as TipoImovel)
            : undefined,
          negocio: (input.negocio as TipoNegocio) ?? undefined,
          cidade: (input.cidade as string) ?? undefined,
          estado: (input.estado as string) ?? undefined,
          bairro: (input.bairro as string) ?? undefined,
          precoMin: (input.precoMin as number) ?? undefined,
          precoMax: (input.precoMax as number) ?? undefined,
          quartosMin: (input.quartosMin as number) ?? undefined,
          quartosMax: (input.quartosMax as number) ?? undefined,
          vagasMin: (input.vagasMin as number) ?? undefined,
          areaUtilMin: (input.areaUtilMin as number) ?? undefined,
          areaUtilMax: (input.areaUtilMax as number) ?? undefined,
          texto: (input.texto as string) ?? undefined,
        };
        const resultados = store.buscar(criterios);
        if (resultados.length === 0) {
          return "Nenhum imóvel encontrado com esses critérios.";
        }
        const linhas = resultados.map(
          (im, i) =>
            `${i + 1}. ${resumoImovel(im)}${im.endereco.bairro ? ` — ${im.endereco.bairro}` : ""}`,
        );
        return `Encontrados ${resultados.length} imóvel(is):\n\n${linhas.join("\n")}`;
      } finally {
        store.close();
      }
    },
  };
}

export function createImovelDetalhesTool() {
  return {
    name: "imovel_detalhes",
    description: "Exibir detalhes completos de um imóvel pelo ID.",
    inputSchema: Type.Object({
      id: Type.String({ description: "ID do imóvel" }),
    }),
    async execute(input: { id: string }): Promise<string> {
      const store = getStore();
      try {
        const im = store.buscarPorId(input.id);
        if (!im) return "Imóvel não encontrado.";
        const linhas: string[] = [
          `# ${im.titulo}`,
          `**Tipo:** ${im.tipo} | **Negócio:** ${im.negocio} | **Status:** ${im.status}`,
          "",
          "## Localização",
          im.endereco.logradouro
            ? `${im.endereco.logradouro}${im.endereco.numero ? `, ${im.endereco.numero}` : ""}`
            : "",
          im.endereco.complemento ?? "",
          `${im.endereco.bairro ?? ""} — ${im.endereco.cidade}/${im.endereco.estado}`,
          im.endereco.cep ? `CEP: ${im.endereco.cep}` : "",
          "",
          "## Características",
          im.quartos != null ? `Quartos: ${im.quartos}` : "",
          im.suites != null ? `Suítes: ${im.suites}` : "",
          im.banheiros != null ? `Banheiros: ${im.banheiros}` : "",
          im.vagas != null ? `Vagas: ${im.vagas}` : "",
          im.areaUtil != null ? `Área útil: ${formatarArea(im.areaUtil)}` : "",
          im.areaTotal != null ? `Área total: ${formatarArea(im.areaTotal)}` : "",
          "",
          "## Valores",
          im.preco != null ? `Preço: ${formatarPreco(im.preco)}` : "",
          im.precoCondominio != null ? `Condomínio: ${formatarPreco(im.precoCondominio)}` : "",
          im.precoIptu != null ? `IPTU: ${formatarPreco(im.precoIptu)}` : "",
          im.precoAluguel != null ? `Aluguel: ${formatarPreco(im.precoAluguel)}` : "",
          "",
          im.amenidades?.length ? `**Amenidades:** ${im.amenidades.join(", ")}` : "",
          im.descricao ? `\n## Descrição\n${im.descricao}` : "",
          im.fotos?.length ? `\n**Fotos:** ${im.fotos.length} foto(s)` : "",
          im.corretorNome ? `\n**Corretor:** ${im.corretorNome}${im.corretorCreci ? ` (CRECI: ${im.corretorCreci})` : ""}` : "",
          `\nID: ${im.id}`,
        ];
        return linhas.filter(Boolean).join("\n");
      } finally {
        store.close();
      }
    },
  };
}

export function createImovelAtualizarTool() {
  return {
    name: "imovel_atualizar",
    description:
      "Atualizar dados de um imóvel existente (preço, status, descrição, etc.).",
    inputSchema: Type.Object({
      id: Type.String({ description: "ID do imóvel" }),
      preco: Type.Optional(Type.Number({ description: "Novo preço em centavos" })),
      status: Type.Optional(Type.String({ description: "Novo status: disponivel, reservado, vendido, alugado, inativo" })),
      titulo: Type.Optional(Type.String()),
      descricao: Type.Optional(Type.String()),
      quartos: Type.Optional(Type.Number()),
      bairro: Type.Optional(Type.String()),
    }),
    async execute(input: Record<string, unknown>): Promise<string> {
      const store = getStore();
      try {
        const { id, ...dados } = input;
        const atualizado = store.atualizar(id as string, {
          ...(dados.preco != null ? { preco: dados.preco as number } : {}),
          ...(dados.status ? { status: dados.status as Imovel["status"] } : {}),
          ...(dados.titulo ? { titulo: dados.titulo as string } : {}),
          ...(dados.descricao ? { descricao: dados.descricao as string } : {}),
          ...(dados.quartos != null ? { quartos: dados.quartos as number } : {}),
          ...(dados.bairro ? { endereco: { cidade: "", estado: "", bairro: dados.bairro as string } } : {}),
        });
        if (!atualizado) return "Imóvel não encontrado.";
        return `Imóvel atualizado: ${resumoImovel(atualizado)}`;
      } finally {
        store.close();
      }
    },
  };
}

export function createImovelListarTool() {
  return {
    name: "imovel_listar",
    description: "Listar imóveis do catálogo com filtros opcionais de status e tipo.",
    inputSchema: Type.Object({
      status: Type.Optional(Type.String({ description: "Filtrar por status" })),
      tipo: Type.Optional(Type.String({ description: "Filtrar por tipo" })),
      limite: Type.Optional(Type.Number({ description: "Número máximo de resultados (padrão: 20)" })),
    }),
    async execute(input: Record<string, unknown>): Promise<string> {
      const store = getStore();
      try {
        const imoveis = store.listar({
          status: (input.status as Imovel["status"]) ?? undefined,
          tipo: (input.tipo as TipoImovel) ?? undefined,
          limite: (input.limite as number) ?? 20,
        });
        if (imoveis.length === 0) return "Nenhum imóvel encontrado.";
        const linhas = imoveis.map((im, i) => `${i + 1}. ${resumoImovel(im)}`);
        return `${imoveis.length} imóvel(is):\n\n${linhas.join("\n")}`;
      } finally {
        store.close();
      }
    },
  };
}

/** Retorna todos os tools de imóveis para registro no agente. */
export function createImoveisTools() {
  return [
    createImovelCadastrarTool(),
    createImovelBuscarTool(),
    createImovelDetalhesTool(),
    createImovelAtualizarTool(),
    createImovelListarTool(),
  ];
}
