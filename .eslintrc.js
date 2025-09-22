module.exports = {
    // Define o ambiente de execução do código.
    // 'browser': para variáveis globais do navegador como 'window' e 'document'.
    // 'node': para variáveis globais do Node.js como 'process' e 'require'.
    // 'es2022': para suportar as funcionalidades mais recentes do ECMAScript.
    env: {
      browser: true,
      node: true,
      es2022: true,
    },
  
    // Define o parser que o ESLint usará.
    // '@typescript-eslint/parser' permite que o ESLint entenda a sintaxe do TypeScript.
    parser: '@typescript-eslint/parser',
  
    // Opções do parser.
    parserOptions: {
      ecmaVersion: 'latest', // Usa a versão mais recente do ECMAScript.
      sourceType: 'module', // Permite o uso de 'import' e 'export'.
      ecmaFeatures: {
        jsx: true, // Habilita o parsing de JSX.
      },
    },
  
    // Plugins que adicionam novas regras ou funcionalidades ao ESLint.
    plugins: [
      '@typescript-eslint', // Plugin para regras específicas de TypeScript.
      'react', // Plugin para regras específicas de React.
      'react-hooks', // Plugin para as regras de Hooks do React.
      'prettier', // Plugin para integrar o Prettier.
    ],
  
    // 'extends' aplica conjuntos de regras pré-configurados. A ordem é importante.
    extends: [
      'eslint:recommended', // Regras básicas recomendadas pelo ESLint.
      'plugin:@typescript-eslint/recommended', // Regras recomendadas para TypeScript.
      'plugin:react/recommended', // Regras recomendadas para React.
      'plugin:react-hooks/recommended', // Regras recomendadas para Hooks do React.
      'plugin:prettier/recommended', // Desativa regras do ESLint que conflitam com o Prettier e integra o Prettier como uma regra do ESLint.
    ],
  
    // Configurações específicas, especialmente para o plugin do React.
    settings: {
      react: {
        version: 'detect', // Detecta automaticamente a versão do React instalada no projeto.
      },
    },
  
    // 'rules' permite sobrescrever ou adicionar regras específicas.
    rules: {
      // --- Regras do Prettier ---
      // Esta regra exibe os erros do Prettier como erros do ESLint.
      // A configuração 'plugin:prettier/recommended' já faz isso, mas é bom ser explícito.
      'prettier/prettier': 'error',
  
      // --- Regras do TypeScript ---
      // Permite o uso de 'any' (desativando a regra que o proíbe).
      // Em alguns casos, especialmente em bibliotecas genéricas, 'any' pode ser necessário.
      '@typescript-eslint/no-explicit-any': 'off',
      // Permite o uso do operador '!' para asserções de não-nulo.
      // Útil em situações onde sabemos que um valor não será nulo, mas o TypeScript não consegue inferir.
      '@typescript-eslint/no-non-null-assertion': 'off',
      // Permite o uso de 'require' (útil em arquivos de configuração .js).
      '@typescript-eslint/no-var-requires': 'off',
  
      // --- Regras do React ---
      // Desativa a necessidade de ter 'React' no escopo ao usar JSX.
      // Não é mais necessário com o novo JSX Transform (React 17+).
      'react/react-in-jsx-scope': 'off',
      // Permite o uso de '...props' em componentes.
      'react/jsx-props-no-spreading': 'off',
      // Permite que os tipos de props não sejam validados com PropTypes, já que estamos usando TypeScript.
      'react/prop-types': 'off',
  
      // --- Regras Gerais do ESLint ---
      // Permite o uso de 'console.log', mas emite um aviso.
      // Em produção, o ideal seria mudar para 'error'.
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      // Garante que as chaves sejam usadas em blocos de múltiplas linhas.
      curly: 'error',
    },
  
    // 'overrides' permite aplicar configurações diferentes para arquivos específicos.
    overrides: [
      {
        // Aplica estas regras apenas a arquivos de configuração JavaScript.
        files: ['*.js'],
        rules: {
          // Em arquivos .js, não há problema em não ter tipos definidos.
          '@typescript-eslint/explicit-module-boundary-types': 'off',
        },
      },
    ],
  };
  