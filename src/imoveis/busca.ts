/**
 * Busca inteligente de imóveis por linguagem natural.
 * Converte frases em pt-BR para critérios estruturados de busca.
 */
import type { CriteriosBusca, TipoImovel, TipoNegocio } from "./schema.js";

/** Mapeamento de termos em linguagem natural para tipos de imóvel. */
const MAPA_TIPOS: Record<string, TipoImovel> = {
  apartamento: "apartamento",
  apto: "apartamento",
  ap: "apartamento",
  casa: "casa",
  terreno: "terreno",
  lote: "terreno",
  sala: "sala_comercial",
  "sala comercial": "sala_comercial",
  loja: "loja",
  "ponto comercial": "loja",
  galpão: "galpao",
  galpao: "galpao",
  cobertura: "cobertura",
  kitnet: "kitnet",
  kit: "kitnet",
  studio: "kitnet",
  chácara: "chacara",
  chacara: "chacara",
  sítio: "chacara",
  fazenda: "fazenda",
};

/** Mapeamento de termos para tipo de negócio. */
const MAPA_NEGOCIO: Record<string, TipoNegocio> = {
  venda: "venda",
  compra: "venda",
  comprar: "venda",
  vender: "venda",
  aluguel: "aluguel",
  alugar: "aluguel",
  locação: "aluguel",
  locacao: "aluguel",
};

/**
 * Interpreta uma frase de busca em linguagem natural e retorna critérios estruturados.
 *
 * Exemplos:
 * - "apartamento 3 quartos no centro até 500 mil"
 * - "casa com 4 quartos em Copacabana para alugar"
 * - "terreno acima de 300m² em Campinas"
 */
export function interpretarBusca(texto: string): CriteriosBusca {
  const lower = texto.toLowerCase().trim();
  const criterios: CriteriosBusca = {};

  // Detectar tipo de imóvel
  for (const [termo, tipo] of Object.entries(MAPA_TIPOS)) {
    if (lower.includes(termo)) {
      criterios.tipo = [...(criterios.tipo ?? []), tipo];
      break;
    }
  }

  // Detectar tipo de negócio
  for (const [termo, negocio] of Object.entries(MAPA_NEGOCIO)) {
    if (lower.includes(termo)) {
      criterios.negocio = negocio;
      break;
    }
  }

  // Detectar número de quartos
  const quartosMatch = lower.match(/(\d+)\s*quarto/);
  if (quartosMatch) {
    criterios.quartosMin = parseInt(quartosMatch[1], 10);
  }

  // Detectar número de suítes
  const suitesMatch = lower.match(/(\d+)\s*su[ií]te/);
  if (suitesMatch) {
    criterios.suitesMin = parseInt(suitesMatch[1], 10);
  }

  // Detectar vagas
  const vagasMatch = lower.match(/(\d+)\s*vaga/);
  if (vagasMatch) {
    criterios.vagasMin = parseInt(vagasMatch[1], 10);
  }

  // Detectar faixa de preço
  const precoMaxMatch = lower.match(/(?:até|ate|no máximo|no maximo|max)\s*([\d.,]+)\s*(mil|k|milh[aãoõ]+|mi)?/);
  if (precoMaxMatch) {
    criterios.precoMax = parseValorPreco(precoMaxMatch[1], precoMaxMatch[2]);
  }

  const precoMinMatch = lower.match(/(?:acima de|a partir de|min(?:imo)?)\s*([\d.,]+)\s*(mil|k|milh[aãoõ]+|mi)?/);
  if (precoMinMatch) {
    criterios.precoMin = parseValorPreco(precoMinMatch[1], precoMinMatch[2]);
  }

  // Detectar área
  const areaMatch = lower.match(/(\d+)\s*m[²2]/);
  if (areaMatch) {
    const area = parseInt(areaMatch[1], 10);
    if (lower.includes("acima") || lower.includes("partir")) {
      criterios.areaUtilMin = area;
    } else if (lower.includes("até") || lower.includes("ate")) {
      criterios.areaUtilMax = area;
    } else {
      // Assume como mínimo
      criterios.areaUtilMin = area;
    }
  }

  // Detectar bairro/localização (palavras após "em", "no", "na", "nos")
  const localMatch = lower.match(/(?:em|no|na|nos|nas)\s+([a-záàâãéèêíïóôõúüçñ\s]+?)(?:\s+(?:até|ate|para|com|acima|de|a partir|\d)|$)/);
  if (localMatch) {
    const local = localMatch[1].trim();
    // Ignora termos que são tipos de imóvel ou palavras de preço
    if (
      local.length > 2 &&
      !MAPA_TIPOS[local] &&
      !MAPA_NEGOCIO[local] &&
      !["centro", "venda", "aluguel"].includes(local)
    ) {
      criterios.bairro = local;
    } else if (local === "centro") {
      criterios.bairro = "centro";
    }
  }

  // Se não encontrou critérios específicos, usa como texto livre
  if (
    !criterios.tipo &&
    !criterios.negocio &&
    criterios.quartosMin == null &&
    criterios.precoMax == null &&
    !criterios.bairro
  ) {
    criterios.texto = texto;
  }

  return criterios;
}

function parseValorPreco(valor: string, unidade?: string): number {
  const num = parseFloat(valor.replace(/\./g, "").replace(",", "."));
  if (!Number.isFinite(num)) return 0;

  const unitLower = (unidade ?? "").toLowerCase();
  if (unitLower === "mil" || unitLower === "k") {
    return num * 1000 * 100; // centavos
  }
  if (unitLower.startsWith("milh") || unitLower === "mi") {
    return num * 1_000_000 * 100;
  }
  // Se número parece ser em reais
  return num > 1000 ? num * 100 : num * 1000 * 100;
}
