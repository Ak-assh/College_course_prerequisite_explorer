/**
 * Clear Database Script
 * Safely removes all nodes and relationships for clean re-seeding.
 */
require('dotenv').config();
const { getDriver, closeDriver, verifyConnectivity } = require('../server/db');

async function clear() {
  console.log('🧹 Clearing CognoDB Database...');
  const isConnected = await verifyConnectivity();
  if (!isConnected) {
    console.error('❌ Could not connect to CognoDB.');
    process.exit(1);
  }

  const driver = getDriver();
  const session = driver.session();

  try {
    const result = await session.run('MATCH (n) DETACH DELETE n');
    console.log('✅ All nodes and relationships detached and deleted.');
  } catch (error) {
    console.error('❌ Clear failed:', error);
  } finally {
    await session.close();
    await closeDriver();
  }
}

if (require.main === module) {
  clear();
}

module.exports = clear;
