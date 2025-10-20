// MeuProgramaInterativo.java

// 1. IMPORTAÇÃO
// Para usar a classe Scanner (que lê o input), precisamos de a importar.
// O Scanner está na biblioteca padrão 'java.util'.
import java.util.Scanner;

/**
 * Objetivo: Modificar o programa para interagir com o utilizador, lendo
 * uma string (nome) e um número (idade) a partir do console.
 */
public class MeuProgramaInterativo {

    public static void main(String[] args) {
        
        // 2. INICIALIZAÇÃO DO SCANNER
        // Criamos um objeto Scanner chamado 'leitor'.
        // System.in diz ao Scanner para ler a partir da entrada padrão (o console).
        Scanner leitor = new Scanner(System.in);
        
        // --- Leitura de String (Nome) ---
        
        System.out.println("Olá! Bem-vindo ao mundo Java!");
        System.out.print("Por favor, digite o seu nome: ");
        
        // 3. LEITURA DE INPUT
        // leitor.nextLine() lê toda a linha de texto digitada pelo utilizador.
        String nome = leitor.nextLine();
        
        // --- Leitura de Inteiro (Idade) ---
        
        System.out.print("Excelente, " + nome + "! Agora, digite a sua idade: ");
        
        // 4. LEITURA DE INPUT NUMÉRICO
        // leitor.nextInt() lê o próximo valor como um número inteiro (int).
        int idade = leitor.nextInt();
        
        // 5. PROCESSAMENTO E SAÍDA
        // Usamos as variáveis lidas para dar uma resposta personalizada.
        int anoNascimento = 2025 - idade; 
        
        System.out.println("\n--- Resumo ---");
        System.out.println("Obrigado, " + nome + "!");
        System.out.println("Se você tem " + idade + " anos, nasceu aproximadamente em " + anoNascimento + ".");
        
        // 6. FECHAR O SCANNER
        // É uma boa prática fechar o Scanner para libertar recursos do sistema.
        leitor.close();
        
    } // Fim do método main

} // Fim da classe