import { Router } from 'express';
import { body, validationResult } from 'express-validator';

const router = Router();

/**
 * Display the review form page.
 */
const showReviewForm = (req, res) => {
    res.render('forms/reviews/form', {
        title: 'Review Vehicle'
    });
};

router.get('/', showReviewForm);

export default router;