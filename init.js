/**
 * Database Initialization Script (SAFE)
 * 
 * This script checks if the database is already initialized.
 * If NOT initialized, it runs seed.sql to create schema and seed initial data.
 * If ALREADY initialized, it exits without making any changes.
 * 
 * This is the SAFE way to run on Render deployment (no data loss risk).
 * 
 * Usage: node --env-file=.env init.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { Pool } from 'pg';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

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
 * Check if database is already initialized
 */
async function isDatabaseInitialized() {
    const client = await pool.connect();
    try {
        const result = await client.query(`
            SELECT EXISTS (
                SELECT 1 FROM information_schema.tables 
                WHERE table_name = 'users'
            )
        `);
        return result.rows[0].exists;
    } finally {
        client.release();
    }
}

/**
 * Main initialization function
 */
async function initializeDatabase() {
    try {
        console.log('🔍 Checking database initialization status...');
        
        const isInitialized = await isDatabaseInitialized();
        
        if (isInitialized) {
            console.log('✅ Database is already initialized.');
            console.log('   No changes were made to protect existing data.');
            process.exit(0);
        }
        
        console.log('📂 Database not initialized. Reading seed.sql...');
        const seedPath = path.join(__dirname, 'src', 'models', 'sql', 'seed.sql');
        const sqlScript = fs.readFileSync(seedPath, 'utf8');
        
        const client = await pool.connect();
        try {
            console.log('🔄 Executing database initialization script...');
            await client.query(sqlScript);
            
            console.log('✅ Database initialization completed successfully!');
            console.log('📊 Tables have been created and seeded with initial data.');
            
            // Query counts to show what was created
            const userCount = await pool.query("SELECT COUNT(*) as count FROM users");
            const vehicleCount = await pool.query("SELECT COUNT(*) as count FROM vehicles");
            const categoryCount = await pool.query("SELECT COUNT(*) as count FROM categories");
            
            console.log(`\n📈 Data Summary:`);
            console.log(`  • Users: ${userCount.rows[0].count}`);
            console.log(`  • Vehicles: ${vehicleCount.rows[0].count}`);
            console.log(`  • Categories: ${categoryCount.rows[0].count}`);
            
            console.log('\n✨ Ready to use! Create your admin account via registration form.');
        } finally {
            client.release();
        }
    } catch (error) {
        console.error('❌ Error initializing database:', error.message);
        if (error.detail) {
            console.error('   Details:', error.detail);
        }
        process.exit(1);
    } finally {
        await pool.end();
    }
}

// Run initialization
console.log('🚀 Starting database initialization...\n');
initializeDatabase().then(() => {
    process.exit(0);
}).catch(error => {
    console.error('Fatal error:', error);
    process.exit(1);
});
