# Deployment Guide

## Default Credentials for Demo/Shared Deployments

When the database is initialized (via `node init.js` on deployment), three default accounts are automatically created:

### Admin Account
- **Email**: `admin@example.com`
- **Password**: `P@$$w0rd!`
- **Role**: Administrator (full system access)

### Employee Account
- **Email**: `employee@example.com`
- **Password**: `P@$$w0rd!`
- **Role**: Employee (moderate access)

### User Account
- **Email**: `user@example.com`
- **Password**: `P@$$w0rd!`
- **Role**: User (basic access)

These accounts are seeded automatically from `src/models/sql/seed.sql` and will be recreated if the database is reset.

## Important Security Notes

1. **Change Default Passwords Immediately**
   - After your first deployment, log in to each account and change the password
   - Use the registration form or account settings to update credentials
   - Default passwords should ONLY be used for initial setup/demo purposes

2. **Shared Deployment Links (e.g., Render)**
   - If you share a Render deployment link, include instructions for users to reset credentials
   - Never leave default passwords in production long-term
   - Monitor user accounts for suspicious activity

3. **Database Reset Behavior**
   - Running `node init.js` on a fresh database creates these accounts and other seed data
   - Running `node reset.js --confirm` will **only delete user and role data** by default (clears non-core roles)
   - **All other data is preserved**: users, vehicles, categories, reviews, service requests, contact form submissions
   - This means:
     - Admin-managed inventory (vehicles, categories) survives resets
     - Customer data (reviews, service requests, contact forms) survives resets
     - Manually registered user accounts survive resets
     - Only the 3 core roles (user, employee, admin) are guaranteed; extra roles are cleared

## Development Setup

```bash
# Install dependencies
pnpm install

# Initialize database (creates default accounts if database is empty)
node --env-file=.env init.js

# Start development server
pnpm run dev
```

## Render Deployment

1. Set `DB_URL` environment variable to your PostgreSQL connection string
2. Add build/start command: `node --env-file=.env init.js && npm start`
3. Access the application and log in with default credentials
4. Update passwords immediately after first access
