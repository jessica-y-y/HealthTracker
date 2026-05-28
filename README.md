## HealthTracker

> Rastreabilidade de consultas consultas de saúde com privacidade por criptografia e imutabilidade blockchain.
> **Hackathon Web3 — Desafio 1**

## O problema que resolve

Toda consulta de saúde começa do zero porque não existe um 
histórico confiável, portátil e de posse do paciente. 
Profissionais de saúde tomam decisões sem contexto completo (o paciente não sabe tudo o que é relevante de ser dito, e o médico faz o máximo de perguntas que pode - o erro de toda comunicação também acontece quando mais precisamos que tudo seja entendido). 
O HealthTracker resolve isso sendo o passaporte de saúde do 
usuário — dados que ele carrega, controla e compartilha com 
quem quiser, quando quiser, com prova criptográfica de que não foram adulterados.

## Como funciona (em 4 passos)

1. Usuário preenche a consulta no app
        ↓
2. Dados são criptografados (AES-256-GCM) no browser
   Chave = derivada da wallet — nunca sai do browser
        ↓
3. Dado criptografado → localStorage (no device do usuário)
   Arquivos → IPFS/Pinata (criptografados antes do upload)
        ↓
4. Hash SHA-256 do dado criptografado → blockchain Sepolia
   registerConsultation(hash, ipfsHash) — imutável, público, rastreável
        ↓
5. Qualquer pessoa verifica integridade
verifyIntegrity(id, hash) — sem servidor, sem login   

## Requisitos obrigatórios do hackathon atendidos:

- Contrato deployado em testnet pública:  Sepolia 
- Registro on-chain de informações: `registerConsultation()` 
- Consulta/verificação pública do registro: `verifyIntegrity()` + Etherscan 
- Repositório GitHub funcional
- README explicativo
- Vídeo pitch:
- Apresentação (slides):
- App funcionando: https://jessica-y-y.github.io/HealthTracker/

## Contrato deployado

- Rede: Sepolia Testnet 
- Endereço: 0x69E709494B364A0807D5130c78aA9f0631C6FA53
- Etherscan [Ver contrato]: ( https://sepolia.etherscan.io/address/0x69E709494B364A0807D5130c78aA9f0631C6FA53 )
- TX Hash deploy: 0x70834e54d65a2ddb2b84d22f5152c675191786a4c49b6209236e887686225bc3

## Setup e execução

### Pré-requisitos
- Node.js 18+
- MetaMask no browser (configurada para Sepolia)
- ETH Sepolia: [Ethereum Sepolia Faucet do Google] (https://cloud.google.com/application/web3/faucet/ethereum/sepolia))
- RPC Sepolia: [alchemy.com](https://dashboard.alchemy.com) (free tier)

### Contratos

bash
git clone (repositório)
cd healthtracker
cp .env.example .env
Preenchimento da Private Key e Sepholia RPC URL no .env
npm install
npm run compile      # compila o Solidity
npm test             # 9 testes — todos devem passar
npm run deploy:sepolia

### Frontend

bash
cd frontend
cp .env.example .env
Opcional (para habilitar anexos): preencha VITE_PINATA_JWT
npm install
npm run dev
Abra http://localhost:5173

## Segurança

Camada: Mecanismo
- Conteúdo da consulta: AES-256-GCM, chave = PBKDF2(wallet address)
- Arquivos/exames: Criptografados localmente antes do upload IPFS
- Blockchain: Apenas SHA-256 do dado cifrado — zero dado sensível on-chain
- Chave de criptografia: Nunca armazenada, nunca transmitida — deriva em tempo real
- Desenvolvedor: Tecnicamente impossível ler os dados dos usuários

## Stack

Solidity 0.8.24 · Hardhat · Sepolia Testnet · MetaMask · Ethers.js v6 · React 18 · Vite · Web Crypto API · IPFS/Pinata

