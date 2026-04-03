/**
 * Verification script to check database seeding status
 * Run with: node --env-file=.env verify-seed.js
 */

import db from './src/models/db.js';

async function verifySeed() {
    try {
        console.log('\n🔍 DATABASE SEEDING VERIFICATION\n');
        
        // Check users
        console.log('📋 Users in database:');
        const usersResult = await db.query(`
            SELECT id, name, email, password, r.role_name as role
            FROM users u
            LEFT JOIN roles r ON u.role_id = r.id
            ORDER BY u.id
        `);
        
        if (usersResult.rows.length === 0) {
            console.log('   ❌ No users found');
        } else {
            usersResult.rows.forEach(user => {
                const passwordPreview = user.password.substring(0, 20) + '...';
                console.log(`   ✓ ${user.name} (${user.email}) - Role: ${user.role} - Password: ${passwordPreview}`);
            });
        }
        
        // Check roles
        console.log('\n📋 Roles in database:');
        const rolesResult = await db.query(`
            SELECT id, role_name, role_description
            FROM roles
            ORDER BY id
        `);
        
        if (rolesResult.rows.length === 0) {
            console.log('   ❌ No roles found');
        } else {
            rolesResult.rows.forEach(role => {
                console.log(`   ✓ ID ${role.id}: ${role.role_name} - ${role.role_description}`);
            });
        }
        
        // Check categories
        console.log('\n📋 Categories in database:');
        const categoriesResult = await db.query(`
            SELECT id, name, description
            FROM categories
            ORDER BY id
        `);
        
        console.log(`   Found ${categoriesResult.rows.length} categories`);
        if (categoriesResult.rows.length > 0) {
            categoriesResult.rows.slice(0, 3).forEach(cat => {
                console.log(`   ✓ ${cat.name}`);
            });
            if (categoriesResult.rows.length > 3) {
                console.log(`   ... and ${categoriesResult.rows.length - 3} more`);
            }
        }
        
        // Check vehicles
        console.log('\n📋 Vehicles in database:');
        const vehiclesResult = await db.query(`
            SELECT COUNT(*) as count
            FROM vehicles
        `);
        console.log(`   Found ${vehiclesResult.rows[0].count} vehicles`);
        
        console.log('\n✅ Verification complete!\n');
        
    } catch (error) {
        console.error('\n❌ Error during verification:', error.message);
        console.error('\nError details:', error);
    } finally {
        process.exit(0);
    }
}

verifySeed();
