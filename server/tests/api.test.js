const request = require('supertest');
const mongoose = require('mongoose');
const { MongoMemoryServer } = require('mongodb-memory-server');
const app = require('../src/app');
const User = require('../src/models/User');
const Hoarding = require('../src/models/Hoarding');
const Booking = require('../src/models/Booking');

let mongoServer;
let adminToken, sellerToken, customerToken;
let sellerId, customerId;
let sampleHoardingId;

beforeAll(async () => {
  mongoServer = await MongoMemoryServer.create();
  const uri = mongoServer.getUri();
  await mongoose.connect(uri);

  // Setup test users
  const adminRes = await request(app).post('/api/auth/register').send({
    name: 'Admin Tester',
    email: 'admin.test@adverse.in',
    phone: '9999900001',
    password: 'Password@123',
    role: 'admin'
  });
  adminToken = adminRes.body.token;

  const sellerRes = await request(app).post('/api/auth/register').send({
    name: 'Bengal Media Tester',
    email: 'seller.test@bengalmedia.in',
    phone: '9999900002',
    password: 'Password@123',
    role: 'seller'
  });
  sellerToken = sellerRes.body.token;
  sellerId = sellerRes.body.user.id;

  const customerRes = await request(app).post('/api/auth/register').send({
    name: 'Kolkata Advertiser Tester',
    email: 'customer.test@adverse.in',
    phone: '9999900003',
    password: 'Password@123',
    role: 'customer'
  });
  customerToken = customerRes.body.token;
  customerId = customerRes.body.user.id;
});

afterAll(async () => {
  await mongoose.disconnect();
  await mongoServer.stop();
});

describe('1. Health and Authentication API', () => {
  it('GET /api/health returns online status', async () => {
    const res = await request(app).get('/api/health');
    expect(res.status).toBe(200);
    expect(res.body.status).toBe('online');
    expect(res.body.region).toContain('West Bengal');
  });

  it('POST /api/auth/login succeeds with valid credentials', async () => {
    const res = await request(app).post('/api/auth/login').send({
      email: 'seller.test@bengalmedia.in',
      password: 'Password@123'
    });
    expect(res.status).toBe(200);
    expect(res.body.token).toBeDefined();
    expect(res.body.user.role).toBe('seller');
  });

  it('GET /api/auth/me returns current authenticated user profile', async () => {
    const res = await request(app)
      .get('/api/auth/me')
      .set('Authorization', `Bearer ${customerToken}`);
    expect(res.status).toBe(200);
    expect(res.body.user.email).toBe('customer.test@adverse.in');
  });
});

describe('2. Hoarding Catalog & Geospatial Search API', () => {
  it('POST /api/hoardings creates a new hoarding site as Seller', async () => {
    const res = await request(app)
      .post('/api/hoardings')
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({
        title: 'Park Street Flyover Test Unipole',
        description: 'Prime site with massive vehicular traffic',
        hoardingType: 'Unipole',
        lightingType: 'Frontlit',
        dimensions: { width: 40, height: 20 },
        location: {
          address: 'Allen Park, Park Street',
          city: 'Kolkata',
          pincode: '700016',
          geo: { coordinates: [88.3527, 22.5532] }
        },
        pricing: {
          baseRatePerMonth: 180000,
          baseRatePerDay: 6000,
          minimumBookingDays: 15,
          printingCostEstimate: 12000,
          mountingCostEstimate: 5000
        }
      });

    expect(res.status).toBe(201);
    expect(res.body.hoarding._id).toBeDefined();
    sampleHoardingId = res.body.hoarding._id;
  });

  it('GET /api/hoardings/nearby resolves West Bengal location and finds nearby hoardings', async () => {
    const res = await request(app)
      .get('/api/hoardings/nearby?location=Park+Street&radius=10');

    expect(res.status).toBe(200);
    expect(res.body.hoardings.length).toBeGreaterThan(0);
    expect(res.body.hoardings[0].title).toContain('Park Street');
    expect(res.body.hoardings[0].distanceKm).toBeDefined();
  });
});

describe('3. Booking Engine & Date Conflict Resolution', () => {
  let bookingId;

  it('POST /api/bookings successfully creates an offline booking with pending payment', async () => {
    const startDate = new Date();
    const endDate = new Date(Date.now() + 20 * 24 * 60 * 60 * 1000);

    const res = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        hoardingId: sampleHoardingId,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        bookingType: 'offline',
        paymentMode: 'cheque',
        transactionReference: 'CHQ-TEST-881920',
        bankName: 'HDFC Bank Kolkata',
        campaignName: 'Pujor Shuru 2026'
      });

    expect(res.status).toBe(201);
    expect(res.body.booking.bookingNumber).toBeDefined();
    expect(res.body.payment.paymentMode).toBe('cheque');
    expect(res.body.payment.paymentStatus).toBe('pending');
    bookingId = res.body.booking._id;
  });

  it('PUT /api/bookings/:id/status updates booking to confirmed', async () => {
    const res = await request(app)
      .put(`/api/bookings/${bookingId}/status`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({ bookingStatus: 'confirmed' });

    expect(res.status).toBe(200);
    expect(res.body.booking.bookingStatus).toBe('confirmed');
  });

  it('POST /api/bookings rejects overlapping booking on same hoarding with HTTP 409', async () => {
    const startDate = new Date(Date.now() + 5 * 24 * 60 * 60 * 1000);
    const endDate = new Date(Date.now() + 25 * 24 * 60 * 60 * 1000);

    const res = await request(app)
      .post('/api/bookings')
      .set('Authorization', `Bearer ${customerToken}`)
      .send({
        hoardingId: sampleHoardingId,
        startDate: startDate.toISOString(),
        endDate: endDate.toISOString(),
        bookingType: 'offline'
      });

    expect(res.status).toBe(409);
    expect(res.body.message).toContain('already booked');
  });
});

describe('4. Offline Payment Verification Cycle', () => {
  it('PUT /api/payments/:id/verify allows Seller to verify offline payment and confirm booking', async () => {
    // Fetch payment record
    const payRes = await request(app)
      .get('/api/payments')
      .set('Authorization', `Bearer ${sellerToken}`);

    expect(payRes.status).toBe(200);
    expect(payRes.body.payments.length).toBeGreaterThan(0);

    const targetPayment = payRes.body.payments[0];

    const verifyRes = await request(app)
      .put(`/api/payments/${targetPayment._id}/verify`)
      .set('Authorization', `Bearer ${sellerToken}`)
      .send({ verificationNotes: 'Cheque cleared in bank account' });

    expect(verifyRes.status).toBe(200);
    expect(verifyRes.body.payment.paymentStatus).toBe('verified');
    expect(verifyRes.body.booking.bookingStatus).toBe('confirmed');
  });
});

describe('5. Admin Analytics & Control', () => {
  it('GET /api/admin/metrics returns system-wide metrics for Admin', async () => {
    const res = await request(app)
      .get('/api/admin/metrics')
      .set('Authorization', `Bearer ${adminToken}`);

    expect(res.status).toBe(200);
    expect(res.body.metrics.users.total).toBe(3);
    expect(res.body.metrics.hoardings.total).toBeGreaterThanOrEqual(1);
    expect(res.body.metrics.bookings.total).toBeGreaterThanOrEqual(1);
  });
});
