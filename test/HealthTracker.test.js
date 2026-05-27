// Importa ferramentas de teste
const { expect } = require("chai");     // biblioteca de asserções (verificações)
const { ethers } = require("hardhat");  // acesso ao Ethereum via Hardhat

/**
 * Suite de testes do contrato HealthTracker.
 *
 * O que são testes automatizados?
 * São funções que verificam se o contrato se comporta exatamente
 * como esperado — antes de subir para a blockchain real.
 * Rodar antes do deploy evita gastar ETH com contratos bugados.
 */
describe("HealthTracker", function () {

  // Variáveis compartilhadas entre os testes
  let contract;   // instância do contrato deployado localmente
  let owner;      // conta que fez o deploy
  let user1;      // conta simulando usuário 1
  let user2;      // conta simulando usuário 2

  // Hashes de exemplo — simulam o SHA-256 de dados reais criptografados
  const HASH_CONSULTA_1 = ethers.keccak256(
    ethers.toUtf8Bytes("consulta_criptografada_usuario_1")
  );
  const HASH_CONSULTA_2 = ethers.keccak256(
    ethers.toUtf8Bytes("consulta_criptografada_usuario_2")
  );
  const HASH_IPFS = ethers.keccak256(
    ethers.toUtf8Bytes("cid_ipfs_dos_anexos")
  );
  const SEM_ANEXO = ethers.ZeroHash; // bytes32(0) = sem anexo IPFS

  // beforeEach: executado ANTES de cada teste — garante estado limpo
  beforeEach(async function () {
    // Pega as contas de teste geradas pelo Hardhat (endereços simulados)
    [owner, user1, user2] = await ethers.getSigners();

    // Faz o deploy do contrato na rede local (sem custo, sem ETH real)
    const Factory = await ethers.getContractFactory("HealthTracker");
    contract = await Factory.deploy();
    // Aguarda o deploy ser minerado localmente
    await contract.waitForDeployment();
  });

  // ── Grupo 1: Deploy ───────────────────────────────────────────────────────
  describe("Deploy inicial", function () {
    it("deve iniciar com zero consultas registradas", async function () {
      const total = await contract.totalConsultations();
      expect(total).to.equal(0);
    });
  });

  // ── Grupo 2: Registrar consulta ───────────────────────────────────────────
  describe("registerConsultation", function () {

    it("deve registrar uma consulta SEM anexo e emitir o evento correto", async function () {
      // user1 chama a função de registro
      const tx = await contract
        .connect(user1)
        .registerConsultation(HASH_CONSULTA_1, SEM_ANEXO);

      // Verifica se o evento ConsultationRegistered foi emitido
      await expect(tx).to.emit(contract, "ConsultationRegistered");
    });

    it("deve registrar uma consulta COM hash de anexo IPFS", async function () {
      const tx = await contract
        .connect(user1)
        .registerConsultation(HASH_CONSULTA_1, HASH_IPFS);

      await expect(tx).to.emit(contract, "ConsultationRegistered");
    });

    it("deve incrementar o contador total de consultas", async function () {
      await contract.connect(user1).registerConsultation(HASH_CONSULTA_1, SEM_ANEXO);
      await contract.connect(user1).registerConsultation(HASH_CONSULTA_2, SEM_ANEXO);

      const total = await contract.totalConsultations();
      expect(total).to.equal(2);
    });

    it("deve REJEITAR hash vazio (proteção contra registro sem dado)", async function () {
      // Tenta registrar com bytes32(0) — deve falhar com o erro HashVazio
      await expect(
        contract.connect(user1).registerConsultation(SEM_ANEXO, SEM_ANEXO)
      ).to.be.revertedWithCustomError(contract, "HashVazio");
    });

    it("dois usuários diferentes devem ter listas de consultas independentes", async function () {
      await contract.connect(user1).registerConsultation(HASH_CONSULTA_1, SEM_ANEXO);
      await contract.connect(user2).registerConsultation(HASH_CONSULTA_2, SEM_ANEXO);

      const idsUser1 = await contract.getMyConsultations(user1.address);
      const idsUser2 = await contract.getMyConsultations(user2.address);

      expect(idsUser1.length).to.equal(1);
      expect(idsUser2.length).to.equal(1);
      // Os IDs devem ser diferentes
      expect(idsUser1[0]).to.not.equal(idsUser2[0]);
    });
  });

  // ── Grupo 3: Verificação de integridade ──────────────────────────────────
  describe("verifyIntegrity", function () {

    // Função auxiliar: registra e retorna o ID da consulta
    async function registrarEObterID(user, hash) {
      const tx = await contract.connect(user).registerConsultation(hash, SEM_ANEXO);
      const receipt = await tx.wait();
      const evento = receipt.logs.find(
        (log) => log.fragment?.name === "ConsultationRegistered"
      );
      return evento.args.consultationId;
    }

    it("deve retornar TRUE para hash correto (dado íntegro)", async function () {
      const id = await registrarEObterID(user1, HASH_CONSULTA_1);

      // Compara o hash original com o que está on-chain
      const integro = await contract.verifyIntegrity(id, HASH_CONSULTA_1);
      expect(integro).to.be.true;
    });

    it("deve retornar FALSE para hash diferente (dado adulterado)", async function () {
      const id = await registrarEObterID(user1, HASH_CONSULTA_1);

      // Simula adulteração: passa um hash diferente
      const hashAdulterado = ethers.keccak256(
        ethers.toUtf8Bytes("dado_modificado_maliciosamente")
      );
      const integro = await contract.verifyIntegrity(id, hashAdulterado);
      expect(integro).to.be.false;
    });

    it("deve falhar ao verificar ID que não existe", async function () {
      const idInexistente = ethers.keccak256(ethers.toUtf8Bytes("nao_existe"));
      await expect(
        contract.verifyIntegrity(idInexistente, HASH_CONSULTA_1)
      ).to.be.revertedWithCustomError(contract, "RegistroNaoEncontrado");
    });
  });

  // ── Grupo 4: Leitura de dados ─────────────────────────────────────────────
  describe("getConsultation", function () {

    it("deve retornar os dados corretos de uma consulta registrada", async function () {
      // Registra com IPFS hash
      const tx = await contract
        .connect(user1)
        .registerConsultation(HASH_CONSULTA_1, HASH_IPFS);
      const receipt = await tx.wait();
      const evento = receipt.logs.find(
        (log) => log.fragment?.name === "ConsultationRegistered"
      );
      const id = evento.args.consultationId;

      // Busca e verifica os dados
      const [contentHash, ipfsCidHash, timestamp, owner] =
        await contract.getConsultation(id);

      expect(contentHash).to.equal(HASH_CONSULTA_1);
      expect(ipfsCidHash).to.equal(HASH_IPFS);
      expect(timestamp).to.be.gt(0);                    // timestamp não é zero
      expect(owner).to.equal(user1.address);            // dono é o user1
    });

    it("deve falhar ao buscar ID inexistente", async function () {
      const idFalso = ethers.keccak256(ethers.toUtf8Bytes("falso"));
      await expect(
        contract.getConsultation(idFalso)
      ).to.be.revertedWithCustomError(contract, "RegistroNaoEncontrado");
    });
  });

  // ── Grupo 5: Lista de consultas do usuário ────────────────────────────────
  describe("getMyConsultations", function () {

    it("deve retornar lista vazia para usuário sem registros", async function () {
      const ids = await contract.getMyConsultations(user1.address);
      expect(ids.length).to.equal(0);
    });

    it("deve retornar todos os IDs registrados pelo usuário", async function () {
      // Registra 3 consultas diferentes
      const hashes = [
        ethers.keccak256(ethers.toUtf8Bytes("consulta_a")),
        ethers.keccak256(ethers.toUtf8Bytes("consulta_b")),
        ethers.keccak256(ethers.toUtf8Bytes("consulta_c")),
      ];
      for (const h of hashes) {
        await contract.connect(user1).registerConsultation(h, SEM_ANEXO);
      }

      const ids = await contract.getMyConsultations(user1.address);
      expect(ids.length).to.equal(3);
    });
  });
});
