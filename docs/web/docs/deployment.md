---
layout: docs
title: Deployment
permalink: /docs/deployment/
---

# Deployment Guide

**Who is this for?** Engineers deploying Rosetta infrastructure for their organization.

**When should I read this?** When you need to stand up Rosetta Server (RAGFlow) and Rosetta MCP for your team. For single-user setup, see [Quick Start](/rosetta/docs/quickstart/). For client/IDE configuration, see [Installation](/rosetta/docs/installation/).

> [!WARNING]
> **Never expose RAGFlow or Rosetta MCP directly to the internet.** Always place an API gateway, reverse proxy, or firewall in front of both services. Both have application-level authentication (RAGFlow: user accounts, OIDC/SSO, API keys; Rosetta MCP: OAuth 2.1), but network-level protection is still required as a defense-in-depth measure.

---

## Deployment Modes

| Mode | RAGFlow | Rosetta MCP | Best for |
|---|---|---|---|
| Hosted | Cloud Kubernetes | Cloud Kubernetes (HTTP transport) | Teams, production |
| Local | Docker Compose | Docker Compose or STDIO | Development, evaluation |
| Air-gapped | Docker Compose (offline models) | STDIO (offline instructions) | Regulated environments |

Rosetta MCP connects to RAGFlow as its backend. Deploy RAGFlow first.

---

## Part 1: Rosetta Server (RAGFlow)

RAGFlow provides document storage, embedding, retrieval, and the admin UI. It runs with Elasticsearch, Redis, and MinIO as supporting services, backed by an external MySQL database. For RAGFlow's role in the system, see [Architecture — RAGFlow](/rosetta/docs/architecture/#ragflow-rosetta-server).

Upstream docs: [Configuration](https://ragflow.io/docs/dev/configurations) | [Helm Chart](https://github.com/infiniflow/ragflow/tree/main/helm) | [Build Docker Image](https://ragflow.io/docs/dev/build_docker_image) | [Admin UI](https://ragflow.io/docs/admin_ui) | [GitHub](https://github.com/infiniflow/ragflow)

### Docker Compose

For local development and evaluation.

```yaml
# See the RAGFlow upstream docker-compose:
# https://github.com/infiniflow/ragflow
```

Set these environment variables in your `.env`:

```
MYSQL_HOST=<your-mysql-host>
MYSQL_USER=ragflow
MYSQL_DBNAME=rag_flow
MYSQL_PASSWORD=<generated>
```

### Kubernetes / Helm

Use the official upstream RAGFlow Helm chart:

- Chart source: https://github.com/infiniflow/ragflow/tree/main/helm
- Upstream README: https://github.com/infiniflow/ragflow/blob/main/helm/README.md
- Upstream values: https://github.com/infiniflow/ragflow/blob/main/helm/values.yaml

**Install:**

```sh
git clone https://github.com/infiniflow/ragflow.git
cd ragflow/helm

helm upgrade --install ragflow . \
  -n <namespace> \
  --create-namespace \
  -f values.override.yaml
```

Maintain your own `values.override.yaml` outside this repository and keep it aligned with the upstream chart version you deploy.

**Upstream chart architecture**:

- RAGFlow application (port 80 web, 9380 API, 9381 admin)
- Elasticsearch 8.11.3 (20Gi storage)
- MinIO (5Gi storage, document/object storage)
- Redis/Valkey 8 (5Gi storage, caching and sessions)
- MySQL is external (not deployed by the chart)

### Helm Values Reference

Use the upstream chart's `values.yaml` as the source of truth. The most important settings to review are:

| Key | Default | Description |
|---|---|---|
| `ragflow.image.tag` | `v0.23.1` | RAGFlow image version (use latest stable) |
| `env.DOC_ENGINE` | `elasticsearch` | Document engine type |
| `env.MYSQL_HOST` | (none) | External MySQL host. **Required.** |
| `env.MYSQL_DBNAME` | (none) | MySQL database name |
| `env.MYSQL_USER` | (none) | MySQL user |
| `mysql.enabled` | `false` | Internal MySQL (disabled, use external) |
| `redis.enabled` | `true` | In-cluster Redis |
| `minio.enabled` | `true` | In-cluster MinIO |
| `ingress.enabled` | `true` | Enable ingress |
| `env.REGISTER_ENABLED` | (unset) | Set `"0"` to disable self-registration |

Typical environment-specific overrides:

| Setting | Dev | Prod |
|---|---|---|
| Ingress host | `<development server URL>` | `<production server URL>` |
| MySQL database | `ragflow-dev` | (base default) |
| MySQL user | `ragflow-dev` | (base default) |

### Security

**Database credentials:** Create Kubernetes secrets for all passwords. Never put credentials in `values.yaml` or commit them into this repository.

```sh
kubectl create secret generic ragflow-mysql \
  --from-literal=MYSQL_PASSWORD="$(openssl rand -base64 32)" -n <namespace>
kubectl create secret generic ragflow-elastic \
  --from-literal=ELASTIC_PASSWORD="$(openssl rand -base64 32)" -n <namespace>
kubectl create secret generic ragflow-redis \
  --from-literal=REDIS_PASSWORD="$(openssl rand -base64 32)" -n <namespace>
kubectl create secret generic ragflow-minio \
  --from-literal=MINIO_PASSWORD="$(openssl rand -base64 32)" -n <namespace>
```

For production, use External Secrets Operator (ESO) or HashiCorp Vault instead of manual secrets.

**OIDC (SSO):** RAGFlow supports OpenID Connect via `local.service_conf.yaml`. Store the config as a Kubernetes secret and mount it:

```sh
kubectl create secret generic ragflow-service-conf \
  --from-file=local.service_conf.yaml -n <namespace>
```

Mount path: `/app/conf/local.service_conf.yaml`. See [RAGFlow OIDC docs](https://ragflow.io/docs/configurations#oauth) for the full schema.

**Default models:** Configure default LLM providers in `local.service_conf.yaml` so every user profile gets working models out of the box. This eliminates per-user model setup.

```yaml
# Inside local.service_conf.yaml (mounted as a secret)
user_default_llm:
  factory: "OpenAI"
  api_key: "<OPENAI_API_KEY>"
  base_url: "https://api.openai.com/v1"
  default_models:
    chat_model:
      name: "claude-sonnet-4-5-20250929"
      factory: "Anthropic"
      api_key: "<ANTHROPIC_API_KEY>"
    embedding_model:
      name: "embedding-001"
      factory: "Gemini"
      api_key: "<GOOGLE_API_KEY>"
    image2text_model:
      name: "gemini-3-pro-preview"
      factory: "Gemini"
      api_key: "<GOOGLE_API_KEY>"
    rerank_model:
      name: "rerank-english-v3.0"
      factory: "Cohere"
      api_key: "<COHERE_API_KEY>"
    asr_model:
      name: "whisper-1"
      factory: "OpenAI"
```

All model API keys are stored in the same `ragflow-service-conf` secret alongside OIDC config. Supported model types: chat, embedding, image-to-text, rerank, and ASR (speech-to-text).

**Network:** Place RAGFlow behind an API gateway or ingress controller with TLS termination. Disable self-registration (`REGISTER_ENABLED=0`) in all shared environments.

### Verification

```sh
kubectl get pods -n <namespace>        # All pods Running
kubectl get ingress -n <namespace>     # Hosts and addresses assigned
```

Check the admin panel at `https://<your-host>/admin`. Verify document upload and retrieval work.

---

## Part 2: Rosetta MCP

Rosetta MCP is the guiding layer between IDEs and the knowledge base. It exposes guardrails and common best practices, and provides a menu of instructions for coding agents to select on demand — delivering only what is needed. Manages sessions via Redis and handles OAuth authentication. See [Architecture — Rosetta MCP](/rosetta/docs/architecture/#rosetta-mcp) for capabilities.

### Docker Compose

For local development. Starts Rosetta MCP and Redis.

```yaml
# docker-compose.yml (ims-mcp-server/)
services:
  ims-mcp:
    image: us-central1-docker.pkg.dev/.../rosetta-mcp:<tag>
    ports: ["8000:8000"]
    environment:
      ROSETTA_API_KEY: "${ROSETTA_API_KEY}"
      ROSETTA_SERVER_URL: "${ROSETTA_SERVER_URL}"
      REDIS_URL: "redis://:${REDIS_PASSWORD}@redis:6379/2"
      ROSETTA_TRANSPORT: http
      ROSETTA_MODE: "${ROSETTA_MODE:-HARD}"
    depends_on: [redis]
  redis:
    image: redis:7-alpine
    command: redis-server --appendonly yes --requirepass ${REDIS_PASSWORD}
```

Required env vars: `ROSETTA_API_KEY`, `ROSETTA_SERVER_URL`, `REDIS_PASSWORD`.

### Kubernetes / Helm

Rosetta MCP uses a shared Helm chart (v1.17.x). Configuration is values-only (no custom chart).

**Image:** `https://hub.docker.com/repository/docker/griddynamics/rosetta-mcp/general`

**Resources:**

| | Requests | Limits |
|---|---|---|
| CPU | 250m | 1000m |
| Memory | 512Mi | 1Gi |

**Deployment strategy:** RollingUpdate (maxSurge: 1, maxUnavailable: 0). Single replica by default, HPA available (2-10 replicas, 70% CPU / 80% memory targets).

**Session affinity:** MCP uses [Streamable HTTP](/rosetta/docs/architecture/#rosetta-mcp) (stateful). The server holds session state and can call back the IDE. When running multiple replicas, every request from a client must reach the same pod. Configure sticky sessions on the Kubernetes Service:

```yaml
# Recommended: Service-level ClientIP affinity
sessionAffinity: ClientIP
sessionAffinityConfig:
  clientIP:
    timeoutSeconds: 3600  # 1h stickiness
```

Alternative: ingress-level stickiness using the MCP session ID header:

```yaml
# Ingress annotation (NGINX)
nginx.ingress.kubernetes.io/upstream-hash-by: "$http_mcp_session_id"
```

Start with `ClientIP` affinity. It covers most deployments without extra ingress configuration.

**Security context:** Runs as non-root user `rosetta` (UID 1000), all capabilities dropped.

### Helm Values Reference

Base values (`values.yaml`):

| Key | Default | Description |
|---|---|---|
| `ports` | `[8000]` | Container port |
| `image.tag` | (per release) | Image version |
| `replicaCount` | `1` | Pod replicas |
| `autoscaling.enabled` | `false` | HPA toggle |
| `ingress.enabled` | `true` | NGINX ingress |

Environment overrides:

| Setting | Dev | Prod |
|---|---|---|
| Ingress host | `rosetta-dev.example.com` | `rosetta.example.com` |
| `ROSETTA_SERVER_URL` | `http://ragflow-dev.<cluster-domain>:80` | `http://ragflow-prod.<cluster-domain>:80` |
| `ROSETTA_MODE` | `SOFT` | `SOFT` |
| `IMS_DEBUG` | `1` | (unset) |
| Keycloak realm | `<dev-realm>` | `<prod-realm>` |
| Service account | `<dev-service-account>` | `<prod-service-account>` |
| ESO secret source | `<dev-secret-source>` | `<prod-secret-source>` |

### Security

**OAuth 2.1:** Rosetta MCP authenticates IDE clients via [OAuthProxy](https://gofastmcp.com/servers/auth/oauth-proxy), which bridges any OAuth provider with MCP's authentication flow. Three modes are available, controlled by `ROSETTA_OAUTH_MODE`:

**`oauth` mode** (default) — generic OAuth 2.0 with token introspection:

| Env var | Purpose |
|---|---|
| `ROSETTA_OAUTH_AUTHORIZATION_ENDPOINT` | Upstream IdP authorization URL |
| `ROSETTA_OAUTH_TOKEN_ENDPOINT` | Upstream IdP token URL |
| `ROSETTA_OAUTH_INTROSPECTION_ENDPOINT` | Upstream IdP introspection URL |
| `ROSETTA_OAUTH_CLIENT_ID` | Pre-registered IdP client ID |
| `ROSETTA_OAUTH_CLIENT_SECRET` | IdP client secret |
| `ROSETTA_OAUTH_BASE_URL` | Public URL of Rosetta MCP |
| `ROSETTA_JWT_SIGNING_KEY` | Secret for signing FastMCP JWTs |
| `ROSETTA_OAUTH_REVOCATION_ENDPOINT` | *(optional)* Token revocation URL |
| `ROSETTA_OAUTH_CALLBACK_PATH` | *(optional)* Callback path (default: `/auth/callback`) |
| `ROSETTA_OAUTH_REQUIRED_SCOPES` | *(optional)* Scopes required on tokens |
| `ROSETTA_OAUTH_VALID_SCOPES` | *(optional)* Scopes advertised in `.well-known` |
| `ROSETTA_OAUTH_EXTRA_SCOPES` | *(optional)* Scopes forwarded to IdP authorize endpoint |

The `offline_access` scope is critical: it enables refresh tokens so users authenticate once instead of re-authenticating daily. Your OAuth provider must be configured to allow this scope.

**`oidc` mode** — OIDC auto-discovery with local JWT verification:

| Env var | Purpose |
|---|---|
| `ROSETTA_OAUTH_OIDC_CONFIG_URL` | IdP OIDC discovery URL (`.well-known/openid-configuration`) |
| `ROSETTA_OAUTH_CLIENT_ID` | Pre-registered IdP client ID |
| `ROSETTA_OAUTH_CLIENT_SECRET` | IdP client secret |
| `ROSETTA_OAUTH_BASE_URL` | Public URL of Rosetta MCP |
| `ROSETTA_JWT_SIGNING_KEY` | Secret for signing FastMCP JWTs |
| `ROSETTA_OAUTH_CALLBACK_PATH` | *(optional)* Callback path (default: `/auth/callback`) |
| `ROSETTA_OAUTH_REQUIRED_SCOPES` | *(optional)* Scopes required on tokens |
| `ROSETTA_OAUTH_EXTRA_SCOPES` | *(optional)* Scopes forwarded to IdP authorize endpoint |

**`github` mode** — [GitHub OAuth](https://gofastmcp.com/integrations/github) with API-based token verification:

| Env var | Purpose |
|---|---|
| `ROSETTA_OAUTH_CLIENT_ID` | GitHub OAuth App Client ID |
| `ROSETTA_OAUTH_CLIENT_SECRET` | GitHub OAuth App Client Secret |
| `ROSETTA_OAUTH_BASE_URL` | Public URL of Rosetta MCP (HTTPS required) |
| `ROSETTA_JWT_SIGNING_KEY` | Secret for signing FastMCP JWTs |
| `ROSETTA_OAUTH_CALLBACK_PATH` | *(optional)* Callback path (default: `/auth/callback`) |
| `ROSETTA_OAUTH_REQUIRED_SCOPES` | *(optional)* Required GitHub scopes (default: `user`) |

GitHub endpoints are hardcoded. Create a GitHub OAuth App at [github.com/settings/developers](https://github.com/settings/developers) and set the callback URL to `<ROSETTA_OAUTH_BASE_URL>/auth/callback`.

**Secrets** (use ESO, Vault, or manual Kubernetes secrets):

| Secret | Purpose |
|---|---|
| `ROSETTA_API_KEY` | RAGFlow API key. Must belong to the owner of all datasets. |
| `REDIS_PASSWORD` | Redis session store access |
| `ROSETTA_OAUTH_CLIENT_ID` | OAuth client identifier |
| `ROSETTA_OAUTH_CLIENT_SECRET` | OAuth client secret |
| `ROSETTA_JWT_SIGNING_KEY` | JWT token signing. Required for production. |
| `FERNET_KEY` | Encrypts OAuth tokens stored in Redis. Required for production. |
| `POSTHOG_API_KEY` | Usage analytics — your PostHog project API key (opt-in, disabled by default) |
| `POSTHOG_HOST` | PostHog instance URL, e.g. `https://posthog.internal.company.com` (defaults to `https://eu.i.posthog.com`) |

**ROSETTA_MODE:**

- `HARD`: Adds more content to context, stricter requirements. Allows to not use `bootstrap.md`.
- `SOFT`: Lighter context, more agent independence, must be used with `bootstrap.md`.

**Network:** Place Rosetta MCP behind an API gateway or ingress controller with TLS. The OAuth flow requires HTTPS.

### Verification

```sh
# Check pods
kubectl get pods -n <namespace>

# Test the MCP endpoint
curl -s https://<your-host>/mcp | head
```

Connect an IDE client using [Installation](/rosetta/docs/installation/) and run: "What can you do, Rosetta?"

---

## Environment Management

Rosetta uses a three-file values hierarchy per component:

```
values.yaml          # Base configuration (shared)
values-dev.yaml      # Dev environment overrides
values-prod.yaml     # Prod environment overrides
```

Key differences between environments:

- **Namespaces:** `<dev-namespace>` vs `<prod-namespace>`
- **Ingress hosts:** `rosetta-dev.example.com` vs `rosetta.example.com`
- **Keycloak realms:** `<dev-realm>` (dev) vs `<prod-realm>` (prod)
- **Secret sources:** environment-specific bundles in your secret manager
- **Service accounts:** environment-specific Kubernetes service accounts
- **Debug flags:** `IMS_DEBUG=1` in dev only

**CI/CD flow (merge to main auto-deploys to dev):**

1. **Build and publish image** (`ims-mcp-build.yaml`): Triggers on push to main when MCP source or Dockerfile changes. Runs typecheck, builds Docker image, pushes to container registry.
2. **Publish instructions** (`publish-instructions.yml`): Triggers on push to main when instruction content changes. Syncs instructions to Rosetta Server so dev always has the latest rules, agents, and skills.
3. **GitOps sync**: Your CD tool (Argo, Flux, or similar) detects new image tags and applies rolling updates to the dev environment.

Production deploys require a manual image tag bump in `values-prod.yaml`.

---

## Related Docs

- [Quick Start](/rosetta/docs/quickstart/) - single-user setup (zero to working in minutes)
- [Installation](/rosetta/docs/installation/) - client/IDE configuration, all transport modes
- [Architecture](/rosetta/docs/architecture/) - system structure and component relationships
- [Troubleshooting](/rosetta/docs/troubleshooting/) - common issues and fixes
- [Overview](/rosetta/docs/overview/) - mental model and terminology
