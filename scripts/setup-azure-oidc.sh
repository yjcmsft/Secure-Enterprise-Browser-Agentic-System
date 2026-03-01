#!/usr/bin/env bash
set -euo pipefail

###############################################################################
# setup-azure-oidc.sh
#
# Creates an Azure AD App Registration with federated credentials for
# GitHub Actions OIDC authentication, and prints the values needed for
# GitHub repository secrets.
#
# Prerequisites:
#   - Azure CLI installed and logged in (`az login`)
#   - Sufficient permissions to create App Registrations and role assignments
#   - GitHub CLI (`gh`) installed and authenticated (for auto-setting secrets)
#
# Usage:
#   chmod +x scripts/setup-azure-oidc.sh
#   ./scripts/setup-azure-oidc.sh
#
# Override defaults with environment variables:
#   GITHUB_REPO="myorg/myrepo" AZURE_SUBSCRIPTION_ID="..." ./scripts/setup-azure-oidc.sh
###############################################################################

# ── Configuration (edit these or set via environment variables) ──────────────

GITHUB_REPO="${GITHUB_REPO:?'Set GITHUB_REPO to your owner/repo (e.g. contoso/Secure-Enterprise-Browser-Agentic-System)'}"
APP_DISPLAY_NAME="${APP_DISPLAY_NAME:-github-deploy-secure-browser-agent}"
AZURE_SUBSCRIPTION_ID="${AZURE_SUBSCRIPTION_ID:-$(az account show --query id -o tsv)}"
AZURE_TENANT_ID="${AZURE_TENANT_ID:-$(az account show --query tenantId -o tsv)}"
ROLE="${ROLE:-Contributor}"

# GitHub environments defined in the deploy workflow
ENVIRONMENTS=("staging" "production")

echo "============================================="
echo " Azure OIDC Setup for GitHub Actions"
echo "============================================="
echo "GitHub Repo:       ${GITHUB_REPO}"
echo "App Name:          ${APP_DISPLAY_NAME}"
echo "Subscription:      ${AZURE_SUBSCRIPTION_ID}"
echo "Tenant:            ${AZURE_TENANT_ID}"
echo "Role:              ${ROLE}"
echo "Environments:      ${ENVIRONMENTS[*]}"
echo "============================================="
echo ""

# ── Step 1: Create Azure AD App Registration ────────────────────────────────

echo "▸ Creating Azure AD App Registration..."
APP_ID=$(az ad app create \
  --display-name "${APP_DISPLAY_NAME}" \
  --query appId -o tsv)
echo "  App (client) ID: ${APP_ID}"

# ── Step 2: Create Service Principal ────────────────────────────────────────

echo "▸ Creating Service Principal..."
az ad sp create --id "${APP_ID}" --only-show-errors > /dev/null 2>&1 || true
echo "  Service Principal created."

# ── Step 3: Assign role on subscription ─────────────────────────────────────

echo "▸ Assigning '${ROLE}' role on subscription..."
az role assignment create \
  --assignee "${APP_ID}" \
  --role "${ROLE}" \
  --scope "/subscriptions/${AZURE_SUBSCRIPTION_ID}" \
  --only-show-errors > /dev/null
echo "  Role assigned."

# ── Step 4: Create federated credentials for each environment ───────────────

for ENV in "${ENVIRONMENTS[@]}"; do
  CRED_NAME="github-${ENV}"
  SUBJECT="repo:${GITHUB_REPO}:environment:${ENV}"

  echo "▸ Creating federated credential for environment '${ENV}'..."
  echo "  Subject: ${SUBJECT}"

  az ad app federated-credential create \
    --id "${APP_ID}" \
    --parameters "{
      \"name\": \"${CRED_NAME}\",
      \"issuer\": \"https://token.actions.githubusercontent.com\",
      \"subject\": \"${SUBJECT}\",
      \"audiences\": [\"api://AzureADTokenExchange\"],
      \"description\": \"GitHub Actions OIDC for ${ENV} environment\"
    }" \
    --only-show-errors > /dev/null

  echo "  ✓ Federated credential '${CRED_NAME}' created."
done

# ── Step 5: Also add a credential for the main branch (for push triggers) ──

echo "▸ Creating federated credential for branch 'main'..."
az ad app federated-credential create \
  --id "${APP_ID}" \
  --parameters "{
    \"name\": \"github-main-branch\",
    \"issuer\": \"https://token.actions.githubusercontent.com\",
    \"subject\": \"repo:${GITHUB_REPO}:ref:refs/heads/main\",
    \"audiences\": [\"api://AzureADTokenExchange\"],
    \"description\": \"GitHub Actions OIDC for main branch pushes\"
  }" \
  --only-show-errors > /dev/null
echo "  ✓ Federated credential 'github-main-branch' created."

# ── Step 6: Output the values needed for GitHub secrets ─────────────────────

echo ""
echo "============================================="
echo " ✅ Azure setup complete!"
echo "============================================="
echo ""
echo "Add these as GitHub repository secrets:"
echo ""
echo "  AZURE_CLIENT_ID         ${APP_ID}"
echo "  AZURE_TENANT_ID         ${AZURE_TENANT_ID}"
echo "  AZURE_SUBSCRIPTION_ID   ${AZURE_SUBSCRIPTION_ID}"
echo ""

# ── Step 7: Optionally set GitHub secrets via gh CLI ────────────────────────

if command -v gh &> /dev/null; then
  read -rp "Set these secrets in GitHub automatically using 'gh'? [y/N] " REPLY
  if [[ "${REPLY}" =~ ^[Yy]$ ]]; then
    echo "▸ Setting GitHub secrets..."
    gh secret set AZURE_CLIENT_ID       --repo "${GITHUB_REPO}" --body "${APP_ID}"
    gh secret set AZURE_TENANT_ID       --repo "${GITHUB_REPO}" --body "${AZURE_TENANT_ID}"
    gh secret set AZURE_SUBSCRIPTION_ID --repo "${GITHUB_REPO}" --body "${AZURE_SUBSCRIPTION_ID}"
    echo "  ✓ All secrets set in ${GITHUB_REPO}."

    echo ""
    echo "▸ Ensure GitHub environments exist..."
    echo "  ⚠  GitHub CLI cannot create environments. Please verify these exist:"
    echo "     → ${GITHUB_REPO} → Settings → Environments → 'staging'"
    echo "     → ${GITHUB_REPO} → Settings → Environments → 'production'"
  fi
else
  echo "Tip: Install GitHub CLI (gh) to set secrets automatically."
  echo "     https://cli.github.com/"
  echo ""
  echo "Manual steps:"
  echo "  1. Go to https://github.com/${GITHUB_REPO}/settings/secrets/actions"
  echo "  2. Click 'New repository secret' and add each secret above"
  echo "  3. Go to https://github.com/${GITHUB_REPO}/settings/environments"
  echo "  4. Create 'staging' and 'production' environments"
fi

echo ""
echo "Done! Your deploy.yml workflow should now authenticate successfully."
