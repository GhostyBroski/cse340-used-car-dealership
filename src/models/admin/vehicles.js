import db from '../db.js';

/**
 * Create a new vehicle
 */
const createVehicle = async ({
    make,
    model,
    year,
    price,
    vin,
    color,
    mileage,
    categoryId,
    description,
    imageUrl,
    availability
}) => {
    const query = `
        INSERT INTO vehicles (make, model, year, price, vin, color, mileage, category_id, description, image_url, availability)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
        RETURNING id, make, model, year, price, vin, color, mileage, category_id, description, image_url, availability
    `;
    const result = await db.query(query, [
        make,
        model,
        year,
        price,
        vin,
        color,
        mileage || 0,
        categoryId,
        description || '',
        imageUrl || '',
        availability !== undefined ? availability : true
    ]);
    return result.rows[0];
};

/**
 * Update a vehicle
 */
const updateVehicle = async (vehicleId, updates) => {
    const {
        make,
        model,
        year,
        price,
        color,
        mileage,
        categoryId,
        description,
        imageUrl,
        availability
    } = updates;

    const query = `
        UPDATE vehicles
        SET make = $1, model = $2, year = $3, price = $4, color = $5, mileage = $6,
            category_id = $7, description = $8, image_url = $9, availability = $10
        WHERE id = $11
        RETURNING id, make, model, year, price, vin, color, mileage, category_id, description, image_url, availability
    `;
    const result = await db.query(query, [
        make,
        model,
        year,
        price,
        color,
        mileage || 0,
        categoryId,
        description || '',
        imageUrl || '',
        availability !== undefined ? availability : true,
        vehicleId
    ]);
    return result.rows[0] || null;
};

/**
 * Delete a vehicle
 * Note: This will also delete associated reviews and service requests
 */
const deleteVehicle = async (vehicleId) => {
    const query = `
        DELETE FROM vehicles
        WHERE id = $1
        RETURNING id
    `;
    const result = await db.query(query, [vehicleId]);
    return result.rows[0] || null;
};

/**
 * Get vehicle count by category
 */
const getVehicleCountByCategory = async (categoryId) => {
    const query = `
        SELECT COUNT(*) as count
        FROM vehicles
        WHERE category_id = $1
    `;
    const result = await db.query(query, [categoryId]);
    return parseInt(result.rows[0]?.count || 0);
};

export {
    createVehicle,
    updateVehicle,
    deleteVehicle,
    getVehicleCountByCategory
};
