const User = require('../models/User');
const Hoarding = require('../models/Hoarding');

const autoSeed = async () => {
  try {
    const userCount = await User.countDocuments();
    if (userCount > 0) {
      return;
    }

    console.log('🌱 No users found in database. Auto-seeding test accounts and hoardings...');

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
          'https://images.unsplash.com/photo-1542751371-adc38448a05e?auto=format&fit=crop&w=1200&q=80'
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
          'https://images.unsplash.com/photo-1509198397868-475647b2a1e5?auto=format&fit=crop&w=1200&q=80'
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
        description: 'Gateway to Sikkim, Dooars and North Bengal. Located on Hill Cart Road junction.',
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
        title: 'EM Bypass Ruby Crossing Double-Sided Billboard',
        description: 'Major junction connecting South Kolkata to Airport & Rajarhat. Both-way traffic visibility 24/7.',
        hoardingType: 'Billboard',
        lightingType: 'Backlit',
        dimensions: { width: 50, height: 25, unit: 'feet' },
        location: {
          address: 'EM Bypass, Kasba Golpark',
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

    await Hoarding.insertMany(sampleHoardings);
    console.log('✅ Auto-seed completed! Seeded 3 test users and 6 prime hoardings.');
  } catch (error) {
    console.warn('⚠️ Auto-seed notice:', error.message);
  }
};

module.exports = autoSeed;
