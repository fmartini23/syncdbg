/**
 * @file packages/core/src/types/index.ts
 * @description
 * Este arquivo atua como o ponto de entrada principal para todas as definições de tipo
 * e interfaces públicas do pacote @syncdbg/core.
 *
 * Ele re-exporta tipos de outros módulos para fornecer uma API de importação limpa
 * e consolidada para os usuários da biblioteca.
 */

// --- Tipos da API Principal ---
export type { SyncDBGClientConfig } from '../api/SyncDBGClient';

// --- Tipos de Coleção e Operação ---
export type {
  CollectionConfig,
  Operation,
  OperationType,
} from '../collection/Collection';

// --- Tipos de Persistência ---
export type { PersistenceAdapter } from '../persistence/PersistenceAdapter';

// --- Tipos de Rede ---
export type { NetworkDetectorConfig } from '../network/NetworkDetector';

// --- Tipos de Sincronização e Conflito ---
export type { SyncEngineConfig } from '../sync/SyncEngine';
export type {
  Conflict,
  Resolution,
  ConflictResolutionStrategy,
} from '../sync/ConflictResolver';

// --- Tipos do StateManager (geralmente internos, mas podem ser úteis) ---
// Nota: A maioria dos tipos do StateManager são detalhes de implementação,
// então exportamos apenas o que pode ser útil externamente, se houver.
// Por enquanto, não há necessidade de exportar tipos daqui.

