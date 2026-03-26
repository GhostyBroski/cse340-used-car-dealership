# Database Schema Audit & Improvements
## CSE 340 - Used Car Dealership Web Application

---

## Executive Summary

Your vehicle catalog database has been completely redesigned and enhanced to support a professional inventory management system. The improvements include:

✅ **Comprehensive vehicle specs** - Engine, transmission, drivetrain, fuel economy, and more  
✅ **Featured vehicle flagging** - Homepage showcase functionality  
✅ **Proper relationships** - Service requests now correctly link to vehicles via `vehicle_id`  
✅ **Image gallery support** - Multiple images per vehicle with ordering  
✅ **Role-based access** - Admin, employee, and user roles for different functionality  
✅ **Rich seed data** - 10 realistic vehicles with images and features  
✅ **Review system** - Customers can rate and review specific vehicles  
✅ **Service tracking** - Service requests tied to vehicles with employee assignment  
✅ **Query optimization** - Strategic indexes for common searches  

---

## Key Problems Solved

### 1. **Service Requests Disconnection ❌ → ✅**
**Before:** Service requests stored only `vehicle_make` and `vehicle_model` as text
```sql
-- OLD - Can't track which vehicle request is for
INSERT INTO service_requests (vehicle_make, vehicle_model) VALUES ('Toyota', 'Camry');
```

**After:** Service requests properly link to vehicles with foreign key
```sql
-- NEW - Properly linked to vehicle record
INSERT INTO service_requests (vehicle_id) VALUES (1);
```

**Impact:** Now you can:
- Get all service requests for a specific vehicle
- Assign requests to employees
- Track vehicle-specific service history
- Pull vehicle details with request information

---

### 2. **Missing Vehicle Specs ❌ → ✅**
**Before:** Vehicle table had only basic info (make, model, year, price, mileage)

**After:** Complete vehicle specifications including:
- **Engine:** `engine_type`, `horsepower`, `fuel_type`
- **Performance:** `transmission`, `drivetrain`, `mpg_highway`, `mpg_city`
- **Interior:** `interior_color`, `interior_material`, `seats`
- **Marketing:** `is_featured`, `condition`, detailed `description`
- **Tracking:** `created_by`, timestamps

---

### 3. **Limited Image Support ❌ → ✅**
**Before:** `vehicle_images` existed but was very basic

**After:** Enhanced with:
- `display_order` - Control gallery image sequence
- `alt_text` - Accessibility and SEO
- Supports multiple images per vehicle
- Proper indexing for performance

---

### 4. **No Employee Capabilities ❌ → ✅**
**Before:** Only admin/user roles existed

**After:** Three-tier access control:
- **User** - Browse vehicles, submit reviews and service requests
- **Employee** - Manage vehicles and service requests
- **Admin** - Full system control

---

## Database Schema Overview

### Core Tables

#### `roles` - Access Control
```sql
CREATE TABLE roles (
    id SERIAL PRIMARY KEY,
    role_name VARCHAR(50) UNIQUE NOT NULL,  -- 'user', 'employee', 'admin'
    role_description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### `users` - User Profiles
```sql
CREATE TABLE users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,  -- hashed with bcrypt
    role_id INTEGER NOT NULL REFERENCES roles(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
```

#### `categories` - Vehicle Types
```sql
CREATE TABLE categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,      -- 'Sedan', 'SUV', 'Truck', etc.
    description TEXT,
    display_order INTEGER DEFAULT 0         -- for ordering in UI
);
```

#### `vehicles` - Main Inventory ⭐
The core vehicle catalog with comprehensive specifications:

```sql
CREATE TABLE vehicles (
    id SERIAL PRIMARY KEY,
    
    -- Identification
    make VARCHAR(50) NOT NULL,              -- 'Toyota', 'Honda', etc.
    model VARCHAR(50) NOT NULL,             -- 'Camry', 'CR-V', etc.
    year INTEGER NOT NULL,
    vin VARCHAR(50) UNIQUE NOT NULL,        -- Vehicle Identification Number
    category_id INTEGER NOT NULL REFERENCES categories(id),
    
    -- Pricing & Condition
    price NUMERIC(12,2) NOT NULL,           -- $0 - $999,999.99
    mileage INTEGER DEFAULT 0,
    condition VARCHAR(30) DEFAULT 'Used',   -- 'Used', 'Like New', 'Fair'
    
    -- Exterior
    color VARCHAR(50),                      -- 'Pearl White', 'Soul Red', etc.
    color_code VARCHAR(10),                 -- Paint code reference
    
    -- Engine & Performance
    engine_type VARCHAR(50),                -- '2.5L 4-Cylinder', '3.5L V6', etc.
    transmission VARCHAR(50),               -- 'Automatic', 'Manual', 'CVT'
    drivetrain VARCHAR(20),                 -- 'FWD', 'RWD', 'AWD'
    horsepower INTEGER,
    fuel_type VARCHAR(30),                  -- 'Gasoline', 'Diesel', 'Hybrid'
    mpg_highway DECIMAL(4,1),
    mpg_city DECIMAL(4,1),
    
    -- Interior
    seats INTEGER DEFAULT 5,
    interior_color VARCHAR(50),
    interior_material VARCHAR(50),          -- 'Cloth', 'Leather', 'Heated Leather'
    
    -- Status & Marketing
    is_featured BOOLEAN DEFAULT FALSE,      -- Show on homepage
    is_available BOOLEAN DEFAULT TRUE,      -- Available for purchase
    description TEXT,                       -- Marketing description
    
    -- Ownership
    created_by INTEGER REFERENCES users(id),-- Admin who added vehicle
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- Constraints
    CONSTRAINT valid_mileage CHECK (mileage >= 0),
    CONSTRAINT valid_price CHECK (price >= 0),
    CONSTRAINT valid_year CHECK (year >= 1900 AND year <= EXTRACT(YEAR FROM CURRENT_DATE) + 1)
);

-- Performance indexes
CREATE INDEX idx_vehicles_category ON vehicles(category_id);
CREATE INDEX idx_vehicles_is_featured ON vehicles(is_featured) WHERE is_featured = TRUE;
CREATE INDEX idx_vehicles_is_available ON vehicles(is_available) WHERE is_available = TRUE;
CREATE INDEX idx_vehicles_price ON vehicles(price);
```

#### `vehicle_images` - Photo Gallery
```sql
CREATE TABLE vehicle_images (
    id SERIAL PRIMARY KEY,
    vehicle_id INTEGER NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    display_order INTEGER DEFAULT 0,       -- Gallery sequence
    alt_text VARCHAR(255),                 -- Accessibility
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_vehicle_images_vehicle_id ON vehicle_images(vehicle_id);
```

#### `vehicle_features` - Extensible Features
For storing flexible vehicle features like "Sunroof", "Apple CarPlay", "Lane Detection":

```sql
CREATE TABLE vehicle_features (
    id SERIAL PRIMARY KEY,
    vehicle_id INTEGER NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    feature_name VARCHAR(100) NOT NULL,    -- e.g., 'Sunroof'
    feature_value VARCHAR(255)             -- e.g., 'Panoramic'
);
```

#### `service_requests` - Service Workflow ⭐ IMPROVED
Now properly links to vehicles:

```sql
CREATE TABLE service_requests (
    id SERIAL PRIMARY KEY,
    
    -- Customer Info
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(255),
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    
    -- Vehicle Link - NOW PROPER FK ✅
    vehicle_id INTEGER REFERENCES vehicles(id) ON DELETE SET NULL,
    
    -- Request Details
    subject VARCHAR(255) NOT NULL,
    message TEXT,
    request_type VARCHAR(50) DEFAULT 'General',  -- 'General', 'Maintenance', 'Inspection', etc.
    
    -- Workflow Management
    status VARCHAR(50) NOT NULL DEFAULT 'Submitted',  -- 'Submitted', 'In Progress', 'Completed', etc.
    submitted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    scheduled_for TIMESTAMP,
    completed_at TIMESTAMP,
    
    -- Admin Assignment
    admin_notes TEXT,
    assigned_to INTEGER REFERENCES users(id) ON DELETE SET NULL,  -- Employee assigned
    
    CONSTRAINT valid_scheduling CHECK (scheduled_for IS NULL OR scheduled_for > submitted_at)
);

CREATE INDEX idx_service_requests_vehicle_id ON service_requests(vehicle_id);
CREATE INDEX idx_service_requests_status ON service_requests(status);
CREATE INDEX idx_service_requests_user_id ON service_requests(user_id);
```

#### `reviews` - Customer Feedback
```sql
CREATE TABLE reviews (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    vehicle_id INTEGER NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    title VARCHAR(255),
    comment TEXT,
    
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- One review per user per vehicle
    UNIQUE(user_id, vehicle_id)
);

CREATE INDEX idx_reviews_vehicle_id ON reviews(vehicle_id);
CREATE INDEX idx_reviews_user_id ON reviews(user_id);
CREATE INDEX idx_reviews_rating ON reviews(rating);
```

---

## Seed Data Highlights

The database is pre-populated with realistic vehicles including:

### Featured Vehicles (Homepage Showcase)
1. **2021 Toyota Camry** - $24,500 | 28,000 miles | Like New
   - 2.5L 4-Cyl | Automatic | FWD | 32 MPG Hwy

2. **2020 Honda CR-V** - $26,800 | 35,000 miles | Like New
   - 1.5L Turbo | CVT | AWD | Heated Leather

3. **2019 Ford F-150** - $28,900 | 52,000 miles | Used
   - 3.5L Twin-Turbo V6 | 375 HP | RWD

### Additional Inventory
- Mazda CX-5, Chevy Silverado, Honda Odyssey, Toyota RAV4, Hyundai Elantra, Jeep Wrangler, BMW 320i

### Test Users
- **Customers:** john@example.com, sarah@example.com (role: user)
- **Employee:** mike@dealership.com (role: employee)
- **Admin:** admin@dealership.com (role: admin)

---

## Working with the Database

### Using the New Vehicles Model

```javascript
import { 
    getAllVehicles,
    getVehicleById,
    getFeaturedVehicles,
    getVehiclesByCategory,
    searchVehicles,
    createVehicle,
    updateVehicle,
    addVehicleImage,
    addVehicleFeature
} from '../models/catalog/vehicles.js';

// Get featured vehicles for homepage
const featured = await getFeaturedVehicles(5);

// Get all vehicles in a category
const suvs = await getVehiclesByCategory(2, 'price_asc');

// Search vehicles
const results = await searchVehicles('Honda', { 
    priceMax: 30000,
    yearMin: 2018
});

// Get complete vehicle details
const vehicle = await getVehicleById(1);
console.log(vehicle.images);      // All photos
console.log(vehicle.features);    // All features
console.log(vehicle.avgRating);   // Customer rating
```

### Service Requests Enhanced

```javascript
import {
    createServiceRequest,
    getServiceRequestsByVehicle,
    getServiceRequestsByEmployee,
    updateServiceRequestStatus
} from '../models/forms/requests.js';

// Now linked to specific vehicle
const request = await createServiceRequest({
    name: 'John Doe',
    phone: '555-1234',
    vehicleId: 1,                    // ✅ Links to vehicle record
    subject: 'Oil Change Request',
    message: 'Need regular maintenance',
    requestType: 'Maintenance'
});

// Get all requests for a vehicle
const vehicleRequests = await getServiceRequestsByVehicle(1);

// Get requests assigned to employee
const myRequests = await getServiceRequestsByEmployee(3);

// Update request with employee notes
await updateServiceRequestStatus(1, {
    status: 'Scheduled',
    adminNotes: 'Scheduled for next Tuesday',
    assignedTo: 3
});
```

---

## Migration Notes

If you had existing data in the old schema, you'd need:

1. **Update service_requests to add vehicle_id**
```sql
-- Link existing requests to vehicles based on make/model
UPDATE service_requests sr
SET vehicle_id = v.id
FROM vehicles v
WHERE sr.vehicle_make = v.make 
  AND sr.vehicle_model = v.model
  AND v.year = (SELECT MAX(year) FROM vehicles v2 WHERE v2.make = v.make AND v2.model = v.model);
```

2. **Migrate old vehicle data into new vehicles table**
```sql
-- This was already handled in practice.sql
```

---

## Best Practices Going Forward

### 1. **Always Use vehicle_id, Never Store Make/Model as Text**
```javascript
// ❌ BAD
const req = { vehicleMake: 'Toyota', vehicleModel: 'Camry' }

// ✅ GOOD
const req = { vehicleId: 1 }
```

### 2. **Use the Vehicle Model Functions**
```javascript
// ✅ Good - uses prepared statements and handles data transformation
const vehicles = await getAllVehicles({ sortBy: 'price_asc' });

// ❌ Avoid - manual queries prone to SQL injection
const result = await db.query(`SELECT * FROM vehicles WHERE price < ${userInput}`);
```

### 3. **Feature Image Gallery Properly**
```javascript
// Add multiple images with ordering
await addVehicleImage(vehicleId, '/images/exterior-1.jpg', 0, 'Front view');
await addVehicleImage(vehicleId, '/images/interior.jpg', 1, 'Interior dashboard');
await addVehicleImage(vehicleId, '/images/tires.jpg', 2, 'Wheels closeup');
```

### 4. **Use Roles for Access Control**
```javascript
// Check user role before allowing changes
if (req.session.user.roleId !== ADMIN_ROLE_ID && req.session.user.roleId !== EMPLOYEE_ROLE_ID) {
    return res.status(403).send('Unauthorized');
}

await updateVehicle(vehicleId, { isFeatured: true });
```

---

## Performance Optimization

### Indexes Created
- `idx_vehicles_category` - Filter by category
- `idx_vehicles_is_featured` - Homepage queries
- `idx_vehicles_is_available` - Available vehicle listings
- `idx_vehicles_price` - Price range filtering
- `idx_vehicle_images_vehicle_id` - Gallery loading
- `idx_service_requests_vehicle_id` - Request lookup
- `idx_service_requests_status` - Workflow queries
- `idx_reviews_vehicle_id` - Review retrieval

### Query Optimization Tips
```javascript
// ✅ Efficient - gets featured vehicles with image and rating in one query
const featured = await getFeaturedVehicles();  
// Returns: { ...vehicle, mainImage, avgRating, reviewCount }

// ❌ Inefficient - separate queries for each piece
const vehicles = await db.query('SELECT * FROM vehicles WHERE is_featured = true');
for (let v of vehicles) {
    v.image = await getImage(v.id);
    v.rating = await getAvgRating(v.id);
}
```

---

## Common Queries

### Homepage
```javascript
// Featured vehicles showcase
const featured = await getFeaturedVehicles(5);
```

### Vehicle Browse Page
```javascript
// All available vehicles, sorted by year (newest first)
const results = await getAllVehicles({
    availableOnly: true,
    sortBy: 'year_desc'
});
```

### Category Page
```javascript
// SUVs sorted by price (lowest first)
const suvs = await getVehiclesByCategory(2, 'price_asc');
```

### Vehicle Detail Page
```javascript
// Complete vehicle information with images, features, reviews
const vehicle = await getVehicleById(vehicleId);
// Returns: { id, make, model, images[], features[], avgRating, reviewCount, etc. }
```

### Search Results
```javascript
// Find Honda vehicles under $30k from 2018+
const results = await searchVehicles('Honda', {
    priceMax: 30000,
    yearMin: 2018
});
```

### Admin Dashboard
```javascript
// All service requests with vehicle details
const allRequests = await getAllServiceRequests();
// Returns: [{ id, name, vehicle: { id, make, model, year }, status, ... }]

// Requests for a specific vehicle
const vehicleRequests = await getServiceRequestsByVehicle(1);

// Requests assigned to employee
const myRequests = await getServiceRequestsByEmployee(employeeId);
```

---

## Files Modified/Created

### Modified
- `src/models/sql/practice.sql` - Complete schema redesign + seed data
- `src/models/forms/requests.js` - Updated to use vehicle_id

### Created
- `src/models/catalog/vehicles.js` - Comprehensive vehicle model with all queries

---

## Next Steps

1. **Test the database seed** - Run `practice.sql` against your dev database
2. **Update controllers** - Create vehicle list/detail controllers using new model
3. **Build views** - Create vehicle browse and detail views
4. **Implement reviews** - Customer review submission and display
5. **Service request workflow** - Complete the service request management
6. **Admin panel** - Vehicle management interface for employees/admins

---

## Support

For questions about:
- **Database structure** - See schema overview section
- **Using vehicle model** - See "Working with the Database" section  
- **SQL queries** - See "Common Queries" section
- **Best practices** - See "Best Practices Going Forward" section

