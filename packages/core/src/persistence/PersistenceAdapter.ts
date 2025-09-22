/**
 * @interface PersistenceAdapter
 * Define o contrato que todos os adaptadores de persistência de dados devem seguir.
 * Esta interface abstrai o mecanismo de armazenamento subjacente (ex: IndexedDB,
 * localStorage, AsyncStorage no React Native, etc.), permitindo que o núcleo
 * do SyncDBG opere de forma agnóstica em relação ao armazenamento.
 */
export interface PersistenceAdapter {
    /**
     * Recupera um único item de um "store" (tabela ou coleção) pelo seu ID/chave.
     *
     * @template T - O tipo do objeto esperado.
     * @param {string} storeName - O nome do store de onde o item será lido.
     * @param {IDBValidKey} key - A chave primária do item a ser recuperado.
     * @returns {Promise<T | undefined>} Uma promessa que resolve com o item encontrado,
     * ou `undefined` se nenhum item for encontrado com a chave fornecida.
     */
    get<T>(storeName: string, key: IDBValidKey): Promise<T | undefined>;
  
    /**
     * Recupera todos os itens de um store.
     *
     * @template T - O tipo dos objetos no store.
     * @param {string} storeName - O nome do store.
     * @returns {Promise<T[]>} Uma promessa que resolve com um array de todos os itens
     * no store. Retorna um array vazio se o store estiver vazio.
     */
    getAll<T>(storeName: string): Promise<T[]>;
  
    /**
     * Salva (cria ou atualiza) um item em um store.
     * Se um item com a mesma chave primária já existir, ele será substituído.
     * Caso contrário, um novo item será criado.
     *
     * @template T - O tipo do objeto a ser salvo.
     * @param {string} storeName - O nome do store.
     * @param {T} value - O objeto a ser salvo. O objeto deve conter a chave primária.
     * @returns {Promise<void>} Uma promessa que resolve quando a operação de escrita é concluída.
     */
    set<T>(storeName: string, value: T): Promise<void>;
  
    /**
     * Remove um item de um store usando sua chave primária.
     *
     * @param {string} storeName - O nome do store.
     * @param {IDBValidKey} key - A chave do item a ser removido.
     * @returns {Promise<void>} Uma promessa que resolve quando a remoção é concluída.
     */
    delete(storeName: string, key: IDBValidKey): Promise<void>;
  
    /**
     * Remove todos os itens de um store, deixando-o vazio.
     *
     * @param {string} storeName - O nome do store a ser limpo.
     * @returns {Promise<void>} Uma promessa que resolve quando o store é limpo.
     */
    clear(storeName: string): Promise<void>;
  }
  