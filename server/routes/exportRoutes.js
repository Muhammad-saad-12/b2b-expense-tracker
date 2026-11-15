const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const {
  exportTransactionsCSV,
  exportTransactionsPDF,
} = require('../controllers/exportController');

// All export endpoints require authentication
router.use(auth);

router.get('/csv', exportTransactionsCSV);
router.get('/pdf', exportTransactionsPDF);

module.exports = router;
