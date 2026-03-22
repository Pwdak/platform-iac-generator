# ⬡ Platform IaC Generator

> **AI-powered Infrastructure-as-Code generator** — Generate production-ready Terraform, Ansible, Helm Charts, and ArgoCD manifests from a natural language description.

![Claude Powered](https://img.shields.io/badge/Powered%20by-Claude%20%28Anthropic%29-7B42BC?style=flat-square)
![Stack](https://img.shields.io/badge/Stack-React%20%2B%20Vite%20%2B%20Node.js-00D4AA?style=flat-square)
![License](https://img.shields.io/badge/License-MIT-blue?style=flat-square)
![IaC](https://img.shields.io/badge/IaC-Terraform%20%7C%20Ansible%20%7C%20Helm%20%7C%20ArgoCD-EE0000?style=flat-square)

---

## 📸 Demo

The tool takes a plain French or English description of your infrastructure and generates complete, production-ready code files — organized by tool, with line-by-line syntax highlighting and one-click download.

```
Input  → "EC2 t3.medium in a private VPC, install Docker and Prometheus via Ansible"
Output → main.tf + variables.tf + outputs.tf + provider.tf (Terraform)
         site.yml + handlers.yml + defaults/main.yml  (Ansible)
```

---

## 🚀 Features

- **5 generation modes** — Terraform, Ansible, Helm Chart, ArgoCD, Full Stack (all-in-one)
- **Natural language input** — describe infrastructure in plain text, get structured code
- **Production-grade output** — best practices embedded in system prompts (security groups, resource limits, idempotency, GitOps sync policies...)
- **Built-in history** — last 10 generations, reloadable in one click
- **Download & copy** — export generated files directly from the UI
- **Syntax highlighting** — color-coded by token type (resource, variable, template...)

---

## 🏗️ Architecture

This project has two deployment modes:

### Mode 1 — Local / Dev (API key in `.env`)

```
Browser (React) ──────────────────────────────► Anthropic API
                    API key via VITE_ env var
                    ⚠️ OK for local dev only
```

### Mode 2 — Production / Safe (recommended)

```
Browser (React) ──► Express.js Backend ──► Anthropic API
                         │
                    API key in .env
                    Never exposed to client
```

> **Why this matters:** Embedding an API key in frontend code means anyone who opens DevTools → Network can extract it. The backend proxy pattern is the industry standard for protecting LLM API keys.

---

## 📦 Prerequisites

| Tool | Version | Purpose |
|------|---------|---------|
| Node.js | ≥ 18 | Runtime |
| npm | ≥ 9 | Package manager |
| Anthropic API key | — | LLM backend |

Get your API key at: https://console.anthropic.com

---

## ⚡ Quick Start — Local Dev (5 minutes)

```bash
# 1. Clone the repo
git clone https://github.com/<your-username>/platform-iac-generator
cd platform-iac-generator

# 2. Install frontend dependencies
npm install

# 3. Create environment file
cp .env.example .env
# Edit .env → add your VITE_ANTHROPIC_API_KEY

# 4. Run
npm run dev
# → http://localhost:5173
```

### `.env.example`
```env
# Local development only — never commit your real key
VITE_ANTHROPIC_API_KEY=sk-ant-api03-xxxxxxxxxxxxxxxxxxxxxxxx
```

> ⚠️ Add `.env` to your `.gitignore`. **Never push your API key to GitHub.**

---

## 🔒 Production Setup — Secure Backend Proxy

This is the **recommended architecture** for any shared or deployed instance.

### 1. Backend (Express.js)

```bash
mkdir backend && cd backend
npm init -y
npm install express cors dotenv @anthropic-ai/sdk
```

```javascript
// backend/server.js
```

```env
# backend/.env  ← API key lives HERE, server-side only
ANTHROPIC_API_KEY=sk-ant-api03-xxxxxxxxxxxxxxxxxxxxxxxx
```

### 2. Frontend — point to backend

```javascript
// In iac-generator.jsx, replace the direct API call with:
const response = await fetch('http://localhost:3001/api/generate', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ system: selectedTool.system, prompt }),
});
```

### 3. Run both

```bash
# Terminal 1 — Backend
cd backend && node server.js

# Terminal 2 — Frontend
npm run dev
```

---

## 🖥️ Desktop Executable (Electron)

Want a standalone `.exe` / `.dmg` / `.AppImage` you can run without a browser?

```bash
# Install Electron builder
npm install --save-dev electron electron-builder concurrently wait-on

# Add to package.json scripts:
# "electron": "electron .",
# "electron:build": "npm run build && electron-builder"

# Build executable
npm run electron:build
# → dist/platform-iac-generator-1.0.0.exe (Windows)
# → dist/platform-iac-generator-1.0.0.dmg (macOS)
# → dist/platform-iac-generator-1.0.0.AppImage (Linux)
```

The API key is stored in the app's local config using Electron's `safeStorage` API, which encrypts it using the OS keychain.

---

## 💰 Cost

The tool is **free to use** (MIT license). However, it calls the **Anthropic API**, which is billed per token.

| Item | Detail |
|---|---|
| New account credits | ~$5 free on signup |
| Claude Sonnet (input) | ~$3 / 1M tokens |
| Claude Sonnet (output) | ~$15 / 1M tokens |
| Average request | ~$0.002 – $0.005 |
| 500 generations/month | ≈ $2 |

> For a Platform Engineer generating 10–20 configs per day, monthly cost is typically **under $5**.

---

## 🛡️ Security Checklist

Before sharing or deploying:

- [ ] `.env` is in `.gitignore`
- [ ] No API key hardcoded in source files
- [ ] Using backend proxy for any non-local deployment
- [ ] API key has usage limits set in Anthropic Console
- [ ] `CORS` restricted to your frontend domain in production

---

## 🗂️ Project Structure

```
platform-iac-generator/
├── src/
│   ├── App.jsx          # Main UI component
│   └── main.jsx         # React entry point
├── backend/             # (optional) Express proxy
│   ├── server.js
│   └── .env             # ← API key lives here (never commit)
├── .env.example         # Template — safe to commit
├── .gitignore
├── package.json
└── README.md
```

---

## 🧠 How It Works

Each generation mode has a specialized **system prompt** that acts as an expert engineer:

```
Terraform mode  → "You are an expert Terraform engineer. Generate main.tf,
                   variables.tf, outputs.tf, provider.tf. Use best practices:
                   remote state hints, tagging, least-privilege security groups..."

Ansible mode    → "You are an expert Ansible engineer. Generate idempotent
                   playbooks with handlers, vault hints, become escalation
                   only when needed..."

Helm mode       → "Generate a complete chart with resource limits,
                   liveness/readiness probes, ingress TLS, _helpers.tpl..."

ArgoCD mode     → "Generate Application CRD with sync policies,
                   automated prune, selfHeal, health checks..."

Full Stack mode → All of the above in a single structured output
```

The LLM (Claude Sonnet) receives your infrastructure description and generates structured, annotated code directly — no template substitution, pure generation.

---

## 🔄 Roadmap

- [ ] Multi-cloud support prompts (Azure, GCP)
- [ ] Export as `.zip` with proper file structure
- [ ] Diff view between generations
- [ ] Custom system prompt editor (bring your own conventions)
- [ ] CLI version (`npx iac-gen "description"`)
- [ ] Integrate with GitLab API to open MR automatically

---

## 🤝 Contributing

```bash
# Fork → Clone → Create branch
git checkout -b feat/your-feature

# Make changes → Commit
git commit -m "feat: add GCP Terraform support"

# Push → Open PR
git push origin feat/your-feature
```

---

## 📄 License

MIT — free to use, modify, and distribute.

---

## 👤 Author

Built by **Arnold KOUEVI**

> *"Understanding how infrastructure works — VPC, subnets, security groups, orchestration — is the foundation. LLMs are a force multiplier on top of that knowledge, not a replacement for it."*

---

## 🔗 Resources

- [Anthropic API Docs](https://docs.anthropic.com)
- [Anthropic Console (API Keys)](https://console.anthropic.com)
- [Terraform Best Practices](https://developer.hashicorp.com/terraform/language)
- [Helm Chart Guide](https://helm.sh/docs/chart_template_guide/)
- [ArgoCD Application CRD](https://argo-cd.readthedocs.io/en/stable/operator-manual/application.yaml)
