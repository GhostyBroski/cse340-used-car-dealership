import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { requireRole, hasMinimumRole } from '../../middleware/auth.js';
import {
    getAllCategories,
    getCategoryById,
    createCategory,
    updateCategory,
    deleteCategory,
    getCategoryVehicleCount
} from '../../models/admin/categories.js';
import {
    getAllUsers,
    getUserById,
    updateUserRole,
    getAllRoles
} from '../../models/admin/users.js';
import {
    getAllVehicles,
    getVehicleById,
    getVehicleByVin,
    updateVehicle,
    createVehicle
} from '../../models/catalog/vehicles.js';

const router = Router();

// ============================================================================
// CATEGORY MANAGEMENT - Admin only
// ============================================================================

/**
 * Display all categories for management
 * GET /admin/categories
 */
const showCategories = async (req, res, next) => {
    try {
        const categories = await getAllCategories();
        
        // Get vehicle count for each category
        const categoriesWithCounts = await Promise.all(
            categories.map(async (cat) => {
                const count = await getCategoryVehicleCount(cat.id);
                return { ...cat, vehicleCount: count };
            })
        );

        res.render('admin/categories/list', {
            title: 'Manage Categories',
            categories: categoriesWithCounts
        });
    } catch (error) {
        console.error('Error loading categories:', error);
        next(error);
    }
};

/**
 * Display form to create new category
 * GET /admin/categories/new
 */
const showNewCategoryForm = async (req, res, next) => {
    try {
        res.render('admin/categories/form', {
            title: 'Add New Category',
            category: null,
            isEdit: false
        });
    } catch (error) {
        console.error('Error loading category form:', error);
        next(error);
    }
};

/**
 * Display form to edit category
 * GET /admin/categories/:categoryId/edit
 */
const showEditCategoryForm = async (req, res, next) => {
    try {
        const { categoryId } = req.params;
        const category = await getCategoryById(categoryId);

        if (!category) {
            req.flash('error', 'Category not found.');
            return res.redirect('/admin/categories');
        }

        res.render('admin/categories/form', {
            title: `Edit Category: ${category.name}`,
            category: category,
            isEdit: true
        });
    } catch (error) {
        console.error('Error loading category edit form:', error);
        next(error);
    }
};

/**
 * Handle category creation
 * POST /admin/categories
 */
const handleCreateCategory = async (req, res, next) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        errors.array().forEach(error => {
            req.flash('error', error.msg);
        });
        return res.redirect('/admin/categories/new');
    }

    try {
        const { name, description, displayOrder } = req.body;

        await createCategory({
            name,
            description,
            displayOrder: parseInt(displayOrder) || 999
        });

        req.flash('success', `Category "${name}" created successfully.`);
        res.redirect('/admin/categories');
    } catch (error) {
        console.error('Error creating category:', error);
        req.flash('error', 'Unable to create category. Please try again.');
        res.redirect('/admin/categories/new');
    }
};

/**
 * Handle category update
 * POST /admin/categories/:categoryId
 */
const handleUpdateCategory = async (req, res, next) => {
    const errors = validationResult(req);
    const { categoryId } = req.params;

    if (!errors.isEmpty()) {
        errors.array().forEach(error => {
            req.flash('error', error.msg);
        });
        return res.redirect(`/admin/categories/${categoryId}/edit`);
    }

    try {
        const { name, description, displayOrder } = req.body;

        const category = await getCategoryById(categoryId);
        if (!category) {
            req.flash('error', 'Category not found.');
            return res.redirect('/admin/categories');
        }

        await updateCategory(categoryId, {
            name,
            description,
            displayOrder: parseInt(displayOrder) || 999
        });

        req.flash('success', `Category "${name}" updated successfully.`);
        res.redirect('/admin/categories');
    } catch (error) {
        console.error('Error updating category:', error);
        req.flash('error', 'Unable to update category. Please try again.');
        res.redirect(`/admin/categories/${categoryId}/edit`);
    }
};

/**
 * Handle category deletion
 * POST /admin/categories/:categoryId/delete
 */
const handleDeleteCategory = async (req, res, next) => {
    try {
        const { categoryId } = req.params;

        const category = await getCategoryById(categoryId);
        if (!category) {
            req.flash('error', 'Category not found.');
            return res.redirect('/admin/categories');
        }

        const vehicleCount = await getCategoryVehicleCount(categoryId);
        if (vehicleCount > 0) {
            req.flash('error', `Cannot delete category with ${vehicleCount} vehicles. Delete vehicles first.`);
            return res.redirect('/admin/categories');
        }

        await deleteCategory(categoryId);
        req.flash('success', `Category "${category.name}" deleted successfully.`);
        res.redirect('/admin/categories');
    } catch (error) {
        console.error('Error deleting category:', error);
        req.flash('error', 'Unable to delete category. Please try again.');
        res.redirect('/admin/categories');
    }
};

// ============================================================================
// VEHICLE MANAGEMENT - Employee+ (accessible by employees and admins)
// ============================================================================

/**
 * Display all vehicles for employee/admin editing
 * GET /admin/vehicles
 */
const showVehicles = async (req, res, next) => {
    try {
        // Show ALL vehicles (available and unavailable) for admin management
        const vehicles = await getAllVehicles({ availableOnly: false });
        const categories = await getAllCategories();

        res.render('admin/vehicles/list', {
            title: 'Manage Vehicles',
            vehicles: vehicles,
            categories: categories
        });
    } catch (error) {
        console.error('Error loading vehicles:', error);
        next(error);
    }
};

/**
 * Display form to add new vehicle
 * GET /admin/vehicles/new
 */
const showAddVehicleForm = async (req, res, next) => {
    try {
        const categories = await getAllCategories();

        res.render('admin/vehicles/add', {
            title: 'Add New Vehicle',
            categories: categories,
            isEdit: false
        });
    } catch (error) {
        console.error('Error loading vehicle add form:', error);
        next(error);
    }
};

/**
 * Handle new vehicle creation
 * POST /admin/vehicles
 */
const handleAddVehicle = async (req, res, next) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        errors.array().forEach(error => {
            req.flash('error', error.msg);
        });
        const categories = await getAllCategories();
        return res.render('admin/vehicles/add', {
            title: 'Add New Vehicle',
            categories: categories,
            isEdit: false,
            formData: req.body
        });
    }

    try {
        const { year, make, model, vin, color, mileage, transmission, fuelType, price, availability, categoryId, description } = req.body;

        // Check if VIN already exists
        const existingVehicle = await getVehicleByVin(vin);
        if (existingVehicle) {
            req.flash('error', `A vehicle with VIN "${vin}" already exists (${existingVehicle.year} ${existingVehicle.make} ${existingVehicle.model}).`);
            const categories = await getAllCategories();
            return res.render('admin/vehicles/add', {
                title: 'Add New Vehicle',
                categories: categories,
                isEdit: false,
                formData: req.body
            });
        }

        const vehicle = await createVehicle({
            year: parseInt(year),
            make,
            model,
            vin,
            color,
            mileage: parseInt(mileage),
            transmission: transmission || null,
            fuelType: fuelType || null,
            price: parseFloat(price),
            isAvailable: availability === 'true' || availability === true,
            categoryId: parseInt(categoryId),
            description: description || null,
            createdById: req.session.user.id
        });

        req.flash('success', `Vehicle "${vehicle.displayName}" added successfully.`);
        res.redirect('/admin/vehicles');
    } catch (error) {
        console.error('Error adding vehicle:', error);
        req.flash('error', 'Unable to add vehicle. Please try again.');
        res.redirect('/admin/vehicles/new');
    }
};

/**
 * Display form to edit vehicle
 * GET /admin/vehicles/:vehicleId/edit
 */
const showEditVehicleForm = async (req, res, next) => {
    try {
        const { vehicleId } = req.params;
        const vehicle = await getVehicleById(vehicleId);
        const categories = await getAllCategories();

        if (!vehicle) {
            req.flash('error', 'Vehicle not found.');
            return res.redirect('/admin/vehicles');
        }

        res.render('admin/vehicles/form', {
            title: `Edit Vehicle: ${vehicle.displayName}`,
            vehicle: vehicle,
            categories: categories,
            isEdit: true
        });
    } catch (error) {
        console.error('Error loading vehicle edit form:', error);
        next(error);
    }
};

/**
 * Handle vehicle update
 * POST /admin/vehicles/:vehicleId
 */
const handleUpdateVehicle = async (req, res, next) => {
    const errors = validationResult(req);
    const { vehicleId } = req.params;

    if (!errors.isEmpty()) {
        errors.array().forEach(error => {
            req.flash('error', error.msg);
        });
        return res.redirect(`/admin/vehicles/${vehicleId}/edit`);
    }

    try {
        const { price, description, availability } = req.body;

        const vehicle = await getVehicleById(vehicleId);
        if (!vehicle) {
            req.flash('error', 'Vehicle not found.');
            return res.redirect('/admin/vehicles');
        }

        // Update vehicle with the provided fields
        const updates = {
            price: parseFloat(price),
            description: description,
            isAvailable: availability === 'true' || availability === true
        };

        await updateVehicle(vehicleId, updates);
        req.flash('success', 'Vehicle updated successfully.');
        res.redirect('/admin/vehicles');
    } catch (error) {
        console.error('Error updating vehicle:', error);
        req.flash('error', 'Unable to update vehicle. Please try again.');
        res.redirect(`/admin/vehicles/${vehicleId}/edit`);
    }
};

/**
 * Toggle vehicle availability
 * POST /admin/vehicles/:vehicleId/toggle-availability
 */
const handleToggleAvailability = async (req, res, next) => {
    const { vehicleId } = req.params;

    try {
        const vehicle = await getVehicleById(vehicleId);
        if (!vehicle) {
            req.flash('error', 'Vehicle not found.');
            return res.redirect('/admin/vehicles');
        }

        // Toggle the availability status
        const updates = {
            isAvailable: !vehicle.isAvailable
        };

        await updateVehicle(vehicleId, updates);
        const status = !vehicle.isAvailable ? 'Available' : 'Unavailable';
        req.flash('success', `Vehicle marked as ${status}.`);
        res.redirect('/admin/vehicles');
    } catch (error) {
        console.error('Error toggling vehicle availability:', error);
        req.flash('error', 'Unable to update vehicle availability. Please try again.');
        res.redirect('/admin/vehicles');
    }
};

// ============================================================================
// USER MANAGEMENT - Admin only
// ============================================================================

/**
 * Display all users for role management
 * GET /admin/users
 */
const showUsers = async (req, res, next) => {
    try {
        const users = await getAllUsers();
        const roles = await getAllRoles();

        res.render('admin/users/list', {
            title: 'Manage Users',
            users: users,
            roles: roles
        });
    } catch (error) {
        console.error('Error loading users:', error);
        next(error);
    }
};

/**
 * Handle user role update
 * POST /admin/users/:userId/role
 */
const handleUpdateUserRole = async (req, res, next) => {
    try {
        const { userId } = req.params;
        const { roleId } = req.body;

        const user = await getUserById(userId);
        if (!user) {
            req.flash('error', 'User not found.');
            return res.redirect('/admin/users');
        }

        // Prevent users from changing their own role (safety measure)
        if (userId == req.session.user.id) {
            req.flash('error', 'You cannot change your own role.');
            return res.redirect('/admin/users');
        }

        await updateUserRole(userId, parseInt(roleId));
        req.flash('success', `User role updated successfully.`);
        res.redirect('/admin/users');
    } catch (error) {
        console.error('Error updating user role:', error);
        req.flash('error', 'Unable to update user role. Please try again.');
        res.redirect('/admin/users');
    }
};

// ============================================================================
// SYSTEM ACTIVITY - Admin only
// ============================================================================

/**
 * Display system activity and statistics
 * GET /admin/activity
 */
const showActivity = async (req, res, next) => {
    try {
        const users = await getAllUsers();
        const categories = await getAllCategories();
        const vehicles = await getAllVehicles();

        // Calculate statistics
        const stats = {
            totalUsers: users.length,
            employeeCount: users.filter(u => u.roleName === 'employee').length,
            totalVehicles: vehicles.length,
            totalCategories: categories.length,
            totalRequests: 0, // Would query from service_requests table
            totalReviews: 0   // Would query from reviews table
        };

        res.render('admin/activity', {
            title: 'System Activity',
            stats: stats
        });
    } catch (error) {
        console.error('Error loading activity page:', error);
        next(error);
    }
};

// ============================================================================
// ROUTES - Registration and middleware
// ============================================================================

// All admin routes require login
router.use(requireRole('employee'));

// VEHICLE ROUTES - Available to Employee+
router.get('/vehicles', showVehicles);
router.get('/vehicles/new', showAddVehicleForm);
router.post(
    '/vehicles',
    [
        body('year')
            .isInt({ min: 1900, max: 2099 }).withMessage('Year must be between 1900 and 2099'),
        body('make')
            .trim()
            .notEmpty().withMessage('Make is required')
            .isLength({ min: 1, max: 50 }).withMessage('Make must be 1-50 characters'),
        body('model')
            .trim()
            .notEmpty().withMessage('Model is required')
            .isLength({ min: 1, max: 50 }).withMessage('Model must be 1-50 characters'),
        body('vin')
            .trim()
            .notEmpty().withMessage('VIN is required')
            .isLength({ min: 17, max: 17 }).withMessage('VIN must be exactly 17 characters'),
        body('color')
            .trim()
            .notEmpty().withMessage('Color is required')
            .isLength({ min: 1, max: 50 }).withMessage('Color must be 1-50 characters'),
        body('mileage')
            .isInt({ min: 0 }).withMessage('Mileage must be a valid number'),
        body('transmission')
            .optional()
            .trim()
            .isLength({ max: 50 }).withMessage('Transmission must be 1-50 characters'),
        body('fuelType')
            .optional()
            .trim()
            .isLength({ max: 50 }).withMessage('Fuel type must be 1-50 characters'),
        body('price')
            .isFloat({ min: 0 }).withMessage('Price must be a valid number'),
        body('availability')
            .notEmpty().withMessage('Availability is required'),
        body('categoryId')
            .isInt({ min: 1 }).withMessage('Category is required'),
        body('description')
            .optional()
            .trim()
            .isLength({ max: 2000 }).withMessage('Description must be less than 2000 characters')
    ],
    handleAddVehicle
);
router.get('/vehicles/:vehicleId/edit', showEditVehicleForm);
router.post(
    '/vehicles/:vehicleId',
    [
        body('price')
            .optional()
            .isFloat({ min: 0 }).withMessage('Price must be a valid number'),
        body('description')
            .trim()
            .isLength({ max: 2000 }).withMessage('Description must be less than 2000 characters'),
        body('availability')
            .optional()
            .isIn(['true', 'false']).withMessage('Availability must be true or false')
    ],
    handleUpdateVehicle
);
router.post('/vehicles/:vehicleId/toggle-availability', handleToggleAvailability);

// CATEGORY ROUTES - Admin only
router.use(requireRole('admin'));

router.get('/categories', showCategories);
router.get('/categories/new', showNewCategoryForm);
router.post(
    '/categories',
    [
        body('name')
            .trim()
            .notEmpty().withMessage('Category name is required')
            .isLength({ min: 2, max: 100 }).withMessage('Category name must be between 2 and 100 characters'),
        body('description')
            .trim()
            .isLength({ max: 500 }).withMessage('Description must be less than 500 characters'),
        body('displayOrder')
            .optional()
            .isInt({ min: 1, max: 999 }).withMessage('Display order must be between 1 and 999')
    ],
    handleCreateCategory
);

router.get('/categories/:categoryId/edit', showEditCategoryForm);
router.post(
    '/categories/:categoryId',
    [
        body('name')
            .trim()
            .notEmpty().withMessage('Category name is required')
            .isLength({ min: 2, max: 100 }).withMessage('Category name must be between 2 and 100 characters'),
        body('description')
            .trim()
            .isLength({ max: 500 }).withMessage('Description must be less than 500 characters'),
        body('displayOrder')
            .optional()
            .isInt({ min: 1, max: 999 }).withMessage('Display order must be between 1 and 999')
    ],
    handleUpdateCategory
);

router.post('/categories/:categoryId/delete', handleDeleteCategory);

// USER MANAGEMENT ROUTES - Admin only
router.get('/users', showUsers);
router.post(
    '/users/:userId/role',
    [
        body('roleId')
            .isInt({ min: 1 }).withMessage('Invalid role selected')
    ],
    handleUpdateUserRole
);

// SYSTEM ACTIVITY ROUTES - Admin only
router.get('/activity', showActivity);

export default router;
