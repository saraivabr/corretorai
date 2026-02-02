/**
 * Qualificação de leads por IA.
 * Fluxo de perguntas estruturadas para entender o perfil do cliente.
 */
import type { InteresseLead, Lead } from "./schema.js";

/** Perguntas de qualificação em ordem. */
export const PERGUNTAS_QUALIFICACAO = [
  {
    id: "negocio",
    pergunta: "Você está buscando imóvel para compra ou aluguel?",
    campo: "negocio" as const,
    opcoes: ["venda", "aluguel", "ambos"],
  },
  {
    id: "tipo",
    pergunta: "Que tipo de imóvel você procura?",
    campo: "tipoImovel" as const,
    opcoes: ["apartamento", "casa", "terreno", "sala comercial", "outro"],
  },
  {
    id: "quartos",
    pergunta: "Quantos quartos você precisa?",
    campo: "quartosMin" as const,
    tipo: "numero" as const,
  },
  {
    id: "bairros",
    pergunta: "Tem preferência de bairro ou região?",
    campo: "bairros" as const,
    tipo: "texto_lista" as const,
  },
  {
    id: "preco",
    pergunta: "Qual sua faixa de preço máxima?",
    campo: "precoMax" as const,
    tipo: "preco" as const,
  },
] as const;

/** Resultado da qualificação. */
export type ResultadoQualificacao = {
  interesse: InteresseLead;
  completa: boolean;
  perguntasPendentes: string[];
};

/**
 * Analisa o interesse do lead e retorna quais perguntas faltam responder.
 */
export function analisarQualificacao(lead: Lead): ResultadoQualificacao {
  const interesse = lead.interesse ?? {};
  const pendentes: string[] = [];

  if (!interesse.negocio) pendentes.push("negocio");
  if (!interesse.tipoImovel?.length) pendentes.push("tipo");
  if (interesse.quartosMin == null) pendentes.push("quartos");
  if (!interesse.bairros?.length) pendentes.push("bairros");
  if (interesse.precoMax == null) pendentes.push("preco");

  return {
    interesse,
    completa: pendentes.length === 0,
    perguntasPendentes: pendentes,
  };
}

/**
 * Retorna a próxima pergunta de qualificação para o lead.
 */
export function proximaPerguntaQualificacao(
  lead: Lead,
): (typeof PERGUNTAS_QUALIFICACAO)[number] | null {
  const { perguntasPendentes } = analisarQualificacao(lead);
  if (perguntasPendentes.length === 0) return null;
  return (
    PERGUNTAS_QUALIFICACAO.find((p) => perguntasPendentes.includes(p.id)) ?? null
  );
}

/**
 * Gera prompt de qualificação para inclusão no system prompt do agente.
 */
export function gerarPromptQualificacao(lead: Lead): string {
  const { completa, perguntasPendentes } = analisarQualificacao(lead);

  if (completa) {
    return `Lead qualificado. Interesse: ${JSON.stringify(lead.interesse)}. Agora busque imóveis compatíveis.`;
  }

  const proxima = proximaPerguntaQualificacao(lead);
  if (!proxima) return "";

  return [
    `O lead "${lead.nome}" ainda não está totalmente qualificado.`,
    `Perguntas pendentes: ${perguntasPendentes.join(", ")}.`,
    `Próxima pergunta sugerida: "${proxima.pergunta}"`,
    "opcoes" in proxima && proxima.opcoes ? `Opções: ${proxima.opcoes.join(", ")}` : "",
    "Faça a pergunta de forma natural na conversa.",
  ]
    .filter(Boolean)
    .join("\n");
}

/**
 * Interpreta valor de preço a partir de texto em pt-BR.
 * Ex: "500 mil", "1.2 milhão", "R$ 350.000"
 */
export function interpretarPreco(texto: string): number | null {
  const raw = texto.toLowerCase().replace(/r\$\s*/g, "").trim();

  // "500 mil" / "500k" — match antes de remover pontos decimais
  const milMatch = raw.match(/^([\d.,]+)\s*(mil|k)$/);
  if (milMatch) {
    const val = parseFloat(milMatch[1].replace(/\./g, "").replace(",", "."));
    return Number.isFinite(val) ? val * 1000 * 100 : null; // centavos
  }

  // "1.2 milhão" / "1,5 mi" — preserva decimais
  const miMatch = raw.match(/^([\d.,]+)\s*(milh[aãoõ]+|mi)$/);
  if (miMatch) {
    const val = parseFloat(miMatch[1].replace(",", "."));
    return Number.isFinite(val) ? val * 1_000_000 * 100 : null;
  }

  // Número direto (ex: "350.000" ou "350000")
  const clean = raw.replace(/\./g, "").replace(",", ".");
  const num = parseFloat(clean);
  if (Number.isFinite(num)) {
    // Se for maior que 10000, assume que já é em reais
    return num > 10000 ? num * 100 : num;
  }

  return null;
}
