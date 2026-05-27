## HealthTracker

> Rastreabilidade de consultas consultas de saúde com privacidade por criptografia e imutabilidade blockchain.
> **Hackathon Web3 — Desafio 1**


## O que é

HealthTracker permite que pacientes registrem suas consultas de saúde com:
- Diagnóstico, recomendações, orientações e medicações
- Dados do profissional (nome, registro, especialidade, local)
- Anexos (receituários, exames) criptografados no IPFS
- **Prova de integridade imutável na blockchain Sepolia**

**Nenhum dado sensível vai para a blockchain** — apenas o hash SHA-256 do conteúdo criptografado.

## Como funciona (em 4 passos)

1. Usuário preenche a consulta no app
        ↓
2. Dados são criptografados (AES-256-GCM) no browser
   Chave = derivada da wallet via PBKDF2 — nunca sai do browser
        ↓
3. Dado criptografado → localStorage (no device do usuário)
   Arquivos → IPFS/Pinata (criptografados antes do upload)
        ↓
4. Hash SHA-256 do dado criptografado → blockchain Sepolia
   registerConsultation(hash, ipfsHash) — imutável, público, rastreável

## Requisitos obrigatórios do hackathon atendidos:

- Contrato deployado em testnet pública:  Sepolia 
- Registro on-chain de informações: `registerConsultation()` 
- Consulta/verificação pública do registro: `verifyIntegrity()` + Etherscan 
- Repositório GitHub funcional
- README explicativo

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
git clone https://github.com/SEU_USUARIO/healthtracker.git
cd healthtracker
cp .env.example .env
# Preenchimento da PRIVATE_KEY e SEPOLIA_RPC_URL no .env

npm install
npm run compile      # compila o Solidity
npm test             # 9 testes — todos devem passar
npm run deploy:sepolia


### Frontend

bash
cd frontend
cp .env.example .env
# Opcional: preencha VITE_PINATA_JWT para habilitar anexos

npm install
npm run dev
# Abra http://localhost:5173

## Estrutura do projeto

healthtracker/
├── contracts/
│   └── HealthTracker.sol              # Contrato Solidity principal
├── scripts/
│   └── deploy.js                      # Deploy 
├── test/
│   └── HealthTracker.test.js          # 9 testes unitários
├── frontend/
│   ├── src/
│   │   ├── App.jsx                    # App principal
│   │   ├── hooks/
│   │   │   └── useWallet.js           # Conexão MetaMask
│   │   ├── components/
│   │   │   ├── FormularioConsulta.jsx # Registro de consulta
│   │   │   └── HistoricoConsultas.jsx # Histórico + verificação
│   │   └── utils/
│   │       ├── crypto.js              # AES-256-GCM + SHA-256
│   │       ├── storage.js             # localStorage criptografado
│   │       ├── ipfs.js                # Upload/download IPFS
│   │       └── contract.json          # ABI + endereço (gerado pelo deploy)
│   └── .env.example
├── .env.example
├── hardhat.config.js
├── package.json
└── README.md

## Segurança

Camada: Mecanismo
- Conteúdo da consulta: AES-256-GCM, chave = PBKDF2(wallet address)
- Arquivos/exames: Criptografados localmente antes do upload IPFS
- Blockchain: Apenas SHA-256 do dado cifrado — zero dado sensível on-chain
- Chave de criptografia: Nunca armazenada, nunca transmitida — deriva em tempo real
- Desenvolvedor: Tecnicamente impossível ler os dados dos usuários

## Stack

Solidity 0.8.24 · Hardhat · Sepolia Testnet · MetaMask · Ethers.js v6 · React 18 · Vite · Web Crypto API · IPFS/Pinata
