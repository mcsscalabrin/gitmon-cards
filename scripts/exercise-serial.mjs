/**
 * Exercita a atribuição atômica de serial contra um Redis de verdade.
 *
 * O gap 2.1 (`docs/gaps-revalidacao.md`) é sobre o que o Vitest não prova: a
 * atomicidade do script Lua. Com o cliente mockado dá para conferir quantas
 * vezes ele é chamado e com quais chaves; só um Redis real demonstra que duas
 * execuções simultâneas do mesmo serial devolvem o mesmo número.
 *
 * Uso:
 *   REDIS_URL=... node scripts/exercise-serial.mjs
 *
 * Roda contra `REDIS_URL` local ou de preview. Usa o namespace
 * `serial:exercise:v1:` próprio e apaga as chaves no fim — não toca no contador
 * real (`serial:v1:counter`) e não atribui serial de verdade.
 */
import { readFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");

/*
 * O script exercitado é o próprio texto que produção roda, extraído de
 * `lib/cards/serial.ts` — assim o teste nunca deriva do original. Se um dia a
 * atribuição mudar e o arquivo for editado, este script volta a exercitar o que
 * a produção passou a rodar, sem manutenção aqui.
 */
const serialSource = await readFile(join(root, "lib/cards/serial.ts"), "utf8");
const match = serialSource.match(/const ASSIGN = `([\s\S]*?)`;/);
if (!match) {
  console.error("[exercise-serial] não encontrei o script Lua em lib/cards/serial.ts");
  process.exit(2);
}
const ASSIGN = match[1];

const url = process.env.REDIS_URL?.trim();
if (!url) {
  console.error("[exercise-serial] REDIS_URL vazio — nada a exercitar.");
  console.error("  Uso: REDIS_URL=... node scripts/exercise-serial.mjs");
  console.error("  (ver docs/handoff.md — levantar um Redis local com Docker)");
  process.exit(1);
}

const { default: Redis } = await import("ioredis");
const makeClient = () =>
  new Redis(url, { lazyConnect: true, connectTimeout: 3000, maxRetriesPerRequest: 2 });

// Namespace próprio: um exercício não pode atribuir serial de verdade.
const CARD_KEY = "serial:exercise:v1:card:alice";
const COUNTER_KEY = "serial:exercise:v1:counter";

const fail = (message) => {
  console.error(`\n[exercise-serial] FALHA: ${message}`);
  process.exitCode = 1;
};

let clientA;
let clientB;
try {
  clientA = makeClient();
  await clientA.connect();
  console.log("[exercise-serial] conectado — script Lua extraído de lib/cards/serial.ts");
  console.log(`[exercise-serial] chaves: ${CARD_KEY} / ${COUNTER_KEY}\n`);

  await clientA.del(CARD_KEY, COUNTER_KEY);

  clientB = makeClient();
  await clientB.connect();

  /*
   * Duas execuções simultâneas do mesmo serial, em conexões diferentes —
   * o modelo de duas funções serverless. Se o script não fosse atômico, o GET
   * de cada uma veria o vazio e cada uma faria o próprio INCR.
   */
  const [first, second] = await Promise.all([
    clientA.eval(ASSIGN, 2, CARD_KEY, COUNTER_KEY),
    clientB.eval(ASSIGN, 2, CARD_KEY, COUNTER_KEY),
  ]);

  console.log(`  simultâneo — execução A: ${first}, execução B: ${second}`);
  if (first !== second) {
    fail(`o mesmo serial recebeu números diferentes (${first} e ${second})`);
  } else if (!(Number(first) > 0)) {
    fail(`número inválido recebido de volta (${first})`);
  } else {
    console.log("  OK: duas execuções simultâneas receberam o mesmo número");
  }

  // Idempotência: uma terceira execução não inventa número novo.
  const third = await clientA.eval(ASSIGN, 2, CARD_KEY, COUNTER_KEY);
  if (third !== first) {
    fail(`terceira execução mudou o serial (${third} !== ${first})`);
  } else {
    console.log(`  OK: execução posterior repete ${third}, sem sobrescrever`);
  }

  // O contador andou exatamente uma vez — a concorrência não queimou número.
  const counter = await clientA.get(COUNTER_KEY);
  if (String(Number(first)) !== counter) {
    fail(`contador em ${counter}, esperava ${first}`);
  } else {
    console.log(`  OK: contador em ${counter}, um INCR só por serial`);
  }

  // Serial diferente recebe número diferente (e seguinte).
  const other = await clientA.eval(ASSIGN, 2, "serial:exercise:v1:card:bob", COUNTER_KEY);
  if (other !== Number(first) + 1) {
    fail(`serial seguinte saiu ${other}, esperava ${Number(first) + 1}`);
  } else {
    console.log(`  OK: outro serial recebeu ${other}, exatamente o próximo número`);
  }

  console.log("\n[exercise-serial] sucesso — atomicidade exercitada contra Redis real");
} catch (error) {
  fail(`falha de conexão ou comando: ${error.message}`);
} finally {
  if (clientA) {
    try {
      await clientA.del(CARD_KEY, COUNTER_KEY, "serial:exercise:v1:card:bob");
    } catch {
      // limpeza falha não decide o veredito
    }
    clientA.disconnect();
  }
  if (clientB) clientB.disconnect();
}

process.exitCode = process.exitCode ?? 0;
