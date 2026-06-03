# Convex backend (Giga3 AI)

Production deploy runs via GitHub Actions (**Deploy Convex backend**) on pushes to `main` that touch `convex/`, or locally:

```bash
CONVEX_DEPLOY_KEY='prod:…' ./scripts/convex-deploy.sh
```

Required production env vars are documented in `/DEPLOYMENT.md`.

Backend: multi-provider failover (chatEngine), platform.sendMessage, conversations/messages.

Failover env: OPENAI_*, GEMINI_API_KEY, GEMINI_MODEL, FAL_KEY, FAL_MODEL.
