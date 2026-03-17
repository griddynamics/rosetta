#!/bin/bash
# Build script for Rosetta MCP package
# Copies icon and injects PostHog API key before building

set -e  # Exit on error

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m' # No Color

echo -e "${BLUE}=== Rosetta MCP Package Build ===${NC}"

# Get script directory (ims-mcp-server/)
SCRIPT_DIR="$( cd "$( dirname "${BASH_SOURCE[0]}" )" && pwd )"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

# Source and destination paths
SOURCE_ICON="$PROJECT_ROOT/docs/images/Rosetta-Icon-Only.png"
DEST_ICON="$SCRIPT_DIR/ims_mcp/resources/rosetta-icon.png"
DEST_DIR="$SCRIPT_DIR/ims_mcp/resources"

# Step 1: Copy icon from source
echo -e "${BLUE}Step 1: Copying icon from source...${NC}"

# Create resources directory if it doesn't exist
mkdir -p "$DEST_DIR"

# Remove stale bootstrap.md if it exists (V2: loaded from server at startup)
if [ -f "$DEST_DIR/bootstrap.md" ]; then
    rm -f "$DEST_DIR/bootstrap.md"
    echo -e "${GREEN}  Removed stale bootstrap.md (V2 loads from server)${NC}"
fi

# Copy icon
if [ ! -f "$SOURCE_ICON" ]; then
    echo -e "${RED}ERROR: Source icon not found: $SOURCE_ICON${NC}"
    exit 1
fi

cp "$SOURCE_ICON" "$DEST_ICON"

# Verify icon copy
if [ ! -f "$DEST_ICON" ]; then
    echo -e "${RED}ERROR: Failed to copy icon${NC}"
    exit 1
fi

ICON_SOURCE_SIZE=$(wc -c < "$SOURCE_ICON" | tr -d ' ')
ICON_DEST_SIZE=$(wc -c < "$DEST_ICON" | tr -d ' ')

if [ "$ICON_SOURCE_SIZE" != "$ICON_DEST_SIZE" ]; then
    echo -e "${RED}ERROR: Icon file sizes don't match (source: $ICON_SOURCE_SIZE, dest: $ICON_DEST_SIZE)${NC}"
    exit 1
fi

echo -e "${GREEN}  Copied rosetta-icon.png ($ICON_SOURCE_SIZE bytes)${NC}"

# Step 2: Inject PostHog API Key (CI/CD only - optional for local builds)
INIT_FILE="$SCRIPT_DIR/ims_mcp/__init__.py"

if [ -n "$POSTHOG_API_KEY" ]; then
    echo -e "${BLUE}Step 2: Injecting PostHog API Key (CI/CD mode)...${NC}"

    # Create backup of original file
    cp "$INIT_FILE" "$INIT_FILE.bak"

    # Replace placeholder with actual API key in __init__.py
    sed -i.tmp "s/__POSTHOG_API_KEY_PLACEHOLDER__/$POSTHOG_API_KEY/g" "$INIT_FILE"
    rm -f "$INIT_FILE.tmp"

    # Verify replacement worked
    if grep -q "__POSTHOG_API_KEY_PLACEHOLDER__" "$INIT_FILE"; then
        echo -e "${RED}ERROR: Failed to replace PostHog API key placeholder${NC}"
        mv "$INIT_FILE.bak" "$INIT_FILE"  # Restore backup
        exit 1
    fi

    echo -e "${GREEN}  PostHog API key injected into __init__.py${NC}"
else
    echo -e "${BLUE}Step 2: Skipping PostHog key injection (local build mode)${NC}"
    echo -e "  Analytics will be disabled in this build (placeholder remains)"
fi

# Step 3: Clean previous build artifacts
echo -e "${BLUE}Step 3: Cleaning previous build artifacts...${NC}"
rm -rf "$SCRIPT_DIR/dist" "$SCRIPT_DIR/build" "$SCRIPT_DIR"/*.egg-info
echo -e "${GREEN}  Cleaned${NC}"

# Step 4: Build package
echo -e "${BLUE}Step 4: Building package...${NC}"
cd "$SCRIPT_DIR"
python -m build

if [ $? -ne 0 ]; then
    echo -e "${RED}ERROR: Build failed${NC}"
    # Restore original file on build failure (if it was backed up)
    if [ -f "$INIT_FILE.bak" ]; then
        mv "$INIT_FILE.bak" "$INIT_FILE"
        echo -e "${GREEN}  Restored original __init__.py${NC}"
    fi
    exit 1
fi

# Step 5: Restore original __init__.py (CI/CD only - if we injected the key)
if [ -f "$INIT_FILE.bak" ]; then
    echo -e "${BLUE}Step 5: Restoring original __init__.py...${NC}"
    mv "$INIT_FILE.bak" "$INIT_FILE"
    echo -e "${GREEN}  Restored original __init__.py (key injection reverted)${NC}"
fi

# Step 6: Verify wheel contents
echo -e "${BLUE}Step 6: Verifying wheel contents...${NC}"
WHEEL_FILE=$(ls dist/*.whl | head -n 1)

if [ -z "$WHEEL_FILE" ]; then
    echo -e "${RED}ERROR: No wheel file found${NC}"
    exit 1
fi

if unzip -l "$WHEEL_FILE" | grep -q "ims_mcp/resources/rosetta-icon.png"; then
    ICON_WHEEL_SIZE=$(unzip -l "$WHEEL_FILE" | grep "ims_mcp/resources/rosetta-icon.png" | awk '{print $1}')
    echo -e "${GREEN}  rosetta-icon.png included in wheel ($ICON_WHEEL_SIZE bytes)${NC}"
else
    echo -e "${RED}ERROR: rosetta-icon.png not found in wheel${NC}"
    exit 1
fi

# Verify bootstrap.md is NOT in wheel (V2: loaded from server)
if unzip -l "$WHEEL_FILE" | grep -q "ims_mcp/resources/bootstrap.md"; then
    echo -e "${RED}ERROR: bootstrap.md found in wheel but should not be (V2 loads from server)${NC}"
    exit 1
fi

echo -e "${GREEN}  Verified: no bootstrap.md in wheel (loaded from server at startup)${NC}"

# Success summary
echo -e "${GREEN}=== Build Complete ===${NC}"
echo -e "Artifacts:"
ls -lh dist/
echo ""
echo -e "To install locally: ${BLUE}pip install dist/*.whl${NC}"
echo -e "To publish to PyPI: ${BLUE}twine upload dist/*${NC}"
