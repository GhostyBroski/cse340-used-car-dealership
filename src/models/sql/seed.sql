-- Database seed file for CSE 340 - Used Car Dealership Web Application
-- Comprehensive database schema for vehicle inventory management with reviews and service tracking

BEGIN;

-- ============================================================================
-- DROP EXISTING TABLES (for clean reset in development)
-- NOTE: All data tables are preserved to protect manually-added and user content
-- Only clear extra roles beyond the core 3
-- ============================================================================
-- Tables are preserved to maintain data integrity across re-seeding:
-- Users and roles: Manual accounts and role assignments
-- Categories and vehicles: Admin-managed inventory
-- ServiceRequests and reviews: User and customer content
-- Contact forms: Customer inquiries

-- Preserve existing roles and users, but clear stale data
DELETE FROM roles WHERE id > 3;  -- Keep only the 3 core roles

-- ============================================================================
-- ROLES AND USERS MANAGEMENT
-- ============================================================================

-- Roles table for role-based access control (admin, employee, user)
CREATE TABLE IF NOT EXISTS roles (
    id SERIAL PRIMARY KEY,
    role_name VARCHAR(50) UNIQUE NOT NULL,
    role_description TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Users table for authentication and user profiles
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    role_id INTEGER REFERENCES roles(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Contact form table
CREATE TABLE IF NOT EXISTS contact_form (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,  -- Optional: track if submitted by logged-in user
    name VARCHAR(100),
    email VARCHAR(255),
    subject VARCHAR(255) NOT NULL,
    message TEXT NOT NULL,
    submitted TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ============================================================================
-- VEHICLE CATALOG MANAGEMENT
-- ============================================================================

-- Categories table - vehicle types (Truck, Van, Car, SUV, etc.)
CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT,
    display_order INTEGER DEFAULT 0
);

-- Main vehicles table - core inventory with all essential information
CREATE TABLE IF NOT EXISTS vehicles (
    id SERIAL PRIMARY KEY,
    
    -- Vehicle identification and basic info
    make VARCHAR(50) NOT NULL,
    model VARCHAR(50) NOT NULL,
    year INTEGER NOT NULL,
    vin VARCHAR(50) UNIQUE NOT NULL,
    category_id INTEGER NOT NULL REFERENCES categories(id) ON DELETE RESTRICT,
    
    -- Pricing and condition
    price NUMERIC(12,2) NOT NULL,
    mileage INTEGER DEFAULT 0,
    condition VARCHAR(30) DEFAULT 'Used' CHECK (condition IN ('Used', 'Like New', 'Fair')),
    
    -- Physical characteristics
    color VARCHAR(50),
    color_code VARCHAR(10),  -- H/D paint code reference
    
    -- Engine and performance specs
    engine_type VARCHAR(50),  -- e.g., "2.5L Inline 4 Cylinder", "3.8L V6"
    transmission VARCHAR(50),  -- e.g., "Automatic", "Manual", "CVT"
    drivetrain VARCHAR(20),  -- e.g., "AWD", "RWD", "FWD"
    horsepower INTEGER,
    fuel_type VARCHAR(30),  -- "Gasoline", "Diesel", "Hybrid", etc.
    mpg_highway DECIMAL(4,1),
    mpg_city DECIMAL(4,1),
    
    -- Interior features
    seats INTEGER DEFAULT 5,
    interior_color VARCHAR(50),
    interior_material VARCHAR(50),  -- "Cloth", "Leather", "Heated Leather", etc.
    
    -- Vehicle status and marketing
    is_featured BOOLEAN DEFAULT FALSE,  -- Featured on homepage
    is_available BOOLEAN DEFAULT TRUE,  -- Available for purchase/viewing
    description TEXT,  -- Long description for marketing
    
    -- Ownership and tracking
    created_by INTEGER REFERENCES users(id) ON DELETE SET NULL,  -- Admin who added vehicle
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    CONSTRAINT valid_mileage CHECK (mileage >= 0),
    CONSTRAINT valid_price CHECK (price >= 0),
    CONSTRAINT valid_year CHECK (year >= 1900 AND year <= EXTRACT(YEAR FROM CURRENT_DATE) + 1)
);

-- Create index for common queries
CREATE INDEX IF NOT EXISTS idx_vehicles_category ON vehicles(category_id);
CREATE INDEX IF NOT EXISTS idx_vehicles_is_featured ON vehicles(is_featured) WHERE is_featured = TRUE;
CREATE INDEX IF NOT EXISTS idx_vehicles_is_available ON vehicles(is_available) WHERE is_available = TRUE;
CREATE INDEX IF NOT EXISTS idx_vehicles_price ON vehicles(price);

-- Vehicle Images table - multiple images per vehicle with ordering
CREATE TABLE IF NOT EXISTS vehicle_images (
    id SERIAL PRIMARY KEY,
    vehicle_id INTEGER NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    image_url TEXT NOT NULL,
    display_order INTEGER DEFAULT 0,  -- For ordering images in gallery
    alt_text VARCHAR(255),  -- Accessibility and SEO
    uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX IF NOT EXISTS idx_vehicle_images_vehicle_id ON vehicle_images(vehicle_id);

-- Optional: Vehicle Features table - for extensible features (color, interior options, etc.)
CREATE TABLE IF NOT EXISTS vehicle_features (
    id SERIAL PRIMARY KEY,
    vehicle_id INTEGER NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    feature_name VARCHAR(100) NOT NULL,  -- e.g., "Sunroof", "Apple CarPlay", "Lane Detection"
    feature_value VARCHAR(255)  -- e.g., "Yes", "Panoramic", specific details
);

-- ============================================================================
-- CUSTOMER SERVICE AND FEEDBACK
-- ============================================================================

-- Service Requests table - customers can request service for specific vehicles
CREATE TABLE IF NOT EXISTS service_requests (
    id SERIAL PRIMARY KEY,
    
    -- Customer info
    name VARCHAR(100) NOT NULL,
    phone VARCHAR(20) NOT NULL,
    email VARCHAR(255),
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    
    -- Vehicle reference - NOW PROPERLY LINKED TO VEHICLE RECORD
    vehicle_id INTEGER REFERENCES vehicles(id) ON DELETE SET NULL,
    
    -- Request details
    subject VARCHAR(255) NOT NULL,
    message TEXT,
    request_type VARCHAR(50) DEFAULT 'General' CHECK (request_type IN ('General', 'Maintenance', 'Inspection', 'Repair', 'Other')),
    
    -- Status and scheduling
    status VARCHAR(50) NOT NULL DEFAULT 'Submitted' CHECK (status IN ('Submitted', 'In Progress', 'Scheduled', 'Completed', 'Cancelled')),
    submitted_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    scheduled_for TIMESTAMP,
    completed_at TIMESTAMP,
    
    -- Admin notes
    admin_notes TEXT,
    assigned_to INTEGER REFERENCES users(id) ON DELETE SET NULL,  -- Employee assigned to request
    
    CONSTRAINT valid_scheduling CHECK (scheduled_for IS NULL OR scheduled_for > submitted_at)
);

CREATE INDEX IF NOT EXISTS idx_service_requests_vehicle_id ON service_requests(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_service_requests_status ON service_requests(status);
CREATE INDEX IF NOT EXISTS idx_service_requests_user_id ON service_requests(user_id);

-- ============================================================================
-- REVIEWS AND RATINGS
-- ============================================================================

-- Reviews table - customer reviews for vehicles (one review per user per vehicle)
CREATE TABLE IF NOT EXISTS reviews (
    id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    vehicle_id INTEGER NOT NULL REFERENCES vehicles(id) ON DELETE CASCADE,
    
    -- Rating and feedback
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    title VARCHAR(255),
    comment TEXT,
    
    -- Tracking
    created_at TIMESTAMP NOT NULL DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    
    -- One review per user per vehicle
    UNIQUE(user_id, vehicle_id)
);

CREATE INDEX IF NOT EXISTS idx_reviews_vehicle_id ON reviews(vehicle_id);
CREATE INDEX IF NOT EXISTS idx_reviews_user_id ON reviews(user_id);
CREATE INDEX IF NOT EXISTS idx_reviews_rating ON reviews(rating);

-- ============================================================================
-- SEED DATA - ROLES
-- ============================================================================

INSERT INTO roles (role_name, role_description) 
VALUES 
    ('user', 'Standard customer with basic access'),
    ('employee', 'Dealership employee - can manage and view vehicle data'),
    ('admin', 'Administrator with full system access')
ON CONFLICT (role_name) DO NOTHING;

-- ============================================================================
-- SEED DATA - USERS
-- ============================================================================
-- Pre-seeded default accounts for shared deployments (e.g., Render demo link)
-- Default password for all default accounts: P@$$w0rd!
-- IMPORTANT: Change these passwords immediately after deployment
-- NOTE: These only insert if the account doesn't already exist (by email)
-- User-registered accounts are preserved and not deleted

INSERT INTO users (name, email, password, role_id)
SELECT 'Admin User', 'admin@example.com', '$2b$10$895sXzSJeCcjPpXQF8.hPeoHVbBgT7WBsVqzjTqCguxuAlNb03UNO', 3
WHERE NOT EXISTS(SELECT 1 FROM users WHERE LOWER(email) = LOWER('admin@example.com'));

INSERT INTO users (name, email, password, role_id)
SELECT 'Employee User', 'employee@example.com', '$2b$10$895sXzSJeCcjPpXQF8.hPeoHVbBgT7WBsVqzjTqCguxuAlNb03UNO', 2
WHERE NOT EXISTS(SELECT 1 FROM users WHERE LOWER(email) = LOWER('employee@example.com'));

INSERT INTO users (name, email, password, role_id)
SELECT 'Regular User', 'user@example.com', '$2b$10$895sXzSJeCcjPpXQF8.hPeoHVbBgT7WBsVqzjTqCguxuAlNb03UNO', 1
WHERE NOT EXISTS(SELECT 1 FROM users WHERE LOWER(email) = LOWER('user@example.com'));

-- ============================================================================
-- SEED DATA - CATEGORIES
-- ============================================================================

INSERT INTO categories (name, description, display_order) VALUES
    ('Sedan', 'Four-door family sedans and compact cars', 1),
    ('SUV', 'Sport Utility Vehicles and crossovers', 2),
    ('Truck', 'Pickup trucks and work vehicles', 3),
    ('Van', 'Minivans and cargo vans for families', 4),
    ('Coupe', 'Two-door sports and performance cars', 5),
    ('Hatchback', 'Compact hatchbacks for city driving', 6)
ON CONFLICT (name) DO NOTHING;

-- ============================================================================
-- SEED DATA - VEHICLES
-- Core inventory of featured and available vehicles
-- ============================================================================

INSERT INTO vehicles (
    make, model, year, vin, category_id, 
    price, mileage, condition, color, color_code,
    engine_type, transmission, drivetrain, horsepower, fuel_type, mpg_highway, mpg_city,
    seats, interior_color, interior_material,
    is_featured, is_available, description, created_by
)
VALUES
    -- Featured vehicles (showcase on homepage)
    (
        'Toyota', 'Camry', 2021, '4T1BF1FK0MU00003', (SELECT id FROM categories WHERE name = 'Sedan'),
        24500.00, 28000, 'Like New', 'Pearl White', 'PW1',
        '2.5L 4-Cylinder', 'Automatic', 'FWD', 203, 'Gasoline', 32.0, 28.0,
        5, 'Gray', 'Cloth',
        TRUE, TRUE, 
        'Well-maintained Toyota Camry with excellent fuel economy. Perfect for commuting or family trips. Recently serviced with new tires.',
        (SELECT id FROM users WHERE email = 'admin@dealership.com')
    ),
    (
        'Honda', 'CR-V', 2020, '2HRCF8H5XLH00001', (SELECT id FROM categories WHERE name = 'SUV'),
        26800.00, 35000, 'Like New', 'Crystal Black', 'CB1',
        '1.5L Turbocharged 4-Cylinder', 'Automatic CVT', 'AWD', 190, 'Gasoline', 30.0, 26.0,
        5, 'Black', 'Heated Leather',
        TRUE, TRUE,
        'Reliable Honda CR-V AWD with heated leather seats and backup camera. Great for families and outdoor adventures.',
        (SELECT id FROM users WHERE email = 'admin@dealership.com')
    ),
    (
        'Ford', 'F-150', 2019, '1FTFW1E50LFA00001', (SELECT id FROM categories WHERE name = 'Truck'),
        28900.00, 52000, 'Used', 'Magnetic Gray', 'MG2',
        '3.5L Twin-Turbocharged V6', 'Automatic', 'RWD', 375, 'Gasoline', 27.0, 21.0,
        5, 'Gray', 'Cloth with Leather Trim',
        TRUE, TRUE,
        'Powerful Ford F-150 perfect for work and weekend adventures. Well-maintained with regular service history.',
        (SELECT id FROM users WHERE email = 'admin@dealership.com')
    ),
    
    -- Additional available vehicles
    (
        'Mazda', 'CX-5', 2022, 'JM2BF236XM0234567', (SELECT id FROM categories WHERE name = 'SUV'),
        27200.00, 18000, 'Like New', 'Soul Red', 'SR1',
        '2.5L 4-Cylinder', 'Automatic', 'AWD', 187, 'Gasoline', 31.0, 25.0,
        5, 'Red', 'Leather',
        FALSE, TRUE,
        'Stylish Mazda CX-5 with excellent handling and premium interior. Low mileage, excellent condition.',
        (SELECT id FROM users WHERE email = 'admin@dealership.com')
    ),
    (
        'Chevrolet', 'Silverado', 2020, '3GCUKREH4LG00002', (SELECT id FROM categories WHERE name = 'Truck'),
        31500.00, 42000, 'Used', 'Black', 'BLK',
        '5.3L V8', 'Automatic', 'RWD', 420, 'Gasoline', 26.0, 19.0,
        5, 'Gray', 'Cloth',
        FALSE, TRUE,
        'Heavy-duty Chevrolet Silverado with powerful engine and comfortable cabin. Ready for any job.',
        (SELECT id FROM users WHERE email = 'admin@dealership.com')
    ),
    (
        'Honda', 'Odyssey', 2021, '5FNRL6H77KB00002', (SELECT id FROM categories WHERE name = 'Van'),
        29800.00, 24000, 'Like New', 'White Diamond', 'WD1',
        '3.5L V6', 'Automatic', 'FWD', 280, 'Gasoline', 28.0, 21.0,
        8, 'Gray', 'Stain-Resistant Fabric',
        FALSE, TRUE,
        'Perfect family minivan with sliding doors and spacious cargo area. Excellent safety features.',
        (SELECT id FROM users WHERE email = 'admin@dealership.com')
    ),
    (
        'Toyota', 'RAV4', 2023, '2T1FXREC9X3213456', (SELECT id FROM categories WHERE name = 'SUV'),
        32500.00, 8000, 'Like New', 'Blueprint', 'BL2',
        '2.5L 4-Cylinder', 'Automatic', 'AWD', 203, 'Gasoline', 32.0, 29.0,
        5, 'Black', 'SofTex',
        TRUE, TRUE,
        'Brand new Toyota RAV4 with all latest technology. Keyless entry, touchscreen, backup camera, lane departure warning.',
        (SELECT id FROM users WHERE email = 'admin@dealership.com')
    ),
    (
        'Hyundai', 'Elantra', 2021, 'KMHEC4A46MU000001', (SELECT id FROM categories WHERE name = 'Sedan'),
        17900.00, 31000, 'Used', 'Storm Blue', 'SB1',
        '2.0L 4-Cylinder', 'Automatic', 'FWD', 147, 'Gasoline', 38.0, 30.0,
        5, 'Gray', 'Cloth',
        FALSE, TRUE,
        'Affordable and reliable Hyundai Elantra with excellent fuel economy. Great for budget-conscious buyers.',
        (SELECT id FROM users WHERE email = 'admin@dealership.com')
    ),
    (
        'Jeep', 'Wrangler', 2020, '1J4BA5H96AL000003', (SELECT id FROM categories WHERE name = 'SUV'),
        33700.00, 38000, 'Used', 'Bright White', 'BW1',
        '3.6L V6', 'Automatic', 'AWD', 285, 'Gasoline', 25.0, 22.0,
        5, 'Black', 'Cloth',
        FALSE, TRUE,
        'Adventure-ready Jeep Wrangler with removable doors and all-terrain capability. Popular choice for outdoor enthusiasts.',
        (SELECT id FROM users WHERE email = 'admin@dealership.com')
    ),
    (
        'BMW', '320i', 2019, 'WBADT53452G000004', (SELECT id FROM categories WHERE name = 'Sedan'),
        33400.00, 45000, 'Used', 'Alpine White', 'AW1',
        '2.0L TwinPower Turbo 4-Cylinder', 'Automatic', 'RWD', 255, 'Gasoline', 34.0, 26.0,
        5, 'Brown', 'Leather',
        FALSE, TRUE,
        'Luxury BMW with premium features, excellent performance. Well-maintained with full service history.',
        (SELECT id FROM users WHERE email = 'admin@dealership.com')
    )
ON CONFLICT (vin) DO NOTHING;

-- ============================================================================
-- SEED DATA - VEHICLE IMAGES
-- Multiple images per vehicle for gallery display
-- ============================================================================

INSERT INTO vehicle_images (vehicle_id, image_url, display_order, alt_text) VALUES
    -- Toyota Camry images
    ((SELECT id FROM vehicles WHERE vin = '4T1BF1FK0MU00003'), '/images/vehicles/camry-1.jpg', 0, 'Toyota Camry front exterior'),
    ((SELECT id FROM vehicles WHERE vin = '4T1BF1FK0MU00003'), '/images/vehicles/camry-2.jpg', 1, 'Toyota Camry side view'),
    ((SELECT id FROM vehicles WHERE vin = '4T1BF1FK0MU00003'), '/images/vehicles/camry-3.jpg', 2, 'Toyota Camry interior dashboard'),
    
    -- Honda CR-V images
    ((SELECT id FROM vehicles WHERE vin = '2HRCF8H5XLH00001'), '/images/vehicles/crv-1.jpg', 0, 'Honda CR-V front exterior'),
    ((SELECT id FROM vehicles WHERE vin = '2HRCF8H5XLH00001'), '/images/vehicles/crv-2.jpg', 1, 'Honda CR-V side view'),
    ((SELECT id FROM vehicles WHERE vin = '2HRCF8H5XLH00001'), '/images/vehicles/crv-3.jpg', 2, 'Honda CR-V interior'),
    
    -- Ford F-150 images
    ((SELECT id FROM vehicles WHERE vin = '1FTFW1E50LFA00001'), '/images/vehicles/f150-1.jpg', 0, 'Ford F-150 front exterior'),
    ((SELECT id FROM vehicles WHERE vin = '1FTFW1E50LFA00001'), '/images/vehicles/f150-2.jpg', 1, 'Ford F-150 side profile'),
    ((SELECT id FROM vehicles WHERE vin = '1FTFW1E50LFA00001'), '/images/vehicles/f150-3.jpg', 2, 'Ford F-150 truck bed'),
    
    -- Mazda CX-5 images
    ((SELECT id FROM vehicles WHERE vin = 'JM2BF236XM0234567'), '/images/vehicles/cx5-1.jpg', 0, 'Mazda CX-5 front exterior'),
    ((SELECT id FROM vehicles WHERE vin = 'JM2BF236XM0234567'), '/images/vehicles/cx5-2.jpg', 1, 'Mazda CX-5 interior dashboard'),
    
    -- Chevrolet Silverado images
    ((SELECT id FROM vehicles WHERE vin = '3GCUKREH4LG00002'), '/images/vehicles/silverado-1.jpg', 0, 'Chevrolet Silverado front'),
    ((SELECT id FROM vehicles WHERE vin = '3GCUKREH4LG00002'), '/images/vehicles/silverado-2.jpg', 1, 'Chevrolet Silverado side view'),
    
    -- Honda Odyssey images
    ((SELECT id FROM vehicles WHERE vin = '5FNRL6H77KB00002'), '/images/vehicles/odyssey-1.jpg', 0, 'Honda Odyssey front exterior'),
    ((SELECT id FROM vehicles WHERE vin = '5FNRL6H77KB00002'), '/images/vehicles/odyssey-2.jpg', 1, 'Honda Odyssey interior seats'),
    
    -- Toyota RAV4 images
    ((SELECT id FROM vehicles WHERE vin = '2T1FXREC9X3213456'), '/images/vehicles/rav4-1.jpg', 0, 'Toyota RAV4 front exterior'),
    ((SELECT id FROM vehicles WHERE vin = '2T1FXREC9X3213456'), '/images/vehicles/rav4-2.jpg', 1, 'Toyota RAV4 side view'),
    ((SELECT id FROM vehicles WHERE vin = '2T1FXREC9X3213456'), '/images/vehicles/rav4-3.jpg', 2, 'Toyota RAV4 interior'),
    
    -- Hyundai Elantra images
    ((SELECT id FROM vehicles WHERE vin = 'KMHEC4A46MU000001'), '/images/vehicles/elantra-1.jpg', 0, 'Hyundai Elantra front exterior'),
    
    -- Jeep Wrangler images
    ((SELECT id FROM vehicles WHERE vin = '1J4BA5H96AL000003'), '/images/vehicles/wrangler-1.jpg', 0, 'Jeep Wrangler front exterior'),
    ((SELECT id FROM vehicles WHERE vin = '1J4BA5H96AL000003'), '/images/vehicles/wrangler-2.jpg', 1, 'Jeep Wrangler off-road view'),
    
    -- BMW 320i images
    ((SELECT id FROM vehicles WHERE vin = 'WBADT53452G000004'), '/images/vehicles/bmw-1.jpg', 0, 'BMW 320i front exterior'),
    ((SELECT id FROM vehicles WHERE vin = 'WBADT53452G000004'), '/images/vehicles/bmw-2.jpg', 1, 'BMW 320i interior leather seats');

-- ============================================================================
-- SEED DATA - SAMPLE REVIEWS
-- Customer reviews for vehicles
-- ============================================================================
-- Reviews are created by registered users when they leave feedback on vehicles

-- ============================================================================
-- SEED DATA - VEHICLE FEATURES (optional extended attributes)
-- Additional features and amenities for vehicles
-- ============================================================================

INSERT INTO vehicle_features (vehicle_id, feature_name, feature_value) VALUES
    -- Toyota Camry features
    ((SELECT id FROM vehicles WHERE vin = '4T1BF1FK0MU00003'), 'Backup Camera', 'Yes'),
    ((SELECT id FROM vehicles WHERE vin = '4T1BF1FK0MU00003'), 'Bluetooth', 'Yes'),
    ((SELECT id FROM vehicles WHERE vin = '4T1BF1FK0MU00003'), 'Cruise Control', 'Yes'),
    ((SELECT id FROM vehicles WHERE vin = '4T1BF1FK0MU00003'), 'Power Windows', 'Yes'),
    ((SELECT id FROM vehicles WHERE vin = '4T1BF1FK0MU00003'), 'Air Conditioning', 'Automatic Climate Control'),
    
    -- Honda CR-V features
    ((SELECT id FROM vehicles WHERE vin = '2HRCF8H5XLH00001'), 'All-Wheel Drive', 'Yes'),
    ((SELECT id FROM vehicles WHERE vin = '2HRCF8H5XLH00001'), 'Heated Seats', 'Yes'),
    ((SELECT id FROM vehicles WHERE vin = '2HRCF8H5XLH00001'), 'Sunroof', 'Panoramic'),
    ((SELECT id FROM vehicles WHERE vin = '2HRCF8H5XLH00001'), 'Apple CarPlay', 'Yes'),
    ((SELECT id FROM vehicles WHERE vin = '2HRCF8H5XLH00001'), 'Android Auto', 'Yes'),
    
    -- Ford F-150 features
    ((SELECT id FROM vehicles WHERE vin = '1FTFW1E50LFA00001'), 'Four-Wheel Drive', 'Available'),
    ((SELECT id FROM vehicles WHERE vin = '1FTFW1E50LFA00001'), 'Towing Package', 'Yes'),
    ((SELECT id FROM vehicles WHERE vin = '1FTFW1E50LFA00001'), 'Backup Camera', 'Yes'),
    ((SELECT id FROM vehicles WHERE vin = '1FTFW1E50LFA00001'), 'Bed Liner', 'Spray-in');

COMMIT;