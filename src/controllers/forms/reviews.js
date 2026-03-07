import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { createReview, getTopReviewsForVehicle, getAllReviewsForVehicle, deleteReview } from '../../models/forms/reviews.js';

const router = Router();

/**
 * Display the review form page.
 */
const showReviewForm = (req, res) => {
    res.render('forms/reviews/form', {
        title: 'Review Vehicle'
    });
};

// Show top 3 reviews for a vehicle
export async function showVehicleReviews(req, res) {
    const { vehicleId } = req.params;
    const reviews = await getTopReviewsForVehicle(vehicleId, 3);
    res.render('reviews/list', { reviews, vehicleId });
}

// Show all reviews for a vehicle
export async function showAllVehicleReviews(req, res) {
    const { vehicleId } = req.params;
    const reviews = await getAllReviewsForVehicle(vehicleId);
    res.render('reviews/list', { reviews, vehicleId });
}

// Handle review submission
export async function submitReview(req, res) {
    const { vehicleId } = req.params;
    const { rating, comment } = req.body;
    const userId = req.session.userId;
    await createReview({ userId, vehicleId, rating, comment });
    res.redirect(`/vehicles/${vehicleId}`);
}

// Handle review deletion
export async function removeReview(req, res) {
    const { reviewId, vehicleId } = req.params;
    const userId = req.session.userId;
    await deleteReview(reviewId, userId);
    res.redirect(`/vehicles/${vehicleId}`);
}

router.get('/', showReviewForm);

export default router;