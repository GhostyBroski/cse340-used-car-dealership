import { Router } from 'express';
import { catalogPage, courseDetailPage } from './catalog/catalog.js';
import { homePage, aboutPage, testErrorPage } from './index.js';
import { facultyListPage, facultyDetailPage } from './faculty/faculty.js';
import contactRoutes from './forms/contact.js';
import requestRoutes from './forms/requests.js';
// import { ... } from './forms/requests.js';
import reviewRoutes from './forms/reviews.js';
// import { ... } from './forms/reviews.js';
import registrationRoutes from './forms/registration.js';
import loginRoutes from './forms/login.js';
import { processLogout, showDashboard } from './forms/login.js';
import { requireLogin } from '../middleware/auth.js';

// Create a new router instance
const router = Router();

router.use('/catalog', (req, res, next) => {
    res.addStyle('<link rel="stylesheet" href="/css/catalog.css">');
    next();
});

router.use('/faculty', (req, res, next) => {
    res.addStyle('<link rel="stylesheet" href="/css/faculty.css">');
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
    res.addStyle('<link rel="stylesheet" href="/css/requests.css">');
    next();
});

// Add vehicle review styles to all review routes
router.use('/reviews', (req, res, next) => {
    res.addStyle('<link rel="stylesheet" href="/css/reviews.css">');
    next();
});

// Home and basic pages
router.get('/', homePage);
router.get('/about', aboutPage);

// Course catalog routes
router.get('/catalog', catalogPage);
router.get('/catalog/:slugId', courseDetailPage);

// Route to trigger a test error
router.get('/test-error', testErrorPage);

// Faculty routes for listing and detail pages
router.get('/faculty', facultyListPage);
router.get('/faculty/:facultySlug', facultyDetailPage);

router.use('/contact', contactRoutes);

router.use('/requests', requestRoutes);

router.use('/reviews', reviewRoutes);

router.use('/register', registrationRoutes);

router.use('/login', loginRoutes);
router.get('/dashboard', requireLogin, showDashboard);

router.get('/logout', processLogout);


export default router;