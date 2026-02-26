# Used Car Dealership Web Application

## CSE 340 – Web Backend Development

## Project Overview

This project is a full-stack, server-side rendered web application for a Used Car Dealership. The application will allow customers to browse vehicle inventory, leave reviews, and submit service requests. Employees and administrators will have management capabilities for vehicles, service workflows, and user-generated content.

The purpose of this project is to demonstrate mastery of:

1. Database design and relationships

2. Authentication and role-based authorization

3. MVC architecture

4. Server-side rendering with EJS

5. Multi-stage workflow implementation

6. Secure backend development practices

7. Production deployment with PostgreSQL on Render

This repository currently contains initial planning documentation and will be updated incrementally throughout development.

## Planned Technology Stack

* Node.js

* Express.js

* EJS (server-side rendering)

* PostgreSQL

* ES Modules (ESM)

* express-session (session-based authentication)

* bcrypt (password hashing)

* Render (deployment)

* Environment variables via process.env

# Planned Core Features 

## Public Features

* Home page with featured vehicles

* Browse vehicles by category

* Individual vehicle detail pages

* Contact form (saved to database)

* Standard User Features (Authenticated)

* User registration and login

* Leave vehicle reviews

* Edit/delete own reviews

* Submit service requests

* View service request status history

## Employee Features

* Edit vehicle details (price, availability, description)

* Manage service requests

* Update status (Submitted → In Progress → Completed)

* Add notes

* Moderate/delete reviews

* View contact form submissions

## Admin (Owner) Features

* Add/edit/delete vehicle categories

* Add/edit/delete vehicles

* View and manage user roles (planned)