// Cesto.java

import java.awt.*;
import java.awt.geom.Rectangle2D;

/**
 * Representa o objeto Cesto, gerenciando sua geometria, desenho e colisões.
 */
public class Cesto {
    
    // Constantes do Cesto
    private static final Color VERMELHO_ARO = new Color(220, 50, 50);
    private static final Color CINZA_TABELA = new Color(200, 200, 200);
    private static final Color MADEIRA_ESCURA = new Color(139, 69, 19);
    private static final Color PRETO = new Color(0, 0, 0);
    private static final Color BRANCO = new Color(255, 255, 255);
    
    // Geometria (Aro Aumentado para 70)
    public static final int LARGURA_ARO = 70; 
    public static final int ALTURA_ARO = 5;
    public static final int X_CESTO_POSTE = PainelJogo.LARGURA - 150;
    public static final int Y_CESTO_TOPO = PainelJogo.ALTURA - 300;
    public static final int Y_ARO = Y_CESTO_TOPO + 80;
    public static final int X_ARO_FIM = X_CESTO_POSTE - 1;
    public static final int X_ARO_INICIO = X_ARO_FIM - LARGURA_ARO;

    // Retângulos de Colisão (Objetos de Colisão)
    private final Rectangle2D TABELA_RECT = new Rectangle2D.Double(X_CESTO_POSTE, Y_CESTO_TOPO, 10, 100);
    private final Rectangle2D TOPO_ARO_RECT = new Rectangle2D.Double(X_ARO_INICIO, Y_ARO, LARGURA_ARO, ALTURA_ARO);
    
    // Variável para pontuação
    public boolean passouPeloAroTopo = false;

    // Colisão Aro Topo simplificada
    private static final double COEF_RESTITUICAO = 0.7;

    public Cesto() {}

    /**
     * Tenta resolver a colisão da bola com os elementos do cesto (tabela e aro).
     * @param bola O objeto Bola.
     */
    public void verificarColisao(Bola bola) {
        if (!bola.emMovimento) return;

        // Colisão com a Tabela (Lateral)
        if (bola.x + Bola.RAIO_BOLA > TABELA_RECT.getX() && bola.x < TABELA_RECT.getMaxX() 
            && bola.y > TABELA_RECT.getY() && bola.y < TABELA_RECT.getMaxY()) {
            
            if (bola.velX > 0) { 
                bola.x = TABELA_RECT.getX() - Bola.RAIO_BOLA; 
                bola.velX *= -COEF_RESTITUICAO;
            }
        }
        
        // Colisão com o Topo do Aro
        if (bola.x + Bola.RAIO_BOLA > TOPO_ARO_RECT.getX() && bola.x - Bola.RAIO_BOLA < TOPO_ARO_RECT.getMaxX()
            && bola.y + Bola.RAIO_BOLA > TOPO_ARO_RECT.getY() && bola.y + Bola.RAIO_BOLA < TOPO_ARO_RECT.getMaxY()) {
            
            if (bola.velY > 0) { // Colisão por cima
                bola.y = TOPO_ARO_RECT.getY() - Bola.RAIO_BOLA;
                bola.velY *= -COEF_RESTITUICAO; 
                bola.velX *= COEF_RESTITUICAO; 
            }
        }
    }

    /**
     * Verifica a condição de pontuação (passagem pelo aro).
     * @param bola O objeto Bola.
     * @return true se a pontuação foi realizada.
     */
    public boolean verificarPontuacao(Bola bola) {
        if (!bola.emMovimento) return false;
        
        boolean estaSobreAroX = (bola.x > X_ARO_INICIO) && (bola.x < X_ARO_FIM);
        double POS_LINHA_CESTO = Y_ARO + ALTURA_ARO / 2.0;

        if (estaSobreAroX && bola.y < POS_LINHA_CESTO) {
            passouPeloAroTopo = true;
        }
        
        if (passouPeloAroTopo && estaSobreAroX && bola.y > POS_LINHA_CESTO && bola.velY > 0) {
            passouPeloAroTopo = false;
            return true;
        }
        return false;
    }

    public void desenhar(Graphics2D g, int ALTURA) {
        // Poste
        g.setColor(MADEIRA_ESCURA);
        g.fillRect(X_CESTO_POSTE - 5, Y_CESTO_TOPO + 100, 10, ALTURA - (Y_CESTO_TOPO + 100) - 10);
        
        // Tabela
        g.setColor(CINZA_TABELA);
        g.fill(TABELA_RECT); 
        g.setColor(PRETO);
        g.draw(TABELA_RECT); 
        
        // Aro 
        g.setColor(VERMELHO_ARO);
        g.fill(TOPO_ARO_RECT);
        
        // Sombra do Aro
        g.setColor(PRETO);
        g.setStroke(new BasicStroke(2));
        g.drawLine(X_ARO_INICIO, Y_ARO + 5, X_ARO_FIM, Y_ARO + 5);
        
        // Rede Simples
        g.setColor(BRANCO);
        g.setStroke(new BasicStroke(1));
        for (int i = 0; i < 5; i++) {
            int x1 = X_ARO_INICIO + i * (LARGURA_ARO / 5);
            g.drawLine(x1, Y_ARO + ALTURA_ARO, x1 + LARGURA_ARO / 10, Y_ARO + ALTURA_ARO + 30);
        }
    }
}