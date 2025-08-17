const scanner = require('sonarqube-scanner');

scanner(
  {
    serverUrl: 'http://localhost:9000',
    options: {
      'sonar.projectName': 'IDURAR ERP CRM',
      'sonar.projectDescription': 'IDURAR ERP CRM - Open Source ERP & CRM',
      'sonar.projectKey': 'idurar-erp-crm',
      'sonar.projectVersion': '4.1.0',
      'sonar.sources': '.',
      'sonar.inclusions': 'frontend/src/**,backend/src/**', // Only analyze source files
      'sonar.exclusions': '**/node_modules/**,**/*.test.js,**/__tests__/**,**/coverage/**,**/build/**,**/dist/**',
      'sonar.javascript.lcov.reportPaths': 'coverage/lcov.info', // If you have test coverage set up
      'sonar.sourceEncoding': 'UTF-8',
      'sonar.verbose': 'true',
      'sonar.login': 'squ_7e9d90931bb669787cb5eb062b99557aca25e10a'
    },
  },
  () => process.exit()
);