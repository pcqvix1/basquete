// Bola.java (Atualizado com Gradiente e Brilho para Visual 3D)

import java.awt.*;
import java.awt.geom.Ellipse2D;
import java.awt.geom.Point2D; // Importação necessária para RadialGradientPaint

/**
 * Representa o objeto Bola, gerenciando sua posição, velocidade e desenho.
 */
public class Bola {

    // Constantes
    public static final int RAIO_BOLA = 20;
    private static final double GRAVIDADE = 0.5;
    
    // Novas cores para o Gradiente da Bola
    private final Color LARANJA_CLARO = new Color(255, 165, 0); 
    private final Color LARANJA_ESCURO = new Color(204, 85, 0); 
    private final Color BRILHO = new Color(255, 255, 255, 180); // Branco semi-transparente
    private final Color SOMBRA_BOLA = new Color(0, 0, 0, 150);
    private final Color PRETO = new Color(0, 0, 0);

    // Variáveis de Estado
    public double x, y;
    public double velX, velY;
    public boolean emMovimento;
    // Variável para controlar a elasticidade da bola no chão (diferente por dificuldade)
    private double coefRestituicaoChao; 

    public Bola(int xInicial, int yInicial, double coefRestituicaoChao) { 
        this.x = xInicial;
        this.y = yInicial;
        this.velX = 0;
        this.velY = 0;
        this.emMovimento = false;
        this.coefRestituicaoChao = coefRestituicaoChao; // Define a elasticidade
    }

    public void lancar(double vx, double vy) {
        this.velX = vx;
        this.velY = vy;
        this.emMovimento = true;
    }

    public void atualizarPosicao(int alturaChao) {
        if (!emMovimento) return;

        // 1. Aplicar Gravidade
        velY += GRAVIDADE;
        
        // 2. Atualizar Posição
        x += velX;
        y += velY;

        // 3. Colisão com o Chão (Barreira Inferior)
        if (y + RAIO_BOLA >= alturaChao) { 
            y = alturaChao - RAIO_BOLA; 
            // Usa o coeficiente de restituição definido pela dificuldade
            velY *= -this.coefRestituicaoChao; 
            
            // 4. Parar se estiver muito lenta
            if (Math.abs(velY) < 1 && Math.abs(velX) < 1) {
                emMovimento = false;
                velX = 0;
                velY = 0;
            }
        }
    }
    
    // Método para tratar colisões laterais (Barreiras Invisíveis)
    public void verificarColisaoMapa(int larguraTela, int alturaTela, double coefRestituicaoMapa) {
        // Colisão Esquerda (X = 0)
        if (x - RAIO_BOLA <= 0) {
            x = RAIO_BOLA;
            velX *= -coefRestituicaoMapa;
        }

        // Colisão Superior (Y = 0)
        if (y - RAIO_BOLA <= 0) {
            y = RAIO_BOLA;
            velY *= -coefRestituicaoMapa;
        }
        
        // Colisão Direita (X = LARGURA)
        if (x + RAIO_BOLA >= larguraTela) {
            x = larguraTela - RAIO_BOLA;
            velX *= -coefRestituicaoMapa;
        }
    }

    public void desenhar(Graphics2D g, int ALTURA) {
        // 1. Sombra projetada no chão
        if (y < ALTURA - RAIO_BOLA - 20) {
            double distChao = ALTURA - y - RAIO_BOLA - 10;
            double raioSombra = RAIO_BOLA * (1 - distChao / (double)ALTURA * 0.5);
            double deslocamentoSombra = Math.min(20, distChao / 4);
            
            g.setColor(SOMBRA_BOLA); 
            g.fill(new Ellipse2D.Double(
                x - raioSombra + deslocamentoSombra, 
                ALTURA - 10 - raioSombra/4, 
                raioSombra * 2, raioSombra / 2
            ));
        }

        // 2. Corpo da Bola com Gradiente Radial (Dá volume 3D)
        
        // Ponto de luz
        Point2D centroGradiente = new Point2D.Double(x - RAIO_BOLA / 3, y - RAIO_BOLA / 3);
        float[] fracoes = {0.0f, 1.0f};
        Color[] cores = {LARANJA_CLARO, LARANJA_ESCURO};
        
        RadialGradientPaint rgp = new RadialGradientPaint(
            centroGradiente, 
            RAIO_BOLA * 1.5f, 
            fracoes, 
            cores
        );
        
        g.setPaint(rgp);
        g.fill(new Ellipse2D.Double(x - RAIO_BOLA, y - RAIO_BOLA, RAIO_BOLA * 2, RAIO_BOLA * 2));

        // 3. Brilho/Destaque (Reflexo de luz)
        g.setColor(BRILHO);
        g.fillOval((int) (x - RAIO_BOLA * 0.5), (int) (y - RAIO_BOLA * 0.7), (int) (RAIO_BOLA * 0.4), (int) (RAIO_BOLA * 0.4));
        
        // 4. Linhas de costura (Opcional, para detalhe)
        g.setColor(PRETO);
        g.setStroke(new BasicStroke(1.0f));
        g.draw(new Ellipse2D.Double(x - RAIO_BOLA, y - RAIO_BOLA, RAIO_BOLA * 2, RAIO_BOLA * 2));
    }
}