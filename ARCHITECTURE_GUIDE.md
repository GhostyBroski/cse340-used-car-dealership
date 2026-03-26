# Full Stack Integration Guide - Vehicle Catalog System
## Controllers, Routes, Views, and Models Coordination

---

## Architecture Overview

The application now implements a proper MVC (Model-View-Controller) architecture with role-based access control:

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT (Browser)                        │
└────────────────────────────┬────────────────────────────────────┘
                             │
                    REQUESTS / RESPONSES
                             │
┌────────────────────────────▼────────────────────────────────────┐
│              ROUTES (src/controllers/routes.js)                  │
│   - Maps URLs to controller handlers                             │
│   - Applies authentication middleware                            │
│   - Adds route-specific stylesheets                              │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│            CONTROLLERS (src/controllers/*)                       │
│   - Handles HTTP requests                                        │
│   - Validates input                                              │
│   - Calls model functions                                        │
│   - Renders views                                                │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│             MODELS (src/models/*)                                │
│   - Business logic / data operations                             │
│   - Database queries with prepared statements                    │
│   - Data transformation (snake_case → camelCase)                 │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│             DATABASE (PostgreSQL via pg pool)                    │
│   - Persistent data storage                                      │
│   - Tables: users, vehicles, categories, reviews, etc.           │
└─────────────────────────────────────────────────────────────────┘
```

---

## Page-by-Page Flow

### 1. HOME PAGE - Featured Vehicles
**URL:** `/`

**Controller:** `src/controllers/index.js` - `homePage()`
```javascript
// Fetches featured vehicles for homepage
const featuredVehicles = await getFeaturedVehicles(6);
res.render('home', { featuredVehicles });
```

**Model:** `src/models/catalog/vehicles.js` - `getFeaturedVehicles(limit=5)`
```javascript
// Returns vehicles where is_featured = TRUE, sorted by year DESC
```

**View:** `src/views/home.ejs`
- Shows hero section
- Displays featured vehicles in grid
- Links to /catalog and individual vehicle detail pages

---

### 2. VEHICLE CATALOG - Browse & Filter
**URL:** `/catalog` or `/catalog?category=2&sort=price_asc`

**Controller:** `src/controllers/catalog/catalog.js` - `vehicleCatalogPage()`
```javascript
const categories = await getCategories();
const vehicles = categoryId ? 
    await getVehiclesByCategory(categoryId, sortBy) :
    await getAllVehicles({ availableOnly: true, sortBy });
res.render('catalog/list', { vehicles, categories, selectedCategory, currentSort });
```

**Query Parameters:**
- `category=1` - Filter by category ID
- `sort=year_desc|year_asc|price_asc|price_desc|mileage_asc` - Sort option

**Model:** `src/models/catalog/vehicles.js`
- `getAllVehicles(options)` - Returns all available vehicles
- `getVehiclesByCategory(categoryId, sortBy)` - Category-specific vehicles  
- `getCategories()` - All categories for sidebar

**View:** `src/views/catalog/list.ejs`
- Sidebar with category filter and sort options
- Vehicle cards in responsive grid
- Each card shows: image, price, specs, rating, reviews count
- Links to individual vehicle detail pages

---

### 3. VEHICLE DETAIL - Full Information & Reviews
**URL:** `/catalog/vehicles/:vehicleId`

**Controller:** `src/controllers/catalog/catalog.js` - `vehicleDetailPage(vehicleId)`
```javascript
const vehicle = await getVehicleById(vehicleId);  // Includes images, features
const reviews = await getAllReviewsForVehicle(vehicleId);
const userReview = reviews.find(r => r.user_id === userId);
res.render('catalog/detail', { vehicle, reviews, userReview, canEdit, canDelete });
```

**Model:** `src/models/catalog/vehicles.js`
- `getVehicleById(vehicleId)` - Complete vehicle with images, features, specs

**Model:** `src/models/forms/reviews.js`
- `getAllReviewsForVehicle(vehicleId)` - All reviews for vehicle

**View:** `src/views/catalog/detail.ejs`
- Image gallery with thumbnails
- Complete vehicle specifications (engine, transmission, drivetrain, MPG, etc.)
- Features/amenities list
- Customer reviews section
- Action buttons: "Request Service", "Back to Catalog"
- If logged in: "Leave a Review" button (or "Edit Review" if already reviewed)

---

### 4. LEAVE/EDIT REVIEW - User Reviews
**URLs:**
- Create: `/reviews/:vehicleId/new`
- Edit: `/reviews/:vehicleId/:reviewId/edit`
- Delete: `POST /reviews/:reviewId/delete`

**Controller:** `src/controllers/forms/reviews.js`

**New Review Flow:**
```javascript
// GET /reviews/:vehicleId/new
const showNewReviewForm = async (vehicleId) => {
    const vehicle = await getVehicleById(vehicleId);
    res.render('forms/reviews/form', { vehicleId, vehicle, isEdit: false });
};

// POST /reviews/:vehicleId (with validation)
const handleNewReviewSubmission = async (req, res) => {
    const { rating, title, comment } = req.body;
    await createReview(userId, vehicleId, rating, title, comment);
    res.redirect(`/catalog/vehicles/${vehicleId}`);
};
```

**Edit Review Flow:**
```javascript
// GET /reviews/:vehicleId/:reviewId/edit
// Verify user owns review before showing form
const review = await getReviewById(reviewId);
if (review.user_id !== userId) {
    req.flash('error', 'You can only edit your own reviews');
    return res.redirect(...);
}

// POST /reviews/:vehicleId/:reviewId/edit
await updateReview(reviewId, userId, rating, title, comment);
```

**Delete Review Flow:**
```javascript
// POST /reviews/:reviewId/delete
// User can delete own, employee/admin can delete any
if (review.user_id === userId || isAdmin || isEmployee) {
    await deleteReview(reviewId, userId);
}
```

**Validation:**
- Rating: 1-5 (required)
- Title: 1-255 characters (required)
- Comment: 10-2000 characters (required)

**Models:** `src/models/forms/reviews.js`
- `createReview(userId, vehicleId, rating, title, comment)`
- `updateReview(reviewId, userId, rating, title, comment)`
- `deleteReview(reviewId, userId)` - User delete only
- `deleteReviewAsAdmin(reviewId)` - Admin delete without user check
- `getReviewById(reviewId)`

---

### 5. SERVICE REQUESTS - Request Service
**URLs:**
- Form: `/requests` or `/requests?vehicleId=1`
- List (admin): `/requests/list`
- Detail: `/requests/:requestId`
- My Requests: `/requests/my-requests`

**Service Request Form:**
```javascript
// GET /requests (shows form)
// If vehicleId query param provided, pre-fills vehicle info
const showRequestForm = async (req, res) => {
    const { vehicleId } = req.query;
    const vehicle = vehicleId ? await getVehicleById(vehicleId) : null;
    res.render('forms/requests/form', { vehicle, vehicleId });
};

// POST /requests (submit form)
// Creates service request linked to specific vehicle
const handleServiceRequestSubmission = async (req, res) => {
    const { name, phone, email, vehicleId, subject, requestType, message, scheduledDate, scheduledTime } = req.body;
    
    const serviceRequest = {
        name, phone, email, vehicleId,  // ✅ vehicleId, not make/model
        subject, message, requestType,
        status: 'Submitted',
        submittedAt: new Date(),
        scheduledFor: combineDateAndTime(scheduledDate, scheduledTime),
        userId: req.session.user.id
    };
    
    await createServiceRequest(serviceRequest);
};
```

**Service Request List (Admin/Employee):**
```javascript
// GET /requests/list (requires employee or admin role)
const requests = await getAllServiceRequests();
// Shows: customer, vehicle, status, submitted date, etc.
```

**Service Request Detail:**
```javascript
// GET /requests/:requestId
const request = await getServiceRequestById(requestId);
// Shows all details including vehicle info, customer, status, notes
```

**Status Update (Employee/Admin Only):**
```javascript
// POST /requests/:requestId/status
await updateServiceRequestStatus(requestId, {
    status: 'In Progress',  // Can be: Submitted, In Progress, Scheduled, Completed, Cancelled
    adminNotes: 'Employee note here',
    assignedTo: employeeId
});
```

**Models:** `src/models/forms/requests.js`
- `createServiceRequest(data)` - Create new request
- `getAllServiceRequests()` - All requests (admin view)
- `getServiceRequestById(id)` - Single request detail
- `updateServiceRequestStatus(id, updates)` - Update status/notes/assignment
- `getServiceRequestsByVehicle(vehicleId)` - All requests for specific vehicle
- `getServiceRequestsByEmployee(employeeId)` - Requests assigned to employee

---

## Authentication & Authorization

### Session Storage
Login information stored in `req.session.user`:
```javascript
{
    id: 1,
    name: 'John Customer',
    email: 'john@example.com',
    roleName: 'user'  // 'user', 'employee', or 'admin'
}
```

### Middleware
All defined in `src/middleware/auth.js`:

**requireLogin** - Redirect to /login if not authenticated
```javascript
router.get('/dashboard', requireLogin, showDashboard);
```

**requireRole** - Check specific role requirement
```javascript
router.post('/:requestId/status', requireRole('employee'), handleStatusUpdate);
```

---

## Role Permissions

### USER (Customer)
- ✅ View homepage with featured vehicles
- ✅ Browse catalog (all vehicles or by category)
- ✅ View vehicle details, images, specs
- ✅ Leave reviews on vehicles (one per vehicle)
- ✅ Edit own reviews
- ✅ Delete own reviews
- ✅ Submit service requests for vehicles
- ✅ View own service requests and status
- ❌ Cannot moderate reviews
- ❌ Cannot edit vehicles
- ❌ Cannot change service request status

### EMPLOYEE
- ✅ All USER permissions
- ✅ View all service requests dashboard
- ✅ Update service request status
- ✅ Assign requests to themselves or other employees
- ✅ Add admin notes to requests
- ✅ Delete inappropriate reviews
- ✅ View contact form submissions
- ❌ Cannot add/edit/delete vehicles
- ❌ Cannot manage vehicle categories

### ADMIN
- ✅ All EMPLOYEE permissions
- ✅ Add new vehicles to inventory
- ✅ Edit vehicle details (price, specs, availability)
- ✅ Delete vehicles
- ✅ Create/edit/delete vehicle categories
- ✅ Manage employee accounts (if implemented)
- ✅ View all system activity and data

---

## Route Structure

```
Public Routes (No Authentication Required)
├── GET  /                    → homePage (featured vehicles)
├── GET  /about               → aboutPage
├── GET  /catalog             → vehicleCatalogPage (browse with filters)
├── GET  /catalog/vehicles/:id → vehicleDetailPage (full details + reviews)
├── GET  /contact             → showContactForm
├── POST /contact             → handleContactSubmission
├── GET  /register            → showRegistrationForm
├── POST /register            → handleRegistration
├── GET  /login               → showLoginForm
├── POST /login               → handleLogin
└── GET  /logout              → processLogout

Protected Routes (Requires Login)
├── GET  /dashboard           → showDashboard (user dashboard)
├── GET  /requests            → showRequestForm (service request form)
├── POST /requests            → handleServiceRequestSubmission (create request)
├── GET  /requests/my-requests → showMyRequests (user's service requests)
├── GET  /requests/:id        → showRequestDetail
├── GET  /reviews/:vid/new    → showNewReviewForm
├── POST /reviews/:vid        → handleNewReviewSubmission (create review)
├── GET  /reviews/:vid/:rid/edit → showEditReviewForm
├── POST /reviews/:vid/:rid/edit → handleReviewUpdate
└── POST /reviews/:rid/delete → handleReviewDeletion

Protected Routes (Requires Employee or Admin Role)
├── GET  /requests/list       → showRequestList (all requests)
└── POST /requests/:id/status → handleStatusUpdate (update request)

Protected Routes (Requires Admin Role)
├── POST /vehicles            → createVehicle
├── PUT  /vehicles/:id        → updateVehicle
├── DELETE /vehicles/:id      → deleteVehicle
└── ... (vehicle management endpoints - can implement as needed)
```

---

## Data Flow Examples

### Example 1: User Leaves a Review
```
1. User logs in → req.session.user set
2. User views vehicle → GET /catalog/vehicles/1
   - Controller: vehicleDetailPage(1)
   - Gets vehicle details, images, features, reviews
   - Checks if user already has a review
   - Sets canEditReview, canDeleteReview flags
3. User clicks "Leave a Review" → GET /reviews/1/new
   - Controller: showNewReviewForm(vehicleId=1)
   - Renders review form with vehicle pre-filled
4. User submits form → POST /reviews/1
   - Validation: rating 1-5, title, comment 10-2000 chars
   - Controller calls: createReview(userId, vehicleId, rating, title, comment)
   - Model: INSERT INTO reviews (user_id, vehicle_id, rating, title, comment) VALUES (...)
   - Redirect: /catalog/vehicles/1 with success message
5. User sees their review on the detail page
6. If user edits → GET /reviews/1/5/edit (vehicleId=1, reviewId=5)
   - Verify user owns review before showing form
   - POST to /reviews/1/5/edit updates it
```

### Example 2: User Requests Service
```
1. User views vehicle detail → /catalog/vehicles/3 (2020 Honda CR-V)
2. User clicks "Request Service" → /requests?vehicleId=3
   - Controller: showRequestForm(vehicleId=3)
   - Vehicle info pre-filled in form
3. User fills form: name, phone, email, issue description, preferred date/time
4. User submits → POST /requests
   - Validation runs
   - Controller calls: createServiceRequest({ vehicleId: 3, ... })
   - Model: INSERT INTO service_requests (vehicle_id, name, phone, email, ...) VALUES (...)
   - Service request created with status='Submitted'
5. Employee views dashboard → /requests/list
   - Controller: showRequestList()
   - Gets all requests with vehicle details
6. Employee clicks request → /requests/42
   - Shows full details including vehicle info
7. Employee updates status → POST /requests/42/status
   - Body: { status: 'In Progress', adminNotes: 'Will call customer', assignedTo: 3 }
   - Updates request with new status and notes
8. User views their request → /requests/my-requests
   - Sees status has changed to 'In Progress'
```

---

## Database Relationships at a Glance

```sql
users (id, email, role_id) ──────┐
          │                      ├─→ reviews (user_id, vehicle_id, rating, title, comment)
          ├─→ service_requests (user_id, vehicle_id, status)
          ├─→ contact_form (name, email)
          └─→ created_by vehicle (user_id in vehicles table)

categories (id, name) ──→ vehicles (category_id) ──┐
                                    │               ├─→ vehicle_images (url, display_order, alt_text)
                                    ├─→ reviews (vehicle_id)
                                    ├─→ service_requests (vehicle_id)
                                    └─→ vehicle_features (feature_name, feature_value)
```

---

## API Responses (What Data Gets Passed to Views)

### Catalog List (`catalog/list.ejs`)
```javascript
{
    title: 'Vehicle Catalog',
    vehicles: [
        {
            id: 1,
            displayName: '2020 Honda CR-V',
            year: 2020,
            price: 26800,
            mileage: 35000,
            color: 'Crystal Black',
            transmission: 'Automatic CVT',
            drivetrain: 'AWD',
            isFeatured: true,
            condition: 'Like New',
            categoryName: 'SUV',
            avgRating: '4.5',
            reviewCount: 3,
            mainImage: '/images/vehicles/crv-1.jpg',
            description: 'Reliable Honda CR-V...'
        },
        // ... more vehicles
    ],
    categories: [ { id: 1, name: 'Sedan' }, { id: 2, name: 'SUV' }, ... ],
    selectedCategory: 2,
    currentSort: 'price_asc'
}
```

### Vehicle Detail (`catalog/detail.ejs`)
```javascript
{
    title: '2020 Honda CR-V',
    vehicle: {
        id: 1,
        displayName: '2020 Honda CR-V',
        year: 2020,
        vin: '2HRCF8H5XLH00001',
        price: 26800,
        mileage: 35000,
        condition: 'Like New',
        color: 'Crystal Black',
        colorCode: 'CB1',
        engineType: '1.5L Turbocharged 4-Cylinder',
        transmission: 'Automatic CVT',
        drivetrain: 'AWD',
        horsepower: 190,
        fuelType: 'Gasoline',
        mpgHighway: 30.0,
        mpgCity: 26.0,
        seats: 5,
        interiorColor: 'Black',
        interiorMaterial: 'Heated Leather',
        isFeatured: true,
        isAvailable: true,
        description: 'Reliable Honda CR-V AWD with heated leather seats...',
        categoryId: 2,
        categoryName: 'SUV',
        reviewCount: 3,
        avgRating: '4.5',
        images: [
            { id: 1, image_url: '/images/vehicles/crv-1.jpg', alt_text: 'Honda CR-V front exterior', display_order: 0 },
            { id: 2, image_url: '/images/vehicles/crv-2.jpg', alt_text: 'Honda CR-V interior', display_order: 1 }
        ],
        features: [
            { id: 1, feature_name: 'All-Wheel Drive', feature_value: 'Yes' },
            { id: 2, feature_name: 'Heated Seats', feature_value: 'Yes' }
        ]
    },
    reviews: [
        {
            id: 1,
            user_id: 1,
            user_name: 'Sarah Buyer',
            rating: 5,
            title: 'Perfect family vehicle',
            comment: 'The CR-V is spacious, comfortable...',
            created_at: '2025-01-15T10:30:00.000Z'
        },
        // ... more reviews
    ],
    isLoggedIn: true,
    userReview: { ... },  // User's review if they have one
    canEditReview: true,
    canDeleteReview: true
}
```

---

## File Organization Summary

```
src/
├── controllers/
│   ├── index.js                 ← homePage (featured vehicles)
│   ├── catalog/
│   │   └── catalog.js          ← vehicleCatalogPage, vehicleDetailPage
│   ├── forms/
│   │   ├── reviews.js          ← review CRUD operations
│   │   ├── requests.js         ← service request CRUD operations
│   │   ├── contact.js
│   │   ├── login.js
│   │   └── registration.js
│   └── routes.js               ← Maps ALL routes to controllers
│
├── models/
│   ├── catalog/
│   │   ├── vehicles.js         ← Vehicle queries (getAllVehicles, getFeaturedVehicles, etc.)
│   │   └── courses.js          ← (old, can remove)
│   └── forms/
│       ├── reviews.js          ← Review queries (createReview, updateReview, deleteReview)
│       ├── requests.js         ← Service request queries (createRequest, updateStatus, etc.)
│       └── contact.js
│
├── views/
│   ├── home.ejs               ← Featured vehicles showcase
│   ├── catalog/
│   │   ├── list.ejs          ← Browse all vehicles with filters
│   │   └── detail.ejs        ← Individual vehicle + reviews
│   ├── forms/
│   │   ├── reviews/
│   │   │   ├── form.ejs      ← Review form (create/edit)
│   │   │   └── my-reviews.ejs ← User's reviews
│   │   ├── requests/
│   │   │   ├── form.ejs      ← Service request form
│   │   │   ├── list.ejs      ← All requests (admin)
│   │   │   ├── detail.ejs    ← Request detail + status update
│   │   │   ├── my-requests.ejs ← User's requests
│   │   │   └── vehicle-requests.ejs ← Requests for specific vehicle
│   │   └── contact/
│   │       └── form.ejs
│   └── partials/
│       ├── header.ejs
│       ├── footer.ejs
│       ├── nav.ejs
│       └── head.ejs
│
├── middleware/
│   ├── auth.js                ← requireLogin, requireRole
│   ├── flash.js
│   └── global.js
│
└── models/
    ├── db.js                  ← PostgreSQL connection pool
    └── setup.js               ← Database initialization
```

---

## Testing the Integration

**Homepage:**
1. Visit `/` - See featured vehicles
2. Verify featured vehicles show images, price, rating

**Browse Vehicles:**
1. Visit `/catalog` - See all vehicles in grid
2. Click category → `/catalog?category=1` - Filter by category
3. Change sort → `/catalog?sort=price_asc` - Re-sort

**Vehicle Detail:**
1. Click on vehicle card → `/catalog/vehicles/1`
2. See complete specs, images, features, reviews
3. If logged in, see "Request Service" and "Leave Review" buttons

**Leaving Reviews:**
1. Log in as user (john@example.com)
2. Click "Leave a Review" on vehicle detail
3. Fill form: rating, title, comment
4. Submit - redirects back to detail, show success message
5. See review displayed below

**Service Requests:**
1. From vehicle detail, click "Request Service"
2. Form pre-fills vehicle info
3. Submit - creates record in service_requests table
4. View in `/requests/my-requests`
5. As admin, view in `/requests/list` and update status

---

## Key Takeaways

✅ **Separated Concerns** - Models handle data, controllers handle logic, views handle display  
✅ **Proper Foreign Keys** - Service requests now link to vehicles via `vehicle_id`, not text  
✅ **Role-Based Access** - Users, employees, and admins have different capabilities  
✅ **Data Validation** - All forms validated server-side before database operations  
✅ **User Ownership** - Reviews/requests tracked with user_id for proper permission checks  
✅ **Consistent Routing** - All routes go through single router with proper middleware  
✅ **Rich Data** - Vehicles include images, features, specs, reviews, ratings  
✅ **All Pieces Connected** - Controllers → Models → Database → Views

