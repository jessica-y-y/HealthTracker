import { useState } from "react";
import { ethers } from "ethers";
import { encrypt, sha256 } from "../utils/crypto.js";
import { salvarLocal } from "../utils/storage.js";
import { uploadArquivoCriptografado } from "../utils/ipfs.js";

const PINATA_JWT = import.meta.env.VITE_PINATA_JWT || "";

const FORM_VAZIO = {
  dataConsulta:    new Date().toISOString().split("T")[0],
  nomeProfissional: "",
  registro:        "",       // CRM, CRN, CRO, CRP, etc.
  especialidade:   "",
  localAtendimento:"",
  sintomas:        "",
  diagnostico:     "",
  recomendacoesOrientacoes:     "",
  medicacoes:      "",
  observacoes:     "",
};

const ETAPAS = [
  "",
  "Enviando anexos para IPFS...",
  "Criptografando dados...",
  "Aguardando MetaMask...",
  "Confirmando na blockchain...",
  "Finalizando...",
];

export function FormularioConsulta({ conta, contrato, aoSalvar }) {
  const [form, setForm]     = useState(FORM_VAZIO);
  const [arquivos, setArquivos] = useState([]);
  const [status, setStatus] = useState(null);
  const [loading, setLoading] = useState(false);
  const [etapa, setEtapa]   = useState(0);

  const atualizar = (campo) => (e) =>
    setForm((f) => ({ ...f, [campo]: e.target.value }));

  const handleArquivos = (e) => {
    const selecionados = Array.from(e.target.files || []);
    const grandes = selecionados.filter((f) => f.size > 15 * 1024 * 1024);
    if (grandes.length) {
      setStatus({ tipo: "erro", msg: "Arquivos devem ter menos de 15 MB cada." });
      return;
    }
    setArquivos(selecionados);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.nomeProfissional || !form.diagnostico) {
      setStatus({ tipo: "erro", msg: "Preencha ao menos: nome do profissional e diagnóstico." });
      return;
    }

    try {
      setLoading(true);
      setStatus(null);

      // Monta o payload inicial (sem os anexos ainda — serão preenchidos
      // depois do upload IPFS, antes da criptografia)
      const payload = {
        ...form,
        versao: "1.0",
        criadoEm: new Date().toISOString(),
        anexos: [],
      };

      // ── Etapa 1: Upload dos anexos PRIMEIRO (se houver) ───────────────
      // Anexos precisam estar prontos antes da criptografia, pois os CIDs
      // entram no payload que vai gerar o hash on-chain.
      let hashIpfs = ethers.ZeroHash;
      const metaAnexos = [];

      if (arquivos.length > 0) {
        if (!PINATA_JWT) {
          throw new Error("Configure VITE_PINATA_JWT no frontend/.env para anexar arquivos.");
        }
        setEtapa(1);
        setStatus({ tipo: "info", msg: `Enviando ${arquivos.length} arquivo(s) para IPFS...` });

        for (const arq of arquivos) {
          const resultado = await uploadArquivoCriptografado(arq, conta, PINATA_JWT);
          metaAnexos.push({
            nome: arq.name,
            cid: resultado.cid,
            url: resultado.urlGateway,
            tamanho: arq.size,
            tipo: arq.type,
          });
          hashIpfs = resultado.cidHash;
        }
      }

      payload.anexos = metaAnexos;

      // ── Etapa 2: Criptografar payload completo (texto + anexos) ───────
      setEtapa(2);
      setStatus({ tipo: "info", msg: "Criptografando dados completos..." });

      const dadoCifrado = await encrypt(payload, conta);
      const hashConteudo = await sha256(dadoCifrado);

      // ── Etapa 3: Solicita assinatura na MetaMask ─────────────────────
      setEtapa(3);
      setStatus({ tipo: "info", msg: "Confirme a transação na MetaMask..." });

      const tx = await contrato.registerConsultation(hashConteudo, hashIpfs);

      // ── Etapa 4: Aguarda confirmação na blockchain ───────────────────
      setEtapa(4);
      setStatus({ tipo: "info", msg: `Transação enviada (${tx.hash.slice(0, 14)}...). Aguardando bloco...` });

      const recibo = await tx.wait();

      const evento = recibo.logs.find(
        (log) => log.fragment?.name === "ConsultationRegistered"
      );
      const consultationId = evento?.args?.consultationId;

      // ── Etapa 5: Salva localmente — exatamente o dado que gerou o hash ─
      setEtapa(5);
      salvarLocal(consultationId, dadoCifrado);

      salvarLocal(consultationId + "_meta", JSON.stringify({
        consultationId,
        txHash: tx.hash,
        bloco: recibo.blockNumber,
        criadoEm: new Date().toISOString(),
      }));
      
      // Sucesso!
      setStatus({
        tipo: "sucesso",
        msg: `✅ Consulta registrada no bloco ${recibo.blockNumber}!`,
        txHash: tx.hash,
      });

      setForm(FORM_VAZIO);
      setArquivos([]);
      aoSalvar?.();

    } catch (err) {
      const msg = err.code === "ACTION_REJECTED"
        ? "Transação cancelada. Você recusou na MetaMask."
        : (err.message || "Erro desconhecido.").slice(0, 150);
      setStatus({ tipo: "erro", msg: "❌ " + msg });
    } finally {
      setLoading(false);
      setEtapa(0);
    }
  };

  return (
    <div style={s.card}>
      <h2 style={s.titulo}>Nova Consulta Médica</h2>

      {/* Barra de progresso por etapas */}
      {loading && (
        <div style={s.progressoBar}>
          {[1,2,3,4,5].map((i) => (
            <div key={i} style={{
              ...s.progressoPasso,
              background: etapa >= i
                ? "var(--color-background-info)"
                : "var(--color-background-secondary)",
            }}>
              {["📎","🔒","📱","⛓","💾"][i-1]}
            </div>
          ))}
          <span style={{ fontSize: 12, color: "var(--color-text-secondary)", marginLeft: 8 }}>
            {ETAPAS[etapa]}
          </span>
        </div>
      )}

      {/* Mensagem de status */}
      {status && (
        <div style={{
          ...s.alerta,
          background: status.tipo === "sucesso" ? "var(--color-background-success)"
            : status.tipo === "erro" ? "var(--color-background-danger)"
            : "var(--color-background-info)",
          borderColor: status.tipo === "sucesso" ? "var(--color-border-success)"
            : status.tipo === "erro" ? "var(--color-border-danger)"
            : "var(--color-border-info)",
        }}>
          <span style={{
            color: status.tipo === "sucesso" ? "var(--color-text-success)"
              : status.tipo === "erro" ? "var(--color-text-danger)"
              : "var(--color-text-info)",
          }}>{status.msg}</span>
          {status.txHash && (
            <a
              href={`https://sepolia.etherscan.io/tx/${status.txHash}`}
              target="_blank" rel="noreferrer"
              style={{ display: "block", marginTop: 6, fontSize: 12,
                color: "var(--color-text-info)" }}
            >
              Ver transação no Etherscan ↗
            </a>
          )}
        </div>
      )}

      <form onSubmit={handleSubmit}>
        {/* ── Seção: Profissional ── */}
        <p style={s.secao}>Profissional de Saúde</p>
        <div style={s.grade}>
          <Campo label="Nome completo *" obrigatorio>
            <input style={s.input} value={form.nomeProfissional}
              onChange={atualizar("nomeProfissional")}
              placeholder="Dr. Nome Sobrenome" required />
          </Campo>
          <Campo label="Nº de registro (CRM, CRN, CRO...)">
            <input style={s.input} value={form.registro}
              onChange={atualizar("registro")}
              placeholder="CRM/SP 123456" />
          </Campo>
          <Campo label="Especialidade">
            <input style={s.input} value={form.especialidade}
              onChange={atualizar("especialidade")}
              placeholder="Cardiologia, Clínico Geral..." />
          </Campo>
          <Campo label="Local de atendimento">
            <input style={s.input} value={form.localAtendimento}
              onChange={atualizar("localAtendimento")}
              placeholder="Hospital, clínica, UBS..." />
          </Campo>
          <Campo label="Data da consulta *" obrigatorio>
            <input style={s.input} type="date" value={form.dataConsulta}
              onChange={atualizar("dataConsulta")} required />
          </Campo>
        </div>

        {/* ── Seção: Conteúdo clínico ── */}
        <p style={s.secao}>Conteúdo Clínico</p>

        <Campo label="Sintomas / motivo da consulta">
          <textarea style={{ ...s.input, ...s.area }}
            value={form.sintomas} onChange={atualizar("sintomas")}
            placeholder="Descreva os sintomas ou o motivo que levou à consulta..." />
        </Campo>

        <Campo label="Diagnóstico *" obrigatorio espacoTopo>
          <textarea style={{ ...s.input, ...s.area }}
            value={form.diagnostico} onChange={atualizar("diagnostico")}
            placeholder="Descreva o diagnóstico apresentado pelo profissional..." required />
        </Campo>

        <Campo label="Recomendações e orientações" espacoTopo>
          <textarea style={{ ...s.input, ...s.area }}
            value={form.recomendacoesOrientacoes}
            onChange={atualizar("recomendacoesOrientacoes")}
            placeholder="Recomendações do profissional (exames, encaminhamentos, retorno) e orientações de cuidado (dieta, atividade física, repouso)..." />
        </Campo>

        <Campo label="Medicações e posologia" espacoTopo>
          <textarea style={{ ...s.input, minHeight: 70 }}
            value={form.medicacoes} onChange={atualizar("medicacoes")}
            placeholder="Ex: Losartana 50mg — 1 comprimido de manhã em jejum por 30 dias" />
        </Campo>

        <Campo label="Observações adicionais" espacoTopo>
          <textarea style={{ ...s.input, minHeight: 60 }}
            value={form.observacoes} onChange={atualizar("observacoes")}
            placeholder="Qualquer informação adicional relevante..." />
        </Campo>

        {/* ── Seção: Anexos ── */}
        <p style={s.secao}>Anexos — Receituários e Exames</p>
        <div style={s.uploadArea}>
          <input type="file" id="upload" multiple
            accept=".pdf,.jpg,.jpeg,.png,.webp"
            onChange={handleArquivos} style={{ display: "none" }} />
          <label htmlFor="upload" style={s.btnUpload}>
            📎 Selecionar arquivos
          </label>
          {!PINATA_JWT && (
            <p style={{ ...s.dica, color: "var(--color-text-warning)" }}>
              ⚠️ Configure VITE_PINATA_JWT no frontend/.env para habilitar anexos.
            </p>
          )}
          {arquivos.length > 0 && (
            <div style={{ marginTop: 8 }}>
              {arquivos.map((f, i) => (
                <div key={i} style={s.itemArquivo}>
                  <span>📄 {f.name}</span>
                  <span style={{ color: "var(--color-text-tertiary)", fontSize: 11 }}>
                    {(f.size / 1024).toFixed(0)} KB
                  </span>
                </div>
              ))}
            </div>
          )}
          <p style={s.dica}>PDF, JPG ou PNG · máx. 15 MB por arquivo · criptografados antes do upload</p>
        </div>

        <button type="submit" disabled={loading} style={{
          ...s.btnEnviar, opacity: loading ? 0.65 : 1,
          cursor: loading ? "not-allowed" : "pointer"
        }}>
          {loading ? (ETAPAS[etapa] || "Processando...") : "⛓ Registrar na Blockchain"}
        </button>

        <p style={s.rodape}>
          Dados criptografados localmente com AES-256-GCM antes de qualquer envio.
          Apenas o hash SHA-256 é registrado on-chain — nenhum dado sensível vai para a blockchain.
        </p>
      </form>
    </div>
  );
}

function Campo({ label, obrigatorio, espacoTopo, children }) {
  return (
    <label style={{ ...s.campo, marginTop: espacoTopo ? 12 : 0 }}>
      <span style={s.labelTexto}>
        {label}{obrigatorio && <span style={{ color: "var(--color-text-danger)" }}> *</span>}
      </span>
      {children}
    </label>
  );
}

const s = {
  card: { background: "var(--color-background-primary)", border: "1px solid var(--color-border-tertiary)", borderRadius: 16, padding: "1.5rem" },
  titulo: { fontSize: 18, fontWeight: 500, color: "var(--color-text-primary)", marginBottom: 16 },
  progressoBar: { display: "flex", alignItems: "center", gap: 6, padding: "10px 14px", background: "var(--color-background-info)", borderRadius: 8, marginBottom: 14 },
  progressoPasso: { width: 30, height: 30, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14 },
  alerta: { border: "1px solid", borderRadius: 8, padding: "10px 14px", marginBottom: 14, fontSize: 14 },
  secao: { fontWeight: 500, fontSize: 12, color: "var(--color-text-secondary)", textTransform: "uppercase", letterSpacing: "0.05em", margin: "20px 0 10px" },
  grade: { display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 },
  campo: { display: "flex", flexDirection: "column", gap: 5 },
  labelTexto: { fontSize: 13, fontWeight: 500, color: "var(--color-text-primary)" },
  input: { padding: "9px 12px", border: "1px solid var(--color-border-secondary)", borderRadius: 8, fontSize: 14, color: "var(--color-text-primary)", background: "var(--color-background-primary)", width: "100%", boxSizing: "border-box", fontFamily: "inherit", resize: "vertical" },
  area: { minHeight: 90 },
  uploadArea: { border: "1px dashed var(--color-border-secondary)", borderRadius: 10, padding: "1rem", textAlign: "center" },
  btnUpload: { display: "inline-block", padding: "8px 16px", background: "var(--color-background-secondary)", border: "1px solid var(--color-border-secondary)", borderRadius: 8, cursor: "pointer", fontSize: 14, fontWeight: 500, color: "var(--color-text-primary)" },
  dica: { fontSize: 12, color: "var(--color-text-tertiary)", marginTop: 8 },
  itemArquivo: { display: "flex", justifyContent: "space-between", padding: "4px 8px", background: "var(--color-background-secondary)", borderRadius: 6, fontSize: 13, marginBottom: 4, color: "var(--color-text-primary)" },
  btnEnviar: { marginTop: 20, width: "100%", background: "var(--color-text-primary)", color: "var(--color-background-primary)", border: "none", borderRadius: 10, padding: 13, fontSize: 15, fontWeight: 500 },
  rodape: { fontSize: 11, color: "var(--color-text-tertiary)", textAlign: "center", marginTop: 10, lineHeight: 1.5 },
};