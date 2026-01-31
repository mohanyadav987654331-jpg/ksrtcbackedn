const express = require('express');
const router = express.Router();
const { auth, roleAuth } = require('../middleware/auth');
const db = require('../config/database');

// Get all feedback
router.get('/', auth, roleAuth('DEPOT', 'SUPER_ADMIN'), async (req, res) => {
  try {
    const { category, status } = req.query;
    let query = 'SELECT * FROM feedback WHERE 1=1';
    const params = [];

    if (category) {
      query += ' AND category = ?';
      params.push(category);
    }
    if (status) {
      query += ' AND status = ?';
      params.push(status);
    }

    query += ' ORDER BY created_at DESC';

    const [feedback] = await db.query(query, params);
    res.json(feedback);
  } catch (error) {
    console.error('Get feedback error:', error);
    res.status(500).json({ error: 'Failed to fetch feedback' });
  }
});

// Get user's feedback
router.get('/my', auth, async (req, res) => {
  try {
    const [feedback] = await db.query(
      'SELECT * FROM feedback WHERE user_id = ? ORDER BY created_at DESC',
      [req.user.id]
    );
    res.json(feedback);
  } catch (error) {
    console.error('Get user feedback error:', error);
    res.status(500).json({ error: 'Failed to fetch feedback' });
  }
});

// Submit feedback
router.post('/', auth, async (req, res) => {
  try {
    const { category, rating, busNumber, routeId, feedbackText } = req.body;

    const [result] = await db.query(
      `INSERT INTO feedback (user_id, username, category, rating, bus_number, route_id, feedback_text)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [req.user.id, req.user.username, category, rating, busNumber, routeId, feedbackText]
    );

    res.status(201).json({ message: 'Feedback submitted successfully', id: result.insertId });
  } catch (error) {
    console.error('Submit feedback error:', error);
    res.status(500).json({ error: 'Failed to submit feedback' });
  }
});

// Respond to feedback (Admin only)
router.put('/:id/respond', auth, roleAuth('DEPOT', 'SUPER_ADMIN'), async (req, res) => {
  try {
    const { adminResponse } = req.body;

    await db.query(
      'UPDATE feedback SET admin_response = ?, status = "RESOLVED" WHERE id = ?',
      [adminResponse, req.params.id]
    );

    res.json({ message: 'Response added successfully' });
  } catch (error) {
    console.error('Respond to feedback error:', error);
    res.status(500).json({ error: 'Failed to respond to feedback' });
  }
});

module.exports = router;
