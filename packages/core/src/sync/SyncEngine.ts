import type { PersistenceAdapter } from '../persistence/PersistenceAdapter';
import type { NetworkDetector } from '../network/NetworkDetector';
import type { StateManager } from '../state/StateManager';
import type { SyncQueue } from './SyncQueue';
import type { Operation } from '../collection/Collection';
import { ConflictResolutionStrategy, ConflictStrategies } from './ConflictResolver';

/**
 * @interface SyncEngineConfig
 * Configuração para inicializar o SyncEngine.
 */
export interface SyncEngineConfig {
  persistence: PersistenceAdapter;
  networkDetector: NetworkDetector;
  stateManager: StateManager;
  syncQueue: SyncQueue;
  apiAdapter: {
    push(operations: Operation[]): Promise<{ successful: string[], failed: Array<{ operationId: string, error: any }> }>;
    pull(lastPulledAt: number | null): Promise<{ changes: Operation[], timestamp: number }>;
  };
  // Permite configurar uma estratégia de conflito global.
  conflictStrategy?: ConflictResolutionStrategy<any>;
}

/**
 * @class SyncEngine
 * Orquestra o processo de sincronização de dados entre o cliente e o servidor.
 * Ele é ativado pelo estado da rede e processa uma fila de operações.
 */
export class SyncEngine {
  private persistence: PersistenceAdapter;
  private network: NetworkDetector;
  private stateManager: StateManager;
  private syncQueue: SyncQueue;
  private api: SyncEngineConfig['apiAdapter'];
  private conflictStrategy: ConflictResolutionStrategy<any>;
  private unsubscribeNetwork: () => void;
  private isSyncing: boolean = false;
  private lastPulledAt: number | null = null;

  constructor(config: SyncEngineConfig) {
    this.persistence = config.persistence;
    this.network = config.networkDetector;
    this.stateManager = config.stateManager;
    this.syncQueue = config.syncQueue;
    this.api = config.apiAdapter;
    
    // Usa a estratégia de conflito fornecida ou 'serverWins' como padrão seguro.
    this.conflictStrategy = config.conflictStrategy || ConflictStrategies.serverWins();

    this.unsubscribeNetwork = () => {};
  }

  /**
   * Inicia o motor de sincronização, inscrevendo-se nas mudanças de estado da rede.
   */
  public start(): void {
    this.unsubscribeNetwork = this.network.subscribe(isOnline => {
      if (isOnline) {
        console.log('[SyncEngine] Online. Tentando sincronizar...');
        this.triggerSync();
      } else {
        console.log('[SyncEngine] Offline. Sincronização pausada.');
      }
    });
    // Carrega o timestamp da última sincronização bem-sucedida.
    this.loadLastPulledAt();
  }

  /**
   * Para o motor de sincronização e cancela a inscrição dos eventos de rede.
   */
  public stop(): void {
    this.unsubscribeNetwork();
    console.log('[SyncEngine] Parado.');
  }

  /**
   * Dispara o processo de sincronização completo (push e pull).
   * Evita múltiplas sincronizações simultâneas.
   */
  public async triggerSync(): Promise<void> {
    if (this.isSyncing || !this.network.isConnected()) {
      if (this.isSyncing) console.log('[SyncEngine] Sincronização já em andamento.');
      return;
    }

    this.isSyncing = true;
    console.log('[SyncEngine] Início do ciclo de sincronização.');

    try {
      // 1. Envia as alterações locais para o servidor.
      await this.pushChanges();
      // 2. Busca as alterações do servidor.
      await this.pullChanges();
    } catch (error) {
      console.error('[SyncEngine] Erro durante o ciclo de sincronização:', error);
    } finally {
      this.isSyncing = false;
      console.log('[SyncEngine] Fim do ciclo de sincronização.');
    }
  }

  /**
   * Pega as operações da fila e as envia para o servidor.
   * @private
   */
  private async pushChanges(): Promise<void> {
    const operations = await this.syncQueue.getAll();
    if (operations.length === 0) {
      console.log('[SyncEngine] Nenhuma alteração local para enviar.');
      return;
    }

    console.log(`[SyncEngine] Enviando ${operations.length} alterações...`);

    try {
      const { successful, failed } = await this.api.push(operations);

      // Remove as operações bem-sucedidas da fila.
      for (const opId of successful) {
        await this.syncQueue.dequeue(opId);
      }
      console.log(`[SyncEngine] ${successful.length} alterações enviadas com sucesso.`);

      // Lida com as operações que falharam (potenciais conflitos).
      if (failed.length > 0) {
        console.warn(`[SyncEngine] ${failed.length} alterações falharam. Tentando resolver conflitos...`);
        for (const failure of failed) {
          await this.handleFailedOperation(failure.operationId, failure.error);
        }
      }
    } catch (error) {
      console.error('[SyncEngine] Falha crítica ao enviar alterações:', error);
    }
  }

  /**
   * Lida com uma operação que falhou ao ser enviada, possivelmente por um conflito.
   * @param operationId - O ID da operação que falhou.
   * @param error - O erro retornado pela API (pode conter o estado remoto do documento).
   * @private
   */
  private async handleFailedOperation(operationId: string, error: any): Promise<void> {
    const localOperation = await this.syncQueue.get(operationId);
    if (!localOperation) return;

    // Assume que o erro da API contém o estado atual do documento no servidor.
    const remoteState = error?.remoteState;

    if (!remoteState || remoteState.id !== localOperation.docId) {
      console.error(`[SyncEngine] Operação '${operationId}' falhou sem um estado remoto válido para resolução. A operação será mantida na fila.`);
      return;
    }

    // Usa a estratégia de resolução de conflitos.
    const resolution = await this.conflictStrategy({ localOperation, remoteState });

    let finalDoc: any;

    if (resolution === 'remote') {
      // O servidor vence. O estado remoto sobrescreve o local.
      finalDoc = remoteState;
      console.log(`[SyncEngine] Conflito resolvido para doc '${localOperation.docId}': Servidor venceu.`);
    } else if (resolution === 'local') {
      // O cliente vence. A operação local será reenviada.
      // Isso pode causar um loop se a lógica do servidor não for cuidadosa.
      // Uma abordagem melhor seria reenviar com um flag 'force: true'.
      // Por enquanto, vamos apenas logar.
      console.warn(`[SyncEngine] Conflito resolvido para doc '${localOperation.docId}': Cliente venceu. A operação será reenviada no próximo ciclo.`);
      return; // Mantém a operação na fila.
    } else {
      // Uma versão mesclada foi retornada.
      finalDoc = resolution;
      console.log(`[SyncEngine] Conflito resolvido para doc '${localOperation.docId}': Documentos mesclados.`);
    }

    // Aplica a resolução: atualiza o estado local e a persistência.
    this.stateManager.updateDoc(localOperation.collection, finalDoc.id, finalDoc);
    await this.persistence.set(localOperation.collection, finalDoc);

    // A operação original foi resolvida, então pode ser removida da fila.
    await this.syncQueue.dequeue(operationId);
  }

  /**
   * Busca novas alterações do servidor e as aplica localmente.
   * @private
   */
  private async pullChanges(): Promise<void> {
    console.log(`[SyncEngine] Buscando alterações do servidor desde ${this.lastPulledAt ? new Date(this.lastPulledAt).toISOString() : 'o início'}.`);
    try {
      const { changes, timestamp } = await this.api.pull(this.lastPulledAt);

      if (changes.length === 0) {
        console.log('[SyncEngine] Nenhum dado novo do servidor.');
        return;
      }

      console.log(`[SyncEngine] Recebidas ${changes.length} alterações do servidor.`);

      // Aplica as alterações recebidas ao estado local.
      for (const op of changes) {
        switch (op.type) {
          case 'create':
          case 'update':
            this.stateManager.updateDoc(op.collection, op.docId, op.payload);
            await this.persistence.set(op.collection, op.payload);
            break;
          case 'delete':
            this.stateManager.deleteDoc(op.collection, op.docId);
            await this.persistence.delete(op.collection, op.docId);
            break;
        }
      }

      // Atualiza e persiste o timestamp da última sincronização bem-sucedida.
      this.lastPulledAt = timestamp;
      await this.saveLastPulledAt();

    } catch (error) {
      console.error('[SyncEngine] Falha ao buscar alterações do servidor:', error);
    }
  }

  /**
   * Salva o timestamp da última sincronização bem-sucedida na persistência.
   * @private
   */
  private async saveLastPulledAt(): Promise<void> {
    // Usamos um store especial para metadados internos.
    await this.persistence.set('_syncdbg_meta', { id: 'lastPulledAt', value: this.lastPulledAt });
  }

  /**
   * Carrega o timestamp da última sincronização da persistência.
   * @private
   */
  private async loadLastPulledAt(): Promise<void> {
    const meta = await this.persistence.get<{ id: string, value: number }>('_syncdbg_meta', 'lastPulledAt');
    if (meta) {
      this.lastPulledAt = meta.value;
    }
  }
}
