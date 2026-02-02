/**
 * Captura automática de leads a partir de mensagens recebidas.
 * Hook no pipeline de auto-reply: primeira mensagem de contato desconhecido → cria Lead.
 */
import { resolveStateDir } from "../config/paths.js";
import type { OrigemLead } from "./schema.js";
import { CrmStore } from "./store.js";

export type InboundContact = {
  telefone: string;
  nome?: string;
  canal: string;
  mensagem?: string;
};

/**
 * Verifica se o contato já existe como lead. Se não, cria automaticamente.
 * Retorna o lead (existente ou novo).
 */
export function captureLeadFromContact(contact: InboundContact) {
  const dbPath = `${resolveStateDir()}/data/corretorai.db`;
  const store = new CrmStore(dbPath);
  try {
    const existente = store.buscarLeadPorTelefone(contact.telefone);
    if (existente) {
      // Registra interação
      store.registrarInteracao({
        leadId: existente.id,
        tipo: "mensagem",
        descricao: contact.mensagem ?? "Mensagem recebida",
        data: new Date().toISOString(),
        canal: contact.canal,
      });
      return { lead: existente, isNew: false };
    }

    // Cria novo lead
    const origem = mapCanalParaOrigem(contact.canal);
    const lead = store.criarLead({
      nome: contact.nome ?? `Contato ${contact.telefone}`,
      telefone: contact.telefone,
      origem,
      status: "novo",
    });

    // Registra primeira interação
    store.registrarInteracao({
      leadId: lead.id,
      tipo: "mensagem",
      descricao: contact.mensagem ?? "Primeiro contato",
      data: new Date().toISOString(),
      canal: contact.canal,
    });

    return { lead, isNew: true };
  } finally {
    store.close();
  }
}

function mapCanalParaOrigem(canal: string): OrigemLead {
  switch (canal.toLowerCase()) {
    case "whatsapp":
      return "whatsapp";
    case "instagram":
      return "instagram";
    default:
      return "whatsapp";
  }
}
