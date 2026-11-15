const { Parser } = require('json2csv');
const PDFDocument = require('pdfkit');
const Transaction = require('../models/Transaction');
const User = require('../models/User');

// Helper to format currency
const formatCurrency = (num) => {
  return `$${Number(num || 0).toLocaleString('en-US', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
};

// Helper to format date
const formatDate = (date) => {
  if (!date) return 'N/A';
  return new Date(date).toISOString().split('T')[0];
};

// @desc    Export transactions to CSV
// @route   GET /api/export/csv
// @access  Private
const exportTransactionsCSV = async (req, res) => {
  try {
    const { category, type, startDate, endDate, from, to } = req.query;

    const filter = { user: req.user.id };

    if (type) {
      filter.type = type.toLowerCase();
    }

    if (category) {
      filter.category = { $regex: new RegExp(`^${category.trim()}$`, 'i') };
    }

    const dateStart = startDate || from;
    const dateEnd = endDate || to;

    if (dateStart || dateEnd) {
      filter.date = {};
      if (dateStart) filter.date.$gte = new Date(dateStart);
      if (dateEnd) filter.date.$lte = new Date(dateEnd);
    }

    const transactions = await Transaction.find(filter).sort({ date: -1, createdAt: -1 });

    const csvData = transactions.map((t) => ({
      ID: t._id.toString(),
      Date: formatDate(t.date),
      Type: t.type ? t.type.toUpperCase() : '',
      Category: t.category,
      'Vendor / Client': t.vendorOrClient || '',
      'Amount ($)': Number(t.amount).toFixed(2),
      Notes: t.notes || '',
    }));

    const fields = [
      'Date',
      'Type',
      'Category',
      'Vendor / Client',
      'Amount ($)',
      'Notes',
      'ID',
    ];

    const json2csvParser = new Parser({ fields });
    const csv = json2csvParser.parse(csvData);

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=expenses-report.csv'
    );

    return res.status(200).send(csv);
  } catch (error) {
    console.error('Error exporting CSV:', error);
    return res.status(500).json({
      success: false,
      message: 'Failed to generate CSV export',
      error: error.message,
    });
  }
};

// @desc    Export transactions and financial summary to PDF
// @route   GET /api/export/pdf
// @access  Private
const exportTransactionsPDF = async (req, res) => {
  try {
    const { startDate, endDate, from, to, type, category } = req.query;

    const filter = { user: req.user.id };

    if (type) filter.type = type.toLowerCase();
    if (category) filter.category = { $regex: new RegExp(`^${category.trim()}$`, 'i') };

    const dateStart = startDate || from;
    const dateEnd = endDate || to;

    if (dateStart || dateEnd) {
      filter.date = {};
      if (dateStart) filter.date.$gte = new Date(dateStart);
      if (dateEnd) filter.date.$lte = new Date(dateEnd);
    }

    // Fetch transactions & user info
    const [transactions, user] = await Promise.all([
      Transaction.find(filter).sort({ date: -1, createdAt: -1 }),
      User.findById(req.user.id).select('name email'),
    ]);

    // Calculate totals
    let totalIncome = 0;
    let totalExpenses = 0;

    transactions.forEach((t) => {
      if (t.type === 'income') {
        totalIncome += t.amount;
      } else if (t.type === 'expense') {
        totalExpenses += t.amount;
      }
    });

    const netBalance = totalIncome - totalExpenses;

    // Create PDF Document
    const doc = new PDFDocument({ margin: 40, size: 'A4' });

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      'attachment; filename=financial-report.pdf'
    );

    doc.pipe(res);

    // Header styling
    doc
      .fillColor('#1e293b')
      .fontSize(20)
      .font('Helvetica-Bold')
      .text('B2B EXPENSE TRACKER', 40, 40);

    doc
      .fontSize(10)
      .font('Helvetica')
      .fillColor('#64748b')
      .text('FINANCIAL STATEMENT & TRANSACTION REPORT', 40, 65);

    // Meta details (right aligned)
    const generatedDate = new Date().toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });

    doc
      .fontSize(9)
      .fillColor('#475569')
      .text(`Generated: ${generatedDate}`, 380, 45, { align: 'right' })
      .text(`Account: ${user?.name || 'Authorized User'}`, 380, 58, { align: 'right' })
      .text(`Email: ${user?.email || 'N/A'}`, 380, 71, { align: 'right' });

    doc.moveTo(40, 90).lineTo(555, 90).strokeColor('#e2e8f0').lineWidth(1).stroke();

    // Summary Cards (Totals)
    const cardY = 105;
    const cardWidth = 160;
    const cardHeight = 55;

    // Income Box
    doc
      .roundedRect(40, cardY, cardWidth, cardHeight, 6)
      .fillColor('#f0fdf4')
      .fill()
      .strokeColor('#bbf7d0')
      .lineWidth(1)
      .stroke();

    doc
      .fillColor('#15803d')
      .fontSize(9)
      .font('Helvetica-Bold')
      .text('TOTAL INCOME', 52, cardY + 10);
    doc
      .fillColor('#166534')
      .fontSize(14)
      .font('Helvetica-Bold')
      .text(formatCurrency(totalIncome), 52, cardY + 26);

    // Expenses Box
    doc
      .roundedRect(210, cardY, cardWidth, cardHeight, 6)
      .fillColor('#fff1f2')
      .fill()
      .strokeColor('#fecdd3')
      .lineWidth(1)
      .stroke();

    doc
      .fillColor('#b91c1c')
      .fontSize(9)
      .font('Helvetica-Bold')
      .text('TOTAL EXPENSES', 222, cardY + 10);
    doc
      .fillColor('#991b1b')
      .fontSize(14)
      .font('Helvetica-Bold')
      .text(formatCurrency(totalExpenses), 222, cardY + 26);

    // Net Balance Box
    const netBg = netBalance >= 0 ? '#eef2ff' : '#fef3c7';
    const netBorder = netBalance >= 0 ? '#c7d2fe' : '#fde68a';
    const netColor = netBalance >= 0 ? '#3730a3' : '#92400e';

    doc
      .roundedRect(380, cardY, cardWidth, cardHeight, 6)
      .fillColor(netBg)
      .fill()
      .strokeColor(netBorder)
      .lineWidth(1)
      .stroke();

    doc
      .fillColor(netColor)
      .fontSize(9)
      .font('Helvetica-Bold')
      .text('NET BALANCE', 392, cardY + 10);
    doc
      .fillColor(netColor)
      .fontSize(14)
      .font('Helvetica-Bold')
      .text(formatCurrency(netBalance), 392, cardY + 26);

    // Table Header
    const tableTop = 180;
    const printTableHeader = (y) => {
      doc
        .rect(40, y, 515, 22)
        .fillColor('#f8fafc')
        .fill()
        .strokeColor('#cbd5e1')
        .lineWidth(0.5)
        .stroke();

      doc
        .fillColor('#334155')
        .fontSize(8.5)
        .font('Helvetica-Bold')
        .text('DATE', 48, y + 6)
        .text('TYPE', 125, y + 6)
        .text('CATEGORY', 185, y + 6)
        .text('VENDOR / CLIENT', 305, y + 6)
        .text('AMOUNT', 480, y + 6, { align: 'right', width: 65 });
    };

    printTableHeader(tableTop);

    let currentY = tableTop + 23;
    const rowHeight = 20;

    doc.font('Helvetica').fontSize(8);

    if (transactions.length === 0) {
      doc
        .fillColor('#64748b')
        .text('No transactions recorded for the selected period.', 48, currentY + 12);
    } else {
      transactions.forEach((t, i) => {
        // Page break if nearing bottom margin
        if (currentY + rowHeight > 760) {
          doc.addPage();
          printTableHeader(40);
          currentY = 63;
          doc.font('Helvetica').fontSize(8);
        }

        // Zebra striping
        if (i % 2 === 1) {
          doc.rect(40, currentY, 515, rowHeight).fillColor('#fbfcfd').fill();
        }

        const isIncome = t.type === 'income';
        const typeColor = isIncome ? '#16a34a' : '#dc2626';

        doc
          .fillColor('#334155')
          .text(formatDate(t.date), 48, currentY + 5)
          .fillColor(typeColor)
          .text(t.type ? t.type.toUpperCase() : '', 125, currentY + 5)
          .fillColor('#334155')
          .text(t.category || '', 185, currentY + 5, { width: 110, ellipsis: true })
          .fillColor('#64748b')
          .text(t.vendorOrClient || '—', 305, currentY + 5, { width: 165, ellipsis: true })
          .fillColor(isIncome ? '#16a34a' : '#0f172a')
          .font('Helvetica-Bold')
          .text(
            `${isIncome ? '+' : '-'}${formatCurrency(t.amount)}`,
            480,
            currentY + 5,
            { align: 'right', width: 65 }
          )
          .font('Helvetica');

        // Light bottom divider
        doc
          .moveTo(40, currentY + rowHeight)
          .lineTo(555, currentY + rowHeight)
          .strokeColor('#f1f5f9')
          .lineWidth(0.5)
          .stroke();

        currentY += rowHeight;
      });
    }

    // Document Footer
    doc
      .fontSize(8)
      .fillColor('#94a3b8')
      .text(
        `Total Records: ${transactions.length}  |  Generated by B2B Expense Tracker  |  Confidential`,
        40,
        790,
        { align: 'center', width: 515 }
      );

    doc.end();
  } catch (error) {
    console.error('Error generating PDF report:', error);
    if (!res.headersSent) {
      return res.status(500).json({
        success: false,
        message: 'Failed to generate PDF export',
        error: error.message,
      });
    }
  }
};

module.exports = {
  exportTransactionsCSV,
  exportTransactionsPDF,
};
