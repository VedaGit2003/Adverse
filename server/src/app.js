const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const path = require('path');

const authRoutes = require('./modules/auth/auth.routes');
const hoardingRoutes = require('./modules/hoardings/hoarding.routes');
const bookingRoutes = require('./modules/bookings/booking.routes');
const paymentRoutes = require('./modules/payments/payment.routes');
const adminRoutes = require('./modules/admin/admin.routes');
const uploadRoutes = require('./modules/upload/upload.routes');

const { notFoundHandler, errorHandler } = require('./middlewares/error.middleware');

const app = express();

app.use(helmet({ crossOriginResourcePolicy: false }));
app.use(cors({ origin: '*' }));
app.use(morgan('dev'));
app.use(express.json({ limit: '15mb' }));
app.use(express.urlencoded({ extended: true, limit: '15mb' }));

app.use('/uploads', express.static(path.resolve(__dirname, '../uploads')));

app.get('/api/health', (req, res) => {
  res.status(200).json({
    status: 'online',
    timestamp: new Date().toISOString(),
    service: 'Adverse OOH Hoarding Rental Engine',
    region: 'West Bengal, India'
  });
});

app.use('/api/auth', authRoutes);
app.use('/api/hoardings', hoardingRoutes);
app.use('/api/bookings', bookingRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/upload', uploadRoutes);

app.use(notFoundHandler);
app.use(errorHandler);

module.exports = app;
