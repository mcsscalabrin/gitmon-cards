import { effectiveness } from "../cards/elements";
import type { Card } from "../cards/types";
import type { BattleResult, BattleTurn, Side } from "./types";

/**
 * Simulação turno-a-turno (RFC 7.3).
 *
 * Duas camadas de aleatoriedade, independentes: qual ataque o lado ativo usa, e
 * uma variância de ±15% no dano. É por isso que a URL `/<a>/vs/<b>` não pode ter
 * cache duro — rodar de novo tem que poder dar outro resultado (RFC 7.3/11).
 *
 * Tudo aqui é determinístico **dada a semente**. A semente vai junto no resultado,
 * então uma batalha é sempre reproduzível a partir do que foi guardado.
 */

/** Teto de segurança, contando os dois lados (RFC 7.3, item 6). */
export const MAX_TURNS = 20;

/** Variância por golpe (RFC 7.3, item 4). */
const VARIANCE = 0.15;

/**
 * Um ataque tira **um terço** do dano impresso na carta.
 *
 * Desvio deliberado da RFC 7.3, item 3, que manda usar `attack.damage` direto.
 * Seguindo a letra, a batalha acaba no primeiro golpe entre quaisquer duas
 * cartas relevantes: o HP satura em 250 (RFC 6.1) e o dano satura em 300, então
 * todo perfil com mais de 75 estrelas nocauteia qualquer outro de primeira. O
 * log de turnos vira uma linha só, e quem começa ganha — o que anula tanto o
 * pedido de simulação turno-a-turno quanto o de aleatoriedade.
 *
 * Com 1/3, um ataque de 300 tira ~100: uma carta de 250 de HP aguenta três
 * golpes, dois se for fraca ao tipo. Batalhas típicas ficam entre 4 e 8 turnos.
 *
 * A própria RFC 7.3 marca a mecânica como "não travada — ponto de partida pra
 * sessão de implementação refinar", então isto é refino, não contradição. As
 * cartas continuam mostrando o dano da RFC 6.1 sem alteração nenhuma.
 */
const DAMAGE_SCALE = 1 / 3;

/** mulberry32: PRNG pequeno e determinístico. Não precisa ser criptográfico. */
function rng(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function randomSeed(): number {
  const buf = new Uint32Array(1);
  globalThis.crypto.getRandomValues(buf);
  return buf[0];
}

export function simulate(
  a: Card,
  b: Card,
  id: string,
  seed: number = randomSeed(),
): BattleResult {
  const random = rng(seed);
  const cards: Record<Side, Card> = { a, b };
  const hp: Record<Side, number> = { a: a.hp, b: b.hp };

  /**
   * Quem começa é sorteado (questão Q7). A RFC 7.3 propôs o desafiante da URL e
   * deixou o sorteio como alternativa; sorteando, a revanche entre os mesmos dois
   * perfis não fica presa numa vantagem fixa de quem digitou a URL.
   */
  const starter: Side = random() < 0.5 ? "a" : "b";

  const turns: BattleTurn[] = [];
  let attacker: Side = starter;
  let winner: Side | null = null;
  let decidedBy: BattleResult["decidedBy"] = "hp";

  for (let index = 1; index <= MAX_TURNS; index += 1) {
    const defender: Side = attacker === "a" ? "b" : "a";
    const turn = strike(cards[attacker], cards[defender], attacker, index, hp[defender], random);
    hp[defender] = turn.defenderHp;
    turns.push(turn);

    if (hp[defender] <= 0) {
      winner = attacker;
      decidedBy = "knockout";
      break;
    }

    attacker = defender;
  }

  if (!winner) {
    winner = byRemainingHp(cards, hp);
  }

  return {
    id,
    seed,
    createdAt: new Date().toISOString(),
    a,
    b,
    starter,
    turns,
    winner,
    finalHp: { a: Math.max(0, hp.a), b: Math.max(0, hp.b) },
    decidedBy,
  };
}

function strike(
  attacker: Card,
  defender: Card,
  side: Side,
  index: number,
  defenderHp: number,
  random: () => number,
): BattleTurn {
  // Sem ataque não há golpe fabricado: uma carta de perfil sem repositórios
  // legitimamente não tem o que usar, e inventar um ataque falsificaria o dado.
  if (attacker.attacks.length === 0) {
    return {
      index,
      attacker: side,
      attack: null,
      baseDamage: 0,
      multiplier: 1,
      damage: 0,
      defenderHp,
    };
  }

  const attack = attacker.attacks[Math.floor(random() * attacker.attacks.length)];
  const multiplier = effectiveness(attacker.element, defender);
  const variance = 1 - VARIANCE + random() * VARIANCE * 2;
  const damage = Math.max(
    1,
    Math.round(attack.damage * DAMAGE_SCALE * multiplier * variance),
  );

  return {
    index,
    attacker: side,
    attack: attack.name,
    baseDamage: attack.damage,
    multiplier,
    damage,
    defenderHp: defenderHp - damage,
  };
}

/** Desempate no teto de turnos: maior % de HP restante (RFC 7.3, item 6). */
function byRemainingHp(
  cards: Record<Side, Card>,
  hp: Record<Side, number>,
): Side | null {
  const ratio = (side: Side) => Math.max(0, hp[side]) / Math.max(1, cards[side].hp);
  const a = ratio("a");
  const b = ratio("b");
  if (a === b) return null;
  return a > b ? "a" : "b";
}
