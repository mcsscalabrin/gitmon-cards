"use client";

import { useEffect, useRef } from "react";

/**
 * Fundo de ondas com trama ordenada (dithering), atrás da home.
 *
 * Porta do `Dither` do React Bits — mesma receita: ruído simplex somado em
 * oitavas (fbm) desenha ondas lentas, a imagem é quantizada em poucos níveis e
 * uma matriz de Bayer 8×8 espalha o erro dessa quantização em pontinhos. É o
 * ponto: sem a trama, quatro níveis viram faixas chapadas; com ela, viram grão.
 *
 * O original roda sobre `three` + `@react-three/fiber` + `postprocessing`, em
 * dois passes com render target no meio. Aqui é um `<canvas>` de WebGL cru e um
 * pass só — o mesmo que `TiltCard` fez com o `ReflectiveCard` da mesma
 * biblioteca (ver `docs/foil-especular.md`). O motivo é o mesmo dos dois casos:
 * o projeto inteiro tem cinco dependências de runtime, e ~600 KB de motor 3D
 * para desenhar um quad de tela cheia não passa nesse orçamento. O segundo pass
 * do original também não é necessário: pixelar antes de amostrar dá o mesmo
 * resultado que renderizar grande e reduzir depois.
 *
 * A saída sai em **alpha**, não em RGB: o canvas é transparente e quem pinta o
 * preto continua sendo `--bg` do site. Assim o fundo do produto é um só, e a
 * trama é uma camada por cima dele — se este componente não montar (WebGL
 * indisponível, JS desligado), a home fica exatamente como era.
 */

/** Níveis de quantização. Em 4 a trama ainda lê como trama; em 8 vira degradê. */
const STEPS = 4;

/** Lado da célula, em pixels de CSS. O canvas é upscalado com `pixelated`. */
const PIXEL = 2;

/** Cor da onda — ardósia fria, deliberadamente longe do amarelo da marca. */
const WAVE = [0.42, 0.48, 0.63];

/** Avanço no eixo de tempo do ruído, por segundo. */
const SPEED = 0.055;

const VERTEX = `attribute vec2 aPos;
void main() { gl_Position = vec4(aPos, 0.0, 1.0); }`;

const FRAGMENT = `precision mediump float;

uniform vec2 uResolution;
uniform float uTime;
uniform vec2 uPointer;
uniform float uPointerOn;
uniform vec3 uWave;
uniform float uPixel;
uniform float uSteps;

/* Simplex 3D de Ashima/Gustavson, domínio público. A terceira dimensão é o
   tempo: é o que faz a onda deslizar em vez de piscar. */
vec3 mod289(vec3 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 mod289(vec4 x) { return x - floor(x * (1.0 / 289.0)) * 289.0; }
vec4 permute(vec4 x) { return mod289(((x * 34.0) + 1.0) * x); }
vec4 taylorInvSqrt(vec4 r) { return 1.79284291400159 - 0.85373472095314 * r; }

float snoise(vec3 v) {
  const vec2 C = vec2(1.0 / 6.0, 1.0 / 3.0);
  const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);

  vec3 i = floor(v + dot(v, C.yyy));
  vec3 x0 = v - i + dot(i, C.xxx);

  vec3 g = step(x0.yzx, x0.xyz);
  vec3 l = 1.0 - g;
  vec3 i1 = min(g.xyz, l.zxy);
  vec3 i2 = max(g.xyz, l.zxy);

  vec3 x1 = x0 - i1 + C.xxx;
  vec3 x2 = x0 - i2 + C.yyy;
  vec3 x3 = x0 - D.yyy;

  i = mod289(i);
  vec4 p = permute(permute(permute(
      i.z + vec4(0.0, i1.z, i2.z, 1.0))
    + i.y + vec4(0.0, i1.y, i2.y, 1.0))
    + i.x + vec4(0.0, i1.x, i2.x, 1.0));

  float n_ = 0.142857142857;
  vec3 ns = n_ * D.wyz - D.xzx;

  vec4 j = p - 49.0 * floor(p * ns.z * ns.z);

  vec4 x_ = floor(j * ns.z);
  vec4 y_ = floor(j - 7.0 * x_);

  vec4 x = x_ * ns.x + ns.yyyy;
  vec4 y = y_ * ns.x + ns.yyyy;
  vec4 h = 1.0 - abs(x) - abs(y);

  vec4 b0 = vec4(x.xy, y.xy);
  vec4 b1 = vec4(x.zw, y.zw);

  vec4 s0 = floor(b0) * 2.0 + 1.0;
  vec4 s1 = floor(b1) * 2.0 + 1.0;
  vec4 sh = -step(h, vec4(0.0));

  vec4 a0 = b0.xzyw + s0.xzyw * sh.xxyy;
  vec4 a1 = b1.xzyw + s1.xzyw * sh.zzww;

  vec3 p0 = vec3(a0.xy, h.x);
  vec3 p1 = vec3(a0.zw, h.y);
  vec3 p2 = vec3(a1.xy, h.z);
  vec3 p3 = vec3(a1.zw, h.w);

  vec4 norm = taylorInvSqrt(vec4(dot(p0, p0), dot(p1, p1), dot(p2, p2), dot(p3, p3)));
  p0 *= norm.x;
  p1 *= norm.y;
  p2 *= norm.z;
  p3 *= norm.w;

  vec4 m = max(0.6 - vec4(dot(x0, x0), dot(x1, x1), dot(x2, x2), dot(x3, x3)), 0.0);
  m = m * m;
  return 42.0 * dot(m * m, vec4(dot(p0, x0), dot(p1, x1), dot(p2, x2), dot(p3, x3)));
}

/*
 * Bayer 8×8 por recursão, e não como tabela de 64 constantes: array com lista de
 * inicialização não existe em GLSL ES 1.0, e usar a versão com tabela obrigaria
 * o shader inteiro a subir para WebGL 2 — mais superfície de falha do que este
 * enfeite justifica. A matriz 2×2 sai de fract(x/2 + y²·3/4), que dá
 * [0, 2; 3, 1]/4, e cada nível seguinte é o anterior meio passo menor somado a
 * ela: é a própria definição da matriz ordenada.
 */
float bayer2(vec2 a) {
  a = floor(a);
  return fract(a.x * 0.5 + a.y * a.y * 0.75);
}
#define bayer4(a) (bayer2(0.5 * (a)) * 0.25 + bayer2(a))
#define bayer8(a) (bayer4(0.5 * (a)) * 0.25 + bayer2(a))

float fbm(vec3 p) {
  float value = 0.0;
  float amp = 0.5;
  for (int i = 0; i < 4; i++) {
    value += amp * abs(snoise(p));
    p *= 2.4;
    amp *= 0.45;
  }
  return value;
}

void main() {
  /*
   * A célula é a unidade de tudo: a onda é amostrada no centro dela (é isto que
   * pixela) e o limiar de Bayer é indexado por ela (é isto que faz a trama
   * ficar parada em relação à tela, em vez de nadar junto com a onda).
   */
  vec2 cell = floor(gl_FragCoord.xy / uPixel);
  vec2 uv = ((cell + 0.5) * uPixel) / uResolution - 0.5;
  uv.x *= uResolution.x / uResolution.y;

  float wave = fbm(vec3(uv * 2.1, uTime));

  vec2 pointer = uPointer / uResolution - 0.5;
  pointer.x *= uResolution.x / uResolution.y;
  wave += uPointerOn * 0.45 * (1.0 - smoothstep(0.0, 0.3, length(uv - pointer)));

  float levels = uSteps - 1.0;
  wave += (bayer8(cell) - 0.5) / levels;
  wave = floor(wave * levels + 0.5) / levels;

  gl_FragColor = vec4(uWave, clamp(wave, 0.0, 1.0));
}`;

function compile(gl: WebGLRenderingContext, type: number, source: string) {
  const shader = gl.createShader(type);
  if (!shader) return null;

  gl.shaderSource(shader, source);
  gl.compileShader(shader);

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    gl.deleteShader(shader);
    return null;
  }

  return shader;
}

function link(gl: WebGLRenderingContext) {
  const vertex = compile(gl, gl.VERTEX_SHADER, VERTEX);
  const fragment = compile(gl, gl.FRAGMENT_SHADER, FRAGMENT);
  if (!vertex || !fragment) return null;

  const program = gl.createProgram();
  if (!program) return null;

  gl.attachShader(program, vertex);
  gl.attachShader(program, fragment);
  gl.linkProgram(program);
  gl.deleteShader(vertex);
  gl.deleteShader(fragment);

  return gl.getProgramParameter(program, gl.LINK_STATUS) ? program : null;
}

export function DitherBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const gl = canvas.getContext("webgl", {
      alpha: true,
      // Sem isto o navegador espera cor já multiplicada pelo alpha, e a onda
      // sai escurecida exatamente onde ela é mais fraca.
      premultipliedAlpha: false,
      antialias: false,
      depth: false,
      stencil: false,
      powerPreference: "low-power",
    });
    if (!gl) return;

    const program = link(gl);
    if (!program) return;

    gl.useProgram(program);

    // Um triângulo que cobre a tela, e não dois formando um quad: metade dos
    // vértices e nenhuma costura na diagonal.
    const buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 3, -1, -1, 3]),
      gl.STATIC_DRAW,
    );

    const position = gl.getAttribLocation(program, "aPos");
    gl.enableVertexAttribArray(position);
    gl.vertexAttribPointer(position, 2, gl.FLOAT, false, 0, 0);

    const uResolution = gl.getUniformLocation(program, "uResolution");
    const uTime = gl.getUniformLocation(program, "uTime");
    const uPointer = gl.getUniformLocation(program, "uPointer");
    const uPointerOn = gl.getUniformLocation(program, "uPointerOn");

    gl.uniform3fv(gl.getUniformLocation(program, "uWave"), WAVE);
    gl.uniform1f(gl.getUniformLocation(program, "uPixel"), PIXEL);
    gl.uniform1f(gl.getUniformLocation(program, "uSteps"), STEPS);

    /*
     * O buffer tem o tamanho em pixels de **CSS**, não em pixels do aparelho.
     * Numa tela retina isso é um quarto dos fragmentos, e o upscale não custa
     * nitidez nenhuma: `image-rendering: pixelated` no CSS mantém a célula
     * quadrada, que é o que a trama quer de qualquer forma.
     */
    const resize = () => {
      const width = Math.max(1, Math.round(canvas.clientWidth));
      const height = Math.max(1, Math.round(canvas.clientHeight));
      if (canvas.width === width && canvas.height === height) return;

      canvas.width = width;
      canvas.height = height;
      gl.viewport(0, 0, width, height);
      gl.uniform2f(uResolution, width, height);
    };

    // Guardado em pixels de CSS, com origem no topo; o shader lê com origem
    // embaixo, como `gl_FragCoord`.
    const pointer = { x: 0, y: 0, on: 0 };

    const draw = (seconds: number) => {
      resize();
      gl.uniform1f(uTime, seconds * SPEED);
      gl.uniform2f(uPointer, pointer.x, canvas.height - pointer.y);
      gl.uniform1f(uPointerOn, pointer.on);
      gl.drawArrays(gl.TRIANGLES, 0, 3);
    };

    const motion = window.matchMedia("(prefers-reduced-motion: reduce)");

    let frame: number | null = null;
    let origin = 0;

    const loop = (now: number) => {
      if (!origin) origin = now;
      draw((now - origin) / 1000);
      frame = requestAnimationFrame(loop);
    };

    /*
     * Sem movimento a trama **continua lá**, congelada num quadro. Apagar o
     * fundo seria trocar um enfeite por um vazio; o que incomoda em
     * `prefers-reduced-motion` é a onda andando, não o desenho existir.
     */
    const sync = () => {
      if (frame !== null) {
        cancelAnimationFrame(frame);
        frame = null;
      }

      if (motion.matches || document.hidden) {
        pointer.on = 0;
        draw(0);
        return;
      }

      origin = 0;
      frame = requestAnimationFrame(loop);
    };

    const onPointerMove = (event: PointerEvent) => {
      if (motion.matches) return;
      pointer.x = event.clientX;
      pointer.y = event.clientY;
      pointer.on = 1;
    };

    const onPointerLeave = () => {
      pointer.on = 0;
    };

    // O canvas é `pointer-events: none`, então quem sabe do cursor é a janela.
    window.addEventListener("pointermove", onPointerMove, { passive: true });
    document.addEventListener("pointerleave", onPointerLeave);
    document.addEventListener("visibilitychange", sync);
    window.addEventListener("resize", sync);
    motion.addEventListener("change", sync);

    sync();

    return () => {
      if (frame !== null) cancelAnimationFrame(frame);
      window.removeEventListener("pointermove", onPointerMove);
      document.removeEventListener("pointerleave", onPointerLeave);
      document.removeEventListener("visibilitychange", sync);
      window.removeEventListener("resize", sync);
      motion.removeEventListener("change", sync);
      gl.deleteBuffer(buffer);
      gl.deleteProgram(program);
    };
  }, []);

  return <canvas ref={canvasRef} className="dither" aria-hidden="true" />;
}
