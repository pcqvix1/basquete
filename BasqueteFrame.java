// BasqueteFrame.java (Com Seletor de Dificuldade Atualizado)

import javax.swing.JFrame;
import javax.swing.JButton;
import javax.swing.JPanel;
import javax.swing.JComboBox; 
import javax.swing.JLabel;    
import java.awt.BorderLayout;
import java.awt.FlowLayout;
import java.awt.event.ActionEvent;
import java.awt.event.ActionListener;

/**
 * Classe principal que configura a janela do jogo (JFrame) e adiciona os botões.
 */
public class BasqueteFrame extends JFrame {
    
    public static final int LARGURA = 800;
    public static final int ALTURA = 600;

    private PainelJogo painel; 

    public BasqueteFrame() {
        
        this.setTitle("Basquete Java 2D - O Nosso Novo Jogo!");
        this.setDefaultCloseOperation(JFrame.EXIT_ON_CLOSE); 
        this.setResizable(false); 
        
        // O PainelJogo inicia as variáveis de física no nível MÉDIO
        this.painel = new PainelJogo();
        
        // --- Configuração dos Botões e Dificuldade ---
        JPanel painelControle = new JPanel();
        painelControle.setLayout(new FlowLayout(FlowLayout.CENTER));

        // 1. Seletor de Dificuldade
        // Usamos nomes com acentos para exibição, o PainelJogo trata a conversão.
        String[] niveis = {"Fácil", "Médio", "Difícil"};
        JComboBox<String> comboDificuldade = new JComboBox<>(niveis);
        
        // Define o nível inicial como "Médio"
        comboDificuldade.setSelectedItem("Médio"); 
        
        // Listener para mudar a dificuldade no PainelJogo
        comboDificuldade.addActionListener(new ActionListener() {
            @Override
            public void actionPerformed(ActionEvent e) {
                String nivelSelecionado = (String) comboDificuldade.getSelectedItem();
                // Passa a string (ex: "Médio") para o PainelJogo, que irá tratar a conversão segura.
                BasqueteFrame.this.painel.setDificuldade(nivelSelecionado);
                BasqueteFrame.this.painel.requestFocusInWindow();
            }
        });
        
        painelControle.add(new JLabel("Dificuldade: ")); // Rótulo
        painelControle.add(comboDificuldade);           // Seletor

        // 2. Botões de Reset (existentes)
        JButton btnResetPosicao = new JButton("Reset Posição (R)");
        btnResetPosicao.addActionListener(e -> {
            this.painel.reiniciarBola(); 
            this.painel.requestFocusInWindow(); 
        });

        JButton btnReiniciarTudo = new JButton("Reiniciar Jogo");
        btnReiniciarTudo.addActionListener(e -> {
            this.painel.reiniciarTudo(); 
            this.painel.requestFocusInWindow();
        });

        painelControle.add(btnResetPosicao);
        painelControle.add(btnReiniciarTudo);

        // --- Adicionar Componentes ---
        this.setLayout(new BorderLayout());
        this.add(painelControle, BorderLayout.NORTH); 
        this.add(this.painel, BorderLayout.CENTER);  
        
        this.pack(); 
        this.setLocationRelativeTo(null); 
        this.setVisible(true); 

        this.painel.requestFocusInWindow();
    }

    public static void main(String[] args) {
        javax.swing.SwingUtilities.invokeLater(() -> {
            new BasqueteFrame();
        });
    }
}