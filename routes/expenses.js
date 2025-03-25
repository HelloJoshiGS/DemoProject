// routes/expenses.js
const express = require('express');
const Expense = require('../models/expense');
const authMiddleware = require('../middleware/auth');
const router = express.Router();
const rateLimit = require('express-rate-limit');

// Rate Limiting
const limiter = rateLimit({
    windowMs: 15 * 60 * 1000, // 15 minutes
    max: 100, // Limit each IP to 100 requests per window
    message: { error: 'Too many requests, please try again later.' }
  });
  
  router.use(limiter);


// Centralized Error Handler
const errorHandler = (res, error, message) => {
    console.error(error);
    res.status(500).json({ error: message || 'Internal Server Error' });
  };


// Create Expense with Validation
router.post('/', authMiddleware, async (req, res) => {
    try {
      const { type, amount, category, date, description } = req.body;
      if (!type || !amount || !category || !date) {
        return res.status(400).json({ error: 'Type, Amount, category, and date are required' });
      }
      if (type !== 'income' && type !== 'expense') {
        return res.status(400).json({ error: 'Type must be either income or expense' });
      }
      if (typeof amount !== 'number' || amount <= 0) {
        return res.status(400).json({ error: 'Amount must be a positive number' });
      }
      const expense = new Expense({ ...req.body, user: req.user.id });
      await expense.save();
      res.status(201).json({ message: 'Expense created successfully', expense });
    } catch (error) {
      errorHandler(res, error, 'Failed to create expense');
    }
  });

// Get Expenses with Filters
router.get('/', authMiddleware, async (req, res) => {
    try {
      const { startDate, endDate, category, sortBy } = req.query;
      let filter = { user: req.user.id };
      if (startDate && endDate) {
        filter.date = { $gte: new Date(startDate), $lte: new Date(endDate) };
      }
      if (category) filter.category = category;
      let expenses = await Expense.find(filter).sort(sortBy === 'amount' ? { amount: 1 } : { date: -1 });
      res.json({ message: 'Expenses retrieved successfully', expenses });
    } catch (error) {
      errorHandler(res, error, 'Failed to retrieve expenses');
    }
  });

// Get All Expenses
router.get('/', authMiddleware, async (req, res) => {
    try {
      const expenses = await Expense.find({ user: req.user.id }).sort({ date: -1 });
      res.json(expenses);
    } catch (error) {
      res.status(500).json({ error: 'Internal Server Error' });
    }
  });


// Update Expense
router.put('/:id', authMiddleware, async (req, res) => {
  try {
    // Only allow specific fields to be updated
    const allowedFields = ['type', 'amount', 'category', 'date', 'description'];
    const updateData = {};

    if ('amount' in req.body) {
      const parsedAmount = Number(req.body.amount);
      if (isNaN(parsedAmount) || parsedAmount <= 0) {
        return res.status(400).json({ error: 'Amount must be a positive number' });
      }
    }
    

    for (const key of allowedFields) {
      if (key in req.body) {
        updateData[key] = req.body[key];
      }
    }

    const expense = await Expense.findByIdAndUpdate(
      req.params.id,
      updateData,
      {
        new: true,
        runValidators: true, 
        context: 'query'     // to run validators for update operation
      }
    );

    if (!expense) {
      return res.status(404).json({ error: 'Expense not found' });
    }

    res.json({ message: 'Expense updated successfully', expense });

  } catch (error) {
    errorHandler(res, error, 'Failed to update expense');
  }
});

router.get('/', authMiddleware, async (req, res) => {
  try {
    const { startDate, endDate, sortBy, ...rest } = req.query;
    let filter = { user: req.user.id };

    // Handle date range filtering
    if (startDate || endDate) {
      filter.date = {};
      if (startDate) filter.date.$gte = new Date(startDate);
      if (endDate) filter.date.$lte = new Date(endDate);
    }

    // Add dynamic filters for other fields
    for (let key in rest) {
      // Convert amount to number for comparison
      if (key === 'amount') {
        filter[key] = Number(rest[key]);
      } else {
        filter[key] = rest[key];
      }
    }

    // Optional sorting
    let sortOption = sortBy === 'amount' ? { amount: 1 } : { date: -1 };

    const expenses = await Expense.find(filter).sort(sortOption);
    res.json({ message: 'Expenses retrieved successfully', expenses });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to retrieve expenses' });
  }
});




// Delete Expense
router.delete('/:id', authMiddleware, async (req, res) => {
    try {
      const expense = await Expense.findByIdAndDelete(req.params.id);
      if (!expense) return res.status(404).json({ error: 'Expense not found' });
      res.json({ message: 'Expense deleted successfully' });
    } catch (error) {
      errorHandler(res, error, 'Failed to delete expense');
    }
  });

module.exports = router;
