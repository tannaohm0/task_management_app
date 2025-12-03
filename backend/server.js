require('dotenv').config();
const express = require('express');
const cors = require('cors');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const Database = require('better-sqlite3');
const nodemailer = require('nodemailer');
const crypto = require('crypto');

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';
const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:3000';

// Email transporter configuration
const emailTransporter = nodemailer.createTransport({
  host: process.env.EMAIL_HOST || 'smtp.gmail.com',
  port: process.env.EMAIL_PORT || 587,
  secure: false,
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASSWORD
  }
});

// Middleware
app.use(cors());
app.use(express.json());

// Initialize SQLite database
const db = new Database('tasks.db');

// Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    name TEXT,
    avatar_color TEXT DEFAULT '#667eea',
    email_verified INTEGER DEFAULT 0,
    verification_token TEXT,
    verification_token_expires DATETIME,
    reset_token TEXT,
    reset_token_expires DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS tasks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER NOT NULL,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'TODO' CHECK(status IN ('TODO', 'IN_PROGRESS', 'DONE')),
    category TEXT,
    due_date DATETIME,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users(id)
  );

  CREATE TABLE IF NOT EXISTS api_logs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    method TEXT NOT NULL,
    path TEXT NOT NULL,
    timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
    user_id INTEGER
  );
`);

// Helper function to send emails
async function sendEmail(to, subject, html) {
  if (!process.env.EMAIL_USER || !process.env.EMAIL_PASSWORD) {
    console.warn('⚠️  Email credentials not configured. Email not sent.');
    return { success: false, error: 'Email not configured' };
  }

  try {
    console.log(`📧 Attempting to send email to: ${to}`);
    console.log(`📧 Using SMTP: ${process.env.EMAIL_HOST}:${process.env.EMAIL_PORT}`);
    console.log(`📧 From: ${process.env.EMAIL_USER}`);
    
    const info = await emailTransporter.sendMail({
      from: process.env.EMAIL_FROM || process.env.EMAIL_USER,
      to,
      subject,
      html
    });
    
    console.log(`✅ Email sent successfully! Message ID: ${info.messageId}`);
    return { success: true };
  } catch (error) {
    console.error('❌ Email send error:', error.message);
    console.error('Full error:', error);
    return { success: false, error: error.message };
  }
}

// Helper function to generate random token
function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

// Cache storage: Map<userId, {data, timestamp}>
const tasksCache = new Map();
const CACHE_DURATION = 30000; // 30 seconds in milliseconds

// Logging middleware
const logRequest = (req, res, next) => {
  const userId = req.user?.id || null;
  const stmt = db.prepare('INSERT INTO api_logs (method, path, user_id) VALUES (?, ?, ?)');
  stmt.run(req.method, req.path, userId);
  console.log(`[${new Date().toISOString()}] ${req.method} ${req.path} - User: ${userId || 'anonymous'}`);
  next();
};

app.use(logRequest);

// Authentication middleware
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers['authorization'];
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ error: 'Access token required' });
  }

  jwt.verify(token, JWT_SECRET, (err, user) => {
    if (err) {
      return res.status(403).json({ error: 'Invalid or expired token' });
    }
    req.user = user;
    next();
  });
};

// Routes

// Signup
app.post('/api/auth/signup', async (req, res) => {
  try {
    const { email, password, name } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    // Generate random avatar color
    const colors = ['#667eea', '#764ba2', '#f093fb', '#4facfe', '#43e97b', '#fa709a', '#feca57', '#ee5a6f'];
    const avatarColor = colors[Math.floor(Math.random() * colors.length)];

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Generate verification token
    const verificationToken = generateToken();
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(); // 24 hours

    // Insert user
    const stmt = db.prepare(`
      INSERT INTO users (email, password, name, avatar_color, verification_token, verification_token_expires) 
      VALUES (?, ?, ?, ?, ?, ?)
    `);
    const result = stmt.run(email, hashedPassword, name || email.split('@')[0], avatarColor, verificationToken, verificationExpires);

    // Send verification email
    const verificationUrl = `${FRONTEND_URL}/verify-email?token=${verificationToken}`;
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #667eea;">Welcome to Tasks App!</h2>
        <p>Hi ${name || email.split('@')[0]},</p>
        <p>Thank you for signing up! Please verify your email address by clicking the button below:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationUrl}" 
             style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                    color: white; 
                    padding: 12px 30px; 
                    text-decoration: none; 
                    border-radius: 5px;
                    display: inline-block;">
            Verify Email Address
          </a>
        </div>
        <p>Or copy and paste this link into your browser:</p>
        <p style="color: #666; word-break: break-all;">${verificationUrl}</p>
        <p style="color: #999; font-size: 12px; margin-top: 30px;">
          This link will expire in 24 hours. If you didn't create an account, please ignore this email.
        </p>
      </div>
    `;

    console.log(`\n🔄 Sending verification email to: ${email}`);
    const emailResult = await sendEmail(email, 'Verify Your Email - Tasks App', emailHtml);
    
    if (!emailResult.success) {
      console.log(`⚠️  Warning: Email not sent - ${emailResult.error}`);
      console.log(`User can still login, but won't receive verification email.`);
    }

    // Generate token (user can login but some features may require verification)
    const token = jwt.sign({ id: result.lastInsertRowid, email }, JWT_SECRET, { expiresIn: '24h' });

    res.status(201).json({ 
      token, 
      user: { 
        id: result.lastInsertRowid, 
        email, 
        name: name || email.split('@')[0],
        avatar_color: avatarColor,
        email_verified: false
      },
      message: emailResult.success 
        ? 'Account created! Please check your email to verify your account.'
        : 'Account created! Email verification is temporarily unavailable.'
    });
  } catch (error) {
    if (error.message.includes('UNIQUE constraint failed')) {
      return res.status(400).json({ error: 'Email already exists' });
    }
    res.status(500).json({ error: 'Server error' });
  }
});

// Login
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ error: 'Email and password required' });
    }

    // Find user
    const stmt = db.prepare('SELECT * FROM users WHERE email = ?');
    const user = stmt.get(email);

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Verify password
    const isValid = await bcrypt.compare(password, user.password);
    if (!isValid) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    // Check if email is verified (optional - just log warning)
    if (user.email_verified === 0) {
      console.log(`⚠️  User ${email} logged in without email verification`);
    }

    // Generate token
    const token = jwt.sign({ id: user.id, email: user.email }, JWT_SECRET, { expiresIn: '24h' });

    res.json({ 
      token, 
      user: { 
        id: user.id, 
        email: user.email, 
        name: user.name,
        avatar_color: user.avatar_color,
        email_verified: user.email_verified === 1
      },
      // Add warning message if not verified
      message: user.email_verified === 0 ? 'Please verify your email address' : undefined
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Verify email
app.get('/api/auth/verify-email', (req, res) => {
  try {
    const { token } = req.query;

    if (!token) {
      return res.status(400).json({ error: 'Verification token required' });
    }

    // Find user with this token
    const stmt = db.prepare(`
      SELECT * FROM users 
      WHERE verification_token = ? 
      AND verification_token_expires > datetime('now')
    `);
    const user = stmt.get(token);

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired verification token' });
    }

    // Update user as verified
    const updateStmt = db.prepare(`
      UPDATE users 
      SET email_verified = 1, 
          verification_token = NULL, 
          verification_token_expires = NULL 
      WHERE id = ?
    `);
    updateStmt.run(user.id);

    res.json({ message: 'Email verified successfully!' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Request password reset
app.post('/api/auth/forgot-password', async (req, res) => {
  try {
    const { email } = req.body;

    if (!email) {
      return res.status(400).json({ error: 'Email required' });
    }

    // Find user
    const stmt = db.prepare('SELECT * FROM users WHERE email = ?');
    const user = stmt.get(email);

    if (!user) {
      // Don't reveal if email exists or not for security
      return res.json({ message: 'If that email exists, a password reset link has been sent.' });
    }

    // Generate reset token
    const resetToken = generateToken();
    const resetExpires = new Date(Date.now() + 60 * 60 * 1000).toISOString(); // 1 hour

    // Save reset token
    const updateStmt = db.prepare(`
      UPDATE users 
      SET reset_token = ?, reset_token_expires = ? 
      WHERE id = ?
    `);
    updateStmt.run(resetToken, resetExpires, user.id);

    // Send reset email
    const resetUrl = `${FRONTEND_URL}/reset-password?token=${resetToken}`;
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #667eea;">Password Reset Request</h2>
        <p>Hi ${user.name},</p>
        <p>You requested to reset your password. Click the button below to set a new password:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${resetUrl}" 
             style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                    color: white; 
                    padding: 12px 30px; 
                    text-decoration: none; 
                    border-radius: 5px;
                    display: inline-block;">
            Reset Password
          </a>
        </div>
        <p>Or copy and paste this link into your browser:</p>
        <p style="color: #666; word-break: break-all;">${resetUrl}</p>
        <p style="color: #999; font-size: 12px; margin-top: 30px;">
          This link will expire in 1 hour. If you didn't request a password reset, please ignore this email.
        </p>
      </div>
    `;

    await sendEmail(email, 'Password Reset - Tasks App', emailHtml);

    res.json({ message: 'If that email exists, a password reset link has been sent.' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Reset password
app.post('/api/auth/reset-password', async (req, res) => {
  try {
    const { token, newPassword } = req.body;

    if (!token || !newPassword) {
      return res.status(400).json({ error: 'Token and new password required' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters' });
    }

    // Find user with this token
    const stmt = db.prepare(`
      SELECT * FROM users 
      WHERE reset_token = ? 
      AND reset_token_expires > datetime('now')
    `);
    const user = stmt.get(token);

    if (!user) {
      return res.status(400).json({ error: 'Invalid or expired reset token' });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password and clear reset token
    const updateStmt = db.prepare(`
      UPDATE users 
      SET password = ?, 
          reset_token = NULL, 
          reset_token_expires = NULL 
      WHERE id = ?
    `);
    updateStmt.run(hashedPassword, user.id);

    res.json({ message: 'Password reset successfully! You can now login with your new password.' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Resend verification email
app.post('/api/auth/resend-verification', authenticateToken, async (req, res) => {
  try {
    const userId = req.user.id;

    // Get user
    const stmt = db.prepare('SELECT * FROM users WHERE id = ?');
    const user = stmt.get(userId);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    if (user.email_verified === 1) {
      return res.status(400).json({ error: 'Email already verified' });
    }

    // Generate new verification token
    const verificationToken = generateToken();
    const verificationExpires = new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString();

    // Update token
    const updateStmt = db.prepare(`
      UPDATE users 
      SET verification_token = ?, verification_token_expires = ? 
      WHERE id = ?
    `);
    updateStmt.run(verificationToken, verificationExpires, userId);

    // Send verification email
    const verificationUrl = `${FRONTEND_URL}/verify-email?token=${verificationToken}`;
    const emailHtml = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
        <h2 style="color: #667eea;">Verify Your Email</h2>
        <p>Hi ${user.name},</p>
        <p>Please verify your email address by clicking the button below:</p>
        <div style="text-align: center; margin: 30px 0;">
          <a href="${verificationUrl}" 
             style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); 
                    color: white; 
                    padding: 12px 30px; 
                    text-decoration: none; 
                    border-radius: 5px;
                    display: inline-block;">
            Verify Email Address
          </a>
        </div>
        <p>Or copy and paste this link into your browser:</p>
        <p style="color: #666; word-break: break-all;">${verificationUrl}</p>
        <p style="color: #999; font-size: 12px; margin-top: 30px;">
          This link will expire in 24 hours.
        </p>
      </div>
    `;

    await sendEmail(user.email, 'Verify Your Email - Tasks App', emailHtml);

    res.json({ message: 'Verification email sent! Please check your inbox.' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Create task
app.post('/api/tasks', authenticateToken, (req, res) => {
  try {
    const { title, description, category, due_date } = req.body;

    if (!title) {
      return res.status(400).json({ error: 'Title is required' });
    }

    const stmt = db.prepare('INSERT INTO tasks (user_id, title, description, category, due_date, status) VALUES (?, ?, ?, ?, ?, ?)');
    const result = stmt.run(req.user.id, title, description || null, category || null, due_date || null, 'TODO');

    // Invalidate cache for this user
    tasksCache.delete(req.user.id);

    res.status(201).json({
      id: result.lastInsertRowid,
      title,
      description,
      category,
      due_date,
      status: 'TODO',
      user_id: req.user.id
    });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get tasks (with caching and filtering)
app.get('/api/tasks', authenticateToken, (req, res) => {
  try {
    const userId = req.user.id;
    const { status, category, search } = req.query;
    const now = Date.now();

    // Create cache key based on filters
    const cacheKey = `${userId}_${status || 'all'}_${category || 'all'}_${search || ''}`;

    // Check cache only if no filters
    if (!status && !category && !search && tasksCache.has(cacheKey)) {
      const cached = tasksCache.get(cacheKey);
      if (now - cached.timestamp < CACHE_DURATION) {
        console.log(`[CACHE HIT] Returning cached tasks for user ${userId}`);
        return res.json({ tasks: cached.data, cached: true });
      }
    }

    // Build query with filters
    let query = 'SELECT * FROM tasks WHERE user_id = ?';
    const params = [userId];

    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    if (category) {
      query += ' AND category = ?';
      params.push(category);
    }

    if (search) {
      query += ' AND (title LIKE ? OR description LIKE ?)';
      params.push(`%${search}%`, `%${search}%`);
    }

    query += ' ORDER BY created_at DESC';

    console.log(`[CACHE MISS] Fetching tasks from DB for user ${userId}`);
    const stmt = db.prepare(query);
    const tasks = stmt.all(...params);

    // Update cache only for unfiltered requests
    if (!status && !category && !search) {
      tasksCache.set(cacheKey, {
        data: tasks,
        timestamp: now
      });
    }

    res.json({ tasks, cached: false });
  } catch (error) {
    console.error('Error fetching tasks:', error);
    res.status(500).json({ error: 'Server error' });
  }
});

// Update task status
app.patch('/api/tasks/:id', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;
    const { status, title, description, category, due_date } = req.body;

    // First verify the task belongs to the user
    const checkStmt = db.prepare('SELECT * FROM tasks WHERE id = ? AND user_id = ?');
    const task = checkStmt.get(id, req.user.id);

    if (!task) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Build update query dynamically
    const updates = [];
    const values = [];

    if (status) {
      if (!['TODO', 'IN_PROGRESS', 'DONE'].includes(status)) {
        return res.status(400).json({ error: 'Invalid status' });
      }
      updates.push('status = ?');
      values.push(status);
    }

    if (title !== undefined) {
      updates.push('title = ?');
      values.push(title);
    }

    if (description !== undefined) {
      updates.push('description = ?');
      values.push(description);
    }

    if (category !== undefined) {
      updates.push('category = ?');
      values.push(category);
    }

    if (due_date !== undefined) {
      updates.push('due_date = ?');
      values.push(due_date);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No updates provided' });
    }

    updates.push('updated_at = CURRENT_TIMESTAMP');
    values.push(id, req.user.id);

    const updateStmt = db.prepare(`UPDATE tasks SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`);
    updateStmt.run(...values);

    // Invalidate cache
    tasksCache.delete(req.user.id);

    // Return updated task
    const updatedTask = checkStmt.get(id, req.user.id);
    res.json(updatedTask);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Delete task (optional)
app.delete('/api/tasks/:id', authenticateToken, (req, res) => {
  try {
    const { id } = req.params;

    // Verify task belongs to user before deleting
    const stmt = db.prepare('DELETE FROM tasks WHERE id = ? AND user_id = ?');
    const result = stmt.run(id, req.user.id);

    if (result.changes === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    // Invalidate cache
    tasksCache.delete(req.user.id);

    res.json({ message: 'Task deleted' });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get task summary
app.get('/api/tasks/summary', authenticateToken, (req, res) => {
  try {
    const stmt = db.prepare(`
      SELECT 
        status,
        COUNT(*) as count
      FROM tasks
      WHERE user_id = ?
      GROUP BY status
    `);
    const results = stmt.all(req.user.id);

    const summary = {
      TODO: 0,
      IN_PROGRESS: 0,
      DONE: 0
    };

    results.forEach(row => {
      summary[row.status] = row.count;
    });

    res.json(summary);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get user profile
app.get('/api/user/profile', authenticateToken, (req, res) => {
  try {
    const stmt = db.prepare('SELECT id, email, name, avatar_color, created_at FROM users WHERE id = ?');
    const user = stmt.get(req.user.id);

    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Get task statistics
    const statsStmt = db.prepare(`
      SELECT 
        COUNT(*) as total,
        SUM(CASE WHEN status = 'DONE' THEN 1 ELSE 0 END) as completed,
        SUM(CASE WHEN status = 'TODO' THEN 1 ELSE 0 END) as pending,
        SUM(CASE WHEN status = 'IN_PROGRESS' THEN 1 ELSE 0 END) as in_progress
      FROM tasks
      WHERE user_id = ?
    `);
    const stats = statsStmt.get(req.user.id);

    res.json({ ...user, stats });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Update user profile
app.patch('/api/user/profile', authenticateToken, (req, res) => {
  try {
    const { name, avatar_color } = req.body;

    const updates = [];
    const values = [];

    if (name) {
      updates.push('name = ?');
      values.push(name);
    }

    if (avatar_color) {
      updates.push('avatar_color = ?');
      values.push(avatar_color);
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No updates provided' });
    }

    values.push(req.user.id);

    const stmt = db.prepare(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`);
    stmt.run(...values);

    // Return updated user
    const userStmt = db.prepare('SELECT id, email, name, avatar_color FROM users WHERE id = ?');
    const user = userStmt.get(req.user.id);

    res.json(user);
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Get categories
app.get('/api/tasks/categories', authenticateToken, (req, res) => {
  try {
    const stmt = db.prepare(`
      SELECT DISTINCT category 
      FROM tasks 
      WHERE user_id = ? AND category IS NOT NULL
      ORDER BY category
    `);
    const categories = stmt.all(req.user.id).map(row => row.category);

    res.json({ categories });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

app.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
