// PainelJogo.java (Versão Final: Dificuldade Extrema Corrigida e Visual Aprimorado)

import javax.swing.JPanel;
import javax.swing.Timer;
import java.awt.*;
import java.awt.event.*;
import java.awt.geom.Point2D;
import java.io.*;
import javax.sound.sampled.*;
import java.util.ArrayList;
import java.util.Random; 

// Enumeração para os níveis de dificuldade (SEM ACENTOS para compatibilidade total)
enum NivelDificuldade {
    // FÁCIL EXTREMO: Quique alto (0.95), Mira sensível (3.0), Erro zero (0.0)
    FACIL(3.0, 50, 0.0, 0.95), 
    
    // MÉDIO (Nível Padrão - Jogo Base: Quique médio (0.7), Mira 1.5, Erro Zero)
    MEDIO(1.5, 35, 0.0, 0.7), 
    
    // DIFÍCIL EXTREMO: Quique baixo (0.4), Mira lenta (0.5), Erro ALTO (0.2)
    DIFICIL(0.5, 20, 0.2, 0.4); 

    final double fatorMira;
    final double forcaMaxima;
    final double erroLancamento; 
    final double coefRestituicaoMapa; 

    NivelDificuldade(double fatorMira, double forcaMaxima, double erroLancamento, double coefRestituicaoMapa) {
        this.fatorMira = fatorMira;
        this.forcaMaxima = forcaMaxima;
        this.erroLancamento = erroLancamento;
        this.coefRestituicaoMapa = coefRestituicaoMapa;
    }
}

/**
 * O painel onde o jogo é desenhado. Gerencia o loop, objetos de jogo e o Recorde.
 */
public class PainelJogo extends JPanel implements ActionListener, KeyListener {

    // --- Constantes do Jogo ---
    public static final int LARGURA = BasqueteFrame.LARGURA;
    public static final int ALTURA = BasqueteFrame.ALTURA;
    private static final int FPS = 60;
    private static final int DELAY = 1000 / FPS; 
    private static final String HIGH_SCORE_FILE = "highscore.txt";
    private final int ALTURA_CHAO = ALTURA - 10;

    // --- Constantes de Física e Mira (Inicia com MÉDIO) ---
    private double fatorForcaMira = NivelDificuldade.MEDIO.fatorMira; 
    private double forcaMaxima = NivelDificuldade.MEDIO.forcaMaxima; 
    private double erroLancamento = NivelDificuldade.MEDIO.erroLancamento;
    private double coefRestituicaoMapa = NivelDificuldade.MEDIO.coefRestituicaoMapa;
    private static final int TEMPO_DE_VOO = 45; 
    
    // --- Variáveis de Estado ---
    private NivelDificuldade dificuldadeAtual = NivelDificuldade.MEDIO; 
    private Random random = new Random(); 
    
    // --- Cores MODERNAS E RICAS ---
    private final Color BRANCO = new Color(255, 255, 255);
    private final Color PRETO = new Color(0, 0, 0);
    
    // Cores para o Fundo (Gradiente)
    private final Color AZUL_CEU_CLARO = new Color(173, 216, 230); 
    private final Color AZUL_CEU_ESCURO = new Color(100, 149, 237); 
    
    // Cores para o Chão (Piso de Madeira)
    private final Color CHAO_CLARO = new Color(210, 180, 140); 
    private final Color CHAO_ESCURO = new Color(160, 82, 45); 
    
    // Cor de destaque para o Placar (Ouro/Amarelo)
    private final Color DESTAQUE_PLACA = new Color(255, 223, 0); 

    // --- Objetos de Jogo ---
    private Timer timer; 
    private Bola bola; 
    private Cesto cesto; 

    // --- Variáveis de Estado de Pontuação/Mira ---
    private int pontuacao = 0;
    private int recorde = 0; 
    private Point posRatoInicio;
    private boolean aPrepararLancamento = false;

    public PainelJogo() {
        this.setPreferredSize(new Dimension(LARGURA, ALTURA));
        this.setFocusable(true); 

        // Inicializar objetos de jogo no nível MÉDIO
        this.bola = new Bola(100, ALTURA_CHAO - Bola.RAIO_BOLA, this.coefRestituicaoMapa); 
        this.cesto = new Cesto();
        
        carregarRecorde();

        // Adicionar Listeners
        MeuMouseListener listener = new MeuMouseListener();
        this.addMouseListener(listener);
        this.addMouseMotionListener(listener);
        this.addKeyListener(this); 
        
        // Iniciar Game Loop
        timer = new Timer(DELAY, this);
        timer.start();
    }
    
    // --- MÉTODOS PÚBLICOS PARA BasqueteFrame e DIFICULDADE ---
    
    // Implementação robusta para evitar o erro de nível desconhecido
    public void setDificuldade(String nivel) {
        try {
            // 1. Converte a string de entrada ("Fácil", "Médio", "Difícil") para maiúsculas (Ex: "FÁCIL")
            String nomeUpper = nivel.toUpperCase();
            
            // 2. Remove os acentos, tornando a string compatível com o nome da ENUM (Ex: "FACIL")
            // Esta é a correção definitiva
            String nomeEnum = nomeUpper.replace('Á', 'A').replace('É', 'E').replace('Í', 'I').replace('Ó', 'O').replace('Ú', 'U');
            
            NivelDificuldade novoNivel = NivelDificuldade.valueOf(nomeEnum); 
            this.dificuldadeAtual = novoNivel;
            
            // Aplica os novos valores
            this.fatorForcaMira = novoNivel.fatorMira;
            this.forcaMaxima = novoNivel.forcaMaxima;
            this.erroLancamento = novoNivel.erroLancamento;
            this.coefRestituicaoMapa = novoNivel.coefRestituicaoMapa;
            
            // Reinicia a bola para aplicar as novas regras
            reiniciarBola(); 
            System.out.println("Dificuldade alterada para: " + nivel);
            
        } catch (IllegalArgumentException e) {
            System.err.println("Erro Crítico: O nome da ENUM não corresponde ou não foi tratado. Detalhe: " + e.getMessage());
        }
    }

    public void reiniciarBola() {
        // Passa o coeficiente de restituição atual para o construtor da Bola
        this.bola = new Bola(100, ALTURA_CHAO - Bola.RAIO_BOLA, this.coefRestituicaoMapa); 
        this.cesto.passouPeloAroTopo = false;
        tocarSom("reiniciar.wav"); 
    }

    public void reiniciarTudo() {
        if (pontuacao > recorde) {
            salvarRecorde(pontuacao);
        }
        this.pontuacao = 0; 
        reiniciarBola(); 
    }
    
    // --- Lógica de I/O (Recorde, Sons) ---
    private void carregarRecorde() {
        try (BufferedReader reader = new BufferedReader(new FileReader(HIGH_SCORE_FILE))) {
            recorde = Integer.parseInt(reader.readLine());
        } catch (FileNotFoundException e) {
            recorde = 0; 
        } catch (IOException | NumberFormatException e) {
            System.err.println("Erro ao carregar recorde: " + e.getMessage());
            recorde = 0;
        }
    }

    private void salvarRecorde(int novoRecorde) {
        try (BufferedWriter writer = new BufferedWriter(new FileWriter(HIGH_SCORE_FILE))) {
            writer.write(String.valueOf(novoRecorde));
            recorde = novoRecorde;
        } catch (IOException e) {
            System.err.println("Erro ao salvar recorde: " + e.getMessage());
        }
    }
    
    private void tocarSom(String nomeFicheiro) {
        // (Código do som permanece o mesmo, por brevidade)
        try {
            File somFile = new File(nomeFicheiro);
            if (somFile.exists()) {
                AudioInputStream audioIn = AudioSystem.getAudioInputStream(somFile);
                Clip clip = AudioSystem.getClip();
                clip.open(audioIn);
                clip.start();
            }
        } catch (UnsupportedAudioFileException | IOException | LineUnavailableException e) {
             // Silencioso se o ficheiro não for encontrado
        }
    }

    // --- O Game Loop ---
    @Override
    public void actionPerformed(ActionEvent e) {
        if (bola.emMovimento) {
            bola.atualizarPosicao(ALTURA_CHAO); 
            
            bola.verificarColisaoMapa(LARGURA, ALTURA, this.coefRestituicaoMapa); 
            
            double oldVelX = bola.velX; 
            cesto.verificarColisao(bola); 

            if (bola.velX != oldVelX) {
                tocarSom("colisao.wav"); 
            }
            
            if (cesto.verificarPontuacao(bola)) {
                pontuacao++;
                tocarSom("ponto.wav"); 
                if (pontuacao > recorde) {
                    salvarRecorde(pontuacao);
                }
            }
        }
        repaint(); 
    }
    
    // --- Desenho (Graphics) - VISUAL APRIMORADO ---
    @Override
    protected void paintComponent(Graphics g) {
        super.paintComponent(g);
        
        Graphics2D g2d = (Graphics2D) g;
        g2d.setRenderingHint(RenderingHints.KEY_ANTIALIASING, RenderingHints.VALUE_ANTIALIAS_ON);

        desenharAmbiente(g2d);
        
        if (aPrepararLancamento && posRatoInicio != null) {
            desenharLinhaMira(g2d);
        }

        cesto.desenhar(g2d, ALTURA);
        bola.desenhar(g2d, ALTURA); 
        desenharPlacar(g2d);
        
        Toolkit.getDefaultToolkit().sync();
    }
    
    private void desenharAmbiente(Graphics2D g) {
        // Fundo (Gradiente do céu, mais sutil)
        GradientPaint gp = new GradientPaint(
            0, 0, AZUL_CEU_CLARO, 
            0, ALTURA_CHAO, AZUL_CEU_ESCURO.darker()
        );
        g.setPaint(gp);
        g.fillRect(0, 0, LARGURA, ALTURA_CHAO);
        
        // Chão (Padrão de Madeira)
        g.setColor(CHAO_ESCURO);
        g.fillRect(0, ALTURA_CHAO, LARGURA, 10);
        
        // Linhas verticais simulando tábuas (detalhe)
        g.setColor(CHAO_CLARO.darker().darker()); 
        for (int i = 0; i < LARGURA; i += 50) {
            g.drawLine(i, ALTURA_CHAO, i, ALTURA);
        }
        // Linha superior
        g.setColor(CHAO_CLARO.darker());
        g.drawLine(0, ALTURA_CHAO, LARGURA, ALTURA_CHAO);
    }
    
    private void desenharPlacar(Graphics2D g) {
        // --- Recorde ---
        // Sombra
        g.setColor(PRETO);
        g.setFont(new Font("Arial", Font.BOLD, 18));
        g.drawString("RECORDE: " + recorde, LARGURA - 162, 32); 
        
        // Texto
        g.setColor(DESTAQUE_PLACA.brighter());
        g.drawString("RECORDE: " + recorde, LARGURA - 160, 30);
        
        // --- Pontuação Principal ---
        // Sombra (profundidade)
        g.setColor(PRETO);
        g.setFont(new Font("SansSerif", Font.BOLD, 60)); 
        g.drawString("" + pontuacao, 32, 72); 
        
        // Texto Principal
        g.setColor(BRANCO);
        g.drawString("" + pontuacao, 30, 70);

        // Rótulo "PONTOS"
        g.setColor(DESTAQUE_PLACA);
        g.setFont(new Font("Arial", Font.PLAIN, 14));
        g.drawString("PONTOS", 32, 85);
    }
    
    private void desenharLinhaMira(Graphics2D g) {
        Point posAtual = getMousePosition();
        if (posAtual == null) return;
        
        // 1. Cálculo do Alvo (código inalterado)
        double dxArrasto = posAtual.getX() - posRatoInicio.getX();
        double dyArrasto = posAtual.getY() - posRatoInicio.getY();

        double xAlvo = bola.x + dxArrasto * fatorForcaMira;
        double yAlvo = bola.y + dyArrasto * fatorForcaMira;
        
        if (yAlvo < 50) yAlvo = 50;
        
        // 2. Cálculo da Velocidade (código inalterado)
        Point2D.Double velocidade = FisicaUtil.calcularVelocidadeParaAlvo(bola.x, bola.y, xAlvo, yAlvo, TEMPO_DE_VOO);
        
        // 3. Desenhar a Trajetória Parabólica (com toque visual)
        java.util.List<Point> pontos = new ArrayList<>();
        double xTemp = bola.x, yTemp = bola.y;
        double vxTemp = velocidade.getX(), vyTemp = velocidade.getY();
        
        for (int t = 0; t < TEMPO_DE_VOO; t++) {
            vyTemp += FisicaUtil.GRAVIDADE; 
            xTemp += vxTemp;
            yTemp += vyTemp;
            pontos.add(new Point((int) xTemp, (int) yTemp));
            
            if (yTemp >= ALTURA_CHAO - Bola.RAIO_BOLA || xTemp <= 0 || xTemp >= LARGURA || yTemp <= 0) break;
        }
        
        // Desenha a linha pontilhada da mira
        g.setColor(BRANCO);
        for (int i = 0; i < pontos.size(); i++) {
            if (i % 3 == 0) { 
                g.fillOval(pontos.get(i).x - 2, pontos.get(i).y - 2, 4, 4);
            }
        }

        // Desenha o Alvo
        if (!pontos.isEmpty()) {
            Point alvo = pontos.get(pontos.size() - 1);
            g.setColor(new Color(255, 0, 0));
            g.drawOval(alvo.x - 4, alvo.y - 4, 8, 8);
        }
    }

    // --- Processamento de Input (Mouse Listener e Key Listener) ---
    private class MeuMouseListener extends MouseAdapter {
        @Override
        public void mousePressed(MouseEvent e) {
            if (!bola.emMovimento && Math.hypot(e.getX() - bola.x, e.getY() - bola.y) < Bola.RAIO_BOLA * 2) {
                aPrepararLancamento = true;
                posRatoInicio = e.getPoint();
            }
        }

        @Override
        public void mouseReleased(MouseEvent e) {
            if (aPrepararLancamento) {
                aPrepararLancamento = false;
                
                double dxArrasto = e.getX() - posRatoInicio.getX();
                double dyArrasto = e.getY() - posRatoInicio.getY();
                
                double xAlvo = bola.x + dxArrasto * fatorForcaMira;
                double yAlvo = bola.y + dyArrasto * fatorForcaMira;
                
                if (yAlvo < 50) yAlvo = 50;

                Point2D.Double velocidade = FisicaUtil.calcularVelocidadeParaAlvo(bola.x, bola.y, xAlvo, yAlvo, TEMPO_DE_VOO);
                
                double forcaX = velocidade.getX();
                double forcaY = velocidade.getY();

                // Implementar o Erro de Lançamento (DIFICULDADE EXTREMA)
                if (erroLancamento > 0) {
                    double fatorErro = random.nextDouble() * 2 * erroLancamento - erroLancamento;
                    forcaX *= (1 + fatorErro); 
                    forcaY *= (1 + fatorErro * 0.5); 
                }
                
                // Limitação de Força
                double forcaTotal = Math.hypot(forcaX, forcaY);
                if (forcaTotal > forcaMaxima) { 
                    double fatorAjuste = forcaMaxima / forcaTotal;
                    forcaX *= fatorAjuste;
                    forcaY *= fatorAjuste;
                }
                
                if (forcaTotal > 1) { 
                    bola.lancar(forcaX, forcaY);
                }
            }
        }
        
        @Override
        public void mouseDragged(MouseEvent e) {
            if (aPrepararLancamento) {
                repaint(); 
            }
        }
    }

    @Override
    public void keyTyped(KeyEvent e) {}

    @Override
    public void keyPressed(KeyEvent e) {
        if (e.getKeyCode() == KeyEvent.VK_R) {
            reiniciarBola();
        }
    }

    @Override
    public void keyReleased(KeyEvent e) {}
}