# Deployment Guide - Tasks App

This guide covers deploying the Tasks App to various cloud platforms.

## Table of Contents

1. [Prerequisites](#prerequisites)
2. [Environment Setup](#environment-setup)
3. [Deployment Options](#deployment-options)
   - [Vercel Deployment](#vercel-deployment)
   - [Railway Deployment](#railway-deployment)
   - [Heroku Deployment](#heroku-deployment)
4. [Email Configuration](#email-configuration)
5. [Post-Deployment](#post-deployment)

## Prerequisites

- Git repository (GitHub, GitLab, etc.)
- Node.js project ready for deployment
- Email service account (Gmail, SendGrid, etc.)

## Environment Setup

### Required Environment Variables

Create a `.env` file in the `backend` directory with these variables:

```bash
# Backend
JWT_SECRET=your-super-secret-jwt-key-change-this
PORT=3001
NODE_ENV=production

# Email Configuration
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587
EMAIL_USER=your-email@gmail.com
EMAIL_PASSWORD=your-app-specific-password
EMAIL_FROM=Tasks App <noreply@tasksapp.com>

# Frontend URL (Update after deployment)
FRONTEND_URL=https://your-frontend-url.vercel.app

# Database
DATABASE_PATH=./tasks.db
```

## Deployment Options

### Vercel Deployment

Vercel is great for full-stack applications with serverless functions.

#### Step 1: Install Vercel CLI

```bash
npm install -g vercel
```

#### Step 2: Login to Vercel

```bash
vercel login
```

#### Step 3: Configure `vercel.json`

The `vercel.json` file is already configured in the root directory.

#### Step 4: Deploy

```bash
# From project root
vercel

# For production deployment
vercel --prod
```

#### Step 5: Set Environment Variables

```bash
vercel env add JWT_SECRET
vercel env add EMAIL_USER
vercel env add EMAIL_PASSWORD
vercel env add FRONTEND_URL
```

Or set them via Vercel Dashboard:

1. Go to your project on vercel.com
2. Settings → Environment Variables
3. Add all variables from `.env.example`

### Railway Deployment

Railway provides easy deployment with PostgreSQL/MySQL databases.

#### Step 1: Install Railway CLI

```bash
npm install -g @railway/cli
```

#### Step 2: Login

```bash
railway login
```

#### Step 3: Initialize Project

```bash
railway init
```

#### Step 4: Add Environment Variables

```bash
railway variables set JWT_SECRET="your-secret"
railway variables set EMAIL_USER="your-email@gmail.com"
railway variables set EMAIL_PASSWORD="your-password"
railway variables set FRONTEND_URL="https://your-app.railway.app"
```

#### Step 5: Deploy

```bash
railway up
```

The `railway.json` configuration is already set up.

### Heroku Deployment

#### Step 1: Install Heroku CLI

Download from: https://devcenter.heroku.com/articles/heroku-cli

#### Step 2: Login

```bash
heroku login
```

#### Step 3: Create App

```bash
heroku create your-tasks-app
```

#### Step 4: Set Environment Variables

```bash
heroku config:set JWT_SECRET="your-secret"
heroku config:set EMAIL_USER="your-email@gmail.com"
heroku config:set EMAIL_PASSWORD="your-password"
heroku config:set NODE_ENV="production"
```

#### Step 5: Create `Procfile`

```
web: cd backend && node server.js
```

#### Step 6: Deploy

```bash
git push heroku main
```

## Email Configuration

### Gmail Setup (Recommended for Testing)

1. **Enable 2-Factor Authentication**

   - Go to Google Account → Security
   - Enable 2-Step Verification

2. **Generate App Password**

   - Go to Security → 2-Step Verification
   - Scroll to "App passwords"
   - Select "Mail" and "Other (Custom name)"
   - Name it "Tasks App"
   - Copy the 16-character password

3. **Update Environment Variables**
   ```bash
   EMAIL_HOST=smtp.gmail.com
   EMAIL_PORT=587
   EMAIL_USER=your-email@gmail.com
   EMAIL_PASSWORD=abcd-efgh-ijkl-mnop  # The app password
   ```

### SendGrid (Production Recommended)

1. **Create SendGrid Account**

   - Sign up at: https://sendgrid.com

2. **Create API Key**

   - Settings → API Keys → Create API Key
   - Full Access permissions
   - Copy the API key

3. **Update Environment Variables**
   ```bash
   EMAIL_HOST=smtp.sendgrid.net
   EMAIL_PORT=587
   EMAIL_USER=apikey
   EMAIL_PASSWORD=your-sendgrid-api-key
   EMAIL_FROM=noreply@your-domain.com
   ```

### Other Email Services

- **AWS SES**: `email-smtp.us-east-1.amazonaws.com` (port 587)
- **Mailgun**: `smtp.mailgun.org` (port 587)
- **Postmark**: `smtp.postmarkapp.com` (port 587)

## Post-Deployment

### 1. Update Frontend URL

After deploying frontend, update the backend environment variable:

```bash
# Vercel
vercel env add FRONTEND_URL production

# Railway
railway variables set FRONTEND_URL="https://your-app-url.com"

# Heroku
heroku config:set FRONTEND_URL="https://your-app-url.herokuapp.com"
```

### 2. Update Backend API URL

Update `frontend/src/App.js`, `VerifyEmail.js`, `ForgotPassword.js`, `ResetPassword.js`:

```javascript
const API_BASE = process.env.REACT_APP_API_BASE || "http://localhost:3001/api";
```

Add to frontend `.env`:

```
REACT_APP_API_BASE=https://your-backend-url.com/api
```

### 3. Test Email Functionality

1. Sign up with a real email address
2. Check email for verification link
3. Click verification link
4. Test password reset flow

### 4. Update CORS Settings

In `backend/server.js`, update CORS configuration:

```javascript
app.use(
  cors({
    origin: process.env.FRONTEND_URL || "http://localhost:3000",
    credentials: true,
  })
);
```

### 5. Database Considerations

**SQLite (Current Setup)**

- Good for small applications
- Database file persists in deployment
- Consider backing up regularly

**For Production (Recommended)**

- Migrate to PostgreSQL or MySQL
- Use Railway's PostgreSQL addon
- Or use Heroku Postgres
- Or use PlanetScale (MySQL)

## Troubleshooting

### Email Not Sending

1. Check environment variables are set correctly
2. Verify email credentials
3. Check spam folder
4. Review server logs for errors
5. Test SMTP connection

### CORS Errors

1. Ensure `FRONTEND_URL` matches exactly (including https://)
2. No trailing slashes
3. Update CORS configuration
4. Restart backend server

### Database Issues

1. Ensure `DATABASE_PATH` is writable
2. For serverless: Consider using cloud database
3. Check file permissions

### Token Expiration

1. Verify `JWT_SECRET` is set
2. Check token expiration time (default 24h)
3. Clear localStorage and login again

## Security Checklist

- [ ] Change `JWT_SECRET` to a strong random string
- [ ] Use environment variables for all secrets
- [ ] Enable HTTPS in production
- [ ] Set appropriate CORS origins
- [ ] Use app-specific passwords (not main email password)
- [ ] Regularly backup database
- [ ] Monitor error logs
- [ ] Set up rate limiting (future enhancement)
- [ ] Validate all user inputs

## Monitoring & Maintenance

### Logs

**Vercel**: View logs in dashboard or `vercel logs`
**Railway**: `railway logs`
**Heroku**: `heroku logs --tail`

### Database Backup

```bash
# Backup SQLite database
cp tasks.db tasks-backup-$(date +%Y%m%d).db

# For production, set up automated backups
```

### Updates

```bash
# Update dependencies
npm update

# Check for security vulnerabilities
npm audit

# Fix vulnerabilities
npm audit fix
```

## Cost Estimates

### Free Tier Options

- **Vercel**: Free for hobby projects
- **Railway**: $5/month credit (then $0.000463/GB-hour)
- **Heroku**: Free tier discontinued, starts at $7/month
- **Gmail SMTP**: Free (limit: 500 emails/day)
- **SendGrid**: Free tier (100 emails/day)

### Recommended Stack (Free)

- Frontend: Vercel (Free)
- Backend: Railway (Free tier)
- Database: Railway PostgreSQL (Free tier)
- Email: Gmail SMTP or SendGrid (Free tier)

**Total Monthly Cost: $0 - $5**

## Next Steps

1. Push code to GitHub
2. Connect GitHub repo to deployment platform
3. Set environment variables
4. Deploy!
5. Test all features
6. Share with users

---

**Need Help?**

- Check platform documentation
- Review error logs
- Test locally first
- Verify environment variables

**Good luck with your deployment! 🚀**
