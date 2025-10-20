// game.js (Versão Final 6.0 — Cesta Realista e Pontuação Corrigida)

// ---------------------------------------------
// 1. SETUP DO CANVAS E CONTEXTO
// ---------------------------------------------

const canvas = document.getElementById('gameCanvas');
if (!canvas) throw new Error("Canvas não encontrado no index.html.");
const ctx = canvas.getContext('2d');
if (!ctx) throw new Error("Falha ao obter contexto 2D.");

const LARGURA = canvas.width;
const ALTURA = canvas.height;
const ALTURA_CHAO = ALTURA - 10;
const FPS = 60;
let lastTime = 0;

// ---------------------------------------------
// 2. CONSTANTES DE FÍSICA E DESIGN
// ---------------------------------------------

const G = 0.5;
const TEMPO_DE_VOO = 45;
const RAIO_BOLA = 20;

const CORES = {
  BRANCO: '#FFFFFF',
  PRETO: '#000000',
  AZUL_CEU_CLARO: 'rgb(173, 216, 230)',
  AZUL_CEU_ESCURO: 'rgb(100, 149, 237)',
  CHAO_CLARO: 'rgb(210, 180, 140)',
  CHAO_ESCURO: 'rgb(160, 82, 45)',
  DESTAQUE_PLACA: 'rgb(255, 223, 0)',
  LARANJA_CLARO: 'rgb(255, 165, 0)',
  LARANJA_ESCURO: 'rgb(204, 85, 0)'
};

// ---------------------------------------------
// 3. NÍVEL DE DIFICULDADE E ESTADO GLOBAL
// ---------------------------------------------

const NiveisDificuldade = {
  FACIL: { fatorMira: 3.0, forcaMaxima: 50, erroLancamento: 0.0, coefRestituicaoMapa: 0.95 },
  MEDIO: { fatorMira: 1.5, forcaMaxima: 35, erroLancamento: 0.0, coefRestituicaoMapa: 0.7 },
  DIFICIL: { fatorMira: 0.5, forcaMaxima: 20, erroLancamento: 0.2, coefRestituicaoMapa: 0.4 }
};

let dificuldadeAtual = NiveisDificuldade.MEDIO;
let fatorForcaMira = dificuldadeAtual.fatorMira;
let forcaMaxima = dificuldadeAtual.forcaMaxima;
let erroLancamento = dificuldadeAtual.erroLancamento;
let coefRestituicaoMapa = dificuldadeAtual.coefRestituicaoMapa;

let pontuacao = 0;
let recorde = 0;

let aPrepararLancamento = false;
let posRatoInicio = null;
let posRatoAtual = null;

// ---------------------------------------------
// 4. FERRAMENTAS DE FÍSICA
// ---------------------------------------------

const FisicaUtil = {
  calcularVelocidadeParaAlvo(xInicial, yInicial, xAlvo, yAlvo, tempo) {
    const vx = (xAlvo - xInicial) / tempo;
    const vy = (yAlvo - yInicial) / tempo - (0.5 * G * tempo);
    return { x: vx, y: vy };
  }
};

// ---------------------------------------------
// 5. CESTO — Corrigido
// ---------------------------------------------

class Cesto {
  constructor() {
    this.LARGURA_TABELA = 10;
    this.ALTURA_TABELA = 120;
    this.POS_X = LARGURA - 100;
    this.POS_Y = ALTURA_CHAO - this.ALTURA_TABELA; // encostada no chão

    this.LARGURA_ARO = 60;
    this.RAIO_ARO = 5;

    // Posição realista do aro
    this.aroY = this.POS_Y + 40;
    this.aroLeftX = this.POS_X - this.LARGURA_ARO;
    this.aroRightX = this.POS_X;

    this.passouPeloAroTopo = false;
    this.passouPeloAroBaixo = false;
  }

  desenhar() {
    // Tabela
    ctx.fillStyle = CORES.BRANCO;
    ctx.fillRect(this.POS_X, this.POS_Y, this.LARGURA_TABELA, this.ALTURA_TABELA);
    ctx.strokeStyle = CORES.PRETO;
    ctx.strokeRect(this.POS_X, this.POS_Y, this.LARGURA_TABELA, this.ALTURA_TABELA);

    // Aro
    ctx.fillStyle = 'red';
    ctx.fillRect(this.aroLeftX, this.aroY - this.RAIO_ARO, this.LARGURA_ARO, this.RAIO_ARO * 2);

    // Borda esquerda do aro
    ctx.beginPath();
    ctx.arc(this.aroLeftX, this.aroY, this.RAIO_ARO, 0, Math.PI * 2);
    ctx.fill();

    // Rede (simples)
    ctx.strokeStyle = '#FFFFFF';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let i = 0; i < 4; i++) {
      ctx.moveTo(this.aroLeftX + (i * this.LARGURA_ARO / 3), this.aroY + this.RAIO_ARO);
      ctx.lineTo(this.aroLeftX + (i * this.LARGURA_ARO / 3) + 10, this.aroY + 60);
    }
    ctx.stroke();
  }

  verificarColisao(bola) {
    // Colisão com a tabela
    if (
      bola.x + RAIO_BOLA >= this.POS_X &&
      bola.x - RAIO_BOLA < this.POS_X + this.LARGURA_TABELA &&
      bola.y > this.POS_Y &&
      bola.y < this.POS_Y + this.ALTURA_TABELA
    ) {
      bola.velX *= -coefRestituicaoMapa;
      bola.x = this.POS_X - RAIO_BOLA;
    }

    // Colisão com aro
    const dist = Math.hypot(bola.x - this.aroLeftX, bola.y - this.aroY);
    if (dist < RAIO_BOLA + this.RAIO_ARO) {
      const angle = Math.atan2(bola.y - this.aroY, bola.x - this.aroLeftX);
      bola.x = this.aroLeftX + Math.cos(angle) * (RAIO_BOLA + this.RAIO_ARO);
      bola.y = this.aroY + Math.sin(angle) * (RAIO_BOLA + this.RAIO_ARO);
      const speed = Math.hypot(bola.velX, bola.velY);
      bola.velX = Math.cos(angle + Math.PI) * speed * coefRestituicaoMapa;
      bola.velY = Math.sin(angle + Math.PI) * speed * coefRestituicaoMapa;
    }
  }

  verificarPontuacao(bola) {
    const dentroDoAroHorizontal = bola.x > this.aroLeftX + this.RAIO_ARO && bola.x < this.aroRightX - this.RAIO_ARO;

    // Marca quando a bola entra por cima
    if (dentroDoAroHorizontal && bola.y + RAIO_BOLA < this.aroY && bola.velY > 0) {
      this.passouPeloAroTopo = true;
    }

    // Marca ponto quando a bola passou completamente por baixo
    if (this.passouPeloAroTopo && bola.y - RAIO_BOLA > this.aroY + this.RAIO_ARO) {
      this.passouPeloAroTopo = false;
      return true;
    }

    return false;
  }
}

// ---------------------------------------------
// 6. BOLA
// ---------------------------------------------

class Bola {
  constructor(x, y, coefRestituicaoChao) {
    this.x = x;
    this.y = y;
    this.velX = 0;
    this.velY = 0;
    this.emMovimento = false;
    this.coefRestituicaoChao = coefRestituicaoChao;
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

    // Chão
    if (this.y + RAIO_BOLA >= ALTURA_CHAO) {
      this.y = ALTURA_CHAO - RAIO_BOLA;
      this.velY *= -this.coefRestituicaoChao;
      if (Math.abs(this.velY) < 1 && Math.abs(this.velX) < 1) {
        this.emMovimento = false;
        this.velX = this.velY = 0;
      }
    }

    // Bordas
    if (this.x - RAIO_BOLA <= 0) {
      this.x = RAIO_BOLA;
      this.velX *= -coefRestituicaoMapa;
    } else if (this.x + RAIO_BOLA >= LARGURA) {
      this.x = LARGURA - RAIO_BOLA;
      this.velX *= -coefRestituicaoMapa;
    }
  }

  desenhar() {
    // Sombra
    if (this.y < ALTURA_CHAO - RAIO_BOLA - 5) {
      const raioSombra = RAIO_BOLA * 0.8;
      ctx.fillStyle = 'rgba(0,0,0,0.4)';
      ctx.beginPath();
      ctx.ellipse(this.x + 5, ALTURA_CHAO - raioSombra / 4, raioSombra * 2, raioSombra / 4, 0, 0, Math.PI * 2);
      ctx.fill();
    }

    // Bola
    const grad = ctx.createRadialGradient(this.x - RAIO_BOLA / 3, this.y - RAIO_BOLA / 3, 5, this.x, this.y, RAIO_BOLA * 1.5);
    grad.addColorStop(0, CORES.LARANJA_CLARO);
    grad.addColorStop(1, CORES.LARANJA_ESCURO);
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(this.x, this.y, RAIO_BOLA, 0, Math.PI * 2);
    ctx.fill();

    ctx.strokeStyle = CORES.PRETO;
    ctx.lineWidth = 1;
    ctx.stroke();
  }
}

// ---------------------------------------------
// 7. LOOP PRINCIPAL
// ---------------------------------------------

let bola, cesto;

function iniciarJogo() {
  cesto = new Cesto();
  bola = new Bola(100, ALTURA_CHAO - RAIO_BOLA, dificuldadeAtual.coefRestituicaoMapa);
  carregarRecorde();
  gameLoop();
}

function gameLoop(currentTime) {
  const delta = currentTime - lastTime;
  if (delta > (1000 / FPS) || lastTime === 0) {
    lastTime = currentTime;
    atualizar();
    desenhar();
  }
  requestAnimationFrame(gameLoop);
}

// ---------------------------------------------
// 8. DESENHO CENTRALIZADO
// ---------------------------------------------

function desenhar() {
  ctx.clearRect(0, 0, LARGURA, ALTURA);
  desenharAmbienteJS();

  if (aPrepararLancamento && posRatoInicio && posRatoAtual) desenharLinhaMiraJS();

  if (cesto) cesto.desenhar();
  if (bola) bola.desenhar();
  desenharPlacarJS();
}

// ---------------------------------------------
// 9. LÓGICA
// ---------------------------------------------

function atualizar() {
  if (!bola || !cesto) return;
  bola.atualizarPosicao();
  cesto.verificarColisao(bola);

  if (cesto.verificarPontuacao(bola)) {
    pontuacao++;
    salvarRecorde(pontuacao);
  }
}

// ---------------------------------------------
// 10. DESENHO DO CENÁRIO E PLACAR
// ---------------------------------------------

function desenharAmbienteJS() {
  const grad = ctx.createLinearGradient(0, 0, 0, ALTURA_CHAO);
  grad.addColorStop(0, CORES.AZUL_CEU_CLARO);
  grad.addColorStop(1, CORES.AZUL_CEU_ESCURO);
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, LARGURA, ALTURA_CHAO);

  ctx.fillStyle = CORES.CHAO_ESCURO;
  ctx.fillRect(0, ALTURA_CHAO, LARGURA, 10);
}

function desenharPlacarJS() {
  ctx.fillStyle = CORES.PRETO;
  ctx.font = "bold 18px Arial";
  ctx.fillText(`RECORDE: ${recorde}`, LARGURA - 162, 32);
  ctx.fillStyle = CORES.DESTAQUE_PLACA;
  ctx.fillText(`RECORDE: ${recorde}`, LARGURA - 160, 30);

  ctx.fillStyle = CORES.BRANCO;
  ctx.font = "bold 60px SansSerif";
  ctx.fillText(`${pontuacao}`, 30, 70);
}

// ---------------------------------------------
// 11. MIRA
// ---------------------------------------------

function desenharLinhaMiraJS() {
  const dx = posRatoAtual.x - posRatoInicio.x;
  const dy = posRatoAtual.y - posRatoInicio.y;
  const xAlvo = bola.x + dx * fatorForcaMira;
  const yAlvo = Math.max(50, bola.y + dy * fatorForcaMira);
  const vel = FisicaUtil.calcularVelocidadeParaAlvo(bola.x, bola.y, xAlvo, yAlvo, TEMPO_DE_VOO);

  let x = bola.x, y = bola.y, vx = vel.x, vy = vel.y;
  ctx.strokeStyle = CORES.BRANCO;
  ctx.setLineDash([4, 4]);
  ctx.beginPath();
  ctx.moveTo(x, y);

  for (let t = 0; t < TEMPO_DE_VOO; t++) {
    vy += G;
    x += vx;
    y += vy;
    ctx.lineTo(x, y);
    if (y >= ALTURA_CHAO - RAIO_BOLA) break;
  }

  ctx.stroke();
  ctx.setLineDash([]);
}

// ---------------------------------------------
// 12. CONTROLES E SALVAR DADOS
// ---------------------------------------------

window.mudarDificuldade = function(nivel) {
  dificuldadeAtual = NiveisDificuldade[nivel];
  fatorForcaMira = dificuldadeAtual.fatorMira;
  forcaMaxima = dificuldadeAtual.forcaMaxima;
  erroLancamento = dificuldadeAtual.erroLancamento;
  coefRestituicaoMapa = dificuldadeAtual.coefRestituicaoMapa;
  reiniciarBola();
};

window.reiniciarBola = function() {
  bola = new Bola(100, ALTURA_CHAO - RAIO_BOLA, dificuldadeAtual.coefRestituicaoMapa);
  cesto.passouPeloAroTopo = false;
};

window.reiniciarTudo = function() {
  if (pontuacao > recorde) salvarRecorde(pontuacao);
  pontuacao = 0;
  reiniciarBola();
};

function carregarRecorde() {
  const r = localStorage.getItem('basqueteRecorde');
  recorde = r ? parseInt(r) : 0;
}

function salvarRecorde(n) {
  if (n > recorde) {
    recorde = n;
    localStorage.setItem('basqueteRecorde', recorde);
  }
}

// ---------------------------------------------
// 13. CONTROLES DE MOUSE
// ---------------------------------------------

canvas.addEventListener('mousedown', e => {
  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;
  if (!bola.emMovimento && Math.hypot(x - bola.x, y - bola.y) < RAIO_BOLA * 2) {
    aPrepararLancamento = true;
    posRatoInicio = { x, y };
  }
});

canvas.addEventListener('mouseup', e => {
  if (!aPrepararLancamento) return;
  aPrepararLancamento = false;

  const rect = canvas.getBoundingClientRect();
  const x = e.clientX - rect.left;
  const y = e.clientY - rect.top;

  const dx = x - posRatoInicio.x;
  const dy = y - posRatoInicio.y;
  const xAlvo = bola.x + dx * fatorForcaMira;
  const yAlvo = Math.max(50, bola.y + dy * fatorForcaMira);
  const vel = FisicaUtil.calcularVelocidadeParaAlvo(bola.x, bola.y, xAlvo, yAlvo, TEMPO_DE_VOO);

  let vx = vel.x, vy = vel.y;
  if (erroLancamento > 0) {
    const erro = Math.random() * 2 * erroLancamento - erroLancamento;
    vx *= (1 + erro);
    vy *= (1 + erro * 0.5);
  }

  const forca = Math.hypot(vx, vy);
  if (forca > forcaMaxima) {
    const ajuste = forcaMaxima / forca;
    vx *= ajuste;
    vy *= ajuste;
  }

  if (forca > 1) bola.lancar(vx, vy);
});

canvas.addEventListener('mousemove', e => {
  const rect = canvas.getBoundingClientRect();
  posRatoAtual = { x: e.clientX - rect.left, y: e.clientY - rect.top };
});

// ---------------------------------------------
// 14. INICIAR
// ---------------------------------------------

iniciarJogo();
