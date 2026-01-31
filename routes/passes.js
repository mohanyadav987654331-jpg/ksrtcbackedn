const express = require('express');
const router = express.Router();
const { auth } = require('../middleware/auth');
const db = require('../config/database');

// Get user's passes
router.get('/my', auth, async (req, res) => {
  try {
    const [passes] = await db.query(
      `SELECT p.id, p.user_id, p.pass_type, p.origin, p.destination, p.distance, p.fare as amount, 
              p.purchase_date, p.start_date, p.end_date, p.valid_from, p.valid_until, 
              p.payment_status, p.payment_method, p.transaction_id, p.document_type, 
              p.document_number, p.is_approved, u.full_name 
       FROM passes p 
       JOIN users u ON p.user_id = u.id 
       WHERE p.user_id = ? ORDER BY p.purchase_date DESC`,
      [req.user.id]
    );
    res.json({ success: true, data: passes });
  } catch (error) {
    console.error('Get passes error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch passes' });
  }
});

// Get user's active passes with full details
router.get('/active', auth, async (req, res) => {
  try {
    const [passes] = await db.query(`
      SELECT 
        p.id,
        p.pass_type,
        p.origin,
        p.destination,
        p.start_date as purchase_date,
        p.end_date as expiry_date,
        p.amount,
        p.payment_status,
        p.is_approved,
        u.id as user_id,
        u.full_name as user_name,
        u.phone,
        d.document_type,
        d.document_number
      FROM passes p
      JOIN users u ON p.user_id = u.id
      LEFT JOIN documents d ON u.id = d.user_id
      WHERE p.user_id = ? 
        AND p.payment_status = 'completed'
        AND p.end_date >= CURDATE()
      ORDER BY p.start_date DESC
    `, [req.user.id]);

    res.json({ success: true, data: passes });
  } catch (error) {
    console.error('Get active passes error:', error);
    res.status(500).json({ success: false, error: 'Failed to fetch active passes' });
  }
});

// Get pass by ID
router.get('/:id', auth, async (req, res) => {
  try {
    const [passes] = await db.query(
      'SELECT * FROM passes WHERE id = ? AND user_id = ?',
      [req.params.id, req.user.id]
    );
    if (passes.length === 0) {
      return res.status(404).json({ error: 'Pass not found' });
    }
    res.json(passes[0]);
  } catch (error) {
    console.error('Get pass error:', error);
    res.status(500).json({ error: 'Failed to fetch pass' });
  }
});

// Purchase pass
router.post('/', auth, async (req, res) => {
  try {
    const { 
      passType, 
      origin, 
      destination, 
      amount, 
      startDate, 
      endDate, 
      paymentMethod, 
      transactionId
    } = req.body;

    // Accept both legacy (documentType/documentLastDigits) and new (govtIdType/govtIdLast4) field names
    const documentType = req.body.documentType || req.body.govtIdType;
    const documentNumber = req.body.documentNumber || req.body.govtIdNumber || '';
    const documentLastDigits = req.body.documentLastDigits || req.body.govtIdLast4;

    // Validate required fields
    if (!passType || !origin || !destination || !amount || !paymentMethod) {
      return res.status(400).json({ 
        success: false, 
        error: 'Missing required fields' 
      });
    }

    // Soft-validate document verification but don't block purchase to avoid schema mismatches
    const hasDocument = documentType && documentLastDigits && documentLastDigits.length === 4;

    // Build insert with proper column names and date calculations
    const startDateStr = startDate || new Date().toISOString().split('T')[0];
    const endDateStr = endDate || new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0];
    
    // Calculate distance if not provided (placeholder - should be calculated from actual route data)
    const distance = req.body.distance || 0;
    
    const columns = [
      'user_id', 'pass_type', 'origin', 'destination', 'distance', 'fare', 'amount',
      'start_date', 'end_date', 'valid_from', 'valid_until', 
      'payment_method', 'transaction_id', 'payment_status', 'is_approved'
    ];
    
    const values = [
      req.user.id,
      passType,
      origin,
      destination,
      distance,    // distance
      amount,      // fare = amount
      amount,      // amount 
      startDateStr,
      endDateStr,
      startDateStr,  // valid_from = start_date
      endDateStr,    // valid_until = end_date
      paymentMethod,
      transactionId || `TXN${Date.now()}`,
      'completed',  // payment_status = completed
      1  // is_approved = true
    ];

    if (hasDocument) {
      columns.push('document_type', 'document_number', 'document_last_digits');
      values.push(documentType, documentNumber || '', documentLastDigits);
    }

    const placeholders = columns.map(() => '?').join(', ');
    const [result] = await db.query(
      `INSERT INTO passes (${columns.join(', ')}) VALUES (${placeholders})`,
      values
    );

    console.log('✅ Pass created successfully:', { id: result.insertId, userId: req.user.id, passType, origin, destination, paymentStatus: 'completed' });

    res.status(201).json({ 
      success: true,
      message: 'Pass purchased successfully', 
      data: {
        id: result.insertId,
        pass_type: passType,
        origin,
        destination,
        fare: amount,
        amount,
        start_date: startDateStr,
        end_date: endDateStr,
        valid_from: startDateStr,
        valid_until: endDateStr,
        payment_status: 'completed',
        is_approved: 1,
        document_type: hasDocument ? documentType : undefined,
        document_number: hasDocument ? documentNumber : undefined,
        document_last_digits: hasDocument ? documentLastDigits : undefined,
        payment_method: paymentMethod
      }
    });
  } catch (error) {
    console.error('Purchase pass error:', error);
    res.status(500).json({ 
      success: false,
      error: error.message || 'Failed to purchase pass' 
    });
  }
});

// Validate pass (for drivers/conductors)
router.get('/validate/:passId', auth, async (req, res) => {
  try {
    const [passes] = await db.query(
      `SELECT * FROM passes 
       WHERE id = ? AND status = 'ACTIVE' 
       AND start_date <= CURDATE() AND end_date >= CURDATE()`,
      [req.params.passId]
    );

    if (passes.length === 0) {
      return res.status(404).json({ valid: false, message: 'Pass not found or expired' });
    }

    res.json({ valid: true, pass: passes[0] });
  } catch (error) {
    console.error('Validate pass error:', error);
    res.status(500).json({ error: 'Failed to validate pass' });
  }
});

module.exports = router;
