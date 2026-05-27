import { useState, useCallback } from "react";
import { ethers } from "ethers";
import dadosContrato from "../utils/contract.json";

/**
 * useWallet — hook React para gerenciar a conexão com a MetaMask
 *
 * O QUE É UM HOOK?
 *   Em React, hooks são funções que começam com "use" e permitem
 *   que componentes tenham estado e efeitos colaterais.
 *   Este hook encapsula toda a lógica de conexão com a MetaMask.
 *
 * O QUE É METAMASK?
 *   É uma extensão do browser que funciona como carteira blockchain.
 *   Ela injeta window.ethereum na página, que usamos para:
 *   - Pedir ao usuário para conectar sua conta
 *   - Assinar e enviar transações
 *   - Chamar funções de contratos
 */
export function useWallet() {
  const [conta, setConta]       = useState(null);    // endereço conectado
  const [contrato, setContrato] = useState(null);    // instância do contrato
  const [erro, setErro]         = useState(null);    // mensagem de erro
  const [loading, setLoading]   = useState(false);   // estado de carregamento

  /**
   * Conecta a MetaMask e valida que está na rede Sepolia.
   */
  const conectar = useCallback(async () => {
    setErro(null);

    // Verifica se a MetaMask está instalada
    if (!window.ethereum) {
      setErro(
        "MetaMask não encontrada! " +
        "Instale em metamask.io e recarregue a página."
      );
      return;
    }

    try {
      setLoading(true);

      // Cria um "provider" — objeto que fala com a blockchain via MetaMask
      const provider = new ethers.BrowserProvider(window.ethereum);

      // Pede ao usuário para aprovar a conexão (abre popup da MetaMask)
      const contas = await provider.send("eth_requestAccounts", []);

      // Verifica se está na rede Sepolia (chainId = 11155111)
      const rede = await provider.getNetwork();
      if (rede.chainId !== 11155111n) {
        setErro(
          "Por favor, troque para a rede Sepolia Testnet na MetaMask.\n" +
          "Clique na rede atual > Sepolia. Se não aparecer: " +
          "Configurações > Redes avançadas > Mostrar testnets."
        );
        return;
      }

      // "Signer" = conta que vai assinar (autorizar) as transações
      const signer = await provider.getSigner();

      // Cria a instância do contrato para chamar suas funções
      const instanciaContrato = new ethers.Contract(
        dadosContrato.enderecoContrato,   // endereço na Sepolia
        dadosContrato.abi,                // mapa das funções
        signer                            // quem vai assinar as transações
      );

      setConta(contas[0]);
      setContrato(instanciaContrato);

    } catch (e) {
      if (e.code === 4001) {
        setErro("Conexão recusada. Clique em 'Conectar MetaMask' novamente.");
      } else {
        setErro("Erro ao conectar: " + e.message);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  /**
   * Desconecta (limpa o estado local — a MetaMask continua conectada ao site).
   */
  const desconectar = useCallback(() => {
    setConta(null);
    setContrato(null);
  }, []);

  return { conta, contrato, erro, loading, conectar, desconectar };
}
