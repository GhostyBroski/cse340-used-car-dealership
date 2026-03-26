import { Router } from 'express';
import { vehicleCatalogPage, vehicleDetailPage } from './catalog/catalog.js';
import { homePage, aboutPage, testErrorPage } from './index.js';
import contactRoutes from './forms/contact.js';
import requestRoutes from './forms/requests.js';
import reviewRoutes from './forms/reviews.js';
import registrationRoutes from './forms/registration.js';
import loginRoutes from './forms/login.js';
import { processLogout, showDashboard } from './forms/login.js';
import { requireLogin, requireRole } from '../middleware/auth.js';

// Create a new router instance
const router = Router();

// ============================================================================
// MIDDLEWARE - Add route-specific stylesheets
// ============================================================================

router.use('/catalog', (req, res, next) => {
    res.addStyle('<link rel="stylesheet" href="/css/catalog.css">');
    res.addStyle('<link rel="stylesheet" href="/css/review.css">');
    next();
});

// Add contact-specific styles to all contact routes
router.use('/contact', (req, res, next) => {
    res.addStyle('<link rel="stylesheet" href="/css/contact.css">');
    next();
});

// Add registration-specific styles to all registration routes
router.use('/register', (req, res, next) => {
    res.addStyle('<link rel="stylesheet" href="/css/registration.css">');
    next();
});

router.use('/login', (req, res, next) => {
    res.addStyle('<link rel="stylesheet" href="/css/login.css">');
    next();
});

// Add service request styles to all request routes
router.use('/requests', (req, res, next) => {
    res.addStyle('<link rel="stylesheet" href="/css/request.css">');
    next();
});

// Add vehicle review styles to all review routes
router.use('/reviews', (req, res, next) => {
    res.addStyle('<link rel="stylesheet" href="/css/review.css">');
    next();
});

// ============================================================================
// PUBLIC ROUTES - Home and Info Pages
// ============================================================================

// Add home-specific styles to home page
router.get('/', (req, res, next) => {
    res.addStyle('<link rel="stylesheet" href="/css/catalog.css">');
    res.addStyle('<link rel="stylesheet" href="/css/home.css">');
    next();
}, homePage);
router.get('/about', aboutPage);

// ============================================================================
// PUBLIC ROUTES - Vehicle Catalog
// ============================================================================

// Browse all vehicles or filter by category
// GET /catalog
// GET /catalog?category=1&sort=price_asc
router.get('/catalog', vehicleCatalogPage);

// View individual vehicle details with images, specs, reviews
// GET /catalog/vehicles/1
router.get('/catalog/vehicles/:vehicleId', vehicleDetailPage);

// ============================================================================
// PROTECTED ROUTES - User Authentication & Accounts
// ============================================================================

router.use('/register', registrationRoutes);
router.use('/login', loginRoutes);
router.get('/logout', processLogout);
router.get('/dashboard', requireLogin, showDashboard);

// ============================================================================
// PROTECTED ROUTES - Contact Form (Public but saved to DB)
// ============================================================================

router.use('/contact', contactRoutes);

// ============================================================================
// PROTECTED ROUTES - Service Requests (require login)
// ============================================================================

router.use('/requests', requireLogin, requestRoutes);

// ============================================================================
// PROTECTED ROUTES - Vehicle Reviews (require login)
// ============================================================================

router.use('/reviews', requireLogin, reviewRoutes);

// ============================================================================
// ERROR TESTING
// ============================================================================

router.get('/test-error', testErrorPage);

export default router;