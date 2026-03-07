import db from '../../db.js';

/**
 * Create a new service request in the database.
 * @param {Object} request - The service request data.
 * @returns {Promise<Object>} The created request record.
 */
export async function createServiceRequest(request) {
    const {
        name,
        phone,
        vehicleMake,
        vehicleModel,
        subject,
        message,
        status,
        submittedAt,
        scheduledFor,
        userId // optional, if user is logged in
    } = request;

    const sql = `
        INSERT INTO service_requests
        (name, phone, vehicle_make, vehicle_model, subject, message, status, submitted_at, scheduled_for, user_id)
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        RETURNING *;
    `;
    const params = [
        name,
        phone,
        vehicleMake,
        vehicleModel,
        subject,
        message,
        status,
        submittedAt,
        scheduledFor,
        userId || null
    ];
    const [row] = await db.query(sql, params);
    return row;
}

/**
 * Get all service requests from the database.
 * @returns {Promise<Array>} List of service requests.
 */
export async function getAllServiceRequests() {
    const sql = `SELECT * FROM service_requests ORDER BY submitted_at DESC;`;
    const rows = await db.query(sql);
    return rows;
}
