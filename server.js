/**
 * Import Required Modules
 */
import { fileURLToPath } from 'url';
import path from 'path';
import express from 'express';
import routes from './src/controllers/routes.js';
import { addLocalVariables } from './src/middleware/global.js';

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

/**
 * Configure Express middleware
 */
app.use(express.static(path.join(__dirname, 'public')));
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'src/views'));

/**
 * Global template variables middleware
 * 
 * Makes common variables available to all EJS templates without having to pass
 * them individually from each route handler
 */
app.use(addLocalVariables);


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
        Stack:   ${err.stack}
        -----------------------------------
    `);

    const template = status === 404 ? '404' : '500';
    const isProd = res.locals.NODE_ENV === 'production';
    // Prepare data for the template
    const context = {
        title: status === 404 ? 'Page Not Found' : `Error ${status}`,
        message: (isProd && status >= 500) ? 'An unexpected server error occurred.' : err.message,
        error: isProd ? null : err,
        stack: isProd ? null : err.stack,
        NODE_ENV // Our WebSocket check needs this and its convenient to pass along
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
app.listen(PORT, () => {
    console.log(`Server is running on http://127.0.0.1:${PORT}`);
});