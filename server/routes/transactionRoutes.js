const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const {
  getTransactions,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  getTransactionAnalytics,
} = require('../controllers/transactionController');

// All transaction routes are protected with auth middleware
router.use(auth);

// Analytics route (declared before /:id parameter route)
router.get('/analytics', getTransactionAnalytics);

router.route('/')
  .get(getTransactions)
  .post(createTransaction);

router.route('/:id')
  .put(updateTransaction)
  .delete(deleteTransaction);

module.exports = router;
