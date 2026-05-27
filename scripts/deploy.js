/**
 * scripts/deploy.js
 *
 * O que faz este script?
 * 1. Conecta na Sepolia usando suas credenciais do .env
 * 2. Compila e faz o deploy do contrato HealthTracker
 * 3. Aguarda confirmação na blockchain
 * 4. Salva o endereço e a ABI para o frontend usar
 */

const { ethers } = require("hardhat");
const fs = require("fs");    // módulo nativo do Node para ler/escrever arquivos
const path = require("path");

async function main() {
  console.log("\n╔══════════════════════════════════════════╗");
  console.log("║    HealthTracker — Deploy na Sepolia     ║");
  console.log("╚══════════════════════════════════════════╝\n");

  // ── Pega a conta que vai fazer o deploy ──────────────────────────────────
  // ethers.getSigners() lê a PRIVATE_KEY do .env e cria a conta
  const [deployer] = await ethers.getSigners();

  console.log(" Conta de deploy:", deployer.address);

  // Verifica o saldo (precisa de ETH Sepolia para pagar o gas do deploy)
  const saldo = await ethers.provider.getBalance(deployer.address);
  const saldoFormatado = ethers.formatEther(saldo);
  console.log(" Saldo:", saldoFormatado, "ETH Sepolia\n");

  if (saldo === 0n) {
    throw new Error(
      "\n Saldo zero! Você precisa de ETH Sepolia de teste.\n" +
      "   Acesse: https://sepoliafaucet.com\n" +
      "   Cole seu endereço: " + deployer.address
    );
  }

  // ── Compila e faz o deploy ───────────────────────────────────────────────
  console.log(" Compilando contrato HealthTracker...");
  const HealthTrackerFactory = await ethers.getContractFactory("HealthTracker");

  console.log(" Enviando transação de deploy para a Sepolia...");
  const healthtracker = await HealthTrackerFactory.deploy();

  console.log(" Aguardando confirmação na blockchain...");
  await healthtracker.waitForDeployment();

  // ── Coleta informações do deploy ─────────────────────────────────────────
  const enderecoContrato = await healthtracker.getAddress();
  const txDeploy = healthtracker.deploymentTransaction();

  console.log("\n DEPLOY REALIZADO COM SUCESSO!");
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log(" Endereço do contrato :", enderecoContrato);
  console.log(" Hash da transação    :", txDeploy.hash);
  console.log("━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━");
  console.log("\n Ver no Etherscan Sepolia:");
  console.log(`   https://sepolia.etherscan.io/address/${enderecoContrato}`);
  console.log(`   https://sepolia.etherscan.io/tx/${txDeploy.hash}`);

  // ── Salva informações para usar depois ───────────────────────────────────

  // 1. deployment.json — referência rápida com endereço e data
  const infosDeploy = {
    rede: "sepolia",
    enderecoContrato: enderecoContrato,
    deployer: deployer.address,
    hashTransacao: txDeploy.hash,
    dataHora: new Date().toISOString(),
  };
  fs.writeFileSync("deployment.json", JSON.stringify(infosDeploy, null, 2));
  console.log("\n📄 deployment.json salvo na raiz do projeto.");

  // 2. frontend/src/utils/contract.json — ABI + endereço para o React usar
  // ABI = "Application Binary Interface" = mapa de todas as funções do contrato
  const caminhoArtifact = path.join(
    __dirname,
    "../artifacts/contracts/HealthTracker.sol/HealthTracker.json"
  );

  if (fs.existsSync(caminhoArtifact)) {
    const artifact = JSON.parse(fs.readFileSync(caminhoArtifact, "utf8"));

    const dadosFrontend = {
      enderecoContrato: enderecoContrato,
      abi: artifact.abi,
      rede: "sepolia",
      chainId: 11155111,
    };

    const pastaUtils = path.join(__dirname, "../frontend/src/utils");
    fs.mkdirSync(pastaUtils, { recursive: true });
    fs.writeFileSync(
      path.join(pastaUtils, "contract.json"),
      JSON.stringify(dadosFrontend, null, 2)
    );
    console.log(" ABI + endereço copiados para frontend/src/utils/contract.json");
  }

  // ── Próximos passos ──────────────────────────────────────────────────────
  console.log("\n PRÓXIMOS PASSOS:");
  console.log("   1. Colar o endereço do contrato no README.md");
  console.log("   2. Verifique no Etherscan ");
  console.log("   3. Commit e push para o GitHub:");
  console.log("      git add . && git commit -m 'deploy: contrato Sepolia' && git push");
  console.log("   4. Próximos passos: cd frontend && npm install && npm run dev\n");
}

main()
  .then(() => process.exit(0))
  .catch((erro) => {
    console.error("\n Deploy falhou:", erro.message);
    process.exit(1);
  });
