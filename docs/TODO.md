This file contains grep compatible list of very concise improvements, suggestions, large TODOs, etc. Do not create TOC, it should come from grep.

## REVIEW: Build dockerimage using UVX

**Status:** Proposed

**What**: ims-mcp-server/Dockerfile to use `uvx ims-mcp@<specific-version>` instead of `Python -m`. 

## REVIEW: Consent screen disabled in production (security evaluation needed)

**Status:** Postponed — evaluate per deployment context.

**What:** `auth/oauth.py` passes `require_authorization_consent=False` to `OAuthProxy`. FastMCP warns this removes confused deputy protection. For internal enterprise users behind Keycloak's own login screen, risk is low. For any public-facing or multi-tenant deployment, re-enable (`True`).

**Action:** Confirm the expected user audience. If only internal Grid Dynamics employees on private SSO, keep `False`. Otherwise enable.

## REVIEW: Split plugins from marketplace

**What:** Have plugins.json extracted from marketplace and marketplace just references the file/folder. To make it reusable.

