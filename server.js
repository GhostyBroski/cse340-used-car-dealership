/**
 * Import Required Modules
 */
import { fileURLToPath } from 'url';
import path from 'path';
import express from 'express';
import routes from './src/controllers/routes.js';
import { addLocalVariables } from './src/middleware/global.js';

import { setupDatabase, testConnection } from './src/models/setup.js';

import session from 'express-session';
import connectPgSimple from 'connect-pg-simple';
import { caCert, pool } from './src/models/db.js';

import { startSessionCleanup } from './src/utils/session-cleanup.js';

import flash from './src/middleware/flash.js';

/**
 * Declare Important Variables
 */
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const NODE_ENV = process.env.NODE_ENV || 'production';
const PORT = process.env.PORT || 3000;

/**
 * Setup Express Server
 */
const app = express();

app.set('trust proxy', 1);

// Initialize PostgreSQL session store
const pgSession = connectPgSimple(session);

// Configure session middleware
app.use(session({
    store: new pgSession({
        pool: pool,  // Reuse the shared connection pool instead of creating a separate one
        tableName: 'session',
        createTableIfMissing: true
    }),
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: false,
    cookie: {
        secure: NODE_ENV.includes('dev') !== true,
        httpOnly: true,
        maxAge: 24 * 60 * 60 * 1000
    }
}));

startSessionCleanup();

/**
 * Configure Express middleware
 */

/**
 * Initialize minimal res.locals FIRST - before ANY other middleware
 * This ensures these variables exist even if an error occurs early in the request,
 * including errors from static file serving
 */
app.use((req, res, next) => {
    // Set up bare minimum template variables that might be needed for error pages
    res.locals.currentYear = new Date().getFullYear();
    res.locals.NODE_ENV = process.env.NODE_ENV?.toLowerCase() || 'production';
    res.locals.isLoggedIn = false;
    res.locals.userRole = null;
    res.locals.userName = null;
    res.locals.userId = null;
    res.locals.links = {
        homepage: "/",
        about: "/about",
        catalog: "/catalog",
        contact: "/contact",
        login: "/login",
        registration: "/register",
        dashboard: "/dashboard"
    };
    res.locals.renderStyles = () => '';
    res.locals.renderScripts = () => '';
    // Provide a default flash function that returns empty messages
    res.locals.flash = () => ({
        success: [],
        error: [],
        warning: [],
        info: []
    });
    next();
});

app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'src/views'));

app.use(express.urlencoded({ extended: true }));
app.use(express.json());

/**
 * Global template variables middleware
 * 
 * Makes common variables available to all EJS templates without having to pass
 * them individually from each route handler
 * 
 * Note: This enhances the minimal setup from above with full functionality
 */
app.use(addLocalVariables);

app.use(flash);

app.use((req, res, next) => {
    // Skip logging for routes that start with /. (like /.well-known/)
    if (!req.path.startsWith('/.')) {
        console.log(`${req.method} ${req.url}`);
    }
    next(); // Pass control to the next middleware or route
});

app.use((req, res, next) => {
    // Make req.query available to all templates for debugging and conditional rendering
    res.locals.queryParams = req.query || {};

    next();
});

/**
 * Routes
 */
app.use('/', routes);

app.use((req, res, next) => {
    const err = new Error('Page Not Found');
    err.status = 404;
    next(err);
});

app.use((err, req, res, next) => {
    // Prevent infinite loops, if a response has already been sent, do nothing
    if (res.headersSent || res.finished) {
        return next(err);
    }

    // Determine status and template
    const status = err.status || 500;
    const timestamp = new Date().toLocaleString();
    const method = req.method;
    const url = req.originalUrl;
    const agent = req.get('User-Agent');

    console.error(`
        --- ERROR REPORT [${timestamp}] ---
        Status:  ${status}
        Message: ${err.message}
        Route:   ${method} ${url}
        Agent:   ${agent}
        isLoggedIn in res.locals: ${res.locals.isLoggedIn}
        Stack:   ${err.stack}
        -----------------------------------
    `);

    const template = status === 404 ? '404' : '500';
    const isProd = res.locals.NODE_ENV === 'production';
    
    // Ensure critical variables are present (should already be set by early middleware)
    if (!res.locals.currentYear) res.locals.currentYear = new Date().getFullYear();
    if (!res.locals.NODE_ENV) res.locals.NODE_ENV = process.env.NODE_ENV?.toLowerCase() || 'production';
    if (!res.locals.isLoggedIn) res.locals.isLoggedIn = false;
    if (!res.locals.userRole) res.locals.userRole = null;
    if (!res.locals.userName) res.locals.userName = null;
    if (!res.locals.userId) res.locals.userId = null;
    if (!res.locals.links) {
        res.locals.links = {
            homepage: "/",
            about: "/about",
            catalog: "/catalog",
            contact: "/contact",
            login: "/login",
            registration: "/register",
            dashboard: "/dashboard"
        };
    }
    if (typeof res.locals.renderStyles !== 'function') {
        res.locals.renderStyles = () => '';
    }
    if (typeof res.locals.renderScripts !== 'function') {
        res.locals.renderScripts = () => '';
    }
    if (typeof res.locals.flash !== 'function') {
        res.locals.flash = () => ({
            success: [],
            error: [],
            warning: [],
            info: []
        });
    }
    
    // Create context with error-specific values
    const context = {
        title: status === 404 ? 'Page Not Found' : `Error ${status}`,
        message: (isProd && status >= 500) ? 'An unexpected server error occurred.' : err.message,
        error: isProd ? null : err,
        stack: isProd ? null : err.stack
    };
    
    // Render the appropriate error template with fallback
    try {
        res.status(status).render(`errors/${template}`, context);
    } catch (renderErr) {
        // If rendering fails, send a simple error page instead
        if (!res.headersSent) {
            res.status(status).send(`<h1>Error ${status}</h1><p>An error occurred.</p>`);
        }
    }
});

/**
 * WS Server for Development Environment
 * Allows for real-time features during development without affecting production
 */
if (NODE_ENV.includes('dev')) {
    const ws = await import('ws');
    try {
        const wsPort = parseInt(PORT) + 1;
        const wsServer = new ws.WebSocketServer({ port: wsPort });
        wsServer.on('listening', () => {
            console.log(`WebSocket server is running on port ${wsPort}`);
        });
        wsServer.on('error', (error) => {
            console.error('WebSocket server error:', error);
        });
    } catch (error) {
        console.error('Failed to start WebSocket server:', error);
    }
}

// Start the server and listen on the specified port
app.listen(PORT, async () => {
    await setupDatabase();
    await testConnection();
    console.log(`Server is running on http://127.0.0.1:${PORT}`);
});