param location string
param enablePurgeProtection bool = false

resource vault 'Microsoft.KeyVault/vaults@2023-02-01' = {
  name: 'kv-${uniqueString(resourceGroup().id)}'
  location: location
  properties: {
    tenantId: subscription().tenantId
    sku: {
      family: 'A'
      name: 'standard'
    }
    enablePurgeProtection: enablePurgeProtection
    enableSoftDelete: true
    accessPolicies: []
  }
}

output vaultUri string = vault.properties.vaultUri
