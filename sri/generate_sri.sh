#!/usr/bin/env bash
set -euo pipefail

# Get the branch/tag/commit name from the first argument.
# Defaults to empty (latest commit plus staged changes).
BRANCH_OR_TAG="${1:-}"

# Specify the list of helper files for which to generate SRI hashes.
FILES=(
    "logging_helpers.js"
    "storage_helpers.js"
    "dom_helpers.js"
)

# Get the path to the output file.
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
OUTFILE="$SCRIPT_DIR/sri_hashes.txt"

# Clear the output file.
> "$OUTFILE"

echo "Generating SRI hashes for branch/tag/commit: ${BRANCH_OR_TAG:-working tree}"
echo "Output will be written to: $OUTFILE"
echo ""

for FILE in "${FILES[@]}"; do
    echo "Hashing and encoding $FILE ..."

    HASH=$(git show "${BRANCH_OR_TAG:-}:helpers/$FILE" | openssl dgst -sha256 -binary | openssl base64 -A)

    echo "$FILE: #sha256-$HASH" | tee -a "$OUTFILE"
    echo ""
done

echo "Done!"
