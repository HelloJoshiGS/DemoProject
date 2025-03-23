// models/Expense.js
const mongoose = require('mongoose');

const expenseSchema = new mongoose.Schema({
  type: { type: String, enum: ['expense', 'income'], required: true },
  amount: { type: Number, required: false },
  category: { type: String, required: true },
  date: { type: Date, required: true },
  description: { type: String },
  user: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
  sourceType: { type: String, enum: ['manual', 'pdf/image'], default: 'manual' }
}, { timestamps: true });

module.exports = mongoose.model('Expense', expenseSchema);

// Keep other routes and middleware unchanged
