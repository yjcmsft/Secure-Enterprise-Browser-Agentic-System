param(
  [string]$EnvironmentName = $env:AZURE_ENV_NAME
)

if (-not $EnvironmentName) {
  $EnvironmentName = [System.Environment]::GetEnvironmentVariable('AZURE_ENV_NAME','User')
}

if (-not $EnvironmentName) {
  $EnvironmentName = 'secure-browser-agent-dev'
}

$location = $env:AZURE_LOCATION
if (-not $location) {
  $location = 'eastus'
}

$subscription = $env:AZURE_SUBSCRIPTION_ID

azd env select $EnvironmentName
if ($LASTEXITCODE -ne 0) {
  if ($subscription) {
    azd env new $EnvironmentName --location $location --subscription $subscription --no-prompt
  } else {
    azd env new $EnvironmentName --location $location --no-prompt
  }
}

azd up --no-prompt
