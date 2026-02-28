param location string
param alertEmail string

resource workspace 'Microsoft.OperationalInsights/workspaces@2022-10-01' = {
  name: 'log-${uniqueString(resourceGroup().id)}'
  location: location
  properties: {
    sku: {
      name: 'PerGB2018'
    }
  }
}

resource appInsights 'Microsoft.Insights/components@2020-02-02' = {
  name: 'appi-${uniqueString(resourceGroup().id)}'
  location: location
  kind: 'web'
  properties: {
    Application_Type: 'web'
    WorkspaceResourceId: workspace.id
  }
}

resource actionGroup 'Microsoft.Insights/actionGroups@2022-06-01' = {
  name: 'ag-${uniqueString(resourceGroup().id)}'
  location: 'global'
  properties: {
    enabled: true
    groupShortName: 'browserAg'
    emailReceivers: [
      {
        name: 'primary'
        emailAddress: alertEmail
      }
    ]
  }
}

output connectionString string = appInsights.properties.ConnectionString
