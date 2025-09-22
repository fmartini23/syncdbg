/**
 * @file .prettierrc.js
 * @description
 * Configuração do Prettier para todo o monorepo syncdbg.
 *
 * O Prettier é um formatador de código opinativo que garante um estilo consistente
 * em toda a base de código. Usar um arquivo de configuração na raiz garante que
 * todos os pacotes e arquivos sigam as mesmas regras de formatação.
 */
module.exports = {
    // Largura máxima da linha antes que o Prettier tente quebrar a linha.
    // 80 é um padrão clássico, mas 100 ou 120 são comuns em projetos modernos.
    printWidth: 80,
  
    // Tamanho do recuo (indentação) em espaços.
    tabWidth: 2,
  
    // Usar tabulações em vez de espaços para indentação.
    // 'false' é o padrão e a prática mais comum na comunidade JavaScript.
    useTabs: false,
  
    // Imprimir ponto e vírgula no final das declarações.
    // 'true' é mais seguro e consistente com a sintaxe clássica do JavaScript.
    semi: true,
  
    // Usar aspas simples ('') em vez de aspas duplas ("").
    // 'true' é uma preferência de estilo muito comum.
    singleQuote: true,
  
    // Quando colocar aspas em propriedades de objetos.
    // 'as-needed': Adiciona aspas apenas quando necessário (ex: 'prop-com-hifen').
    quoteProps: 'as-needed',
  
    // Usar aspas simples em vez de aspas duplas em JSX.
    jsxSingleQuote: false,
  
    // Imprimir vírgulas finais em arrays e objetos de múltiplas linhas.
    // 'es5': Adiciona vírgulas finais em estruturas válidas no ES5 (objetos, arrays, etc.).
    // 'all': Adiciona vírgulas finais sempre que possível (incluindo em parâmetros de função).
    // 'es5' é uma escolha segura e muito útil para diffs no Git.
    trailingComma: 'es5',
  
    // Imprimir espaços entre colchetes em literais de objeto.
    // Exemplo: { foo: bar } (true) vs. {foo: bar} (false).
    bracketSpacing: true,
  
    // Colocar o '>' de um elemento JSX de múltiplas linhas na última linha em vez de em uma nova linha.
    // Exemplo:
    // <div
    //   prop="valor"
    // > (false)
    // vs.
    // <div
    //   prop="valor"> (true)
    jsxBracketSameLine: false, // Esta opção foi descontinuada e agora se chama `bracketSameLine`
  
    // Colocar o '>' de uma tag HTML de múltiplas linhas na última linha.
    // Esta opção substitui a `jsxBracketSameLine`.
    bracketSameLine: false,
  
    // Incluir parênteses ao redor de um único parâmetro de arrow function.
    // 'always': (x) => x
    // 'avoid': x => x
    arrowParens: 'always',
  
    // Quebra de linha em arquivos Markdown.
    // 'preserve': Mantém as quebras de linha como estão.
    // 'always': Quebra as linhas para respeitar o printWidth.
    // 'never': Junta todas as linhas em uma só.
    proseWrap: 'preserve',
  
    // Fim de linha a ser usado.
    // 'lf': Line Feed (\n), comum em Linux e macOS.
    // 'crlf': Carriage Return + Line Feed (\r\n), comum no Windows.
    // 'auto': Mantém o fim de linha existente.
    // 'lf' é a escolha mais segura para garantir consistência entre sistemas operacionais.
    endOfLine: 'lf',
  };
  