/** Schema de Lead/Cliente para o CRM do CorretorAI. */

export const STATUS_LEAD = [
  "novo",
  "contato_inicial",
  "qualificado",
  "visita_agendada",
  "proposta",
  "negociacao",
  "fechado_ganho",
  "fechado_perdido",
] as const;
export type StatusLead = (typeof STATUS_LEAD)[number];

export const ORIGEM_LEAD = [
  "whatsapp",
  "instagram",
  "indicacao",
  "portal",
  "site",
  "telefone",
  "presencial",
] as const;
export type OrigemLead = (typeof ORIGEM_LEAD)[number];

export type InteresseLead = {
  tipoImovel?: string[];
  bairros?: string[];
  cidades?: string[];
  precoMin?: number;
  precoMax?: number;
  quartosMin?: number;
  negocio?: "venda" | "aluguel" | "ambos";
  observacoes?: string;
};

export type Interacao = {
  id: string;
  leadId: string;
  tipo: "mensagem" | "ligacao" | "visita" | "proposta" | "email" | "nota";
  descricao: string;
  data: string;
  canal?: string;
};

export type Lead = {
  id: string;
  nome: string;
  telefone?: string;
  email?: string;
  origem: OrigemLead;
  status: StatusLead;
  interesse?: InteresseLead;

  // Pipeline
  dataUltimoContato?: string;
  dataProximoFollowup?: string;
  motivoPerda?: string;

  // Corretor atribuído
  corretorId?: string;

  // Imóveis de interesse
  imoveisInteresse?: string[];

  // Metadata
  criadoEm: string;
  atualizadoEm: string;
  observacoes?: string;
};

/** Transições válidas no pipeline de vendas. */
export const TRANSICOES_PIPELINE: Record<StatusLead, StatusLead[]> = {
  novo: ["contato_inicial", "fechado_perdido"],
  contato_inicial: ["qualificado", "fechado_perdido"],
  qualificado: ["visita_agendada", "proposta", "fechado_perdido"],
  visita_agendada: ["proposta", "qualificado", "fechado_perdido"],
  proposta: ["negociacao", "qualificado", "fechado_perdido"],
  negociacao: ["fechado_ganho", "fechado_perdido", "proposta"],
  fechado_ganho: [],
  fechado_perdido: ["novo"],
};

/** Verifica se uma transição de status é válida. */
export function transicaoValida(atual: StatusLead, proximo: StatusLead): boolean {
  return TRANSICOES_PIPELINE[atual].includes(proximo);
}

/** Resumo curto do lead para listagem. */
export function resumoLead(lead: Lead): string {
  const partes: string[] = [lead.nome];
  if (lead.telefone) partes.push(lead.telefone);
  partes.push(`[${lead.status}]`);
  if (lead.interesse?.negocio) partes.push(lead.interesse.negocio);
  if (lead.interesse?.bairros?.length) partes.push(lead.interesse.bairros.join(", "));
  return partes.join(" | ");
}
