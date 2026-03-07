import db from '../db.js';

/**
 * Create a new service request in the database.
 */
const createServiceRequest = async ({
    name,
    phone,
    vehicleMake,
    vehicleModel,
    subject,
    message,
    status,
    submittedAt,
    scheduledFor,
    userId
}) => {
    const query = `
        INSERT INTO service_requests
        (name, phone, vehicle_make, vehicle_model, subject, message, status, submitted_at, scheduled_for, user_id)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
        RETURNING *
    `;
    const params = [
        name,
        phone,
        vehicleMake,
        vehicleModel,
        subject,
        message,
        status || 'Submitted',
        submittedAt || new Date(),
        scheduledFor,
        userId || null
    ];
    const result = await db.query(query, params);
    return result.rows[0];
};

/**
 * Get all service requests from the database.
 */
const getAllServiceRequests = async () => {
    const query = `
        SELECT id, name, phone, vehicle_make, vehicle_model, subject, status, submitted_at, scheduled_for, user_id
        FROM service_requests
        ORDER BY submitted_at DESC
    `;
    const result = await db.query(query);
    return result.rows;
};

/**
 * Get a service request by ID.
 */
const getServiceRequestById = async (requestId) => {
    const query = `
        SELECT id, name, phone, vehicle_make, vehicle_model, subject, message, status, submitted_at, scheduled_for, user_id
        FROM service_requests
        WHERE id = $1
    `;
    const result = await db.query(query, [requestId]);
    return result.rows[0];
};

/**
 * Update service request status and optionally add employee notes.
 */
const updateServiceRequestStatus = async (requestId, status, notes = null) => {
    const query = `
        UPDATE service_requests
        SET status = $1, message = CASE 
            WHEN $3 IS NOT NULL THEN message || E'\n---\nEmployee Note: ' || $3 
            ELSE message 
        END
        WHERE id = $2
        RETURNING *
    `;
    const result = await db.query(query, [status, requestId, notes]);
    return result.rows[0];
};

export { createServiceRequest, getAllServiceRequests, getServiceRequestById, updateServiceRequestStatus };
