import db from '../db.js';

/**
 * Create a new review for a vehicle.
 */
const createReview = async (userId, vehicleId, rating, comment) => {
    const query = `
        INSERT INTO reviews (user_id, vehicle_id, rating, comment)
        VALUES ($1, $2, $3, $4)
        RETURNING *
    `;
    const result = await db.query(query, [userId, vehicleId, rating, comment]);
    return result.rows[0];
};

/**
 * Get top N reviews for a vehicle (default 3).
 */
const getTopReviewsForVehicle = async (vehicleId, limit = 3) => {
    const query = `
        SELECT r.id, r.user_id, r.vehicle_id, r.rating, r.comment, r.created_at, u.name AS user_name
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
 * Get all reviews for a vehicle.
 */
const getAllReviewsForVehicle = async (vehicleId) => {
    const query = `
        SELECT r.id, r.user_id, r.vehicle_id, r.rating, r.comment, r.created_at, u.name AS user_name
        FROM reviews r
        JOIN users u ON r.user_id = u.id
        WHERE r.vehicle_id = $1
        ORDER BY r.created_at DESC
    `;
    const result = await db.query(query, [vehicleId]);
    return result.rows;
};

/**
 * Get a single review by ID.
 */
const getReviewById = async (reviewId) => {
    const query = `
        SELECT r.id, r.user_id, r.vehicle_id, r.rating, r.comment, r.created_at, u.name AS user_name
        FROM reviews r
        JOIN users u ON r.user_id = u.id
        WHERE r.id = $1
    `;
    const result = await db.query(query, [reviewId]);
    return result.rows[0];
};

/**
 * Update a review.
 */
const updateReview = async (reviewId, userId, rating, comment) => {
    const query = `
        UPDATE reviews
        SET rating = $1, comment = $2
        WHERE id = $3 AND user_id = $4
        RETURNING *
    `;
    const result = await db.query(query, [rating, comment, reviewId, userId]);
    return result.rows[0];
};

/**
 * Delete a review (by user).
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

export { createReview, getTopReviewsForVehicle, getAllReviewsForVehicle, getReviewById, updateReview, deleteReview };
