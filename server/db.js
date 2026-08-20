/**
 * Database Singleton & Helper Module for CognoDB / Neo4j
 * Handles Bolt protocol connection, session lifecycle, and integer conversion.
 */
const neo4j = require('neo4j-driver');
require('dotenv').config();

let driver = null;
let isConnected = false;

let isOffline = false;

/**
 * Initializes and returns the Neo4j/CognoDB driver singleton.
 * @returns {neo4j.Driver}
 */
function getDriver() {
  if (!driver) {
    const uri = process.env.NEO4J_URI;
    const password = process.env.NEO4J_PASSWORD;
    const username = process.env.NEO4J_USER || 'cognodb';

    if (!uri || !password) {
      console.warn('⚠️ NEO4J_URI or NEO4J_PASSWORD environment variables are missing! Database calls may fail.');
    }

    driver = neo4j.driver(
      uri || 'bolt+s://demo.databases.cognodb.cloud',
      neo4j.auth.basic(username, password || ''),
      {
        maxConnectionLifetime: 3 * 60 * 60 * 1000, // 3 hours
        maxConnectionPoolSize: 50,
        connectionAcquisitionTimeout: 15000, // 15s for cloud latency
        disableLosslessIntegers: false
      }
    );
  }
  return driver;
}

/**
 * Recursively converts Neo4j Integers, Records, and Nodes to plain JavaScript types.
 * @param {any} value 
 * @returns {any}
 */
function toPlainObject(value) {
  if (value === null || value === undefined) {
    return value;
  }
  if (neo4j.isInt(value)) {
    return value.toNumber();
  }
  if (Array.isArray(value)) {
    return value.map(toPlainObject);
  }
  if (typeof value === 'object') {
    // If it's a Neo4j Node or Relationship with properties
    if (value.properties && typeof value.properties === 'object') {
      return toPlainObject(value.properties);
    }
    const plain = {};
    for (const key of Object.keys(value)) {
      plain[key] = toPlainObject(value[key]);
    }
    return plain;
  }
  return value;
}

/**
 * Executes a parameterized openCypher query on CognoDB.
 * Automatically manages session creation and guarantees session.close() in finally block.
 * 
 * @param {string} cypher - The parameterized openCypher query string
 * @param {Object} params - Query parameters object
 * @returns {Promise<Array<Object>>} Array of plain record objects
 */
async function runQuery(cypher, params = {}) {
  if (isOffline) {
    const dbError = new Error('Database offline mode.');
    dbError.status = 503;
    dbError.code = 'DB_UNAVAILABLE';
    throw dbError;
  }

  const d = getDriver();
  const session = d.session();
  try {
    const result = await session.run(cypher, params);
    return result.records.map(record => {
      const row = {};
      record.keys.forEach(key => {
        row[key] = toPlainObject(record.get(key));
      });
      return row;
    });
  } catch (error) {
    // Check if error is due to database service unavailability or timeout
    if (
      error.code === 'ServiceUnavailable' ||
      error.code === 'SessionExpired' ||
      error.name === 'ServiceUnavailable' ||
      error.message.includes('Could not perform discovery') ||
      error.message.includes('Failed to connect') ||
      error.message.includes('getaddrinfo') ||
      error.message.includes('Connection acquisition timed out') ||
      error.message.includes('timed out')
    ) {
      isOffline = true;
      const dbError = new Error('Database is currently unavailable. Please verify CognoDB credentials.');
      dbError.status = 503;
      dbError.code = 'DB_UNAVAILABLE';
      dbError.originalError = error;
      throw dbError;
    }
    throw error;
  } finally {
    await session.close();
  }
}

/**
 * Verifies live database connectivity.
 * @returns {Promise<boolean>}
 */
async function verifyConnectivity() {
  try {
    const d = getDriver();
    await d.verifyConnectivity();
    isConnected = true;
    isOffline = false;
    console.log('✅ Connected to CognoDB successfully');
    return true;
  } catch (error) {
    isConnected = false;
    isOffline = true;
    console.warn('⚠️ CognoDB connection check failed (using fallback engine):', error.message);
    return false;
  }
}

/**
 * Closes the database driver connection pool gracefully.
 */
async function closeDriver() {
  if (driver) {
    await driver.close();
    driver = null;
    isConnected = false;
  }
}

module.exports = {
  getDriver,
  runQuery,
  verifyConnectivity,
  closeDriver,
  toPlainObject,
  isConnected: () => isConnected
};
