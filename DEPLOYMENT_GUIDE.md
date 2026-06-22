# Deployment Guide

**Who is this for?** Engineers deploying Rosetta infrastructure for their organization.
**When should I read this?** When you need to stand up Rosetta Server (RAGFlow) and Rosetta MCP for your team. For single-user setup, see [QUICKSTART.md](QUICKSTART.md). For client/IDE configuration, see [INSTALLATION.md](INSTALLATION.md).

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

RAGFlow provides document storage, embedding, retrieval, and the admin UI. It runs with Elasticsearch, Redis, and MinIO as supporting services, backed by an external MySQL database. For RAGFlow's role in the system, see [Architecture — RAGFlow](docs/ARCHITECTURE.md#ragflow-rosetta-server).

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

Rosetta MCP is the guiding layer between IDEs and the knowledge base. It exposes guardrails and common best practices, and provides a menu of instructions for coding agents to select on demand — delivering only what is needed. Manages sessions via Redis and handles OAuth authentication. See [Architecture — Rosetta MCP](docs/ARCHITECTURE.md#rosetta-mcp) for capabilities.

### Docker Compose

For local development. Starts Rosetta MCP and Redis.

```yaml
# docker-compose.yml (src/ims-mcp-server/)
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

The repository ships the chart at [`src/helm-charts/rosetta-mcp-server/`](src/helm-charts/rosetta-mcp-server/). It deploys [rosetta-mcp](src/rosetta-mcp-server/README.md) in **HTTP** transport with ClusterIP Service, optional Ingress, optional HorizontalPodAutoscaler, and optional [External Secrets Operator](https://external-secrets.io/) wiring. Use this path when you want a shared MCP endpoint behind your ingress and identity provider (see [Architecture — Rosetta MCP](docs/ARCHITECTURE.md#rosetta-mcp)).

**Docker image:** [griddynamics/rosetta-mcp](https://hub.docker.com/r/griddynamics/rosetta-mcp) ([repository](https://hub.docker.com/repository/docker/griddynamics/rosetta-mcp/general)).

#### Prerequisites

- Kubernetes 1.25+ (for `autoscaling/v2` HPA)
- Rosetta Server (for example RAGFlow) reachable from the cluster ([Part 1](#part-1-rosetta-server-ragflow))
- A Kubernetes `Secret` (or ExternalSecret) containing at least `ROSETTA_API_KEY`
- If using the chart's ESO toggle (`eso.enabled`), External Secrets Operator and a `ClusterSecretStore` / `SecretStore` that match `eso.secretStoreRef`
- **TLS for production:** Base [`values.yaml`](src/helm-charts/rosetta-mcp-server/values.yaml) leaves [`ingress.tls`](src/helm-charts/rosetta-mcp-server/values.yaml) commented out, so Ingress may expose the MCP endpoint over **plain HTTP** until you configure TLS. **Before any production deployment,** enable HTTPS at the Ingress (uncomment and populate `ingress.tls` with your certificate `Secret` and hostnames) or terminate TLS at your API gateway / load balancer in front of the chart. OAuth expects a public **HTTPS** `ROSETTA_OAUTH_BASE_URL`; see also the [guide banner](#deployment-guide) on defense in depth.

#### Install

##### From OCI (Docker Hub)

After the workflow [Publish Rosetta MCP Helm chart](.github/workflows/publish-mcp-helm-chart.yml) runs on `main`, the chart is published as a Helm OCI artifact under the Grid Dynamics Docker Hub organization (see Chart [`name` and `version`](src/helm-charts/rosetta-mcp-server/Chart.yaml)).

```bash
helm registry login registry-1.docker.io
export CHART_OCI="oci://registry-1.docker.io/griddynamics/rosetta-mcp-helm-chart"
helm pull "${CHART_OCI}" --version "$(grep -E '^version:' src/helm-charts/rosetta-mcp-server/Chart.yaml | awk '{print $2}')"
```

Or install without pulling first (pin `--version` to the chart release you verified):

```bash
helm install rosetta-mcp "${CHART_OCI}" \
  --version 0.2.0 \
  -f my-values.yaml
```

Values must set `ROSETTA_SERVER_URL`, image pull credentials if your registry requires them, TLS (for production), and secrets such as `ROSETTA_API_KEY`. Chart name in OCI is **`rosetta-mcp-helm-chart`** (Helm package basename), while workload labels use `nameOverride: rosetta-mcp` from values.

##### From a local clone

```bash
helm dependency update    # chart has no subcharts today; optional
helm install rosetta-mcp ./src/helm-charts/rosetta-mcp-server \
  -f ./src/helm-charts/rosetta-mcp-server/values.yaml \
  -f ./src/helm-charts/rosetta-mcp-server/values-prod.example.yaml   # adapt or use your overlay
```

#### Required chart configuration

1. **Image** — `image.repository` defaults to `griddynamics/rosetta-mcp`; set `image.tag` or rely on the chart defaulting the tag to [`appVersion`](src/helm-charts/rosetta-mcp-server/Chart.yaml) in the Deployment template.
2. **Rosetta backend** — Set `env.vars` so `ROSETTA_SERVER_URL` resolves to Rosetta Server (in-cluster DNS or ingress URL).
3. **API key** — Supply `ROSETTA_API_KEY` via `env.secrets` (`secretKeyRef`). Create the Kubernetes Secret first or use `eso` to sync it.
4. **Ingress** — Set `ingress.host` and annotations. Defaults use an NGINX-style controller and placeholder host `rosetta-mcp.local`.
5. **TLS (production)** — Enable encrypted client traffic before production use. Uncomment and complete the [`ingress.tls`](src/helm-charts/rosetta-mcp-server/values.yaml) block in your overlay so Ingress terminates HTTPS with a TLS `Secret` (or terminate TLS upstream and align hostnames). HTTP-only defaults are unsuitable for production; OAuth and user trust depend on HTTPS.

Full environment-variable semantics for OAuth, Redis, analytics, and modes are the same as the application runtime; see [rosetta-mcp-server — Configuration](src/rosetta-mcp-server/README.md#configuration).

#### Example values overlays

The chart directory includes overlays you can copy and customize outside the repo:

- [`src/helm-charts/rosetta-mcp-server/values-dev.example.yaml`](src/helm-charts/rosetta-mcp-server/values-dev.example.yaml)
- [`src/helm-charts/rosetta-mcp-server/values-prod.example.yaml`](src/helm-charts/rosetta-mcp-server/values-prod.example.yaml)

```bash
helm upgrade --install rosetta-mcp ./src/helm-charts/rosetta-mcp-server \
  -f ./src/helm-charts/rosetta-mcp-server/values.yaml \
  -f my-prod.yaml
```

#### Chart layout

| Path | Purpose |
|---|---|
| [`templates/deployment.yaml`](src/helm-charts/rosetta-mcp-server/templates/deployment.yaml) | Deployment, env, resources |
| [`templates/service.yaml`](src/helm-charts/rosetta-mcp-server/templates/service.yaml) | ClusterIP and session affinity |
| [`templates/ingress.yaml`](src/helm-charts/rosetta-mcp-server/templates/ingress.yaml) | Optional Ingress |
| [`templates/hpa.yaml`](src/helm-charts/rosetta-mcp-server/templates/hpa.yaml) | Optional HPA |
| [`templates/external-secret.yaml`](src/helm-charts/rosetta-mcp-server/templates/external-secret.yaml) | Optional ExternalSecret (`eso.*`) |
| [`templates/serviceaccount.yaml`](src/helm-charts/rosetta-mcp-server/templates/serviceaccount.yaml) | ServiceAccount |

#### Deployment characteristics & defaults

The chart applies these behaviors by default unless you override values:

| Topic | Detail |
|---|---|
| **Resources** | Requests: CPU 250m, memory 512Mi. Limits: CPU 1000m, memory 1Gi. |
| **Replicas & HPA** | With `autoscaling.enabled: false`, `replicaCount` is honored. With HPA enabled, the Deployment initially uses `autoscaling.minReplicas`. When HPA is on, scaling is commonly 2–10 replicas (~70% CPU / ~80% memory targets). |
| **Rolling updates** | `RollingUpdate` with `maxSurge: 1`, `maxUnavailable: 0`. |
| **Security context** | Non-root UID/GID/fsGroup `1000`, capabilities dropped, `allowPrivilegeEscalation: false`. |

**Session affinity:** The Service defaults to `ClientIP` with ~1h stickiness — important for [Streamable HTTP](docs/ARCHITECTURE.md#rosetta-mcp) when you run multiple replicas:

```yaml
sessionAffinity: ClientIP
sessionAffinityConfig:
  clientIP:
    timeoutSeconds: 3600
```

If `ClientIP` is insufficient behind certain proxies or high fan-out IPs, try ingress affinity on the MCP session header:

```yaml
# NGINX Ingress (optional alternative)
nginx.ingress.kubernetes.io/upstream-hash-by: "$http_mcp_session_id"
```

Start with chart defaults (`ClientIP`); introduce hash-by only when justified. Use shared Redis (`REDIS_URL` + secrets) for multi-replica OAuth and sessions ([Redis](#redis) below).

#### Helm Values Reference

Base keys in [`src/helm-charts/rosetta-mcp-server/values.yaml`](src/helm-charts/rosetta-mcp-server/values.yaml):

| Key | Default | Description |
|---|---|---|
| `ports` | `[8000]` | Container/service port |
| `image.repository` | `griddynamics/rosetta-mcp` | Container image; Deployment uses `image.tag` or falls back to Chart `appVersion` when tag is unset |
| `replicaCount` | `1` | Static replicas when HPA disabled |
| `autoscaling.enabled` | `false` | HPA toggle |
| `ingress.enabled` | `true` | Ingress resource |
| `ingress.tls` | Commented in base [`values.yaml`](src/helm-charts/rosetta-mcp-server/values.yaml); enable for production | HTTPS termination at Ingress |
| `service.sessionAffinity` | `ClientIP` | Pod stickiness |
| `eso.enabled` | `false` | External Secrets Operator sync |

Representative environment-specific overrides:

| Setting | Dev | Prod |
|---|---|---|
| Ingress host | `rosetta-dev.example.com` | `rosetta.example.com` |
| `ROSETTA_SERVER_URL` | `http://ragflow-dev.<cluster-domain>:80` | `http://ragflow-prod.<cluster-domain>:80` |
| `VERSION` | `r2` | `r2` |
| `ROSETTA_MODE` | `SOFT` | `SOFT` |
| `ROSETTA_OAUTH_MODE` | `oauth` | `oauth` |
| `ROSETTA_OAUTH_REQUIRED_SCOPES` | `offline_access` | `offline_access` |
| `ROSETTA_OAUTH_VALID_SCOPES` | (empty) | (empty) |
| `REDIS_DB` | `2` | `2` |
| `FASTMCP_ENABLE_RICH_LOGGING` | `false` | `false` |
| `FASTMCP_LOG_LEVEL` | `DEBUG` | (unset) |
| `IMS_DEBUG` | `1` | (unset) |
| Keycloak realm | `<dev-realm>` | `<prod-realm>` |
| Service account | `<dev-service-account>` | `<prod-service-account>` |
| ESO secret source | `<dev-secret-source>` | `<prod-secret-source>` |

### Redis

Rosetta MCP uses Redis for OAuth token storage, session state, and `plan_manager` execution plans. Configure the connection via `REDIS_URL` (provided as a secret) and `REDIS_DB` (logical database index, e.g. `2`).

**Database isolation:** Use `REDIS_DB` to select a logical database within a shared Redis instance. Set different values per environment to avoid key collisions.

**Data invalidation:** Redis data is not schema-versioned and requires no migration scripts. However, existing sessions and stored plans become inaccessible after:

- Rotating `FERNET_KEY` (tokens can no longer be decrypted)
- Changing `REDIS_DB` (data is in a different logical database)
- Flushing the Redis database (`redis-cli -n <db> FLUSHDB`)

Users must re-authenticate and in-flight plans are lost after any of these. Plan key rotations accordingly in production.

### Security

**OAuth 2.1:** Rosetta MCP authenticates IDE clients via [OAuthProxy](https://gofastmcp.com/servers/auth/oauth-proxy), which bridges any OAuth provider with MCP's authentication flow. Three modes are available, controlled by `ROSETTA_OAUTH_MODE`:

**`oauth` mode** (default) — generic OAuth 2.0 with token introspection:

| Env var | Example | Purpose |
|---|---|---|
| `ROSETTA_OAUTH_AUTHORIZATION_ENDPOINT` | `https://idp.example.com/realms/<realm>/protocol/openid-connect/auth` | IdP authorize endpoint |
| `ROSETTA_OAUTH_TOKEN_ENDPOINT` | `https://idp.example.com/realms/<realm>/protocol/openid-connect/token` | IdP token endpoint |
| `ROSETTA_OAUTH_INTROSPECTION_ENDPOINT` | `https://idp.example.com/realms/<realm>/protocol/openid-connect/token/introspect` | IdP introspection endpoint |
| `ROSETTA_OAUTH_CLIENT_ID` | | Pre-registered IdP client ID |
| `ROSETTA_OAUTH_CLIENT_SECRET` | | IdP client secret |
| `ROSETTA_OAUTH_BASE_URL` | `https://rosetta-dev.example.com` | Public URL of Rosetta MCP |
| `ROSETTA_JWT_SIGNING_KEY` | | Secret for signing FastMCP JWTs |
| `ROSETTA_OAUTH_REVOCATION_ENDPOINT` | `https://idp.example.com/realms/<realm>/protocol/openid-connect/revoke` | *(optional)* Token revocation URL |
| `ROSETTA_OAUTH_REQUIRED_SCOPES` | `offline_access` | *(optional)* Scopes required on tokens; **must** include `offline_access` |
| `ROSETTA_OAUTH_VALID_SCOPES` | | *(optional)* Scopes advertised in `.well-known`; leave empty to derive from `REQUIRED_SCOPES` |
| `ROSETTA_OAUTH_EXTRA_SCOPES` | `openid email profile offline_access` | *(optional)* Scopes forwarded to IdP authorize endpoint |

The `offline_access` scope is critical: it enables refresh tokens so users authenticate once instead of re-authenticating daily. Your OAuth provider must be configured to allow this scope.

**`oidc` mode** — OIDC auto-discovery with local JWT verification:

| Env var | Example | Purpose |
|---|---|---|
| `ROSETTA_OAUTH_OIDC_CONFIG_URL` | `https://idp.example.com/realms/<realm>/.well-known/openid-configuration` | IdP OIDC discovery URL |
| `ROSETTA_OAUTH_CLIENT_ID` | | Pre-registered IdP client ID |
| `ROSETTA_OAUTH_CLIENT_SECRET` | | IdP client secret |
| `ROSETTA_OAUTH_BASE_URL` | `https://rosetta-dev.example.com` | Public URL of Rosetta MCP |
| `ROSETTA_JWT_SIGNING_KEY` | | Secret for signing FastMCP JWTs |
| `ROSETTA_OAUTH_REQUIRED_SCOPES` | `offline_access` | *(optional)* Scopes required on tokens |
| `ROSETTA_OAUTH_EXTRA_SCOPES` | `openid email profile offline_access` | *(optional)* Scopes forwarded to IdP authorize endpoint |

**`github` mode** — [GitHub OAuth](https://gofastmcp.com/integrations/github) with API-based token verification:

| Env var | Example | Purpose |
|---|---|---|
| `ROSETTA_OAUTH_CLIENT_ID` | `Ov23liAbcDefGhiJkLmN` | GitHub OAuth App Client ID |
| `ROSETTA_OAUTH_CLIENT_SECRET` | | GitHub OAuth App Client Secret |
| `ROSETTA_OAUTH_BASE_URL` | `https://rosetta.example.com` | Public URL of Rosetta MCP (HTTPS required) |
| `ROSETTA_JWT_SIGNING_KEY` | | Secret for signing FastMCP JWTs |
| `ROSETTA_OAUTH_REQUIRED_SCOPES` | `user` | *(optional)* Required GitHub scopes (default: `user`) |

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

Connect an IDE client using [INSTALLATION.md](INSTALLATION.md) and run: "What can you do, Rosetta?"

---

## Environment Management

Rosetta uses a three-file values hierarchy per component:

```
values.yaml          # Base configuration (shared)
values-dev.yaml      # Dev environment overrides
values-prod.yaml     # Prod environment overrides
```

Key differences between environments:

- **Namespaces:** `ims-dev` vs `ims-prod`
- **Namespaces:** `<dev-namespace>` vs `<prod-namespace>`
- **Ingress hosts:** `rosetta-dev.example.com` vs `rosetta.example.com`
- **Keycloak realms:** `<dev-realm>` vs `<prod-realm>`
- **Secret sources:** environment-specific secret bundles in your secret manager
- **Service accounts:** environment-specific Kubernetes service accounts
- **Debug flags:** `IMS_DEBUG=1` in dev only

**CI/CD flow (merge to main auto-deploys to dev):**

1. **Build and publish image** (`ims-mcp-build.yaml`): Triggers on push to main when MCP source or Dockerfile changes. Runs typecheck, builds Docker image, pushes to container registry.
2. **Publish instructions** (`publish-instructions.yml`): Triggers on push to main when instruction content changes. Syncs instructions to Rosetta Server so dev always has the latest rules, agents, and skills.
3. **GitOps sync**: Your CD tool (Argo, Flux, or similar) detects new image tags and applies rolling updates to the dev environment.

Production deploys require a manual image tag bump in `values-prod.yaml`.

## Rosetta Images, Packages

- https://pypi.org/project/ims-mcp/ (retiring)
- https://pypi.org/project/rosetta-mcp/
- https://pypi.org/project/rosetta-cli/
- https://hub.docker.com/repository/docker/griddynamics/rosetta-mcp/general

---

## Related Docs

- [QUICKSTART.md](QUICKSTART.md) - single-user setup (zero to working in minutes)
- [INSTALLATION.md](INSTALLATION.md) - client/IDE configuration, all transport modes
- [docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) - system structure and component relationships
- [TROUBLESHOOTING.md](TROUBLESHOOTING.md) - common issues and fixes
- [OVERVIEW.md](OVERVIEW.md) - mental model and terminology
