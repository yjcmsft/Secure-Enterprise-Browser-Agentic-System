param location string
param modelName string
param modelVersion string = '2024-08-06'

resource openAi 'Microsoft.CognitiveServices/accounts@2023-05-01' = {
  name: 'aoai-${uniqueString(resourceGroup().id)}'
  location: location
  kind: 'OpenAI'
  sku: {
    name: 'S0'
  }
  properties: {
    customSubDomainName: 'aoai-${uniqueString(resourceGroup().id)}'
  }
}

resource deployment 'Microsoft.CognitiveServices/accounts/deployments@2023-05-01' = {
  parent: openAi
  name: modelName
  sku: {
    name: 'Standard'
    capacity: 1
  }
  properties: {
    model: {
      format: 'OpenAI'
      name: modelName
      version: modelVersion
    }
  }
}

output endpoint string = openAi.properties.endpoint
