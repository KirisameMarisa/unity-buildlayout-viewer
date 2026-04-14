<!-- HERO -->
<div align="center">

  <h1>Unity Build Layout Viewer</h1>

  <p>
    A self-hosted web viewer for analyzing and comparing Unity Addressables <b>BuildLayout.json</b> outputs.<br/>
    Upload build results, search assets, compare snapshots, and investigate bundle dependency graphs.
  </p>

  <p>
    <a href="./README.ja.md">
      <img alt="日本語 README" src="https://img.shields.io/badge/README-日本語-ff69b4?style=for-the-badge" />
    </a>
    <a href="./LICENSE">
      <img src="https://img.shields.io/badge/License-MIT-blue.svg?style=for-the-badge" alt="License: MIT" />
    </a>
  </p>

</div>

<hr/>

<!-- Screenshot -->
<!-- TODO: add screenshot -->

## What it is

Unity Build Layout Viewer helps you understand what's inside your Addressables builds.
Upload a `BuildLayout.json`, browse all assets, and compare builds side-by-side to track down size regressions or unexpected dependency changes.

## ✨ Key Features

### Asset Search
Browse all assets in a snapshot. Filter by class, file extension, or name glob. Right-click any asset to open its dependency tree.

### Snapshot Diff
Compare two snapshots side-by-side. See what was added, removed, hash-changed, or size-changed — at both the asset level and the bundle level.

### Dependency Viewer
Trace the upstream dependency chain from any asset. Control traversal depth and node limit interactively.

### Upload
Upload a `BuildLayout.json` directly from the browser. Progress is streamed in real time.

### Snapshot Management
Edit tags and comments on snapshots. Soft-delete old ones to keep the list clean.

---

## 🚀 Getting Started

### 🐳 Quick Start (Docker)

```bash
# 1. Configure environment
cp .example.env .env

# 2. Build
docker compose -f compose.prod.yml build

# 3. Run DB migration (first time only, or after schema changes)
docker compose -f compose.prod.yml run --rm app npm run prisma:deploy

# 4. Start
docker compose -f compose.prod.yml up -d
```

```
Web UI → http://localhost:3435
```

---

### 💻 Local Dev (without Docker)

**Requirements:** Node.js 20+, PostgreSQL

```bash
# 1. Install dependencies
npm install

# 2. Configure environment
cp .example.env .env
# Edit .env and set DATABASE_URL

# 3. Run DB migration and generate Prisma client
npm run prisma:deploy
npm run prisma:generate

# 4. Start dev server
npm run dev
# → http://localhost:3435
```

---

## 🧪 Running Tests

Tests are integration tests that require a running database.

```bash
# Seed test data (idempotent, only needed once)
npm run seed

# Run tests
npm test
```

> When running outside Docker, set `DATABASE_URL` in `.env` to point to your local database.

## 📄 License

This project is licensed under the **MIT License** — see [LICENSE](./LICENSE) for details.
