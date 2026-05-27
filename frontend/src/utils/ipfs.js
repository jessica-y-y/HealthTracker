/**
 * utils/ipfs.js
 *
 * Upload e download de arquivos criptografados via IPFS (Pinata free tier).
 *
 * O QUE É IPFS?
 *   IPFS (InterPlanetary File System) é uma rede descentralizada de arquivos.
 *   Em vez de um servidor central, os arquivos são identificados pelo seu
 *   conteúdo (CID = Content Identifier). Qualquer um pode hospedar um arquivo.
 *
 * O QUE É PINATA?
 *   Pinata é um serviço que "pina" (mantém disponível) seus arquivos no IPFS.
 *   Free tier: 1 GB de armazenamento, sem cartão de crédito.
 *
 * SEGURANÇA:
 *   O arquivo é criptografado com AES-256 ANTES do upload.
 *   O Pinata recebe apenas bytes sem sentido — sem acesso ao conteúdo real.
 */

const PINATA_UPLOAD_URL = "https://api.pinata.cloud/pinning/pinFileToIPFS";
const PINATA_GATEWAY    = "https://gateway.pinata.cloud/ipfs";

const SALT       = new TextEncoder().encode("healthtracker_v1_salt_2024");
const ITERACOES  = 100_000;

/** Deriva chave AES-256 — mesma lógica do crypto.js */
async function derivarChave(enderecoWallet) {
  const material = await crypto.subtle.importKey(
    "raw",
    new TextEncoder().encode(enderecoWallet.toLowerCase()),
    { name: "PBKDF2" }, false, ["deriveKey"]
  );
  return crypto.subtle.deriveKey(
    { name: "PBKDF2", salt: SALT, iterations: ITERACOES, hash: "SHA-256" },
    material,
    { name: "AES-GCM", length: 256 }, false, ["encrypt", "decrypt"]
  );
}

/**
 * Criptografa um arquivo e faz upload para IPFS via Pinata.
 *
 * @param {File}   arquivo         Arquivo selecionado pelo usuário
 * @param {string} enderecoWallet  Endereço MetaMask (para derivar a chave)
 * @param {string} pinataJwt       JWT da Pinata (do .env do frontend)
 * @returns {{ cid, cidHash, urlGateway }}
 */
export async function uploadArquivoCriptografado(arquivo, enderecoWallet, pinataJwt) {
  if (!pinataJwt) {
    throw new Error(
      "VITE_PINATA_JWT não configurado. " +
      "Cadastre em app.pinata.cloud e adicione ao frontend/.env"
    );
  }

  // 1. Lê o arquivo como ArrayBuffer
  const buffer = await arquivo.arrayBuffer();

  // 2. Criptografa o arquivo antes do upload
  const chave = await derivarChave(enderecoWallet);
  const iv    = crypto.getRandomValues(new Uint8Array(12));
  const cifrado = await crypto.subtle.encrypt(
    { name: "AES-GCM", iv }, chave, buffer
  );

  // Combina IV + ciphertext
  const combinado = new Uint8Array(12 + cifrado.byteLength);
  combinado.set(iv, 0);
  combinado.set(new Uint8Array(cifrado), 12);

  // 3. Cria o FormData para envio ao Pinata
  const formData = new FormData();
  const blob = new Blob([combinado], { type: "application/octet-stream" });
  formData.append("file", blob, `ht_enc_${Date.now()}`);
  formData.append("pinataMetadata", JSON.stringify({
    name: `healthtracker_${arquivo.name}_${Date.now()}`
  }));
  formData.append("pinataOptions", JSON.stringify({ cidVersion: 1 }));

  // 4. Envia para o Pinata
  const resposta = await fetch(PINATA_UPLOAD_URL, {
    method: "POST",
    headers: { Authorization: `Bearer ${pinataJwt}` },
    body: formData,
  });

  if (!resposta.ok) {
    const erro = await resposta.text();
    throw new Error(`Pinata retornou erro: ${erro}`);
  }

  const { IpfsHash: cid } = await resposta.json();

  // 5. Gera SHA-256 do CID para registrar on-chain
  const cidHash = "0x" + Array.from(
    new Uint8Array(
      await crypto.subtle.digest("SHA-256", new TextEncoder().encode(cid))
    )
  ).map((b) => b.toString(16).padStart(2, "0")).join("");

  return {
    cid,
    cidHash,
    urlGateway: `${PINATA_GATEWAY}/${cid}`,
    nomeOriginal: arquivo.name,
  };
}

/**
 * Baixa e descriptografa um arquivo do IPFS.
 *
 * @param {string} cid             CID IPFS do arquivo
 * @param {string} enderecoWallet  Endereço MetaMask (para derivar a chave)
 * @param {string} nomeArquivo     Nome para o download
 */
export async function baixarArquivoDecriptografado(cid, enderecoWallet, nomeArquivo) {
  const resposta = await fetch(`${PINATA_GATEWAY}/${cid}`);
  if (!resposta.ok) throw new Error("Arquivo não encontrado no IPFS");

  const combinado   = new Uint8Array(await resposta.arrayBuffer());
  const iv          = combinado.slice(0, 12);
  const ciphertext  = combinado.slice(12);

  const chave = await derivarChave(enderecoWallet);
  const decifrado = await crypto.subtle.decrypt(
    { name: "AES-GCM", iv }, chave, ciphertext
  );

  // Força o download no browser
  const url = URL.createObjectURL(new Blob([decifrado]));
  const a   = document.createElement("a");
  a.href     = url;
  a.download = nomeArquivo || "arquivo_saude";
  a.click();
  URL.revokeObjectURL(url);
}
