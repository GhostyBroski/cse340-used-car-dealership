/**
 * Database Reset Script (DESTRUCTIVE!)
 * 
 * WARNING: This script DELETES all data and recreates the database from scratch!
 * 
 * This is useful for:
 * - Development: Starting fresh with test data
 * - Testing: Resetting to known state
 * - Troubleshooting: Eliminating data corruption
 * 
 * REQUIRES the --confirm flag to prevent accidental use.
 * 
 * Usage: node --env-file=.env reset.js --confirm
 * 
 * DO NOT RUN if you care about existing data!
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Pool } from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Check for --confirm flag
const hasConfirmFlag = process.argv.includes('--confirm');

if (!hasConfirmFlag) {
    console.error('🚫 SAFETY CHECK FAILED');
    console.error('');
    console.error('❌ This script DELETES ALL DATA from your database!');
    console.error('');
    console.error('If you really want to do this, run:');
    console.error('   node --env-file=.env reset.js --confirm');
    console.error('');
    process.exit(1);
}

// Read CA certificate
const caCertPath = path.join(__dirname, 'bin', 'byuicse-psql-cert.pem');
const caCert = fs.readFileSync(caCertPath);

// Create connection pool
const pool = new Pool({
    connectionString: process.env.DB_URL,
    ssl: {
        ca: caCert,
        rejectUnauthorized: true,
        checkServerIdentity: () => { return undefined; }
    }
});

/**
 * Main reset function
 */
async function resetDatabase() {
    const client = await pool.connect();
    
    try {
        console.log('⚠️  DESTRUCTIVE RESET IN PROGRESS');
        console.log('📂 Reading seed.sql...');
        const seedPath = path.join(__dirname, 'src', 'models', 'sql', 'seed.sql');
        const sqlScript = fs.readFileSync(seedPath, 'utf8');
        
        console.log('🔄 Dropping all tables and recreating from scratch...');
        await client.query(sqlScript);
        
        console.log('✅ Database reset completed successfully!');
        console.log('📊 All tables have been recreated with initial seed data.');
        
        // Query counts to show what was created
        const userCount = await pool.query("SELECT COUNT(*) as count FROM users");
        const vehicleCount = await pool.query("SELECT COUNT(*) as count FROM vehicles");
        const categoryCount = await pool.query("SELECT COUNT(*) as count FROM categories");
        
        console.log(`\n📈 Data Summary:`);
        console.log(`  • Users: ${userCount.rows[0].count}`);
        console.log(`  • Vehicles: ${vehicleCount.rows[0].count}`);
        console.log(`  • Categories: ${categoryCount.rows[0].count}`);
        
        console.log('\n✨ Database reset to clean state!');
        
    } catch (error) {
        console.error('❌ Error resetting database:', error.message);
        if (error.detail) {
            console.error('   Details:', error.detail);
        }
        process.exit(1);
    } finally {
        client.release();
        await pool.end();
    }
}

// Run reset
console.log('🚀 Starting database reset...\n');
resetDatabase().then(() => {
    console.log('\n✅ All done!');
    process.exit(0);
}).catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
