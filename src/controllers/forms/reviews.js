import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { createReview, getTopReviewsForVehicle, getAllReviewsForVehicle, getReviewById, updateReview, deleteReview } from '../../models/forms/reviews.js';

const router = Router();

/**
 * Display all reviews for a vehicle with form to add new review.
 */
const showReviewList = async (req, res) => {
    const { vehicleId } = req.params;
    let reviews = [];

    try {
        reviews = await getAllReviewsForVehicle(vehicleId);
    } catch (error) {
        console.error('Error retrieving reviews:', error);
    }

    res.render('forms/reviews/list', {
        title: 'Vehicle Reviews',
        reviews,
        vehicleId
    });
};

/**
 * Display the review form page (for new review).
 */
const showReviewForm = (req, res) => {
    const { vehicleId } = req.params;
    res.render('forms/reviews/form', {
        title: 'Leave a Review',
        vehicleId,
        review: null
    });
};

/**
 * Display the edit review form.
 */
const showEditReviewForm = async (req, res) => {
    const { vehicleId, reviewId } = req.params;
    const userId = req.session.userId;

    try {
        const review = await getReviewById(reviewId);

        if (!review || review.user_id !== userId) {
            req.flash('error', 'You can only edit your own reviews.');
            return res.redirect(`/vehicles/${vehicleId}/reviews`);
        }

        res.render('forms/reviews/form', {
            title: 'Edit Review',
            vehicleId,
            review
        });
    } catch (error) {
        console.error('Error retrieving review:', error);
        req.flash('error', 'Unable to load review. Please try again.');
        res.redirect(`/vehicles/${vehicleId}/reviews`);
    }
};

/**
 * Handle review submission with validation.
 */
const handleReviewSubmission = async (req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        errors.array().forEach(error => {
            req.flash('error', error.msg);
        });
        return res.redirect(`/vehicles/${req.params.vehicleId}/reviews`);
    }

    const { vehicleId } = req.params;
    const { rating, comment } = req.body;
    const userId = req.session.userId;

    try {
        await createReview(userId, vehicleId, rating, comment);
        req.flash('success', 'Your review has been posted successfully!');
        res.redirect(`/vehicles/${vehicleId}/reviews`);
    } catch (error) {
        console.error('Error saving review:', error);
        req.flash('error', 'Unable to submit your review. Please try again.');
        res.redirect(`/vehicles/${vehicleId}/reviews`);
    }
};

/**
 * Handle review update with validation.
 */
const handleReviewUpdate = async (req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        errors.array().forEach(error => {
            req.flash('error', error.msg);
        });
        return res.redirect(`/vehicles/${req.params.vehicleId}/reviews`);
    }

    const { vehicleId, reviewId } = req.params;
    const { rating, comment } = req.body;
    const userId = req.session.userId;

    try {
        await updateReview(reviewId, userId, rating, comment);
        req.flash('success', 'Your review has been updated successfully!');
        res.redirect(`/vehicles/${vehicleId}/reviews`);
    } catch (error) {
        console.error('Error updating review:', error);
        req.flash('error', 'Unable to update your review. Please try again.');
        res.redirect(`/vehicles/${vehicleId}/reviews`);
    }
};

/**
 * Handle review deletion.
 */
const handleReviewDeletion = async (req, res) => {
    const { vehicleId, reviewId } = req.params;
    const userId = req.session.userId;

    try {
        await deleteReview(reviewId, userId);
        req.flash('success', 'Your review has been deleted.');
    } catch (error) {
        console.error('Error deleting review:', error);
        req.flash('error', 'Unable to delete your review. Please try again.');
    }
    res.redirect(`/vehicles/${vehicleId}/reviews`);
};

/**
 * GET /vehicles/:vehicleId/reviews - Display all reviews for a vehicle
 */
router.get('/:vehicleId/reviews', showReviewList);

/**
 * GET /vehicles/:vehicleId/reviews/new - Display form to add new review
 */
router.get('/:vehicleId/reviews/new', showReviewForm);

/**
 * POST /vehicles/:vehicleId/reviews - Handle new review submission with validation
 */
router.post(
    '/:vehicleId/reviews',
    [
        body('rating')
            .isInt({ min: 1, max: 5 })
            .withMessage('Rating must be between 1 and 5'),
        body('comment')
            .trim()
            .notEmpty().withMessage('Comment is required')
            .isLength({ min: 5, max: 1000 })
            .withMessage('Comment must be between 5 and 1000 characters')
    ],
    handleReviewSubmission
);

/**
 * GET /vehicles/:vehicleId/reviews/:reviewId/edit - Display form to edit review
 */
router.get('/:vehicleId/reviews/:reviewId/edit', showEditReviewForm);

/**
 * POST /vehicles/:vehicleId/reviews/:reviewId - Handle review update with validation
 */
router.post(
    '/:vehicleId/reviews/:reviewId',
    [
        body('rating')
            .isInt({ min: 1, max: 5 })
            .withMessage('Rating must be between 1 and 5'),
        body('comment')
            .trim()
            .notEmpty().withMessage('Comment is required')
            .isLength({ min: 5, max: 1000 })
            .withMessage('Comment must be between 5 and 1000 characters')
    ],
    handleReviewUpdate
);

/**
 * POST /vehicles/:vehicleId/reviews/:reviewId/delete - Handle review deletion
 */
router.post('/:vehicleId/reviews/:reviewId/delete', handleReviewDeletion);

export default router;