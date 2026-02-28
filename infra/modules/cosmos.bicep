param location string
param databaseName string

resource account 'Microsoft.DocumentDB/databaseAccounts@2024-02-15-preview' = {
  name: 'cosmos-${uniqueString(resourceGroup().id)}'
  location: location
  kind: 'GlobalDocumentDB'
  properties: {
    databaseAccountOfferType: 'Standard'
    locations: [
      {
        locationName: location
      }
    ]
    capabilities: []
  }
}

resource db 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases@2024-02-15-preview' = {
  name: '${account.name}/${databaseName}'
  properties: {
    resource: {
      id: databaseName
    }
  }
}

resource auditLogs 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2024-02-15-preview' = {
  name: '${account.name}/${databaseName}/audit-logs'
  properties: {
    resource: {
      id: 'audit-logs'
      partitionKey: {
        paths: ['/userId']
        kind: 'Hash'
      }
      defaultTtl: 220752000
    }
  }
}

resource workflowState 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2024-02-15-preview' = {
  name: '${account.name}/${databaseName}/workflow-state'
  properties: {
    resource: {
      id: 'workflow-state'
      partitionKey: {
        paths: ['/sessionId']
        kind: 'Hash'
      }
      defaultTtl: 2592000
    }
  }
}

resource memory 'Microsoft.DocumentDB/databaseAccounts/sqlDatabases/containers@2024-02-15-preview' = {
  name: '${account.name}/${databaseName}/conversation-memory'
  properties: {
    resource: {
      id: 'conversation-memory'
      partitionKey: {
        paths: ['/conversationId']
        kind: 'Hash'
      }
      defaultTtl: 2592000
    }
  }
}

output endpoint string = account.properties.documentEndpoint
