// Importa a interface que este adaptador deve implementar.
// Isso garante consistência e permite que o 'core' use qualquer adaptador compatível.
// Nota: Este arquivo ainda não existe, mas o criaremos no pacote 'core'.
import type { PersistenceAdapter } from '@sync-state/core';

// --- Tipos específicos para o IndexedDB Adapter ---

/**
 * @interface IDBAdapterConfig
 * Configuração para o IndexedDBAdapter.
 * @property {string} dbName - O nome do banco de dados a ser usado.
 * @property {number} dbVersion - A versão do banco de dados. Incrementar este número aciona o evento 'onupgradeneeded'.
 * @property {string[]} collections - Uma lista com os nomes de todas as coleções (Object Stores) que a aplicação usará.
 */
export interface IDBAdapterConfig {
  dbName: string;
  dbVersion: number;
  collections: string[];
}

/**
 * Implementação do PersistenceAdapter usando IndexedDB.
 * Esta classe abstrai toda a complexidade de interagir com a API do IndexedDB.
 */
export class IndexedDBAdapter implements PersistenceAdapter {
  private db: IDBDatabase | null = null;
  private config: IDBAdapterConfig;
  private initPromise: Promise<void> | null = null;

  /**
   * @constructor
   * @param {IDBAdapterConfig} config - A configuração do adaptador.
   */
  constructor(config: IDBAdapterConfig) {
    this.config = config;
    // A inicialização é preguiçosa (lazy), ocorrendo apenas quando o primeiro método é chamado.
  }

  /**
   * Inicializa a conexão com o banco de dados IndexedDB.
   * Cria os Object Stores necessários se eles não existirem.
   * @private
   * @returns {Promise<void>} Uma promessa que resolve quando o banco de dados está pronto.
   */
  private initialize(): Promise<void> {
    // Padrão Singleton para a promessa de inicialização para evitar múltiplas aberturas simultâneas.
    if (this.initPromise) {
      return this.initPromise;
    }

    this.initPromise = new Promise((resolve, reject) => {
      if (this.db) {
        return resolve();
      }

      const request = indexedDB.open(this.config.dbName, this.config.dbVersion);

      request.onerror = () => {
        console.error(`IndexedDB error: ${request.error?.message}`);
        reject(new Error(`Falha ao abrir o banco de dados: ${request.error?.message}`));
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log(`Banco de dados '${this.config.dbName}' aberto com sucesso.`);
        resolve();
      };

      // Este evento só é disparado quando a versão do banco de dados muda.
      // É o único lugar onde podemos alterar a estrutura do banco (criar/remover Object Stores).
      request.onupgradeneeded = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        console.log(`Atualizando a estrutura do banco de dados para a versão ${this.config.dbVersion}...`);
        
        // Garante que a fila de sincronização exista
        const allStores = [...this.config.collections, 'sync_queue'];

        allStores.forEach(storeName => {
          if (!this.db!.objectStoreNames.contains(storeName)) {
            // Usamos 'id' como o caminho da chave padrão para todos os objetos.
            this.db!.createObjectStore(storeName, { keyPath: 'id' });
            console.log(`Object Store '${storeName}' criado.`);
          }
        });
      };
    });

    return this.initPromise;
  }

  /**
   * Obtém um item de um Object Store.
   * @param {string} storeName - O nome da "tabela" (coleção).
   * @param {IDBValidKey} key - A chave do item a ser recuperado.
   * @returns {Promise<T | undefined>} O item encontrado ou undefined.
   */
  public async get<T>(storeName: string, key: IDBValidKey): Promise<T | undefined> {
    await this.initialize();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.get(key);

      request.onsuccess = () => resolve(request.result as T);
      request.onerror = () => reject(new Error(`Falha ao obter o item '${key}' de '${storeName}'.`));
    });
  }

  /**
   * Obtém todos os itens de um Object Store.
   * @param {string} storeName - O nome da "tabela" (coleção).
   * @returns {Promise<T[]>} Um array com todos os itens.
   */
  public async getAll<T>(storeName: string): Promise<T[]> {
    await this.initialize();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(storeName, 'readonly');
      const store = transaction.objectStore(storeName);
      const request = store.getAll();

      request.onsuccess = () => resolve(request.result as T[]);
      request.onerror = () => reject(new Error(`Falha ao obter todos os itens de '${storeName}'.`));
    });
  }

  /**
   * Salva (cria ou atualiza) um item em um Object Store.
   * @param {string} storeName - O nome da "tabela" (coleção).
   * @param {T} value - O objeto a ser salvo. Requer uma propriedade 'id'.
   * @returns {Promise<void>}
   */
  public async set<T>(storeName: string, value: T): Promise<void> {
    await this.initialize();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.put(value);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error(`Falha ao salvar o item em '${storeName}'.`));
    });
  }

  /**
   * Remove um item de um Object Store.
   * @param {string} storeName - O nome da "tabela" (coleção).
   * @param {IDBValidKey} key - A chave do item a ser removido.
   * @returns {Promise<void>}
   */
  public async delete(storeName: string, key: IDBValidKey): Promise<void> {
    await this.initialize();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.delete(key);

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error(`Falha ao remover o item '${key}' de '${storeName}'.`));
    });
  }

  /**
   * Limpa todos os itens de um Object Store.
   * @param {string} storeName - O nome da "tabela" (coleção).
   * @returns {Promise<void>}
   */
  public async clear(storeName: string): Promise<void> {
    await this.initialize();
    return new Promise((resolve, reject) => {
      const transaction = this.db!.transaction(storeName, 'readwrite');
      const store = transaction.objectStore(storeName);
      const request = store.clear();

      request.onsuccess = () => resolve();
      request.onerror = () => reject(new Error(`Falha ao limpar o store '${storeName}'.`));
    });
  }
}
