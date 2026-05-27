import { useState } from "react";
import { useWallet } from "./hooks/useWallet.js";
import { FormularioConsulta } from "./components/FormularioConsulta.jsx";
import { HistoricoConsultas } from "./components/HistoricoConsultas.jsx";
import dadosContrato from "./utils/contract.json";

export default function App() {
  const { conta, contrato, erro, loading, conectar, desconectar } = useWallet();
  const [aba, setAba] = useState("historico");
  const [chaveRecarga, setChaveRecarga] = useState(0);

  const aoSalvar = () => {
    setChaveRecarga((k) => k + 1);
    setAba("historico");
  };

  return (
    <div style={s.app}>
      {/* ── Cabeçalho ── */}
      <header style={s.header}>
        <div style={s.headerInner}>
          <div style={s.logo}>
            <span style={{ fontSize: 22 }}>🩺</span>
            <div>
              <div style={s.logoNome}>HealthTracker</div>
              <div style={s.logoSub}>Sepolia Testnet · MVP</div>
            </div>
          </div>

          {conta ? (
            <div style={s.walletRow}>
              <div style={s.walletBadge}>
                <span style={s.dot} />
                {conta.slice(0, 6)}...{conta.slice(-4)} · Sepolia
              </div>
              <button onClick={desconectar} style={s.btnGhost}>Sair</button>
            </div>
          ) : (
            <button onClick={conectar} disabled={loading} style={s.btnPrimary}>
              {loading ? "Conectando..." : "Conectar MetaMask"}
            </button>
          )}
        </div>
      </header>

      <main style={s.main}>
        {/* Erro de conexão */}
        {erro && (
          <div style={s.erroBanner}>
            <strong>Atenção:</strong> {erro}
          </div>
        )}

        {/* Tela inicial (sem wallet) */}
        {!conta && (
          <div style={s.hero}>
            <div style={{ fontSize: 56, marginBottom: 16 }}>🩺⛓</div>
            <h1 style={s.heroTitulo}>Seu histórico de saúde na blockchain</h1>
            <p style={s.heroDesc}>
              Registre suas consultas com profissionais de saúde incluindo diagnósticos, recomendações, prescrições e anexos.
              Dados criptografados no seu dispositivo. Apenas a prova de integridade
              vai para a blockchain — imutável, rastreável, verificável por qualquer pessoa.
            </p>

            <div style={s.pilulas}>
              {[
                ["🔒", "AES-256-GCM"],
                ["⛓", "Sepolia Testnet"],
                ["🔑", "Chave = sua wallet"],
                ["📎", "IPFS / Pinata"],
                ["✅", "Verificação pública"],
              ].map(([icone, texto]) => (
                <div key={texto} style={s.pilula}>{icone} {texto}</div>
              ))}
            </div>

            <button onClick={conectar} disabled={loading} style={s.btnHero}>
              {loading ? "Conectando..." : "Conectar com MetaMask"}
            </button>

            <p style={s.contratoLink}>
              Contrato Sepolia:{" "}
              <a
                href={`https://sepolia.etherscan.io/address/${dadosContrato.enderecoContrato}`}
                target="_blank" rel="noreferrer"
                style={{ color: "var(--color-text-info)" }}
              >
                {dadosContrato.enderecoContrato?.slice(0, 10)}...
                {dadosContrato.enderecoContrato?.slice(-6)}
              </a>
            </p>
          </div>
        )}

        {/* App (com wallet conectada) */}
        {conta && (
          <>
            <div style={s.abas}>
              <button
                onClick={() => setAba("historico")}
                style={{ ...s.aba, ...(aba === "historico" ? s.abaAtiva : {}) }}
              >
                📋 Histórico
              </button>
              <button
                onClick={() => setAba("nova")}
                style={{ ...s.aba, ...(aba === "nova" ? s.abaAtiva : {}) }}
              >
                + Nova Consulta
              </button>
            </div>

            {aba === "historico" && (
              <HistoricoConsultas
                conta={conta}
                contrato={contrato}
                chaveRecarga={chaveRecarga}
              />
            )}
            {aba === "nova" && (
              <FormularioConsulta
                conta={conta}
                contrato={contrato}
                aoSalvar={aoSalvar}
              />
            )}
          </>
        )}
      </main>

      <footer style={s.footer}>
        HealthTracker MVP · Hackathon Web3 · Dados de saúde nunca saem do seu dispositivo sem criptografia
      </footer>
    </div>
  );
}

const s = {
  app: { minHeight: "100vh", background: "var(--color-background-tertiary)", fontFamily: "var(--font-sans)", display: "flex", flexDirection: "column" },
  header: { background: "var(--color-background-primary)", borderBottom: "1px solid var(--color-border-tertiary)", position: "sticky", top: 0, zIndex: 10 },
  headerInner: { maxWidth: 860, margin: "0 auto", padding: "0 1.25rem", height: 56, display: "flex", alignItems: "center", justifyContent: "space-between" },
  logo: { display: "flex", alignItems: "center", gap: 10 },
  logoNome: { fontWeight: 500, fontSize: 16, color: "var(--color-text-primary)", lineHeight: 1 },
  logoSub: { fontSize: 10, color: "var(--color-text-tertiary)", marginTop: 2 },
  walletRow: { display: "flex", alignItems: "center", gap: 8 },
  walletBadge: { display: "flex", alignItems: "center", gap: 6, background: "var(--color-background-success)", border: "1px solid var(--color-border-success)", borderRadius: 20, padding: "5px 12px", fontSize: 13, color: "var(--color-text-success)" },
  dot: { width: 7, height: 7, borderRadius: "50%", background: "var(--color-text-success)" },
  btnPrimary: { background: "var(--color-text-primary)", color: "var(--color-background-primary)", border: "none", borderRadius: 8, padding: "9px 18px", fontSize: 14, fontWeight: 500, cursor: "pointer" },
  btnGhost: { background: "transparent", border: "1px solid var(--color-border-secondary)", borderRadius: 8, padding: "7px 12px", fontSize: 13, color: "var(--color-text-secondary)", cursor: "pointer" },
  main: { maxWidth: 860, margin: "0 auto", padding: "1.5rem 1.25rem", flex: 1, width: "100%" },
  erroBanner: { background: "var(--color-background-danger)", border: "1px solid var(--color-border-danger)", borderRadius: 8, padding: "10px 14px", marginBottom: 16, fontSize: 14, color: "var(--color-text-danger)", whiteSpace: "pre-line" },
  hero: { textAlign: "center", padding: "4rem 1rem 3rem" },
  heroTitulo: { fontSize: 26, fontWeight: 500, color: "var(--color-text-primary)", marginBottom: 12, lineHeight: 1.3 },
  heroDesc: { fontSize: 15, color: "var(--color-text-secondary)", maxWidth: 520, margin: "0 auto 24px", lineHeight: 1.7 },
  pilulas: { display: "flex", gap: 8, justifyContent: "center", flexWrap: "wrap", marginBottom: 28 },
  pilula: { display: "inline-flex", alignItems: "center", gap: 5, background: "var(--color-background-secondary)", border: "1px solid var(--color-border-tertiary)", borderRadius: 20, padding: "5px 12px", fontSize: 13, color: "var(--color-text-secondary)" },
  btnHero: { background: "var(--color-text-primary)", color: "var(--color-background-primary)", border: "none", borderRadius: 10, padding: "13px 28px", fontSize: 16, fontWeight: 500, cursor: "pointer", marginBottom: 16 },
  contratoLink: { fontSize: 12, color: "var(--color-text-tertiary)" },
  abas: { display: "flex", gap: 8, marginBottom: 16 },
  aba: { padding: "9px 18px", borderRadius: 8, border: "1px solid var(--color-border-secondary)", background: "var(--color-background-primary)", cursor: "pointer", fontSize: 14, color: "var(--color-text-secondary)", fontWeight: 500 },
  abaAtiva: { background: "var(--color-text-primary)", color: "var(--color-background-primary)", borderColor: "var(--color-text-primary)" },
  footer: { textAlign: "center", padding: "1rem", fontSize: 11, color: "var(--color-text-tertiary)", borderTop: "1px solid var(--color-border-tertiary)", marginTop: "auto" },
};
