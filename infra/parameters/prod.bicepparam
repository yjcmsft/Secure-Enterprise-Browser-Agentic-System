using '../main.bicep'

param environment = 'prod'
param alertEmail = 'oncall@company.com'
param containerImage = 'ghcr.io/example/browser-agent:prod'
