import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import './App.css';

const API_BASE = 'http://localhost:3001/api';

function App() {
  const navigate = useNavigate();
  const [token, setToken] = useState(localStorage.getItem('token'));
  const [user, setUser] = useState(JSON.parse(localStorage.getItem('user') || 'null'));
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [name, setName] = useState('');
  const [tasks, setTasks] = useState([]);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskDescription, setNewTaskDescription] = useState('');
  const [newTaskCategory, setNewTaskCategory] = useState('');
  const [newTaskDueDate, setNewTaskDueDate] = useState('');
  const [summary, setSummary] = useState({ TODO: 0, IN_PROGRESS: 0, DONE: 0 });
  const [categories, setCategories] = useState([]);
  const [filterStatus, setFilterStatus] = useState('');
  const [filterCategory, setFilterCategory] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [showNewTaskForm, setShowNewTaskForm] = useState(false);
  const [editingTask, setEditingTask] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [currentView, setCurrentView] = useState('tasks');
  const [userProfile, setUserProfile] = useState(null);
  const [showVerificationBanner, setShowVerificationBanner] = useState(false);

  useEffect(() => {
    if (token) {
      fetchTasks();
      fetchSummary();
      fetchCategories();
      // Check if email is verified
      if (user && user.email_verified === 0) {
        setShowVerificationBanner(true);
      }
    }
  }, [token, filterStatus, filterCategory, searchQuery]);

  const resendVerification = async () => {
    try {
      const response = await fetch(`${API_BASE}/auth/resend-verification`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
      if (response.ok) {
        alert('✅ Verification email sent! Please check your inbox.');
      } else {
        alert(data.error || 'Failed to resend verification email');
      }
    } catch (err) {
      alert('Error sending verification email. Please try again.');
    }
  };

  const handleAuth = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const endpoint = isLogin ? '/auth/login' : '/auth/signup';
      const body = isLogin 
        ? { email, password }
        : { email, password, name };
      
      const response = await fetch(`${API_BASE}${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body)
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Authentication failed');
      }

      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      setToken(data.token);
      setUser(data.user);
      setEmail('');
      setPassword('');
      setName('');
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchTasks = async () => {
    try {
      const params = new URLSearchParams();
      if (filterStatus) params.append('status', filterStatus);
      if (filterCategory) params.append('category', filterCategory);
      if (searchQuery) params.append('search', searchQuery);
      // Add timestamp to prevent caching issues
      params.append('_t', Date.now());

      const response = await fetch(`${API_BASE}/tasks?${params}`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await response.json();

      if (response.ok) {
        setTasks(data.tasks);
      }
    } catch (err) {
      console.error('Error fetching tasks:', err);
    }
  };

  const fetchSummary = async () => {
    try {
      const response = await fetch(`${API_BASE}/tasks/summary`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await response.json();

      if (response.ok) {
        setSummary(data);
      }
    } catch (err) {
      console.error('Error fetching summary:', err);
    }
  };

  const fetchCategories = async () => {
    try {
      const response = await fetch(`${API_BASE}/tasks/categories`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await response.json();

      if (response.ok) {
        setCategories(data.categories);
      }
    } catch (err) {
      console.error('Error fetching categories:', err);
    }
  };

  const fetchUserProfile = async () => {
    try {
      const response = await fetch(`${API_BASE}/user/profile`, {
        headers: { 'Authorization': `Bearer ${token}` }
      });

      const data = await response.json();

      if (response.ok) {
        setUserProfile(data);
      }
    } catch (err) {
      console.error('Error fetching profile:', err);
    }
  };

  const createTask = async (e) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;

    try {
      const response = await fetch(`${API_BASE}/tasks`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ 
          title: newTaskTitle,
          description: newTaskDescription,
          category: newTaskCategory,
          due_date: newTaskDueDate || null
        })
      });

      if (response.ok) {
        setNewTaskTitle('');
        setNewTaskDescription('');
        setNewTaskCategory('');
        setNewTaskDueDate('');
        setShowNewTaskForm(false);
        fetchTasks();
        fetchSummary();
        fetchCategories();
      }
    } catch (err) {
      console.error('Error creating task:', err);
    }
  };

  const updateTask = async (taskId, updates) => {
    try {
      const response = await fetch(`${API_BASE}/tasks/${taskId}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify(updates)
      });

      if (response.ok) {
        fetchTasks();
        fetchSummary();
        setEditingTask(null);
      }
    } catch (err) {
      console.error('Error updating task:', err);
    }
  };

  const updateTaskStatus = async (taskId, newStatus) => {
    try {
      // Optimistically update UI
      setTasks(prevTasks => 
        prevTasks.map(task => 
          task.id === taskId ? { ...task, status: newStatus } : task
        )
      );
      
      // Update on server
      await updateTask(taskId, { status: newStatus });
    } catch (err) {
      console.error('Error updating task status:', err);
      // Revert on error
      fetchTasks();
    }
  };

  const deleteTask = async (taskId) => {
    if (!window.confirm('Are you sure you want to delete this task?')) return;

    try {
      const response = await fetch(`${API_BASE}/tasks/${taskId}`, {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${token}` }
      });

      if (response.ok) {
        // Immediately remove task from UI
        setTasks(prevTasks => prevTasks.filter(task => task.id !== taskId));
        // Fetch fresh data from server
        await fetchTasks();
        await fetchSummary();
        await fetchCategories();
      } else {
        const data = await response.json();
        alert(data.error || 'Failed to delete task');
      }
    } catch (err) {
      console.error('Error deleting task:', err);
      alert('Error deleting task. Please try again.');
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setToken(null);
    setUser(null);
    setTasks([]);
    setSummary({ TODO: 0, IN_PROGRESS: 0, DONE: 0 });
  };

  const clearFilters = () => {
    setFilterStatus('');
    setFilterCategory('');
    setSearchQuery('');
  };

  const isOverdue = (dueDate, status) => {
    if (!dueDate) return false;
    if (status === 'DONE') return false; // Completed tasks are never overdue
    return new Date(dueDate) < new Date();
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  if (!token) {
    return (
      <div className="App">
        <div className="auth-container">
          <div className="auth-card">
            <div className="auth-header">
              <div className="app-logo">
                <span className="logo-icon">✓</span>
                <span className="logo-text">TaskFlow</span>
              </div>
              <p className="auth-subtitle">Organize your tasks, boost your productivity</p>
            </div>

            <div className="auth-toggle">
              <button
                className={isLogin ? 'active' : ''}
                onClick={() => {
                  setIsLogin(true);
                  setError('');
                }}
              >
                Sign In
              </button>
              <button
                className={!isLogin ? 'active' : ''}
                onClick={() => {
                  setIsLogin(false);
                  setError('');
                }}
              >
                Sign Up
              </button>
            </div>

            <form onSubmit={handleAuth} className="auth-form">
              {!isLogin && (
                <div className="input-group">
                  <label>Name</label>
                  <input
                    type="text"
                    placeholder="Enter your name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    required
                  />
                </div>
              )}
              <div className="input-group">
                <label>Email</label>
                <input
                  type="email"
                  placeholder="Enter your email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="input-group">
                <label>Password</label>
                <input
                  type="password"
                  placeholder="Enter your password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                />
              </div>
              {isLogin && (
                <div className="forgot-password-link">
                  <a href="/forgot-password" onClick={(e) => { e.preventDefault(); navigate('/forgot-password'); }}>
                    Forgot Password?
                  </a>
                </div>
              )}
              {error && <div className="error">{error}</div>}
              <button type="submit" className="auth-submit" disabled={loading}>
                {loading ? 'Loading...' : isLogin ? 'Sign In' : 'Create Account'}
              </button>
            </form>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="App">
      <nav className="navbar">
        <div className="navbar-brand">
          <span className="logo-icon">✓</span>
          <span className="logo-text">TaskFlow</span>
        </div>
        <div className="navbar-menu">
          <button 
            className={`nav-btn ${currentView === 'tasks' ? 'active' : ''}`}
            onClick={() => setCurrentView('tasks')}
          >
            <span className="icon">📋</span> Tasks
          </button>
          <button 
            className={`nav-btn ${currentView === 'profile' ? 'active' : ''}`}
            onClick={() => {
              setCurrentView('profile');
              fetchUserProfile();
            }}
          >
            <span className="icon">👤</span> Profile
          </button>
          <button className="nav-btn logout" onClick={logout}>
            <span className="icon">🚪</span> Logout
          </button>
        </div>
      </nav>

      {/* Email Verification Banner */}
      {showVerificationBanner && (
        <div className="verification-banner">
          <div className="verification-content">
            <span className="verification-icon">⚠️</span>
            <div className="verification-text">
              <strong>Email Not Verified</strong>
              <span>Please verify your email to access all features.</span>
            </div>
            <button className="resend-btn" onClick={resendVerification}>
              📧 Resend Email
            </button>
            <button className="close-banner" onClick={() => setShowVerificationBanner(false)}>
              ✕
            </button>
          </div>
        </div>
      )}

      {currentView === 'tasks' ? (
        <div className="main-content">
          <div className="summary-cards">
            <div className="summary-card todo">
              <div className="card-icon">📝</div>
              <div className="card-content">
                <h3>{summary.TODO}</h3>
                <p>To Do</p>
              </div>
            </div>
            <div className="summary-card in-progress">
              <div className="card-icon">⚡</div>
              <div className="card-content">
                <h3>{summary.IN_PROGRESS}</h3>
                <p>In Progress</p>
              </div>
            </div>
            <div className="summary-card done">
              <div className="card-icon">✅</div>
              <div className="card-content">
                <h3>{summary.DONE}</h3>
                <p>Completed</p>
              </div>
            </div>
          </div>

          <div className="tasks-section">
            <div className="tasks-header">
              <h2>My Tasks</h2>
              <button 
                className="btn-primary"
                onClick={() => setShowNewTaskForm(!showNewTaskForm)}
              >
                <span className="icon">+</span> New Task
              </button>
            </div>

            {showNewTaskForm && (
              <div className="task-form-card">
                <h3>Create New Task</h3>
                <form onSubmit={createTask}>
                  <input
                    type="text"
                    placeholder="Task title *"
                    value={newTaskTitle}
                    onChange={(e) => setNewTaskTitle(e.target.value)}
                    required
                  />
                  <textarea
                    placeholder="Description (optional)"
                    value={newTaskDescription}
                    onChange={(e) => setNewTaskDescription(e.target.value)}
                    rows="3"
                  />
                  <div className="form-row">
                    <input
                      type="text"
                      placeholder="Category (e.g., Work, Personal)"
                      value={newTaskCategory}
                      onChange={(e) => setNewTaskCategory(e.target.value)}
                    />
                    <input
                      type="date"
                      value={newTaskDueDate}
                      onChange={(e) => setNewTaskDueDate(e.target.value)}
                    />
                  </div>
                  <div className="form-actions">
                    <button type="submit" className="btn-primary">Create Task</button>
                    <button 
                      type="button" 
                      className="btn-secondary"
                      onClick={() => setShowNewTaskForm(false)}
                    >
                      Cancel
                    </button>
                  </div>
                </form>
              </div>
            )}

            <div className="filters-bar">
              <input
                type="text"
                placeholder="🔍 Search tasks..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
              <select 
                value={filterStatus} 
                onChange={(e) => setFilterStatus(e.target.value)}
                className="filter-select"
              >
                <option value="">All Status</option>
                <option value="TODO">To Do</option>
                <option value="IN_PROGRESS">In Progress</option>
                <option value="DONE">Done</option>
              </select>
              <select 
                value={filterCategory} 
                onChange={(e) => setFilterCategory(e.target.value)}
                className="filter-select"
              >
                <option value="">All Categories</option>
                {categories.map(cat => (
                  <option key={cat} value={cat}>{cat}</option>
                ))}
              </select>
              {(filterStatus || filterCategory || searchQuery) && (
                <button className="btn-clear" onClick={clearFilters}>
                  Clear Filters
                </button>
              )}
            </div>

            <div className="tasks-grid">
              {tasks.length === 0 ? (
                <div className="empty-state">
                  <span className="empty-icon">📭</span>
                  <h3>No tasks found</h3>
                  <p>Create your first task to get started!</p>
                </div>
              ) : (
                tasks.map((task) => (
                  <div key={task.id} className={`task-card ${task.status.toLowerCase().replace('_', '-')}`}>
                    <div className="task-header-row">
                      <select
                        value={task.status}
                        onChange={(e) => {
                          e.stopPropagation();
                          updateTaskStatus(task.id, e.target.value);
                        }}
                        className={`status-select ${task.status.toLowerCase().replace('_', '-')}`}
                        onClick={(e) => e.stopPropagation()}
                      >
                        <option value="TODO">📝 To Do</option>
                        <option value="IN_PROGRESS">⚡ In Progress</option>
                        <option value="DONE">✅ Done</option>
                      </select>
                      <button
                        className="delete-btn"
                        onClick={() => deleteTask(task.id)}
                        title="Delete task"
                      >
                        🗑️
                      </button>
                    </div>
                    
                    {editingTask === task.id ? (
                      <div className="edit-form">
                        <input
                          type="text"
                          defaultValue={task.title}
                          onBlur={(e) => {
                            if (e.target.value !== task.title) {
                              updateTask(task.id, { title: e.target.value });
                            }
                          }}
                          autoFocus
                        />
                      </div>
                    ) : (
                      <h3 
                        className="task-title"
                        onClick={() => setEditingTask(task.id)}
                      >
                        {task.title}
                      </h3>
                    )}
                    
                    {task.description && (
                      <p className="task-description">{task.description}</p>
                    )}
                    
                    <div className="task-meta">
                      {task.category && (
                        <span className="task-category">
                          🏷️ {task.category}
                        </span>
                      )}
                      {task.due_date && (
                        <span className={`task-due-date ${isOverdue(task.due_date, task.status) ? 'overdue' : ''}`}>
                          📅 {formatDate(task.due_date)}
                          {isOverdue(task.due_date, task.status) && ' (Overdue)'}
                        </span>
                      )}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="main-content">
          <div className="profile-section">
            <div className="profile-card">
              <div 
                className="profile-avatar" 
                style={{ backgroundColor: user?.avatar_color || '#667eea' }}
              >
                {user?.name?.charAt(0).toUpperCase() || user?.email?.charAt(0).toUpperCase()}
              </div>
              <h2>{user?.name || 'User'}</h2>
              <p className="profile-email">{user?.email}</p>
              
              {userProfile && (
                <div className="profile-stats">
                  <div className="stat-item">
                    <h3>{userProfile.stats.total}</h3>
                    <p>Total Tasks</p>
                  </div>
                  <div className="stat-item">
                    <h3>{userProfile.stats.completed}</h3>
                    <p>Completed</p>
                  </div>
                  <div className="stat-item">
                    <h3>{userProfile.stats.pending}</h3>
                    <p>Pending</p>
                  </div>
                  <div className="stat-item">
                    <h3>{userProfile.stats.in_progress}</h3>
                    <p>In Progress</p>
                  </div>
                </div>
              )}
              
              <div className="profile-info">
                <p><strong>Member since:</strong> {formatDate(userProfile?.created_at || user?.created_at)}</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
