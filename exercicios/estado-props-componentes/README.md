# Estado, Props e Componentes — prática guiada

Projeto React (Vite) com a resolução dos 5 exercícios sobre os três conceitos
da aula: **componentes**, **props** e **estado**.

## Como rodar

```bash
npm install
npm run dev
```

## Estrutura

```
src/
├── App.jsx                 importa e renderiza todos os componentes
├── main.jsx                ponto de entrada
├── estilos.css             estilo simples, só para a tela não ficar crua
└── componentes/
    ├── MeuComponente.jsx        (modelo da aula) componente
    ├── CardDinamico.jsx         (modelo da aula) props como objeto + children
    ├── CardDesestruturado.jsx   (modelo da aula) props desestruturadas
    ├── Contador.jsx             (modelo da aula) estado com useState
    ├── ContadorCompleto.jsx     exercício 1
    ├── Saudador.jsx             exercício 2
    ├── PainelDeCliques.jsx      exercício 3
    ├── CardProduto.jsx          exercício 4, parte A
    ├── CardAviso.jsx            exercício 4, parte B
    └── CartaoPerfil.jsx         exercício 5
```

Os quatro primeiros são os arquivos-modelo da aula, mantidos aqui só como
referência. Os seis seguintes são os componentes novos, criados nos exercícios.

## Os exercícios

### 1 — ContadorCompleto

Estado numérico começando em 0 e três botões: `Incrementar`, `Decrementar` e
`Zerar`. As três funções seguem o mesmo molde — chamam o setter com o novo
valor: `setContador(contador + 1)`, `setContador(contador - 1)` e
`setContador(0)`.

**Parte B — mudar uma cópia altera a outra?** Não. No `App.jsx` estão as duas
cópias e cada uma anda para um lado. Cada `<ContadorCompleto />` escrito no JSX
é uma execução própria da função do componente, e cada execução chama o
`useState` de novo — são chamadas diferentes, logo caixas de estado diferentes.
O estado pertence à cópia (à instância), não ao arquivo.

### 2 — Saudador

Mesmo raciocínio do contador, só muda o tipo do conteúdo da caixa: em vez de um
número, um texto. O estado `nome` começa em `'Visitante'` e cada botão chama uma
função que guarda um nome diferente.

### 3 — PainelDeCliques

Dois `useState` no mesmo componente, um para `cliquesAzuis` e outro para
`cliquesVermelhos`. Cada `useState` cria uma caixa independente, com seu próprio
par getter/setter — por isso somar em um não mexe no outro.

### 4 — CardProduto e CardAviso

Os dois recebem props, cada um de um jeito:

- `CardProduto({ nome, preco })` — props já desestruturadas na assinatura.
- `CardAviso(props)` — recebe o objeto inteiro e lê `props.titulo`,
  `props.mensagem` e `props.children`.

O `children` é a prop que traz o que foi escrito entre a abertura e o fechamento
da tag. No `App.jsx`, o `<CardAviso>` recebe um `<h4>` e um `<button>` como
filhos, e eles aparecem dentro do card.

Detalhe importante: o nome da prop na chamada tem que ser igual ao nome lido
dentro do componente. Passar `preco` e desestruturar `{ valor }` traria
`undefined`.

### 5 — CartaoPerfil

Os dois conceitos juntos, com os papéis separados:

- o que **não muda** (`nome`, `curso`) chega por props, vindo do pai;
- o que **muda ao interagir** (`curtidas`) vive no estado, dentro do componente.

Como as curtidas estão no estado, cada cartão conta as suas próprias.

## A ideia que costura tudo

Uma variável comum (`let contador = 0`) até mudaria de valor, mas o React não
ficaria sabendo e a tela não seria redesenhada. Quem avisa o React é o setter:
`setContador(contador + 1)`.
