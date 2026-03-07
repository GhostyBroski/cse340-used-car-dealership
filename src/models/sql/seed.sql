-- Database seed file for student course catalog
-- This file creates tables and inserts all initial data

BEGIN;

-- Drop new dealership tables (reverse dependency order)
DROP TABLE IF EXISTS vehicle_images CASCADE;
DROP TABLE IF EXISTS reviews CASCADE;
DROP TABLE IF EXISTS service_requests CASCADE;
DROP TABLE IF EXISTS vehicles CASCADE;
DROP TABLE IF EXISTS categories CASCADE;
DROP TABLE IF EXISTS users CASCADE;

-- Create categories
CREATE TABLE IF NOT EXISTS categories (
    id SERIAL PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE,
    description TEXT
);

-- Create users
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Create vehicles
CREATE TABLE IF NOT EXISTS vehicles (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE SET NULL,
    make VARCHAR(50) NOT NULL,
    model VARCHAR(50) NOT NULL,
    year INTEGER,
    vin VARCHAR(50) UNIQUE,
    category_id INTEGER REFERENCES categories(id),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Seed categories
INSERT INTO categories (name, description) VALUES
    ('Truck', 'Pickup trucks and similar'),
    ('Van', 'Passenger and cargo vans'),
    ('Car', 'Standard cars and sedans'),
    ('SUV', 'Sport Utility Vehicles')
ON CONFLICT (name) DO NOTHING;

-- Seed vehicles
INSERT INTO vehicles (user_id, make, model, year, vin, category_id) VALUES
    (1, 'Ford', 'F-150', 2020, '1FTFW1E50LFA00001', 1),
    (2, 'Honda', 'Odyssey', 2019, '5FNRL6H77KB00002', 2),
    (1, 'Toyota', 'Camry', 2021, '4T1BF1FK0MU00003', 3),
    (2, 'Jeep', 'Grand Cherokee', 2018, '1C4RJFBG8JC00004', 4)
ON CONFLICT (vin) DO NOTHING;
);

COMMIT;