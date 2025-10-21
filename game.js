/**
 * game.js
 * Versão traduzida do PainelJogo/BasqueteFrame com física melhorada.
 *
 * Principais melhorias de física:
 * - uso de delta time para estabilidade (frame-independent).
 * - arrasto do ar simples (damping proporcional à velocidade).
 * - amortecimento do impacto mais realista.
 * - colisão lateral com as "pontas" do aro (retângulos), centro atravessável.
 *
 * Jogabilidade:
 * - Mira aparece ao arrastar a bola (linha tracejada + bolinha vermelha no fim).
 * - Pontos só são contados quando bola passa pelo centro do aro de cima para baixo.
 * - Bola volta à posição inicial ao marcar ponto.
 * - Tecla R reinicia posição da bola.
 */

/* ---------------------------
   1) Setup do Canvas e Vars
   --------------------------- */
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

const LARGURA = canvas.width;
const ALTURA = canvas.height;
const ALTURA_CHAO = ALTURA - 10;
const TARGET_FPS = 60;
let lastTime = performance.now();

/* ---------------------------
   2) Física, constantes e cores
   --------------------------- */
const G = 900; // pixels/s^2 (ajustado para sensação realista com delta time)
const TEMPO_DE_VOO = 45;
const RAIO_BOLA = 20; // raio em pixels (aro terá largura = 2 * RAIO_BOLA)

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
   3) Dificuldades
   --------------------------- */
const NiveisDificuldade = {
  FACIL:  { fatorMira: 3.0, forcaMaxima: 1000, erroLancamento: 0.02, coefRestituicaoMapa: 0.85 },
  MEDIO:  { fatorMira: 1.5, forcaMaxima: 800,  erroLancamento: 0.04, coefRestituicaoMapa: 0.75 },
  DIFICIL: { fatorMira: 1.0, forcaMaxima: 700,  erroLancamento: 0.08, coefRestituicaoMapa: 0.65 }
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
   5) Util físico (delta-based)
   --------------------------- */
function toSeconds(ms) { return ms / 1000; }

/* ---------------------------
   6) Classe Cesto
   - aro atravessável no meio
   - laterais com colisão (pequenos retângulos)
   --------------------------- */
class Cesto {
  constructor() {
    this.LARGURA_TABELA = 10;
    this.ALTURA_TABELA = 120;
    this.POS_X = LARGURA - 110;
    this.POS_Y = ALTURA_CHAO - this.ALTURA_TABELA - 50;
    this.LARGURA_ARO = RAIO_BOLA * 2; // diâmetro da bola
    this.aroY = this.POS_Y + 40;
    this.aroLeftX = this.POS_X - this.LARGURA_ARO; // início do aro
    this.aroRightX = this.POS_X;                    // fim do aro
    this.aroThickness = 6; // espessura visual do aro

    // definimos "pontas" físicas (small rectangles) com largura reduzida
    this.pontaWidth = 12; // largura das pontas que colidem
    this.pontaHeight = 14; // altura das pontas que colidem ao redor de aroY

    this.passouPeloAroTopo = false;
  }

  desenhar() {
    // tabela (backboard)
    ctx.fillStyle = CORES.BRANCO;
    ctx.fillRect(this.POS_X, this.POS_Y, this.LARGURA_TABELA, this.ALTURA_TABELA);
    ctx.strokeStyle = CORES.PRETO;
    ctx.lineWidth = 2;
    ctx.strokeRect(this.POS_X, this.POS_Y, this.LARGURA_TABELA, this.ALTURA_TABELA);

    // aro (linha)
    ctx.strokeStyle = 'red';
    ctx.lineWidth = this.aroThickness;
    ctx.beginPath();
    ctx.moveTo(this.aroLeftX, this.aroY);
    ctx.lineTo(this.aroRightX, this.aroY);
    ctx.stroke();

    // pontas visuais (circulo nas extremidades)
    ctx.fillStyle = 'red';
    ctx.beginPath();
    ctx.arc(this.aroLeftX, this.aroY, this.aroThickness/1.5, 0, Math.PI*2);
    ctx.fill();
    ctx.beginPath();
    ctx.arc(this.aroRightX, this.aroY, this.aroThickness/1.5, 0, Math.PI*2);
    ctx.fill();

    // rede (visual)
    ctx.strokeStyle = '#ffffff';
    ctx.lineWidth = 1;
    for (let i = 0; i <= 4; i++) {
      const sx = this.aroLeftX + i * (this.LARGURA_ARO / 4);
      ctx.beginPath();
      ctx.moveTo(sx, this.aroY + this.aroThickness/2);
      ctx.lineTo(sx + 8, this.aroY + 40);
      ctx.stroke();
    }

    // desenha retângulos invisíveis das pontas (apenas para debug, comentados)
    // ctx.strokeStyle = 'rgba(0,0,0,0.2)';
    // ctx.strokeRect(this.aroLeftX - this.pontaWidth/2, this.aroY - this.pontaHeight/2, this.pontaWidth, this.pontaHeight);
    // ctx.strokeRect(this.aroRightX - this.pontaWidth/2, this.aroY - this.pontaHeight/2, this.pontaWidth, this.pontaHeight);
  }

  // colisão entre circle (bola) e duas pequenas caixas nas pontas do aro
  verificarColisao(bola, dt) {
    // colisão com tabela (backboard)
    if (bola.x + RAIO_BOLA >= this.POS_X && bola.x - RAIO_BOLA < this.POS_X + this.LARGURA_TABELA &&
        bola.y > this.POS_Y && bola.y < this.POS_Y + this.ALTURA_TABELA) {
      // empurrar para fora e inverter X com restituição
      bola.x = this.POS_X - RAIO_BOLA - 0.1;
      bola.velX = -Math.abs(bola.velX) * coefRestituicaoMapa;
      // levemente reduzir Y para evitar grudar
      bola.velY *= 0.98;
      return;
    }

    // check esquerda (retângulo centralizado em aroLeftX)
    const leftRect = {
      x: this.aroLeftX - this.pontaWidth/2,
      y: this.aroY - this.pontaHeight/2,
      w: this.pontaWidth,
      h: this.pontaHeight
    };
    const rightRect = {
      x: this.aroRightX - this.pontaWidth/2,
      y: this.aroY - this.pontaHeight/2,
      w: this.pontaWidth,
      h: this.pontaHeight
    };

    // função auxiliar circle-rect collision
    function circleRectCollision(circle, rect) {
      const closestX = Math.max(rect.x, Math.min(circle.x, rect.x + rect.w));
      const closestY = Math.max(rect.y, Math.min(circle.y, rect.y + rect.h));
      const dx = circle.x - closestX;
      const dy = circle.y - closestY;
      return { collides: (dx*dx + dy*dy) < (RAIO_BOLA*RAIO_BOLA), dx, dy, closestX, closestY };
    }

    const leftHit = circleRectCollision(bola, leftRect);
    const rightHit = circleRectCollision(bola, rightRect);

    if (leftHit.collides) {
      // push out horizontally
      const push = (leftRect.x - (bola.x - RAIO_BOLA));
      bola.x += push - 0.5;
      // reflect X with energy loss
      bola.velX = -Math.abs(bola.velX) * 0.6;
      // small Y effect if collision is angled
      bola.velY *= 0.95;
      return;
    }

    if (rightHit.collides) {
      const push = ((bola.x + RAIO_BOLA) - (rightRect.x + rightRect.w));
      bola.x -= push - 0.5;
      bola.velX = Math.abs(bola.velX) * 0.6 * -1 * -1; // keep sign consistent then invert
      bola.velX = -Math.abs(bola.velX) * 0.6;
      bola.velY *= 0.95;
      return;
    }

    // keep in bounds
    if (bola.x - RAIO_BOLA < 0) { bola.x = RAIO_BOLA; bola.velX = -bola.velX * coefRestituicaoMapa; }
    if (bola.x + RAIO_BOLA > LARGURA) { bola.x = LARGURA - RAIO_BOLA; bola.velX = -bola.velX * coefRestituicaoMapa; }
    if (bola.y - RAIO_BOLA < 0) { bola.y = RAIO_BOLA; bola.velY = -bola.velY * coefRestituicaoMapa; }
  }

  verificarPontuacao(bola) {
    // zona estreita do meio (um pouco menor que o aro para segurança)
    const meioEsq = this.aroLeftX + (RAIO_BOLA * 0.45);
    const meioDir = this.aroRightX - (RAIO_BOLA * 0.45);
    const dentroDoMeio = bola.x > meioEsq && bola.x < meioDir;

    // se antes estava acima e agora segue descendo pelo meio => marcou
    if (dentroDoMeio && (bola.y + RAIO_BOLA) < this.aroY && bola.velY > 0) {
      this.passouPeloAroTopo = true;
    }

    if (this.passouPeloAroTopo && (bola.y - RAIO_BOLA) > (this.aroY + 6)) {
      this.passouPeloAroTopo = false;
      return true;
    }

    // reset de segurança
    if (bola.y < this.aroY - 100) this.passouPeloAroTopo = false;
    return false;
  }
}

/* ---------------------------
   7) Classe Bola (com arrasto e damping)
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
    this.coefRest = coefRest; // restituição do chão
    this.airDrag = 0.002; // arrasto do ar (ajustável)
    this.groundFriction = 0.95; // atrito quando no chão
  }

  lancar(vx, vy) {
    this.velX = vx;
    this.velY = vy;
    this.emMovimento = true;
  }

  atualizarPosicao(dt) {
    if (!this.emMovimento) return;

    // dt em segundos
    // aplicar gravidade
    this.velY += G * dt;

    // arrasto do ar (simples: força proporcional a v^2 direcional)
    const speed = Math.hypot(this.velX, this.velY);
    if (speed > 0.01) {
      // drag magnitude ~ k * v^2
      const dragMag = this.airDrag * speed * speed;
      // componentes
      this.velX -= (this.velX / speed) * dragMag * dt * 60;
      this.velY -= (this.velY / speed) * dragMag * dt * 60;
    }

    // integrar posição
    this.x += this.velX * dt * 60; // multiplicador para tuning sensorial
    this.y += this.velY * dt * 60;

    // colisão chão
    if (this.y + RAIO_BOLA >= ALTURA_CHAO) {
      this.y = ALTURA_CHAO - RAIO_BOLA;
      this.velY = -Math.abs(this.velY) * this.coefRest; // restituição
      // aplicar atrito horizontal no impacto com o chão
      this.velX *= this.groundFriction;
      if (Math.abs(this.velY) < 10 && Math.abs(this.velX) < 10) {
        this.emMovimento = false;
        this.velX = 0; this.velY = 0;
      }
    }
  }

  desenhar() {
    // sombra projetada
    if (this.y < ALTURA_CHAO - RAIO_BOLA - 5) {
      const r = RAIO_BOLA * 0.8;
      ctx.fillStyle = 'rgba(0,0,0,0.35)';
      ctx.beginPath();
      ctx.ellipse(this.x + 5, ALTURA_CHAO - r/4, r*2, r/4, 0, 0, Math.PI*2);
      ctx.fill();
    }

    // gradiente da bola
    const grad = ctx.createRadialGradient(this.x - RAIO_BOLA/3, this.y - RAIO_BOLA/3, 5, this.x, this.y, RAIO_BOLA*1.5);
    grad.addColorStop(0, CORES.LARANJA_CLARO);
    grad.addColorStop(1, CORES.LARANJA_ESCURO);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(this.x, this.y, RAIO_BOLA, 0, Math.PI*2);
    ctx.fill();

    // brilho e contorno
    ctx.fillStyle = 'rgba(255,255,255,0.7)';
    ctx.beginPath();
    ctx.arc(this.x - RAIO_BOLA*0.5, this.y - RAIO_BOLA*0.7, RAIO_BOLA*0.18, 0, Math.PI*2);
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
  lastTime = performance.now();
  requestAnimationFrame(gameLoop);
}

/* ---------------------------
   9) Game loop (delta time)
   --------------------------- */
function gameLoop(now) {
  const deltaMs = now - lastTime;
  lastTime = now;
  const dt = toSeconds(deltaMs); // segundos

  atualizar(dt);
  desenhar();

  requestAnimationFrame(gameLoop);
}

/* ---------------------------
   10) Desenho (cenário, mira, placar)
   --------------------------- */
function desenharAmbienteJS() {
  const grad = ctx.createLinearGradient(0,0,0,ALTURA_CHAO);
  grad.addColorStop(0, CORES.AZUL_CEU_CLARO);
  grad.addColorStop(1, CORES.AZUL_CEU_ESCURO);
  ctx.fillStyle = grad;
  ctx.fillRect(0,0,LARGURA,ALTURA_CHAO);

  // chão
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
  if (!posRatoAtual || !posRatoInicio || !bola || bola.emMovimento) return;

  // arrasto
  const dx = posRatoAtual.x - posRatoInicio.x;
  const dy = posRatoAtual.y - posRatoInicio.y;
  const xAlvo = bola.x + dx * fatorForcaMira;
  const yAlvo = bola.y + dy * fatorForcaMira;
  const yLimitado = Math.max(50, yAlvo);

  const velocidade = { ...FisicaUtil.calcularVelocidadeParaAlvo(bola.x, bola.y, xAlvo, yLimitado, TEMPO_DE_VOO) };

  // simula trajetória em passos discretos (sem alterar estado real)
  let xTemp = bola.x, yTemp = bola.y;
  let vxTemp = velocidade.x, vyTemp = velocidade.y;

  ctx.strokeStyle = CORES.BRANCO;
  ctx.setLineDash([6,6]);
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(xTemp, yTemp);

  for (let t = 0; t < TEMPO_DE_VOO; t++) {
    // note: usamos G como pixel/s^2, para simulação aproximada multiplicamos passo
    vyTemp += (G * (1/60));
    xTemp += vxTemp * (1/60) * 60;
    yTemp += vyTemp * (1/60) * 60;
    ctx.lineTo(xTemp, yTemp);
    if (yTemp >= ALTURA_CHAO || xTemp <= 0 || xTemp >= LARGURA || yTemp <= 0) break;
  }
  ctx.stroke();
  ctx.setLineDash([]);

  // bolinha final da mira
  ctx.fillStyle = 'red';
  ctx.beginPath();
  ctx.arc(xTemp, yTemp, 4, 0, Math.PI*2);
  ctx.fill();
}

/* ---------------------------
   11) Atualizar física & pontuação
   --------------------------- */
function atualizar(dt) {
  if (!bola || !cesto) return;

  // atualizar bola (usa dt)
  if (bola.emMovimento) {
    bola.atualizarPosicao(dt);
    cesto.verificarColisao(bola, dt);

    if (cesto.verificarPontuacao(bola)) {
      pontuacao++;
      salvarRecorde(pontuacao);
      // pequena animação/pausa opcional poderia ser adicionada aqui
      bola.reiniciar();
    }
  }
}

function desenhar() {
  ctx.clearRect(0,0,LARGURA,ALTURA);
  desenharAmbienteJS();

  // mira
  desenharLinhaMiraJS();

  // objetos
  cesto.desenhar();
  bola.desenhar();

  desenharPlacarJS();
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

  // alvo e velocidade
  const xAlvo = bola.x + dx * fatorForcaMira;
  const yAlvo = bola.y + dy * fatorForcaMira;
  const yLimitado = Math.max(50, yAlvo);

  let velocidade = FisicaUtil.calcularVelocidadeParaAlvo(bola.x, bola.y, xAlvo, yLimitado, TEMPO_DE_VOO);
  let forcaX = velocidade.x;
  let forcaY = velocidade.y;

  // erro de lançamento
  if (erroLancamento > 0) {
    const fatorErro = (Math.random() * 2 * erroLancamento) - erroLancamento;
    forcaX *= (1 + fatorErro);
    forcaY *= (1 + fatorErro * 0.5);
  }

  // normaliza força para limites
  let total = Math.hypot(forcaX, forcaY);
  if (total > forcaMaxima) {
    const ajuste = forcaMaxima / total;
    forcaX *= ajuste; forcaY *= ajuste;
    total = forcaMaxima;
  }

  // converte para velocidade em px/s adotando escala razoável
  // forcaX/forcaY já são "velocidades estimadas" pela função original, apenas amplificamos um pouco
  const scale = 1.0;
  if (total > 1) {
    bola.lancar(forcaX * scale, forcaY * scale);
  }
});

canvas.addEventListener('mousemove', (e) => {
  const rect = canvas.getBoundingClientRect();
  posRatoAtual = { x: e.clientX - rect.left, y: e.clientY - rect.top };
});

window.addEventListener('keydown', (e) => {
  if (e.key === 'r' || e.key === 'R') {
    if (bola) bola.reiniciar();
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
  const nome = ev.target.value; // FACIL | MEDIO | DIFICIL
  dificuldadeAtual = NiveisDificuldade[nome];
  fatorForcaMira = dificuldadeAtual.fatorMira;
  forcaMaxima = dificuldadeAtual.forcaMaxima;
  erroLancamento = dificuldadeAtual.erroLancamento;
  coefRestituicaoMapa = dificuldadeAtual.coefRestituicaoMapa;
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
   15) Start
   --------------------------- */
iniciarJogo();
