const mysql = require('mysql2');
const dotenv = require('dotenv');
const { AsyncLocalStorage } = require('async_hooks');

dotenv.config();

const DB_TARGETS = Object.freeze({
  TEST: 'test',
  PRODUCTION: 'production'
});
const DEFAULT_DB_TARGET = DB_TARGETS.TEST;
const DB_TARGET_HEADER = 'X-DB-Target';
const DB_CONNECTION_LIMIT = Number(process.env.DB_CONNECTION_LIMIT || 10);

const dbTargetContext = new AsyncLocalStorage();
const poolCache = new Map();

function normalizeDbTarget(rawTarget) {
  if (rawTarget === undefined || rawTarget === null) return DEFAULT_DB_TARGET;

  const normalized = String(rawTarget).trim().toLowerCase();
  if (!normalized) return DEFAULT_DB_TARGET;
  if (normalized === DB_TARGETS.TEST || normalized === 'testing') return DB_TARGETS.TEST;
  if (normalized === DB_TARGETS.PRODUCTION || normalized === 'prod') return DB_TARGETS.PRODUCTION;
  return null;
}

function getCurrentDbTarget() {
  const contextValue = dbTargetContext.getStore();
  if (contextValue?.dbTarget) return contextValue.dbTarget;

  const envTarget = normalizeDbTarget(process.env.DB_TARGET || process.env.DATABASE_TARGET);
  return envTarget || DEFAULT_DB_TARGET;
}

function buildTestConfig() {
  return {
    host: process.env.TEST_DB_HOST || process.env.DB_HOST || 'localhost',
    user: process.env.TEST_DB_USER || process.env.DB_USER || 'root',
    password:
      process.env.TEST_DB_PASSWORD ??
      process.env.TEST_DB_PASS ??
      process.env.DB_PASSWORD ??
      process.env.DB_PASS ??
      '',
    database: process.env.TEST_DB_NAME || process.env.DB_NAME || 'officemom_admin',
    port: Number(process.env.TEST_DB_PORT || process.env.DB_PORT || 3306),
    connectionLimit: DB_CONNECTION_LIMIT
  };
}

function buildProductionConfig() {
  return {
    host: process.env.PROD_DB_HOST || '',
    user: process.env.PROD_DB_USER || '',
    password: process.env.PROD_DB_PASSWORD ?? process.env.PROD_DB_PASS ?? '',
    database: process.env.PROD_DB_NAME || '',
    port: Number(process.env.PROD_DB_PORT || 3306),
    connectionLimit: DB_CONNECTION_LIMIT
  };
}

function validateDatabaseConfig(config, target) {
  const missing = [];
  if (!config.host) missing.push('host');
  if (!config.user) missing.push('user');
  if (!config.database) missing.push('database');

  if (missing.length > 0) {
    const targetLabel = target === DB_TARGETS.PRODUCTION ? 'production' : 'test';
    const error = new Error(
      `${targetLabel} database is not fully configured. Missing: ${missing.join(', ')}.`
    );
    error.code = 'DB_CONFIG_ERROR';
    throw error;
  }
}

function getConfigForTarget(target) {
  if (target === DB_TARGETS.PRODUCTION) {
    const config = buildProductionConfig();
    validateDatabaseConfig(config, target);
    return config;
  }

  const config = buildTestConfig();
  validateDatabaseConfig(config, DB_TARGETS.TEST);
  return config;
}

function createPoolForTarget(target) {
  const config = getConfigForTarget(target);
  const pool = mysql.createPool(config).promise();

  pool
    .getConnection()
    .then((connection) => {
      console.log(`✅ ${target} database connected successfully`);
      connection.release();
    })
    .catch((error) => {
      console.error(`❌ ${target} database connection failed:`, error.message);
    });

  return pool;
}

function getPoolForTarget(target) {
  if (!poolCache.has(target)) {
    poolCache.set(target, createPoolForTarget(target));
  }
  return poolCache.get(target);
}

function getActivePool() {
  const target = getCurrentDbTarget();
  return getPoolForTarget(target);
}

function dbTargetContextMiddleware(req, res, next) {
  const headerValue = req.get(DB_TARGET_HEADER);
  const isHeaderMissing = headerValue === undefined;
  const normalizedTarget = normalizeDbTarget(headerValue);

  if (!isHeaderMissing && !normalizedTarget) {
    return res.status(400).json({
      success: false,
      error: `Invalid ${DB_TARGET_HEADER} header. Allowed values: test, production`
    });
  }

  const selectedTarget = normalizedTarget || DEFAULT_DB_TARGET;

  try {
    getPoolForTarget(selectedTarget);
  } catch (error) {
    if (error.code === 'DB_CONFIG_ERROR') {
      return res.status(500).json({
        success: false,
        error: error.message
      });
    }
    return next(error);
  }

  return dbTargetContext.run({ dbTarget: selectedTarget }, next);
}

const databaseFacade = {
  execute(query, params = []) {
    return getActivePool().execute(query, params);
  },
  query(query, params = []) {
    return getActivePool().query(query, params);
  },
  getConnection() {
    return getActivePool().getConnection();
  }
};

module.exports = {
  ...databaseFacade,
  DB_TARGETS,
  DEFAULT_DB_TARGET,
  DB_TARGET_HEADER,
  normalizeDbTarget,
  dbTargetContextMiddleware,
  getCurrentDbTarget,
  getPoolForTarget
};
