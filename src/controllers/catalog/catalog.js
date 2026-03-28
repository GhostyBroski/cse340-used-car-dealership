import { getAllVehicles, getVehicleById, getFeaturedVehicles, getVehiclesByCategory } from '../../models/catalog/vehicles.js';
import { getCategories } from '../../models/admin/categories.js';
import { getAllReviewsForVehicle } from '../../models/forms/reviews.js';

/**
 * Display all vehicles in the catalog with optional category filter
 * GET /catalog or GET /catalog?category=1&sort=price_asc
 */
const vehicleCatalogPage = async (req, res, next) => {
    try {
        const categoryId = req.query.category || null;
        const sortBy = req.query.sort || 'year_desc';
        
        // Get all categories for the filter sidebar
        const categories = await getCategories();
        
        // Get vehicles (optionally filtered by category)
        let vehicles;
        if (categoryId) {
            vehicles = await getVehiclesByCategory(categoryId, sortBy);
        } else {
            vehicles = await getAllVehicles({
                availableOnly: true,
                sortBy: sortBy
            });
        }
        
        res.render('catalog/list', {
            title: 'Vehicle Catalog',
            vehicles: vehicles,
            categories: categories,
            selectedCategory: categoryId ? parseInt(categoryId) : null,
            currentSort: sortBy
        });
    } catch (error) {
        console.error('Error loading vehicle catalog:', error);
        next(error);
    }
};

/**
 * Display a single vehicle's detail page with images, specs, and reviews
 * GET /catalog/vehicles/:vehicleId
 */
const vehicleDetailPage = async (req, res, next) => {
    try {
        const { vehicleId } = req.params;
        
        // Get vehicle details (includes images, features)
        const vehicle = await getVehicleById(vehicleId);
        
        // Return 404 if vehicle not found
        if (!vehicle) {
            const err = new Error(`Vehicle not found`);
            err.status = 404;
            return next(err);
        }
        
        // Get reviews for the vehicle
        const reviews = await getAllReviewsForVehicle(vehicleId);
        
        // Prepare UI state based on logged-in user
        const isLoggedIn = req.session && req.session.user;
        const userId = isLoggedIn ? req.session.user.id : null;
        
        // Check if current user has already left a review
        let userReview = null;
        if (userId) {
            userReview = reviews.find(r => r.user_id === userId);
        }
        
        res.render('catalog/detail', {
            title: `${vehicle.displayName}`,
            vehicle: vehicle,
            reviews: reviews,
            isLoggedIn: isLoggedIn,
            userReview: userReview,
            canEditReview: userId && userReview && userReview.user_id === userId,
            canDeleteReview: userId && userReview && userReview.user_id === userId
        });
    } catch (error) {
        console.error('Error loading vehicle detail:', error);
        next(error);
    }
};

export { vehicleCatalogPage, vehicleDetailPage };