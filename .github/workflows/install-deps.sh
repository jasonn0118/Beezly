#!/bin/bash

# Script to handle pnpm installation with fallback for CI environments
echo "=== pnpm Installation Script ==="

# Check if lockfile exists
if [ ! -f pnpm-lock.yaml ]; then
    echo "❌ No lockfile found, running fresh install"
    pnpm install
    exit $?
fi

echo "✅ Lockfile found, attempting frozen lockfile install"

# Try frozen lockfile first
if pnpm install --frozen-lockfile 2>/dev/null; then
    echo "✅ Frozen lockfile install successful"
    exit 0
else
    echo "⚠️  Frozen lockfile failed, falling back to regular install"
    pnpm install
    exit $?
fi