import db from '../db.js';

/**
 * Create a new service request in the database.
 * Now properly links to specific vehicle record via vehicle_id.
 */
const createServiceRequest = async ({
    name,
    phone,
    email,
    vehicleId,
    vehicleMake,  // optional fallback for backward compatibility
    vehicleModel,  // optional fallback for backward compatibility
    subject,
    message,
    requestType,
    status,
    submittedAt,
    scheduledFor,
    userId,
    adminNotes,
    assignedTo
}) => {
    const query = `
        INSERT INTO service_requests
        (name, phone, email, vehicle_id, subject, message, request_type, status, submitted_at, scheduled_for, user_id, admin_notes, assigned_to)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
        RETURNING *
    `;
    const params = [
        name,
        phone,
        email || null,
        vehicleId || null,
        subject,
        message,
        requestType || 'General',
        status || 'Submitted',
        submittedAt || new Date(),
        scheduledFor,
        userId || null,
        adminNotes || null,
        assignedTo || null
    ];
    const result = await db.query(query, params);
    return result.rows[0];
};

/**
 * Get all service requests from the database with vehicle details.
 * Joins with vehicles table to get complete information.
 */
const getAllServiceRequests = async () => {
    const query = `
        SELECT 
            sr.id, sr.name, sr.phone, sr.email, sr.subject, sr.status, 
            sr.request_type, sr.submitted_at, sr.scheduled_for, sr.user_id,
            sr.admin_notes, sr.assigned_to,
            v.id as vehicle_id, v.make, v.model, v.year, v.vin,
            u.name as assigned_user_name
        FROM service_requests sr
        LEFT JOIN vehicles v ON sr.vehicle_id = v.id
        LEFT JOIN users u ON sr.assigned_to = u.id
        ORDER BY sr.submitted_at DESC
    `;
    const result = await db.query(query);
    return result.rows.map(row => ({
        id: row.id,
        name: row.name,
        phone: row.phone,
        email: row.email,
        subject: row.subject,
        status: row.status,
        requestType: row.request_type,
        submittedAt: row.submitted_at,
        scheduledFor: row.scheduled_for,
        userId: row.user_id,
        adminNotes: row.admin_notes,
        assignedTo: row.assigned_to,
        vehicle: row.vehicle_id ? {
            id: row.vehicle_id,
            make: row.make,
            model: row.model,
            year: row.year,
            vin: row.vin,
            displayName: `${row.year} ${row.make} ${row.model}`
        } : null,
        assignedUserName: row.assigned_user_name
    }));
};

/**
 * Get a service request by ID with vehicle details.
 */
const getServiceRequestById = async (requestId) => {
    const query = `
        SELECT 
            sr.id, sr.name, sr.phone, sr.email, sr.subject, sr.message, sr.status,
            sr.request_type, sr.submitted_at, sr.scheduled_for, sr.user_id,
            sr.admin_notes, sr.assigned_to,
            v.id as vehicle_id, v.make, v.model, v.year, v.vin, v.mileage, v.price,
            u.name as assigned_user_name
        FROM service_requests sr
        LEFT JOIN vehicles v ON sr.vehicle_id = v.id
        LEFT JOIN users u ON sr.assigned_to = u.id
        WHERE sr.id = $1
    `;
    const result = await db.query(query, [requestId]);
    if (result.rows.length === 0) {
        return null;
    }
    const row = result.rows[0];
    return {
        id: row.id,
        name: row.name,
        phone: row.phone,
        email: row.email,
        subject: row.subject,
        message: row.message,
        status: row.status,
        requestType: row.request_type,
        submittedAt: row.submitted_at,
        scheduledFor: row.scheduled_for,
        userId: row.user_id,
        adminNotes: row.admin_notes,
        assignedTo: row.assigned_to,
        vehicle: row.vehicle_id ? {
            id: row.vehicle_id,
            make: row.make,
            model: row.model,
            year: row.year,
            vin: row.vin,
            mileage: row.mileage,
            price: row.price,
            displayName: `${row.year} ${row.make} ${row.model}`
        } : null,
        assignedUserName: row.assigned_user_name
    };
};

/**
 * Update service request status, assigned employee, and admin notes.
 */
const updateServiceRequestStatus = async (requestId, { status, adminNotes = null, assignedTo = null, completedAt = null }) => {
    const query = `
        UPDATE service_requests
        SET status = $1,
            admin_notes = COALESCE($2, admin_notes),
            assigned_to = COALESCE($3::INTEGER, assigned_to),
            completed_at = CASE WHEN $4 = 'Completed' THEN CURRENT_TIMESTAMP ELSE completed_at END
        WHERE id = $5
        RETURNING *
    `;
    const result = await db.query(query, [status, adminNotes, assignedTo, status, requestId]);
    return result.rows[0];
};

/**
 * Get all service requests for a specific vehicle.
 */
const getServiceRequestsByVehicle = async (vehicleId) => {
    const query = `
        SELECT 
            sr.id, sr.name, sr.phone, sr.email, sr.subject, sr.status,
            sr.request_type, sr.submitted_at, sr.scheduled_for, sr.user_id,
            sr.admin_notes
        FROM service_requests sr
        WHERE sr.vehicle_id = $1
        ORDER BY sr.submitted_at DESC
    `;
    const result = await db.query(query, [vehicleId]);
    return result.rows;
};

/**
 * Get service requests assigned to a specific employee.
 */
const getServiceRequestsByEmployee = async (employeeId) => {
    const query = `
        SELECT 
            sr.id, sr.name, sr.phone, sr.email, sr.subject, sr.status,
            sr.request_type, sr.submitted_at, sr.scheduled_for, sr.user_id,
            v.make, v.model, v.year
        FROM service_requests sr
        LEFT JOIN vehicles v ON sr.vehicle_id = v.id
        WHERE sr.assigned_to = $1
        ORDER BY sr.status, sr.submitted_at
    `;
    const result = await db.query(query, [employeeId]);
    return result.rows;
};

export { 
    createServiceRequest, 
    getAllServiceRequests, 
    getServiceRequestById, 
    updateServiceRequestStatus,
    getServiceRequestsByVehicle,
    getServiceRequestsByEmployee
};
