/** Schema de imóvel para o CorretorAI. */

export const TIPO_IMOVEL = [
  "apartamento",
  "casa",
  "terreno",
  "sala_comercial",
  "loja",
  "galpao",
  "cobertura",
  "kitnet",
  "chacara",
  "fazenda",
] as const;
export type TipoImovel = (typeof TIPO_IMOVEL)[number];

export const TIPO_NEGOCIO = ["venda", "aluguel", "venda_aluguel"] as const;
export type TipoNegocio = (typeof TIPO_NEGOCIO)[number];

export const STATUS_IMOVEL = ["disponivel", "reservado", "vendido", "alugado", "inativo"] as const;
export type StatusImovel = (typeof STATUS_IMOVEL)[number];

export type Endereco = {
  logradouro?: string;
  numero?: string;
  complemento?: string;
  bairro?: string;
  cidade: string;
  estado: string;
  cep?: string;
  latitude?: number;
  longitude?: number;
};

export type Imovel = {
  id: string;
  tipo: TipoImovel;
  negocio: TipoNegocio;
  status: StatusImovel;
  titulo: string;
  descricao?: string;
  endereco: Endereco;

  // Características
  quartos?: number;
  suites?: number;
  banheiros?: number;
  vagas?: number;
  areaUtil?: number;
  areaTotal?: number;
  andarPavimento?: number;

  // Valores (em centavos para precisão)
  preco?: number;
  precoCondominio?: number;
  precoIptu?: number;
  precoAluguel?: number;

  // Amenidades
  amenidades?: string[];

  // Mídia
  fotos?: string[];
  videos?: string[];

  // Corretor responsável
  corretorNome?: string;
  corretorCreci?: string;
  corretorTelefone?: string;

  // Metadata
  criadoEm: string;
  atualizadoEm: string;
  observacoes?: string;
};

/** Critérios para busca de imóveis. */
export type CriteriosBusca = {
  tipo?: TipoImovel[];
  negocio?: TipoNegocio;
  status?: StatusImovel[];
  cidade?: string;
  estado?: string;
  bairro?: string;
  precoMin?: number;
  precoMax?: number;
  quartosMin?: number;
  quartosMax?: number;
  suitesMin?: number;
  banheirosMin?: number;
  vagasMin?: number;
  areaUtilMin?: number;
  areaUtilMax?: number;
  amenidades?: string[];
  texto?: string;
};

/** Formatação de preço em R$. */
export function formatarPreco(centavos: number): string {
  const reais = centavos / 100;
  return reais.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}

/** Formatação de área em m². */
export function formatarArea(metros: number): string {
  return `${metros.toLocaleString("pt-BR")} m²`;
}

/** Resumo curto do imóvel para listagem. */
export function resumoImovel(imovel: Imovel): string {
  const partes: string[] = [imovel.titulo];
  if (imovel.quartos) partes.push(`${imovel.quartos} quarto${imovel.quartos > 1 ? "s" : ""}`);
  if (imovel.areaUtil) partes.push(formatarArea(imovel.areaUtil));
  if (imovel.preco) partes.push(formatarPreco(imovel.preco));
  if (imovel.endereco.bairro) partes.push(imovel.endereco.bairro);
  partes.push(`${imovel.endereco.cidade}/${imovel.endereco.estado}`);
  return partes.join(" | ");
}
