import db from '../db.js';

/**
 * Create a new review for a vehicle
 * @param {number} userId - ID of reviewing user
 * @param {number} vehicleId - ID of vehicle being reviewed
 * @param {number} rating - Rating from 1-5
 * @param {string} title - Review title
 * @param {string} comment - Review comment text
 * @returns {Promise<Object>} Created review object
 */
const createReview = async (userId, vehicleId, rating, title, comment) => {
    const query = `
        INSERT INTO reviews (user_id, vehicle_id, rating, title, comment)
        VALUES ($1, $2, $3, $4, $5)
        RETURNING *
    `;
    const result = await db.query(query, [userId, vehicleId, rating, title, comment]);
    return result.rows[0];
};

/**
 * Get top N reviews for a vehicle (default 5)
 */
const getTopReviewsForVehicle = async (vehicleId, limit = 5) => {
    const query = `
        SELECT r.id, r.user_id, r.vehicle_id, r.rating, r.title, r.comment, r.created_at, u.name AS user_name
        FROM reviews r
        JOIN users u ON r.user_id = u.id
        WHERE r.vehicle_id = $1
        ORDER BY r.created_at DESC
        LIMIT $2
    `;
    const result = await db.query(query, [vehicleId, limit]);
    return result.rows;
};

/**
 * Get all reviews for a vehicle
 */
const getAllReviewsForVehicle = async (vehicleId) => {
    const query = `
        SELECT r.id, r.user_id, r.vehicle_id, r.rating, r.title, r.comment, r.created_at, u.name AS user_name
        FROM reviews r
        JOIN users u ON r.user_id = u.id
        WHERE r.vehicle_id = $1
        ORDER BY r.created_at DESC
    `;
    const result = await db.query(query, [vehicleId]);
    return result.rows;
};

/**
 * Get a single review by ID
 */
const getReviewById = async (reviewId) => {
    const query = `
        SELECT r.id, r.user_id, r.vehicle_id, r.rating, r.title, r.comment, r.created_at, u.name AS user_name
        FROM reviews r
        JOIN users u ON r.user_id = u.id
        WHERE r.id = $1
    `;
    const result = await db.query(query, [reviewId]);
    return result.rows[0];
};

/**
 * Update a review (only by the review author)
 */
const updateReview = async (reviewId, userId, rating, title, comment) => {
    const query = `
        UPDATE reviews
        SET rating = $1, title = $2, comment = $3, updated_at = CURRENT_TIMESTAMP
        WHERE id = $4 AND user_id = $5
        RETURNING *
    `;
    const result = await db.query(query, [rating, title, comment, reviewId, userId]);
    return result.rows[0];
};

/**
 * Delete a review (only by the review author or admins)
 */
const deleteReview = async (reviewId, userId) => {
    const query = `
        DELETE FROM reviews
        WHERE id = $1 AND user_id = $2
        RETURNING *
    `;
    const result = await db.query(query, [reviewId, userId]);
    return result.rows[0];
};

/**
 * Delete a review as admin (no user check)
 */
const deleteReviewAsAdmin = async (reviewId) => {
    const query = `
        DELETE FROM reviews
        WHERE id = $1
        RETURNING *
    `;
    const result = await db.query(query, [reviewId]);
    return result.rows[0];
};

/**
 * Get reviews by a specific user
 */
const getReviewsByUser = async (userId) => {
    const query = `
        SELECT r.id, r.user_id, r.vehicle_id, r.rating, r.title, r.comment, r.created_at,
               v.make, v.model, v.year
        FROM reviews r
        JOIN vehicles v ON r.vehicle_id = v.id
        WHERE r.user_id = $1
        ORDER BY r.created_at DESC
    `;
    const result = await db.query(query, [userId]);
    return result.rows;
};

export { 
    createReview, 
    getTopReviewsForVehicle, 
    getAllReviewsForVehicle, 
    getReviewById, 
    updateReview, 
    deleteReview,
    deleteReviewAsAdmin,
    getReviewsByUser
};
