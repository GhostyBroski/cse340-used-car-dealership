/**
 * Helper function to get the current greeting based on the time of day.
 */
const getCurrentGreeting = () => {
    const currentHour = new Date().getHours();

    if (currentHour < 12) {
        return 'Good Morning!';
    }

    if (currentHour < 18) {
        return 'Good Afternoon!';
    }

    return 'Good Evening!';
};

/**
 * Role-based access check function
 */
const hasMinimumRole = (userRole, minRole) => {
    const ROLE_HIERARCHY = {
        admin: 3,
        employee: 2,
        user: 1
    };
    const userLevel = ROLE_HIERARCHY[userRole] || 0;
    const minLevel = ROLE_HIERARCHY[minRole] || 0;
    return userLevel >= minLevel;
};

const setHeadAssetsFunctionality = (res) => {
    res.locals.styles = [];
    res.locals.scripts = [];
    res.addStyle = (css, priority = 0) => {
        res.locals.styles.push({ content: css, priority });
    };
    res.addScript = (js, priority = 0) => {
        res.locals.scripts.push({ content: js, priority });
    };
    // These functions will be available in EJS templates
    res.locals.renderStyles = () => {
        return res.locals.styles
            // Sort by priority: higher numbers load first
            .sort((a, b) => b.priority - a.priority)
            .map(item => item.content)
            .join('\n');
    };
    res.locals.renderScripts = () => {
        return res.locals.scripts
            // Sort by priority: higher numbers load first
            .sort((a, b) => b.priority - a.priority)
            .map(item => item.content)
            .join('\n');
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

    // Set greeting based on time of day
    res.locals.greeting = `<p>${getCurrentGreeting()}</p>`;

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
    
    // Helper function to check if user can perform admin actions
    res.locals.canManageVehicles = (userRole) => hasMinimumRole(userRole, 'employee');
    res.locals.canManageCategories = (userRole) => hasMinimumRole(userRole, 'admin');
    res.locals.canManageUsers = (userRole) => hasMinimumRole(userRole, 'admin');
    res.locals.canModerateReviews = (userRole) => hasMinimumRole(userRole, 'employee');
    res.locals.canManageRequests = (userRole) => hasMinimumRole(userRole, 'employee');

    // Randomly assign a theme class to the body
    const themes = ['blue-theme', 'green-theme', 'red-theme'];
    const randomTheme = themes[Math.floor(Math.random() * themes.length)];
    res.locals.bodyClass = randomTheme;

    setHeadAssetsFunctionality(res)

    // Continue to the next middleware or route handler
    next();
};

export { addLocalVariables, hasMinimumRole };