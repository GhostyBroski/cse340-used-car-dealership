import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { createServiceRequest, getAllServiceRequests, getServiceRequestById, updateServiceRequestStatus } from '../../models/forms/requests.js';

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
 * Handle service request submission with validation.
 */
const handleServiceRequestSubmission = async (req, res) => {
    const errors = validationResult(req);

    if (!errors.isEmpty()) {
        errors.array().forEach(error => {
            req.flash('error', error.msg);
        });
        return res.redirect('/requests');
    }

    try {
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

        const serviceRequest = {
            name,
            phone,
            vehicleMake,
            vehicleModel,
            subject,
            message,
            status: 'Submitted',
            submittedAt: new Date(),
            scheduledFor: scheduledDate && scheduledTime ? new Date(`${scheduledDate}T${scheduledTime}`) : null,
            userId: req.session?.userId || null
        };

        await createServiceRequest(serviceRequest);
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

/**
 * Display a single service request with details.
 */
const showRequestDetail = async (req, res) => {
    const { requestId } = req.params;

    try {
        const request = await getServiceRequestById(requestId);

        if (!request) {
            req.flash('error', 'Service request not found.');
            return res.redirect('/requests');
        }

        res.render('forms/requests/detail', {
            title: `Service Request #${requestId}`,
            request
        });
    } catch (error) {
        console.error('Error retrieving service request:', error);
        req.flash('error', 'Unable to load request details.');
        res.redirect('/requests');
    }
};

/**
 * Handle status update (employee/admin only).
 */
const handleStatusUpdate = async (req, res) => {
    const { requestId } = req.params;
    const { status, notes } = req.body;

    // Check for proper role (employee or admin)
    // TODO: Implement role checking middleware
    const userRole = req.session?.userRole;
    if (!['employee', 'admin'].includes(userRole)) {
        req.flash('error', 'You do not have permission to update request status.');
        return res.redirect(`/requests/${requestId}`);
    }

    try {
        await updateServiceRequestStatus(requestId, status, notes);
        req.flash('success', 'Service request status updated successfully.');
        res.redirect(`/requests/${requestId}`);
    } catch (error) {
        console.error('Error updating service request:', error);
        req.flash('error', 'Unable to update request status. Please try again.');
        res.redirect(`/requests/${requestId}`);
    }
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
            .isLength({ min: 2, max: 255 }).withMessage('Service type must be between 2 and 255 characters')
            .matches(/^[a-zA-Z0-9\s\-.,!?]+$/).withMessage('Service type contains invalid characters'),
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
 * GET /requests/list - Display all service request submissions
 */
router.get('/list', showRequestList);

/**
 * GET /requests/:requestId - Display service request details
 */
router.get('/:requestId', showRequestDetail);

/**
 * POST /requests/:requestId/status - Update service request status
 */
router.post(
    '/:requestId/status',
    [
        body('status')
            .isIn(['Submitted', 'In Progress', 'Completed'])
            .withMessage('Invalid status'),
        body('notes')
            .trim()
            .isLength({ max: 1000 }).withMessage('Notes must be less than 1000 characters')
    ],
    handleStatusUpdate
);

export default router;