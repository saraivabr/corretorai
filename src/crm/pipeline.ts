/**
 * Máquina de estados para o pipeline de vendas.
 * Gerencia transições e eventos automáticos.
 */
import { resolveStateDir } from "../config/paths.js";
import { transicaoValida, type StatusLead } from "./schema.js";
import { CrmStore } from "./store.js";
import { calcularProximoFollowup } from "./followup.js";

export type TransicaoEvento = {
  leadId: string;
  de: StatusLead;
  para: StatusLead;
  timestamp: string;
  motivo?: string;
};

/**
 * Executa uma transição de status no pipeline com validação e efeitos colaterais.
 */
export function executarTransicao(
  leadId: string,
  novoStatus: StatusLead,
  motivo?: string,
): { ok: boolean; erro?: string; evento?: TransicaoEvento } {
  const dbPath = `${resolveStateDir()}/data/corretorai.db`;
  const store = new CrmStore(dbPath);
  try {
    const lead = store.buscarLeadPorId(leadId);
    if (!lead) return { ok: false, erro: "Lead não encontrado" };

    if (!transicaoValida(lead.status, novoStatus)) {
      return {
        ok: false,
        erro: `Transição inválida: ${lead.status} → ${novoStatus}`,
      };
    }

    const evento: TransicaoEvento = {
      leadId,
      de: lead.status,
      para: novoStatus,
      timestamp: new Date().toISOString(),
      motivo,
    };

    // Efeitos colaterais por transição
    const updates: Record<string, unknown> = { status: novoStatus };

    if (novoStatus === "fechado_perdido" && motivo) {
      updates.motivoPerda = motivo;
      updates.dataProximoFollowup = undefined;
    }

    if (novoStatus === "fechado_ganho") {
      updates.dataProximoFollowup = undefined;
    }

    // Recalcula follow-up para status ativos
    if (
      novoStatus !== "fechado_ganho" &&
      novoStatus !== "fechado_perdido"
    ) {
      const leadAtualizado = { ...lead, status: novoStatus };
      const proximoFollowup = calcularProximoFollowup(leadAtualizado);
      if (proximoFollowup) {
        updates.dataProximoFollowup = proximoFollowup;
      }
    }

    store.atualizarLead(leadId, updates as Record<string, string | undefined>);

    // Registra interação de mudança de status
    store.registrarInteracao({
      leadId,
      tipo: "nota",
      descricao: `Status alterado: ${evento.de} → ${evento.para}${motivo ? ` (${motivo})` : ""}`,
      data: evento.timestamp,
    });

    return { ok: true, evento };
  } finally {
    store.close();
  }
}

/** Retorna as transições possíveis a partir de um status. */
export function transicoesDisponiveis(status: StatusLead): StatusLead[] {
  const todas: StatusLead[] = [
    "novo",
    "contato_inicial",
    "qualificado",
    "visita_agendada",
    "proposta",
    "negociacao",
    "fechado_ganho",
    "fechado_perdido",
  ];
  return todas.filter((s) => transicaoValida(status, s));
}
