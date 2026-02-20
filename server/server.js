const express = require('express');
const cors = require('cors');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Import database configuration
const database = require('./config/database');
const { dbTargetContextMiddleware, DB_TARGET_HEADER, getCurrentDbTarget } = database;

// Import routes
const authRoutes = require('./routes/auth');
const usersRoutes = require('./routes/users');
const faqsRoutes = require('./routes/faqs');
const pricingRoutes = require('./routes/pricing');
const blogsRoutes = require('./routes/blogs');
const uploadRoutes = require('./routes/upload');
const errorHandler = require('./middleware/errorHandler');

// Middleware


app.use(cors({
  origin: "*",
  methods: ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization", DB_TARGET_HEADER],
}));

// Handle preflight safely
app.use((req, res, next) => {
  res.header("Access-Control-Allow-Origin", "*");
  res.header("Access-Control-Allow-Methods", "GET, POST, PUT, DELETE, OPTIONS");
  res.header("Access-Control-Allow-Headers", `Content-Type, Authorization, ${DB_TARGET_HEADER}`);
  if (req.method === "OPTIONS") {
    return res.sendStatus(200);
  }
  next();
});// ✅ allow all preflight requests

app.use(express.json({ limit: '20mb' }));
app.use(express.urlencoded({ limit: '20mb', extended: true }));
app.use(dbTargetContextMiddleware);

// Test database connection
app.get('/api/test-db', async (req, res) => {
  try {
    const connection = await database.getConnection();
    const selectedDbTarget = getCurrentDbTarget();
    console.log(`Database connected successfully (${selectedDbTarget})`);
    connection.release();
    res.json({
      message: 'Database connected successfully',
      dbTarget: selectedDbTarget
    });
  } catch (error) {
    console.error('Database connection failed:', error);
    res.status(500).json({
      success: false,
      error: error.message || 'Database connection failed'
    });
  }
});


// API routes
app.use('/api/auth', authRoutes);
app.use('/api/users', usersRoutes);
app.use('/api/faqs', faqsRoutes);
app.use('/api/pricing', pricingRoutes);
app.use('/api/blogs', blogsRoutes);
app.use('/api/upload', uploadRoutes);


// Basic health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'OK',
    message: 'Server is running',
    timestamp: new Date().toISOString()
  });
});

// 404 handler for API routes - FIXED: Use parameter instead of *
app.use('/api/:any', (req, res) => {
  res.status(404).json({ error: 'API endpoint not found' });
});

// Root endpoint
app.get('/', (req, res) => {
  res.json({
    message: 'Quiz App API Server',
    version: '1.0.0',
    endpoints: {
      health: '/api/health',
      testDb: '/api/test-db',
      auth: '/api/auth',
    }
  });
});

// Error handling middleware
app.use(errorHandler);


app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
