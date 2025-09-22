/**
 * @type CollectionState
 * Representa o estado em memória de uma única coleção, mapeando IDs de documentos para os próprios documentos.
 * Usar um Map é mais eficiente para buscas, atualizações e exclusões por ID do que um array.
 * @template T - O tipo do documento.
 */
type CollectionState<T> = Map<string | number, T>;

/**
 * @type SubscriptionCallback
 * Define a assinatura da função de callback para um inscrito.
 * Ela recebe um array completo dos dados da coleção sempre que há uma mudança.
 * @template T - O tipo do documento.
 */
type SubscriptionCallback<T> = (data: T[]) => void;

/**
 * @class StateManager
 * Gerencia o estado de todas as coleções em memória, atuando como a "fonte da verdade"
 * síncrona para a interface do usuário e orquestrando a reatividade.
 */
export class StateManager {
  /**
   * O estado principal, mapeando nomes de coleção para o estado dessa coleção.
   * @private
   */
  private state: Map<string, CollectionState<any>> = new Map();

  /**
   * Armazena os callbacks de inscrição, mapeando nomes de coleção para um conjunto de callbacks.
   * Usar um Set garante que o mesmo callback não possa ser inscrito múltiplas vezes.
   * @private
   */
  private subscriptions: Map<string, Set<SubscriptionCallback<any>>> = new Map();

  /**
   * Garante que uma coleção exista no estado e no mapa de inscrições.
   * @param {string} collectionName - O nome da coleção.
   * @private
   */
  private ensureCollectionExists(collectionName: string): void {
    if (!this.state.has(collectionName)) {
      this.state.set(collectionName, new Map());
    }
    if (!this.subscriptions.has(collectionName)) {
      this.subscriptions.set(collectionName, new Set());
    }
  }

  /**
   * Notifica todos os inscritos de uma coleção sobre uma mudança em seus dados.
   * @param {string} collectionName - O nome da coleção que mudou.
   * @private
   */
  private notifySubscribers(collectionName: string): void {
    const collectionState = this.state.get(collectionName);
    if (!collectionState) return;

    const subscribers = this.subscriptions.get(collectionName);
    if (!subscribers || subscribers.size === 0) return;

    // Converte o Map de volta para um array para os callbacks.
    const dataAsArray = Array.from(collectionState.values());
    
    subscribers.forEach(callback => {
      try {
        callback(dataAsArray);
      } catch (error) {
        console.error(`[StateManager] Erro ao executar callback de inscrição para a coleção '${collectionName}':`, error);
      }
    });
  }

  /**
   * Define o estado inicial de uma coleção, geralmente após carregar do armazenamento persistente.
   * @template T - O tipo do documento.
   * @param {string} collectionName - O nome da coleção.
   * @param {T[]} data - O array de documentos para popular o estado.
   */
  public setCollectionState<T extends { id: string | number }>(collectionName: string, data: T[]): void {
    this.ensureCollectionExists(collectionName);
    const collectionState = new Map(data.map(doc => [doc.id, doc]));
    this.state.set(collectionName, collectionState);
    this.notifySubscribers(collectionName);
  }

  /**
   * Adiciona um novo documento ao estado de uma coleção.
   * @template T - O tipo do documento.
   * @param {string} collectionName - O nome da coleção.
   * @param {T} doc - O documento a ser adicionado.
   */
  public addDoc<T extends { id: string | number }>(collectionName: string, doc: T): void {
    this.ensureCollectionExists(collectionName);
    this.state.get(collectionName)!.set(doc.id, doc);
    this.notifySubscribers(collectionName);
  }

  /**
   * Atualiza um documento existente no estado de uma coleção.
   * @template T - O tipo do documento.
   * @param {string} collectionName - O nome da coleção.
   * @param {string | number} docId - O ID do documento a ser atualizado.
   * @param {Partial<T>} updates - Os campos a serem mesclados no documento existente.
   */
  public updateDoc<T extends { id: string | number }>(collectionName: string, docId: string | number, updates: Partial<T>): void {
    this.ensureCollectionExists(collectionName);
    const collectionState = this.state.get(collectionName)!;
    const existingDoc = collectionState.get(docId);

    if (existingDoc) {
      // Mescla as atualizações no documento existente.
      const updatedDoc = { ...existingDoc, ...updates };
      collectionState.set(docId, updatedDoc);
      this.notifySubscribers(collectionName);
    }
  }

  /**
   * Remove um documento do estado de uma coleção.
   * @param {string} collectionName - O nome da coleção.
   * @param {string | number} docId - O ID do documento a ser removido.
   */
  public deleteDoc(collectionName: string, docId: string | number): void {
    this.ensureCollectionExists(collectionName);
    const collectionState = this.state.get(collectionName)!;
    if (collectionState.has(docId)) {
      collectionState.delete(docId);
      this.notifySubscribers(collectionName);
    }
  }

  /**
   * Obtém um único documento do estado em memória.
   * @template T - O tipo do documento.
   * @param {string} collectionName - O nome da coleção.
   * @param {string | number} docId - O ID do documento.
   * @returns {T | undefined} O documento, se encontrado.
   */
  public getDoc<T>(collectionName: string, docId: string | number): T | undefined {
    return this.state.get(collectionName)?.get(docId);
  }

  /**
   * Obtém todos os documentos de uma coleção do estado em memória.
   * @template T - O tipo do documento.
   * @param {string} collectionName - O nome da coleção.
   * @returns {T[]} Um array com todos os documentos.
   */
  public getCollectionState<T>(collectionName: string): T[] {
    const collectionState = this.state.get(collectionName);
    return collectionState ? Array.from(collectionState.values()) : [];
  }

  /**
   * Inscreve uma função de callback para mudanças em uma coleção específica.
   * @template T - O tipo do documento.
   * @param {string} collectionName - O nome da coleção.
   * @param {SubscriptionCallback<T>} callback - A função a ser chamada com os dados atualizados.
   * @returns {() => void} Uma função para cancelar a inscrição.
   */
  public subscribeToCollection<T>(collectionName: string, callback: SubscriptionCallback<T>): () => void {
    this.ensureCollectionExists(collectionName);
    const subscribers = this.subscriptions.get(collectionName)!;
    subscribers.add(callback);

    // Notifica o novo inscrito imediatamente com os dados atuais.
    const currentData = this.getCollectionState<T>(collectionName);
    callback(currentData);

    // Retorna a função de cancelamento.
    return () => {
      subscribers.delete(callback);
    };
  }

  /**
   * Limpa todo o estado e todas as inscrições.
   * Usado durante a destruição do cliente para evitar vazamentos de memória.
   */
  public clearAll(): void {
    this.state.clear();
    this.subscriptions.clear();
    console.log('[StateManager] Estado e inscrições limpos.');
  }
}
