// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/**
 * @title HealthTracker
 * @notice Rastreabilidade de consultas de saúde na blockchain Sepolia.
 *
 * PRINCÍPIO DE PRIVACIDADE:
 *   - On-chain (público):  hash SHA-256 do dado criptografado + timestamp + wallet
 *   - Off-chain (privado): conteúdo real da consulta, criptografado no device do usuário
 *
 * Assim, qualquer pessoa pode VERIFICAR que um registro existe e não foi adulterado,
 * mas NINGUÉM consegue ler o conteúdo sem ser o próprio usuário.
 */
contract HealthTracker {

    // ── Estrutura de uma consulta (só metadados públicos) ─────────────────
    struct Consultation {
        bytes32 contentHash;  // SHA-256 do JSON criptografado (AES-256-GCM)
        bytes32 ipfsCidHash;  // SHA-256 do CID IPFS dos anexos (zero se sem anexo)
        uint256 timestamp;    // Unix timestamp do bloco
        address owner;        // Wallet que registrou
        bool exists;          // Controle interno de existência
    }

    // ── Armazenamento ──────────────────────────────────────────────────────
    mapping(address => bytes32[]) private userConsultations; // wallet → lista de IDs
    mapping(bytes32 => Consultation) private consultations;   // ID → dados

    uint256 public totalConsultations; // contador global (visível publicamente)

    // ── Eventos (ficam no log da blockchain, consultáveis pelo Etherscan) ──
    event ConsultationRegistered(
        bytes32 indexed consultationId,
        address indexed owner,
        bytes32 contentHash,
        bytes32 ipfsCidHash,
        uint256 timestamp
    );

    // ── Erros customizados (mais baratos que require com string) ───────────
    error HashVazio();
    error RegistroNaoEncontrado(bytes32 id);

    // ── FUNÇÃO PRINCIPAL: registrar uma consulta ──────────────────────────
    /**
     * @notice Registra o hash de uma consulta de saúde na blockchain.
     * @param contentHash  SHA-256 do conteúdo criptografado (gerado no browser).
     * @param ipfsCidHash  SHA-256 do CID IPFS dos anexos. Use bytes32(0) sem anexo.
     * @return consultationId  ID único desta consulta (gerado on-chain).
     */
    function registerConsultation(
        bytes32 contentHash,
        bytes32 ipfsCidHash
    ) external returns (bytes32 consultationId) {

        // Valida: não aceita hash vazio
        if (contentHash == bytes32(0)) revert HashVazio();

        // Gera ID único combinando hash + quem enviou + quando
        consultationId = keccak256(
            abi.encodePacked(contentHash, msg.sender, block.timestamp)
        );

        // Salva na blockchain
        consultations[consultationId] = Consultation({
            contentHash:  contentHash,
            ipfsCidHash:  ipfsCidHash,
            timestamp:    block.timestamp,
            owner:        msg.sender,
            exists:       true
        });

        userConsultations[msg.sender].push(consultationId);
        totalConsultations++;

        // Emite evento (fica no histórico público do Etherscan)
        emit ConsultationRegistered(
            consultationId,
            msg.sender,
            contentHash,
            ipfsCidHash,
            block.timestamp
        );
    }

    // ── VERIFICAÇÃO PÚBLICA: comparar hash local com hash on-chain ─────────
    /**
     * @notice Verifica se o conteúdo local bate com o hash registrado.
     *         Função "view" — não gasta gas, qualquer um pode chamar.
     * @return true se íntegro, false se o dado foi adulterado.
     */
    function verifyIntegrity(
        bytes32 consultationId,
        bytes32 contentHash
    ) external view returns (bool) {
        if (!consultations[consultationId].exists)
            revert RegistroNaoEncontrado(consultationId);
        return consultations[consultationId].contentHash == contentHash;
    }

    // ── LEITURA: buscar dados de uma consulta ──────────────────────────────
    /**
     * @notice Retorna os metadados públicos de uma consulta.
     *         Apenas hashes — o conteúdo real nunca foi para a blockchain.
     */
    function getConsultation(bytes32 consultationId)
        external view
        returns (
            bytes32 contentHash,
            bytes32 ipfsCidHash,
            uint256 timestamp,
            address owner
        )
    {
        if (!consultations[consultationId].exists)
            revert RegistroNaoEncontrado(consultationId);

        Consultation storage c = consultations[consultationId];
        return (c.contentHash, c.ipfsCidHash, c.timestamp, c.owner);
    }

    // ── LEITURA: listar todas as consultas de um usuário ──────────────────
    /**
     * @notice Retorna todos os IDs de consultas de uma wallet.
     */
    function getMyConsultations(address user)
        external view
        returns (bytes32[] memory)
    {
        return userConsultations[user];
    }
}
