// @ts-nocheck
const test = require('node:test');
const assert = require('node:assert/strict');

const databasePath = require.resolve('../config/database');
const usersSchemaPath = require.resolve('../config/ensureUsersProfileSchema');
const companySchemaPath = require.resolve('../config/ensureCompanySchema');

const loadSchemaBootstrappers = () => {
  const queries = [];
  const client = {
    query: async (query) => {
      queries.push(String(query));
      return { rows: [] };
    },
    release: () => {},
  };
  const originalDatabaseModule = require.cache[databasePath];

  require.cache[databasePath] = {
    id: databasePath,
    filename: databasePath,
    loaded: true,
    exports: Object.assign(
      {
        connect: async () => client,
      },
      {
        isDatabaseConnectivityError: () => false,
        summarizeDatabaseConnectivityError: () => 'unavailable',
      }
    ),
  };
  delete require.cache[usersSchemaPath];
  delete require.cache[companySchemaPath];

  return {
    queries,
    ensureUsersProfileSchema: require('../config/ensureUsersProfileSchema').ensureUsersProfileSchema,
    ensureCompanySchema: require('../config/ensureCompanySchema').ensureCompanySchema,
    restore: () => {
      delete require.cache[usersSchemaPath];
      delete require.cache[companySchemaPath];
      if (originalDatabaseModule) {
        require.cache[databasePath] = originalDatabaseModule;
      } else {
        delete require.cache[databasePath];
      }
    },
  };
};

test('runtime bootstrap creates company overview only after companies table exists', async () => {
  const schema = loadSchemaBootstrappers();

  try {
    await schema.ensureUsersProfileSchema();
    await schema.ensureCompanySchema();

    const companiesTableIndex = schema.queries.findIndex((query) =>
      query.includes('CREATE TABLE IF NOT EXISTS companies')
    );
    const companyOverviewIndex = schema.queries.findIndex((query) =>
      query.includes('CREATE OR REPLACE VIEW company_accounts_overview')
    );

    assert.ok(companiesTableIndex >= 0, 'companies table must be bootstrapped');
    assert.ok(companyOverviewIndex > companiesTableIndex, 'company overview must follow companies table');
  } finally {
    schema.restore();
  }
});
