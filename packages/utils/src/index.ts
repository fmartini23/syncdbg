/**
 * @file packages/utils/src/index.ts
 * @description
 * Ponto de entrada para o pacote de utilitários @syncdbg/utils.
 *
 * Este pacote exporta funções puras e utilitários compartilhados que podem ser
 * usados por outros pacotes no monorepo, como @syncdbg/core ou @syncdbg/react.
 * O objetivo é evitar a duplicação de código e centralizar a lógica comum.
 */

// --- Dependências Externas ---
import { v4 as uuidv4 } from 'uuid';

// --- Funções Utilitárias ---

/**
 * Gera um Identificador Único Universal (UUID) na versão 4.
 *
 * Esta função é uma abstração sobre a biblioteca 'uuid'. Usar esta abstração
 * permite que, no futuro, possamos trocar a implementação de geração de UUID
 * em um único lugar, sem precisar alterar todos os pacotes que a consomem.
 *
 * @returns {string} Uma string UUID v4, como "f47ac10b-58cc-4372-a567-0e02b2c3d479".
 */
export function generateUUID(): string {
  return uuidv4();
}

/**
 * Uma função "noop" (sem operação).
 * Pode ser útil como um valor padrão para callbacks ou para funções de cancelamento
 * de inscrição que não precisam fazer nada.
 *
 * @example
 * const unsubscribe = data ? subscribe(onData) : noop;
 */
export function noop(): void {
  // Não faz nada.
}

/**
 * Verifica se um valor é um objeto simples (plain object).
 * Útil para diferenciar objetos literais de instâncias de classes, arrays, etc.
 *
 * @param {any} value - O valor a ser verificado.
 * @returns {boolean} `true` se o valor for um objeto simples.
 */
export function isPlainObject(value: any): boolean {
  if (value === null || typeof value !== 'object' || value.nodeType || (value.constructor && !Object.prototype.hasOwnProperty.call(value.constructor.prototype, 'isPrototypeOf'))) {
    return false;
  }
  return true;
}
