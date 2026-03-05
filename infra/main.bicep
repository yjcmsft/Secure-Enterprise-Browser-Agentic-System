targetScope = 'resourceGroup'

@allowed(['dev', 'staging', 'prod'])
param environment string = 'dev'
param location string = resourceGroup().location
param openAIModelName string = 'gpt-4o'
param containerImage string = 'ghcr.io/example/browser-agent:latest'
param alertEmail string = 'dev@company.com'

module openai 'modules/openai.bicep' = {
  name: 'openai-${environment}'
  params: {
    location: location
    modelName: openAIModelName
  }
}

module cosmos 'modules/cosmos.bicep' = {
  name: 'cosmos-${environment}'
  params: {
    location: location
    databaseName: 'browser-agent-db'
  }
}

module keyvault 'modules/keyvault.bicep' = {
  name: 'keyvault-${environment}'
  params: {
    location: location
    enablePurgeProtection: true
  }
}

module contentSafety 'modules/content-safety.bicep' = {
  name: 'content-safety-${environment}'
  params: {
    location: location
  }
}

module monitoring 'modules/monitoring.bicep' = {
  name: 'monitoring-${environment}'
  params: {
    location: location
    alertEmail: alertEmail
  }
}

module containerApp 'modules/container-app.bicep' = {
  name: 'container-app-${environment}'
  params: {
    location: location
    containerImage: containerImage
    minReplicas: environment == 'prod' ? 2 : 0
    maxReplicas: environment == 'prod' ? 20 : 3
    keyVaultUrl: keyvault.outputs.vaultUri
    cosmosEndpoint: cosmos.outputs.endpoint
    openAIEndpoint: openai.outputs.endpoint
    contentSafetyEndpoint: contentSafety.outputs.endpoint
    appInsightsConnectionString: monitoring.outputs.connectionString
  }
}

output appUrl string = containerApp.outputs.appUrl
output openAIEndpoint string = openai.outputs.endpoint
output cosmosEndpoint string = cosmos.outputs.endpoint
output appInsightsConnectionString string = monitoring.outputs.connectionString
