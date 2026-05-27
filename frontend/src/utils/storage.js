/**
 * utils/storage.js
 *
 * Gerencia o armazenamento local das consultas (no device do usuário).
 *
 * POR QUE localStorage?
 *   - Grátis: não precisa de servidor ou banco de dados
 *   - Privado: fica só no dispositivo do usuário
 *   - O dado já chega aqui criptografado pelo crypto.js
 *
 * LIMITAÇÃO (conhecida para o MVP):
 *   Se o usuário trocar de dispositivo, os dados não migram automaticamente.
 *   Fase 2: sincronizar via IPFS com o hash on-chain como âncora de verificação.
 */

const PREFIXO = "ht_";  // "ht_" de HealthTracker — evita colisão com outros apps

/**
 * Salva uma consulta criptografada no localStorage.
 * @param {string} consultationId  ID on-chain da consulta (bytes32 hex)
 * @param {string} dadoCifrado     String base64 do dado criptografado
 */
export function salvarLocal(consultationId, dadoCifrado) {
  // Atualiza o índice de IDs conhecidos
  const indice = obterIndice();
  indice[consultationId] = { salvosEm: Date.now() };
  localStorage.setItem(PREFIXO + "indice", JSON.stringify(indice));

  // Salva o dado cifrado
  localStorage.setItem(PREFIXO + consultationId, dadoCifrado);
}

/**
 * Recupera o dado criptografado de uma consulta.
 * @param {string} consultationId  ID da consulta
 * @returns {string|null}  Dado cifrado em base64, ou null se não encontrado
 */
export function carregarLocal(consultationId) {
  return localStorage.getItem(PREFIXO + consultationId);
}

/**
 * Retorna o índice de todos os IDs salvos localmente.
 * @returns {Object}  Mapa de { consultationId: { salvosEm: timestamp } }
 */
export function obterIndice() {
  try {
    return JSON.parse(localStorage.getItem(PREFIXO + "indice") || "{}");
  } catch {
    return {};
  }
}

/**
 * Remove todos os dados do localStorage (usado no logout).
 */
export function limparLocal() {
  Object.keys(localStorage)
    .filter((chave) => chave.startsWith(PREFIXO))
    .forEach((chave) => localStorage.removeItem(chave));
}
