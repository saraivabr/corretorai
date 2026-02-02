# Geração de Propostas

## Quando usar
Quando o corretor quiser gerar uma proposta comercial para um lead/imóvel.

## Informações necessárias
- Dados do imóvel (use `imovel_detalhes`)
- Dados do lead/comprador (use `lead_buscar`)
- Valor da proposta
- Condições de pagamento
- Prazo de validade

## Modelo de proposta
Gere um texto estruturado com:
1. **Cabeçalho**: CorretorAI - Proposta Comercial
2. **Dados do Imóvel**: tipo, endereço, características
3. **Valor proposto**: em R$
4. **Condições**: entrada, financiamento, prazos
5. **Observações**: itens inclusos, ressalvas
6. **Validade**: prazo de validade da proposta
7. **Dados do corretor**: nome, CRECI

## Após gerar
- Atualize o status do lead para "proposta"
- Registre a interação
- Agende follow-up para 2-3 dias
