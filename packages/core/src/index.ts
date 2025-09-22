/**
 * @file packages/core/src/index.ts
 * @description
 * Ponto de entrada principal para o pacote @syncdbg/core.
 *
 * Este arquivo exporta a API pública da biblioteca, incluindo a classe cliente principal,
 * classes de componentes, estratégias de resolução de conflitos e todos os tipos
 * e interfaces relevantes para o uso do pacote.
 */

// --- Classes Principais ---

// A fachada principal da biblioteca.
export { SyncDBGClient } from './api/SyncDBGClient';

// Classes de componentes que podem ser úteis para tipos ou para uso avançado.
export { Collection } from './collection/Collection';
export { NetworkDetector } from './network/NetworkDetector';
export { SyncEngine } from './sync/SyncEngine';
export { SyncQueue } from './sync/SyncQueue';
export { StateManager } from './state/StateManager';

// --- Estratégias e Utilitários ---

// Exporta as estratégias de resolução de conflitos pré-definidas.
export { ConflictStrategies } from './sync/ConflictResolver';

// --- Tipos e Interfaces ---

// Re-exporta todos os tipos públicos do arquivo de tipos centralizado.
// Isso permite que os usuários importem tanto classes quanto tipos do mesmo lugar.
// Ex: import { SyncDBGClient, type SyncDBGClientConfig } from '@syncdbg/core';
export * from './types';
