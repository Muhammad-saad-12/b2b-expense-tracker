const mongoose = require('mongoose');
const Transaction = require('../models/Transaction');

// @desc    Get all transactions for the authenticated user (with optional filters)
// @route   GET /api/transactions
// @access  Private
const getTransactions = async (req, res) => {
  try {
    const { category, type, startDate, endDate, from, to } = req.query;

    const filter = { user: req.user.id };

    // Filter by type ('income' or 'expense')
    if (type) {
      if (!['income', 'expense'].includes(type.toLowerCase())) {
        return res.status(400).json({
          success: false,
          message: "Type filter must be either 'income' or 'expense'",
        });
      }
      filter.type = type.toLowerCase();
    }

    // Filter by category
    if (category) {
      filter.category = { $regex: new RegExp(`^${category.trim()}$`, 'i') };
    }

    // Filter by date range (supports startDate/endDate or from/to)
    const dateStart = startDate || from;
    const dateEnd = endDate || to;

    if (dateStart || dateEnd) {
      filter.date = {};
      if (dateStart) {
        const parsedStart = new Date(dateStart);
        if (isNaN(parsedStart.getTime())) {
          return res.status(400).json({
            success: false,
            message: 'Invalid start date format',
          });
        }
        filter.date.$gte = parsedStart;
      }
      if (dateEnd) {
        const parsedEnd = new Date(dateEnd);
        if (isNaN(parsedEnd.getTime())) {
          return res.status(400).json({
            success: false,
            message: 'Invalid end date format',
          });
        }
        filter.date.$lte = parsedEnd;
      }
    }

    // Sort by date descending, secondary sort by creation time
    const transactions = await Transaction.find(filter).sort({ date: -1, createdAt: -1 });

    return res.status(200).json({
      success: true,
      count: transactions.length,
      transactions,
    });
  } catch (error) {
    console.error('Error fetching transactions:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve transactions',
      error: error.message,
    });
  }
};

// @desc    Create a new transaction
// @route   POST /api/transactions
// @access  Private
const createTransaction = async (req, res) => {
  try {
    const { type, amount, category, vendorOrClient, date, notes } = req.body;

    // Validation for required fields
    if (!type || amount === undefined || amount === null || !category) {
      return res.status(400).json({
        success: false,
        message: 'Please provide all required fields: type, amount, and category',
      });
    }

    const normalizedType = type.toLowerCase();
    if (!['income', 'expense'].includes(normalizedType)) {
      return res.status(400).json({
        success: false,
        message: "Transaction type must be 'income' or 'expense'",
      });
    }

    const numericAmount = Number(amount);
    if (isNaN(numericAmount) || numericAmount < 0) {
      return res.status(400).json({
        success: false,
        message: 'Amount must be a non-negative number',
      });
    }

    const trimmedCategory = category.trim();
    if (!trimmedCategory) {
      return res.status(400).json({
        success: false,
        message: 'Category cannot be empty',
      });
    }

    let transactionDate = date ? new Date(date) : new Date();
    if (date && isNaN(transactionDate.getTime())) {
      return res.status(400).json({
        success: false,
        message: 'Invalid date format provided',
      });
    }

    const transaction = new Transaction({
      user: req.user.id,
      type: normalizedType,
      amount: numericAmount,
      category: trimmedCategory,
      vendorOrClient: vendorOrClient ? vendorOrClient.trim() : '',
      date: transactionDate,
      notes: notes ? notes.trim() : '',
    });

    const savedTransaction = await transaction.save();

    return res.status(201).json({
      success: true,
      message: 'Transaction created successfully',
      transaction: savedTransaction,
    });
  } catch (error) {
    console.error('Error creating transaction:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to create transaction',
      error: error.message,
    });
  }
};

// @desc    Update an existing transaction by ID
// @route   PUT /api/transactions/:id
// @access  Private
const updateTransaction = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid transaction ID format',
      });
    }

    const transaction = await Transaction.findOne({ _id: id, user: req.user.id });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found',
      });
    }

    const { type, amount, category, vendorOrClient, date, notes } = req.body;

    if (type !== undefined) {
      const normalizedType = type.toLowerCase();
      if (!['income', 'expense'].includes(normalizedType)) {
        return res.status(400).json({
          success: false,
          message: "Transaction type must be 'income' or 'expense'",
        });
      }
      transaction.type = normalizedType;
    }

    if (amount !== undefined) {
      const numericAmount = Number(amount);
      if (isNaN(numericAmount) || numericAmount < 0) {
        return res.status(400).json({
          success: false,
          message: 'Amount must be a non-negative number',
        });
      }
      transaction.amount = numericAmount;
    }

    if (category !== undefined) {
      const trimmedCategory = category.trim();
      if (!trimmedCategory) {
        return res.status(400).json({
          success: false,
          message: 'Category cannot be empty',
        });
      }
      transaction.category = trimmedCategory;
    }

    if (vendorOrClient !== undefined) {
      transaction.vendorOrClient = vendorOrClient.trim();
    }

    if (date !== undefined) {
      const parsedDate = new Date(date);
      if (isNaN(parsedDate.getTime())) {
        return res.status(400).json({
          success: false,
          message: 'Invalid date format provided',
        });
      }
      transaction.date = parsedDate;
    }

    if (notes !== undefined) {
      transaction.notes = notes.trim();
    }

    const updatedTransaction = await transaction.save();

    return res.status(200).json({
      success: true,
      message: 'Transaction updated successfully',
      transaction: updatedTransaction,
    });
  } catch (error) {
    console.error('Error updating transaction:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to update transaction',
      error: error.message,
    });
  }
};

// @desc    Delete a transaction by ID
// @route   DELETE /api/transactions/:id
// @access  Private
const deleteTransaction = async (req, res) => {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid transaction ID format',
      });
    }

    const transaction = await Transaction.findOne({ _id: id, user: req.user.id });

    if (!transaction) {
      return res.status(404).json({
        success: false,
        message: 'Transaction not found',
      });
    }

    await transaction.deleteOne();

    return res.status(200).json({
      success: true,
      message: 'Transaction deleted successfully',
      id,
    });
  } catch (error) {
    console.error('Error deleting transaction:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to delete transaction',
      error: error.message,
    });
  }
};

// @desc    Get transaction analytics (totals, category breakdown, monthly trends)
// @route   GET /api/transactions/analytics
// @access  Private
const getTransactionAnalytics = async (req, res) => {
  try {
    if (!mongoose.Types.ObjectId.isValid(req.user.id)) {
      return res.status(400).json({
        success: false,
        message: 'Invalid user ID format in auth token',
      });
    }

    const userObjectId = new mongoose.Types.ObjectId(req.user.id);
    const { startDate, endDate, from, to, year } = req.query;

    const matchStage = {
      user: userObjectId,
    };

    // Date filtering: year or explicit date range
    if (year) {
      const parsedYear = parseInt(year, 10);
      if (isNaN(parsedYear) || parsedYear < 1970 || parsedYear > 3000) {
        return res.status(400).json({
          success: false,
          message: 'Invalid year format provided',
        });
      }
      matchStage.date = {
        $gte: new Date(Date.UTC(parsedYear, 0, 1, 0, 0, 0, 0)),
        $lte: new Date(Date.UTC(parsedYear, 11, 31, 23, 59, 59, 999)),
      };
    } else {
      const dateStart = startDate || from;
      const dateEnd = endDate || to;

      if (dateStart || dateEnd) {
        matchStage.date = {};
        if (dateStart) {
          const parsedStart = new Date(dateStart);
          if (isNaN(parsedStart.getTime())) {
            return res.status(400).json({
              success: false,
              message: 'Invalid start date format',
            });
          }
          matchStage.date.$gte = parsedStart;
        }
        if (dateEnd) {
          const parsedEnd = new Date(dateEnd);
          if (isNaN(parsedEnd.getTime())) {
            return res.status(400).json({
              success: false,
              message: 'Invalid end date format',
            });
          }
          matchStage.date.$lte = parsedEnd;
        }
      }
    }

    const aggregationPipeline = [
      { $match: matchStage },
      {
        $facet: {
          summary: [
            {
              $group: {
                _id: null,
                totalIncome: {
                  $sum: {
                    $cond: [{ $eq: ['$type', 'income'] }, '$amount', 0],
                  },
                },
                totalExpenses: {
                  $sum: {
                    $cond: [{ $eq: ['$type', 'expense'] }, '$amount', 0],
                  },
                },
                transactionCount: { $sum: 1 },
              },
            },
            {
              $project: {
                _id: 0,
                totalIncome: 1,
                totalExpenses: 1,
                netBalance: { $subtract: ['$totalIncome', '$totalExpenses'] },
                transactionCount: 1,
              },
            },
          ],
          categoryBreakdown: [
            {
              $group: {
                _id: '$category',
                totalAmount: { $sum: '$amount' },
                income: {
                  $sum: {
                    $cond: [{ $eq: ['$type', 'income'] }, '$amount', 0],
                  },
                },
                expenses: {
                  $sum: {
                    $cond: [{ $eq: ['$type', 'expense'] }, '$amount', 0],
                  },
                },
                count: { $sum: 1 },
              },
            },
            { $sort: { totalAmount: -1 } },
            {
              $project: {
                _id: 0,
                category: '$_id',
                totalAmount: 1,
                income: 1,
                expenses: 1,
                count: 1,
              },
            },
          ],
          monthlyTrends: [
            {
              $group: {
                _id: {
                  year: { $year: '$date' },
                  month: { $month: '$date' },
                },
                totalIncome: {
                  $sum: {
                    $cond: [{ $eq: ['$type', 'income'] }, '$amount', 0],
                  },
                },
                totalExpenses: {
                  $sum: {
                    $cond: [{ $eq: ['$type', 'expense'] }, '$amount', 0],
                  },
                },
                count: { $sum: 1 },
              },
            },
            {
              $project: {
                _id: 0,
                year: '$_id.year',
                month: '$_id.month',
                period: {
                  $concat: [
                    { $toString: '$_id.year' },
                    '-',
                    {
                      $cond: [
                        { $lt: ['$_id.month', 10] },
                        { $concat: ['0', { $toString: '$_id.month' }] },
                        { $toString: '$_id.month' },
                      ],
                    },
                  ],
                },
                totalIncome: 1,
                totalExpenses: 1,
                netBalance: { $subtract: ['$totalIncome', '$totalExpenses'] },
                count: 1,
              },
            },
            { $sort: { year: 1, month: 1 } },
          ],
        },
      },
    ];

    const result = await Transaction.aggregate(aggregationPipeline);

    const summary = (result[0]?.summary && result[0].summary[0]) || {
      totalIncome: 0,
      totalExpenses: 0,
      netBalance: 0,
      transactionCount: 0,
    };

    const categoryBreakdown = result[0]?.categoryBreakdown || [];
    const monthlyTrends = result[0]?.monthlyTrends || [];

    return res.status(200).json({
      success: true,
      summary,
      categoryBreakdown,
      monthlyTrends,
    });
  } catch (error) {
    console.error('Error calculating transaction analytics:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to retrieve transaction analytics',
      error: error.message,
    });
  }
};

module.exports = {
  getTransactions,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  getTransactionAnalytics,
};
