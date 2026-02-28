param location string

resource contentSafety 'Microsoft.CognitiveServices/accounts@2023-05-01' = {
  name: 'cs-${uniqueString(resourceGroup().id)}'
  location: location
  kind: 'ContentSafety'
  sku: {
    name: 'S0'
  }
  properties: {
    customSubDomainName: 'cs-${uniqueString(resourceGroup().id)}'
  }
}

output endpoint string = contentSafety.properties.endpoint
