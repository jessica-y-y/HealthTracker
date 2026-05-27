/**
 * utils/crypto.js
 *
 * Criptografia AES-256-GCM usando Web Crypto API nativa do browser.
 *
 * POR QUE ISSO É IMPORTANTE?
 *   - Os dados de saúde são cifrados ANTES de qualquer armazenamento
 *   - A chave é derivada do endereço da wallet do usuário
 *   - Nem o desenvolvedor, nem o servidor, ninguém mais pode ler os dados
 *   - Não usa nenhuma biblioteca externa — zero dependência adicional
 *
 * FLUXO:
 *   dado original  →  encrypt(dado, wallet)  →  string base64 cifrada
 *   string base64  →  decrypt(base64, wallet) →  dado original
 *   string base64  →  sha256(base64)          →  hash para a blockchain
 */

// "Salt" fixo usado na derivação da chave
// Não precisa ser secreto, só precisa ser único para este app
const SALT = new TextEncoder().encode("healthtracker_v1_salt_2024");
const ITERACOES_PBKDF2 = 100_000; // quanto maior, mais seguro e mais lento

/**
 * Deriva uma chave AES-256 a partir do endereço da wallet.
 * Cada wallet gera uma chave única — só o dono da wallet pode decifrar.
 * @private
 */
async function derivarChave(enderecoWallet) {
  // Importa o endereço como material para derivação
  const material = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(enderecoWallet.toLowerCase()),
    { name: "PBKDF2" },
    false,         // não exportável
    ["deriveKey"]
  );

  // Deriva a chave AES-256-GCM usando PBKDF2
  return crypto.subtle.deriveKey(
    {
      name:       "PBKDF2",
      salt:       SALT,
      iterations: ITERACOES_PBKDF2,
      hash:       "SHA-256",
    },
    material,
    { name: "AES-GCM", length: 256 }, // AES com chave de 256 bits
    false,         // não exportável — a chave nunca sai do browser
    ["encrypt", "decrypt"]
  );
}

/**
 * Criptografa um objeto JavaScript.
 * @param {Object} dado          Objeto a criptografar (ex: dados da consulta)
 * @param {string} enderecoWallet Endereço da MetaMask do usuário
 * @returns {Promise<string>}    String base64 com IV + ciphertext
 */
export async function encrypt(dado, enderecoWallet) {
  const chave = await derivarChave(enderecoWallet);

  // IV = Initialization Vector: número aleatório único por operação
  // Necessário para que a mesma mensagem cifrada duas vezes gere resultados diferentes
  const iv = crypto.getRandomValues(new Uint8Array(12));

  // Cifra o dado (serializado como JSON)
  const dadoCifrado = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv },
    chave,
    new TextEncoder().encode(JSON.stringify(dado))
  );

  // Junta IV + ciphertext em um único array de bytes
  const combinado = new Uint8Array(12 + dadoCifrado.byteLength);
  combinado.set(iv, 0);
  combinado.set(new Uint8Array(dadoCifrado), 12);

  // Converte para base64 para armazenar como string
  return btoa(String.fromCharCode(...combinado));
}

/**
 * Descriptografa uma string produzida por encrypt().
 * @param {string} base64        String base64 cifrada
 * @param {string} enderecoWallet Endereço da MetaMask do usuário
 * @returns {Promise<Object>}    Objeto original descriptografado
 */
export async function decrypt(base64, enderecoWallet) {
  const chave = await derivarChave(enderecoWallet);

  // Converte base64 de volta para bytes
  const combinado = Uint8Array.from(atob(base64), (c) => c.charCodeAt(0));

  // Separa IV (primeiros 12 bytes) do dado cifrado (resto)
  const iv         = combinado.slice(0, 12);
  const ciphertext = combinado.slice(12);

  // Decifra
  const dadoDecifrado = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv },
    chave,
    ciphertext
  );

  return JSON.parse(new TextDecoder().decode(dadoDecifrado));
}

/**
 * Gera SHA-256 de uma string.
 * Usado para criar o hash que vai para a blockchain.
 * @param {string} texto  Qualquer string (geralmente o dado cifrado em base64)
 * @returns {Promise<string>}  Hash hexadecimal com prefixo "0x" (formato bytes32 do Solidity)
 */
export async function sha256(texto) {
  const hash = await crypto.subtle.digest(
    "SHA-256",
    new TextEncoder().encode(texto)
  );
  // Converte para hex e adiciona prefixo 0x (obrigatório para bytes32 no Solidity)
  return "0x" + Array.from(new Uint8Array(hash))
    .map((byte) => byte.toString(16).padStart(2, "0"))
    .join("");
}
