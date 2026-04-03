import db from '../models/db.js';

/**
 * Removes expired sessions from the database.
 * In production, this would typically be handled by a cron job.
 */
const cleanupExpiredSessions = async () => {
    try {
        const result = await db.query(
            `DELETE FROM session WHERE expire < NOW()`
        );

        if (result.rowCount > 0) {
            console.log(`Cleaned up ${result.rowCount} expired sessions`);
        }
    } catch (error) {
        // Check if the error is due to the session table not existing (PostgreSQL error code 42P01)
        if (error.code === '42P01') {
            console.log('Session table does not exist yet:\n→ It will be created when the first session is initialized.');
            return;
        }

        // Log actual errors
        console.error('Error cleaning up sessions:', error);
    }
};

/**
 * Starts automatic session cleanup that runs every 24 hours.
 * Delay initial cleanup to avoid connection pool exhaustion during startup.
 */
const startSessionCleanup = () => {
    // Delay cleanup by 30 seconds to let server stabilize and free up connections
    setTimeout(() => {
        cleanupExpiredSessions();
    }, 30000);

    // Schedule cleanup to run every 12 hours after initial delay
    const twelveHours = 12 * 60 * 60 * 1000;
    setInterval(cleanupExpiredSessions, twelveHours);

    console.log('Session cleanup scheduled to run every 12 hours (after 30s startup delay)');
};

export { startSessionCleanup };