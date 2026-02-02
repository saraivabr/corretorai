/**
 * Agent tools para gestão de leads/CRM no CorretorAI.
 * Compatível com o formato AnyAgentTool do pi-agent-core.
 */
import { Type } from "@sinclair/typebox";

import type { AnyAgentTool } from "../agents/tools/common.js";
import { jsonResult } from "../agents/tools/common.js";
import { resolveStateDir } from "../config/paths.js";
import { CrmStore } from "./store.js";
import { resumoLead } from "./schema.js";
import type { OrigemLead, StatusLead } from "./schema.js";
import { transicaoValida } from "./schema.js";
import { resumoVisita } from "./visita-schema.js";

function getStore(): CrmStore {
  const dbPath = `${resolveStateDir()}/data/corretorai.db`;
  return new CrmStore(dbPath);
}

export function createLeadCriarTool(): AnyAgentTool {
  return {
    label: "Criar Lead",
    name: "lead_criar",
    description: "Criar um novo lead/contato no CRM.",
    parameters: Type.Object({
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
    execute: async (_toolCallId, args) => {
      const input = args as Record<string, unknown>;
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
        return jsonResult(`Lead criado com sucesso!\nID: ${lead.id}\n${resumoLead(lead)}`);
      } finally {
        store.close();
      }
    },
  };
}

export function createLeadBuscarTool(): AnyAgentTool {
  return {
    label: "Buscar Leads",
    name: "lead_buscar",
    description: "Buscar lead por telefone ou listar leads com filtros.",
    parameters: Type.Object({
      telefone: Type.Optional(Type.String({ description: "Buscar por telefone" })),
      status: Type.Optional(Type.String({ description: "Filtrar por status do pipeline" })),
      origem: Type.Optional(Type.String({ description: "Filtrar por origem" })),
      limite: Type.Optional(Type.Number()),
    }),
    execute: async (_toolCallId, args) => {
      const input = args as Record<string, unknown>;
      const store = getStore();
      try {
        if (input.telefone) {
          const lead = store.buscarLeadPorTelefone(input.telefone as string);
          if (!lead) return jsonResult("Lead não encontrado com esse telefone.");
          return jsonResult(`Lead encontrado:\n${resumoLead(lead)}\nID: ${lead.id}`);
        }
        const leads = store.listarLeads({
          status: (input.status as StatusLead) ?? undefined,
          origem: (input.origem as OrigemLead) ?? undefined,
          limite: (input.limite as number) ?? 20,
        });
        if (leads.length === 0) return jsonResult("Nenhum lead encontrado.");
        const linhas = leads.map((l, i) => `${i + 1}. ${resumoLead(l)} — ID: ${l.id}`);
        return jsonResult(`${leads.length} lead(s):\n\n${linhas.join("\n")}`);
      } finally {
        store.close();
      }
    },
  };
}

export function createLeadAtualizarStatusTool(): AnyAgentTool {
  return {
    label: "Atualizar Status Lead",
    name: "lead_atualizar_status",
    description:
      "Atualizar o status de um lead no pipeline de vendas. Transições: novo→contato_inicial→qualificado→visita_agendada→proposta→negociacao→fechado_ganho/perdido.",
    parameters: Type.Object({
      id: Type.String({ description: "ID do lead" }),
      status: Type.String({ description: "Novo status" }),
      motivo_perda: Type.Optional(Type.String({ description: "Motivo da perda (se fechado_perdido)" })),
      observacoes: Type.Optional(Type.String()),
    }),
    execute: async (_toolCallId, args) => {
      const input = args as Record<string, unknown>;
      const store = getStore();
      try {
        const lead = store.buscarLeadPorId(input.id as string);
        if (!lead) return jsonResult("Lead não encontrado.");

        const novoStatus = input.status as StatusLead;
        if (!transicaoValida(lead.status, novoStatus)) {
          return jsonResult(
            `Transição inválida: ${lead.status} → ${novoStatus}. Transições permitidas a partir de "${lead.status}": consulte o pipeline.`,
          );
        }

        const atualizado = store.atualizarLead(input.id as string, {
          status: novoStatus,
          motivoPerda: (input.motivo_perda as string) ?? undefined,
          observacoes: (input.observacoes as string) ?? lead.observacoes,
        });
        return atualizado
          ? jsonResult(`Status atualizado: ${resumoLead(atualizado)}`)
          : jsonResult("Erro ao atualizar lead.");
      } finally {
        store.close();
      }
    },
  };
}

export function createLeadFollowupTool(): AnyAgentTool {
  return {
    label: "Follow-up Leads",
    name: "lead_followup",
    description: "Agendar follow-up para um lead ou listar leads com follow-up pendente.",
    parameters: Type.Object({
      acao: Type.String({ description: "'agendar' para agendar follow-up, 'listar' para ver pendentes" }),
      id: Type.Optional(Type.String({ description: "ID do lead (para agendar)" })),
      data: Type.Optional(Type.String({ description: "Data/hora do follow-up (ISO 8601)" })),
    }),
    execute: async (_toolCallId, args) => {
      const input = args as Record<string, unknown>;
      const store = getStore();
      try {
        if (input.acao === "listar") {
          const pendentes = store.leadsParaFollowup();
          if (pendentes.length === 0) return jsonResult("Nenhum follow-up pendente.");
          const linhas = pendentes.map(
            (l) => `- ${l.nome} (${l.telefone ?? "sem tel"}) — Follow-up: ${l.dataProximoFollowup}`,
          );
          return jsonResult(`${pendentes.length} follow-up(s) pendente(s):\n\n${linhas.join("\n")}`);
        }
        if (input.acao === "agendar" && input.id && input.data) {
          const atualizado = store.atualizarLead(input.id as string, {
            dataProximoFollowup: input.data as string,
          });
          return atualizado
            ? jsonResult(`Follow-up agendado para ${atualizado.nome} em ${input.data}`)
            : jsonResult("Lead não encontrado.");
        }
        return jsonResult("Uso: acao='agendar' com id e data, ou acao='listar'.");
      } finally {
        store.close();
      }
    },
  };
}

export function createVisitaCriarTool(): AnyAgentTool {
  return {
    label: "Criar Visita",
    name: "visita_criar",
    description: "Agendar uma visita a um imóvel para um lead.",
    parameters: Type.Object({
      lead_id: Type.String({ description: "ID do lead" }),
      imovel_id: Type.String({ description: "ID do imóvel" }),
      data_hora: Type.String({ description: "Data e hora da visita (ISO 8601)" }),
      observacoes: Type.Optional(Type.String()),
    }),
    execute: async (_toolCallId, args) => {
      const input = args as Record<string, unknown>;
      const store = getStore();
      try {
        const visita = store.criarVisita({
          leadId: input.lead_id as string,
          imovelId: input.imovel_id as string,
          dataHora: input.data_hora as string,
          status: "agendada",
          observacoes: (input.observacoes as string) ?? undefined,
        });
        return jsonResult(`Visita agendada!\n${resumoVisita(visita)}\nID: ${visita.id}`);
      } finally {
        store.close();
      }
    },
  };
}

export function createVisitaListarTool(): AnyAgentTool {
  return {
    label: "Listar Visitas",
    name: "visita_listar",
    description: "Listar visitas agendadas (hoje, por lead ou por imóvel).",
    parameters: Type.Object({
      lead_id: Type.Optional(Type.String()),
      imovel_id: Type.Optional(Type.String()),
      hoje: Type.Optional(Type.Boolean({ description: "Listar apenas visitas de hoje" })),
    }),
    execute: async (_toolCallId, args) => {
      const input = args as Record<string, unknown>;
      const store = getStore();
      try {
        const visitas = input.hoje
          ? store.visitasHoje()
          : store.listarVisitas({
              leadId: (input.lead_id as string) ?? undefined,
              imovelId: (input.imovel_id as string) ?? undefined,
            });
        if (visitas.length === 0) return jsonResult("Nenhuma visita encontrada.");
        const linhas = visitas.map((v) => `- ${resumoVisita(v)}`);
        return jsonResult(`${visitas.length} visita(s):\n\n${linhas.join("\n")}`);
      } finally {
        store.close();
      }
    },
  };
}

export function createDashboardTool(): AnyAgentTool {
  return {
    label: "Dashboard",
    name: "dashboard",
    description: "Exibir resumo do dashboard: total de leads, imóveis, visitas de hoje, pipeline.",
    parameters: Type.Object({}),
    execute: async (_toolCallId, _args) => {
      const store = getStore();
      try {
        const leadsPorStatus = store.contarLeadsPorStatus();
        const visitasHoje = store.visitasHoje();
        const totalLeads = Object.values(leadsPorStatus).reduce((a, b) => a + b, 0);

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
        return jsonResult(linhas.join("\n"));
      } finally {
        store.close();
      }
    },
  };
}

/** Retorna todos os tools CRM para registro no agente. */
export function createCrmTools(): AnyAgentTool[] {
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
