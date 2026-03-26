/**
 * Role hierarchy: admin > employee > user
 * Admins can do everything, employees can do their tasks, users can do basic tasks
 */
const ROLE_HIERARCHY = {
    admin: 3,
    employee: 2,
    user: 1
};

/**
 * Check if a user role has at least the minimum required role level
 * @param {string} userRole - The user's current role
 * @param {string} minRole - The minimum role required
 * @returns {boolean} True if user has sufficient permissions
 */
const hasMinimumRole = (userRole, minRole) => {
    const userLevel = ROLE_HIERARCHY[userRole] || 0;
    const minLevel = ROLE_HIERARCHY[minRole] || 0;
    return userLevel >= minLevel;
};

/**
 * Middleware to require authentication for protected routes.
 * Redirects to login page if user is not authenticated.
 * Sets res.locals.isLoggedIn = true for authenticated requests.
 */
const requireLogin = (req, res, next) => {
    // Check if user is logged in via session; we can beef this up later with roles and permissions
    if (req.session && req.session.user) {
        // User is authenticated - set UI state and continue
        res.locals.isLoggedIn = true;
        next();
    } else {
        // User is not authenticated - redirect to login
        res.redirect('/login');
    }
};

/**
 * Middleware factory to require role-based access with hierarchy support
 * Admin can access employee routes, employee can access user routes, etc.
 * 
 * @param {string|string[]} roles - The role(s) required (can be single role or array)
 * @returns {Function} Express middleware function
 */
const requireRole = (roles) => {
    // Normalize to array
    const requiredRoles = Array.isArray(roles) ? roles : [roles];
    
    return (req, res, next) => {
        // Check if user is logged in first
        if (!req.session || !req.session.user) {
            req.flash('error', 'You must be logged in to access this page.');
            return res.redirect('/login');
        }
        
        const userRole = req.session.user.roleName;
        
        // Check if user's role meets any of the required roles (with hierarchy)
        const hasAccess = requiredRoles.some(requiredRole => {
            return hasMinimumRole(userRole, requiredRole);
        });
        
        if (!hasAccess) {
            req.flash('error', 'You do not have permission to access this page.');
            return res.redirect('/dashboard');
        }
        
        // User has required role, continue
        next();
    };
};

export { requireLogin, requireRole, hasMinimumRole, ROLE_HIERARCHY };