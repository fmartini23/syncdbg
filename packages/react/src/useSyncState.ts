import { useContext } from 'react';
import type { SyncDBGClient } from '@syncdbg/core';
import { SyncDBGContext } from './SyncDBGProvider'; // O Contexto virá do arquivo do Provider

/**
 * @hook useSyncState
 * Hook para acessar a instância principal do cliente SyncDBG a partir do contexto React.
 *
 * Este hook é o ponto de partida para interagir com a biblioteca dentro de um
 * componente React. Ele deve ser usado por qualquer componente ou outro hook que
 * precise, por exemplo, obter acesso a uma coleção de dados.
 *
 * Lança um erro em tempo de desenvolvimento se for usado fora de um <SyncDBGProvider>,
 * o que ajuda a identificar rapidamente problemas de configuração.
 *
 * @returns {SyncDBGClient} A instância do cliente SyncDBG.
 *
 * @example
 * function MyComponent() {
 *   const syncState = useSyncState();
 *   // agora você pode usar o cliente:
 *   // const tasksCollection = syncState.collection('tasks');
 *   return <div>Estado de sincronização pronto!</div>;
 * }
 */
export function useSyncState(): SyncDBGClient {
  // 1. Consome o valor do contexto React.
  const client = useContext(SyncDBGContext);

  // 2. Validação crucial: verifica se o cliente existe.
  // Se 'client' for nulo, significa que o hook está sendo usado fora da árvore
  // de componentes do <SyncDBGProvider>.
  if (!client) {
    throw new Error(
      'O hook useSyncState deve ser usado dentro de um <SyncDBGProvider>.' +
      ' Por favor, envolva a raiz da sua aplicação ou a árvore de componentes relevante com o SyncDBGProvider.'
    );
  }

  // 3. Retorna a instância do cliente para uso no componente.
  return client;
}
