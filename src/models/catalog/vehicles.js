import db from '../db.js';

/**
 * Get all vehicles with optional filtering and sorting
 * 
 * @param {Object} options - Query options
 * @param {boolean} options.featuredOnly - Return only featured vehicles
 * @param {boolean} options.availableOnly - Return only available vehicles (default: true)
 * @param {string} options.categoryId - Filter by category ID
 * @param {string} options.sortBy - Sort option: 'price_asc', 'price_desc', 'year_desc', 'mileage_asc' (default: 'year_desc')
 * @returns {Promise<Array>} Array of vehicle objects with category info
 */
const getAllVehicles = async (options = {}) => {
    const {
        featuredOnly = false,
        availableOnly = true,
        categoryId = null,
        sortBy = 'year_desc'
    } = options;

    let query = `
        SELECT v.id, v.make, v.model, v.year, v.vin, v.price, v.mileage,
               v.color, v.engine_type, v.transmission, v.drivetrain,
               v.seats, v.is_featured, v.is_available,
               v.description, v.created_at,
               c.id as category_id, c.name as category_name,
               (SELECT COUNT(*) FROM reviews WHERE vehicle_id = v.id) as review_count,
               (SELECT AVG(rating) FROM reviews WHERE vehicle_id = v.id) as avg_rating,
               (SELECT image_url FROM vehicle_images WHERE vehicle_id = v.id ORDER BY display_order LIMIT 1) as main_image
        FROM vehicles v
        JOIN categories c ON v.category_id = c.id
        WHERE 1=1
    `;

    const params = [];
    let paramCount = 1;

    if (availableOnly) {
        query += ` AND v.is_available = TRUE`;
    }

    if (featuredOnly) {
        query += ` AND v.is_featured = TRUE`;
    }

    if (categoryId) {
        query += ` AND v.category_id = $${paramCount}`;
        params.push(categoryId);
        paramCount++;
    }

    // Add ORDER BY
    const orderByMap = {
        'price_asc': 'v.price ASC',
        'price_desc': 'v.price DESC',
        'year_desc': 'v.year DESC',
        'year_asc': 'v.year ASC',
        'mileage_asc': 'v.mileage ASC',
        'mileage_desc': 'v.mileage DESC'
    };

    query += ` ORDER BY ${orderByMap[sortBy] || orderByMap['year_desc']}`;

    const result = await db.query(query, params);
    return result.rows.map(row => transformVehicleRow(row));
};

/**
 * Get a single vehicle by ID with all details
 * 
 * @param {number} vehicleId - Vehicle ID
 * @returns {Promise<Object>} Complete vehicle object with images, features, and reviews
 */
const getVehicleById = async (vehicleId) => {
    const vehicleQuery = `
        SELECT v.id, v.make, v.model, v.year, v.vin, v.price, v.mileage,
               v.color, v.color_code, v.engine_type, v.transmission, v.drivetrain,
               v.horsepower, v.fuel_type, v.mpg_highway, v.mpg_city,
               v.seats, v.interior_color, v.interior_material,
               v.is_featured, v.is_available, v.description,
               v.created_at, v.updated_at,
               c.id as category_id, c.name as category_name,
               u.id as created_by_id, u.name as created_by_name,
               (SELECT COUNT(*) FROM reviews WHERE vehicle_id = v.id) as review_count,
               (SELECT AVG(rating) FROM reviews WHERE vehicle_id = v.id) as avg_rating,
               (SELECT COUNT(*) FROM service_requests WHERE vehicle_id = v.id) as service_request_count
        FROM vehicles v
        JOIN categories c ON v.category_id = c.id
        LEFT JOIN users u ON v.created_by = u.id
        WHERE v.id = $1
    `;

    const vehicleResult = await db.query(vehicleQuery, [vehicleId]);
    if (vehicleResult.rows.length === 0) {
        return null;
    }

    const vehicle = transformVehicleRow(vehicleResult.rows[0]);

    // Get all images
    const imagesQuery = `
        SELECT id, image_url, display_order, alt_text
        FROM vehicle_images
        WHERE vehicle_id = $1
        ORDER BY display_order
    `;
    const imagesResult = await db.query(imagesQuery, [vehicleId]);
    vehicle.images = imagesResult.rows;

    // Get all features
    const featuresQuery = `
        SELECT id, feature_name, feature_value
        FROM vehicle_features
        WHERE vehicle_id = $1
        ORDER BY feature_name
    `;
    const featuresResult = await db.query(featuresQuery, [vehicleId]);
    vehicle.features = featuresResult.rows;

    return vehicle;
};

/**
 * Get featured vehicles for homepage display
 * 
 * @param {number} limit - Number of featured vehicles to return (default: 5)
 * @returns {Promise<Array>} Array of featured vehicle objects
 */
const getFeaturedVehicles = async (limit = 5) => {
    return getAllVehicles({
        featuredOnly: true,
        availableOnly: true,
        sortBy: 'year_desc'
    });
};

/**
 * Get vehicles by category
 * 
 * @param {number} categoryId - Category ID
 * @param {string} sortBy - Sort option (default: 'year_desc')
 * @returns {Promise<Array>} Array of vehicle objects in category
 */
const getVehiclesByCategory = async (categoryId, sortBy = 'year_desc') => {
    return getAllVehicles({
        categoryId,
        availableOnly: true,
        sortBy
    });
};

/**
 * Search vehicles by make, model, or features
 * 
 * @param {string} searchTerm - Search term
 * @param {Object} filters - Additional filters (priceMin, priceMax, yearMin, yearMax)
 * @returns {Promise<Array>} Array of matching vehicle objects
 */
const searchVehicles = async (searchTerm, filters = {}) => {
    const { priceMin, priceMax, yearMin, yearMax } = filters;

    let query = `
        SELECT v.id, v.make, v.model, v.year, v.vin, v.price, v.mileage,
               v.color, v.engine_type, v.transmission, v.drivetrain,
               v.seats, v.is_featured, v.is_available,
               v.description, v.created_at,
               c.id as category_id, c.name as category_name,
               (SELECT COUNT(*) FROM reviews WHERE vehicle_id = v.id) as review_count,
               (SELECT AVG(rating) FROM reviews WHERE vehicle_id = v.id) as avg_rating,
               (SELECT image_url FROM vehicle_images WHERE vehicle_id = v.id ORDER BY display_order LIMIT 1) as main_image
        FROM vehicles v
        JOIN categories c ON v.category_id = c.id
        WHERE v.is_available = TRUE
        AND (LOWER(v.make) LIKE LOWER($1) OR LOWER(v.model) LIKE LOWER($1) OR LOWER(c.name) LIKE LOWER($1))
    `;

    const params = [`%${searchTerm}%`];
    let paramCount = 2;

    if (priceMin !== undefined) {
        query += ` AND v.price >= $${paramCount}`;
        params.push(priceMin);
        paramCount++;
    }

    if (priceMax !== undefined) {
        query += ` AND v.price <= $${paramCount}`;
        params.push(priceMax);
        paramCount++;
    }

    if (yearMin !== undefined) {
        query += ` AND v.year >= $${paramCount}`;
        params.push(yearMin);
        paramCount++;
    }

    if (yearMax !== undefined) {
        query += ` AND v.year <= $${paramCount}`;
        params.push(yearMax);
        paramCount++;
    }

    query += ` ORDER BY v.year DESC`;

    const result = await db.query(query, params);
    return result.rows.map(row => transformVehicleRow(row));
};

/**
 * Create a new vehicle
 * 
 * @param {Object} vehicleData - Vehicle information
 * @returns {Promise<Object>} Created vehicle object
 */
const createVehicle = async (vehicleData) => {
    const {
        make, model, year, vin, categoryId, price, mileage = 0, condition = 'Used',
        color, colorCode, engineType, transmission, drivetrain, horsepower,
        fuelType, mpgHighway, mpgCity, seats = 5, interiorColor, interiorMaterial,
        isFeatured = false, isAvailable = true, description, createdBy
    } = vehicleData;

    const query = `
        INSERT INTO vehicles (
            make, model, year, vin, category_id, price, mileage, condition,
            color, color_code, engine_type, transmission, drivetrain, horsepower,
            fuel_type, mpg_highway, mpg_city, seats, interior_color, interior_material,
            is_featured, is_available, description, created_by
        )
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15, $16, $17, $18, $19, $20, $21, $22, $23, $24)
        RETURNING *
    `;

    const params = [
        make, model, year, vin, categoryId, price, mileage, condition,
        color, colorCode, engineType, transmission, drivetrain, horsepower,
        fuelType, mpgHighway, mpgCity, seats, interiorColor, interiorMaterial,
        isFeatured, isAvailable, description, createdBy
    ];

    const result = await db.query(query, params);
    return transformVehicleRow(result.rows[0]);
};

/**
 * Update a vehicle
 * 
 * @param {number} vehicleId - Vehicle ID
 * @param {Object} updates - Fields to update
 * @returns {Promise<Object>} Updated vehicle object
 */
const updateVehicle = async (vehicleId, updates) => {
    const allowedFields = [
        'make', 'model', 'year', 'price', 'mileage', 'condition',
        'color', 'color_code', 'engine_type', 'transmission', 'drivetrain',
        'horsepower', 'fuel_type', 'mpg_highway', 'mpg_city',
        'seats', 'interior_color', 'interior_material',
        'is_featured', 'is_available', 'description'
    ];

    const setClauses = [];
    const values = [vehicleId];

    Object.keys(updates).forEach((key, index) => {
        const snakeKey = key.replace(/([A-Z])/g, '_$1').toLowerCase();
        if (allowedFields.includes(snakeKey)) {
            setClauses.push(`${snakeKey} = $${index + 2}`);
            values.push(updates[key]);
        }
    });

    if (setClauses.length === 0) {
        return getVehicleById(vehicleId);
    }

    setClauses.push('updated_at = CURRENT_TIMESTAMP');

    const query = `
        UPDATE vehicles
        SET ${setClauses.join(', ')}
        WHERE id = $1
        RETURNING *
    `;

    const result = await db.query(query, values);
    return transformVehicleRow(result.rows[0]);
};

/**
 * Add image to vehicle
 * 
 * @param {number} vehicleId - Vehicle ID
 * @param {string} imageUrl - Image URL
 * @param {number} displayOrder - Display order in gallery
 * @param {string} altText - Alt text for image
 * @returns {Promise<Object>} Created image object
 */
const addVehicleImage = async (vehicleId, imageUrl, displayOrder = 0, altText = '') => {
    const query = `
        INSERT INTO vehicle_images (vehicle_id, image_url, display_order, alt_text)
        VALUES ($1, $2, $3, $4)
        RETURNING *
    `;

    const result = await db.query(query, [vehicleId, imageUrl, displayOrder, altText]);
    return result.rows[0];
};

/**
 * Add feature to vehicle
 * 
 * @param {number} vehicleId - Vehicle ID
 * @param {string} featureName - Feature name
 * @param {string} featureValue - Feature value/description
 * @returns {Promise<Object>} Created feature object
 */
const addVehicleFeature = async (vehicleId, featureName, featureValue) => {
    const query = `
        INSERT INTO vehicle_features (vehicle_id, feature_name, feature_value)
        VALUES ($1, $2, $3)
        RETURNING *
    `;

    const result = await db.query(query, [vehicleId, featureName, featureValue]);
    return result.rows[0];
};

/**
 * Get all categories
 * 
 * @returns {Promise<Array>} Array of category objects
 */
const getCategories = async () => {
    const query = `
        SELECT id, name, description, display_order
        FROM categories
        ORDER BY display_order, name
    `;

    const result = await db.query(query);
    return result.rows;
};

/**
 * Transform database row to camelCase vehicle object
 * 
 * @param {Object} row - Database row
 * @returns {Object} Transformed vehicle object
 */
const transformVehicleRow = (row) => ({
    id: row.id,
    make: row.make,
    model: row.model,
    year: row.year,
    vin: row.vin,
    price: parseFloat(row.price),
    mileage: row.mileage,
    condition: row.condition,
    color: row.color,
    colorCode: row.color_code,
    engineType: row.engine_type,
    transmission: row.transmission,
    drivetrain: row.drivetrain,
    horsepower: row.horsepower,
    fuelType: row.fuel_type,
    mpgHighway: row.mpg_highway,
    mpgCity: row.mpg_city,
    seats: row.seats,
    interiorColor: row.interior_color,
    interiorMaterial: row.interior_material,
    isFeatured: row.is_featured,
    isAvailable: row.is_available,
    description: row.description,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    categoryId: row.category_id,
    categoryName: row.category_name,
    reviewCount: parseInt(row.review_count) || 0,
    avgRating: row.avg_rating ? parseFloat(row.avg_rating).toFixed(1) : 'N/A',
    mainImage: row.main_image,
    createdById: row.created_by_id,
    createdByName: row.created_by_name,
    displayName: `${row.year} ${row.make} ${row.model}`,
    serviceRequestCount: row.service_request_count
});

export {
    getAllVehicles,
    getVehicleById,
    getFeaturedVehicles,
    getVehiclesByCategory,
    searchVehicles,
    createVehicle,
    updateVehicle,
    addVehicleImage,
    addVehicleFeature,
    getCategories
};
