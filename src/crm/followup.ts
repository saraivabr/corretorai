/**
 * Follow-up automático de leads.
 * Integra com o sistema de cron existente para agendar lembretes.
 */
import { resolveStateDir } from "../config/paths.js";
import { CrmStore } from "./store.js";
import type { Lead, StatusLead } from "./schema.js";

/** Regras de escalonamento para follow-up automático. */
const REGRAS_FOLLOWUP: Record<StatusLead, { diasSemResposta: number; novoStatus?: StatusLead }> = {
  novo: { diasSemResposta: 1 },
  contato_inicial: { diasSemResposta: 2 },
  qualificado: { diasSemResposta: 3 },
  visita_agendada: { diasSemResposta: 1 },
  proposta: { diasSemResposta: 2 },
  negociacao: { diasSemResposta: 3 },
  fechado_ganho: { diasSemResposta: 0 },
  fechado_perdido: { diasSemResposta: 0 },
};

/**
 * Retorna leads que precisam de follow-up agora.
 */
export function getLeadsPendentesFollowup(): Lead[] {
  const dbPath = `${resolveStateDir()}/data/corretorai.db`;
  const store = new CrmStore(dbPath);
  try {
    return store.leadsParaFollowup();
  } finally {
    store.close();
  }
}

/**
 * Calcula a próxima data de follow-up com base no status e última interação.
 */
export function calcularProximoFollowup(lead: Lead): string | null {
  const regra = REGRAS_FOLLOWUP[lead.status];
  if (!regra || regra.diasSemResposta === 0) return null;

  const base = lead.dataUltimoContato ?? lead.criadoEm;
  const data = new Date(base);
  data.setDate(data.getDate() + regra.diasSemResposta);
  return data.toISOString();
}

/**
 * Gera mensagem de follow-up personalizada para o lead.
 */
export function gerarMensagemFollowup(lead: Lead): string {
  switch (lead.status) {
    case "novo":
      return `Olá ${lead.nome}! Sou o corretor responsável. Vi que você entrou em contato recentemente. Como posso ajudar na busca do imóvel ideal para você?`;
    case "contato_inicial":
      return `Olá ${lead.nome}! Gostaria de saber se você ainda está buscando imóveis. Posso te ajudar a encontrar opções que combinem com seu perfil.`;
    case "qualificado":
      return `Oi ${lead.nome}! Tenho algumas opções de imóveis que podem te interessar. Posso te enviar os detalhes?`;
    case "visita_agendada":
      return `Oi ${lead.nome}! Lembrete: temos uma visita agendada. Confirma sua presença?`;
    case "proposta":
      return `${lead.nome}, alguma dúvida sobre a proposta que enviamos? Estou à disposição para esclarecer.`;
    case "negociacao":
      return `${lead.nome}, como está a análise? Estou disponível para ajustar os termos se necessário.`;
    default:
      return `Olá ${lead.nome}! Como posso ajudar?`;
  }
}

/**
 * Agenda follow-ups automáticos para todos os leads ativos.
 * Chamado pelo cron job do CorretorAI.
 */
export function agendarFollowupsAutomaticos(): {
  agendados: number;
  detalhes: { leadId: string; nome: string; proximoFollowup: string }[];
} {
  const dbPath = `${resolveStateDir()}/data/corretorai.db`;
  const store = new CrmStore(dbPath);
  try {
    const leads = store.listarLeads({ limite: 200 });
    const detalhes: { leadId: string; nome: string; proximoFollowup: string }[] = [];

    for (const lead of leads) {
      if (lead.status === "fechado_ganho" || lead.status === "fechado_perdido") continue;
      if (lead.dataProximoFollowup) continue; // já tem follow-up agendado

      const proximoFollowup = calcularProximoFollowup(lead);
      if (!proximoFollowup) continue;

      store.atualizarLead(lead.id, { dataProximoFollowup: proximoFollowup });
      detalhes.push({ leadId: lead.id, nome: lead.nome, proximoFollowup });
    }

    return { agendados: detalhes.length, detalhes };
  } finally {
    store.close();
  }
}
