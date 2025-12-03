# Tasks App - 4-Hour Intern Assignment

A simple tasks management application with user authentication, CRUD operations, and per-user caching.

## A. How to Run

### Prerequisites

- Node.js (v14 or higher)
- npm or yarn

### Backend Setup

1. Navigate to the backend directory:

```bash
cd backend
```

2. Install dependencies:

```bash
npm install
```

3. Start the backend server:

```bash
npm start
```

The backend will run on `http://localhost:3001`

### Frontend Setup

1. Open a new terminal and navigate to the frontend directory:

```bash
cd frontend
```

2. Install dependencies:

```bash
npm install
```

3. Start the React development server:

```bash
npm start
```

The frontend will open automatically at `http://localhost:3000`

### First Time Use

1. Open `http://localhost:3000` in your browser
2. Click "Sign Up" to create a new account
3. Enter email and password
4. Start creating tasks!

## B. What is Done / Not Done

### ✅ Completed Features

1. **Authentication**

   - Email/password signup and login
   - JWT token-based authentication (24-hour expiration)
   - Secure password hashing with bcrypt (10 salt rounds)
   - Token stored in localStorage
   - Protected routes requiring authentication
   - User profile with customizable name

2. **Tasks CRUD**

   - Create new tasks with title, description, category, and due date
   - View list of user's own tasks (user isolation implemented)
   - Update task status (TODO → IN_PROGRESS → DONE)
   - Edit task details (title, description, category, due date)
   - Delete tasks
   - Tasks sorted by creation date (newest first)
   - Overdue task detection and indicators

3. **Search & Filter**

   - Search tasks by title and description
   - Filter by status (TODO/IN_PROGRESS/DONE)
   - Filter by category
   - Combine multiple filters
   - Clear filters functionality
   - Real-time search results

4. **Task Categories**

   - Create custom categories for tasks
   - Dynamic category list
   - Category-based filtering
   - Color-coded category badges

5. **Summary Display**

   - Real-time counts for TODO, IN_PROGRESS, and DONE statuses
   - Total tasks count
   - Visual summary cards with gradient backgrounds
   - Updates automatically when tasks change

6. **User Profile**

   - Profile page with user statistics
   - Colored avatar with user initials
   - Task completion stats (total, completed, pending, in progress)
   - Editable user name
   - Account creation date

7. **Backend Logging**

   - All API requests logged to database (api_logs table)
   - Logs include: HTTP method, URL path, timestamp, user ID
   - Console logging with timestamps
   - Cache hit/miss logging for debugging

8. **30-Second Per-User Caching**

   - Implemented using JavaScript Map
   - Separate cache for each user with filter parameters
   - Cache invalidated on create/update/delete
   - Cache status returned in API response
   - Console logs show cache hits/misses

9. **Database**

   - SQLite database with 3 tables (users, tasks, api_logs)
   - Extended schema with name, avatar_color, description, category, due_date fields
   - Foreign key constraints
   - User isolation through user_id
   - Status validation at DB level
   - Timestamps for created_at and updated_at

10. **Modern UI/Frontend**

    - Modern gradient-based design (Purple #667eea → Pink #764ba2)
    - Card-based layouts with hover animations
    - Responsive design for mobile, tablet, and desktop
    - Navigation bar with view switching (Tasks/Profile/Logout)
    - Enhanced task cards with status indicators
    - Modern form styling with focus states
    - Color-coded status borders (green/yellow/blue)
    - Empty states for better UX
    - Smooth transitions and shadows
    - Mobile-friendly breakpoints (768px, 480px)

11. **Email Verification**

    - Email verification on signup
    - Verification links sent via email
    - Token-based verification (24-hour expiration)
    - Resend verification email option
    - Email verified status tracking

12. **Password Reset**

    - Forgot password functionality
    - Password reset links via email
    - Secure reset tokens (1-hour expiration)
    - Set new password interface
    - Token validation

13. **Deployment Ready**
    - Environment variables configuration
    - Vercel deployment setup
    - Railway deployment setup
    - Email service integration (Gmail/SendGrid)
    - Production-ready configurations

### ❌ Not Yet Deployed

- Live deployment to cloud platform (configured, pending actual deployment)

## C. Architecture in My Own Words

### How Login Works

Users sign up with email and password. The password is hashed using bcrypt (10 salt rounds) before storing in the SQLite database. On login, we verify the password by comparing the hash. If valid, we generate a JWT token containing the user's ID and email, signed with a secret key and valid for 24 hours. This token is sent to the frontend, stored in localStorage, and included in all subsequent API requests via the Authorization header. The backend middleware verifies this token on protected routes and attaches the user object to the request.

### How Tasks Are Stored/Fetched

Tasks are stored in a SQLite database table with columns: id, user_id (foreign key to users table), title, description, status, category, due_date, created_at, and updated_at timestamps. Each task is linked to a specific user through user_id. When fetching tasks, the API uses `WHERE user_id = ?` along with optional filters for status, category, and search terms to ensure users only see their own tasks. The authenticateToken middleware extracts the user ID from the JWT token, preventing any user from accessing another user's tasks. Tasks are returned ordered by created_at DESC (newest first). The enhanced GET /api/tasks endpoint supports query parameters for filtering, making it highly flexible for search and filter operations.

### Where Caching Logic Is Implemented

The caching is implemented in the backend server using a JavaScript Map called `tasksCache`. The cache key includes the user ID along with filter parameters (status, category, search query) to ensure cached results match the current filter state. When a user requests their tasks (GET /api/tasks), the server first checks if the cache has unexpired data (less than 30 seconds old) for that specific filter combination. If yes, it returns cached data immediately. If no or expired, it queries the database with the appropriate WHERE clauses, updates the cache, and returns fresh data. The cache is invalidated (deleted for that user) whenever they create, update, or delete a task, ensuring data consistency. Each cache operation logs to the console for monitoring.

## D. Short Reflections

### Caching

I implemented the 30-second cache using a JavaScript Map in the backend server (server.js, line ~140). The Map stores data per user ID combined with filter parameters (status, category, search) as the cache key, with a timestamp. On each GET /api/tasks request, I check if cached data exists for that exact filter combination and is less than 30 seconds old. If valid, I return cached data and log "CACHE HIT". Otherwise, I fetch from database with appropriate WHERE clauses for filtering, update cache, and log "CACHE MISS". The cache is cleared for a user whenever they create, update, or delete a task to maintain consistency. This approach efficiently handles both filtered and unfiltered requests while maintaining data freshness.

### Security

Each user only accesses their tasks through two layers of security: (1) JWT authentication middleware verifies the user's identity on every protected route, extracting user ID from the token; (2) All database queries use `WHERE user_id = ?` with the authenticated user's ID. Even if someone tries to access task ID of another user, the query will fail because it checks both task ID AND user_id. The JWT token is verified server-side on each request, and passwords are hashed with bcrypt, never stored in plain text. The token secret should be moved to environment variables in production.

### Bug You Faced

The biggest bug I faced was CORS errors when the frontend tried to call the backend API. The browser was blocking requests from localhost:3000 to localhost:3001. I debugged by checking the browser console, which showed the CORS error clearly. I fixed it by installing and configuring the 'cors' middleware in Express: `app.use(cors())`. This allows cross-origin requests from the React frontend. I also discovered that initially my frontend was trying to hit relative URLs (/api/tasks) which wouldn't work, so I added the full API_BASE URL (http://localhost:3001/api) to all fetch calls.

### If I Had 1 More Hour

I would implement the remaining features: deployment configuration for Vercel/Railway with environment variables, email verification using SendGrid or Nodemailer with verification tokens, and password reset functionality with time-limited reset tokens sent via email. I'd also add comprehensive error handling with user-friendly messages throughout the application, implement loading states for all async operations, add input validation (email format, password strength), and write unit tests for critical functions like caching and authentication. Additionally, I'd improve the caching by adding automatic cleanup of expired entries, implement pagination for large task lists, and add task attachments or comments for better collaboration features.

## Technologies Used

### Backend

- **Node.js** with Express.js
- **better-sqlite3** for database
- **bcryptjs** for password hashing
- **jsonwebtoken** for JWT authentication
- **cors** for cross-origin requests
- **dotenv** for environment variables
- **nodemailer** for email sending
- **crypto** (built-in) for token generation

### Frontend

- **React** (Create React App)
- **React Router DOM** for routing
- **CSS** for styling (no external UI libraries)

### Database Schema

**users table:**

- id (INTEGER PRIMARY KEY)
- email (TEXT UNIQUE)
- password (TEXT, hashed)
- name (TEXT)
- avatar_color (TEXT)
- email_verified (INTEGER, 0 or 1)
- verification_token (TEXT)
- verification_token_expires (DATETIME)
- reset_token (TEXT)
- reset_token_expires (DATETIME)
- created_at (DATETIME)

**tasks table:**

- id (INTEGER PRIMARY KEY)
- user_id (INTEGER, FOREIGN KEY)
- title (TEXT)
- description (TEXT)
- status (TEXT: TODO/IN_PROGRESS/DONE)
- category (TEXT)
- due_date (TEXT)
- created_at (DATETIME)
- updated_at (DATETIME)

**api_logs table:**

- id (INTEGER PRIMARY KEY)
- method (TEXT)
- path (TEXT)
- timestamp (DATETIME)
- user_id (INTEGER)

## API Endpoints

### Authentication

- `POST /api/auth/signup` - Create new user (sends verification email)
- `POST /api/auth/login` - Login user
- `GET /api/auth/verify-email?token=<token>` - Verify email address
- `POST /api/auth/forgot-password` - Request password reset (sends reset email)
- `POST /api/auth/reset-password` - Reset password with token
- `POST /api/auth/resend-verification` - Resend verification email (protected)

### Tasks (Protected)

- `GET /api/tasks` - Get user's tasks with optional filters (status, category, search) and caching
- `POST /api/tasks` - Create new task with title, description, category, due_date
- `PATCH /api/tasks/:id` - Update task (status, title, description, category, due_date)
- `DELETE /api/tasks/:id` - Delete task
- `GET /api/tasks/summary` - Get status counts
- `GET /api/tasks/categories` - Get list of unique categories for user

### User Profile (Protected)

- `GET /api/user/profile` - Get user profile with task statistics
- `PATCH /api/user/profile` - Update user profile (name)

## Project Structure

```
assignment/
├── backend/
│   ├── server.js           # Main Express server with all logic
│   ├── package.json        # Backend dependencies
│   ├── .env               # Environment variables (create from .env.example)
│   └── tasks.db           # SQLite database (auto-created)
│
├── frontend/
│   ├── public/
│   │   └── index.html     # HTML template
│   ├── src/
│   │   ├── App.js         # Main React component
│   │   ├── App.css        # Main styles
│   │   ├── VerifyEmail.js # Email verification page
│   │   ├── VerifyEmail.css
│   │   ├── ForgotPassword.js # Forgot password page
│   │   ├── ForgotPassword.css
│   │   ├── ResetPassword.js  # Reset password page
│   │   ├── ResetPassword.css
│   │   ├── index.js       # React entry point with routing
│   │   └── index.css      # Global styles
│   └── package.json       # Frontend dependencies
│
├── .env.example           # Example environment variables
├── .gitignore            # Git ignore file
├── vercel.json           # Vercel deployment config
├── railway.json          # Railway deployment config
├── README.md             # This file
├── FEATURES.md           # Detailed features documentation
└── DEPLOYMENT.md         # Deployment guide
```

## Time Breakdown (Approximate)

### Initial Implementation (4 hours)

- Initial setup and planning: 20 minutes
- Backend implementation (auth, CRUD, logging): 1.5 hours
- Database schema and queries: 30 minutes
- Caching implementation: 30 minutes
- Frontend UI and components: 1 hour
- Integration and testing: 30 minutes
- README documentation: 30 minutes

### Enhancement Phase (Additional Features)

- Extended database schema (categories, due dates, descriptions, profile): 30 minutes
- Backend enhancements (filters, search, profile endpoints): 1 hour
- Complete frontend rebuild with modern UI: 2 hours
- CSS redesign with gradient system: 1 hour
- Testing and refinement: 30 minutes
- Documentation updates: 30 minutes

### Email & Deployment Phase (Final Features)

- Email verification system (backend + frontend): 1 hour
- Password reset functionality (backend + frontend): 1 hour
- Deployment configuration (Vercel, Railway, environment setup): 45 minutes
- Email service integration and testing: 30 minutes
- Comprehensive deployment guide: 30 minutes
- Final documentation and README updates: 15 minutes

**Total: ~14 hours** (4 hours original + ~6 hours enhancements + ~4 hours final features)

## Notes

- The JWT secret should be changed in production (use .env file)
- SQLite is used for simplicity. For production, consider PostgreSQL or MySQL.
- The cache is in-memory and will be lost on server restart. For production, use Redis.
- Email functionality requires valid SMTP credentials (see DEPLOYMENT.md)
- Frontend validation is minimal - relies on backend validation.
- See DEPLOYMENT.md for complete deployment instructions
- See FEATURES.md for detailed feature documentation

## Quick Start

1. **Clone and install**:

   ```bash
   cd backend && npm install
   cd ../frontend && npm install
   ```

2. **Configure email** (optional but recommended):

   - Copy `backend/.env.example` to `backend/.env`
   - Add your email credentials (see DEPLOYMENT.md for Gmail setup)

3. **Start servers**:

   ```bash
   # Terminal 1 - Backend
   cd backend && npm start

   # Terminal 2 - Frontend
   cd frontend && npm start
   ```

4. **Open browser**: http://localhost:3000

5. **Test features**:
   - Sign up with a real email to test verification
   - Try the forgot password flow
   - Create tasks with categories and due dates
   - Use search and filters

## Email Configuration (Optional)

For email verification and password reset to work:

1. **Gmail Setup** (recommended for testing):

   - Enable 2-factor authentication on your Google account
   - Generate an app password (Google Account → Security → App passwords)
   - Add to `backend/.env`:
     ```
     EMAIL_USER=your-email@gmail.com
     EMAIL_PASSWORD=your-16-char-app-password
     ```

2. **Without Email**:
   - App works without email configuration
   - Email features will log to console instead
   - Users can still login and use all task features

See **DEPLOYMENT.md** for detailed email service setup instructions.

---

**Assignment completed by:** Ohm Tanna  
**Date:** December 3, 2025
