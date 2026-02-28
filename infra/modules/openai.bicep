param location string
param modelName string

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
  name: '${openAi.name}/${modelName}'
  properties: {
    model: {
      format: 'OpenAI'
      name: modelName
      version: 'latest'
    }
    scaleSettings: {
      scaleType: 'Standard'
      capacity: 1
    }
  }
}

output endpoint string = openAi.properties.endpoint
