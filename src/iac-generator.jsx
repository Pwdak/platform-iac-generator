import { useState, useRef, useEffect } from "react";

const TOOLS = [
  {
    id: "terraform",
    label: "Terraform",
    icon: "⬡",
    color: "#7B42BC",
    ext: ".tf",
    desc: "AWS / Azure / GCP infrastructure",
    system: `You are an expert Terraform engineer. Generate production-ready, well-structured Terraform code.
Always include: main.tf, variables.tf, outputs.tf, provider.tf.
Use best practices: remote state hints, tagging, security groups with minimal permissions.
Return ONLY the code, organized with clear file headers like: # === main.tf ===
No markdown fences, no explanations outside the code comments.`,
  },
  {
    id: "ansible",
    label: "Ansible",
    icon: "⚙",
    color: "#EE0000",
    ext: ".yml",
    desc: "Playbooks & roles automation",
    system: `You are an expert Ansible engineer. Generate production-ready Ansible playbooks and roles.
Always include: site.yml (main playbook), inventory structure hints, handlers, variables with defaults.
Use best practices: idempotency, tags, become escalation only when needed, vault hints for secrets.
Return ONLY the YAML code with clear file section headers like: # === site.yml ===
No markdown fences, no explanations outside comments.`,
  },
  {
    id: "helm",
    label: "Helm Chart",
    icon: "⎈",
    color: "#0F1689",
    ext: ".yaml",
    desc: "Kubernetes Helm templates",
    system: `You are an expert Helm chart engineer. Generate a complete, production-ready Helm chart.
Always include: Chart.yaml, values.yaml, templates/deployment.yaml, templates/service.yaml, templates/ingress.yaml, templates/_helpers.tpl.
Use best practices: resource limits, liveness/readiness probes, configmap for config, secrets references.
Return ONLY the code with clear file headers like: # === Chart.yaml ===
No markdown fences, no explanations outside comments.`,
  },
  {
    id: "argocd",
    label: "ArgoCD",
    icon: "⟳",
    color: "#EF7B4D",
    ext: ".yaml",
    desc: "GitOps Application manifests",
    system: `You are an expert ArgoCD / GitOps engineer. Generate production-ready ArgoCD Application manifests.
Include: ArgoCD Application CRD, AppProject if relevant, sync policies with automated prune and selfHeal, health checks hints.
Consider multi-environment patterns (overlays or valueFiles per env).
Return ONLY the YAML code with clear file headers like: # === application.yaml ===
No markdown fences, no explanations outside comments.`,
  },
  {
    id: "full",
    label: "Full Stack",
    icon: "◈",
    color: "#00D4AA",
    ext: ".yaml",
    desc: "Terraform + Ansible + Helm + ArgoCD",
    system: `You are a senior Platform Engineer. Generate a complete GitOps infrastructure stack covering:
1. Terraform (infra provisioning): VPC, compute, networking
2. Ansible (configuration management): software install, system config
3. Helm Chart (application packaging): Kubernetes manifests
4. ArgoCD (GitOps delivery): Application manifests and sync policy

Organize output with clear section headers like: # ==================== TERRAFORM ==================== 
Then subsections: # === main.tf ===
Return ONLY code. No markdown fences. Comments inside code are fine.`,
  },
];

const EXAMPLES = [
  "EC2 t3.medium dans un VPC privé avec security group HTTP/HTTPS, installer Docker et Nginx",
  "Cluster Kubernetes 3 nodes sur AWS avec node group auto-scaling et ALB ingress",
  "App Node.js avec PostgreSQL sur Kubernetes, ingress TLS, secret pour DB password",
  "Pipeline GitOps : deploy microservice Python sur namespace staging avec ArgoCD sync auto",
  "Infrastructure bare metal RKE2 : HAProxy + Keepalived + 3 control-plane + 5 workers",
];

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false);
  const copy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };
  return (
    <button onClick={copy} style={{
      background: copied ? "#00D4AA22" : "#ffffff11",
      border: `1px solid ${copied ? "#00D4AA" : "#ffffff22"}`,
      color: copied ? "#00D4AA" : "#aaa",
      padding: "4px 12px",
      borderRadius: "4px",
      fontSize: "11px",
      cursor: "pointer",
      fontFamily: "monospace",
      transition: "all 0.2s",
    }}>
      {copied ? "✓ COPIED" : "COPY"}
    </button>
  );
}

function DownloadButton({ text, filename }) {
  const download = () => {
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    a.click();
  };
  return (
    <button onClick={download} style={{
      background: "#ffffff11",
      border: "1px solid #ffffff22",
      color: "#aaa",
      padding: "4px 12px",
      borderRadius: "4px",
      fontSize: "11px",
      cursor: "pointer",
      fontFamily: "monospace",
      transition: "all 0.2s",
    }}>
      ↓ SAVE
    </button>
  );
}

function TypewriterText({ text, speed = 2 }) {
  const [displayed, setDisplayed] = useState("");
  const indexRef = useRef(0);
  const textRef = useRef(text);

  useEffect(() => {
    textRef.current = text;
    setDisplayed("");
    indexRef.current = 0;
  }, [text]);

  useEffect(() => {
    if (displayed.length >= textRef.current.length) return;
    const id = setTimeout(() => {
      const chunk = textRef.current.slice(indexRef.current, indexRef.current + 8);
      indexRef.current += 8;
      setDisplayed(textRef.current.slice(0, indexRef.current));
    }, speed);
    return () => clearTimeout(id);
  }, [displayed, speed]);

  return displayed;
}

export default function IaCGenerator() {
  const [selectedTool, setSelectedTool] = useState(TOOLS[0]);
  const [prompt, setPrompt] = useState("");
  const [output, setOutput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const outputRef = useRef(null);

  useEffect(() => {
    if (output && outputRef.current) {
      outputRef.current.scrollTop = 0;
    }
  }, [output]);

  const generate = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setError("");
    setOutput("");

    try {
      const response = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "claude-sonnet-4-20250514",
          max_tokens: 4000,
          system: selectedTool.system,
          messages: [{ role: "user", content: prompt }],
        }),
      });

      const data = await response.json();
      if (data.error) throw new Error(data.error.message);

      const result = data.content?.find(b => b.type === "text")?.text || "";
      setOutput(result);
      setHistory(h => [
        { tool: selectedTool.id, prompt, output: result, ts: new Date().toLocaleTimeString() },
        ...h.slice(0, 9),
      ]);
    } catch (e) {
      setError(e.message || "API error");
    } finally {
      setLoading(false);
    }
  };

  const tool = selectedTool;

  return (
    <div style={{
      minHeight: "100vh",
      background: "#0A0A0F",
      fontFamily: "'JetBrains Mono', 'Fira Code', 'Courier New', monospace",
      color: "#E2E8F0",
      display: "flex",
      flexDirection: "column",
    }}>
      {/* Scanline overlay */}
      <div style={{
        position: "fixed", inset: 0, pointerEvents: "none", zIndex: 0,
        backgroundImage: "repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(0,0,0,0.03) 2px, rgba(0,0,0,0.03) 4px)",
      }} />

      {/* Header */}
      <div style={{
        borderBottom: "1px solid #1a1a2e",
        padding: "16px 24px",
        display: "flex",
        alignItems: "center",
        justifyContent: "space-between",
        background: "#0D0D18",
        position: "relative",
        zIndex: 1,
      }}>
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <div style={{
            width: "32px", height: "32px", borderRadius: "6px",
            background: `${tool.color}22`, border: `1px solid ${tool.color}66`,
            display: "flex", alignItems: "center", justifyContent: "center",
            fontSize: "16px", color: tool.color,
            transition: "all 0.3s",
          }}>
            {tool.icon}
          </div>
          <div>
            <div style={{ fontSize: "13px", fontWeight: "700", letterSpacing: "0.15em", color: "#fff" }}>
              PLATFORM IaC GENERATOR
            </div>
            <div style={{ fontSize: "10px", color: "#555", letterSpacing: "0.1em" }}>
              POWERED BY CLAUDE · ANTHROPIC
            </div>
          </div>
        </div>

        <div style={{ display: "flex", gap: "8px", alignItems: "center" }}>
          <div style={{
            width: "8px", height: "8px", borderRadius: "50%",
            background: loading ? "#FFB800" : "#00D4AA",
            boxShadow: `0 0 8px ${loading ? "#FFB800" : "#00D4AA"}`,
            animation: loading ? "pulse 1s infinite" : "none",
          }} />
          <span style={{ fontSize: "10px", color: "#555" }}>
            {loading ? "GENERATING..." : "READY"}
          </span>
          <button
            onClick={() => setShowHistory(!showHistory)}
            style={{
              marginLeft: "12px",
              background: showHistory ? "#ffffff11" : "transparent",
              border: "1px solid #ffffff22",
              color: "#888",
              padding: "4px 10px",
              borderRadius: "4px",
              fontSize: "10px",
              cursor: "pointer",
              letterSpacing: "0.1em",
            }}
          >
            HISTORY ({history.length})
          </button>
        </div>
      </div>

      <div style={{ display: "flex", flex: 1, position: "relative", zIndex: 1 }}>
        {/* Left Panel */}
        <div style={{
          width: "340px",
          minWidth: "340px",
          borderRight: "1px solid #1a1a2e",
          display: "flex",
          flexDirection: "column",
          background: "#0D0D18",
        }}>
          {/* Tool selector */}
          <div style={{ padding: "16px", borderBottom: "1px solid #1a1a2e" }}>
            <div style={{ fontSize: "9px", color: "#555", letterSpacing: "0.15em", marginBottom: "10px" }}>
              SELECT GENERATOR
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {TOOLS.map(t => (
                <button
                  key={t.id}
                  onClick={() => setSelectedTool(t)}
                  style={{
                    background: selectedTool.id === t.id ? `${t.color}18` : "transparent",
                    border: `1px solid ${selectedTool.id === t.id ? t.color + "66" : "#1a1a2e"}`,
                    color: selectedTool.id === t.id ? "#fff" : "#555",
                    padding: "10px 12px",
                    borderRadius: "6px",
                    cursor: "pointer",
                    textAlign: "left",
                    display: "flex",
                    alignItems: "center",
                    gap: "10px",
                    transition: "all 0.2s",
                  }}
                >
                  <span style={{
                    fontSize: "16px",
                    color: selectedTool.id === t.id ? t.color : "#333",
                    width: "20px",
                    textAlign: "center",
                  }}>{t.icon}</span>
                  <div>
                    <div style={{ fontSize: "12px", fontWeight: "600", letterSpacing: "0.05em" }}>{t.label}</div>
                    <div style={{ fontSize: "9px", color: "#444", marginTop: "1px" }}>{t.desc}</div>
                  </div>
                  {selectedTool.id === t.id && (
                    <div style={{
                      marginLeft: "auto",
                      width: "6px", height: "6px", borderRadius: "50%",
                      background: t.color, boxShadow: `0 0 6px ${t.color}`,
                    }} />
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Examples */}
          <div style={{ padding: "16px", flex: 1 }}>
            <div style={{ fontSize: "9px", color: "#555", letterSpacing: "0.15em", marginBottom: "10px" }}>
              EXEMPLES RAPIDES
            </div>
            <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
              {EXAMPLES.map((ex, i) => (
                <button
                  key={i}
                  onClick={() => setPrompt(ex)}
                  style={{
                    background: "transparent",
                    border: "1px solid #1a1a2e",
                    color: "#555",
                    padding: "8px 10px",
                    borderRadius: "4px",
                    cursor: "pointer",
                    textAlign: "left",
                    fontSize: "10px",
                    lineHeight: "1.5",
                    transition: "all 0.2s",
                  }}
                  onMouseEnter={e => {
                    e.currentTarget.style.borderColor = tool.color + "44";
                    e.currentTarget.style.color = "#aaa";
                  }}
                  onMouseLeave={e => {
                    e.currentTarget.style.borderColor = "#1a1a2e";
                    e.currentTarget.style.color = "#555";
                  }}
                >
                  <span style={{ color: tool.color, marginRight: "6px" }}>›</span>
                  {ex}
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Main Panel */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column" }}>
          {/* Input */}
          <div style={{ padding: "20px", borderBottom: "1px solid #1a1a2e" }}>
            <div style={{ fontSize: "9px", color: "#555", letterSpacing: "0.15em", marginBottom: "10px" }}>
              DÉCRIS TON INFRASTRUCTURE
            </div>
            <textarea
              value={prompt}
              onChange={e => setPrompt(e.target.value)}
              onKeyDown={e => {
                if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) generate();
              }}
              placeholder={`Exemple : Déploie une EC2 t3.medium dans un VPC avec subnet privé, security group HTTP/HTTPS, installe Docker et Prometheus via Ansible...`}
              style={{
                width: "100%",
                minHeight: "100px",
                background: "#060610",
                border: `1px solid ${tool.color}33`,
                borderRadius: "8px",
                color: "#E2E8F0",
                fontFamily: "inherit",
                fontSize: "12px",
                padding: "14px",
                resize: "vertical",
                outline: "none",
                boxSizing: "border-box",
                lineHeight: "1.6",
              }}
            />
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: "12px" }}>
              <span style={{ fontSize: "10px", color: "#333" }}>Ctrl+Enter pour générer</span>
              <div style={{ display: "flex", gap: "8px" }}>
                <button
                  onClick={() => { setPrompt(""); setOutput(""); setError(""); }}
                  style={{
                    background: "transparent",
                    border: "1px solid #1a1a2e",
                    color: "#444",
                    padding: "8px 16px",
                    borderRadius: "6px",
                    cursor: "pointer",
                    fontSize: "11px",
                    letterSpacing: "0.1em",
                  }}
                >
                  CLEAR
                </button>
                <button
                  onClick={generate}
                  disabled={loading || !prompt.trim()}
                  style={{
                    background: loading ? "#333" : `linear-gradient(135deg, ${tool.color}cc, ${tool.color}88)`,
                    border: "none",
                    color: "#fff",
                    padding: "8px 24px",
                    borderRadius: "6px",
                    cursor: loading ? "not-allowed" : "pointer",
                    fontSize: "11px",
                    fontWeight: "700",
                    letterSpacing: "0.15em",
                    fontFamily: "inherit",
                    transition: "all 0.2s",
                    opacity: loading || !prompt.trim() ? 0.5 : 1,
                  }}
                >
                  {loading ? "⟳ GÉNÉRATION..." : `⟶ GÉNÉRER ${tool.label.toUpperCase()}`}
                </button>
              </div>
            </div>
          </div>

          {/* Output */}
          <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
            {error && (
              <div style={{
                margin: "16px",
                padding: "12px 16px",
                background: "#FF000011",
                border: "1px solid #FF000044",
                borderRadius: "6px",
                color: "#FF6666",
                fontSize: "12px",
              }}>
                ⚠ ERROR: {error}
              </div>
            )}

            {loading && !output && (
              <div style={{
                flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
                flexDirection: "column", gap: "16px",
              }}>
                <div style={{
                  width: "40px", height: "40px", borderRadius: "50%",
                  border: `2px solid ${tool.color}33`,
                  borderTop: `2px solid ${tool.color}`,
                  animation: "spin 1s linear infinite",
                }} />
                <div style={{ fontSize: "11px", color: "#555", letterSpacing: "0.15em" }}>
                  ANALYSE DU CONTEXTE...
                </div>
              </div>
            )}

            {output && (
              <div style={{ flex: 1, display: "flex", flexDirection: "column", minHeight: 0 }}>
                <div style={{
                  padding: "12px 20px",
                  borderBottom: "1px solid #1a1a2e",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "space-between",
                }}>
                  <div style={{ display: "flex", alignItems: "center", gap: "8px" }}>
                    <span style={{ color: tool.color, fontSize: "14px" }}>{tool.icon}</span>
                    <span style={{ fontSize: "11px", color: "#888", letterSpacing: "0.1em" }}>
                      {tool.label.toUpperCase()} · {output.split("\n").length} LINES
                    </span>
                  </div>
                  <div style={{ display: "flex", gap: "6px" }}>
                    <CopyButton text={output} />
                    <DownloadButton text={output} filename={`generated${tool.ext}`} />
                  </div>
                </div>
                <div
                  ref={outputRef}
                  style={{
                    flex: 1,
                    overflow: "auto",
                    padding: "20px",
                    background: "#060610",
                  }}
                >
                  <pre style={{
                    margin: 0,
                    fontSize: "11px",
                    lineHeight: "1.7",
                    color: "#C8D3F5",
                    whiteSpace: "pre-wrap",
                    wordBreak: "break-word",
                  }}>
                    {output.split("\n").map((line, i) => {
                      let color = "#C8D3F5";
                      if (line.startsWith("# ===") || line.startsWith("# ==")) color = tool.color;
                      else if (line.startsWith("#")) color = "#637089";
                      else if (line.match(/^(resource|module|variable|output|provider|data)\s/)) color = "#82AAFF";
                      else if (line.match(/^\s*(name|namespace|kind|apiVersion|type|image|port):/)) color = "#86E1FC";
                      else if (line.match(/^\s*-\s/) ) color = "#C3E88D";
                      else if (line.includes("{{") && line.includes("}}")) color = "#FFCBb0";
                      return (
                        <span key={i} style={{ color, display: "block" }}>
                          <span style={{ color: "#2a2a3a", userSelect: "none", marginRight: "16px", fontSize: "9px" }}>
                            {String(i + 1).padStart(3, " ")}
                          </span>
                          {line || " "}
                        </span>
                      );
                    })}
                  </pre>
                </div>
              </div>
            )}

            {!output && !loading && !error && (
              <div style={{
                flex: 1, display: "flex", alignItems: "center", justifyContent: "center",
                flexDirection: "column", gap: "12px",
              }}>
                <div style={{ fontSize: "40px", opacity: 0.1 }}>{tool.icon}</div>
                <div style={{ fontSize: "11px", color: "#333", letterSpacing: "0.1em" }}>
                  DÉCRIS TON INFRA · APPUIE SUR GÉNÉRER
                </div>
              </div>
            )}
          </div>
        </div>

        {/* History Panel */}
        {showHistory && (
          <div style={{
            width: "280px",
            borderLeft: "1px solid #1a1a2e",
            background: "#0D0D18",
            display: "flex",
            flexDirection: "column",
          }}>
            <div style={{ padding: "16px", borderBottom: "1px solid #1a1a2e" }}>
              <div style={{ fontSize: "9px", color: "#555", letterSpacing: "0.15em" }}>HISTORIQUE</div>
            </div>
            <div style={{ flex: 1, overflow: "auto", padding: "12px", display: "flex", flexDirection: "column", gap: "8px" }}>
              {history.length === 0 && (
                <div style={{ fontSize: "10px", color: "#333", padding: "12px" }}>Aucune génération</div>
              )}
              {history.map((h, i) => {
                const t = TOOLS.find(t => t.id === h.tool);
                return (
                  <button
                    key={i}
                    onClick={() => { setOutput(h.output); setPrompt(h.prompt); setSelectedTool(t); }}
                    style={{
                      background: "transparent",
                      border: "1px solid #1a1a2e",
                      color: "#555",
                      padding: "10px",
                      borderRadius: "6px",
                      cursor: "pointer",
                      textAlign: "left",
                      transition: "all 0.2s",
                    }}
                    onMouseEnter={e => {
                      e.currentTarget.style.borderColor = t.color + "44";
                      e.currentTarget.style.color = "#aaa";
                    }}
                    onMouseLeave={e => {
                      e.currentTarget.style.borderColor = "#1a1a2e";
                      e.currentTarget.style.color = "#555";
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                      <span style={{ fontSize: "10px", color: t.color }}>{t.icon} {t.label}</span>
                      <span style={{ fontSize: "9px", color: "#333" }}>{h.ts}</span>
                    </div>
                    <div style={{ fontSize: "10px", lineHeight: "1.4", overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
                      {h.prompt}
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </div>

      <style>{`
        @keyframes spin { to { transform: rotate(360deg); } }
        @keyframes pulse { 0%,100% { opacity: 1; } 50% { opacity: 0.4; } }
        * { box-sizing: border-box; }
        ::-webkit-scrollbar { width: 4px; height: 4px; }
        ::-webkit-scrollbar-track { background: #0A0A0F; }
        ::-webkit-scrollbar-thumb { background: #1a1a2e; border-radius: 2px; }
        textarea::placeholder { color: #2a2a3a; }
      `}</style>
    </div>
  );
}
