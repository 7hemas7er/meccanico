# 🔒 Security Guide

## Production Deployment Checklist

### 🔴 CRITICAL - Before Go-Live

1. **Change Default Credentials**
   ```bash
   # Generate secure keys
   SECRET_KEY=$(openssl rand -hex 32)
   ADMIN_PASSWORD=$(openssl rand -base64 32)
   
   # Set in Fly.io
   flyctl secrets set SECRET_KEY="$SECRET_KEY"
   flyctl secrets set ADMIN_PASSWORD="$ADMIN_PASSWORD"
   ```

2. **Verify CORS Configuration**
   - Only allow your production domains
   - Remove localhost/127.0.0.1 from production

3. **Security Headers**
   - Already implemented in main.py
   - Includes CSP, HSTS, XSS protection

### 🟡 Security Features Implemented

- ✅ JWT with HTTP-only cookies
- ✅ Bcrypt password hashing
- ✅ SQLAlchemy ORM (SQL injection protection)
- ✅ Pydantic input validation
- ✅ Security headers middleware
- ✅ Restricted CORS policy
- ✅ API documentation disabled in production

### 🔧 Regular Maintenance

1. **Update Dependencies**
   ```bash
   pip list --outdated
   pip install -r requirements.txt --upgrade
   ```

2. **Monitor Logs**
   ```bash
   flyctl logs
   ```

3. **Backup Database**
   - Use `/backup` admin interface
   - Regular automated backups

### ⚠️ Known Limitations

- API docs exposed in development
- CORS allows localhost in development
- Error messages may expose stack traces in development

### 🚨 Incident Response

1. **Suspected Breach**
   - Revoke all JWT tokens (change SECRET_KEY)
   - Force password reset for all users
   - Check access logs

2. **Vulnerability Disclosure**
   - Report to system administrator
   - Document incident
   - Apply patches immediately

## Environment-Specific Settings

### Production
- `docs_url=None` (API docs disabled)
- HTTPS enforced via HSTS
- Strict CORS policy
- Strong credentials required

### Development
- API docs available at `/docs`
- Localhost CORS allowed
- Default credentials acceptable
- Debug mode for errors

---
**Last Updated**: $(date)
**Security Review**: Required before production deployment