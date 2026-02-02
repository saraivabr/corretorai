# Cadastro de Imóveis

## Quando usar
Quando o corretor quiser cadastrar, adicionar ou registrar um novo imóvel no catálogo.

## Informações obrigatórias
1. **Tipo**: apartamento, casa, terreno, sala_comercial, loja, galpao, cobertura, kitnet, chacara, fazenda
2. **Negócio**: venda, aluguel, ou venda_aluguel
3. **Título**: descrição curta e atrativa
4. **Cidade** e **Estado**

## Informações opcionais (mas recomendadas)
- Bairro, logradouro, CEP
- Preço (em centavos: R$ 500.000 = 50000000)
- Quartos, suítes, banheiros, vagas
- Área útil e total (m²)
- Condomínio, IPTU
- Descrição detalhada
- Amenidades (piscina, churrasqueira, academia, etc.)

## Fluxo de cadastro via chat
1. Pergunte o tipo e negócio
2. Pergunte localização (cidade, estado, bairro)
3. Pergunte preço
4. Pergunte características (quartos, área, vagas)
5. Use `imovel_cadastrar` com todos os dados coletados
6. Confirme o cadastro mostrando o resumo

## Dicas
- Se o corretor enviar informações parciais, cadastre e pergunte o resto depois
- Aceite preços em linguagem natural: "500 mil", "1.2 milhão"
- Converta para centavos antes de cadastrar
- Para fotos, oriente o corretor a enviar as imagens após o cadastro
