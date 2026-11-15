const path = require('path');
const mongoose = require('mongoose');
const dotenv = require('dotenv');

// Load environment variables (supports local server/.env and root .env)
dotenv.config();
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config({ path: path.resolve(__dirname, '../.env') });

const User = require('../models/User');
const Transaction = require('../models/Transaction');
const Invoice = require('../models/Invoice');

// Helper to compute date offset in days from now
const daysAgo = (days) => {
  const d = new Date();
  d.setDate(d.getDate() - days);
  return d;
};

const daysAhead = (days) => {
  const d = new Date();
  d.setDate(d.getDate() + days);
  return d;
};

// Seed function
async function seedDatabase(options = {}) {
  const isDryRun = options.dryRun || process.argv.includes('--dry-run');
  const mongoUri = process.env.MONGO_URI || 'mongodb://localhost:27017/b2b-expense-tracker';

  console.log('--------------------------------------------------');
  console.log('🌱 B2B Expense Tracker Database Seeder');
  console.log(`🎯 Target Mongo URI: ${mongoUri.replace(/:([^:@]{4})[^:@]*@/, ':****@')}`);
  if (isDryRun) console.log('🔍 Mode: DRY-RUN (Schema validation only, no database connection)');
  console.log('--------------------------------------------------');

  if (!isDryRun) {
    try {
      await mongoose.connect(mongoUri, {
        serverSelectionTimeoutMS: 5000,
      });
      console.log('✅ Connected to MongoDB successfully.');
    } catch (connErr) {
      console.error('\n❌ Could not connect to MongoDB:');
      console.error(`   ${connErr.message}`);
      console.error('\n💡 Troubleshooting:');
      console.error('   1. Ensure your MongoDB service is running (e.g. `sudo systemctl start mongod` or `docker run -p 27017:27017 mongo`)');
      console.error('   2. Or set a valid MONGO_URI (e.g. MongoDB Atlas) in your `.env` file.');
      console.error('   3. Run with `--dry-run` to validate the seed records in-memory: `node server/seed/seedData.js --dry-run`\n');
      process.exit(1);
    }
  }

  try {
    // 1. Find or create default test user
    let user;
    const testEmail = 'test@freelancer.com';

    if (isDryRun) {
      user = new User({
        _id: new mongoose.Types.ObjectId(),
        name: 'Dev Test Freelancer',
        email: testEmail,
        password: 'password123',
      });
      console.log(`👤 [Dry Run] Test User initialized: ${user.email}`);
    } else {
      user = await User.findOne({ email: testEmail });
      if (!user) {
        user = new User({
          name: 'Dev Test Freelancer',
          email: testEmail,
          password: 'password123',
        });
        await user.save();
        console.log(`👤 Created new test user: ${user.email} (password: password123)`);
      } else {
        console.log(`👤 Found existing test user: ${user.email}`);
      }

      // Clean existing seed data for this user to remain idempotent
      await Transaction.deleteMany({ user: user._id });
      await Invoice.deleteMany({ user: user._id });
      console.log('🧹 Cleaned existing records for test user.');
    }

    // 2. Sample Transactions (15 records spanning the last 3 months)
    const sampleTransactions = [
      // --- Current Month (Month 0: ~0-25 days ago) ---
      {
        user: user._id,
        type: 'income',
        amount: 4500.00,
        category: 'Client Project',
        vendorOrClient: 'Acme Corp',
        date: daysAgo(4),
        notes: 'Milestone 2 payment - React frontend & Dashboard build',
      },
      {
        user: user._id,
        type: 'expense',
        amount: 185.50,
        category: 'Software',
        vendorOrClient: 'AWS',
        date: daysAgo(7),
        notes: 'Monthly EC2, S3 & CloudFront production hosting',
      },
      {
        user: user._id,
        type: 'expense',
        amount: 45.00,
        category: 'Subscriptions',
        vendorOrClient: 'DigitalOcean',
        date: daysAgo(12),
        notes: 'App Platform staging cluster and managed Redis',
      },
      {
        user: user._id,
        type: 'expense',
        amount: 120.75,
        category: 'Office Supplies',
        vendorOrClient: 'Amazon Business',
        date: daysAgo(16),
        notes: 'Ergonomic mousepad and desk cable management tools',
      },
      {
        user: user._id,
        type: 'income',
        amount: 2800.00,
        category: 'Client Project',
        vendorOrClient: 'Freelance Client X',
        date: daysAgo(21),
        notes: 'API integration consulting and security review',
      },

      // --- Last Month (Month -1: ~30-60 days ago) ---
      {
        user: user._id,
        type: 'expense',
        amount: 1250.00,
        category: 'Rent',
        vendorOrClient: 'WeWork',
        date: daysAgo(33),
        notes: 'Dedicated desk membership & meeting room credits',
      },
      {
        user: user._id,
        type: 'expense',
        amount: 90.00,
        category: 'Software',
        vendorOrClient: 'GitHub / Copilot',
        date: daysAgo(38),
        notes: 'GitHub Team organization & AI Copilot seat licenses',
      },
      {
        user: user._id,
        type: 'income',
        amount: 3200.00,
        category: 'Client Project',
        vendorOrClient: 'Acme Corp',
        date: daysAgo(43),
        notes: 'Milestone 1 architecture blueprint & wireframe approval',
      },
      {
        user: user._id,
        type: 'expense',
        amount: 450.00,
        category: 'Marketing',
        vendorOrClient: 'Google Cloud / Ads',
        date: daysAgo(50),
        notes: 'Lead generation PPC campaigns for agency services',
      },
      {
        user: user._id,
        type: 'expense',
        amount: 65.25,
        category: 'Subscriptions',
        vendorOrClient: 'Stripe',
        date: daysAgo(56),
        notes: 'Platform merchant and dispute protection fees',
      },

      // --- Two Months Ago (Month -2: ~65-90 days ago) ---
      {
        user: user._id,
        type: 'income',
        amount: 3800.00,
        category: 'Client Project',
        vendorOrClient: 'Freelance Client X',
        date: daysAgo(67),
        notes: 'Full-stack audit and performance optimization retainer',
      },
      {
        user: user._id,
        type: 'expense',
        amount: 1850.00,
        category: 'Hardware',
        vendorOrClient: 'Apple Store',
        date: daysAgo(72),
        notes: 'MacBook Pro M-Series workstation upgrade for client development',
      },
      {
        user: user._id,
        type: 'expense',
        amount: 215.00,
        category: 'Software',
        vendorOrClient: 'AWS',
        date: daysAgo(76),
        notes: 'Database migration and CloudWatch log analytics',
      },
      {
        user: user._id,
        type: 'expense',
        amount: 1250.00,
        category: 'Rent',
        vendorOrClient: 'WeWork',
        date: daysAgo(82),
        notes: 'Co-working office space monthly lease',
      },
      {
        user: user._id,
        type: 'expense',
        amount: 320.00,
        category: 'Marketing',
        vendorOrClient: 'LinkedIn Ads',
        date: daysAgo(87),
        notes: 'B2B sponsored content for agency client acquisition',
      },
    ];

    // Validate and insert transactions
    if (isDryRun) {
      for (const t of sampleTransactions) {
        const doc = new Transaction(t);
        await doc.validate();
      }
      console.log(`📊 [Dry Run] Validated ${sampleTransactions.length} transaction schemas successfully.`);
    } else {
      await Transaction.insertMany(sampleTransactions);
      console.log(`📊 Inserted ${sampleTransactions.length} transaction records across the last 3 months.`);
    }

    // 3. Sample Invoices (4 records with varying statuses and itemized lists)
    const sampleInvoices = [
      {
        user: user._id,
        clientName: 'Acme Corp',
        clientEmail: 'billing@acmecorp.com',
        items: [
          { description: 'Full-Stack Dashboard Development', quantity: 1, price: 3000.00 },
          { description: 'Monthly Cloud Infrastructure Maintenance', quantity: 1, price: 500.00 },
        ],
        totalAmount: 3500.00,
        status: 'Sent',
        dueDate: daysAhead(10),
      },
      {
        user: user._id,
        clientName: 'Freelance Client X',
        clientEmail: 'finance@clientx.io',
        items: [
          { description: 'RESTful API Integration & Testing', quantity: 25, price: 120.00 },
          { description: 'Database Schema Optimization & Indexing', quantity: 10, price: 120.00 },
        ],
        totalAmount: 4200.00,
        status: 'Paid',
        dueDate: daysAgo(14),
      },
      {
        user: user._id,
        clientName: 'TechStart Ventures',
        clientEmail: 'contact@techstart.vc',
        items: [
          { description: 'Q4 Financial Architecture Strategy Consultation', quantity: 12, price: 150.00 },
        ],
        totalAmount: 1800.00,
        status: 'Draft',
        dueDate: daysAhead(25),
      },
      {
        user: user._id,
        clientName: 'Global Retail Group',
        clientEmail: 'ap@globalretail.com',
        items: [
          { description: 'Custom Payment Gateway Integration', quantity: 1, price: 1600.00 },
          { description: 'Production Deployment & SSL Certification', quantity: 1, price: 500.00 },
        ],
        totalAmount: 2100.00,
        status: 'Overdue',
        dueDate: daysAgo(6),
      },
    ];

    // Validate and insert invoices
    if (isDryRun) {
      for (const inv of sampleInvoices) {
        const doc = new Invoice(inv);
        await doc.validate();
      }
      console.log(`🧾 [Dry Run] Validated ${sampleInvoices.length} invoice schemas successfully.`);
    } else {
      await Invoice.insertMany(sampleInvoices);
      console.log(`🧾 Inserted ${sampleInvoices.length} invoice records (Draft, Sent, Paid, Overdue).`);
    }

    console.log('--------------------------------------------------');
    console.log('🎉 Database seeding completed successfully!');
    console.log('--------------------------------------------------');
    console.log('🔑 Login Credentials for Development Testing:');
    console.log(`   Email:    test@freelancer.com`);
    console.log(`   Password: password123`);
    console.log('--------------------------------------------------');
  } catch (err) {
    console.error('❌ Error during seeding:', err);
    throw err;
  } finally {
    if (!isDryRun && mongoose.connection.readyState !== 0) {
      await mongoose.disconnect();
      console.log('🔌 Database connection closed safely.');
    }
  }
}

// Execute when run directly via CLI
if (require.main === module) {
  seedDatabase()
    .then(() => process.exit(0))
    .catch(() => process.exit(1));
}

module.exports = seedDatabase;
