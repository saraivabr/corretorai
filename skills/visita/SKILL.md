# Agendamento de Visitas

## Quando usar
Quando um lead ou corretor quiser agendar, listar ou gerenciar visitas a imóveis.

## Agendar visita
1. Identifique o lead (por telefone ou nome via `lead_buscar`)
2. Identifique o imóvel (por busca via `imovel_buscar`)
3. Defina data e hora
4. Use `visita_criar` com lead_id, imovel_id e data_hora

## Listar visitas
- `visita_listar` com hoje=true para visitas do dia
- `visita_listar` com lead_id para visitas de um lead específico

## Formato de data
- Aceite formatos brasileiros: "amanhã às 15h", "sábado 10:00", "25/03 às 14:30"
- Converta para ISO 8601 antes de registrar

## Após a visita
- Registre feedback: nota de interesse (1-5) e comentários
- Atualize o status do lead conforme resultado
