#!/usr/bin/env bash
set -euo pipefail
TAG="$1"
VERSION="${TAG#v}"
MAJOR="${VERSION%%.*}"
MINOR="${VERSION#*.}"
MINOR="${MINOR%%.*}"
echo "version=$VERSION" >> "$GITHUB_OUTPUT"
echo "major=$MAJOR" >> "$GITHUB_OUTPUT"
echo "minor=$MAJOR.$MINOR" >> "$GITHUB_OUTPUT"
