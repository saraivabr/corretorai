/** Schema de visita agendada para o CRM do CorretorAI. */

export const STATUS_VISITA = [
  "agendada",
  "confirmada",
  "realizada",
  "cancelada",
  "reagendada",
  "no_show",
] as const;
export type StatusVisita = (typeof STATUS_VISITA)[number];

export type Visita = {
  id: string;
  leadId: string;
  imovelId: string;
  corretorId?: string;

  dataHora: string;
  duracao?: number; // minutos

  status: StatusVisita;
  observacoes?: string;

  // Feedback pós-visita
  feedback?: {
    interesseNota?: number; // 1-5
    comentario?: string;
    objecoes?: string[];
  };

  criadoEm: string;
  atualizadoEm: string;
};

/** Resumo curto da visita. */
export function resumoVisita(visita: Visita): string {
  const data = new Date(visita.dataHora);
  const dataFormatada = data.toLocaleDateString("pt-BR");
  const horaFormatada = data.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
  return `Visita ${visita.id} — ${dataFormatada} às ${horaFormatada} [${visita.status}]`;
}
