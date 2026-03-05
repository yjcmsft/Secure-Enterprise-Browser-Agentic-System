param location string

resource registry 'Microsoft.ContainerRegistry/registries@2023-07-01' = {
  name: 'acr${uniqueString(resourceGroup().id)}'
  location: location
  sku: {
    name: 'Basic'
  }
  properties: {
    adminUserEnabled: true
  }
}

output loginServer string = registry.properties.loginServer
output registryName string = registry.name
