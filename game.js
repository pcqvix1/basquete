/* game.js - Tradução do PainelJogo + BasqueteFrame para HTML5 Canvas
   Mantém nomes e comportamento principal do Java original.
*/

/* ---------------------------
   1) Setup do Canvas e Vars
   --------------------------- */
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const LARGURA = canvas.width;
const ALTURA = canvas.height;
const ALTURA_CHAO = ALTURA - 10;
const FPS = 60;
let lastTime = 0;

/* ---------------------------
   2) Física, constantes e cores
   --------------------------- */
const G = 0.5; // gravidade (mapeado do Java)
const TEMPO_DE_VOO = 45;
const RAIO_BOLA = 20; // raio da bola -> aro terá largura = 2 * RAIO_BOLA

const CORES = {
  BRANCO: '#FFFFFF',
  PRETO: '#000000',
  AZUL_CEU_CLARO: 'rgb(173,216,230)',
  AZUL_CEU_ESCURO: 'rgb(100,149,237)',
  CHAO_CLARO: 'rgb(210,180,140)',
  CHAO_ESCURO: 'rgb(160,82,45)',
  DESTAQUE_PLACA: 'rgb(255,223,0)',
  LARANJA_CLARO: 'rgb(255,165,0)',
  LARANJA_ESCURO: 'rgb(204,85,0)'
};

/* ---------------------------
   3) Dificuldades (mapa do enum)
   --------------------------- */
const NiveisDificuldade = {
  FACIL:  { fatorMira: 3.0, forcaMaxima: 50, erroLancamento: 0.0, coefRestituicaoMapa: 0.95 },
  MEDIO:  { fatorMira: 1.5, forcaMaxima: 35, erroLancamento: 0.0, coefRestituicaoMapa: 0.7 },
  DIFICIL: { fatorMira: 0.5, forcaMaxima: 20, erroLancamento: 0.2, coefRestituicaoMapa: 0.4 }
};

let dificuldadeAtual = NiveisDificuldade.MEDIO;
let fatorForcaMira = dificuldadeAtual.fatorMira;
let forcaMaxima = dificuldadeAtual.forcaMaxima;
let erroLancamento = dificuldadeAtual.erroLancamento;
let coefRestituicaoMapa = dificuldadeAtual.coefRestituicaoMapa;

let pontuacao = 0;
let recorde = 0;

/* ---------------------------
   4) Estado da Mira / Input
   --------------------------- */
let aPrepararLancamento = false;
let posRatoInicio = null;
let posRatoAtual = null;

/* ---------------------------
   5) Util físico
   --------------------------- */
const FisicaUtil = {
  GRAVIDADE: G,
  calcularVelocidadeParaAlvo(xI, yI, xA, yA, tempo) {
    const vx = (xA - xI) / tempo;
    const vy = (yA - yI) / tempo - (0.5 * G * tempo);
    return { x: vx, y: vy };
  }
};

/* ---------------------------
   6) Classe Cesto (aro atravessável no meio,
      laterais com colisão; largura = diâmetro da bola)
   --------------------------- */
class Cesto {
  constructor() {
    this.LARGURA_TABELA = 10;
    this.ALTURA_TABELA = 120;
    this.POS_X = LARGURA - 110;                 // posição da tabela (backboard)
    this.POS_Y = ALTURA_CHAO - this.ALTURA_TABELA - 50; // encostada visualmente
    this.LARGURA_ARO = RAIO_BOLA * 2;           // ARO com largura igual ao diâmetro da bola
    this.RAIO_ARO = 4;                          // raio visual das pontas (apenas desenho)
    this.aroY = this.POS_Y + 40;
    this.aroLeftX = this.POS_X - this.LARGURA_ARO; // x do começo do aro (esquerda)
    this.aroRightX = this.POS_X;                   // x do fim do aro (direita)
    this.passouPeloAroTopo = false;
    this.entrando = false; // flag para detecção de passagem
  }

  desenhar() {
    // tabela (backboard)
    ctx.fillStyle = CORES.BRANCO;
    ctx.fillRect(this.POS_X, this.POS_Y, this.LARGURA_TABELA, this.ALTURA_TABELA);
    ctx.strokeStyle = CORES.PRETO;
    ctx.lineWidth = 2;
    ctx.strokeRect(this.POS_X, this.POS_Y, this.LARGURA_TABELA, this.ALTURA_TABELA);

    // aro (apenas visual: linha)
    ctx.strokeStyle = 'red';
    ctx.lineWidth = 4;
    ctx.beginPath();
    ctx.moveTo(this.aroLeftX, this.aroY);
    ctx.lineTo(this.aroRightX, this.aroY);
    ctx.stroke();

    // pontas (visual)
    ctx.fillStyle = 'red';
    ctx.beginPath();
    ctx.arc(this.aroLeftX, this.aroY, this.RAIO_ARO, 0, Math.PI*2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(this.aroRightX, this.aroY, this.RAIO_ARO, 0, Math.PI*2);
    ctx.fill();

    // rede (visual)
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
      const sx = this.aroLeftX + i * (this.LARGURA_ARO / 3);
      ctx.moveTo(sx, this.aroY + this.RAIO_ARO);
      ctx.lineTo(sx + 8, this.aroY + 50);
    }
    ctx.stroke();
  }

  // colisões laterais do aro: esquerda e direita colidem; meio é atravessável
  verificarColisao(bola) {
    // backboard colisão lateral (tabela)
    if (bola.x + RAIO_BOLA >= this.POS_X && bola.x - RAIO_BOLA < this.POS_X + this.LARGURA_TABELA &&
        bola.y > this.POS_Y && bola.y < this.POS_Y + this.ALTURA_TABELA) {
      bola.velX *= -coefRestituicaoMapa;
      bola.x = this.POS_X - RAIO_BOLA;
      return;
    }

    // colisão com lateral esquerda do aro (zona estreita próxima à borda esquerda)
    const zonaEsqX = this.aroLeftX + RAIO_BOLA * 0.2; // pequena margem interna
    if (bola.x < zonaEsqX && Math.abs(bola.y - this.aroY) < RAIO_BOLA + 6) {
      // empurra para a esquerda
      if (bola.x + RAIO_BOLA > this.aroLeftX - 2) {
        bola.x = this.aroLeftX - RAIO_BOLA - 2;
        bola.velX *= -0.6;
      }
    }

    // colisão com lateral direita do aro (zona estreita próxima à borda direita)
    const zonaDirX = this.aroRightX - RAIO_BOLA * 0.2;
    if (bola.x > zonaDirX && Math.abs(bola.y - this.aroY) < RAIO_BOLA + 6) {
      if (bola.x - RAIO_BOLA < this.aroRightX + 2) {
        bola.x = this.aroRightX + RAIO_BOLA + 2;
        bola.velX *= -0.6;
      }
    }

    // limites da tela (paredes e teto) - protegidos aqui para segurança
    if (bola.x - RAIO_BOLA < 0) { bola.x = RAIO_BOLA; bola.velX *= -coefRestituicaoMapa; }
    if (bola.x + RAIO_BOLA > LARGURA) { bola.x = LARGURA - RAIO_BOLA; bola.velX *= -coefRestituicaoMapa; }
    if (bola.y - RAIO_BOLA < 0) { bola.y = RAIO_BOLA; bola.velY *= -coefRestituicaoMapa; }
  }

  // pontuação: detecta quando bola entra pelo meio (de cima para baixo)
  verificarPontuacao(bola) {
    const meioEsq = this.aroLeftX + (RAIO_BOLA * 0.4);
    const meioDir = this.aroRightX - (RAIO_BOLA * 0.4);
    const dentroDoMeio = bola.x > meioEsq && bola.x < meioDir;

    // se bola estava acima do aro na zona do meio e está descendo => entrando
    if (dentroDoMeio && bola.y + RAIO_BOLA < this.aroY && bola.velY > 0) {
      this.passouPeloAroTopo = true;
    }

    // quando o centro da bola passa abaixo do aro => ponto
    if (this.passouPeloAroTopo && (bola.y - RAIO_BOLA) > this.aroY + 6) {
      this.passouPeloAroTopo = false;
      return true;
    }

    // reset de segurança
    if (bola.y < this.aroY - 60) this.passouPeloAroTopo = false;
    return false;
  }
}

/* ---------------------------
   7) Classe Bola (simples)
   --------------------------- */
class Bola {
  constructor(x, y, coefRest) {
    this.inicioX = x;
    this.inicioY = y;
    this.x = x;
    this.y = y;
    this.velX = 0;
    this.velY = 0;
    this.emMovimento = false;
    this.coefRest = coefRest;
  }

  lancar(vx, vy) {
    this.velX = vx;
    this.velY = vy;
    this.emMovimento = true;
  }

  atualizarPosicao() {
    if (!this.emMovimento) return;
    this.velY += G;
    this.x += this.velX;
    this.y += this.velY;

    // colisão chão
    if (this.y + RAIO_BOLA >= ALTURA_CHAO) {
      this.y = ALTURA_CHAO - RAIO_BOLA;
      this.velY *= -this.coefRest;
      // parar se pequeno movimento
      if (Math.abs(this.velY) < 1 && Math.abs(this.velX) < 1) {
        this.emMovimento = false;
        this.velX = 0; this.velY = 0;
      }
    }
  }

  desenhar() {
    // sombra
    if (this.y < ALTURA_CHAO - RAIO_BOLA - 5) {
      const r = RAIO_BOLA * 0.8;
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.beginPath();
      ctx.ellipse(this.x + 5, ALTURA_CHAO - r/4, r*2, r/4, 0, 0, Math.PI*2);
      ctx.fill();
    }

    // corpo
    const grad = ctx.createRadialGradient(this.x - RAIO_BOLA/3, this.y - RAIO_BOLA/3, 5, this.x, this.y, RAIO_BOLA*1.5);
    grad.addColorStop(0, CORES.LARANJA_CLARO);
    grad.addColorStop(1, CORES.LARANJA_ESCURO);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(this.x, this.y, RAIO_BOLA, 0, Math.PI*2);
    ctx.fill();

    // brilho & contorno
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.beginPath();
    ctx.arc(this.x - RAIO_BOLA*0.5, this.y - RAIO_BOLA*0.7, RAIO_BOLA*0.2, 0, Math.PI*2);
    ctx.fill();
    ctx.strokeStyle = CORES.PRETO;
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.arc(this.x, this.y, RAIO_BOLA, 0, Math.PI*2);
    ctx.stroke();
  }

  reiniciar() {
    this.x = this.inicioX; this.y = this.inicioY;
    this.velX = 0; this.velY = 0;
    this.emMovimento = false;
  }
}

/* ---------------------------
   8) Inicializar jogo
   --------------------------- */
let bola, cesto;
function iniciarJogo() {
  cesto = new Cesto();
  bola = new Bola(100, ALTURA_CHAO - RAIO_BOLA, coefRestituicaoMapa);
  carregarRecorde();
  requestAnimationFrame(gameLoop);
}

/* ---------------------------
   9) Loop principal
   --------------------------- */
function gameLoop(currentTime) {
  const delta = currentTime - lastTime;
  if (delta > (1000 / FPS) || lastTime === 0) {
    lastTime = currentTime;
    atualizar();
    desenhar();
  }
  requestAnimationFrame(gameLoop);
}

/* ---------------------------
   10) Desenho (ambiente, mira, placar)
   --------------------------- */
function desenharAmbienteJS() {
  const grad = ctx.createLinearGradient(0,0,0,ALTURA_CHAO);
  grad.addColorStop(0, CORES.AZUL_CEU_CLARO);
  grad.addColorStop(1, CORES.AZUL_CEU_ESCURO);
  ctx.fillStyle = grad;
  ctx.fillRect(0,0,LARGURA,ALTURA_CHAO);

  ctx.fillStyle = CORES.CHAO_ESCURO;
  ctx.fillRect(0, ALTURA_CHAO, LARGURA, 10);

  // tábuas
  ctx.strokeStyle = CORES.CHAO_CLARO;
  for (let i=0;i<LARGURA;i+=50) {
    ctx.beginPath();
    ctx.moveTo(i, ALTURA_CHAO);
    ctx.lineTo(i, ALTURA);
    ctx.stroke();
  }
  ctx.strokeStyle = CORES.CHAO_CLARO;
  ctx.beginPath();
  ctx.moveTo(0, ALTURA_CHAO);
  ctx.lineTo(LARGURA, ALTURA_CHAO);
  ctx.stroke();
}

function desenharPlacarJS() {
  ctx.fillStyle = CORES.PRETO;
  ctx.font = "bold 18px Arial";
  ctx.fillText(`RECORDE: ${recorde}`, LARGURA - 162, 32);
  ctx.fillStyle = CORES.DESTAQUE_PLACA;
  ctx.fillText(`RECORDE: ${recorde}`, LARGURA - 160, 30);

  ctx.fillStyle = CORES.PRETO;
  ctx.font = "bold 60px SansSerif";
  ctx.fillText(`${pontuacao}`, 32, 72);
  ctx.fillStyle = CORES.BRANCO;
  ctx.fillText(`${pontuacao}`, 30, 70);

  ctx.fillStyle = CORES.DESTAQUE_PLACA;
  ctx.font = "14px Arial";
  ctx.fillText("PONTOS", 32, 85);
}

function desenharLinhaMiraJS() {
  if (!posRatoAtual || !posRatoInicio || !bola) return;

  // prepara e limita
  const dx = posRatoAtual.x - posRatoInicio.x;
  const dy = posRatoAtual.y - posRatoInicio.y;
  const xAlvo = bola.x + dx * fatorForcaMira;
  const yAlvo = bola.y + dy * fatorForcaMira;
  const yLimitado = Math.max(50, yAlvo);

  const velocidade = FisicaUtil.calcularVelocidadeParaAlvo(bola.x, bola.y, xAlvo, yLimitado, TEMPO_DE_VOO);

  let xTemp = bola.x, yTemp = bola.y, vxTemp = velocidade.x, vyTemp = velocidade.y;

  ctx.strokeStyle = CORES.BRANCO;
  ctx.setLineDash([4,4]);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(xTemp, yTemp);

  for (let t=0; t<TEMPO_DE_VOO; t++) {
    vyTemp += G;
    xTemp += vxTemp;
    yTemp += vyTemp;
    ctx.lineTo(xTemp, yTemp);
    if (yTemp >= ALTURA_CHAO - RAIO_BOLA || xTemp <=0 || xTemp >= LARGURA || yTemp <=0) break;
  }
  ctx.stroke();
  ctx.setLineDash([]);

  // bolinha no fim da mira
  ctx.fillStyle = 'red';
  ctx.beginPath();
  ctx.arc(xTemp, yTemp, 4, 0, Math.PI*2);
  ctx.fill();
}

/* ---------------------------
   11) Atualizar física & pontuação
   --------------------------- */
function atualizar() {
  if (!bola || !cesto) return;
  if (bola.emMovimento) {
    bola.atualizarPosicao();
    cesto.verificarColisao(bola);

    if (cesto.verificarPontuacao(bola)) {
      pontuacao++;
      salvarRecorde(pontuacao);
      // bola retorna à posição inicial ao pontuar (como no Java)
      bola.reiniciar();
    }
  }
}

/* ---------------------------
   12) Input (mouse + teclado)
   --------------------------- */
canvas.addEventListener('mousedown', (e) => {
  const rect = canvas.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;
  if (!bola.emMovimento && Math.hypot(mx - bola.x, my - bola.y) < RAIO_BOLA * 2) {
    aPrepararLancamento = true;
    posRatoInicio = { x: mx, y: my };
  }
});

canvas.addEventListener('mouseup', (e) => {
  if (!aPrepararLancamento) return;
  aPrepararLancamento = false;
  const rect = canvas.getBoundingClientRect();
  const mx = e.clientX - rect.left;
  const my = e.clientY - rect.top;
  const dx = mx - posRatoInicio.x;
  const dy = my - posRatoInicio.y;

  const xAlvo = bola.x + dx * fatorForcaMira;
  const yAlvo = bola.y + dy * fatorForcaMira;
  const yLimitado = Math.max(50, yAlvo);

  let vel = FisicaUtil.calcularVelocidadeParaAlvo(bola.x, bola.y, xAlvo, yLimitado, TEMPO_DE_VOO);
  let forcaX = vel.x;
  let forcaY = vel.y;

  // erro de lançamento conforme dificuldade
  if (erroLancamento > 0) {
    const fatorErro = (Math.random() * 2 * erroLancamento) - erroLancamento;
    forcaX *= (1 + fatorErro);
    forcaY *= (1 + fatorErro * 0.5);
  }

  let total = Math.hypot(forcaX, forcaY);
  if (total > forcaMaxima) {
    const ajuste = forcaMaxima / total;
    forcaX *= ajuste; forcaY *= ajuste;
  }

  if (total > 1) bola.lancar(forcaX, forcaY);
});

canvas.addEventListener('mousemove', (e) => {
  const rect = canvas.getBoundingClientRect();
  posRatoAtual = { x: e.clientX - rect.left, y: e.clientY - rect.top };
});

// reiniciar com 'R'
window.addEventListener('keydown', (e) => {
  if (e.key === 'r' || e.key === 'R') {
    bola.reiniciar();
  }
});

/* ---------------------------
   13) Recorde (localStorage)
   --------------------------- */
function carregarRecorde() {
  const r = localStorage.getItem('basqueteRecorde');
  recorde = r ? parseInt(r, 10) : 0;
}
function salvarRecorde(novo) {
  if (novo > recorde) {
    recorde = novo;
    localStorage.setItem('basqueteRecorde', recorde);
  }
}

/* ---------------------------
   14) Hooks dos controles (select / botões)
   --------------------------- */
document.getElementById('dificuldade').addEventListener('change', (ev) => {
  const nome = ev.target.value;
  // aplica mapa diretamente (FACIL, MEDIO, DIFICIL)
  dificuldadeAtual = NiveisDificuldade[nome];
  fatorForcaMira = dificuldadeAtual.fatorMira;
  forcaMaxima = dificuldadeAtual.forcaMaxima;
  erroLancamento = dificuldadeAtual.erroLancamento;
  coefRestituicaoMapa = dificuldadeAtual.coefRestituicaoMapa;
  // reinicia bola ao mudar dificuldade (comportamento Java)
  if (bola) bola.reiniciar();
});

document.getElementById('resetPos').addEventListener('click', () => {
  if (bola) bola.reiniciar();
});
document.getElementById('reiniciarTudo').addEventListener('click', () => {
  if (pontuacao > recorde) salvarRecorde(pontuacao);
  pontuacao = 0;
  if (bola) bola.reiniciar();
});

/* ---------------------------
   15) Iniciar
   --------------------------- */
iniciarJogo();
