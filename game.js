// game.js — Versão 8.0 (cesta fixa, aro realista, mira com bolinha)

// ---------------------------------------------
// 1. SETUP DO CANVAS E CONTEXTO
// ---------------------------------------------
const canvas = document.getElementById('gameCanvas');
const ctx = canvas.getContext('2d');

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
// 3. NÍVEL DE DIFICULDADE
// ---------------------------------------------
const NiveisDificuldade = {
    FACIL: { fatorMira: 1.5, forcaMaxima: 40, erroLancamento: 0.05, coefRestituicaoMapa: 0.75 },
    MEDIO: { fatorMira: 1.2, forcaMaxima: 35, erroLancamento: 0.08, coefRestituicaoMapa: 0.7 },
    DIFICIL: { fatorMira: 1.0, forcaMaxima: 32, erroLancamento: 0.1, coefRestituicaoMapa: 0.6 }
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
// 4. FUNÇÕES DE UTILIDADE
// ---------------------------------------------
const FisicaUtil = {
    calcularVelocidadeParaAlvo(xInicial, yInicial, xAlvo, yAlvo, tempo) {
        const vx = (xAlvo - xInicial) / tempo;
        const vy = (yAlvo - yInicial) / tempo - (0.5 * G * tempo);
        return { x: vx, y: vy };
    }
};

// ---------------------------------------------
// 5. CLASSE CESTO
// ---------------------------------------------
class Cesto {
    constructor() {
        this.LARGURA_TABELA = 10;
        this.ALTURA_TABELA = 120;
        this.POS_X = LARGURA - 110;
        this.POS_Y = ALTURA - 300; // fixo no alto
        this.ARO_LARGURA = RAIO_BOLA * 2;
        this.ARO_Y = this.POS_Y + 40;
        this.ARO_ESQ = this.POS_X - this.ARO_LARGURA;
        this.ARO_DIR = this.POS_X;
        this.passouPeloAroTopo = false;
    }

    desenhar() {
        // Tabela
        ctx.fillStyle = CORES.BRANCO;
        ctx.fillRect(this.POS_X, this.POS_Y, this.LARGURA_TABELA, this.ALTURA_TABELA);
        ctx.strokeStyle = CORES.PRETO;
        ctx.strokeRect(this.POS_X, this.POS_Y, this.LARGURA_TABELA, this.ALTURA_TABELA);

        // Aro
        ctx.strokeStyle = "red";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(this.ARO_ESQ, this.ARO_Y);
        ctx.lineTo(this.ARO_DIR, this.ARO_Y);
        ctx.stroke();

        // Rede
        ctx.strokeStyle = "#fff";
        ctx.lineWidth = 1;
        ctx.beginPath();
        for (let i = 0; i <= 4; i++) {
            ctx.moveTo(this.ARO_ESQ + (i * (this.ARO_LARGURA / 4)), this.ARO_Y);
            ctx.lineTo(this.ARO_ESQ + (i * (this.ARO_LARGURA / 4)) + 5, this.ARO_Y + 40);
        }
        ctx.stroke();
    }

    verificarColisao(bola) {
        // colisão lateral da tabela
        if (bola.x + RAIO_BOLA >= this.POS_X && bola.x < this.POS_X + this.LARGURA_TABELA &&
            bola.y > this.POS_Y && bola.y < this.POS_Y + this.ALTURA_TABELA) {
            bola.velX *= -coefRestituicaoMapa;
            bola.x = this.POS_X - RAIO_BOLA;
        }

        // colisão lateral aro esquerdo
        if (Math.abs(bola.x - this.ARO_ESQ) < RAIO_BOLA &&
            Math.abs(bola.y - this.ARO_Y) < RAIO_BOLA) {
            bola.x = this.ARO_ESQ - RAIO_BOLA;
            bola.velX *= -0.6;
        }

        // colisão lateral aro direito
        if (Math.abs(bola.x - this.ARO_DIR) < RAIO_BOLA &&
            Math.abs(bola.y - this.ARO_Y) < RAIO_BOLA) {
            bola.x = this.ARO_DIR + RAIO_BOLA;
            bola.velX *= -0.6;
        }

        // chão, paredes e teto
        if (bola.x - RAIO_BOLA < 0) {
            bola.x = RAIO_BOLA;
            bola.velX *= -coefRestituicaoMapa;
        } else if (bola.x + RAIO_BOLA > LARGURA) {
            bola.x = LARGURA - RAIO_BOLA;
            bola.velX *= -coefRestituicaoMapa;
        }
        if (bola.y - RAIO_BOLA < 0) {
            bola.y = RAIO_BOLA;
            bola.velY *= -coefRestituicaoMapa;
        }
    }

    verificarPontuacao(bola) {
        const dentroX = bola.x > this.ARO_ESQ && bola.x < this.ARO_DIR;
        if (dentroX && bola.y - RAIO_BOLA < this.ARO_Y && bola.velY > 0) {
            this.passouPeloAroTopo = true;
        }
        if (this.passouPeloAroTopo && bola.y - RAIO_BOLA > this.ARO_Y + 10) {
            this.passouPeloAroTopo = false;
            return true;
        }
        return false;
    }
}

// ---------------------------------------------
// 6. CLASSE BOLA
// ---------------------------------------------
class Bola {
    constructor(x, y, coefRestituicaoChao) {
        this.inicioX = x;
        this.inicioY = y;
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

        if (this.y + RAIO_BOLA >= ALTURA_CHAO) {
            this.y = ALTURA_CHAO - RAIO_BOLA;
            this.velY *= -this.coefRestituicaoChao;
            if (Math.abs(this.velY) < 1 && Math.abs(this.velX) < 1) {
                this.emMovimento = false;
                this.velX = 0;
                this.velY = 0;
            }
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
        const grad = ctx.createRadialGradient(
            this.x - RAIO_BOLA / 3, this.y - RAIO_BOLA / 3, 5,
            this.x, this.y, RAIO_BOLA * 1.5
        );
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

    reiniciar() {
        this.x = this.inicioX;
        this.y = this.inicioY;
        this.velX = 0;
        this.velY = 0;
        this.emMovimento = false;
    }
}

// ---------------------------------------------
// 7. INICIALIZAÇÃO
// ---------------------------------------------
let bola, cesto;
function iniciarJogo() {
    cesto = new Cesto();
    bola = new Bola(100, ALTURA_CHAO - RAIO_BOLA, dificuldadeAtual.coefRestituicaoMapa);
    carregarRecorde();
    requestAnimationFrame(gameLoop);
}

// ---------------------------------------------
// 8. GAME LOOP
// ---------------------------------------------
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
// 9. DESENHO
// ---------------------------------------------
function desenhar() {
    ctx.clearRect(0, 0, LARGURA, ALTURA);
    desenharAmbienteJS();

    if (aPrepararLancamento && posRatoInicio && posRatoAtual && !bola.emMovimento) {
        desenharLinhaMiraJS();
    }

    cesto.desenhar();
    bola.desenhar();
    desenharPlacarJS();
}

function desenharAmbienteJS() {
    const grad = ctx.createLinearGradient(0,0,0,ALTURA_CHAO);
    grad.addColorStop(0, CORES.AZUL_CEU_CLARO);
    grad.addColorStop(1, CORES.AZUL_CEU_ESCURO);
    ctx.fillStyle = grad;
    ctx.fillRect(0,0,LARGURA,ALTURA_CHAO);
    ctx.fillStyle = CORES.CHAO_ESCURO;
    ctx.fillRect(0, ALTURA_CHAO, LARGURA, 10);
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
}

// ---------------------------------------------
// 10. LINHA DE MIRA
// ---------------------------------------------
function desenharLinhaMiraJS() {
    const dx = posRatoAtual.x - posRatoInicio.x;
    const dy = posRatoAtual.y - posRatoInicio.y;
    const xAlvo = bola.x + dx * fatorForcaMira;
    const yAlvo = bola.y + dy * fatorForcaMira;
    const yLimitado = Math.max(50, yAlvo);

    const vel = FisicaUtil.calcularVelocidadeParaAlvo(bola.x, bola.y, xAlvo, yLimitado, TEMPO_DE_VOO);
    let xTemp = bola.x, yTemp = bola.y, vx = vel.x, vy = vel.y;

    ctx.strokeStyle = CORES.BRANCO;
    ctx.setLineDash([4,4]);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(xTemp, yTemp);
    for (let t = 0; t < TEMPO_DE_VOO; t++) {
        vy += G;
        xTemp += vx;
        yTemp += vy;
        ctx.lineTo(xTemp, yTemp);
        if (yTemp >= ALTURA_CHAO) break;
    }
    ctx.stroke();
    ctx.setLineDash([]);

    // bolinha da mira (ponta)
    ctx.fillStyle = "yellow";
    ctx.beginPath();
    ctx.arc(xTemp, yTemp, 5, 0, Math.PI * 2);
    ctx.fill();
}

// ---------------------------------------------
// 11. ATUALIZAÇÃO
// ---------------------------------------------
function atualizar() {
    bola.atualizarPosicao();
    cesto.verificarColisao(bola);

    if (cesto.verificarPontuacao(bola)) {
        pontuacao++;
        salvarRecorde(pontuacao);
        bola.reiniciar();
    }
}

// ---------------------------------------------
// 12. INPUT
// ---------------------------------------------
canvas.addEventListener('mousedown', (e) => {
    const r = canvas.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    if (!bola.emMovimento && Math.hypot(x - bola.x, y - bola.y) < RAIO_BOLA * 2) {
        aPrepararLancamento = true;
        posRatoInicio = { x, y };
    }
});

canvas.addEventListener('mouseup', (e) => {
    if (!aPrepararLancamento) return;
    aPrepararLancamento = false;
    const r = canvas.getBoundingClientRect();
    const x = e.clientX - r.left;
    const y = e.clientY - r.top;
    const dx = x - posRatoInicio.x;
    const dy = y - posRatoInicio.y;
    const xAlvo = bola.x + dx * fatorForcaMira;
    const yAlvo = bola.y + dy * fatorForcaMira;
    const yLimitado = Math.max(50, yAlvo);
    const vel = FisicaUtil.calcularVelocidadeParaAlvo(bola.x, bola.y, xAlvo, yLimitado, TEMPO_DE_VOO);

    let fx = vel.x;
    let fy = vel.y;
    if (erroLancamento > 0) {
        const erro = Math.random() * 2 * erroLancamento - erroLancamento;
        fx *= (1 + erro);
        fy *= (1 + erro * 0.5);
    }

    const total = Math.hypot(fx, fy);
    if (total > forcaMaxima) {
        const fator = forcaMaxima / total;
        fx *= fator;
        fy *= fator;
    }

    if (total > 1) bola.lancar(fx, fy);
});

canvas.addEventListener('mousemove', (e) => {
    const r = canvas.getBoundingClientRect();
    posRatoAtual = { x: e.clientX - r.left, y: e.clientY - r.top };
});

window.addEventListener('keydown', (e) => {
    if (e.key === 'r' || e.key === 'R') bola.reiniciar();
});

// ---------------------------------------------
// 13. RECORDES
// ---------------------------------------------
function carregarRecorde() {
    const r = localStorage.getItem('basqueteRecorde');
    recorde = r ? parseInt(r) : 0;
}
function salvarRecorde(novo) {
    if (novo > recorde) {
        recorde = novo;
        localStorage.setItem('basqueteRecorde', recorde);
    }
}

// ---------------------------------------------
// 14. INÍCIO
// ---------------------------------------------
iniciarJogo();
