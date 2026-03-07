import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { createServiceRequest, getAllServiceRequests } from '../../models/forms/requests.js';

const router = Router();

/**
 * Display the request form page.
 */
const showRequestForm = (req, res) => {
    res.render('forms/requests/form', {
        title: 'Request Service'
    });
};

/**
 * Handle contact form submission with validation.
 * If validation passes, save to database and redirect.
 * If validation fails, log errors and redirect back to form.
 */
const handleServiceRequestSubmission = async (req, res) => {
    // Check for validation errors
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        errors.array().forEach(error => {
            req.flash('error', error.msg);
        });
        return res.redirect('/requests');
    }

    try {
        // Extract fields from form
        const {
            name,
            phone,
            vehicleMake,
            vehicleModel,
            subject,
            scheduledDate,
            scheduledTime,
            message
        } = req.body;

        // Prepare request object for future DB integration
        const serviceRequest = {
            name,
            phone,
            vehicleMake,
            vehicleModel,
            subject,
            message,
            status: 'Submitted',
            submittedAt: new Date(),
            scheduledFor: scheduledDate && scheduledTime ? new Date(`${scheduledDate}T${scheduledTime}`) : null
        };

        // TODO: Save to database in the future
        // await createServiceRequest(serviceRequest);

        req.flash('success', 'Thank you for submitting your service request! We will respond soon.');
        res.redirect('/requests');
    } catch (error) {
        console.error('Error saving service request:', error);
        req.flash('error', 'Unable to submit your request. Please try again later.');
        res.redirect('/requests');
    }
};

/**
 * Display all service request submissions.
 */
const showRequestList = async (req, res) => {
    let requests = [];

    try {
        requests = await getAllServiceRequests();
    } catch (error) {
        console.error('Error retrieving service requests:', error);
    }

    res.render('forms/requests/list', {
        title: 'Service Request Submissions',
        requests
    });
};

router.get('/', showRequestForm);

/**
 * POST /requests - Handle service request form submission with validation
 */
router.post(
    '/',
    [
        body('name')
            .trim()
            .notEmpty().withMessage('Name is required')
            .isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters'),
        body('phone')
            .trim()
            .notEmpty().withMessage('Phone number is required')
            .matches(/^[0-9\-\+\s\(\)]{7,15}$/).withMessage('Invalid phone number'),
        body('vehicleMake')
            .trim()
            .notEmpty().withMessage('Vehicle make is required'),
        body('vehicleModel')
            .trim()
            .notEmpty().withMessage('Vehicle model is required'),
        body('subject')
            .trim()
            .notEmpty().withMessage('Service type is required')
            .isLength({ min: 2, max: 255 }).withMessage('Service type must be between 2 and 255 characters'),
        body('scheduledDate')
            .notEmpty().withMessage('Preferred date is required')
            .isISO8601().withMessage('Preferred date must be a valid date'),
        body('scheduledTime')
            .notEmpty().withMessage('Preferred time is required')
            .matches(/^([01]?[0-9]|2[0-3]):[0-5][0-9]$/).withMessage('Preferred time must be a valid time'),
        body('message')
            .trim()
            .isLength({ max: 2000 }).withMessage('Message must be less than 2000 characters')
    ],
    handleServiceRequestSubmission
);

/**
 * GET /contact/responses - Display all contact form submissions
 */
router.get('/list', showRequestList);

export default router;