require('dotenv').config();
const express = require('express');
const cors = require('cors');
const path = require('path');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json());
app.use(express.static('public'));

// Routes
const chatRoutes = require('./routes/chat');
const adminRoutes = require('./routes/admin');
const voiceRoutes = require('./routes/voice');

app.use('/chat', chatRoutes);
app.use('/admin', adminRoutes);
app.use('/voice', voiceRoutes);

// Demo pages
app.get('/demo/:company', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'demo.html'));
});

// Health check
app.get('/', (req, res) => {
  res.json({ status: 'ok', message: 'ElectricLead Pro is running' });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});