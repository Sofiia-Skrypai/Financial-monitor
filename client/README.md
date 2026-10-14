# FinMonitor — client

React SPA. See the [main README](../README.md) for the project overview.

```bash
npm install
npm start        # dev server at http://localhost:3000
npm test         # component tests
npm run build    # production build in ./build
```

Configuration — copy `.env.example` to `.env`:

| Variable | Default | Meaning |
|---|---|---|
| `REACT_APP_OFFLINE_MODE` | `true` | `true` — data stored in browser localStorage; `false` — use REST API |
| `REACT_APP_API_URL` | `http://localhost:5000/api` | REST API base URL (server/) |
