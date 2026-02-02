/**
 * Storage SQLite para imóveis do CorretorAI.
 * Usa node:sqlite (Node 22+) para persistência local.
 */
import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import path from "node:path";
import { DatabaseSync } from "node:sqlite";

import type { CriteriosBusca, Imovel, StatusImovel, TipoImovel, TipoNegocio } from "./schema.js";

const MIGRATIONS = [
  `CREATE TABLE IF NOT EXISTS imoveis (
    id TEXT PRIMARY KEY,
    tipo TEXT NOT NULL,
    negocio TEXT NOT NULL,
    status TEXT NOT NULL DEFAULT 'disponivel',
    titulo TEXT NOT NULL,
    descricao TEXT,
    logradouro TEXT,
    numero TEXT,
    complemento TEXT,
    bairro TEXT,
    cidade TEXT NOT NULL,
    estado TEXT NOT NULL,
    cep TEXT,
    latitude REAL,
    longitude REAL,
    quartos INTEGER,
    suites INTEGER,
    banheiros INTEGER,
    vagas INTEGER,
    area_util REAL,
    area_total REAL,
    andar_pavimento INTEGER,
    preco INTEGER,
    preco_condominio INTEGER,
    preco_iptu INTEGER,
    preco_aluguel INTEGER,
    amenidades TEXT,
    fotos TEXT,
    videos TEXT,
    corretor_nome TEXT,
    corretor_creci TEXT,
    corretor_telefone TEXT,
    observacoes TEXT,
    criado_em TEXT NOT NULL,
    atualizado_em TEXT NOT NULL
  )`,
  `CREATE INDEX IF NOT EXISTS idx_imoveis_tipo ON imoveis(tipo)`,
  `CREATE INDEX IF NOT EXISTS idx_imoveis_negocio ON imoveis(negocio)`,
  `CREATE INDEX IF NOT EXISTS idx_imoveis_status ON imoveis(status)`,
  `CREATE INDEX IF NOT EXISTS idx_imoveis_cidade ON imoveis(cidade)`,
  `CREATE INDEX IF NOT EXISTS idx_imoveis_bairro ON imoveis(bairro)`,
  `CREATE INDEX IF NOT EXISTS idx_imoveis_preco ON imoveis(preco)`,
  `CREATE INDEX IF NOT EXISTS idx_imoveis_quartos ON imoveis(quartos)`,
];

function toRow(imovel: Imovel) {
  return {
    id: imovel.id,
    tipo: imovel.tipo,
    negocio: imovel.negocio,
    status: imovel.status,
    titulo: imovel.titulo,
    descricao: imovel.descricao ?? null,
    logradouro: imovel.endereco.logradouro ?? null,
    numero: imovel.endereco.numero ?? null,
    complemento: imovel.endereco.complemento ?? null,
    bairro: imovel.endereco.bairro ?? null,
    cidade: imovel.endereco.cidade,
    estado: imovel.endereco.estado,
    cep: imovel.endereco.cep ?? null,
    latitude: imovel.endereco.latitude ?? null,
    longitude: imovel.endereco.longitude ?? null,
    quartos: imovel.quartos ?? null,
    suites: imovel.suites ?? null,
    banheiros: imovel.banheiros ?? null,
    vagas: imovel.vagas ?? null,
    area_util: imovel.areaUtil ?? null,
    area_total: imovel.areaTotal ?? null,
    andar_pavimento: imovel.andarPavimento ?? null,
    preco: imovel.preco ?? null,
    preco_condominio: imovel.precoCondominio ?? null,
    preco_iptu: imovel.precoIptu ?? null,
    preco_aluguel: imovel.precoAluguel ?? null,
    amenidades: imovel.amenidades ? JSON.stringify(imovel.amenidades) : null,
    fotos: imovel.fotos ? JSON.stringify(imovel.fotos) : null,
    videos: imovel.videos ? JSON.stringify(imovel.videos) : null,
    corretor_nome: imovel.corretorNome ?? null,
    corretor_creci: imovel.corretorCreci ?? null,
    corretor_telefone: imovel.corretorTelefone ?? null,
    observacoes: imovel.observacoes ?? null,
    criado_em: imovel.criadoEm,
    atualizado_em: imovel.atualizadoEm,
  };
}

function fromRow(row: Record<string, unknown>): Imovel {
  return {
    id: row.id as string,
    tipo: row.tipo as TipoImovel,
    negocio: row.negocio as TipoNegocio,
    status: row.status as StatusImovel,
    titulo: row.titulo as string,
    descricao: (row.descricao as string) ?? undefined,
    endereco: {
      logradouro: (row.logradouro as string) ?? undefined,
      numero: (row.numero as string) ?? undefined,
      complemento: (row.complemento as string) ?? undefined,
      bairro: (row.bairro as string) ?? undefined,
      cidade: row.cidade as string,
      estado: row.estado as string,
      cep: (row.cep as string) ?? undefined,
      latitude: (row.latitude as number) ?? undefined,
      longitude: (row.longitude as number) ?? undefined,
    },
    quartos: (row.quartos as number) ?? undefined,
    suites: (row.suites as number) ?? undefined,
    banheiros: (row.banheiros as number) ?? undefined,
    vagas: (row.vagas as number) ?? undefined,
    areaUtil: (row.area_util as number) ?? undefined,
    areaTotal: (row.area_total as number) ?? undefined,
    andarPavimento: (row.andar_pavimento as number) ?? undefined,
    preco: (row.preco as number) ?? undefined,
    precoCondominio: (row.preco_condominio as number) ?? undefined,
    precoIptu: (row.preco_iptu as number) ?? undefined,
    precoAluguel: (row.preco_aluguel as number) ?? undefined,
    amenidades: row.amenidades ? (JSON.parse(row.amenidades as string) as string[]) : undefined,
    fotos: row.fotos ? (JSON.parse(row.fotos as string) as string[]) : undefined,
    videos: row.videos ? (JSON.parse(row.videos as string) as string[]) : undefined,
    corretorNome: (row.corretor_nome as string) ?? undefined,
    corretorCreci: (row.corretor_creci as string) ?? undefined,
    corretorTelefone: (row.corretor_telefone as string) ?? undefined,
    criadoEm: row.criado_em as string,
    atualizadoEm: row.atualizado_em as string,
    observacoes: (row.observacoes as string) ?? undefined,
  };
}

export class ImoveisStore {
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

  criar(dados: Omit<Imovel, "id" | "criadoEm" | "atualizadoEm">): Imovel {
    const agora = new Date().toISOString();
    const imovel: Imovel = {
      ...dados,
      id: randomUUID(),
      criadoEm: agora,
      atualizadoEm: agora,
    };
    const row = toRow(imovel);
    const cols = Object.keys(row);
    const placeholders = cols.map(() => "?").join(", ");
    const sql = `INSERT INTO imoveis (${cols.join(", ")}) VALUES (${placeholders})`;
    this.db.prepare(sql).run(...(Object.values(row) as (string | number | null)[]));
    return imovel;
  }

  buscarPorId(id: string): Imovel | null {
    const stmt = this.db.prepare("SELECT * FROM imoveis WHERE id = ?");
    const row = stmt.get(id) as Record<string, unknown> | undefined;
    return row ? fromRow(row) : null;
  }

  listar(filtros?: { status?: StatusImovel; tipo?: TipoImovel; limite?: number }): Imovel[] {
    const where: string[] = [];
    const params: unknown[] = [];
    if (filtros?.status) {
      where.push("status = ?");
      params.push(filtros.status);
    }
    if (filtros?.tipo) {
      where.push("tipo = ?");
      params.push(filtros.tipo);
    }
    const whereClause = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";
    const limite = filtros?.limite ?? 50;
    const sql = `SELECT * FROM imoveis ${whereClause} ORDER BY atualizado_em DESC LIMIT ?`;
    params.push(limite);
    const rows = this.db.prepare(sql).all(...(params as (string | number | null)[])) as Record<string, unknown>[];
    return rows.map(fromRow);
  }

  buscar(criterios: CriteriosBusca): Imovel[] {
    const where: string[] = [];
    const params: unknown[] = [];

    if (criterios.tipo?.length) {
      where.push(`tipo IN (${criterios.tipo.map(() => "?").join(", ")})`);
      params.push(...criterios.tipo);
    }
    if (criterios.negocio) {
      where.push("(negocio = ? OR negocio = 'venda_aluguel')");
      params.push(criterios.negocio);
    }
    if (criterios.status?.length) {
      where.push(`status IN (${criterios.status.map(() => "?").join(", ")})`);
      params.push(...criterios.status);
    }
    if (criterios.cidade) {
      where.push("LOWER(cidade) = LOWER(?)");
      params.push(criterios.cidade);
    }
    if (criterios.estado) {
      where.push("LOWER(estado) = LOWER(?)");
      params.push(criterios.estado);
    }
    if (criterios.bairro) {
      where.push("LOWER(bairro) LIKE LOWER(?)");
      params.push(`%${criterios.bairro}%`);
    }
    if (criterios.precoMin != null) {
      where.push("preco >= ?");
      params.push(criterios.precoMin);
    }
    if (criterios.precoMax != null) {
      where.push("preco <= ?");
      params.push(criterios.precoMax);
    }
    if (criterios.quartosMin != null) {
      where.push("quartos >= ?");
      params.push(criterios.quartosMin);
    }
    if (criterios.quartosMax != null) {
      where.push("quartos <= ?");
      params.push(criterios.quartosMax);
    }
    if (criterios.vagasMin != null) {
      where.push("vagas >= ?");
      params.push(criterios.vagasMin);
    }
    if (criterios.areaUtilMin != null) {
      where.push("area_util >= ?");
      params.push(criterios.areaUtilMin);
    }
    if (criterios.areaUtilMax != null) {
      where.push("area_util <= ?");
      params.push(criterios.areaUtilMax);
    }
    if (criterios.texto) {
      where.push("(LOWER(titulo) LIKE LOWER(?) OR LOWER(descricao) LIKE LOWER(?) OR LOWER(bairro) LIKE LOWER(?))");
      const term = `%${criterios.texto}%`;
      params.push(term, term, term);
    }

    const whereClause = where.length > 0 ? `WHERE ${where.join(" AND ")}` : "";
    const sql = `SELECT * FROM imoveis ${whereClause} ORDER BY atualizado_em DESC LIMIT 50`;
    const rows = this.db.prepare(sql).all(...(params as (string | number | null)[])) as Record<string, unknown>[];
    return rows.map(fromRow);
  }

  atualizar(id: string, dados: Partial<Omit<Imovel, "id" | "criadoEm">>): Imovel | null {
    const existente = this.buscarPorId(id);
    if (!existente) return null;

    const atualizado: Imovel = {
      ...existente,
      ...dados,
      id,
      criadoEm: existente.criadoEm,
      atualizadoEm: new Date().toISOString(),
      endereco: { ...existente.endereco, ...(dados.endereco ?? {}) },
    };

    const row = toRow(atualizado);
    const sets = Object.keys(row)
      .filter((k) => k !== "id")
      .map((k) => `${k} = ?`);
    const values = Object.entries(row)
      .filter(([k]) => k !== "id")
      .map(([, v]) => v);
    values.push(id);
    this.db.prepare(`UPDATE imoveis SET ${sets.join(", ")} WHERE id = ?`).run(...(values as (string | number | null)[]));
    return atualizado;
  }

  remover(id: string): boolean {
    const result = this.db.prepare("DELETE FROM imoveis WHERE id = ?").run(id);
    return result.changes > 0;
  }

  contarPorStatus(): Record<StatusImovel, number> {
    const rows = this.db
      .prepare("SELECT status, COUNT(*) as total FROM imoveis GROUP BY status")
      .all() as { status: StatusImovel; total: number }[];
    const result: Record<string, number> = {};
    for (const row of rows) {
      result[row.status] = row.total;
    }
    return result as Record<StatusImovel, number>;
  }

  close() {
    this.db.close();
  }
}
