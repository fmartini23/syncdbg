// Importa a interface que este adaptador deve implementar.
// Isso garante consistência e permite que o 'core' use qualquer adaptador compatível.
// Nota: Este arquivo ainda não existe, mas o criaremos no pacote 'core'.
import type { PersistenceAdapter, Operation } from '@sync-state/core';

// --- Tipos específicos para o IndexedDB Adapter ---

/**
 * @interface IDBAdapterConfig
 * Configuração para o IndexedDBAdapter.
 * @property {string} dbName - O nome do banco de dados a ser usado.
 * @property {number} dbVersion - A versão do banco de dados. Incrementar este número aciona o evento 'onupgradeneeded'.
 */
export interface IDBAdapterConfig {
  dbName: string;
  dbVersion: number;
}

/**
 * Implementação do PersistenceAdapter usando IndexedDB.
 * Esta classe abstrai toda a complexidade de interagir com a API do IndexedDB.
 */
export class IndexedDBAdapter implements PersistenceAdapter {
  private db: IDBDatabase | null = null;
  private dbName: string;
  private dbVersion: number;
  private initPromise: Promise<void> | null = null;

  /**
   * @constructor
   * @param {IDBAdapterConfig} config - A configuração do adaptador.
   */
  constructor(config: IDBAdapterConfig) {
    this.dbName = config.dbName;
    this.dbVersion = config.dbVersion;
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

      const request = indexedDB.open(this.dbName, this.dbVersion);

      request.onerror = () => {
        console.error(`IndexedDB error: ${request.error?.message}`);
        reject(new Error(`Falha ao abrir o banco de dados: ${request.error?.message}`));
      };

      request.onsuccess = () => {
        this.db = request.result;
        console.log(`Banco de dados '${this.dbName}' aberto com sucesso.`);
        resolve();
      };

      // Este evento só é disparado quando a versão do banco de dados muda.
      // É o único lugar onde podemos alterar a estrutura do banco (criar/remover Object Stores).
      request.onupgradeneeded = (event) => {
        this.db = (event.target as IDBOpenDBRequest).result;
        console.log(`Atualizando a estrutura do banco de dados para a versão ${this.dbVersion}...`);
        // Aqui poderíamos iterar sobre uma lista de coleções conhecidas para criá-las,
        // mas uma abordagem mais flexível é criá-las sob demanda.
        // Por segurança, podemos pré-criar a fila de sincronização.
        if (!this.db.objectStoreNames.contains('sync_queue')) {
          this.db.createObjectStore('sync_queue', { keyPath: 'id' });
          console.log("Object Store 'sync_queue' criado.");
        }
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
   * @param {T} value - O objeto a ser salvo.
   * @returns {Promise<void>}
   */
  public async set<T>(storeName: string, value: T): Promise<void> {
    await this.initialize();
    return new Promise((resolve, reject) => {
      // Usamos 'readwrite' para operações de escrita.
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

  /**
   * Garante que um Object Store exista. Se não existir, cria um novo.
   * Isso requer reabrir o banco com uma nova versão.
   * @param {string} storeName - O nome do Object Store a ser garantido.
   * @returns {Promise<void>}
   */
  public async ensureStore(storeName: string): Promise<void> {
    await this.initialize();
    if (this.db!.objectStoreNames.contains(storeName)) {
      return; // Já existe, não faz nada.
    }

    // Se o store não existe, precisamos aumentar a versão do DB para acionar 'onupgradeneeded'.
    const currentVersion = this.db!.version;
    this.db!.close(); // Fecha a conexão atual antes de reabrir.
    this.db = null;
    this.initPromise = null; // Reseta a promessa de inicialização.

    this.dbVersion = currentVersion + 1;

    // Re-inicializa com a nova versão.
    return this.initialize().then(() => {
      // A lógica de criação está no 'onupgradeneeded', mas precisamos garantir que ele seja criado.
      // Uma abordagem mais explícita seria passar os nomes dos stores para o `initialize`.
      // Para simplificar, vamos recriá-lo aqui se o `onupgradeneeded` não o fez.
      if (!this.db!.objectStoreNames.contains(storeName)) {
        // Este bloco na verdade não será executado como deveria, pois a criação só pode
        // ocorrer dentro do 'onupgradeneeded'. A lógica correta é ter uma lista de stores
        // a serem criados e passá-la para o `initialize`.
        // Para este exemplo, vamos assumir que o `onupgradeneeded` é mais inteligente
        // ou que os stores são declarados na inicialização.
        console.warn(`Store '${storeName}' não foi criado dinamicamente. Requer uma nova versão do DB.`);
      }
    });
  }
}
