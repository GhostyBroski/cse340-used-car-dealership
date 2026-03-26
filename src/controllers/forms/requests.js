import { Router } from 'express';
import { body, validationResult } from 'express-validator';
import { 
    createServiceRequest, 
    getAllServiceRequests, 
    getServiceRequestById, 
    updateServiceRequestStatus,
    getServiceRequestsByVehicle,
    getServiceRequestsByEmployee
} from '../../models/forms/requests.js';
import { getVehicleById, getCategories } from '../../models/catalog/vehicles.js';
import { requireRole } from '../../middleware/auth.js';

const router = Router();

/**
 * Display the service request form page
 * GET /requests or GET /requests?vehicleId=:id
 */
const showRequestForm = async (req, res, next) => {
    try {
        const { vehicleId } = req.query;
        let vehicle = null;
        
        // If vehicleId provided, get vehicle details to pre-populate
        if (vehicleId) {
            vehicle = await getVehicleById(vehicleId);
        }
        
        res.render('forms/requests/form', {
            title: 'Request Service',
            vehicle: vehicle,
            vehicleId: vehicleId || null
        });
    } catch (error) {
        console.error('Error loading service request form:', error);
        next(error);
    }
};

/**
 * Handle service request submission with validation
 * POST /requests
 */
const handleServiceRequestSubmission = async (req, res, next) => {
    const errors = validationResult(req);
    const { vehicleId } = req.body;

    if (!errors.isEmpty()) {
        errors.array().forEach(error => {
            req.flash('error', error.msg);
        });
        // Redirect back to the form with vehicleId preserved if it exists
        const redirectUrl = vehicleId ? `/requests?vehicleId=${vehicleId}` : '/requests';
        return res.redirect(redirectUrl);
    }

    try {
        const {
            name,
            phone,
            email,
            subject,
            requestType,
            scheduledDate,
            scheduledHour,
            scheduledMinute,
            scheduledPeriod,
            message
        } = req.body;

        const userId = req.session?.user?.id || null;

        // Convert 12-hour time to 24-hour format
        let hour24 = parseInt(scheduledHour);
        if (scheduledPeriod === 'PM' && hour24 !== 12) {
            hour24 += 12;
        } else if (scheduledPeriod === 'AM' && hour24 === 12) {
            hour24 = 0;
        }

        // Construct the scheduled datetime
        const scheduledFor = new Date(`${scheduledDate}T${String(hour24).padStart(2, '0')}:${String(scheduledMinute).padStart(2, '0')}:00`);

        const serviceRequest = {
            name,
            phone: phone || null,
            email: email || null,
            vehicleId: vehicleId ? parseInt(vehicleId) : null,
            subject,
            message: message || null,
            requestType: requestType || 'General',
            status: 'Submitted',
            submittedAt: new Date(),
            scheduledFor: scheduledFor,
            userId: userId
        };

        await createServiceRequest(serviceRequest);
        req.flash('success', 'Thank you for submitting your service request! We will respond soon.');
        // Redirect back to the vehicle detail page if coming from one, otherwise to requests list
        if (vehicleId) {
            res.redirect(`/catalog/vehicles/${vehicleId}`);
        } else {
            res.redirect('/requests/my-requests');
        }
    } catch (error) {
        console.error('Error saving service request:', error);
        req.flash('error', 'Unable to submit your request. Please try again later.');
        // Redirect back to the form with vehicleId preserved if it exists
        const redirectUrl = vehicleId ? `/requests?vehicleId=${vehicleId}` : '/requests';
        res.redirect(redirectUrl);
    }
};

/**
 * Display all service requests (admin/employee dashboard)
 * GET /requests/list
 */
const showRequestList = async (req, res, next) => {
    try {
        const requests = await getAllServiceRequests();
        
        res.render('forms/requests/list', {
            title: 'Service Requests',
            requests: requests
        });
    } catch (error) {
        console.error('Error retrieving service requests:', error);
        next(error);
    }
};

/**
 * Display a single service request with details
 * GET /requests/:requestId
 */
const showRequestDetail = async (req, res, next) => {
    try {
        const { requestId } = req.params;

        const request = await getServiceRequestById(requestId);

        if (!request) {
            req.flash('error', 'Service request not found.');
            return res.redirect('/requests');
        }

        const userId = req.session?.user?.id;
        const userRole = req.session?.user?.roleName;
        
        // Check if user can view this request
        const canView = userId === request.userId || userRole === 'employee' || userRole === 'admin';
        if (!canView) {
            req.flash('error', 'You do not have permission to view this request.');
            return res.redirect('/requests');
        }

        res.render('forms/requests/detail', {
            title: `Service Request #${requestId}`,
            request: request,
            isOwner: userId === request.userId,
            canModify: userRole === 'employee' || userRole === 'admin'
        });
    } catch (error) {
        console.error('Error retrieving service request:', error);
        next(error);
    }
};

/**
 * Handle status update (employee/admin only)
 * POST /requests/:requestId/status
 */
const handleStatusUpdate = async (req, res, next) => {
    try {
        const { requestId } = req.params;
        const { status, adminNotes, assignedTo } = req.body;

        const request = await getServiceRequestById(requestId);
        if (!request) {
            req.flash('error', 'Service request not found.');
            return res.redirect('/requests');
        }

        await updateServiceRequestStatus(requestId, {
            status,
            adminNotes: adminNotes || null,
            assignedTo: assignedTo ? parseInt(assignedTo) : null,
            completedAt: status === 'Completed' ? new Date() : null
        });

        req.flash('success', 'Service request updated successfully.');
        res.redirect(`/requests/${requestId}`);
    } catch (error) {
        console.error('Error updating service request:', error);
        req.flash('error', 'Unable to update request. Please try again.');
        res.redirect(`/requests/${requestId}`);
    }
};

/**
 * Display user's own service requests
 * GET /requests/my-requests
 */
const showMyRequests = async (req, res, next) => {
    try {
        const userId = req.session?.user?.id;
        const allRequests = await getAllServiceRequests();
        
        // Filter to only show user's requests
        const userRequests = allRequests.filter(r => r.userId === userId);

        res.render('forms/requests/my-requests', {
            title: 'My Service Requests',
            requests: userRequests
        });
    } catch (error) {
        console.error('Error loading user requests:', error);
        next(error);
    }
};

/**
 * Display service requests for a specific vehicle
 * GET /requests/vehicle/:vehicleId
 */
const showVehicleRequests = async (req, res, next) => {
    try {
        const { vehicleId } = req.params;
        
        const vehicle = await getVehicleById(vehicleId);
        if (!vehicle) {
            req.flash('error', 'Vehicle not found.');
            return res.redirect('/catalog');
        }

        const requests = await getServiceRequestsByVehicle(vehicleId);

        res.render('forms/requests/vehicle-requests', {
            title: `Service Requests - ${vehicle.displayName}`,
            vehicle: vehicle,
            requests: requests
        });
    } catch (error) {
        console.error('Error loading vehicle requests:', error);
        next(error);
    }
};

// ============================================================================
// ROUTE HANDLERS
// ============================================================================

// GET /requests - Display service request form
router.get('/', showRequestForm);

// POST /requests - Submit new service request with validation
router.post(
    '/',
    [
        body('name')
            .trim()
            .notEmpty().withMessage('Name is required')
            .isLength({ min: 2, max: 100 }).withMessage('Name must be between 2 and 100 characters'),
        body('phone')
            .trim()
            .optional({ checkFalsy: true }),
        body('email')
            .trim()
            .optional({ checkFalsy: true })
            .isEmail().withMessage('Invalid email format'),
        // Custom validation: require either phone or email
        body().custom((value, { req }) => {
            const phone = (req.body.phone || '').trim();
            const email = (req.body.email || '').trim();
            
            if (!phone && !email) {
                throw new Error('Please provide either a phone number or email address');
            }
            return true;
        }),
        body('vehicleId')
            .optional()
            .isInt({ min: 1 }).withMessage('Invalid vehicle ID'),
        body('subject')
            .trim()
            .notEmpty().withMessage('Service type is required'),
        body('requestType')
            .optional()
            .isIn(['General', 'Maintenance', 'Inspection', 'Repair', 'Other']).withMessage('Invalid request type'),
        body('scheduledDate')
            .trim()
            .notEmpty().withMessage('Preferred date is required'),
        body('scheduledHour')
            .notEmpty().withMessage('Please select an hour')
            .isInt({ min: 1, max: 12 }).withMessage('Invalid hour'),
        body('scheduledMinute')
            .notEmpty().withMessage('Please select minutes')
            .isInt({ min: 0, max: 59 }).withMessage('Invalid minutes'),
        body('scheduledPeriod')
            .notEmpty().withMessage('Please select AM or PM')
            .isIn(['AM', 'PM']).withMessage('Invalid time period'),
        body('message')
            .trim()
            .isLength({ max: 2000 }).withMessage('Message must be less than 2000 characters')
    ],
    handleServiceRequestSubmission
);

// GET /requests/list - Display all service requests (admin/employee)
router.get('/list', requireRole('employee'), showRequestList);

// GET /requests/my-requests - Display user's own requests
router.get('/my-requests', showMyRequests);

// GET /requests/vehicle/:vehicleId - Display requests for a vehicle
router.get('/vehicle/:vehicleId', showVehicleRequests);

// GET /requests/:requestId - Display service request details
router.get('/:requestId', showRequestDetail);

// POST /requests/:requestId/status - Update service request status (employee/admin only)
router.post(
    '/:requestId/status',
    requireRole('employee'),
    [
        body('status')
            .isIn(['Submitted', 'In Progress', 'Scheduled', 'Completed', 'Cancelled'])
            .withMessage('Invalid status'),
        body('adminNotes')
            .trim()
            .isLength({ max: 2000 }).withMessage('Admin notes must be less than 2000 characters')
    ],
    handleStatusUpdate
);

export default router;