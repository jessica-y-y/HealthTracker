# HealthTracker
Rastreabilidade de consultas de saúde com privacidade por criptografia e imutabilidade blockchain.

HackWeb | Web3.0 RESTIC 29 | Desafio 1 ProofChain

## Sobre o projeto
Hoje não existe um histórico de saúde: cada consulta fica armazenda em cada instituição de saúde (quando fica) e as pessoas perdem informações que elas nem sabem que são valiosas sobre a sua saúde. Isso dificulta diagnósticos importantes, pois toda consulta de saúde começa do zero, o paciente não sabe o que é relevante de ser informado e o profissional não tem o tempo necessário para recomeçar uma investigação sobre a vida do paciente em cada novo contato. Esse projeto é o histórico portátil e de posse do paciente, que pode ser compartilhado com os profissionais de saúde para consultarem o que é relevante de acordo com cada paciente e podem tomar melhores decisões, com base em dados confiáveis, com prova criptografica de 
que nao foram adulterados.

## Objetivo
Construir uma solução auditavel utilizando blockchain para registro 
imutável de consultas de saúde, garantindo autenticidade, 
rastreabilidade e integridade dos registros sem depender de uma 
autoridade central.

## Requisitos mínimos:
- Registro on-chain de informações: `registerConsultation()` registra hash SHA-256 na Sepolia  
- Consulta publica: `verifyIntegrity()` + Etherscan público
- Contrato deployado (e verificado) em testnet pública:  Sepolia 
        Endereço: 0x69E709494B364A0807D5130c78aA9f0631C6FA53
        Etherscan [Ver contrato]: https://sepolia.etherscan.io/address/0x69E709494B364A0807D5130c78aA9f0631C6FA53
        TX Hash deploy: 0x70834e54d65a2ddb2b84d22f5152c675191786a4c49b6209236e887686225bc3
- README (este documento)
- Vídeo pitch: https://www.youtube.com/watch?v=Xfj54bNFVmw
- Apresentação (slides): https://drive.google.com/file/d/1Ykqshy3FDXTUsCjR1VjdfkwYb9pfruPd/view?usp=sharing
- App funcionando: https://jessica-y-y.github.io/HealthTracker/

## Tecnologias
Solidity 0.8.24 · Hardhat · Sepolia Testnet · MetaMask · Ethers.js v6 · React 18 · Vite · Web Crypto API · IPFS/Pinata


## Estrutura
/contracts   — contrato Solidity HealthTracker.sol
/frontend    — app React com MetaMask e criptografia local
/scripts     — script de deploy automatizado
/test        — testes unitarios do contrato (13 testes)
/docs        — links e endereços do contrato verificado e do app funcionando

## Como iniciar
- Instalar dependencias
npm install
- Compilar contratos
npx hardhat compile
- Rodar testes
npm test
- Deploy na Sepolia
npm run deploy:sepolia
- Rodar o frontend
cd frontend && npm install && npm run dev

## Equipe
Jéssica Yule

## Como funciona 
1. Usuário preenche a consulta no app (frontend)
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


## Segurança
Camada: Mecanismo
- Conteúdo da consulta: AES-256-GCM, chave = PBKDF2(wallet address)
- Arquivos/exames: Criptografados localmente antes do upload IPFS
- Blockchain: Apenas SHA-256 do dado cifrado — zero dado sensível on-chain
- Chave de criptografia: Nunca armazenada, nunca transmitida — deriva em tempo real
- Desenvolvedor: Tecnicamente impossível ler os dados dos usuários



