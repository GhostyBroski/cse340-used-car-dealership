import db from '../db.js';

/**
 * Create a new review for a vehicle.
 */
export async function createReview({ userId, vehicleId, rating, comment }) {
    const sql = `
        INSERT INTO reviews (user_id, vehicle_id, rating, comment)
        VALUES ($1, $2, $3, $4)
        RETURNING *;
    `;
    const params = [userId, vehicleId, rating, comment];
    const { rows } = await db.query(sql, params);
    return rows[0];
}

/**
 * Get top N reviews for a vehicle (default 3).
 */
export async function getTopReviewsForVehicle(vehicleId, limit = 3) {
    const sql = `
        SELECT r.*, u.name AS user_name
        FROM reviews r
        JOIN users u ON r.user_id = u.id
        WHERE r.vehicle_id = $1
        ORDER BY r.created_at DESC
        LIMIT $2;
    `;
    const { rows } = await db.query(sql, [vehicleId, limit]);
    return rows;
}

/**
 * Get all reviews for a vehicle.
 */
export async function getAllReviewsForVehicle(vehicleId) {
    const sql = `
        SELECT r.*, u.name AS user_name
        FROM reviews r
        JOIN users u ON r.user_id = u.id
        WHERE r.vehicle_id = $1
        ORDER BY r.created_at DESC;
    `;
    const { rows } = await db.query(sql, [vehicleId]);
    return rows;
}

/**
 * Delete a review (by user).
 */
export async function deleteReview(reviewId, userId) {
    const sql = `
        DELETE FROM reviews WHERE id = $1 AND user_id = $2 RETURNING *;
    `;
    const { rows } = await db.query(sql, [reviewId, userId]);
    return rows[0];
}
