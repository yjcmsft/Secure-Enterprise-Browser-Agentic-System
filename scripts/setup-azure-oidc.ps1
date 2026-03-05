#Requires -Version 5.1
<#
.SYNOPSIS
    Creates an Azure AD App Registration with federated credentials for
    GitHub Actions OIDC authentication.

.DESCRIPTION
    This script:
      1. Creates an Azure AD App Registration
      2. Creates a Service Principal
      3. Assigns a role (default: Contributor) on the subscription
      4. Creates federated credentials for staging, production, and main branch
      5. Outputs the values needed for GitHub repository secrets
      6. Optionally sets the secrets via GitHub CLI

.PARAMETER GitHubRepo
    GitHub repository in owner/repo format.

.PARAMETER AppDisplayName
    Display name for the Azure AD App Registration.

.PARAMETER SubscriptionId
    Azure subscription ID. Defaults to the current az account.

.PARAMETER TenantId
    Azure tenant ID. Defaults to the current az account.

.PARAMETER Role
    Azure RBAC role to assign. Defaults to Contributor.

.PARAMETER SetGitHubSecrets
    If specified, automatically sets the secrets in GitHub using gh CLI.

.EXAMPLE
    .\setup-azure-oidc.ps1 -GitHubRepo "yjcmsft/Secure-Enterprise-Browser-Agentic-System"

.EXAMPLE
    .\setup-azure-oidc.ps1 -GitHubRepo "yjcmsft/Secure-Enterprise-Browser-Agentic-System" -SetGitHubSecrets
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$GitHubRepo,

    [string]$AppDisplayName = "github-deploy-secure-browser-agent",

    [string]$SubscriptionId,

    [string]$TenantId,

    [string]$Role = "Contributor",

    [switch]$SetGitHubSecrets
)

$ErrorActionPreference = "Stop"

# -- Verify prerequisites --

function Assert-Command {
    param([string]$Name, [string]$HelpUrl)
    if (-not (Get-Command $Name -ErrorAction SilentlyContinue)) {
        Write-Error "$Name is required but not found. Install it from: $HelpUrl"
    }
}

Assert-Command "az" "https://learn.microsoft.com/cli/azure/install-azure-cli"

# Verify az is logged in
$accountJson = az account show --output json 2>$null
if (-not $accountJson) {
    Write-Error "Not logged into Azure CLI. Run 'az login' first."
}
$account = $accountJson | ConvertFrom-Json

if (-not $SubscriptionId) { $SubscriptionId = $account.id }
if (-not $TenantId) { $TenantId = $account.tenantId }

$Environments = @("staging", "production")

Write-Host ""
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host " Azure OIDC Setup for GitHub Actions"         -ForegroundColor Cyan
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host "GitHub Repo:       $GitHubRepo"
Write-Host "App Name:          $AppDisplayName"
Write-Host "Subscription:      $SubscriptionId"
Write-Host "Tenant:            $TenantId"
Write-Host "Role:              $Role"
Write-Host "Environments:      $($Environments -join ', ')"
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""

# -- Step 1: Create Azure AD App Registration --

Write-Host "Step 1: Creating Azure AD App Registration..." -ForegroundColor Yellow
$AppId = az ad app create --display-name $AppDisplayName --query appId --output tsv
if (-not $AppId) { Write-Error "Failed to create App Registration." }
Write-Host "  App (client) ID: $AppId" -ForegroundColor Green

# -- Step 2: Create Service Principal --

Write-Host "Step 2: Creating Service Principal..." -ForegroundColor Yellow
$spExists = az ad sp show --id $AppId --query id --output tsv 2>$null
if ($spExists) {
    Write-Host "  Service Principal already exists, skipping." -ForegroundColor Green
} else {
    az ad sp create --id $AppId --only-show-errors | Out-Null
    Write-Host "  Service Principal created." -ForegroundColor Green
}

# -- Step 3: Assign role on subscription --

Write-Host "Step 3: Assigning '$Role' role on subscription..." -ForegroundColor Yellow
az role assignment create --assignee $AppId --role $Role --scope "/subscriptions/$SubscriptionId" --only-show-errors | Out-Null
Write-Host "  Role assigned." -ForegroundColor Green

# -- Step 4: Create federated credentials for each environment --

foreach ($EnvName in $Environments) {
    $CredName = "github-$EnvName"
    $Subject = "repo:${GitHubRepo}:environment:${EnvName}"

    Write-Host "Step 4: Creating federated credential for '$EnvName'..." -ForegroundColor Yellow
    Write-Host "  Subject: $Subject"

    $ParamsObj = @{
        name        = $CredName
        issuer      = "https://token.actions.githubusercontent.com"
        subject     = $Subject
        audiences   = @("api://AzureADTokenExchange")
        description = "GitHub Actions OIDC for $EnvName environment"
    }
    $ParamsJson = $ParamsObj | ConvertTo-Json -Compress

    az ad app federated-credential create --id $AppId --parameters $ParamsJson --only-show-errors | Out-Null
    Write-Host "  Federated credential '$CredName' created." -ForegroundColor Green
}

# -- Step 5: Federated credential for main branch pushes --

Write-Host "Step 5: Creating federated credential for branch 'main'..." -ForegroundColor Yellow

$MainObj = @{
    name        = "github-main-branch"
    issuer      = "https://token.actions.githubusercontent.com"
    subject     = "repo:${GitHubRepo}:ref:refs/heads/main"
    audiences   = @("api://AzureADTokenExchange")
    description = "GitHub Actions OIDC for main branch pushes"
}
$MainJson = $MainObj | ConvertTo-Json -Compress

az ad app federated-credential create --id $AppId --parameters $MainJson --only-show-errors | Out-Null
Write-Host "  Federated credential 'github-main-branch' created." -ForegroundColor Green

# -- Step 6: Output the values --

Write-Host ""
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host " Azure setup complete!"                        -ForegroundColor Green
Write-Host "=============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Add these as GitHub repository secrets:" -ForegroundColor Yellow
Write-Host ""
Write-Host "  AZURE_CLIENT_ID         $AppId"
Write-Host "  AZURE_TENANT_ID         $TenantId"
Write-Host "  AZURE_SUBSCRIPTION_ID   $SubscriptionId"
Write-Host ""

# -- Step 7: Optionally set GitHub secrets --

if ($SetGitHubSecrets) {
    Assert-Command "gh" "https://cli.github.com/"

    Write-Host "Setting GitHub secrets..." -ForegroundColor Yellow
    gh secret set AZURE_CLIENT_ID       --repo $GitHubRepo --body $AppId
    gh secret set AZURE_TENANT_ID       --repo $GitHubRepo --body $TenantId
    gh secret set AZURE_SUBSCRIPTION_ID --repo $GitHubRepo --body $SubscriptionId
    Write-Host "  All secrets set in $GitHubRepo." -ForegroundColor Green

    Write-Host ""
    Write-Host "Ensure GitHub environments exist:" -ForegroundColor Yellow
    Write-Host "  GitHub CLI cannot create environments. Verify these exist:"
    Write-Host "     $GitHubRepo -> Settings -> Environments -> 'staging'"
    Write-Host "     $GitHubRepo -> Settings -> Environments -> 'production'"
}
else {
    Write-Host "Manual steps:" -ForegroundColor Yellow
    Write-Host "  1. Go to https://github.com/$GitHubRepo/settings/secrets/actions"
    Write-Host "  2. Click 'New repository secret' and add each secret above"
    Write-Host "  3. Go to https://github.com/$GitHubRepo/settings/environments"
    Write-Host "  4. Create 'staging' and 'production' environments"
    Write-Host ""
    Write-Host "Tip: Re-run with -SetGitHubSecrets to set secrets automatically via gh CLI."
}

Write-Host ""
Write-Host "Done! Your deploy.yml workflow should now authenticate successfully." -ForegroundColor Green
