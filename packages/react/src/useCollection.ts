import { useState, useEffect, useCallback } from 'react';
import type { Collection } from '@syncdbg/core';
import { useSyncDBGClient } from './useSyncDBGClient'; // Importaremos o hook de cliente do seu próprio arquivo

/**
 * @hook useCollection
 * Hook reativo para obter os dados de uma coleção e se inscrever em suas atualizações.
 *
 * @template T - O tipo dos documentos na coleção.
 * @param {string} collectionName - O nome da coleção a ser acessada.
 * @returns {{ data: T[]; collection: Collection<T> }} Um objeto contendo os dados reativos
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
  // 1. Obtém o cliente global usando o hook dedicado.
  const client = useSyncDBGClient();

  // 2. Obtém a instância da coleção a partir do cliente.
  // useCallback garante que a referência à coleção seja estável se o nome não mudar.
  const collection = useCallback(
    () => client.collection<T>(collectionName),
    [client, collectionName]
  )();

  // 3. Inicializa o estado do React com os dados atuais da coleção.
  // A função passada para o useState só é executada na renderização inicial.
  const [data, setData] = useState<T[]>(() => collection.getAll());

  // 4. Gerencia o ciclo de vida da inscrição.
  useEffect(() => {
    // Inscreve-se para receber atualizações. O StateManager do core
    // chama o callback imediatamente com os dados atuais, e depois
    // sempre que os dados mudarem.
    const unsubscribe = collection.subscribe(setData);

    // A função de limpeza retornada pelo useEffect é crucial.
    // Ela será chamada quando o componente for desmontado,
    // cancelando a inscrição e evitando vazamentos de memória.
    return () => {
      unsubscribe();
    };
  }, [collection]); // O efeito é re-executado se a instância da coleção mudar.

  // 5. Retorna os dados reativos e a instância da coleção para manipulação.
  return { data, collection };
}
