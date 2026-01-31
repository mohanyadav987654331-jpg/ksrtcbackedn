const express = require('express');
const router = express.Router();
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { body, validationResult } = require('express-validator');
const db = require('../config/database');
const { auth, roleAuth } = require('../middleware/auth');

// Register (User only)
router.post('/register',
  [
    body('username').trim().isLength({ min: 3 }).withMessage('Username must be at least 3 characters'),
    body('email').isEmail().withMessage('Invalid email address'),
    body('phone').isMobilePhone().withMessage('Invalid phone number'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters')
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ errors: errors.array() });
      }

      const { username, email, phone, password } = req.body;

      // Check if user exists
      const [existing] = await db.query(
        'SELECT id FROM users WHERE username = ? OR email = ?',
        [username, email]
      );

      if (existing.length > 0) {
        return res.status(400).json({ error: 'Username or email already exists' });
      }

      // Hash password
      const hashedPassword = await bcrypt.hash(password, 10);

      // Insert user (DB uses password_hash column and lowercase roles)
      const [result] = await db.query(
        'INSERT INTO users (username, email, phone, password_hash, role) VALUES (?, ?, ?, ?, ?)',
        [username, email, phone, hashedPassword, 'user']
      );

      // Generate token
      const token = jwt.sign(
        { id: result.insertId, username, role: 'user' },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN }
      );

      res.status(201).json({
        success: true,
        message: 'Registration successful',
        data: {
          token,
          user: { id: result.insertId, username, email, phone, role: 'user' }
        }
      });
    } catch (error) {
      console.error('Register error:', error);
      res.status(500).json({ error: 'Registration failed' });
    }
  }
);

// Login (All roles)
router.post('/login',
  [
    body('username').trim().notEmpty().withMessage('Username is required'),
    body('password').notEmpty().withMessage('Password is required'),
    body('role').trim().notEmpty().withMessage('Role is required')
  ],
  async (req, res) => {
    try {
      console.log('Login request received:', { username: req.body.username, role: req.body.role });
      
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        console.log('Validation errors:', errors.array());
        return res.status(400).json({ errors: errors.array() });
      }

      const { username, password, role, depotLocation } = req.body;
      console.log('Extracted credentials:', { username, role });

      // Normalize frontend role and map to DB enum
      const normalizedRole = role.toString().toLowerCase();
      const dbRole = normalizedRole === 'depot' ? 'depot_admin' : normalizedRole;
      console.log('Normalized role:', normalizedRole, 'DB role:', dbRole);

      // Query user by username and role
      const [users] = await db.query(
        'SELECT * FROM users WHERE username = ? AND role = ?',
        [username, dbRole]
      );
      console.log('Query result - Users found:', users.length);

      if (users.length === 0) {
        console.log('No user found with username:', username, 'and role:', normalizedRole);
        return res.status(401).json({ success: false, error: 'Invalid credentials' });
      }

      const user = users[0];
      console.log('User found:', { id: user.id, username: user.username, role: user.role });

      // Verify password against password_hash column
      const validPassword = await bcrypt.compare(password, user.password_hash);
      console.log('Password validation result:', validPassword);
      
      if (!validPassword) {
        console.log('Invalid password for user:', username);
        return res.status(401).json({ success: false, error: 'Invalid credentials' });
      }

      // For depot admin, verify depot location and get depot details
      let depotInfo = null;
      if (dbRole === 'depot_admin' && depotLocation) {
        const [depots] = await db.query(
          'SELECT id, depot_name, location FROM depots WHERE depot_name LIKE ? OR location LIKE ?',
          [`%${depotLocation}%`, `%${depotLocation}%`]
        );
        if (depots.length === 0) {
          return res.status(401).json({ error: 'Invalid depot location' });
        }
        user.depot_id = depots[0].id;
        depotInfo = depots[0];
      } else if (dbRole === 'depot_admin' && user.depot_id) {
        // Fetch depot info if user already has depot_id
        const [depots] = await db.query(
          'SELECT id, depot_name, location FROM depots WHERE id = ?',
          [user.depot_id]
        );
        if (depots.length > 0) {
          depotInfo = depots[0];
        }
      }

      // Generate token
      console.log('Generating JWT token...');
      console.log('JWT_SECRET exists:', !!process.env.JWT_SECRET);
      console.log('JWT_EXPIRES_IN:', process.env.JWT_EXPIRES_IN);
      
      const token = jwt.sign(
        { id: user.id, username: user.username, role: user.role, depotId: user.depot_id },
        process.env.JWT_SECRET,
        { expiresIn: process.env.JWT_EXPIRES_IN }
      );
      
      console.log('Token generated successfully');

      const responseData = {
        success: true,
        message: 'Login successful',
        data: {
          token,
          user: {
            id: user.id,
            username: user.username,
            email: user.email,
            phone: user.phone,
            role: user.role,
            depotId: user.depot_id,
            depot_name: depotInfo?.depot_name,
            location: depotInfo?.location
          }
        }
      };
      
      console.log('Sending response:', { success: responseData.success, hasToken: !!responseData.data.token });
      return res.status(200).json(responseData);
    } catch (error) {
      console.error('Login error:', error);
      return res.status(500).json({ success: false, error: 'Login failed' });
    }
  }
);

// Verify token
router.get('/verify', async (req, res) => {
  try {
    const token = req.header('Authorization')?.replace('Bearer ', '');
    if (!token) {
      return res.status(401).json({ error: 'No token provided' });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    const [users] = await db.query('SELECT id, username, email, phone, role FROM users WHERE id = ?', [decoded.id]);

    if (users.length === 0) {
      return res.status(401).json({ success: false, error: 'Invalid token' });
    }

    res.json({ success: true, data: { user: users[0] } });
  } catch (error) {
    res.status(401).json({ error: 'Invalid or expired token' });
  }
});

// List depot admins (super admin only)
router.get('/depot-admins', auth, roleAuth('super_admin'), async (req, res) => {
  try {
    const [rows] = await db.query(
      "SELECT id, username, email, phone, role, created_at FROM users WHERE role = 'depot_admin' ORDER BY created_at DESC"
    );
    res.json({ success: true, data: rows });
  } catch (error) {
    console.error('Depot admins fetch error:', error.message);
    res.status(500).json({ success: false, error: 'Failed to fetch depot admins' });
  }
});

// Create depot admin (super admin only)
router.post('/create-depot-admin',
  auth,
  roleAuth('super_admin'),
  [
    body('username').trim().isLength({ min: 3 }).withMessage('Username must be at least 3 characters'),
    body('email').isEmail().withMessage('Valid email required'),
    body('phone').trim().isLength({ min: 6 }).withMessage('Phone is required'),
    body('password').isLength({ min: 6 }).withMessage('Password must be at least 6 characters'),
  ],
  async (req, res) => {
    try {
      const errors = validationResult(req);
      if (!errors.isEmpty()) {
        return res.status(400).json({ success: false, errors: errors.array() });
      }

      const { username, email, phone, password } = req.body;

      // Check uniqueness
      const [existing] = await db.query(
        'SELECT id FROM users WHERE username = ? OR email = ?',
        [username, email]
      );
      if (existing.length > 0) {
        return res.status(400).json({ success: false, error: 'Username or email already exists' });
      }

      const hash = await bcrypt.hash(password, 10);
      const [result] = await db.query(
        'INSERT INTO users (username, email, phone, password_hash, role) VALUES (?, ?, ?, ?, ?)',
        [username, email, phone, hash, 'depot_admin']
      );

      const [rows] = await db.query(
        'SELECT id, username, email, phone, role, created_at FROM users WHERE id = ?',
        [result.insertId]
      );

      res.json({ success: true, data: rows[0], message: 'Depot admin created' });
    } catch (error) {
      console.error('Create depot admin error:', error.message);
      res.status(500).json({ success: false, error: 'Failed to create depot admin' });
    }
  }
);

// ============================================
// LOGOUT
// ============================================

router.post('/logout', auth, async (req, res) => {
  try {
    // In JWT-based systems, logout is typically client-side (token deletion)
    // But we can optionally add token to blacklist here if needed
    const userId = req.user.id;

    // Log the logout action
    console.log(`User ${userId} logged out`);

    res.json({
      success: true,
      message: 'Logout successful'
    });
  } catch (error) {
    console.error('Logout error:', error.message);
    res.status(500).json({ success: false, error: 'Logout failed' });
  }
});

// ============================================
// GET CURRENT USER PROFILE
// ============================================

router.get('/me', auth, async (req, res) => {
  try {
    const userId = req.user.id;

    const [user] = await db.query(`
      SELECT 
        id,
        username,
        email,
        phone,
        full_name,
        role,
        is_active,
        depot_id,
        created_at
      FROM users
      WHERE id = ?
    `, [userId]);

    if (user.length === 0) {
      return res.status(404).json({ success: false, error: 'User not found' });
    }

    res.json({
      success: true,
      user: user[0]
    });
  } catch (error) {
    console.error('Get profile error:', error.message);
    res.status(500).json({ success: false, error: 'Failed to fetch profile' });
  }
});

module.exports = router;

