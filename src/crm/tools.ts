/**
 * Agent tools para gestão de leads/CRM no CorretorAI.
 */
import { Type } from "@sinclair/typebox";

import { resolveStateDir } from "../config/paths.js";
import { CrmStore } from "./store.js";
import { resumoLead } from "./schema.js";
import type { Lead, OrigemLead, StatusLead } from "./schema.js";
import { transicaoValida } from "./schema.js";
import { resumoVisita } from "./visita-schema.js";

function getStore(): CrmStore {
  const dbPath = `${resolveStateDir()}/data/corretorai.db`;
  return new CrmStore(dbPath);
}

export function createLeadCriarTool() {
  return {
    name: "lead_criar",
    description: "Criar um novo lead/contato no CRM.",
    inputSchema: Type.Object({
      nome: Type.String({ description: "Nome do lead" }),
      telefone: Type.Optional(Type.String({ description: "Telefone" })),
      email: Type.Optional(Type.String({ description: "E-mail" })),
      origem: Type.Optional(Type.String({ description: "Origem: whatsapp, instagram, indicacao, portal, site, telefone, presencial" })),
      interesse_tipo: Type.Optional(Type.String({ description: "Tipo(s) de imóvel de interesse" })),
      interesse_bairros: Type.Optional(Type.String({ description: "Bairros de interesse (separados por vírgula)" })),
      interesse_preco_max: Type.Optional(Type.Number({ description: "Preço máximo em centavos" })),
      interesse_negocio: Type.Optional(Type.String({ description: "venda, aluguel, ambos" })),
      observacoes: Type.Optional(Type.String()),
    }),
    async execute(input: Record<string, unknown>): Promise<string> {
      const store = getStore();
      try {
        const lead = store.criarLead({
          nome: input.nome as string,
          telefone: (input.telefone as string) ?? undefined,
          email: (input.email as string) ?? undefined,
          origem: ((input.origem as string) ?? "whatsapp") as OrigemLead,
          status: "novo",
          interesse: {
            tipoImovel: input.interesse_tipo
              ? (input.interesse_tipo as string).split(",").map((t) => t.trim())
              : undefined,
            bairros: input.interesse_bairros
              ? (input.interesse_bairros as string).split(",").map((b) => b.trim())
              : undefined,
            precoMax: (input.interesse_preco_max as number) ?? undefined,
            negocio: (input.interesse_negocio as "venda" | "aluguel" | "ambos") ?? undefined,
          },
          observacoes: (input.observacoes as string) ?? undefined,
        });
        return `Lead criado com sucesso!\nID: ${lead.id}\n${resumoLead(lead)}`;
      } finally {
        store.close();
      }
    },
  };
}

export function createLeadBuscarTool() {
  return {
    name: "lead_buscar",
    description: "Buscar lead por telefone ou listar leads com filtros.",
    inputSchema: Type.Object({
      telefone: Type.Optional(Type.String({ description: "Buscar por telefone" })),
      status: Type.Optional(Type.String({ description: "Filtrar por status do pipeline" })),
      origem: Type.Optional(Type.String({ description: "Filtrar por origem" })),
      limite: Type.Optional(Type.Number()),
    }),
    async execute(input: Record<string, unknown>): Promise<string> {
      const store = getStore();
      try {
        if (input.telefone) {
          const lead = store.buscarLeadPorTelefone(input.telefone as string);
          if (!lead) return "Lead não encontrado com esse telefone.";
          return `Lead encontrado:\n${resumoLead(lead)}\nID: ${lead.id}`;
        }
        const leads = store.listarLeads({
          status: (input.status as StatusLead) ?? undefined,
          origem: (input.origem as OrigemLead) ?? undefined,
          limite: (input.limite as number) ?? 20,
        });
        if (leads.length === 0) return "Nenhum lead encontrado.";
        const linhas = leads.map((l, i) => `${i + 1}. ${resumoLead(l)} — ID: ${l.id}`);
        return `${leads.length} lead(s):\n\n${linhas.join("\n")}`;
      } finally {
        store.close();
      }
    },
  };
}

export function createLeadAtualizarStatusTool() {
  return {
    name: "lead_atualizar_status",
    description:
      "Atualizar o status de um lead no pipeline de vendas. Transições: novo→contato_inicial→qualificado→visita_agendada→proposta→negociacao→fechado_ganho/perdido.",
    inputSchema: Type.Object({
      id: Type.String({ description: "ID do lead" }),
      status: Type.String({ description: "Novo status" }),
      motivo_perda: Type.Optional(Type.String({ description: "Motivo da perda (se fechado_perdido)" })),
      observacoes: Type.Optional(Type.String()),
    }),
    async execute(input: Record<string, unknown>): Promise<string> {
      const store = getStore();
      try {
        const lead = store.buscarLeadPorId(input.id as string);
        if (!lead) return "Lead não encontrado.";

        const novoStatus = input.status as StatusLead;
        if (!transicaoValida(lead.status, novoStatus)) {
          return `Transição inválida: ${lead.status} → ${novoStatus}. Transições permitidas a partir de "${lead.status}": ${["novo", "contato_inicial", "qualificado", "visita_agendada", "proposta", "negociacao", "fechado_ganho", "fechado_perdido"].join(", ")}`;
        }

        const atualizado = store.atualizarLead(input.id as string, {
          status: novoStatus,
          motivoPerda: (input.motivo_perda as string) ?? undefined,
          observacoes: (input.observacoes as string) ?? lead.observacoes,
        });
        return atualizado
          ? `Status atualizado: ${resumoLead(atualizado)}`
          : "Erro ao atualizar lead.";
      } finally {
        store.close();
      }
    },
  };
}

export function createLeadFollowupTool() {
  return {
    name: "lead_followup",
    description: "Agendar follow-up para um lead ou listar leads com follow-up pendente.",
    inputSchema: Type.Object({
      acao: Type.String({ description: "'agendar' para agendar follow-up, 'listar' para ver pendentes" }),
      id: Type.Optional(Type.String({ description: "ID do lead (para agendar)" })),
      data: Type.Optional(Type.String({ description: "Data/hora do follow-up (ISO 8601)" })),
    }),
    async execute(input: Record<string, unknown>): Promise<string> {
      const store = getStore();
      try {
        if (input.acao === "listar") {
          const pendentes = store.leadsParaFollowup();
          if (pendentes.length === 0) return "Nenhum follow-up pendente.";
          const linhas = pendentes.map(
            (l) => `- ${l.nome} (${l.telefone ?? "sem tel"}) — Follow-up: ${l.dataProximoFollowup}`,
          );
          return `${pendentes.length} follow-up(s) pendente(s):\n\n${linhas.join("\n")}`;
        }
        if (input.acao === "agendar" && input.id && input.data) {
          const atualizado = store.atualizarLead(input.id as string, {
            dataProximoFollowup: input.data as string,
          });
          return atualizado
            ? `Follow-up agendado para ${atualizado.nome} em ${input.data}`
            : "Lead não encontrado.";
        }
        return "Uso: acao='agendar' com id e data, ou acao='listar'.";
      } finally {
        store.close();
      }
    },
  };
}

export function createVisitaCriarTool() {
  return {
    name: "visita_criar",
    description: "Agendar uma visita a um imóvel para um lead.",
    inputSchema: Type.Object({
      lead_id: Type.String({ description: "ID do lead" }),
      imovel_id: Type.String({ description: "ID do imóvel" }),
      data_hora: Type.String({ description: "Data e hora da visita (ISO 8601)" }),
      observacoes: Type.Optional(Type.String()),
    }),
    async execute(input: Record<string, unknown>): Promise<string> {
      const store = getStore();
      try {
        const visita = store.criarVisita({
          leadId: input.lead_id as string,
          imovelId: input.imovel_id as string,
          dataHora: input.data_hora as string,
          status: "agendada",
          observacoes: (input.observacoes as string) ?? undefined,
        });
        return `Visita agendada!\n${resumoVisita(visita)}\nID: ${visita.id}`;
      } finally {
        store.close();
      }
    },
  };
}

export function createVisitaListarTool() {
  return {
    name: "visita_listar",
    description: "Listar visitas agendadas (hoje, por lead ou por imóvel).",
    inputSchema: Type.Object({
      lead_id: Type.Optional(Type.String()),
      imovel_id: Type.Optional(Type.String()),
      hoje: Type.Optional(Type.Boolean({ description: "Listar apenas visitas de hoje" })),
    }),
    async execute(input: Record<string, unknown>): Promise<string> {
      const store = getStore();
      try {
        const visitas = input.hoje
          ? store.visitasHoje()
          : store.listarVisitas({
              leadId: (input.lead_id as string) ?? undefined,
              imovelId: (input.imovel_id as string) ?? undefined,
            });
        if (visitas.length === 0) return "Nenhuma visita encontrada.";
        const linhas = visitas.map((v) => `- ${resumoVisita(v)}`);
        return `${visitas.length} visita(s):\n\n${linhas.join("\n")}`;
      } finally {
        store.close();
      }
    },
  };
}

export function createDashboardTool() {
  return {
    name: "dashboard",
    description: "Exibir resumo do dashboard: total de leads, imóveis, visitas de hoje, pipeline.",
    inputSchema: Type.Object({}),
    async execute(): Promise<string> {
      const store = getStore();
      try {
        const leadsPorStatus = store.contarLeadsPorStatus();
        const visitasHoje = store.visitasHoje();
        const totalLeads = Object.values(leadsPorStatus).reduce((a, b) => a + b, 0);

        // Para imóveis, precisamos abrir outro store
        const { ImoveisStore } = await import("../imoveis/store.js");
        const imStore = new ImoveisStore(`${resolveStateDir()}/data/corretorai.db`);
        const imoveisPorStatus = imStore.contarPorStatus();
        const totalImoveis = Object.values(imoveisPorStatus).reduce((a, b) => a + b, 0);
        imStore.close();

        const linhas = [
          "# Dashboard CorretorAI",
          "",
          "## Resumo",
          `- **Leads totais:** ${totalLeads}`,
          `- **Imóveis ativos:** ${imoveisPorStatus.disponivel ?? 0}`,
          `- **Visitas hoje:** ${visitasHoje.length}`,
          "",
          "## Pipeline de Leads",
          ...Object.entries(leadsPorStatus).map(([status, count]) => `  - ${status}: ${count}`),
          "",
          "## Imóveis por Status",
          ...Object.entries(imoveisPorStatus).map(([status, count]) => `  - ${status}: ${count}`),
        ];
        return linhas.join("\n");
      } finally {
        store.close();
      }
    },
  };
}

/** Retorna todos os tools CRM para registro no agente. */
export function createCrmTools() {
  return [
    createLeadCriarTool(),
    createLeadBuscarTool(),
    createLeadAtualizarStatusTool(),
    createLeadFollowupTool(),
    createVisitaCriarTool(),
    createVisitaListarTool(),
    createDashboardTool(),
  ];
}
