# Checklist: o app no celular

Este roteiro existe porque as telas logadas **não foram abertas em navegador** na entrega da branch `feature/mobile-responsivo`
(não há credenciais nem banco no ambiente de desenvolvimento). Foram verificadas em Chromium só as telas públicas
(`/login`, `/signup`) e uma página de teste estática com o CSS real compilado. Passe por aqui antes de dar a branch como boa.

## Como testar

- Chrome/Edge: DevTools → modo dispositivo, larguras **360**, **390** e **768** (e 1280 para conferir que o desktop não mudou).
- Aparelho real, se possível: Android (Chrome) e iPhone (Safari). Para o celular acessar o `next dev`, use o IP da máquina na rede.
- Em cada tela, conferir o item **“sem rolagem horizontal da página”**: deslize o dedo para os lados fora de tabelas e abas. A página
  não pode se mexer. No console do DevTools: `document.documentElement.scrollWidth <= innerWidth` deve dar `true`.

## 1. Menu retrátil (abaixo de 1024 px)

- [ ] Abre fechado; barra superior fina com ☰ (44×44), título da tela (cortado com “…” se longo) e os sinos à direita.
- [ ] ☰ abre a gaveta; largura `min(86vw, 320px)`; fundo escurece; a página de trás não rola.
- [ ] Fecha: toque no fundo, no X, em um item do menu, arrastando para a esquerda sobre o menu e com `Esc` (teclado).
- [ ] Arrastar a partir da borda esquerda (~24 px) para a direita abre; o menu acompanha o dedo. Soltar antes de 35% (ou sem velocidade) volta.
- [ ] Rolar a página na vertical, rolar a tabela/abas na horizontal e arrastar dentro de campos **não** abrem o menu.
- [ ] Lista de itens rola dentro da gaveta; rodapé (e-mail, Personalizar navegação, Entrar numa empresa com código, Sair) fica sempre visível.
- [ ] Trocar de tela fecha a gaveta; ao reabrir, a rolagem do menu continua onde estava.
- [ ] Com o menu aberto, `Tab` não sai da gaveta; ao fechar, o foco volta ao botão ☰.
- [ ] iPhone/Safari: o gesto de borda pode conflitar com o “voltar” do navegador. O botão ☰ é o caminho garantido.
- [ ] Com “reduzir movimento” ativo no sistema, a gaveta abre sem animação.
- [ ] Sinos (alertas e solicitações): o painel cabe na tela, não passa da borda direita, e fecha ao tocar fora.
- [ ] Desktop (≥ 1024 px): barra lateral fixa de 256 px como sempre; sem barra superior, sem ☰.

## 2. Telas (marcar em 360 / 390 / 768)

Para cada uma: sem rolagem horizontal da página, botões ≥ 44 px de altura, campos com fonte ≥ 16 px (o iPhone não dá zoom ao focar),
formulários em 1 coluna abaixo de 640 px, tabelas rolando **dentro** do próprio quadro.

| Tela | 360 | 390 | 768 | Observações |
|---|---|---|---|---|
| Dashboard | ☐ | ☐ | ☐ | cards e gráficos cabem na largura |
| Impressão 3D → Calculadora rápida | ☐ | ☐ | ☐ | resultado e botões empilham |
| Impressão 3D → Precificação | ☐ | ☐ | ☐ | abas em faixa rolável, aba ativa visível |
| Impressão 3D → Estoque (material / peças) | ☐ | ☐ | ☐ | tabelas dentro de contêiner rolável |
| Impressão 3D → Produção | ☐ | ☐ | ☐ | kanban rola dentro do quadro |
| Impressão 3D → Impressoras / Fornecedores / Qualidade | ☐ | ☐ | ☐ | |
| Impressão 3D → Simulador | ☐ | ☐ | ☐ | |
| Pedidos / Orçamentos / Clientes | ☐ | ☐ | ☐ | |
| Leads (kanban) / Agenda / Calendário | ☐ | ☐ | ☐ | |
| Sócios (código de cofundador, pedidos, equipe) | ☐ | ☐ | ☐ | código grande quebra linha, não estoura |
| Configurações | ☐ | ☐ | ☐ | |
| RH / Jurídico / Marketing / Suporte / Pessoal | ☐ | ☐ | ☐ | |
| Seletor de empresa (menu e vendedor) | ☐ | ☐ | ☐ | lista cabe na gaveta |
| Área do vendedor (`/vendedor/leads`, `/vendedor/agenda`) | ☐ | ☐ | ☐ | topo com logo, empresa e abas |
| Entrar numa empresa com código / Nova empresa | ☐ | ☐ | ☐ | |

## 3. Janelas (modais)

- [ ] Abaixo de 640 px abrem como folha na base (ou tela cheia), com no máximo `100dvh`; o conteúdo rola e o cabeçalho/ações continuam visíveis.
- [ ] Teclado virtual aberto não esconde o botão principal do formulário.
- [ ] Nenhuma janela passa da largura da tela.

## 4. Sem “só passa o mouse”

- [ ] Toda ação que no desktop aparece só no hover (ícones de editar/excluir em linhas, tooltips) tem como ser feita no toque.

## 5. Para a segunda passada (não feito nesta branch)

- Listas principais (pedidos, produção, estoque, orçamentos, clientes, impressoras) como cartões em vez de tabela com rolagem interna.
- Botão principal fixo no rodapé em formulários longos (respeitando a área segura do iPhone) e barra de ações fixa dentro das janelas.
- Revisão tela a tela de calculadora de preço, dashboard, kanban e gráficos em 360/390/768, com as telas logadas abertas.
- Verificação automática (Playwright) das rotas logadas, com conta de teste.
- Seletores de empresa/modo dentro da área rolável da gaveta (dropdowns).
- Teste em aparelho real: Safari iOS (gesto de borda × “voltar”, área segura, barra de endereço dinâmica), toque, foco, sinos.

## Regras automáticas que protegem o layout

`node scripts/auditar-isolamento.mts` falha se um componente de página usar `w-screen`, `100vw` (fora de `calc(100vw - …)`),
largura fixa em px maior que 360 sem `max-w-*`, ou `min-w-[Npx]` > 360 em arquivo sem `overflow-x-auto`.
A decisão do gesto, o modo da barra por largura e o título da barra superior estão em `lib/sidebar-mobile.ts` e cobertos em
`scripts/testar-acesso.mts`.
