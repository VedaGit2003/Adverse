const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { JWT_SECRET, JWT_EXPIRES_IN } = require('../config/env');

const UserSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Please provide a name'],
      trim: true,
      maxlength: [100, 'Name cannot exceed 100 characters']
    },
    email: {
      type: String,
      required: [true, 'Please provide an email'],
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^\S+@\S+\.\S+$/, 'Please provide a valid email address']
    },
    phone: {
      type: String,
      required: false,
      sparse: true,
      trim: true,
      default: undefined
    },
    passwordHash: {
      type: String,
      required: function () {
        return !this.ssoProvider;
      },
      minlength: [6, 'Password must be at least 6 characters'],
      select: false
    },
    ssoProvider: {
      type: String,
      enum: ['google', 'apple', 'local', null],
      default: null
    },
    ssoId: {
      type: String,
      default: null,
      sparse: true
    },
    avatar: {
      type: String,
      default: ''
    },
    role: {
      type: String,
      enum: ['admin', 'seller', 'customer'],
      default: 'customer',
      required: true
    },
    status: {
      type: String,
      enum: ['active', 'pending_verification', 'suspended'],
      default: function () {
        return this.role === 'seller' ? 'pending_verification' : 'active';
      }
    },
    companyDetails: {
      companyName: { type: String, default: '' },
      gstNumber: { type: String, default: '' },
      tradeLicense: { type: String, default: '' },
      address: { type: String, default: '' }
    }
  },
  { timestamps: true }
);

UserSchema.pre('save', async function (next) {
  if (!this.isModified('passwordHash') || !this.passwordHash) {
    return next();
  }
  const salt = await bcrypt.genSalt(10);
  this.passwordHash = await bcrypt.hash(this.passwordHash, salt);
  next();
});

UserSchema.methods.matchPassword = async function (enteredPassword) {
  if (!this.passwordHash) return false;
  return await bcrypt.compare(enteredPassword, this.passwordHash);
};

UserSchema.methods.getSignedJwtToken = function () {
  return jwt.sign(
    {
      id: this._id,
      role: this.role,
      name: this.name,
      email: this.email,
      avatar: this.avatar || '',
      ssoProvider: this.ssoProvider || null
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
};

module.exports = mongoose.model('User', UserSchema);
