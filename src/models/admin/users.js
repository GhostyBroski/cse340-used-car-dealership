import db from '../db.js';

/**
 * Get all users with their roles
 */
const getAllUsers = async () => {
    const query = `
        SELECT u.id, u.name, u.email, u.created_at, r.id as role_id, r.role_name
        FROM users u
        LEFT JOIN roles r ON u.role_id = r.id
        ORDER BY u.created_at DESC
    `;
    const result = await db.query(query);
    return result.rows.map(row => ({
        id: row.id,
        name: row.name,
        email: row.email,
        createdAt: row.created_at,
        roleId: row.role_id,
        roleName: row.role_name
    }));
};

/**
 * Get a single user by ID with role information
 */
const getUserById = async (userId) => {
    const query = `
        SELECT u.id, u.name, u.email, u.created_at, u.password, r.id as role_id, r.role_name
        FROM users u
        LEFT JOIN roles r ON u.role_id = r.id
        WHERE u.id = $1
    `;
    const result = await db.query(query, [userId]);
    if (!result.rows[0]) return null;
    
    const row = result.rows[0];
    return {
        id: row.id,
        name: row.name,
        email: row.email,
        password: row.password,
        createdAt: row.created_at,
        roleId: row.role_id,
        roleName: row.role_name
    };
};

/**
 * Update a user's role
 */
const updateUserRole = async (userId, roleId) => {
    const query = `
        UPDATE users
        SET role_id = $1
        WHERE id = $2
        RETURNING id, name, email, created_at
    `;
    const result = await db.query(query, [roleId, userId]);
    return result.rows[0] || null;
};

/**
 * Get all available roles
 */
const getAllRoles = async () => {
    const query = `
        SELECT id, role_name, role_description
        FROM roles
        ORDER BY id ASC
    `;
    const result = await db.query(query);
    return result.rows.map(row => ({
        id: row.id,
        name: row.role_name,
        description: row.role_description
    }));
};

/**
 * Get a role by name
 */
const getRoleByName = async (roleName) => {
    const query = `
        SELECT id, role_name, role_description
        FROM roles
        WHERE role_name = $1
    `;
    const result = await db.query(query, [roleName]);
    if (!result.rows[0]) return null;
    
    const row = result.rows[0];
    return {
        id: row.id,
        name: row.role_name,
        description: row.role_description
    };
};

export {
    getAllUsers,
    getUserById,
    updateUserRole,
    getAllRoles,
    getRoleByName
};
