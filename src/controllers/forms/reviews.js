import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { 
    createReview, 
    getAllReviewsForVehicle, 
    getReviewById, 
    updateReview, 
    deleteReview,
    deleteReviewAsAdmin,
    getReviewsByUser
} from '../../models/forms/reviews.js';
import { getVehicleById } from '../../models/catalog/vehicles.js';
import { requireRole } from '../../middleware/auth.js';

const router = Router({ mergeParams: true });

/**
 * Display the form to create a new review for a vehicle
 * GET /reviews/:vehicleId/new
 */
const showNewReviewForm = async (req, res, next) => {
    try {
        const { vehicleId } = req.params;
        const vehicle = await getVehicleById(vehicleId);
        
        if (!vehicle) {
            req.flash('error', 'Vehicle not found.');
            return res.redirect('/catalog');
        }
        
        res.render('forms/reviews/form', {
            title: `Leave a Review - ${vehicle.displayName}`,
            vehicleId,
            vehicle,
            review: null,
            isEdit: false
        });
    } catch (error) {
        console.error('Error loading review form:', error);
        next(error);
    }
};

/**
 * Handle new review submission with validation
 * POST /reviews/:vehicleId
 */
const handleNewReviewSubmission = async (req, res, next) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        errors.array().forEach(error => {
            req.flash('error', error.msg);
        });
        return res.redirect(`/reviews/${req.params.vehicleId}/new`);
    }

    try {
        const { vehicleId } = req.params;
        const { rating, title, comment } = req.body;
        const userId = req.session.user.id;

        // Verify vehicle exists
        const vehicle = await getVehicleById(vehicleId);
        if (!vehicle) {
            req.flash('error', 'Vehicle not found.');
            return res.redirect('/catalog');
        }

        await createReview(userId, vehicleId, rating, title, comment);
        req.flash('success', 'Your review has been posted successfully!');
        res.redirect(`/catalog/vehicles/${vehicleId}`);
    } catch (error) {
        console.error('Error saving review:', error);
        req.flash('error', 'Unable to submit your review. Please try again.');
        res.redirect(`/reviews/${req.params.vehicleId}/new`);
    }
};

/**
 * Display the form to edit an existing review
 * GET /reviews/:vehicleId/:reviewId/edit
 */
const showEditReviewForm = async (req, res, next) => {
    try {
        const { vehicleId, reviewId } = req.params;
        const userId = req.session.user.id;

        const review = await getReviewById(reviewId);
        if (!review) {
            req.flash('error', 'Review not found.');
            return res.redirect('/catalog');
        }

        // Verify user owns this review
        if (review.user_id !== userId) {
            req.flash('error', 'You can only edit your own reviews.');
            return res.redirect(`/catalog/vehicles/${vehicleId}`);
        }

        const vehicle = await getVehicleById(vehicleId);

        res.render('forms/reviews/form', {
            title: `Edit Review - ${vehicle.displayName}`,
            vehicleId,
            vehicle,
            review,
            isEdit: true
        });
    } catch (error) {
        console.error('Error loading review edit form:', error);
        next(error);
    }
};

/**
 * Handle review update with validation
 * POST /reviews/:vehicleId/:reviewId/edit
 */
const handleReviewUpdate = async (req, res, next) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        errors.array().forEach(error => {
            req.flash('error', error.msg);
        });
        return res.redirect(`/reviews/${req.params.vehicleId}/${req.params.reviewId}/edit`);
    }

    try {
        const { vehicleId, reviewId } = req.params;
        const { rating, title, comment } = req.body;
        const userId = req.session.user.id;

        const review = await getReviewById(reviewId);
        if (!review || review.user_id !== userId) {
            req.flash('error', 'You can only edit your own reviews.');
            return res.redirect(`/catalog/vehicles/${vehicleId}`);
        }

        await updateReview(reviewId, userId, rating, title, comment);
        req.flash('success', 'Your review has been updated successfully!');
        res.redirect(`/catalog/vehicles/${vehicleId}`);
    } catch (error) {
        console.error('Error updating review:', error);
        req.flash('error', 'Unable to update your review. Please try again.');
        res.redirect(`/reviews/${req.params.vehicleId}/${req.params.reviewId}/edit`);
    }
};

/**
 * Handle review deletion (user can delete own, admin can delete any)
 * POST /reviews/:reviewId/delete
 */
const handleReviewDeletion = async (req, res, next) => {
    try {
        const { reviewId } = req.params;
        const userId = req.session.user.id;
        const userRole = req.session.user.roleName;

        const review = await getReviewById(reviewId);
        if (!review) {
            req.flash('error', 'Review not found.');
            return res.redirect('/catalog');
        }

        // Check permissions: user owns review OR user is admin/employee
        if (review.user_id !== userId && userRole !== 'admin' && userRole !== 'employee') {
            req.flash('error', 'You do not have permission to delete this review.');
            return res.redirect(`/catalog/vehicles/${review.vehicle_id}`);
        }

        // Only delete as admin if not the owner
        if (review.user_id !== userId && (userRole === 'admin' || userRole === 'employee')) {
            await deleteReviewAsAdmin(reviewId);
            req.flash('success', 'Review has been deleted.');
        } else {
            await deleteReview(reviewId, userId);
            req.flash('success', 'Your review has been deleted.');
        }

        res.redirect(`/catalog/vehicles/${review.vehicle_id}`);
    } catch (error) {
        console.error('Error deleting review:', error);
        req.flash('error', 'Unable to delete review. Please try again.');
        res.redirect('/catalog');
    }
};

/**
 * Display user's own reviews
 * GET /reviews/my-reviews
 */
const showMyReviews = async (req, res, next) => {
    try {
        const userId = req.session.user.id;
        const reviews = await getReviewsByUser(userId);

        res.render('forms/reviews/my-reviews', {
            title: 'My Reviews',
            reviews
        });
    } catch (error) {
        console.error('Error loading user reviews:', error);
        next(error);
    }
};

// ============================================================================
// ROUTE HANDLERS
// ============================================================================

// Display new review form
router.get('/:vehicleId/new', showNewReviewForm);

// Submit new review
router.post(
    '/:vehicleId',
    [
        body('rating')
            .isInt({ min: 1, max: 5 })
            .withMessage('Rating must be between 1 and 5'),
        body('title')
            .trim()
            .notEmpty().withMessage('Title is required')
            .isLength({ max: 255 })
            .withMessage('Title must be 255 characters or less'),
        body('comment')
            .trim()
            .notEmpty().withMessage('Comment is required')
            .isLength({ min: 10, max: 2000 })
            .withMessage('Comment must be between 10 and 2000 characters')
    ],
    handleNewReviewSubmission
);

// Display edit review form
router.get('/:vehicleId/:reviewId/edit', showEditReviewForm);

// Submit review update
router.post(
    '/:vehicleId/:reviewId/edit',
    [
        body('rating')
            .isInt({ min: 1, max: 5 })
            .withMessage('Rating must be between 1 and 5'),
        body('title')
            .trim()
            .notEmpty().withMessage('Title is required')
            .isLength({ max: 255 })
            .withMessage('Title must be 255 characters or less'),
        body('comment')
            .trim()
            .notEmpty().withMessage('Comment is required')
            .isLength({ min: 10, max: 2000 })
            .withMessage('Comment must be between 10 and 2000 characters')
    ],
    handleReviewUpdate
);

// Delete review (POST for security - prevents accidental deletion via GET)
router.post('/:reviewId/delete', handleReviewDeletion);

// View user's reviews
router.get('/my-reviews', showMyReviews);

export default router;