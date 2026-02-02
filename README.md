# CorretorAI — Seu Assistente Imobiliário com Inteligência Artificial

<p align="center">
  <strong>O bot que transforma seu WhatsApp numa máquina de vendas de imóveis.</strong>
</p>

<p align="center">
  <a href="LICENSE"><img src="https://img.shields.io/badge/Licença-MIT-blue.svg?style=for-the-badge" alt="MIT License"></a>
  <a href="https://github.com/saraivabr/corretorai"><img src="https://img.shields.io/badge/GitHub-CorretorAI-181717?style=for-the-badge&logo=github" alt="GitHub"></a>
</p>

---

## O que é o CorretorAI?

O **CorretorAI** é um assistente de inteligência artificial feito sob medida para **corretores de imóveis no Brasil**. Ele roda no seu computador e se conecta direto ao seu WhatsApp — quando um cliente manda mensagem, o bot já entra em ação.

**Na prática, ele faz o seguinte:**

- **Captura leads automaticamente** — chegou mensagem de número novo? Já vira um contato no CRM
- **Qualifica o cliente por chat** — pergunta o que a pessoa procura (compra/aluguel, tipo, bairro, preço)
- **Cadastra e busca imóveis** — você diz "cadastra um apt de 3 quartos no centro por 500 mil" e ele entende
- **Agenda visitas** — organiza quem vai ver qual imóvel e quando
- **Faz follow-up sozinho** — não deixa nenhum lead esfriar, manda lembrete automático
- **Mostra o dashboard** — resumo de tudo: quantos leads, imóveis, visitas do dia, pipeline

Tudo isso rodando local na sua máquina, sem depender de servidor na nuvem.

---

## Como instalar

### O que você precisa

- **Node.js 22.12 ou superior** — [Baixe aqui](https://nodejs.org/)
- **pnpm** — rode `npm install -g pnpm` se não tiver
- **Git** — pra clonar o projeto

### Passo a passo

```bash
# 1. Clone o projeto
git clone https://github.com/saraivabr/corretorai.git
cd corretorai

# 2. Instale as dependências
pnpm install

# 3. Compile o projeto
pnpm build

# 4. Rode o gateway
pnpm dev
```

### Quer usar o comando `corretorai` direto no terminal?

```bash
pnpm build
npm link

# Agora é só usar:
corretorai gateway run
```

---

## Conectando o WhatsApp

```bash
# Faz login no WhatsApp (aparece um QR code no terminal)
corretorai channels login whatsapp

# Sobe o bot
corretorai gateway run

# Verifica se tá tudo conectado
corretorai channels status
```

Escaneie o QR code com o WhatsApp do celular (igual WhatsApp Web) e pronto — o bot já começa a responder.

---

## O que o bot sabe fazer (comandos por chat)

Você conversa com ele naturalmente. Alguns exemplos:

| Você diz no chat | O que acontece |
|---|---|
| "Cadastra um apartamento de 3 quartos no Jardins, SP, 800 mil" | Imóvel cadastrado no sistema |
| "Busca casa com 4 quartos em Campinas até 1 milhão" | Lista imóveis compatíveis |
| "Mostra os detalhes do imóvel X" | Ficha completa do imóvel |
| "Cria um lead pro João, telefone 11999887766" | Contato salvo no CRM |
| "Quais leads estão pendentes de follow-up?" | Lista quem precisa de retorno |
| "Agenda visita do João no apartamento X pra sexta às 14h" | Visita agendada |
| "Dashboard" | Resumo geral (leads, imóveis, visitas) |

---

## Como funciona por dentro

```
        Cliente manda mensagem no WhatsApp
                      │
                      ▼
        ┌──────────────────────────┐
        │     Gateway CorretorAI   │
        │    (roda na sua máquina) │
        └────────────┬─────────────┘
                     │
          ┌──────────┼──────────┐
          │          │          │
          ▼          ▼          ▼
      CRM/Leads   Imóveis   Agente IA
      (SQLite)    (SQLite)   (Claude)
```

- **WhatsApp** conecta via Baileys (mesmo protocolo do WhatsApp Web)
- **Banco de dados** é SQLite local — seus dados ficam na sua máquina
- **IA** usa Claude (Anthropic) pra entender o que o cliente quer
- **Tudo roda local** — sem servidor, sem mensalidade de plataforma

---

## Onde ficam os dados

```
~/.corretorai/
├── corretorai.json          # Configurações
├── data/
│   └── corretorai.db        # Banco SQLite (imóveis, leads, visitas)
├── credentials/              # Credenciais do WhatsApp
└── sessions/                 # Sessões do agente IA
```

---

## Estrutura do projeto

```
src/
├── imoveis/          # Catálogo de imóveis (schema, store, tools, busca)
├── crm/              # CRM de leads (schema, store, tools, qualificação, follow-up)
├── agents/           # Agente IA (system prompt, tools)
├── web/              # Conexão WhatsApp (Baileys)
├── channels/         # Registro de canais
└── config/           # Configurações e paths

skills/               # Conhecimento do agente em Markdown
├── imovel-busca/     # Como buscar imóveis
├── imovel-cadastro/  # Como cadastrar imóveis
├── crm-lead/         # Gestão de leads
├── visita/           # Agendamento de visitas
├── proposta/         # Propostas comerciais
├── mercado/          # Análise de mercado
└── financiamento/    # Calculadora de financiamento
```

---

## Comandos úteis pra desenvolvimento

```bash
pnpm install          # Instala dependências
pnpm build            # Compila o TypeScript
pnpm dev              # Roda em modo desenvolvimento
pnpm test             # Roda os testes (42 testes)
pnpm lint             # Verifica o código
```

---

## Pipeline de vendas (CRM)

O CRM tem um pipeline completo de vendas:

```
Novo → Contato Inicial → Qualificado → Visita Agendada → Proposta → Negociação → Fechado!
                                                                                    │
                                                                              (ou Perdido)
```

Cada lead passa por essas etapas automaticamente conforme a conversa avança.

---

## Tipos de imóvel suportados

- Apartamento
- Casa
- Terreno
- Sala comercial
- Loja
- Galpão
- Cobertura
- Kitnet
- Chácara
- Fazenda

---

## Requisitos técnicos

| Requisito | Versão |
|---|---|
| Node.js | >= 22.12.0 |
| pnpm | >= 8 |
| Sistema | macOS, Linux ou Windows (WSL2) |

---

## Licença

MIT — use à vontade, modifique como quiser.

---

## Contribuindo

Achou um bug? Tem uma ideia? Abre uma [issue](https://github.com/saraivabr/corretorai/issues) ou manda um PR.

---

<p align="center">
  Feito com IA para corretores que querem vender mais e perder menos tempo.
</p>
