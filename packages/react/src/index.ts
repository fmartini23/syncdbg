import {
    useState,
    useEffect,
    useContext,
    createContext,
    useCallback,
  } from 'react';
  import type { ReactNode } from 'react';
  import { SyncDBGClient, Collection } from '@syncdbg/core';
  
  // --- 1. Contexto para o Cliente SyncDBG ---
  
  /**
   * Cria um Contexto React para manter a instância do SyncDBGClient.
   * Isso permite que qualquer componente filho acesse o cliente sem a necessidade
   * de passá-lo manualmente por props (prop drilling).
   */
  const SyncDBGContext = createContext<SyncDBGClient | null>(null);
  
  /**
   * @interface SyncDBGProviderProps
   * Props para o componente SyncDBGProvider.
   */
  export interface SyncDBGProviderProps {
    /**
     * A instância do SyncDBGClient a ser fornecida para a árvore de componentes.
     */
    client: SyncDBGClient;
    /**
     * Os componentes filhos que terão acesso ao cliente.
     */
    children: ReactNode;
  }
  
  /**
   * @component SyncDBGProvider
   * Um componente provedor que disponibiliza a instância do SyncDBGClient
   * para todos os componentes descendentes através do contexto.
   *
   * @example
   * <SyncDBGProvider client={myClient}>
   *   <App />
   * </SyncDBGProvider>
   */
  export function SyncDBGProvider({ client, children }: SyncDBGProviderProps) {
    // Garante que o cliente seja destruído ao desmontar o provedor para evitar vazamentos de memória.
    useEffect(() => {
      return () => {
        client.destroy();
      };
    }, [client]);
  
    return (
      <SyncDBGContext.Provider value={client}>{children}</SyncDBGContext.Provider>
    );
  }
  
  /**
   * @hook useSyncDBGClient
   * Hook para acessar a instância do SyncDBGClient a partir do contexto.
   * Lança um erro se for usado fora de um SyncDBGProvider.
   *
   * @returns {SyncDBGClient} A instância do cliente.
   */
  export function useSyncDBGClient(): SyncDBGClient {
    const client = useContext(SyncDBGContext);
    if (!client) {
      throw new Error('useSyncDBGClient deve ser usado dentro de um SyncDBGProvider.');
    }
    return client;
  }
  
  // --- 2. Hook para Coleções ---
  
  /**
   * @hook useCollection
   * Hook reativo para obter os dados de uma coleção e se inscrever em suas atualizações.
   *
   * @template T - O tipo dos documentos na coleção.
   * @param {string} collectionName - O nome da coleção a ser acessada.
   * @returns {{ data: T[], collection: Collection<T> }} Um objeto contendo os dados reativos
   * e uma referência à instância da coleção para executar operações (add, update, delete).
   *
   * @example
   * const { data: notes, collection: notesCollection } = useCollection<Note>('notes');
   *
   * return (
   *   <button onClick={() => notesCollection.add({ title: 'Nova Nota' })}>
   *     Adicionar Nota
   *   </button>
   * );
   */
  export function useCollection<T extends { id: string | number }>(
    collectionName: string
  ): { data: T[]; collection: Collection<T> } {
    const client = useSyncDBGClient();
    const collection = useCallback(
      () => client.collection<T>(collectionName),
      [client, collectionName]
    )();
  
    const [data, setData] = useState<T[]>(() => collection.getAll());
  
    useEffect(() => {
      // Inscreve-se nas atualizações da coleção.
      // O StateManager garante que o callback seja chamado imediatamente com os dados atuais.
      const unsubscribe = collection.subscribe(setData);
  
      // Retorna a função de limpeza que cancelará a inscrição quando o componente for desmontado.
      return () => {
        unsubscribe();
      };
    }, [collection]); // O efeito depende da instância da coleção.
  
    return { data, collection };
  }
  
  // --- 3. Hook para o Status da Rede ---
  
  /**
   * @hook useNetworkStatus
   * Hook reativo para obter o estado atual da conexão de rede.
   *
   * @returns {boolean} `true` se a aplicação estiver online, `false` caso contrário.
   *
   * @example
   * const isOnline = useNetworkStatus();
   * return <span>Status: {isOnline ? 'Online' : 'Offline'}</span>;
   */
  export function useNetworkStatus(): boolean {
    const client = useSyncDBGClient();
    const networkDetector = client.getNetworkDetector();
  
    const [isOnline, setIsOnline] = useState(() => networkDetector.isConnected());
  
    useEffect(() => {
      // Inscreve-se nas mudanças de estado da rede.
      const unsubscribe = networkDetector.subscribe(setIsOnline);
  
      // Retorna a função de limpeza para cancelar a inscrição.
      return () => {
        unsubscribe();
      };
    }, [networkDetector]);
  
    return isOnline;
  }
  