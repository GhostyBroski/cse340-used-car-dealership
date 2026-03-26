import db from '../db.js';

/**
 * Get all categories ordered by display_order
 */
const getAllCategories = async () => {
    const query = `
        SELECT id, name, description, display_order
        FROM categories
        ORDER BY display_order ASC
    `;
    const result = await db.query(query);
    return result.rows;
};

/**
 * Get a single category by ID
 */
const getCategoryById = async (categoryId) => {
    const query = `
        SELECT id, name, description, display_order
        FROM categories
        WHERE id = $1
    `;
    const result = await db.query(query, [categoryId]);
    return result.rows[0] || null;
};

/**
 * Create a new category
 */
const createCategory = async ({ name, description, displayOrder }) => {
    const query = `
        INSERT INTO categories (name, description, display_order)
        VALUES ($1, $2, $3)
        RETURNING id, name, description, display_order
    `;
    const result = await db.query(query, [
        name,
        description || '',
        displayOrder || 999
    ]);
    return result.rows[0];
};

/**
 * Update a category
 */
const updateCategory = async (categoryId, { name, description, displayOrder }) => {
    const query = `
        UPDATE categories
        SET name = $1, description = $2, display_order = $3
        WHERE id = $4
        RETURNING id, name, description, display_order
    `;
    const result = await db.query(query, [
        name,
        description || '',
        displayOrder || 999,
        categoryId
    ]);
    return result.rows[0] || null;
};

/**
 * Delete a category
 * Note: Requires checking if any vehicles use this category first
 */
const deleteCategory = async (categoryId) => {
    const query = `
        DELETE FROM categories
        WHERE id = $1
        RETURNING id
    `;
    const result = await db.query(query, [categoryId]);
    return result.rows[0] || null;
};

/**
 * Check if a category has vehicles associated with it
 */
const getCategoryVehicleCount = async (categoryId) => {
    const query = `
        SELECT COUNT(*) as vehicle_count
        FROM vehicles
        WHERE category_id = $1
    `;
    const result = await db.query(query, [categoryId]);
    return parseInt(result.rows[0]?.vehicle_count || 0);
};

export {
    getAllCategories,
    getCategoryById,
    createCategory,
    updateCategory,
    deleteCategory,
    getCategoryVehicleCount
};
