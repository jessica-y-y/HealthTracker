// Carrega variáveis do arquivo .env (PRIVATE_KEY, SEPOLIA_RPC_URL, etc.)
require("dotenv").config();

// Carrega o plugin do Hardhat que inclui testes, cobertura e deploy
require("@nomicfoundation/hardhat-toolbox");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    version: "0.8.24",           // versão do compilador Solidity
    settings: {
      optimizer: {
        enabled: true,           // otimiza o bytecode (reduz custo de gas)
        runs: 200,
      },
    },
  },
  networks: {
    // Rede local para testes rápidos (hardhat node)
    localhost: {
      url: "http://127.0.0.1:8545",
    },
    // Rede de teste pública Ethereum
    sepolia: {
      url: process.env.SEPOLIA_RPC_URL || "https://rpc.sepolia.org",
      accounts: process.env.PRIVATE_KEY
        ? [`0x${process.env.PRIVATE_KEY}`]  // adiciona 0x se não tiver
        : [],
    },
  },
  // Etherscan: usado para verificar/publicar o código-fonte do contrato
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY || "",
  },
};
