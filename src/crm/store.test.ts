import { existsSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { CrmStore } from "./store.js";

describe("CrmStore", () => {
  let store: CrmStore;
  let dbPath: string;

  beforeEach(() => {
    dbPath = path.join(tmpdir(), `corretorai-crm-test-${Date.now()}.db`);
    store = new CrmStore(dbPath);
  });

  afterEach(() => {
    store.close();
    if (existsSync(dbPath)) unlinkSync(dbPath);
    for (const suffix of ["-wal", "-shm"]) {
      const f = dbPath + suffix;
      if (existsSync(f)) unlinkSync(f);
    }
  });

  describe("leads", () => {
    it("cria e busca lead por ID", () => {
      const lead = store.criarLead({
        nome: "João Silva",
        telefone: "+5511999999999",
        origem: "whatsapp",
        status: "novo",
      });
      expect(lead.id).toBeTruthy();
      expect(lead.nome).toBe("João Silva");

      const encontrado = store.buscarLeadPorId(lead.id);
      expect(encontrado).not.toBeNull();
      expect(encontrado!.telefone).toBe("+5511999999999");
    });

    it("busca lead por telefone", () => {
      store.criarLead({
        nome: "Maria",
        telefone: "+5511888888888",
        origem: "whatsapp",
        status: "novo",
      });

      const lead = store.buscarLeadPorTelefone("5511888888888");
      expect(lead).not.toBeNull();
      expect(lead!.nome).toBe("Maria");
    });

    it("lista leads com filtro de status", () => {
      store.criarLead({ nome: "A", origem: "whatsapp", status: "novo" });
      store.criarLead({ nome: "B", origem: "whatsapp", status: "qualificado" });

      const novos = store.listarLeads({ status: "novo" });
      expect(novos.length).toBe(1);
      expect(novos[0].nome).toBe("A");
    });

    it("atualiza lead", () => {
      const lead = store.criarLead({
        nome: "Pedro",
        origem: "instagram",
        status: "novo",
      });

      const atualizado = store.atualizarLead(lead.id, { status: "contato_inicial" });
      expect(atualizado).not.toBeNull();
      expect(atualizado!.status).toBe("contato_inicial");
    });

    it("retorna leads para follow-up", () => {
      const ontem = new Date(Date.now() - 86400000).toISOString();
      store.criarLead({
        nome: "Followup",
        origem: "whatsapp",
        status: "contato_inicial",
        dataProximoFollowup: ontem,
      });

      const pendentes = store.leadsParaFollowup();
      expect(pendentes.length).toBe(1);
      expect(pendentes[0].nome).toBe("Followup");
    });
  });

  describe("interações", () => {
    it("registra e lista interações", () => {
      const lead = store.criarLead({ nome: "Ana", origem: "whatsapp", status: "novo" });

      store.registrarInteracao({
        leadId: lead.id,
        tipo: "mensagem",
        descricao: "Primeira mensagem",
        data: new Date().toISOString(),
        canal: "whatsapp",
      });

      const interacoes = store.listarInteracoes(lead.id);
      expect(interacoes.length).toBe(1);
      expect(interacoes[0].descricao).toBe("Primeira mensagem");
    });
  });

  describe("visitas", () => {
    it("cria e lista visitas", () => {
      const lead = store.criarLead({ nome: "Carlos", origem: "whatsapp", status: "qualificado" });

      const visita = store.criarVisita({
        leadId: lead.id,
        imovelId: "imovel-123",
        dataHora: new Date().toISOString(),
        status: "agendada",
      });

      expect(visita.id).toBeTruthy();

      const visitas = store.listarVisitas({ leadId: lead.id });
      expect(visitas.length).toBe(1);
    });

    it("atualiza visita", () => {
      const lead = store.criarLead({ nome: "Diana", origem: "whatsapp", status: "qualificado" });
      const visita = store.criarVisita({
        leadId: lead.id,
        imovelId: "imovel-456",
        dataHora: new Date().toISOString(),
        status: "agendada",
      });

      const atualizada = store.atualizarVisita(visita.id, {
        status: "realizada",
        feedback: { interesseNota: 4, comentario: "Gostou muito" },
      });
      expect(atualizada).not.toBeNull();
      expect(atualizada!.status).toBe("realizada");
      expect(atualizada!.feedback?.interesseNota).toBe(4);
    });
  });
});
