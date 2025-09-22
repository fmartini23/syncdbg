import type { PersistenceAdapter } from '../persistence/PersistenceAdapter';
import type { Operation } from '../collection/Collection';

/**
 * @constant SYNC_QUEUE_STORE_NAME
 * O nome do "store" (tabela) usado para persistir a fila de sincronização.
 * Usar uma constante evita erros de digitação.
 */
export const SYNC_QUEUE_STORE_NAME = '_syncdbg_sync_queue';

/**
 * @class SyncQueue
 * Gerencia uma fila persistente de operações de mutação de dados que aguardam
 * para serem sincronizadas com o servidor.
 *
 * Esta classe atua como uma interface para um "store" específico no PersistenceAdapter,
 * simplificando a manipulação da fila.
 */
export class SyncQueue {
  private persistence: PersistenceAdapter;

  /**
   * @constructor
   * @param {PersistenceAdapter} persistenceAdapter - O adaptador de persistência (ex: IndexedDB)
   * onde a fila será armazenada.
   */
  constructor(persistenceAdapter: PersistenceAdapter) {
    this.persistence = persistenceAdapter;
    // No futuro, poderíamos garantir que o store da fila existe aqui,
    // mas a lógica atual no IndexedDBAdapter já cuida disso na inicialização.
  }

  /**
   * Adiciona uma nova operação ao final da fila.
   *
   * @param {Operation} operation - O objeto de operação a ser enfileirado.
   * @returns {Promise<void>} Uma promessa que resolve quando a operação é persistida.
   */
  public async enqueue(operation: Operation): Promise<void> {
    try {
      await this.persistence.set(SYNC_QUEUE_STORE_NAME, operation);
      console.log(`[SyncQueue] Operação '${operation.id}' enfileirada.`);
    } catch (error) {
      console.error(`[SyncQueue] Falha ao enfileirar a operação '${operation.id}':`, error);
      // Lançar o erro novamente permite que a camada superior (ex: a Collection) decida como lidar com ele.
      throw error;
    }
  }

  /**
   * Remove uma operação da fila, geralmente após ter sido sincronizada com sucesso.
   *
   * @param {string} operationId - O ID da operação a ser removida.
   * @returns {Promise<void>} Uma promessa que resolve quando a operação é removida da persistência.
   */
  public async dequeue(operationId: string): Promise<void> {
    try {
      await this.persistence.delete(SYNC_QUEUE_STORE_NAME, operationId);
      console.log(`[SyncQueue] Operação '${operationId}' removida da fila.`);
    } catch (error) {
      console.error(`[SyncQueue] Falha ao remover a operação '${operationId}' da fila:`, error);
      throw error;
    }
  }

  /**
   * Recupera uma única operação da fila pelo seu ID.
   *
   * @param {string} operationId - O ID da operação a ser recuperada.
   * @returns {Promise<Operation | undefined>} A operação, se encontrada.
   */
  public async get(operationId: string): Promise<Operation | undefined> {
    return this.persistence.get<Operation>(SYNC_QUEUE_STORE_NAME, operationId);
  }

  /**
   * Recupera todas as operações atualmente na fila.
   * O SyncEngine usará este método para obter o lote de operações a serem enviadas.
   *
   * @returns {Promise<Operation[]>} Um array com todas as operações na fila.
   */
  public async getAll(): Promise<Operation[]> {
    const operations = await this.persistence.getAll<Operation>(SYNC_QUEUE_STORE_NAME);
    // Ordena por timestamp para garantir que as operações sejam processadas na ordem em que ocorreram.
    return operations.sort((a, b) => a.timestamp - b.timestamp);
  }

  /**
   * Limpa completamente a fila de sincronização.
   * Útil para cenários de reset ou depuração.
   *
   * @returns {Promise<void>}
   */
  public async clear(): Promise<void> {
    try {
      await this.persistence.clear(SYNC_QUEUE_STORE_NAME);
      console.log('[SyncQueue] Fila de sincronização limpa com sucesso.');
    } catch (error) {
      console.error('[SyncQueue] Falha ao limpar a fila de sincronização:', error);
      throw error;
    }
  }
}
