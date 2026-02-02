/**
 * Storage SQLite para leads e interações do CRM CorretorAI.
 */
import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

import type { Visita, StatusVisita } from "./visita-schema.js";
import type { Interacao, Lead, OrigemLead, StatusLead } from "./schema.js";

const MIGRATIONS = [
  `CREATE TABLE IF NOT EXISTS leads (
    id TEXT PRIMARY KEY,
    nome TEXT NOT NULL,
    telefone TEXT,
    email TEXT,
    origem TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'novo',
    interesse TEXT,
    data_ultimo_contato TEXT,
    data_proximo_followup TEXT,
    motivo_perda TEXT,
    corretor_id TEXT,
    imoveis_interesse TEXT,
    observacoes TEXT,
    criado_em TEXT NOT NULL,
    atualizado_em TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_leads_status ON leads(status)`,
  `CREATE INDEX IF NOT EXISTS idx_leads_telefone ON leads(telefone)`,
  `CREATE INDEX IF NOT EXISTS idx_leads_followup ON leads(data_proximo_followup)`,
  `CREATE TABLE IF NOT EXISTS interacoes (
    id TEXT PRIMARY KEY,
    lead_id TEXT NOT NULL,
    tipo TEXT NOT NULL,
    descricao TEXT NOT NULL,
    data TEXT NOT NULL,
    canal TEXT,
    FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE
  )`,
  `CREATE INDEX IF NOT EXISTS idx_interacoes_lead ON interacoes(lead_id)`,
  `CREATE TABLE IF NOT EXISTS visitas (
    id TEXT PRIMARY KEY,
    lead_id TEXT NOT NULL,
    imovel_id TEXT NOT NULL,
    corretor_id TEXT,
    data_hora TEXT NOT NULL,
    duracao INTEGER,
    status TEXT NOT NULL DEFAULT 'agendada',
    observacoes TEXT,
    feedback TEXT,
    criado_em TEXT NOT NULL,
    atualizado_em TEXT NOT NULL,
    FOREIGN KEY (lead_id) REFERENCES leads(id) ON DELETE CASCADE
  )`,
  `CREATE INDEX IF NOT EXISTS idx_visitas_lead ON visitas(lead_id)`,
  `CREATE INDEX IF NOT EXISTS idx_visitas_imovel ON visitas(imovel_id)`,
  `CREATE INDEX IF NOT EXISTS idx_visitas_data ON visitas(data_hora)`,
];

function leadToRow(lead: Lead) {
  return {
    id: lead.id,
    nome: lead.nome,
    telefone: lead.telefone ?? null,
    email: lead.email ?? null,
    origem: lead.origem,
    status: lead.status,
    interesse: lead.interesse ? JSON.stringify(lead.interesse) : null,
    data_ultimo_contato: lead.dataUltimoContato ?? null,
    data_proximo_followup: lead.dataProximoFollowup ?? null,
    motivo_perda: lead.motivoPerda ?? null,
    corretor_id: lead.corretorId ?? null,
    imoveis_interesse: lead.imoveisInteresse ? JSON.stringify(lead.imoveisInteresse) : null,
    observacoes: lead.observacoes ?? null,
    criado_em: lead.criadoEm,
    atualizado_em: lead.atualizadoEm,
  };
}

function leadFromRow(row: Record<string, unknown>): Lead {
  return {
    id: row.id as string,
    nome: row.nome as string,
    telefone: (row.telefone as string) ?? undefined,
    email: (row.email as string) ?? undefined,
    origem: row.origem as OrigemLead,
    status: row.status as StatusLead,
    interesse: row.interesse ? JSON.parse(row.interesse as string) : undefined,
    dataUltimoContato: (row.data_ultimo_contato as string) ?? undefined,
    dataProximoFollowup: (row.data_proximo_followup as string) ?? undefined,
    motivoPerda: (row.motivo_perda as string) ?? undefined,
    corretorId: (row.corretor_id as string) ?? undefined,
    imoveisInteresse: row.imoveis_interesse
      ? JSON.parse(row.imoveis_interesse as string)
      : undefined,
    observacoes: (row.observacoes as string) ?? undefined,
    criadoEm: row.criado_em as string,
    atualizadoEm: row.atualizado_em as string,
  };
}

function visitaToRow(visita: Visita) {
  return {
    id: visita.id,
    lead_id: visita.leadId,
    imovel_id: visita.imovelId,
    corretor_id: visita.corretorId ?? null,
    data_hora: visita.dataHora,
    duracao: visita.duracao ?? null,
    status: visita.status,
    observacoes: visita.observacoes ?? null,
    feedback: visita.feedback ? JSON.stringify(visita.feedback) : null,
    criado_em: visita.criadoEm,
    atualizado_em: visita.atualizadoEm,
  };
}

function visitaFromRow(row: Record<string, unknown>): Visita {
  return {
    id: row.id as string,
    leadId: row.lead_id as string,
    imovelId: row.imovel_id as string,
    corretorId: (row.corretor_id as string) ?? undefined,
    dataHora: row.data_hora as string,
    duracao: (row.duracao as number) ?? undefined,
    status: row.status as StatusVisita,
    observacoes: (row.observacoes as string) ?? undefined,
    feedback: row.feedback ? JSON.parse(row.feedback as string) : undefined,
    criadoEm: row.criado_em as string,
    atualizadoEm: row.atualizado_em as string,
  };
}

export class CrmStore {
  private db: DatabaseSync;

  constructor(dbPath: string) {
    mkdirSync(path.dirname(dbPath), { recursive: true });
    this.db = new DatabaseSync(dbPath);
    this.db.exec("PRAGMA journal_mode=WAL");
    this.db.exec("PRAGMA foreign_keys=ON");
    this.migrate();
  }

  private migrate() {
    for (const sql of MIGRATIONS) {
      this.db.exec(sql);
    }
  }

  // --- Leads ---

  criarLead(dados: Omit<Lead, "id" | "criadoEm" | "atualizadoEm">): Lead {
    const agora = new Date().toISOString();
    const lead: Lead = { ...dados, id: randomUUID(), criadoEm: agora, atualizadoEm: agora };
    const row = leadToRow(lead);
    const cols = Object.keys(row);
    const sql = `INSERT INTO leads (${cols.join(", ")}) VALUES (${cols.map(() => "?").join(", ")})`;
    this.db.prepare(sql).run(...(Object.values(row) as (string | number | null)[]));
    return lead;
  }

  buscarLeadPorId(id: string): Lead | null {
    const row = this.db.prepare("SELECT * FROM leads WHERE id = ?").get(id) as
      | Record<string, unknown>
      | undefined;
    return row ? leadFromRow(row) : null;
  }

  buscarLeadPorTelefone(telefone: string): Lead | null {
    const normalized = telefone.replace(/\D/g, "");
    const row = this.db
      .prepare("SELECT * FROM leads WHERE REPLACE(REPLACE(REPLACE(telefone, '-', ''), ' ', ''), '+', '') LIKE ?")
      .get(`%${normalized}`) as Record<string, unknown> | undefined;
    return row ? leadFromRow(row) : null;
  }

  listarLeads(filtros?: {
    status?: StatusLead;
    origem?: OrigemLead;
    limite?: number;
  }): Lead[] {
    const where: string[] = [];
    const params: unknown[] = [];
    if (filtros?.status) {
      where.push("status = ?");
      params.push(filtros.status);
    }
    if (filtros?.origem) {
      where.push("origem = ?");
      params.push(filtros.origem);
    }
    const whereClause = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";
    const limite = filtros?.limite ?? 50;
    params.push(limite);
    const rows = this.db
      .prepare(`SELECT * FROM leads ${whereClause} ORDER BY atualizado_em DESC LIMIT ?`)
      .all(...(params as (string | number | null)[])) as Record<string, unknown>[];
    return rows.map(leadFromRow);
  }

  atualizarLead(id: string, dados: Partial<Omit<Lead, "id" | "criadoEm">>): Lead | null {
    const existente = this.buscarLeadPorId(id);
    if (!existente) return null;

    const atualizado: Lead = {
      ...existente,
      ...dados,
      id,
      criadoEm: existente.criadoEm,
      atualizadoEm: new Date().toISOString(),
    };
    const row = leadToRow(atualizado);
    const sets = Object.keys(row)
      .filter((k) => k !== "id")
      .map((k) => `${k} = ?`);
    const values = Object.entries(row)
      .filter(([k]) => k !== "id")
      .map(([, v]) => v);
    values.push(id);
    this.db.prepare(`UPDATE leads SET ${sets.join(", ")} WHERE id = ?`).run(...(values as (string | number | null)[]));
    return atualizado;
  }

  leadsParaFollowup(): Lead[] {
    const agora = new Date().toISOString();
    const rows = this.db
      .prepare(
        `SELECT * FROM leads WHERE data_proximo_followup IS NOT NULL AND data_proximo_followup <= ? AND status NOT IN ('fechado_ganho', 'fechado_perdido') ORDER BY data_proximo_followup ASC`,
      )
      .all(agora) as Record<string, unknown>[];
    return rows.map(leadFromRow);
  }

  contarLeadsPorStatus(): Record<StatusLead, number> {
    const rows = this.db
      .prepare("SELECT status, COUNT(*) as total FROM leads GROUP BY status")
      .all() as { status: StatusLead; total: number }[];
    const result: Record<string, number> = {};
    for (const row of rows) {
      result[row.status] = row.total;
    }
    return result as Record<StatusLead, number>;
  }

  // --- Interações ---

  registrarInteracao(
    dados: Omit<Interacao, "id">,
  ): Interacao {
    const interacao: Interacao = { ...dados, id: randomUUID() };
    this.db
      .prepare(
        "INSERT INTO interacoes (id, lead_id, tipo, descricao, data, canal) VALUES (?, ?, ?, ?, ?, ?)",
      )
      .run(
        interacao.id,
        interacao.leadId,
        interacao.tipo,
        interacao.descricao,
        interacao.data,
        interacao.canal ?? null,
      );
    // Atualiza data de último contato do lead
    this.db
      .prepare("UPDATE leads SET data_ultimo_contato = ?, atualizado_em = ? WHERE id = ?")
      .run(interacao.data, new Date().toISOString(), interacao.leadId);
    return interacao;
  }

  listarInteracoes(leadId: string, limite = 20): Interacao[] {
    const rows = this.db
      .prepare("SELECT * FROM interacoes WHERE lead_id = ? ORDER BY data DESC LIMIT ?")
      .all(leadId, limite) as Record<string, unknown>[];
    return rows.map((r) => ({
      id: r.id as string,
      leadId: r.lead_id as string,
      tipo: r.tipo as Interacao["tipo"],
      descricao: r.descricao as string,
      data: r.data as string,
      canal: (r.canal as string) ?? undefined,
    }));
  }

  // --- Visitas ---

  criarVisita(
    dados: Omit<Visita, "id" | "criadoEm" | "atualizadoEm">,
  ): Visita {
    const agora = new Date().toISOString();
    const visita: Visita = { ...dados, id: randomUUID(), criadoEm: agora, atualizadoEm: agora };
    const row = visitaToRow(visita);
    const cols = Object.keys(row);
    const sql = `INSERT INTO visitas (${cols.join(", ")}) VALUES (${cols.map(() => "?").join(", ")})`;
    this.db.prepare(sql).run(...(Object.values(row) as (string | number | null)[]));
    return visita;
  }

  buscarVisitaPorId(id: string): Visita | null {
    const row = this.db.prepare("SELECT * FROM visitas WHERE id = ?").get(id) as
      | Record<string, unknown>
      | undefined;
    return row ? visitaFromRow(row) : null;
  }

  listarVisitas(filtros?: {
    leadId?: string;
    imovelId?: string;
    status?: StatusVisita;
    dataInicio?: string;
    dataFim?: string;
    limite?: number;
  }): Visita[] {
    const where: string[] = [];
    const params: unknown[] = [];
    if (filtros?.leadId) {
      where.push("lead_id = ?");
      params.push(filtros.leadId);
    }
    if (filtros?.imovelId) {
      where.push("imovel_id = ?");
      params.push(filtros.imovelId);
    }
    if (filtros?.status) {
      where.push("status = ?");
      params.push(filtros.status);
    }
    if (filtros?.dataInicio) {
      where.push("data_hora >= ?");
      params.push(filtros.dataInicio);
    }
    if (filtros?.dataFim) {
      where.push("data_hora <= ?");
      params.push(filtros.dataFim);
    }
    const whereClause = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";
    const limite = filtros?.limite ?? 50;
    params.push(limite);
    const rows = this.db
      .prepare(`SELECT * FROM visitas ${whereClause} ORDER BY data_hora ASC LIMIT ?`)
      .all(...(params as (string | number | null)[])) as Record<string, unknown>[];
    return rows.map(visitaFromRow);
  }

  atualizarVisita(id: string, dados: Partial<Omit<Visita, "id" | "criadoEm">>): Visita | null {
    const existente = this.buscarVisitaPorId(id);
    if (!existente) return null;

    const atualizada: Visita = {
      ...existente,
      ...dados,
      id,
      criadoEm: existente.criadoEm,
      atualizadoEm: new Date().toISOString(),
    };
    const row = visitaToRow(atualizada);
    const sets = Object.keys(row)
      .filter((k) => k !== "id")
      .map((k) => `${k} = ?`);
    const values = Object.entries(row)
      .filter(([k]) => k !== "id")
      .map(([, v]) => v);
    values.push(id);
    this.db.prepare(`UPDATE visitas SET ${sets.join(", ")} WHERE id = ?`).run(...(values as (string | number | null)[]));
    return atualizada;
  }

  visitasHoje(): Visita[] {
    const hoje = new Date();
    const inicio = new Date(hoje.getFullYear(), hoje.getMonth(), hoje.getDate()).toISOString();
    const fim = new Date(
      hoje.getFullYear(),
      hoje.getMonth(),
      hoje.getDate(),
      23,
      59,
      59,
    ).toISOString();
    return this.listarVisitas({ dataInicio: inicio, dataFim: fim });
  }

  close() {
    this.db.close();
  }
}
