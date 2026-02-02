# Gestão de Leads (CRM)

## Quando usar
Quando o corretor quiser gerenciar leads, ver pipeline, qualificar contatos ou fazer follow-up.

## Captura automática
- Novos contatos via WhatsApp são capturados automaticamente como leads
- Status inicial: "novo"
- Telefone e nome são extraídos do contato

## Qualificação de leads
Para qualificar um lead, faça as seguintes perguntas (de forma natural):
1. Compra ou aluguel?
2. Tipo de imóvel?
3. Quantos quartos?
4. Bairro/região de preferência?
5. Faixa de preço?

Use `lead_buscar` para encontrar o lead e `lead_atualizar_status` para avançar no pipeline.

## Pipeline de vendas
```
novo → contato_inicial → qualificado → visita_agendada → proposta → negociação → fechado_ganho
                                                                                  → fechado_perdido
```

## Tools disponíveis
- `lead_criar` — Criar lead manualmente
- `lead_buscar` — Buscar por telefone ou listar com filtros
- `lead_atualizar_status` — Avançar/retroceder no pipeline
- `lead_followup` — Agendar ou listar follow-ups pendentes
- `dashboard` — Ver resumo geral (leads, imóveis, visitas)

## Follow-up
- Follow-ups são agendados automaticamente com base no status
- Use `lead_followup` ação="listar" para ver pendentes
- Use `lead_followup` ação="agendar" para agendar manualmente
