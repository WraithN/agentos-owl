#!/bin/bash

pnpm exec ast-grep scan -r ../../.rules/SelectItem.yml

pnpm exec ast-grep scan -r ../../.rules/contrast.yml

pnpm exec ast-grep scan -r ../../.rules/toast-hook.yml

pnpm exec ast-grep scan -r ../../.rules/slot-nesting.yml

pnpm exec ast-grep scan -r ../../.rules/require-button-interaction.yml

pnpm exec ast-grep scan -r ../../.rules/supabase-edge-function-get-body.yml

useauth_output=$(pnpm exec ast-grep scan -r ../../.rules/useAuth.yml 2>/dev/null)

if [ -z "$useauth_output" ]; then
    exit 0
fi

authprovider_output=$(pnpm exec ast-grep scan -r ../../.rules/authProvider.yml 2>/dev/null)

if [ -n "$authprovider_output" ]; then
    exit 0
fi

echo "=== pnpm exec ast-grep scan -r ../../.rules/useAuth.yml output ==="
echo "$useauth_output"
echo ""
echo "=== pnpm exec ast-grep scan -r ../../.rules/authProvider.yml output ==="
echo "$authprovider_output"
echo ""
echo "⚠️  Issue detected:"
echo "The code uses useAuth Hook but does not have AuthProvider component wrapping the components."
echo "Please ensure that components using useAuth are wrapped with AuthProvider to provide proper authentication context."
echo ""
echo "Suggested fixes:"
echo "1. Add AuthProvider wrapper in app.tsx or corresponding root component"
echo "2. Ensure all components using useAuth are within AuthProvider scope"
