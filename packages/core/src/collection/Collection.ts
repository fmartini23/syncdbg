import { v4 as uuidv4 } from 'uuid'; // Usaremos UUIDs para garantir IDs únicos universalmente.
import type { PersistenceAdapter } from '../persistence/PersistenceAdapter';
import type { StateManager } from '../state/StateManager';
import type { SyncQueue } from '../sync/SyncQueue';

/**
 * @type OperationType
 * Define os tipos de operações que podem ser enfileiradas para sincronização.
 */
export type OperationType = 'create' | 'update' | 'delete';

/**
 * @interface Operation
 * Representa uma única operação de mutação de dados que ocorreu offline.
 */
export interface Operation<T = any> {
  id: string; // ID único da operação
  type: OperationType;
  collection: string; // Nome da coleção
  docId: string | number; // ID do documento afetado
  payload: Partial<T> | null; // Dados para 'create' e 'update', null para 'delete'
  timestamp: number;
}

/**
 * @interface CollectionConfig
 * Configuração para inicializar uma instância de Collection.
 */
export interface CollectionConfig {
  name: string;
  persistence: PersistenceAdapter;
  stateManager: StateManager;
  syncQueue: SyncQueue;
}

/**
 * @class Collection
 * Gerencia um conjunto de documentos (ex: 'notes', 'tasks'), abstraindo
 * a persistência local e a lógica de sincronização.
 *
 * @template T - O tipo do documento, que deve ter uma propriedade 'id'.
 */
export class Collection<T extends { id: string | number }> {
  public readonly name: string;
  private persistence: PersistenceAdapter;
  private stateManager: StateManager;
  private syncQueue: SyncQueue;

  constructor(config: CollectionConfig) {
    this.name = config.name;
    this.persistence = config.persistence;
    this.stateManager = config.stateManager;
    this.syncQueue = config.syncQueue;

    this.loadInitialData();
  }

  /**
   * Carrega os dados iniciais do armazenamento persistente para o estado em memória.
   * @private
   */
  private async loadInitialData(): Promise<void> {
    try {
      const data = await this.persistence.getAll<T>(this.name);
      this.stateManager.setCollectionState(this.name, data);
    } catch (error) {
      console.error(`[${this.name}] Falha ao carregar dados iniciais:`, error);
      // Mesmo com erro, inicializa com um array vazio para não quebrar a aplicação.
      this.stateManager.setCollectionState(this.name, []);
    }
  }

  /**
   * Adiciona um novo documento à coleção.
   * A operação é persistida localmente e adicionada à fila de sincronização.
   *
   * @param {Omit<T, 'id'>} doc - O documento a ser criado, sem o 'id'.
   * @returns {Promise<T>} O documento completo, incluindo o novo 'id'.
   */
  public async add(doc: Omit<T, 'id'>): Promise<T> {
    // Gera um ID único universal (UUID) para o novo documento.
    // Isso evita conflitos de ID ao sincronizar com o backend.
    const newDoc = { ...doc, id: uuidv4() } as T;

    // 1. UI Otimista: Atualiza o estado em memória imediatamente.
    this.stateManager.addDoc(this.name, newDoc);

    // 2. Persistência Local: Salva o novo documento no IndexedDB.
    await this.persistence.set<T>(this.name, newDoc);

    // 3. Enfileiramento: Adiciona a operação à fila de sincronização.
    await this.syncQueue.enqueue({
      id: uuidv4(), // ID da operação
      type: 'create',
      collection: this.name,
      docId: newDoc.id,
      payload: newDoc,
      timestamp: Date.now(),
    });

    return newDoc;
  }

  /**
   * Atualiza um documento existente na coleção.
   *
   * @param {string | number} docId - O ID do documento a ser atualizado.
   * @param {Partial<T>} updates - Um objeto com os campos a serem atualizados.
   * @returns {Promise<void>}
   */
  public async update(docId: string | number, updates: Partial<T>): Promise<void> {
    // 1. UI Otimista: Atualiza o estado em memória.
    this.stateManager.updateDoc(this.name, docId, updates);

    // Obtém o documento completo atualizado para persistir.
    const updatedDoc = this.stateManager.getDoc<T>(this.name, docId);
    if (!updatedDoc) {
      // Isso não deveria acontecer se a lógica estiver correta.
      throw new Error(`Documento com id '${docId}' não encontrado para atualização.`);
    }

    // 2. Persistência Local: Salva o documento inteiro atualizado.
    await this.persistence.set<T>(this.name, updatedDoc);

    // 3. Enfileiramento: Adiciona a operação à fila.
    await this.syncQueue.enqueue({
      id: uuidv4(),
      type: 'update',
      collection: this.name,
      docId: docId,
      payload: updates, // Envia apenas o delta (as atualizações) para o backend.
      timestamp: Date.now(),
    });
  }

  /**
   * Remove um documento da coleção.
   *
   * @param {string | number} docId - O ID do documento a ser removido.
   * @returns {Promise<void>}
   */
  public async delete(docId: string | number): Promise<void> {
    // 1. UI Otimista: Remove do estado em memória.
    this.stateManager.deleteDoc(this.name, docId);

    // 2. Persistência Local: Remove do IndexedDB.
    await this.persistence.delete(this.name, docId);

    // 3. Enfileiramento: Adiciona a operação à fila.
    await this.syncQueue.enqueue({
      id: uuidv4(),
      type: 'delete',
      collection: this.name,
      docId: docId,
      payload: null, // Nenhum payload é necessário para a exclusão.
      timestamp: Date.now(),
    });
  }

  /**
   * Obtém um único documento pelo seu ID.
   * Lê diretamente do estado em memória para uma resposta rápida.
   *
   * @param {string | number} docId - O ID do documento.
   * @returns {T | undefined} O documento, se encontrado.
   */
  public get(docId: string | number): T | undefined {
    return this.stateManager.getDoc<T>(this.name, docId);
  }

  /**
   * Obtém todos os documentos da coleção.
   * Lê diretamente do estado em memória.
   *
   * @returns {T[]} Um array com todos os documentos.
   */
  public getAll(): T[] {
    return this.stateManager.getCollectionState<T>(this.name);
  }

  /**
   * Inscreve-se para receber atualizações sempre que os dados da coleção mudarem.
   *
   * @param {(data: T[]) => void} callback - A função a ser chamada com os novos dados.
   * @returns {() => void} Uma função para cancelar a inscrição (unsubscribe).
   */
  public subscribe(callback: (data: T[]) => void): () => void {
    return this.stateManager.subscribeToCollection(this.name, callback);
  }
}
