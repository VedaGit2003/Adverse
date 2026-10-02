const mongoose = require('mongoose');
const { connectDB, disconnectDB } = require('./config/db');
const User = require('./models/User');
const Hoarding = require('./models/Hoarding');
const Booking = require('./models/Booking');
const Payment = require('./models/Payment');

const seedData = async () => {
  try {
    await connectDB();
    console.log('🧹 Clearing existing collections for fresh seed...');
    await User.deleteMany({});
    await Hoarding.deleteMany({});
    await Booking.deleteMany({});
    await Payment.deleteMany({});

    console.log('👤 Seeding Users (Admin, Seller, Customer)...');

    const admin = await User.create({
      name: 'Adverse Super Admin',
      email: 'admin@adverse.in',
      phone: '9830000001',
      passwordHash: 'Admin@123',
      role: 'admin',
      status: 'active',
      companyDetails: {
        companyName: 'Adverse Technologies Pvt Ltd',
        gstNumber: '19AAACA1234A1Z5',
        tradeLicense: 'TL-KOL-2026-001',
        address: 'Sector V, Salt Lake, Kolkata, West Bengal - 700091'
      }
    });

    const seller = await User.create({
      name: 'Bengal Outdoor Media Agency',
      email: 'seller@bengalmedia.com',
      phone: '9830000002',
      passwordHash: 'Seller@123',
      role: 'seller',
      status: 'active',
      companyDetails: {
        companyName: 'Bengal Media Networks LLP',
        gstNumber: '19BBBCB5678B1Z2',
        tradeLicense: 'TL-HOW-2024-889',
        address: 'Park Street, Kolkata, West Bengal - 700016'
      }
    });

    const customer = await User.create({
      name: 'Apex Retail Brands',
      email: 'client@brands.com',
      phone: '9830000003',
      passwordHash: 'Client@123',
      role: 'customer',
      status: 'active',
      companyDetails: {
        companyName: 'Apex Consumer Goods Ltd',
        gstNumber: '19CCCC54321C1Z9',
        address: 'Camac Street, Kolkata - 700017'
      }
    });

    console.log('📍 Seeding Prime West Bengal Hoarding Inventory...');

    const sampleHoardings = [
      {
        sellerId: seller._id,
        title: 'Park Street Flyover Mega Unipole',
        description: 'Prime arterial view towards Chowringhee & Camac Street with massive vehicular density and VIP audience.',
        hoardingType: 'Unipole',
        lightingType: 'Frontlit',
        dimensions: { width: 40, height: 20, unit: 'feet' },
        location: {
          address: 'Opposite Allen Park, Park Street Crossing',
          city: 'Kolkata',
          district: 'Kolkata',
          landmark: 'Allen Park / Camac St Corner',
          pincode: '700016',
          geo: { type: 'Point', coordinates: [88.3527, 22.5532] }
        },
        pricing: {
          baseRatePerMonth: 185000,
          baseRatePerDay: 6500,
          minimumBookingDays: 15,
          printingCostEstimate: 14000,
          mountingCostEstimate: 5000
        },
        photos: [
          'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80',
          'https://images.unsplash.com/photo-1517245386807-bb43f82c33c4?auto=format&fit=crop&w=1200&q=80'
        ],
        availabilityStatus: 'available',
        isApprovedByAdmin: true
      },
      {
        sellerId: seller._id,
        title: 'Salt Lake Sector V Technopolis LED Digital Wall',
        description: 'Dynamic digital screen situated at the heart of Kolkata IT hub. Captures daily commuters and corporate professionals.',
        hoardingType: 'LED Digital Screen',
        lightingType: 'Digital/LED',
        dimensions: { width: 30, height: 15, unit: 'feet' },
        location: {
          address: 'BP Block, Sector V, Bidhannagar',
          city: 'Kolkata',
          district: 'North 24 Parganas',
          landmark: 'Beside Technopolis Building',
          pincode: '700091',
          geo: { type: 'Point', coordinates: [88.4312, 22.5804] }
        },
        pricing: {
          baseRatePerMonth: 220000,
          baseRatePerDay: 8000,
          minimumBookingDays: 7,
          printingCostEstimate: 0,
          mountingCostEstimate: 0
        },
        photos: [
          'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=1200&q=80',
          'https://images.unsplash.com/photo-1519389950473-47ba0277781c?auto=format&fit=crop&w=1200&q=80'
        ],
        availabilityStatus: 'available',
        isApprovedByAdmin: true
      },
      {
        sellerId: seller._id,
        title: 'EM Bypass Ruby Crossing Double-Sided Billboard',
        description: 'Major junction connecting South Kolkata to Airport & Rajarhat. Both-way traffic visibility 24/7.',
        hoardingType: 'Billboard',
        lightingType: 'Backlit',
        dimensions: { width: 50, height: 25, unit: 'feet' },
        location: {
          address: 'EM Bypass, Kasba Golpark / Ruby Hospital Junction',
          city: 'Kolkata',
          district: 'South 24 Parganas',
          landmark: 'Ruby Hospital Crossing',
          pincode: '700107',
          geo: { type: 'Point', coordinates: [88.3995, 22.5134] }
        },
        pricing: {
          baseRatePerMonth: 160000,
          baseRatePerDay: 5800,
          minimumBookingDays: 15,
          printingCostEstimate: 16000,
          mountingCostEstimate: 6000
        },
        photos: [
          'https://images.unsplash.com/photo-1563986768609-322da13575f3?auto=format&fit=crop&w=1200&q=80'
        ],
        availabilityStatus: 'available',
        isApprovedByAdmin: true
      },
      {
        sellerId: seller._id,
        title: 'Howrah Station Approach Flyover Gantry',
        description: 'Highest footfall and vehicular entry point from Howrah Railway Station into Kolkata city center.',
        hoardingType: 'Gantry',
        lightingType: 'Frontlit',
        dimensions: { width: 60, height: 20, unit: 'feet' },
        location: {
          address: 'Station Road, Howrah Bridge Approach',
          city: 'Howrah',
          district: 'Howrah',
          landmark: 'Near Howrah Bus Stand & Station Entry',
          pincode: '711101',
          geo: { type: 'Point', coordinates: [88.3426, 22.5855] }
        },
        pricing: {
          baseRatePerMonth: 250000,
          baseRatePerDay: 9000,
          minimumBookingDays: 30,
          printingCostEstimate: 20000,
          mountingCostEstimate: 7500
        },
        photos: [
          'https://images.unsplash.com/photo-1579783902614-a3fb3927b675?auto=format&fit=crop&w=1200&q=80'
        ],
        availabilityStatus: 'available',
        isApprovedByAdmin: true
      },
      {
        sellerId: seller._id,
        title: 'Siliguri Mallaguri Junction Highway Unipole',
        description: 'Gateway to Sikkim, Dooars and North Bengal. Located on Hill Cart Road junction with round-the-clock commercial traffic.',
        hoardingType: 'Unipole',
        lightingType: 'Frontlit',
        dimensions: { width: 35, height: 20, unit: 'feet' },
        location: {
          address: 'Hill Cart Road, Mallaguri',
          city: 'Siliguri',
          district: 'Darjeeling',
          landmark: 'Mallaguri Police Outpost',
          pincode: '734003',
          geo: { type: 'Point', coordinates: [88.4215, 26.7212] }
        },
        pricing: {
          baseRatePerMonth: 95000,
          baseRatePerDay: 3500,
          minimumBookingDays: 15,
          printingCostEstimate: 11000,
          mountingCostEstimate: 4000
        },
        photos: [
          'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=1200&q=80'
        ],
        availabilityStatus: 'available',
        isApprovedByAdmin: true
      },
      {
        sellerId: seller._id,
        title: 'Durgapur City Centre Junction Billboard',
        description: 'Prominently placed in the retail and commercial epicenter of Durgapur industrial belt.',
        hoardingType: 'Billboard',
        lightingType: 'Backlit',
        dimensions: { width: 40, height: 20, unit: 'feet' },
        location: {
          address: 'City Centre, Near Junction Mall',
          city: 'Durgapur',
          district: 'Paschim Bardhaman',
          landmark: 'City Centre Bus Terminal',
          pincode: '713216',
          geo: { type: 'Point', coordinates: [87.3119, 23.5204] }
        },
        pricing: {
          baseRatePerMonth: 85000,
          baseRatePerDay: 3000,
          minimumBookingDays: 15,
          printingCostEstimate: 10000,
          mountingCostEstimate: 3500
        },
        photos: [
          'https://images.unsplash.com/photo-1513151233558-d860c5398176?auto=format&fit=crop&w=1200&q=80'
        ],
        availabilityStatus: 'available',
        isApprovedByAdmin: true
      }
    ];

    const createdHoardings = await Hoarding.insertMany(sampleHoardings);
    console.log(`✅ Seeded ${createdHoardings.length} prime hoardings across West Bengal.`);

    console.log('📝 Seeding Sample Booking & Payment Workflow...');
    const bookedHoarding = createdHoardings[0];
    const startDate = new Date();
    const endDate = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    const sampleBooking = await Booking.create({
      bookingNumber: 'BK-WB-2026-1001',
      hoardingId: bookedHoarding._id,
      customerId: customer._id,
      sellerId: seller._id,
      startDate,
      endDate,
      durationDays: 30,
      rentAmount: 185000,
      printingAmount: 14000,
      mountingAmount: 5000,
      totalAmount: 204000,
      bookingType: 'offline',
      bookingStatus: 'confirmed',
      paymentStatus: 'paid',
      campaignName: 'Durga Puja Mega Sale 2026',
      creativeUrl: 'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80',
      clientNotes: 'Paid through HDFC Cheque. Verified by Bengal Media accounts desk.'
    });

    await Payment.create({
      bookingId: sampleBooking._id,
      customerId: customer._id,
      sellerId: seller._id,
      amount: 204000,
      paymentMode: 'cheque',
      paymentStatus: 'verified',
      offlineDetails: {
        transactionReference: 'CHQ-HDFC-992817',
        bankName: 'HDFC Bank, Park Circus Branch',
        receiptImageUrl: '',
        paymentDate: new Date(),
        verifiedBy: seller._id,
        verifiedAt: new Date(),
        verificationNotes: 'Cheque cleared in SBI current account.'
      }
    });

    console.log('🎉 Database seeding completed successfully!');
    console.log('\n--- Test Credentials ---');
    console.log('👑 Admin:    admin@adverse.in        / Admin@123');
    console.log('🏢 Seller:   seller@bengalmedia.com  / Seller@123');
    console.log('🛍️ Customer: client@brands.com       / Client@123');
    console.log('------------------------\n');

    await disconnectDB();
    process.exit(0);
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
};

seedData();
