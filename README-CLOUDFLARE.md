# Vehicle Maintenance App - Cloudflare Pages + D1 Deployment

## Architecture Overview

```
┌─────────────────┐    ┌──────────────────┐    ┌─────────────────┐
│ Cloudflare Pages│    │ Cloudflare       │    │ Cloudflare D1   │
│   (Frontend)    ├───►│   Functions      ├───►│   (Database)    │
│                 │    │   (Backend API)  │    │                 │
└─────────────────┘    └──────────────────┘    └─────────────────┘
     Static Files          API Endpoints          SQLite Storage
```

## Quick Start

### 1. Automated Setup
```bash
# Run the automated setup script
./setup-cloudflare.sh setup

# Start local development
./setup-cloudflare.sh dev

# Deploy to production
./setup-cloudflare.sh deploy
```

### 2. Manual Setup

#### Prerequisites
- Node.js installed
- Cloudflare account
- Domain (optional, but recommended)

#### Installation Steps

```bash
# 1. Install project dependencies (includes Wrangler)
npm install

# 2. Login to Cloudflare
npx wrangler login

# 3. Initialize D1 database
npx wrangler d1 execute vehicle-maintenance-db --file=schema.sql

# 4. Start local development
npm run dev

# 5. Deploy to production
npm run deploy
```

## Configuration

### Database Configuration
Your D1 database ID: `520f86ac-c0df-48b3-9b25-c98351f52090`

### Environment Variables
Set these in your Cloudflare Pages dashboard:

| Variable | Description | Default |
|----------|-------------|---------|
| `JWT_SECRET` | Secret key for JWT tokens | `your-super-secret-jwt-key-change-this` |
| `ADMIN_USERNAME` | Default admin username | `admin` |
| `ADMIN_PASSWORD` | Default admin password | `password123` |
| `HOST_URL` | Base URL for QR codes | `https://your-app.pages.dev` |

### File Structure
```
project/
├── public/                 # Static files for Cloudflare Pages
│   ├── index.html         # Landing page
│   ├── login.html         # Login page
│   ├── admin.html         # Admin dashboard
│   ├── vehicle.html       # Vehicle management
│   ├── maintenance.html   # Maintenance records
│   ├── users.html         # User management
│   ├── settings.html      # Settings page
│   ├── backup.html        # Backup/restore
│   └── assets/
│       ├── css/
│       │   └── style.css
│       └── js/
│           ├── config.js   # API configuration
│           ├── admin.js    # Admin functionality
│           ├── script.js   # Main app logic
│           ├── vehicle.js  # Vehicle management
│           ├── users.js    # User management
│           ├── theme.js    # Theme switching
│           └── maintenance.js
├── functions/             # Cloudflare Functions (API)
│   └── api/
│       └── [[...route]].js # API routes handler
├── schema.sql            # Database schema
├── wrangler.toml         # Cloudflare configuration
└── package.json          # Node.js dependencies
```

## Development

### Local Development
```bash
# Start local development server
npm run dev
# or
npx wrangler pages dev public --d1=DB

# Access at: http://localhost:8788
```

### Database Management
```bash
# View database schema
npm run db:shell

# Execute SQL queries
npx wrangler d1 execute vehicle-maintenance-db --command="SELECT * FROM users"

# Apply schema changes
npm run db:migrate

# Production database
npm run db:migrate:prod
```

### API Endpoints

All API endpoints are available at `/api/`:

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/token` | User login |
| `POST` | `/api/logout` | User logout |
| `GET` | `/api/user` | Get current user info |
| `GET` | `/api/vehicles/` | List all vehicles |
| `POST` | `/api/vehicle` | Create new vehicle |
| `GET` | `/api/maintenance-types` | Get maintenance types |
| `POST` | `/api/vehicle/{id}/activity` | Add maintenance record |
| `PUT` | `/api/vehicle/{id}/activity/{aid}` | Update maintenance record |
| `DELETE` | `/api/vehicle/{id}/activity/{aid}` | Delete maintenance record |

### Authentication Flow
1. User submits login form → `POST /api/token`
2. Server validates credentials and sets HTTP-only cookie
3. Subsequent requests include cookie automatically
4. Server validates JWT token from cookie
5. API responses include user data or 401 Unauthorized

## Deployment

### Production Deployment
```bash
# Deploy to Cloudflare Pages
npm run deploy
# or
npx wrangler pages deploy public --project-name=vehicle-maintenance-app
```

### Custom Domain Setup
1. Go to Cloudflare Dashboard → Pages → Your Project
2. Click "Custom domains" tab
3. Add your domain
4. Update DNS records as instructed
5. Update `HOST_URL` environment variable

### Environment Configuration
Set environment variables in Cloudflare Dashboard:
1. Go to Pages → Your Project → Settings → Environment variables
2. Add production variables:
   - `JWT_SECRET`: Strong random string
   - `ADMIN_PASSWORD`: Secure password
   - `HOST_URL`: Your custom domain

## Features

### ✅ Implemented Features
- User authentication (JWT with HTTP-only cookies)
- Vehicle management (CRUD operations)
- Maintenance record tracking
- QR code generation for vehicles
- Admin dashboard
- User management
- Responsive design
- Dark/light theme toggle

### 🚧 API Limitations (Current Implementation)
Some endpoints from the original FastAPI app are not yet implemented in the Cloudflare Functions version:
- File upload/download
- Database backup/restore via UI
- Complete user management (create/delete users)
- QR settings management

### 📋 To-Do
- [ ] Implement remaining API endpoints
- [ ] Add file upload support using Cloudflare R2
- [ ] Implement database backup/restore with R2
- [ ] Add comprehensive error handling
- [ ] Implement rate limiting
- [ ] Add request logging
- [ ] Performance optimization

## Troubleshooting

### Common Issues

#### 1. Database Not Accessible
```bash
# Check database binding
npx wrangler d1 list

# Test database connection
npx wrangler d1 execute vehicle-maintenance-db --command="SELECT COUNT(*) FROM users"
```

#### 2. Authentication Not Working
- Check JWT_SECRET is set in environment variables
- Verify cookies are being set (check browser dev tools)
- Ensure HTTPS is enabled for production

#### 3. API Endpoints Not Found
- Verify function file is at `functions/api/[[...route]].js`
- Check Cloudflare Pages build logs
- Ensure wrangler.toml is properly configured

#### 4. Local Development Issues
```bash
# Clear Wrangler cache
rm -rf ~/.wrangler

# Restart development server
npx wrangler pages dev public --d1=DB --port 8788
```

### Performance Tips
1. **Static Assets**: Leverage Cloudflare CDN caching
2. **API Responses**: Minimize data transfer
3. **Database Queries**: Use indexes for better performance
4. **Edge Computing**: API runs at edge locations for low latency

### Security Considerations
1. **JWT Secret**: Use strong, unique secret in production
2. **HTTPS**: Always use HTTPS in production
3. **Cookie Security**: HTTP-only, Secure flags enabled
4. **CORS**: Properly configured for your domain
5. **Rate Limiting**: Consider implementing rate limiting for API endpoints

## Monitoring

### Cloudflare Analytics
- Go to Cloudflare Dashboard → Analytics & Logs
- Monitor page views, bandwidth usage
- Track API response times

### D1 Analytics
- Monitor database usage in Cloudflare Dashboard
- Check read/write operations
- Monitor storage usage

## Support

### Useful Resources
- [Cloudflare Pages Documentation](https://developers.cloudflare.com/pages/)
- [Cloudflare D1 Documentation](https://developers.cloudflare.com/d1/)
- [Wrangler CLI Documentation](https://developers.cloudflare.com/workers/wrangler/)

### Getting Help
1. Check Cloudflare Dashboard logs
2. Use `npx wrangler tail` for real-time logs
3. Check browser console for frontend errors
4. Verify network requests in browser dev tools

## Cost Estimation

### Cloudflare Pages (Free Tier)
- 500 builds per month
- Unlimited static requests
- 100,000 Functions requests/month
- Custom domain included

### Cloudflare D1 (Free Tier)
- 5 GB storage
- 25 million row reads/month
- 50,000 row writes/month

### Estimated Monthly Cost: $0 (within free tiers)

Perfect for small to medium usage. Upgrade to paid plans as needed for higher traffic.