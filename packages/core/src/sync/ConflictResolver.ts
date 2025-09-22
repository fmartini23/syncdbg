import type { Operation } from '../collection/Collection';

/**
 * @interface Conflict
 * Representa um conflito detectado durante a sincronização.
 * Fornece todas as informações necessárias para que uma estratégia possa resolvê-lo.
 *
 * @template T - O tipo do documento em conflito.
 */
export interface Conflict<T extends { id: string | number }> {
  /**
   * A operação local que falhou devido a um conflito.
   */
  localOperation: Operation<T>;
  
  /**
   * O estado atual do documento no servidor (a versão que causou o conflito).
   */
  remoteState: T;
}

/**
 * @type Resolution
 * O resultado de uma resolução de conflito.
 * Pode ser o documento mesclado, ou 'local'/'remote' para indicar qual versão venceu.
 *
 * @template T - O tipo do documento.
 */
export type Resolution<T> = T | 'local' | 'remote';

/**
 * @interface ConflictResolutionStrategy
 * Define a assinatura de uma função de estratégia de resolução de conflitos.
 *
 * @template T - O tipo do documento.
 * @param {Conflict<T>} conflict - O objeto de conflito contendo os dados locais e remotos.
 * @returns {Promise<Resolution<T>> | Resolution<T>} A versão resolvida do documento.
 * A função pode ser síncrona ou assíncrona (ex: se precisar de input do usuário).
 */
export type ConflictResolutionStrategy<T extends { id: string | number }> = 
  (conflict: Conflict<T>) => Promise<Resolution<T>> | Resolution<T>;

// --- Implementações de Estratégias de Resolução de Conflitos ---

/**
 * Estratégia: Last Write Wins (LWW) - A Última Escrita Vence.
 * Compara os timestamps da operação local e do estado remoto (assumindo que o estado remoto
 * tenha um campo como `updatedAt`). A versão com o timestamp mais recente vence.
 *
 * @param {string} timestampField - O nome do campo de timestamp no documento (ex: 'updatedAt').
 * @returns {ConflictResolutionStrategy<T>} A função de estratégia LWW.
 */
export function lastWriteWins<T extends { id: string | number; [key: string]: any }>(
  timestampField: string = 'updatedAt'
): ConflictResolutionStrategy<T> {
  return (conflict: Conflict<T>): 'local' | 'remote' => {
    const localTimestamp = conflict.localOperation.timestamp;
    const remoteTimestamp = new Date(conflict.remoteState[timestampField]).getTime();

    if (!remoteTimestamp) {
      console.warn(`[ConflictResolver] Campo de timestamp '${timestampField}' não encontrado no estado remoto. Remoto vence por padrão.`);
      return 'remote';
    }

    // Se o timestamp local for mais recente, a versão local vence.
    return localTimestamp > remoteTimestamp ? 'local' : 'remote';
  };
}

/**
 * Estratégia: A Versão do Servidor Sempre Vence.
 * Simples e previsível. Descarta a alteração local em caso de conflito.
 *
 * @returns {ConflictResolutionStrategy<T>} A função de estratégia.
 */
export function serverWins<T extends { id: string | number }>(): ConflictResolutionStrategy<T> {
  return (): 'remote' => {
    // Simplesmente instrui a usar a versão remota.
    return 'remote';
  };
}

/**
 * Estratégia: A Versão do Cliente Sempre Vence.
 * Força a aplicação da mudança local, sobrescrevendo o estado do servidor.
 * Use com cuidado, pois pode levar à perda de dados no servidor.
 *
 * @returns {ConflictResolutionStrategy<T>} A função de estratégia.
 */
export function clientWins<T extends { id: string | number }>(): ConflictResolutionStrategy<T> {
  return (): 'local' => {
    // Simplesmente instrui a usar a versão local.
    return 'local';
  };
}

/**
 * Estratégia: Merge de Campos (Field-level Merge).
 * Tenta mesclar os campos do estado local e remoto. O resultado é um novo objeto
 * que contém os campos mais recentes de ambas as versões.
 *
 * @param {string} timestampField - O nome do campo de timestamp.
 * @returns {ConflictResolutionStrategy<T>} A função de estratégia de merge.
 */
export function fieldLevelMerge<T extends { id: string | number; [key: string]: any }>(
  timestampField: string = 'updatedAt'
): ConflictResolutionStrategy<T> {
  return (conflict: Conflict<T>): T => {
    const { localOperation, remoteState } = conflict;
    
    // O estado "local" completo precisa ser reconstruído, pois a operação pode ser parcial.
    // Esta é uma simplificação. Uma implementação real precisaria do estado do documento
    // ANTES da operação local para fazer um merge de 3 vias (3-way merge).
    // Para este exemplo, vamos assumir que a operação local contém o estado completo.
    if (localOperation.type !== 'update' || !localOperation.payload) {
        // Se não for uma atualização ou não tiver payload, não podemos fazer merge.
        // Recai para a estratégia 'serverWins'.
        return remoteState;
    }

    const localChanges = localOperation.payload as Partial<T>;
    
    // Começa com a versão remota como base.
    const mergedDoc: T = { ...remoteState };

    // Itera sobre as chaves da alteração local.
    for (const key in localChanges) {
      if (Object.prototype.hasOwnProperty.call(localChanges, key)) {
        // Neste modelo simplificado, a alteração local sempre sobrescreve.
        // Uma implementação mais avançada compararia timestamps por campo.
        (mergedDoc as any)[key] = localChanges[key];
      }
    }

    // Atualiza o timestamp para o momento do merge.
    if (mergedDoc[timestampField]) {
      (mergedDoc as any)[timestampField] = new Date().toISOString();
    }

    return mergedDoc;
  };
}

/**
 * Objeto que exporta as estratégias pré-definidas para fácil acesso.
 */
export const ConflictStrategies = {
  lastWriteWins,
  serverWins,
  clientWins,
  fieldLevelMerge,
};
