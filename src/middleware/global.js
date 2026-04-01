/**
 * Import hasMinimumRole from auth middleware to avoid duplication
 */
import { hasMinimumRole } from './auth.js';

const setHeadAssetsFunctionality = (res) => {
    res.locals.styles = [];
    res.locals.scripts = [];
    res.addStyle = (css) => {
        res.locals.styles.push(css);
    };
    res.addScript = (js) => {
        res.locals.scripts.push(js);
    };
    // These functions will be available in EJS templates
    res.locals.renderStyles = () => {
        return res.locals.styles.join('\n');
    };
    res.locals.renderScripts = () => {
        return res.locals.scripts.join('\n');
    };
};

/**
 * Middleware to add local variables to res.locals for use in all templates.
 * Templates can access these values but are not required to use them.
 */
const addLocalVariables = (req, res, next) => {
    // Set current year for use in templates
    res.locals.currentYear = new Date().getFullYear();

    // Make NODE_ENV available to all templates
    res.locals.NODE_ENV = process.env.NODE_ENV?.toLowerCase() || 'production';

    // Make req.query available to all templates
    res.locals.queryParams = { ...req.query };

    // Greeting removed - not needed on all pages

    res.locals.links = {
        homepage: "/",
        about: "/about",
        catalog: "/catalog",
        faculty: "/faculty",
        contact: "/contact",
        contactResponses: "/contact/responses",
        requests: "/requests",
        requestList: "/requests/list",
        myRequests: "/requests/my-requests",
        reviews: "/reviews",
        reviewList: "/reviews/list",
        registration: "/register",
        registrationList: "/register/list",
        login: "/login",
        logout: "/logout",
        dashboard: "/dashboard",
        // Admin links
        adminCategories: "/admin/categories",
        adminVehicles: "/admin/vehicles",
        adminUsers: "/admin/users"
    };

    res.locals.isLoggedIn = false;
    res.locals.userRole = null;
    res.locals.userName = null;
    res.locals.userId = null;
    
    if (req.session && req.session.user) {
        res.locals.isLoggedIn = true;
        res.locals.userRole = req.session.user.roleName;
        res.locals.userName = req.session.user.name;
        res.locals.userId = req.session.user.id;
    }

    // Add permission checking function to templates
    res.locals.hasMinimumRole = hasMinimumRole;
    
    // Helper function to check if user is logged in
    res.locals.isLoggedInFn = () => req.session && req.session.user ? true : false;
    
    // Helper function to check if user can perform admin actions
    res.locals.canManageVehicles = (userRole) => hasMinimumRole(userRole, 'employee');
    res.locals.canManageCategories = (userRole) => hasMinimumRole(userRole, 'admin');
    res.locals.canManageUsers = (userRole) => hasMinimumRole(userRole, 'admin');
    res.locals.canModerateReviews = (userRole) => hasMinimumRole(userRole, 'employee');
    res.locals.canManageRequests = (userRole) => hasMinimumRole(userRole, 'employee');

    setHeadAssetsFunctionality(res)

    // Continue to the next middleware or route handler
    next();
};

export { addLocalVariables, hasMinimumRole };