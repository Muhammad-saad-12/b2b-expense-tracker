const mongoose = require('mongoose');
const Invoice = require('../models/Invoice');

const VALID_STATUSES = ['Draft', 'Sent', 'Paid', 'Overdue'];

// Helper to normalize status casing (e.g. 'draft' -> 'Draft')
const normalizeStatus = (statusStr) => {
  if (!statusStr) return null;
  const match = VALID_STATUSES.find(
    (s) => s.toLowerCase() === statusStr.trim().toLowerCase()
  );
  return match || null;
};

// @desc    Retrieve all invoices for the authenticated user
// @route   GET /api/invoices
// @access  Private
const getInvoices = async (req, res) => {
  try {
    const { status, sortBy, order } = req.query;

    const filter = { user: req.user.id };

    // Optional status filter
    if (status) {
      const normalized = normalizeStatus(status);
      if (!normalized) {
        return res.status(400).json({
          success: false,
          message: `Invalid status filter. Allowed values: ${VALID_STATUSES.join(', ')}`,
        });
      }
      filter.status = normalized;
    }

    // Sorting: default by createdAt desc or dueDate
    let sortOptions = { createdAt: -1 };
    if (sortBy === 'dueDate') {
      const sortOrder = order && order.toLowerCase() === 'desc' ? -1 : 1;
      sortOptions = { dueDate: sortOrder, createdAt: -1 };
    } else if (sortBy === 'createdAt') {
      const sortOrder = order && order.toLowerCase() === 'asc' ? 1 : -1;
      sortOptions = { createdAt: sortOrder };
    } else if (sortBy === 'totalAmount') {
      const sortOrder = order && order.toLowerCase() === 'asc' ? 1 : -1;
      sortOptions = { totalAmount: sortOrder };
    }

    const invoices = await Invoice.find(filter).sort(sortOptions);

    return res.status(200).json({
      success: true,
      count: invoices.length,
      invoices,
    });
  } catch (error) {
    console.error('Error fetching invoices:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve invoices',
      error: error.message,
    });
  }
};

// @desc    Retrieve single invoice by ID
// @route   GET /api/invoices/:id
// @access  Private
const getInvoiceById = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid invoice ID format',
      });
    }

    const invoice = await Invoice.findOne({ _id: id, user: req.user.id });

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found',
      });
    }

    return res.status(200).json({
      success: true,
      invoice,
    });
  } catch (error) {
    console.error('Error retrieving invoice:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve invoice',
      error: error.message,
    });
  }
};

// @desc    Create a new invoice
// @route   POST /api/invoices
// @access  Private
const createInvoice = async (req, res) => {
  try {
    const { clientName, clientEmail, items, totalAmount, status, dueDate } = req.body;

    // Validate client name
    if (!clientName || !clientName.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Client name is required',
      });
    }

    // Validate items array
    if (!Array.isArray(items) || items.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Invoice must contain at least one item',
      });
    }

    // Validate each item and calculate item sum
    let calculatedTotal = 0;
    const sanitizedItems = [];

    for (let i = 0; i < items.length; i++) {
      const item = items[i];
      if (!item.description || !item.description.trim()) {
        return res.status(400).json({
          success: false,
          message: `Item at index ${i} must have a valid description`,
        });
      }

      const qty = Number(item.quantity);
      if (isNaN(qty) || qty < 1) {
        return res.status(400).json({
          success: false,
          message: `Item at index ${i} must have quantity >= 1`,
        });
      }

      const price = Number(item.price);
      if (isNaN(price) || price < 0) {
        return res.status(400).json({
          success: false,
          message: `Item at index ${i} must have a non-negative price`,
        });
      }

      calculatedTotal += qty * price;
      sanitizedItems.push({
        description: item.description.trim(),
        quantity: qty,
        price,
      });
    }

    // Determine final totalAmount (use explicitly provided total if valid, else calculatedTotal)
    let finalTotal = Number(calculatedTotal.toFixed(2));
    if (totalAmount !== undefined && totalAmount !== null) {
      const parsedTotal = Number(totalAmount);
      if (isNaN(parsedTotal) || parsedTotal < 0) {
        return res.status(400).json({
          success: false,
          message: 'Total amount must be a non-negative number',
        });
      }
      finalTotal = Number(parsedTotal.toFixed(2));
    }

    // Validate status (default to 'Draft')
    let invoiceStatus = 'Draft';
    if (status) {
      const normalized = normalizeStatus(status);
      if (!normalized) {
        return res.status(400).json({
          success: false,
          message: `Invalid invoice status. Allowed values: ${VALID_STATUSES.join(', ')}`,
        });
      }
      invoiceStatus = normalized;
    }

    // Validate due date
    let parsedDueDate;
    if (dueDate) {
      parsedDueDate = new Date(dueDate);
      if (isNaN(parsedDueDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'Invalid due date format',
        });
      }
    } else {
      // Default due date to 30 days from now if not provided
      parsedDueDate = new Date();
      parsedDueDate.setDate(parsedDueDate.getDate() + 30);
    }

    const invoice = new Invoice({
      user: req.user.id,
      clientName: clientName.trim(),
      clientEmail: clientEmail ? clientEmail.trim().toLowerCase() : '',
      items: sanitizedItems,
      totalAmount: finalTotal,
      status: invoiceStatus,
      dueDate: parsedDueDate,
    });

    const savedInvoice = await invoice.save();

    return res.status(201).json({
      success: true,
      message: 'Invoice created successfully',
      invoice: savedInvoice,
    });
  } catch (error) {
    console.error('Error creating invoice:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create invoice',
      error: error.message,
    });
  }
};

// @desc    Update invoice status or details
// @route   PUT /api/invoices/:id (or PATCH /api/invoices/:id)
// @access  Private
const updateInvoiceStatus = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid invoice ID format',
      });
    }

    const invoice = await Invoice.findOne({ _id: id, user: req.user.id });

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found',
      });
    }

    const { status, clientName, clientEmail, items, totalAmount, dueDate } = req.body;

    // Update status if provided
    if (status !== undefined) {
      const normalized = normalizeStatus(status);
      if (!normalized) {
        return res.status(400).json({
          success: false,
          message: `Invalid invoice status. Allowed values: ${VALID_STATUSES.join(', ')}`,
        });
      }
      invoice.status = normalized;
    }

    // Update clientName if provided
    if (clientName !== undefined) {
      if (!clientName.trim()) {
        return res.status(400).json({
          success: false,
          message: 'Client name cannot be empty',
        });
      }
      invoice.clientName = clientName.trim();
    }

    // Update clientEmail if provided
    if (clientEmail !== undefined) {
      invoice.clientEmail = clientEmail.trim().toLowerCase();
    }

    // Update items if provided
    if (items !== undefined) {
      if (!Array.isArray(items) || items.length === 0) {
        return res.status(400).json({
          success: false,
          message: 'Invoice must contain at least one item',
        });
      }

      let calculatedTotal = 0;
      const sanitizedItems = [];

      for (let i = 0; i < items.length; i++) {
        const item = items[i];
        if (!item.description || !item.description.trim()) {
          return res.status(400).json({
            success: false,
            message: `Item at index ${i} must have a valid description`,
          });
        }

        const qty = Number(item.quantity);
        if (isNaN(qty) || qty < 1) {
          return res.status(400).json({
            success: false,
            message: `Item at index ${i} must have quantity >= 1`,
          });
        }

        const price = Number(item.price);
        if (isNaN(price) || price < 0) {
          return res.status(400).json({
            success: false,
            message: `Item at index ${i} must have a non-negative price`,
          });
        }

        calculatedTotal += qty * price;
        sanitizedItems.push({
          description: item.description.trim(),
          quantity: qty,
          price,
        });
      }

      invoice.items = sanitizedItems;
      // Auto update totalAmount if not explicitly passed
      if (totalAmount === undefined) {
        invoice.totalAmount = Number(calculatedTotal.toFixed(2));
      }
    }

    // Update explicit totalAmount if provided
    if (totalAmount !== undefined) {
      const parsedTotal = Number(totalAmount);
      if (isNaN(parsedTotal) || parsedTotal < 0) {
        return res.status(400).json({
          success: false,
          message: 'Total amount must be a non-negative number',
        });
      }
      invoice.totalAmount = Number(parsedTotal.toFixed(2));
    }

    // Update dueDate if provided
    if (dueDate !== undefined) {
      const parsedDueDate = new Date(dueDate);
      if (isNaN(parsedDueDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'Invalid due date format',
        });
      }
      invoice.dueDate = parsedDueDate;
    }

    const updatedInvoice = await invoice.save();

    return res.status(200).json({
      success: true,
      message: 'Invoice updated successfully',
      invoice: updatedInvoice,
    });
  } catch (error) {
    console.error('Error updating invoice:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update invoice',
      error: error.message,
    });
  }
};

// @desc    Delete an invoice by ID
// @route   DELETE /api/invoices/:id
// @access  Private
const deleteInvoice = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid invoice ID format',
      });
    }

    const invoice = await Invoice.findOne({ _id: id, user: req.user.id });

    if (!invoice) {
      return res.status(404).json({
        success: false,
        message: 'Invoice not found',
      });
    }

    await invoice.deleteOne();

    return res.status(200).json({
      success: true,
      message: 'Invoice deleted successfully',
      id,
    });
  } catch (error) {
    console.error('Error deleting invoice:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete invoice',
      error: error.message,
    });
  }
};

module.exports = {
  getInvoices,
  getInvoiceById,
  createInvoice,
  updateInvoiceStatus,
  deleteInvoice,
};
