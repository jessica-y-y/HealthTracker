import { useState, useEffect } from "react";
import { decrypt, sha256 } from "../utils/crypto.js";
import { carregarLocal } from "../utils/storage.js";
import { baixarArquivoDecriptografado } from "../utils/ipfs.js";
import { ethers } from "ethers";

export function HistoricoConsultas({ conta, contrato, chaveRecarga }) {
  const [consultas, setConsultas] = useState([]);
  const [expandida, setExpandida] = useState(null);
  const [verificando, setVerificando] = useState(null);
  const [resultadoVerificacao, setResultadoVerificacao] = useState({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (conta && contrato) carregarHistorico();
  }, [conta, contrato, chaveRecarga]);

  const carregarHistorico = async () => {
    setLoading(true);
    try {
      // Busca todos os IDs on-chain desta wallet
      const idsOnChain = await contrato.getMyConsultations(conta);

      const itens = [];
      // Percorre do mais recente para o mais antigo
      for (const id of [...idsOnChain].reverse()) {
        const rawLocal = carregarLocal(id);
        let dadosDecifrados = null;

        if (rawLocal) {
          try {
            dadosDecifrados = await decrypt(rawLocal, conta);
          } catch {
            // Chave diferente (outro dispositivo) — mostra só dados on-chain
          }
        }

        // Carrega metadados da transação (txHash, bloco) salvos separadamente
        let meta = null;
        const rawMeta = carregarLocal(id + "_meta");
        if (rawMeta) {
          try { meta = JSON.parse(rawMeta); } catch { /* ignora */ }
        }

        // Busca metadados públicos on-chain
        const [contentHash, ipfsCidHash, timestamp] =
          await contrato.getConsultation(id);

        itens.push({
          id,
          contentHash,
          ipfsCidHash,
          timestamp:   Number(timestamp),
          temLocal:    !!rawLocal,
          dados:       dadosDecifrados,
          meta,
        });
      }
      setConsultas(itens);
    } catch (err) {
      console.error("Erro ao carregar histórico:", err);
    } finally {
      setLoading(false);
    }
  };

  const verificarIntegridade = async (item) => {
    setVerificando(item.id);
    try {
      const rawLocal = carregarLocal(item.id);
      if (!rawLocal) {
        setResultadoVerificacao((v) => ({
          ...v, [item.id]: { ok: false, msg: "Dado local não encontrado neste dispositivo." }
        }));
        return;
      }
      const hashLocal = await sha256(rawLocal);
      // verifyIntegrity é "view" — não gasta gas, não abre MetaMask
      const integro = await contrato.verifyIntegrity(item.id, hashLocal);
      setResultadoVerificacao((v) => ({
        ...v, [item.id]: {
          ok: integro,
          msg: integro
            ? "✅ Integridade confirmada — dado não foi alterado desde o registro."
            : "⚠️ Hash diverge — o dado local pode ter sido modificado.",
        }
      }));
    } catch (err) {
      setResultadoVerificacao((v) => ({
        ...v, [item.id]: { ok: false, msg: "Erro: " + err.message }
      }));
    } finally {
      setVerificando(null);
    }
  };

  if (loading) {
    return (
      <div style={s.card}>
        <p style={{ textAlign: "center", color: "var(--color-text-tertiary)", padding: "2rem" }}>
          Carregando histórico on-chain...
        </p>
      </div>
    );
  }

  if (consultas.length === 0) {
    return (
      <div style={s.card}>
        <h2 style={s.titulo}>Histórico de Consultas</h2>
        <div style={s.vazio}>
          <span style={{ fontSize: 48 }}>🩺</span>
          <p style={{ fontWeight: 500 }}>Nenhuma consulta registrada ainda.</p>
          <p style={{ fontSize: 13, color: "var(--color-text-tertiary)" }}>
            Clique em "Nova Consulta" para começar seu histórico.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={s.card}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <h2 style={s.titulo}>Histórico de Consultas</h2>
        <span style={s.badge}>{consultas.length} registro(s)</span>
      </div>

      {consultas.map((item) => {
        const aberta = expandida === item.id;
        const vr     = resultadoVerificacao[item.id];
        const d      = item.dados;
        const data   = d?.dataConsulta
          ? new Date(d.dataConsulta + "T12:00:00").toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" })
          : new Date(item.timestamp * 1000).toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });

        return (
          <div key={item.id} style={s.registro}>
            {/* Cabeçalho clicável */}
            <div style={s.cabecalho} onClick={() => setExpandida(aberta ? null : item.id)}>
              <div>
                <div style={s.registroTitulo}>
              {d?.diagnostico || "Diagnostico nao disponivel localmente"}
            </div>
            <div style={s.registroMeta}>
              {d?.nomeProfissional && (
                <span style={s.tagEspecialidade}>{d.nomeProfissional}</span>
              )}
              {d?.especialidade && (
                <span style={s.tagEspecialidade}>{d.especialidade}</span>
              )}
              📅 {data}
              {d?.localAtendimento && <span>· 📍 {d.localAtendimento}</span>}
              {item.temLocal
                ? <span style={s.tagLocal}>dado local</span>
                : <span style={s.tagSemLocal}>sem dado local</span>
              }
              {item.ipfsCidHash !== ethers.ZeroHash && (
                    <span style={s.tagIpfs}>📎 anexo IPFS</span>
                  )}
                </div>
              </div>
              <span style={{ color: "var(--color-text-tertiary)", fontSize: 12 }}>
                {aberta ? "▲" : "▼"}
              </span>
            </div>

            {/* Conteúdo expandido */}
            {aberta && (
              <div style={s.corpo}>
                {d ? (
                  <>
                    {d.registro && <InfoLinha label="Nº de registro" valor={d.registro} />}
                    {d.sintomas && <InfoBloco label="Sintomas / motivo" valor={d.sintomas} />}
                    {d.diagnostico && <InfoBloco label="Diagnóstico" valor={d.diagnostico} />}
                    {d.recomendacoesOrientacoes && <InfoBloco label="Recomendações e orientações" valor={d.recomendacoesOrientacoes} />}
                    {d.medicacoes && <InfoBloco label="Medicações e posologia" valor={d.medicacoes} />}
                    {d.observacoes && <InfoBloco label="Observações" valor={d.observacoes} />}

                    {d.anexos?.length > 0 && (
                      <div style={{ marginTop: 12 }}>
                        <p style={s.subtitulo}>Anexos</p>
                        {d.anexos.map((a, i) => (
                          <button key={i} style={s.btnAnexo}
                            onClick={() => baixarArquivoDecriptografado(a.cid, conta, a.nome)}>
                            📄 {a.nome} — baixar e descriptografar
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                ) : (
                  <p style={{ color: "var(--color-text-tertiary)", fontSize: 13, marginBottom: 12 }}>
                    Conteúdo não disponível neste dispositivo.
                    (Registrado com outra wallet ou em outro dispositivo.)
                  </p>
                )}

                {/* Dados on-chain */}
                <div style={s.blocoChain}>
                  <p style={s.subtitulo}>Rastreabilidade on-chain (Sepolia)</p>
                  <HashLinha label="ID da consulta"   valor={item.id} />
                  <HashLinha label="Hash do conteudo" valor={item.contentHash} />
                  <HashLinha label="Registrado em"
                    valor={new Date(item.timestamp * 1000).toLocaleString("pt-BR")} monospace={false} />
                  {item.meta?.txHash && (
                    <HashLinha label="TX Hash" valor={item.meta.txHash} />
                  )}
                  {item.meta?.bloco && (
                    <HashLinha label="Bloco" valor={String(item.meta.bloco)} monospace={false} />
                  )}

                  <div style={{ display: "flex", gap: 8, marginTop: 12, flexWrap: "wrap" }}>
                    <button style={s.btnOutline}
                      onClick={() => verificarIntegridade(item)}
                      disabled={verificando === item.id || !item.temLocal}>
                      {verificando === item.id ? "Verificando..." : "Verificar integridade"}
                    </button>
                    <a
                      href={item.meta?.txHash
                        ? `https://sepolia.etherscan.io/tx/${item.meta.txHash}`
                        : `https://sepolia.etherscan.io/address/${conta}#events`}
                      target="_blank" rel="noreferrer"
                      style={{ ...s.btnOutline, textDecoration: "none" }}>
                      Ver no Etherscan
                    </a>
                  </div>

                  {vr && (
                    <div style={{
                      marginTop: 10, padding: "8px 12px", borderRadius: 6, fontSize: 13,
                      background: vr.ok ? "var(--color-background-success)" : "var(--color-background-danger)",
                      color:      vr.ok ? "var(--color-text-success)"      : "var(--color-text-danger)",
                    }}>
                      {vr.msg}
                    </div>
                  )}
                </div>
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

function InfoLinha({ label, valor }) {
  return (
    <div style={{ marginBottom: 8 }}>
      <span style={{ fontSize: 11, fontWeight: 500, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em" }}>{label}: </span>
      <span style={{ fontSize: 14, color: "var(--color-text-primary)" }}>{valor}</span>
    </div>
  );
}

function InfoBloco({ label, valor }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <p style={{ fontSize: 11, fontWeight: 500, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 4 }}>{label}</p>
      <p style={{ fontSize: 14, color: "var(--color-text-primary)", lineHeight: 1.6, whiteSpace: "pre-wrap" }}>{valor}</p>
    </div>
  );
}

function HashLinha({ label, valor, monospace = true }) {
  return (
    <div style={{ display: "flex", gap: 8, marginBottom: 4, alignItems: "flex-start" }}>
      <span style={{ fontSize: 11, color: "var(--color-text-tertiary)", minWidth: 120 }}>{label}</span>
      <code style={{ fontSize: 11, fontFamily: monospace ? "monospace" : "inherit", color: "var(--color-text-secondary)", wordBreak: "break-all" }}>
        {monospace ? `${valor.slice(0, 22)}...${valor.slice(-8)}` : valor}
      </code>
    </div>
  );
}

const s = {
  card: { background: "var(--color-background-primary)", border: "1px solid var(--color-border-tertiary)", borderRadius: 16, padding: "1.5rem" },
  titulo: { fontSize: 18, fontWeight: 500, color: "var(--color-text-primary)", margin: 0 },
  badge: { background: "var(--color-background-secondary)", border: "1px solid var(--color-border-tertiary)", borderRadius: 20, padding: "3px 12px", fontSize: 13, color: "var(--color-text-secondary)" },
  vazio: { textAlign: "center", padding: "3rem 1rem", color: "var(--color-text-secondary)", display: "flex", flexDirection: "column", alignItems: "center", gap: 8 },
  registro: { border: "1px solid var(--color-border-tertiary)", borderRadius: 10, marginBottom: 10, overflow: "hidden" },
  cabecalho: { padding: "14px 16px", cursor: "pointer", display: "flex", justifyContent: "space-between", alignItems: "center", background: "var(--color-background-secondary)" },
  registroTitulo: { fontWeight: 500, fontSize: 15, color: "var(--color-text-primary)", display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" },
  registroMeta: { fontSize: 12, color: "var(--color-text-tertiary)", marginTop: 4, display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" },
  tagEspecialidade: { fontSize: 11, background: "var(--color-background-info)", color: "var(--color-text-info)", padding: "2px 8px", borderRadius: 10 },
  tagLocal: { fontSize: 11, background: "var(--color-background-success)", color: "var(--color-text-success)", padding: "1px 8px", borderRadius: 8 },
  tagSemLocal: { fontSize: 11, background: "var(--color-background-warning)", color: "var(--color-text-warning)", padding: "1px 8px", borderRadius: 8 },
  tagIpfs: { fontSize: 11, background: "var(--color-background-secondary)", color: "var(--color-text-secondary)", padding: "1px 8px", borderRadius: 8 },
  corpo: { padding: "16px", borderTop: "1px solid var(--color-border-tertiary)" },
  subtitulo: { fontSize: 11, fontWeight: 500, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 8 },
  blocoChain: { marginTop: 16, padding: "12px", background: "var(--color-background-secondary)", borderRadius: 8 },
  btnOutline: { padding: "7px 14px", border: "1px solid var(--color-border-secondary)", borderRadius: 8, background: "var(--color-background-primary)", cursor: "pointer", fontSize: 13, color: "var(--color-text-primary)" },
  btnAnexo: { display: "block", width: "100%", textAlign: "left", padding: "8px 12px", border: "1px solid var(--color-border-tertiary)", borderRadius: 8, background: "var(--color-background-secondary)", cursor: "pointer", fontSize: 13, marginBottom: 6, color: "var(--color-text-primary)" },
};
