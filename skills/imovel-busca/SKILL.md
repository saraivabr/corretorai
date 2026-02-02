# Busca de Imóveis

## Quando usar
Quando o usuário (lead ou corretor) pedir para buscar, encontrar, ou recomendar imóveis.

## Como funciona
1. Identifique os critérios de busca na mensagem do usuário
2. Use a tool `imovel_buscar` com os critérios extraídos
3. Apresente os resultados de forma organizada

## Critérios que podem ser extraídos
- **Tipo**: apartamento, casa, terreno, sala comercial, etc.
- **Negócio**: venda ou aluguel
- **Localização**: cidade, bairro, região
- **Preço**: faixa de valores (até X, a partir de Y)
- **Quartos**: número mínimo de quartos
- **Área**: metragem mínima ou máxima
- **Vagas**: vagas de garagem

## Exemplos de consultas
- "Tem apartamento de 3 quartos no centro até 500 mil?"
- "Busque casas para alugar em Copacabana"
- "Quero ver terrenos acima de 300m² em Campinas"
- "Algum imóvel com suíte e 2 vagas na zona sul?"

## Apresentação dos resultados
- Liste os imóveis encontrados com resumo: título, quartos, área, preço, localização
- Para detalhes, use `imovel_detalhes` com o ID
- Se não encontrar, sugira ajustar os critérios (ampliar região, flexibilizar preço)
- Limite a 5-10 resultados por vez; ofereça ver mais se houver

## Formatação
- Preços em R$ (ex: R$ 500.000,00)
- Áreas em m²
- Organize em lista numerada para fácil referência
