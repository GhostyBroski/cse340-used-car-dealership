import db from './db.js';
import fs from 'fs';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

/**
 * Sets up the database by running the seed.sql file if needed.
 * Checks if vehicles table has data - if not, runs a full re-seed.
 */
const setupDatabase = async () => {
    /**
     * Check if vehicles table has any rows and wrap in try-catch to handle cases
     * where table doesn't exist yet.
     */
    let hasData = false;
    try {
        const result = await db.query(
            "SELECT EXISTS (SELECT 1 FROM vehicles LIMIT 1) as has_data"
        );
        hasData = result.rows[0]?.has_data || false;
    } catch (error) {
        /**
         * If query fails (e.g., table doesn't exist), treat the same as no data.
         * This allows the seed process to proceed.
         */
        hasData = false;
    }
    
    if (hasData) {
        console.log('Database already seeded');
        return true;
    }
    
    // No vehicles found - run full seed from seed.sql
    console.log('Seeding database from seed.sql...');
    const seedPath = join(__dirname, 'sql', 'seed.sql');
    if (fs.existsSync(seedPath)) {
        const seedSQL = fs.readFileSync(seedPath, 'utf8');
        await db.query(seedSQL);
        console.log('Database schema created and seeded successfully');
    } else {
        console.warn('Warning: seed.sql not found at', seedPath);
    }
    
    return true;
};

/**
 * Tests the database connection by executing a simple query.
 */
const testConnection = async () => {
    const result = await db.query('SELECT NOW() as current_time');
    console.log('Database connection successful:', result.rows[0].current_time);
    return true;
};

export { setupDatabase, testConnection };