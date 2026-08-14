import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  serverExternalPackages: ["sharp", "ioredis"],

  // `public/` é servido estaticamente e não entra no bundle da função serverless.
  // As rotas de imagem leem esses arquivos do disco, então precisam ser rastreados
  // explicitamente — sem isto funciona em dev e quebra em produção.
  outputFileTracingIncludes: {
    "/api/card-image/**": ["./public/assets/**"],
    "/api/card-og/**": ["./public/assets/**"],
    "/api/battle/**": ["./public/assets/**"],
    "/api/duel/**": ["./public/assets/**"],
  },

  // A extensão .png na URL pública é cosmética — é o que torna o link colável em
  // Markdown. As rotas reais vivem em app/api/card-image/ e app/api/battle/.
  // Ordem importa: /battle/<id>.png precisa casar antes do genérico /<a>/<b>.png.
  //
  // Precisa ser `beforeFiles`: em `afterFiles` a rota dinâmica /[owner]/[repo]
  // casaria primeiro e /torvalds/linux.png viraria a página do repo "linux.png".
  // O preço é que estas regras passam na frente de `public/` — daí o recorte de
  // `/assets/` abaixo.
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: "/battle/:battleId.png",
          destination: "/api/battle/:battleId/image",
        },
        {
          source: "/duel/:duelId.png",
          destination: "/api/duel/:duelId/image",
        },
        {
          /*
           * `public/assets/` fica de fora: sem o recorte, qualquer asset de dois
           * segmentos (`/assets/card-back.png`) é lido como a carta do repo
           * "card-back" do dono "assets" e devolve carta de erro em vez do
           * arquivo. Com ele, `beforeFiles` não casa e o request segue para
           * `public/`.
           *
           * O `\\/` no lookahead é o que ancora o fim do segmento: `$` casaria só
           * com o fim da URL inteira, que aqui nunca é "assets".
           *
           * Custo assumido: cartas de repositório do dono literal `assets`
           * (github.com/assets) não são servidas. Um dono contra a pasta inteira.
           */
          source: "/:owner((?!assets\\/)[^\\/]+)/:repo.png",
          destination: "/api/card-image/:owner/:repo",
        },
        {
          source: "/:owner.png",
          destination: "/api/card-image/:owner",
        },
      ],
      afterFiles: [],
      fallback: [],
    };
  },
};

export default nextConfig;
