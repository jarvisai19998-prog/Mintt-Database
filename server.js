require('dotenv').config();
const express = require('express');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

const allowedOrigins = (process.env.ALLOWED_ORIGINS || 'https://mintt.ca,https://mintt-database-production.up.railway.app').split(',');
app.use(cors({
  origin: (origin, cb) => {
    if (!origin || allowedOrigins.includes(origin)) return cb(null, true);
    cb(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, max: 20, standardHeaders: true, legacyHeaders: false });
const chatLimiter = rateLimit({ windowMs: 60 * 1000, max: 30, standardHeaders: true, legacyHeaders: false });

// Stripe webhook must be mounted BEFORE express.json() to receive raw body
const stripeRoutes = require('./routes/stripe-webhook');
app.use('/stripe', stripeRoutes);

app.use(express.json());
app.get('/login.html', (req, res) => res.sendFile(path.join(__dirname, 'public', 'login.html')));
app.get('/login',     (req, res) => res.redirect('/login.html'));
app.get('/signup',    (req, res) => res.redirect('/login.html?signup=1'));
app.get('/dashboard', (req, res) => res.redirect('/admin.html'));
app.use(express.static('public'));

// Routes
const chatRoutes = require('./routes/chat');
const adminRoutes = require('./routes/admin');
const voiceRoutes = require('./routes/voice');
const authRoutes = require('./routes/auth');
const dashboardRoutes = require('./routes/dashboard');

app.use('/chat', chatLimiter, chatRoutes);
app.use('/admin', adminRoutes);
app.use('/voice', voiceRoutes);
app.use('/auth', authLimiter, authRoutes);
app.use('/dashboard', dashboardRoutes);

// Demo pages
app.get('/demo/:company', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'demo.html'));
});

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'Mintt is running' });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
