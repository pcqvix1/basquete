// game.js (Versão 3.0: Completo e com Todas as Correções de Inicialização e Escopo)

// ---------------------------------------------
// 1. SETUP DO CANVAS E CONTEXTO
// ---------------------------------------------

const canvas = document.getElementById('gameCanvas');
if (!canvas) {
    console.error("Erro: Elemento canvas não encontrado. Verifique o index.html.");
    throw new Error("Canvas não inicializado."); 
}

const ctx = canvas.getContext('2d');
const LARGURA = canvas.width;
const ALTURA = canvas.height;
const ALTURA_CHAO = ALTURA - 10;
const FPS = 60;
let lastTime = 0;

// ---------------------------------------------
// 2. CONSTANTES DE FÍSICA E DESIGN
// ---------------------------------------------

const G = 0.5; // Gravidade
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

// Variáveis de Estado do Mouse/Mira (CORREÇÃO DE ESCOPO - B2)
let aPrepararLancamento = false;
let posRatoInicio = null;
let posRatoAtual = null; 

// ---------------------------------------------
// 4. FUNÇÕES DE UTILIDADE (FisicaUtil)
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
        this.POS_X = LARGURA - 100;
        // CORREÇÃO FINAL: Posição Y ajustada para ficar consistentemente abaixo do topo
        this.POS_Y = 150; 
        this.LARGURA_ARO = 60;
        this.RAIO_ARO = 5;
        
        this.aroY = this.POS_Y + 10;
        this.aroLeftX = this.POS_X - this.LARGURA_ARO;
        this.aroRightX = this.POS_X;

        this.passouPeloAroTopo = false;
    }

    desenhar() {
        // Tabela
        ctx.fillStyle = CORES.BRANCO;
        ctx.fillRect(this.POS_X, this.POS_Y, this.LARGURA_TABELA, this.ALTURA_TABELA);
        ctx.strokeStyle = CORES.PRETO;
        ctx.lineWidth = 2;
        ctx.strokeRect(this.POS_X, this.POS_Y, this.LARGURA_TABELA, this.ALTURA_TABELA);

        // Aro (Aro principal)
        ctx.fillStyle = 'red';
        ctx.fillRect(this.aroLeftX, this.aroY - this.RAIO_ARO, this.LARGURA_ARO, this.RAIO_ARO * 2);

        // Ponta do aro
        ctx.beginPath();
        ctx.arc(this.aroLeftX, this.aroY, this.RAIO_ARO, 0, Math.PI * 2);
        ctx.fill();

        // Rede (Simplificada)
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1;
        ctx.beginPath();
        for(let i = 0; i < 4; i++) {
            ctx.moveTo(this.aroLeftX + (i * this.LARGURA_ARO/3), this.aroY + this.RAIO_ARO);
            ctx.lineTo(this.aroLeftX + (i * this.LARGURA_ARO/3) + 10, this.aroY + 60);
        }
        ctx.stroke();
    }
    
    verificarColisao(bola) {
        // Colisão com a Tabela (lado esquerdo)
        if (bola.x + RAIO_BOLA >= this.POS_X && bola.x - RAIO_BOLA < this.POS_X + this.LARGURA_TABELA && 
            bola.y > this.POS_Y && bola.y < this.POS_Y + this.ALTURA_TABELA) {
            
            bola.velX *= -coefRestituicaoMapa;
            bola.x = this.POS_X - RAIO_BOLA; 
        }
        
        // Colisão com a parte de baixo do aro
        if (bola.x > this.aroLeftX && bola.x < this.aroRightX &&
            bola.y + RAIO_BOLA >= this.aroY && bola.y - RAIO_BOLA < this.aroY + this.RAIO_ARO) {

            if (bola.velY > 0) {
                bola.velY *= -coefRestituicaoMapa;
                bola.y = this.aroY - RAIO_BOLA; 
            }
        }
        
        // Colisão com a ponta esquerda do aro
        const dist = Math.hypot(bola.x - this.aroLeftX, bola.y - this.aroY);
        if (dist < RAIO_BOLA + this.RAIO_ARO) {
            const angle = Math.atan2(bola.y - this.aroY, bola.x - this.aroLeftX);
            bola.x = this.aroLeftX + Math.cos(angle) * (RAIO_BOLA + this.RAIO_ARO);
            bola.y = this.aroY + Math.sin(angle) * (RAIO_BOLA + this.RAIO_ARO);

            const speed = Math.hypot(bola.velX, bola.velY);
            const newAngle = angle + Math.PI;
            bola.velX = Math.cos(newAngle) * speed * coefRestituicaoMapa;
            bola.velY = Math.sin(newAngle) * speed * coefRestituicaoMapa;
        }
    }

    verificarPontuacao(bola) {
        const noCaminhoCerto = bola.x > this.aroLeftX + this.RAIO_ARO && bola.x < this.aroRightX - this.RAIO_ARO;

        // Passou por cima do aro? (Descendo)
        if (noCaminhoCerto && bola.y + RAIO_BOLA < this.aroY && bola.velY > 0) {
            this.passouPeloAroTopo = true;
        }

        // Entrou? (Passou do aro para baixo e veio por cima)
        if (this.passouPeloAroTopo && bola.y - RAIO_BOLA > this.aroY) {
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

        // Colisão com o Chão
        if (this.y + RAIO_BOLA >= ALTURA_CHAO) { 
            this.y = ALTURA_CHAO - RAIO_BOLA; 
            this.velY *= -this.coefRestituicaoChao; 
            
            if (Math.abs(this.velY) < 1 && Math.abs(this.velX) < 1) {
                this.emMovimento = false;
                this.velX = 0;
                this.velY = 0;
            }
        }
        
        // Colisão com as Paredes
        if (this.x - RAIO_BOLA <= 0) {
            this.x = RAIO_BOLA;
            this.velX *= -coefRestituicaoMapa;
        } else if (this.x + RAIO_BOLA >= LARGURA) {
            this.x = LARGURA - RAIO_BOLA;
            this.velX *= -coefRestituicaoMapa;
        }
        if (this.y - RAIO_BOLA <= 0) {
            this.y = RAIO_BOLA;
            this.velY *= -coefRestituicaoMapa;
        }
    }

    desenhar() {
        // 1. Sombra projetada
        if (this.y < ALTURA_CHAO - RAIO_BOLA - 5) {
            const raioSombra = RAIO_BOLA * 0.8;
            ctx.fillStyle = 'rgba(0, 0, 0, 0.4)'; 
            ctx.beginPath();
            ctx.ellipse(this.x + 5, ALTURA_CHAO - raioSombra/4, raioSombra * 2, raioSombra / 4, 0, 0, Math.PI * 2);
            ctx.fill();
        }

        // 2. Corpo da Bola com Gradiente Radial
        const gradiente = ctx.createRadialGradient(
            this.x - RAIO_BOLA / 3, this.y - RAIO_BOLA / 3, 5, 
            this.x, this.y, RAIO_BOLA * 1.5                   
        );
        gradiente.addColorStop(0, CORES.LARANJA_CLARO);
        gradiente.addColorStop(1, CORES.LARANJA_ESCURO);
        
        ctx.fillStyle = gradiente;
        ctx.beginPath();
        ctx.arc(this.x, this.y, RAIO_BOLA, 0, Math.PI * 2);
        ctx.fill();

        // 3. Brilho
        ctx.fillStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.beginPath();
        ctx.arc(this.x - RAIO_BOLA * 0.5, this.y - RAIO_BOLA * 0.7, RAIO_BOLA * 0.2, 0, Math.PI * 2);
        ctx.fill();
        
        // 4. Contorno
        ctx.strokeStyle = CORES.PRETO;
        ctx.lineWidth = 1;
        ctx.beginPath();
        ctx.arc(this.x, this.y, RAIO_BOLA, 0, Math.PI * 2);
        ctx.stroke();
    }
}

// ---------------------------------------------
// 7. INICIALIZAÇÃO E GAME LOOP
// ---------------------------------------------

let bola, cesto;

function iniciarJogo() {
    // CORREÇÃO DE INICIALIZAÇÃO: Garantimos que o cesto é criado primeiro.
    cesto = new Cesto();
    bola = new Bola(100, ALTURA_CHAO - RAIO_BOLA, dificuldadeAtual.coefRestituicaoMapa); 
    
    carregarRecorde();
    
    requestAnimationFrame(gameLoop);
}

function gameLoop(currentTime) {
    const delta = currentTime - lastTime;
    if (delta > (1000 / FPS)) {
        lastTime = currentTime;
        
        // Verificação robusta para evitar erros no início
        if (bola && cesto) { 
            atualizar();
            desenhar();
        }
    }
    
    requestAnimationFrame(gameLoop);
}

// ---------------------------------------------
// 8. ATUALIZAÇÃO E DESENHO
// ---------------------------------------------

function atualizar() {
    if (bola.emMovimento) {
        bola.atualizarPosicao(); 
        
        cesto.verificarColisao(bola); 

        if (cesto.verificarPontuacao(bola)) {
            pontuacao++;
            salvarRecorde(pontuacao);
        }
    }
}

// Funções de Desenho Auxiliares
function desenharAmbienteJS() {
    const gradiente = ctx.createLinearGradient(0, 0, 0, ALTURA_CHAO);
    gradiente.addColorStop(0, CORES.AZUL_CEU_CLARO);
    gradiente.addColorStop(1, CORES.AZUL_CEU_ESCURO); 
    ctx.fillStyle = gradiente;
    ctx.fillRect(0, 0, LARGURA, ALTURA_CHAO);
    
    ctx.fillStyle = CORES.CHAO_ESCURO;
    ctx.fillRect(0, ALTURA_CHAO, LARGURA, 10);
    
    ctx.strokeStyle = CORES.CHAO_ESCURO; 
    ctx.lineWidth = 1;
    for (let i = 0; i < LARGURA; i += 50) {
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
    // Recorde
    ctx.fillStyle = CORES.PRETO; 
    ctx.font = "bold 18px Arial";
    ctx.fillText(`RECORDE: ${recorde}`, LARGURA - 162, 32); 
    
    ctx.fillStyle = CORES.DESTAQUE_PLACA; 
    ctx.fillText(`RECORDE: ${recorde}`, LARGURA - 160, 30);
    
    // Pontuação Principal
    ctx.fillStyle = CORES.PRETO; 
    ctx.font = "bold 60px SansSerif"; 
    ctx.fillText(`${pontuacao}`, 32, 72); 
    
    ctx.fillStyle = CORES.BRANCO; 
    ctx.fillText(`${pontuacao}`, 30, 70);

    // Rótulo "PONTOS"
    ctx.fillStyle = CORES.DESTAQUE_PLACA;
    ctx.font = "14px Arial";
    ctx.fillText("PONTOS", 32, 85);
}

function desenharLinhaMiraJS() {
    // CORREÇÃO DE ESCOPO: Usa a variável global armazenada pelo mousemove
    if (!posRatoAtual || !posRatoInicio) return; 

    const dxArrasto = posRatoAtual.x - posRatoInicio.x;
    const dyArrasto = posRatoAtual.y - posRatoInicio.y;

    const xAlvo = bola.x + dxArrasto * fatorForcaMira;
    const yAlvo = bola.y + dyArrasto * fatorForcaMira;
    
    const yLimitado = Math.max(50, yAlvo);

    const velocidade = FisicaUtil.calcularVelocidadeParaAlvo(bola.x, bola.y, xAlvo, yLimitado, TEMPO_DE_VOO);
    
    // Desenhar a Trajetória Parabólica
    let xTemp = bola.x, yTemp = bola.y;
    let vxTemp = velocidade.x, vyTemp = velocidade.y;
    
    ctx.strokeStyle = CORES.BRANCO;
    ctx.setLineDash([4, 4]);
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(xTemp, yTemp);

    for (let t = 0; t < TEMPO_DE_VOO; t++) {
        vyTemp += G; 
        xTemp += vxTemp;
        yTemp += vyTemp;
        
        ctx.lineTo(xTemp, yTemp);
        
        if (yTemp >= ALTURA_CHAO - RAIO_BOLA || xTemp <= 0 || xTemp >= LARGURA || yTemp <= 0) break;
    }
    ctx.stroke();
    ctx.setLineDash([]); 

    // Desenha o ponto final (O Alvo)
    ctx.fillStyle = 'red';
    ctx.beginPath();
    ctx.arc(xTemp, yTemp, 4, 0, Math.PI * 2);
    ctx.fill();
}


// ---------------------------------------------
// 9. CONTROLES DO JOGO (Funções Globais)
// ---------------------------------------------

window.mudarDificuldade = function(nivel) {
    const nivelEnum = nivel; 
    dificuldadeAtual = NiveisDificuldade[nivelEnum];
    
    fatorForcaMira = dificuldadeAtual.fatorMira;
    forcaMaxima = dificuldadeAtual.forcaMaxima;
    erroLancamento = dificuldadeAtual.erroLancamento;
    coefRestituicaoMapa = dificuldadeAtual.coefRestituicaoMapa;
    
    reiniciarBola(); 
}

window.reiniciarBola = function() {
    bola = new Bola(100, ALTURA_CHAO - RAIO_BOLA, dificuldadeAtual.coefRestituicaoMapa);
    cesto.passouPeloAroTopo = false;
}

window.reiniciarTudo = function() {
    if (pontuacao > recorde) {
        salvarRecorde(pontuacao);
    }
    pontuacao = 0; 
    reiniciarBola();
}

function carregarRecorde() {
    const recordeSalvo = localStorage.getItem('basqueteRecorde');
    recorde = recordeSalvo ? parseInt(recordeSalvo) : 0;
}

function salvarRecorde(novoRecorde) {
    if (novoRecorde > recorde) {
        recorde = novoRecorde;
        localStorage.setItem('basqueteRecorde', recorde);
    }
}

// ---------------------------------------------
// 10. INPUT (Mouse e Toque)
// ---------------------------------------------

canvas.addEventListener('mousedown', (e) => {
    const rect = canvas.getBoundingClientRect();
    const mouseX = e.clientX - rect.left;
    const mouseY = e.clientY - rect.top;

    if (!bola.emMovimento && Math.hypot(mouseX - bola.x, mouseY - bola.y) < RAIO_BOLA * 2) {
        aPrepararLancamento = true;
        posRatoInicio = { x: mouseX, y: mouseY };
    }
});

canvas.addEventListener('mouseup', (e) => {
    if (aPrepararLancamento) {
        aPrepararLancamento = false;
        
        const rect = canvas.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        const mouseY = e.clientY - rect.top;

        const dxArrasto = mouseX - posRatoInicio.x;
        const dyArrasto = mouseY - posRatoInicio.y;
        
        const xAlvo = bola.x + dxArrasto * fatorForcaMira;
        const yAlvo = bola.y + dyArrasto * fatorForcaMira;
        
        const yLimitado = Math.max(50, yAlvo);

        const velocidade = FisicaUtil.calcularVelocidadeParaAlvo(bola.x, bola.y, xAlvo, yLimitado, TEMPO_DE_VOO);
        
        let forcaX = velocidade.x;
        let forcaY = velocidade.y;

        if (erroLancamento > 0) {
            const fatorErro = Math.random() * 2 * erroLancamento - erroLancamento;
            forcaX *= (1 + fatorErro); 
            forcaY *= (1 + fatorErro * 0.5); 
        }
        
        const forcaTotal = Math.hypot(forcaX, forcaY);
        if (forcaTotal > forcaMaxima) {
            const fatorAjuste = forcaMaxima / forcaTotal;
            forcaX *= fatorAjuste;
            forcaY *= fatorAjuste;
        }
        
        if (forcaTotal > 1) { 
            bola.lancar(forcaX, forcaY);
        }
    }
});

// Listener de mousemove CRUCIAL para alimentar a variável global posRatoAtual
canvas.addEventListener('mousemove', (e) => {
    const rect = canvas.getBoundingClientRect();
    posRatoAtual = { 
        x: e.clientX - rect.left, 
        y: e.clientY - rect.top 
    };
});

// Inicia o jogo quando o script é carregado
iniciarJogo();