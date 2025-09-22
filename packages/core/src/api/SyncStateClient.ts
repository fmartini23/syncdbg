import { PersistenceAdapter } from '../persistence/PersistenceAdapter';
import { NetworkDetector } from '../network/NetworkDetector';
import { SyncEngine } from '../sync/SyncEngine';
import { Collection } from '../collection/Collection';
import { StateManager } from '../state/StateManager';

/**
 * @interface SyncDBGClientConfig
 * Objeto de configuração para o cliente SyncDBG.
 */
export interface SyncDBGClientConfig {
  /**
   * O adaptador de persistência para armazenamento local (ex: IndexedDBAdapter).
   */
  persistenceAdapter: PersistenceAdapter;

  /**
   * O adaptador da API de backend, responsável por enviar e receber alterações.
   */
  apiAdapter: {
    /**
     * Função para enviar um lote de alterações (operações) para o servidor.
     * @param operations - Um array de operações a serem processadas pelo backend.
     * @returns Uma promessa que resolve quando o backend processa as alterações.
     */
    push(operations: any[]): Promise<void>;

    /**
     * Função para buscar alterações do servidor desde a última sincronização.
     * @param lastPulledAt - Timestamp da última sincronização bem-sucedida.
     * @returns Uma promessa que resolve com as novas alterações do servidor.
     */
    pull(lastPulledAt: number | null): Promise<{ changes: any[], timestamp: number }>;
  };
}

/**
 * @class SyncDBGClient
 * O cliente principal para interagir com o sistema SyncDBG.
 * Orquestra o estado, a persistência e a sincronização de dados.
 */
export class SyncDBGClient {
  private persistence: PersistenceAdapter;
  private network: NetworkDetector;
  private syncEngine: SyncEngine;
  private collections: Map<string, Collection<any>> = new Map();
  private stateManager: StateManager;

  /**
   * @constructor
   * @param {SyncDBGClientConfig} config - A configuração para inicializar o cliente.
   */
  constructor(config: SyncDBGClientConfig) {
    if (!config.persistenceAdapter || !config.apiAdapter) {
      throw new Error('Os adaptadores de persistência (persistenceAdapter) e de API (apiAdapter) são obrigatórios.');
    }

    this.persistence = config.persistenceAdapter;
    this.stateManager = new StateManager();
    this.network = new NetworkDetector();

    // O SyncEngine recebe todas as dependências necessárias para orquestrar a sincronização.
    this.syncEngine = new SyncEngine({
      persistence: this.persistence,
      api: config.apiAdapter,
      networkDetector: this.network,
      stateManager: this.stateManager,
    });

    // Inicia o motor de sincronização. Ele começará a observar o estado da rede
    // e a processar a fila de operações quando estiver online.
    this.syncEngine.start();

    console.log('SyncDBGClient inicializado.');
  }

  /**
   * Obtém uma referência a uma coleção de dados específica.
   * Se a coleção ainda não foi acessada, ela é criada.
   *
   * @template T - O tipo dos documentos na coleção. Deve ter uma propriedade 'id'.
   * @param {string} name - O nome da coleção (ex: 'notes', 'tasks').
   * @returns {Collection<T>} Uma instância da Coleção para interagir com os dados.
   */
  public collection<T extends { id: string | number }>(name: string): Collection<T> {
    if (this.collections.has(name)) {
      return this.collections.get(name) as Collection<T>;
    }

    console.log(`Criando e registrando a coleção '${name}'.`);

    // Cria uma nova instância de Collection, passando as dependências necessárias.
    const newCollection = new Collection<T>({
      name,
      persistence: this.persistence,
      stateManager: this.stateManager,
      syncQueue: this.syncEngine.getQueue(), // A coleção precisa de acesso à fila para registrar operações.
    });

    this.collections.set(name, newCollection);
    this.stateManager.registerCollection(name, newCollection);

    return newCollection;
  }

  /**
   * Fornece acesso ao detector de rede para que a aplicação possa reagir
   * a mudanças no estado de online/offline.
   *
   * @returns {NetworkDetector} A instância do detector de rede.
   */
  public getNetworkDetector(): NetworkDetector {
    return this.network;
  }

  /**
   * Fornece acesso ao motor de sincronização, permitindo acionar
   * sincronizações manuais ou observar seu estado.
   *
   * @returns {SyncEngine} A instância do motor de sincronização.
   */
  public getSyncEngine(): SyncEngine {
    return this.syncEngine;
  }

  /**
   * Desconecta todos os listeners e para os processos em segundo plano.
   * Útil para limpeza em aplicações de página única (SPAs) ao desmontar componentes.
   */
  public destroy(): void {
    this.syncEngine.stop();
    this.network.destroy();
    this.collections.clear();
    this.stateManager.clearAll();
    console.log('SyncDBGClient destruído e todos os processos parados.');
  }
}
