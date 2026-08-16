import type { AxisRating, ProfileAxis } from "./ratings";
import type { CardClass } from "./types";

/**
 * Classe ex/Mega ex, tirada do pico da assinatura de escala externa.
 *
 * A dimensão é **concentração + piso de escala**: a classe sai do maior valor
 * normalizado entre Alcance (estrelas) e Comunidade (seguidores/forks), e esse
 * pico precisa vencer um piso absoluto — sem piso, um dev que programa em doze
 * linguagens (Amplitude 99) e um repositório criado ontem (Atividade 99)
 * seriam Mega ex sem ter escala nenhuma.
 *
 * Só os eixos de escala externa conferem classe de propósito. Volume, Veterania,
 * Amplitude e Atividade saturariam sozinhos o topo da escada e tornariam o
 * título indistinguível de um atributo de casa.
 *
 *   pico < 80            →  standard
 *   pico 80–98           →  ex
 *   pico = 99 (saturado) →  mega_ex
 *
 * Calibrado contra os mesmos perfis reais de `./rarity.ts`:
 *
 *   conta nova (10★, 5 seg)        pico ~19   standard
 *   dev comum (200★, 100 seg)      pico ~42   standard
 *   kentcdodds  (45k★, 35k seg)    pico ~85   ex
 *   gaearon     (30k★, 91k seg)    pico ~89   ex
 *   yyx990803   (14k★, 109k seg)   pico ~92   ex
 *   tj          (135k★, 52k seg)   pico ~96   ex
 *   torvalds    (254k★, 316k seg)  pico  99   mega_ex
 *   sindresorhus(851k★, 81k seg)   pico  99   mega_ex
 *
 * O corte de 80 não é redondo por acaso: em log, é o ponto em que o perfil
 * precisa de ~23k estrelas ou ~28k seguidores para alcançar — pouca gente,
 * mas não só celebridade. É o mesmo espírito do piso de 1.500 pontos que
 * separa `double_rare` de `rare`.
 */
const CLASS_FLOOR = 80;
const CLASS_TOP = 99;

/** Eixos externos que podem conferir classe. Alcance e Comunidade. */
const EXTERNAL_AXES: readonly ProfileAxis[] = ["reach", "community"];

export function cardClassFor(ratings: AxisRating[]): CardClass {
  const peak = Math.max(
    0,
    ...EXTERNAL_AXES.map(
      (axis) => ratings.find((r) => r.axis === axis)?.value ?? 0,
    ),
  );

  if (peak >= CLASS_TOP) return "mega_ex";
  if (peak >= CLASS_FLOOR) return "ex";
  return "standard";
}
