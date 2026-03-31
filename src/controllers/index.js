import { getFeaturedVehicles } from '../models/catalog/vehicles.js';

/**
 * Display the home page with featured vehicles
 */
const homePage = async (req, res, next) => {
    try {
        const featuredVehicles = await getFeaturedVehicles(6);
        res.render('home', {
            title: 'Home',
            featuredVehicles: featuredVehicles
        });
    } catch (error) {
        console.error('Error loading home page:', error);
        next(error);
    }
};

const aboutPage = (req, res) => {
    res.render('about', { title: 'About' });
};

const testErrorPage = (req, res, next) => {
    const err = new Error('This is a test error');
    err.status = 500;
    next(err);
};

export { homePage, aboutPage, testErrorPage };