// FisicaUtil.java

import java.awt.geom.Point2D;

/**
 * Classe utilitária estática para cálculos de física e cinemática.
 */
public class FisicaUtil {

    public static final double GRAVIDADE = 0.5;

    /**
     * Calcula as velocidades iniciais Vx e Vy necessárias para a bola atingir um alvo
     * em um tempo específico, dada a gravidade.
     * @param x_bola Posição X inicial da bola.
     * @param y_bola Posição Y inicial da bola.
     * @param x_alvo Posição X do alvo.
     * @param y_alvo Posição Y do alvo.
     * @param tempo_passagem Tempo (frames) para atingir o alvo.
     * @return Um Point2D.Double contendo (Vx, Vy).
     */
    public static Point2D.Double calcularVelocidadeParaAlvo(double x_bola, double y_bola, double x_alvo, double y_alvo, int tempo_passagem) {
        double dx = x_alvo - x_bola;
        double dy = y_alvo - y_bola;
        double t = tempo_passagem; 
        
        double vx = dx / t;
        double vy = (dy / t) - (0.5 * GRAVIDADE * t);
        
        return new Point2D.Double(vx, vy);
    }
}