"""Shared constants for Rosetta MCP V2."""

from typing import Literal

ENV_ROSETTA_SERVER_URL = "ROSETTA_SERVER_URL"
ENV_VERSION = "VERSION"
ENV_ROSETTA_API_KEY = "ROSETTA_API_KEY"
ENV_LEGACY_R2R_API_BASE = "R2R_API_BASE"
ENV_LEGACY_R2R_EMAIL = "R2R_EMAIL"
ENV_LEGACY_R2R_PASSWORD = "R2R_PASSWORD"
ENV_POSTHOG_API_KEY = "POSTHOG_API_KEY"
ENV_POSTHOG_HOST = "POSTHOG_HOST"
ENV_IMS_DEBUG = "IMS_DEBUG"
ENV_INSTRUCTION_ROOT_FILTER = "INSTRUCTION_ROOT_FILTER"
ENV_ROSETTA_MODE = "ROSETTA_MODE"
ENV_TRANSPORT = "ROSETTA_TRANSPORT"
ENV_HTTP_HOST = "ROSETTA_HTTP_HOST"
ENV_HTTP_PORT = "ROSETTA_HTTP_PORT"
ENV_REDIS_URL = "REDIS_URL"
ENV_FERNET_KEY = "FERNET_KEY"
ENV_ALLOWED_ORIGINS = "ROSETTA_ALLOWED_ORIGINS"
ENV_ALLOWED_SCOPES = "ROSETTA_ALLOWED_SCOPES"

# OAuth configuration (HTTP transports only)
ENV_OAUTH_AUTHORIZATION_ENDPOINT = "ROSETTA_OAUTH_AUTHORIZATION_ENDPOINT"
ENV_OAUTH_TOKEN_ENDPOINT = "ROSETTA_OAUTH_TOKEN_ENDPOINT"
ENV_OAUTH_INTROSPECTION_ENDPOINT = "ROSETTA_OAUTH_INTROSPECTION_ENDPOINT"
ENV_OAUTH_CLIENT_ID = "ROSETTA_OAUTH_CLIENT_ID"
ENV_OAUTH_CLIENT_SECRET = "ROSETTA_OAUTH_CLIENT_SECRET"
ENV_OAUTH_BASE_URL = "ROSETTA_OAUTH_BASE_URL"
ENV_OAUTH_CALLBACK_PATH = "ROSETTA_OAUTH_CALLBACK_PATH"
ENV_OAUTH_SCOPE = "ROSETTA_OAUTH_VALID_SCOPES"
ENV_OAUTH_EXTRA_SCOPES = "ROSETTA_OAUTH_EXTRA_SCOPES"
ENV_OAUTH_REVOCATION_ENDPOINT = "ROSETTA_OAUTH_REVOCATION_ENDPOINT"
ENV_OAUTH_JWT_SIGNING_KEY = "ROSETTA_JWT_SIGNING_KEY"
ENV_OAUTH_MODE = "ROSETTA_OAUTH_MODE"
ENV_OAUTH_OIDC_CONFIG_URL = "ROSETTA_OAUTH_OIDC_CONFIG_URL"
ENV_OAUTH_REQUIRED_SCOPES = "ROSETTA_OAUTH_REQUIRED_SCOPES"
OAUTH_MODE_OAUTH = "oauth"
OAUTH_MODE_OIDC = "oidc"
OAUTH_MODE_GITHUB = "github"

# Authorization policies
ENV_READ_POLICY = "ROSETTA_READ_POLICY"
ENV_WRITE_POLICY = "ROSETTA_WRITE_POLICY"
ENV_USER_EMAIL = "ROSETTA_USER_EMAIL"
ENV_INVITE_EMAILS = "ROSETTA_INVITE_EMAILS"

HEADER_API_KEY = "x-rosetta-api-key"

DEFAULT_HTTP_HOST = "0.0.0.0"
DEFAULT_HTTP_PORT = 8000
TRANSPORT_STDIO: Literal["stdio"] = "stdio"
TRANSPORT_HTTP: Literal["http"] = "http"

# RAGFlow configuration. Note, public key is only used for ADDITIONALLY encrypting password fields.

DEFAULT_SERVER_URL = "http://localhost:80"
DEFAULT_SERVER_PUBLIC_KEY_PEM = """-----BEGIN PUBLIC KEY-----
MIIBIjANBgkqhkiG9w0BAQEFAAOCAQ8AMIIBCgKCAQEArq9XTUSeYr2+N1h3Afl/z8Ds
e/2yD0ZGrKwx+EEEcdsBLca9Ynmx3nIB5obmLlSfmskLpBo0UACBmB5rEjBp2Q2f3AG3
Hjd4B+gNCG6BDaawuDlgANIhGnaTLrIqWrrcm4EMzJOnAOI1fgzJRsOOUEfaS318Eq9O
VO3apEyCCt0lOQK6PuksduOjVxtltDav+guVAA068NrPYmRNabVKRNLJpL8w4D44sfth
5RvZ3q9t+6RTArpEtc5sh5ChzvqPOzKGMXW83C95TxmXqpbK6olN4RevSfVjEAgCydH6H
N6OhtOQEcnrU97r9H0iZOWwbw3pVrZiUkuRD1R56Wzs2wIDAQAB
-----END PUBLIC KEY-----"""

# Default values

DEFAULT_VERSION = "r2"
DEFAULT_POSTHOG_HOST = "https://eu.i.posthog.com"
DEFAULT_SORT_ORDER = 1_000_000
DEFAULT_USER_EMAIL = "rosetta@example.com"
DEFAULT_READ_POLICY = "all"
DEFAULT_WRITE_POLICY = "all"
DEFAULT_OAUTH_CALLBACK_PATH = "/auth/callback"

POLICY_ALL = "all"
POLICY_TEAM = "team"
POLICY_NONE = "none"
VALID_POLICIES = {POLICY_ALL, POLICY_TEAM, POLICY_NONE}

PROJECT_DATASET_PREFIX = "project-"

TAG_MCP_SERVER_INSTRUCTIONS = "MCP_SERVER_INSTRUCTIONS"
TAG_BOOTSTRAP = "rosetta-bootstrap"
TAG_WORKFLOW = "workflow"

WORKFLOWS_PATH_PREFIX = "workflows"
WORKFLOWS_PSEUDO_FILE_HEADER = "\n\n## Available Workflows (format: `Tag` - Description):\n"

INSTRUCTION_DATASET_TEMPLATE = "aia-{version}"

XML_FILE_OPEN = '<rosetta:file id="{id}" dataset="{dataset}" path="{path}" name="{name}" tags="{tags}">\n'
XML_FILE_CLOSE = "</rosetta:file>\n"
XML_DATASET = '<rosetta:dataset id="{id}" name="{name}"/>\n'
XML_FILE_LIST_OPEN = '<rosetta:file id="{id}" dataset="{dataset}" path="{path}" name="{name}" tags="{tags}">\n'
XML_FILE_LIST_CLOSE = "</rosetta:file>"
XML_FOLDER_LIST = '<rosetta:folder dataset="{dataset}" path="{path}" />'
XML_FRONTMATTER_OPEN = "<frontmatter{attrs}>"
XML_FRONTMATTER_CLOSE = "</frontmatter>"
XML_CONTENT_NOT_LOADED = "<content_not_loaded/>"

COMPATIBILITY_MODE_UPGRADE_URL = "https://github.com/griddynamics/rosetta/blob/main/QUICKSTART.md"
COMPATIBILITY_MODE_UPGRADE_NOTICE = (
    "\n\n<rosetta:compatibility_notice>"
    "\nThis Rosetta MCP is running in legacy compatibility mode."
    "\nSome features are unavailable in this mode."
    "\nYou MUST ask the user to upgrade to HTTP mode."
    f"\nUpgrade guide: {COMPATIBILITY_MODE_UPGRADE_URL}"
    "\n</rosetta:compatibility_notice>"
)
COMPATIBILITY_MODE_ERROR = (
    "Error: this feature is not available in legacy compatibility mode. "
    f"Upgrade to HTTP mode to use this tool: {COMPATIBILITY_MODE_UPGRADE_URL}"
)

QUERY_LIST_THRESHOLD = 5
# Defensive ceiling: when a tag/keyword query returns more docs than this, we
# assume the server-side metadata_condition filter was bypassed (RAGFlow 0.25.x
# silently drops the filter when it matches zero docs and returns every doc in
# the dataset) and refuse to bundle. Set well above QUERY_LIST_THRESHOLD so
# legitimately large listings still pass through the listing path.
QUERY_TOO_MANY_THRESHOLD = 25
DOC_CACHE_TTL_SECONDS = 1800  # 30 minutes
PROXY_SESSION_TTL_SECONDS = 30 * 24 * 3600  # 30 days; aligns with common offline-session idle windows
INTROSPECTION_CACHE_TTL_SECONDS = 15 * 60  # 15 min max for active tokens
INTROSPECTION_NEGATIVE_CACHE_TTL_SECONDS = 60  # 1 min for inactive/failed tokens

ANALYTICS_MCP_SERVER = "Rosetta"
TECHNICAL_PARAMS = {
    "limit",
    "offset",
    "page",
    "compact_view",
    "model",
    "temperature",
    "max_tokens",
}

POSTHOG_PLACEHOLDER = "__POSTHOG_API_KEY_PLACEHOLDER__"
DISABLE_VALUES = {"", "NO", "DISABLED", "DISABLE", "0", "FALSE", "OFF"}

TOOL_GET_CONTEXT_INSTRUCTIONS = "get_context_instructions"
TOOL_QUERY_INSTRUCTIONS = "query_instructions"
TOOL_LIST_INSTRUCTIONS = "list_instructions"
TOOL_SUBMIT_FEEDBACK = "submit_feedback"
TOOL_QUERY_PROJECT_CONTEXT = "query_project_context"
TOOL_STORE_PROJECT_CONTEXT = "store_project_context"
TOOL_DISCOVER_PROJECTS = "discover_projects"
TOOL_PLAN_MANAGER = "plan_manager"

SCOPE_ALLOW_WRITE_DATA = "allow_write_data"
TAG_WRITE_DATA = "write_data"

REPOSITORY_CACHE_TTL_SECONDS = 300

# Tool contract limits
MAX_QUERY_LENGTH = 2_000
MAX_DISCOVER_QUERY_LENGTH = 256
MAX_PATH_LENGTH = 512
MAX_PROJECT_NAME_LENGTH = 256
MAX_TAGS = 50
MAX_TAG_LENGTH = 128
MAX_CONTENT_LENGTH = 200_000
MAX_REQUEST_MODE_LENGTH = 128
MAX_FEEDBACK_FIELD_LENGTH = 8_000

# Plan manager
ENV_PLAN_TTL_DAYS = "ROSETTA_PLAN_TTL_DAYS"
DEFAULT_PLAN_TTL_DAYS = 5
PLAN_KEY_PREFIX = "plan:"
VALID_PLAN_STATUSES = {"open", "in_progress", "complete", "blocked", "failed"}
PLAN_MAX_PHASES = 100
PLAN_MAX_STEPS_PER_PHASE = 100
PLAN_MAX_DEPENDENCIES_PER_ITEM = 50
PLAN_MAX_STRING_LENGTH = 20_000
PLAN_MAX_NAME_LENGTH = 256
