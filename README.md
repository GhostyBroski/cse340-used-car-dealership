# Used Car Dealership Web Application

## CSE 340 – Web Backend Development

---

## 1. Project Description

**Used Car Dealership** is a full-stack, server-side rendered web application for managing and browsing vehicle inventory. The application serves multiple user types: customers (public users) who can browse vehicles and leave reviews, employees who manage inventory and service requests, and administrators who have complete system access.

### Who It's For
- **Customers**: Browse available vehicles, leave reviews, and submit service requests
- **Employees**: Manage vehicle catalog, view and process service requests, moderate customer reviews
- **Administrators**: Full system management including user roles, vehicle categories, and all employee functions

### Key Features
- Browse vehicle inventory organized by category
- Individual vehicle detail pages with images and specifications
- Customer reviews and ratings system
- Service request management with status tracking
- Contact form for customer inquiries
- Role-based access control (User, Employee, Admin)
- Authentication with session-based login
- Responsive design with bubbly, modern UI

---

## 2. Database Schema

### Entity Relationship Diagram (ERD)

![Database ERD](public/images/usedcardealer%20erd.png)

The application uses PostgreSQL with the following core tables:

### Tables Overview

| Table | Purpose | Key Relationships |
|---|---|---|
| `roles` | Role definitions (admin, employee, user) | 1-to-M with users |
| `users` | User accounts and authentication | M-to-1 with roles; 1-to-M with reviews, service_requests, contact_form |
| `categories` | Vehicle categories (Sedan, SUV, Truck, etc.) | 1-to-M with vehicles |
| `vehicles` | Vehicle inventory with specifications | M-to-1 with categories; 1-to-M with images, features, reviews, service_requests |
| `vehicle_images` | Multiple images per vehicle | M-to-1 with vehicles |
| `vehicle_features` | Extensible features (equipment, options) | M-to-1 with vehicles |
| `reviews` | Customer ratings and comments | M-to-1 with users and vehicles |
| `service_requests` | Service appointment requests | M-to-1 with users and vehicles |
| `contact_form` | Customer contact form submissions | M-to-1 with users (optional); tracks inquiry source |
| `session` | Express session store (created by connect-pg-simple) | Stores active user sessions for authentication |

---

## 3. User Roles

### Admin (Role ID: 3)
**Full system access and management**
- Add, edit, delete vehicles from inventory
- Create and manage vehicle categories
- View all customer inquiries (contact forms)
- Moderate all customer reviews (delete inappropriate content)
- Manage service requests and assign them to employees
- View user activity and statistics
- Manage employee and user roles

### Employee (Role ID: 2)
**Inventory and customer service management**
- View and edit vehicle details (price, availability, description)
- Mark vehicles as featured or unavailable
- Manage service requests assigned to them
- Update service request status (Submitted → In Progress → Scheduled → Completed)
- Add notes to service requests
- Moderate and delete reviews (with restrictions)
- View contact form submissions

### User (Role ID: 1)
**Standard customer access**
- Browse complete vehicle catalog
- View vehicle details, images, and specifications
- Leave and edit reviews on vehicles (one per vehicle)
- Delete own reviews
- Submit service requests for vehicles
- View own service request history
- Submit contact form inquiries
- View public contact information and company details

---

## 4. Test Account Credentials

Three default accounts are pre-seeded in the database for testing purposes.

| Role | Email |
|---|---|
| Admin | `admin@example.com` |
| Employee | `employee@example.com` |
| User | `user@example.com` |

### Important Security Notes
- ⚠️ **Change default passwords immediately** after deploying to production
- These accounts will persist through database resets to enable shared demo deployments (e.g., Render free tier)
- User-created accounts and all business data (vehicles, reviews, requests) are preserved across resets
- Passwords are hashed with bcrypt; never store plain text passwords

---

## 5. Known Limitations

### Incomplete Features
- **Vehicle Search**: Full-text search not yet implemented (category filtering available)
- **Advanced Filtering**: Limited to category; no price range, mileage, or feature filters
- **Favorites/Wishlist**: Not implemented for users to save vehicles
- **Notifications**: No email notifications for service request status changes
- **Payment Integration**: No actual payment processing or booking confirmation
- **Vehicle Availability Calendar**: Not implemented for service scheduling

### Data Model Limitations
- **Single Review Per User**: Each user can only leave one review per vehicle (no review history)
- **Service Request Scheduling**: Date/time picker is basic; no calendar view
- **Vehicle Specifications**: Limited to predefined fields; no custom attributes
- **Image Management**: Manual URL entry only; no image upload functionality

### Performance & Scalability
- **Connection Pooling**: Render free tier limit of ~4-5 concurrent connections may cause timeouts under heavy load
- **Session Store**: Uses database; consider Redis for production with high traffic
- **No Caching**: No Redis or static caching implemented
- **Batch Operations**: Admin features don't support bulk edit/delete

### User Experience
- **Mobile Optimization**: Limited responsive design; may not be optimal on small screens
- **Accessibility**: Limited WCAG compliance (color contrast, screen reader support)
- **Browser Support**: Not tested on older browsers (modern browsers recommended)
- **Offline Support**: No offline functionality or progressive web app features

### Security & Deployment
- **File Upload**: No secure file upload for vehicle images (manual URL entry only)
- **Rate Limiting**: No rate limiting on forms or API endpoints
- **CSRF Protection**: Not explicitly implemented
- **HTTPS**: Requires secure deployment configuration
- **API Endpoints**: No public REST API; all routes are server-rendered HTML

### Known Bugs
- WebSocket server (port 3001) optional; gracefully falls back if unavailable
- Session cleanup may timeout on resource-constrained environments
- Large result sets may cause slowness without pagination

---

## Technology Stack

- **Backend**: Node.js + Express.js
- **Frontend**: EJS (server-side rendering)
- **Database**: PostgreSQL
- **Authentication**: express-session + bcrypt
- **Deployment**: Render with PostgreSQL
- **Module System**: ES Modules (ESM)

---

## Installation & Setup

```bash
# Install dependencies
pnpm install

# Configure environment variables
cp .env.example .env
# Edit .env with your database credentials

# Initialize database
node restore.js

# Start development server
pnpm run dev

# Start production server
pnpm start
```

Server runs on `http://localhost:3000` by default.

---

## Project Structure

```
src/
├── controllers/          # Route handlers and business logic
│   ├── admin/           # Admin management routes
│   ├── catalog/         # Vehicle catalog routes
│   ├── forms/           # Contact, review, request forms
│   └── routes.js        # Route registration
├── models/              # Database queries (data layer)
│   ├── admin/
│   ├── catalog/
│   ├── forms/
│   └── sql/             # SQL seed and schema files
├── middleware/          # Authentication, logging, etc.
├── views/               # EJS templates
└── utils/               # Helper functions

public/
├── css/                 # Stylesheet files
└── images/              # Static images

package.json             # Dependencies and scripts
server.js                # Express server entry point
```

---

## Contributing & Future Improvements

Potential areas for enhancement:
1. Implement advanced search and filtering
2. Add image upload functionality with secure storage
3. Implement email notifications
4. Add payment integration (Stripe, PayPal)
5. Build REST API for mobile app
6. Improve accessibility and responsive design
7. Add comprehensive error tracking (Sentry)
8. Implement database query optimization and caching

