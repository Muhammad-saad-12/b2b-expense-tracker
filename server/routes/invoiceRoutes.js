const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const {
  getInvoices,
  getInvoiceById,
  createInvoice,
  updateInvoiceStatus,
  deleteInvoice,
} = require('../controllers/invoiceController');

// All invoice routes are protected by auth middleware
router.use(auth);

router.route('/')
  .get(getInvoices)
  .post(createInvoice);

router.route('/:id')
  .get(getInvoiceById)
  .put(updateInvoiceStatus)
  .patch(updateInvoiceStatus)
  .delete(deleteInvoice);

module.exports = router;
