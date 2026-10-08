const User = require('../../models/User');

exports.register = async (req, res, next) => {
  try {
    const { name, email, phone, password, role, companyDetails } = req.body;
    const validRoles = ['customer', 'seller', 'admin'];
    const assignedRole = role && validRoles.includes(role.toLowerCase()) ? role.toLowerCase() : 'customer';

    const existingUser = await User.findOne({
      $or: [{ email: email.toLowerCase() }, { phone }]
    });

    if (existingUser) {
      return res.status(400).json({
        success: false,
        message: 'A user with this email or phone number already exists.'
      });
    }

    const user = await User.create({
      name,
      email: email.toLowerCase(),
      phone,
      passwordHash: password,
      role: assignedRole,
      status: assignedRole === 'seller' ? 'pending_verification' : 'active',
      companyDetails: companyDetails || {}
    });

    const token = user.getSignedJwtToken();

    res.status(201).json({
      success: true,
      message: assignedRole === 'seller'
        ? 'Seller account created! Your profile is pending Admin approval before you can enlist hoardings.'
        : 'Account created successfully.',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        status: user.status,
        companyDetails: user.companyDetails
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both email and password.'
      });
    }

    const user = await User.findOne({ email: email.toLowerCase() }).select('+passwordHash');
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    const isMatch = await user.matchPassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password.'
      });
    }

    if (user.status === 'suspended') {
      return res.status(403).json({
        success: false,
        message: 'Your account is suspended. Please contact customer support.'
      });
    }

    const token = user.getSignedJwtToken();

    res.status(200).json({
      success: true,
      message: 'Logged in successfully.',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        status: user.status,
        companyDetails: user.companyDetails
      }
    });
  } catch (error) {
    next(error);
  }
};

exports.getMe = async (req, res, next) => {
  try {
    let user = await User.findById(req.user.id || req.user._id);
    if (!user && req.user.email) {
      user = await User.findOne({ email: req.user.email });
    }
    res.status(200).json({ success: true, user: user || req.user });
  } catch (error) {
    next(error);
  }
};

exports.updateProfile = async (req, res, next) => {
  try {
    const fieldsToUpdate = {};
    if (req.body.name) fieldsToUpdate.name = req.body.name;
    if (req.body.phone) fieldsToUpdate.phone = req.body.phone;
    if (req.body.companyDetails) fieldsToUpdate.companyDetails = req.body.companyDetails;

    const user = await User.findByIdAndUpdate(req.user.id, fieldsToUpdate, {
      new: true,
      runValidators: true
    });

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully.',
      user
    });
  } catch (error) {
    next(error);
  }
};

exports.ssoLogin = async (req, res, next) => {
  try {
    const { provider = 'google', ssoId, email, name, avatar, role, companyDetails } = req.body;

    if (!email) {
      return res.status(400).json({
        success: false,
        message: 'Email address is required for SSO authentication.'
      });
    }

    const normalizedEmail = email.toLowerCase().trim();
    let user = await User.findOne({ email: normalizedEmail });

    if (!user && ssoId) {
      user = await User.findOne({ ssoProvider: provider, ssoId });
    }

    if (user) {
      if (user.status === 'suspended') {
        return res.status(403).json({
          success: false,
          message: 'Your account is suspended. Please contact customer support.'
        });
      }

      // Link SSO info if not already linked
      let updated = false;
      if (!user.ssoProvider) {
        user.ssoProvider = provider;
        updated = true;
      }
      if (ssoId && !user.ssoId) {
        user.ssoId = ssoId;
        updated = true;
      }
      if (avatar && !user.avatar) {
        user.avatar = avatar;
        updated = true;
      }
      if (updated) {
        await user.save({ validateBeforeSave: false });
      }

      const token = user.getSignedJwtToken();

      return res.status(200).json({
        success: true,
        message: `Signed in successfully with ${provider.charAt(0).toUpperCase() + provider.slice(1)}.`,
        token,
        user: {
          id: user._id,
          name: user.name,
          email: user.email,
          phone: user.phone || '',
          role: user.role,
          status: user.status,
          avatar: user.avatar || '',
          ssoProvider: user.ssoProvider,
          companyDetails: user.companyDetails
        }
      });
    }

    // New SSO user registration
    const validRoles = ['customer', 'seller'];
    const assignedRole = role && validRoles.includes(role.toLowerCase()) ? role.toLowerCase() : 'customer';
    const displayName = (name && name.trim()) || normalizedEmail.split('@')[0];

    user = await User.create({
      name: displayName,
      email: normalizedEmail,
      ssoProvider: provider,
      ssoId: ssoId || null,
      avatar: avatar || '',
      role: assignedRole,
      status: assignedRole === 'seller' ? 'pending_verification' : 'active',
      companyDetails: companyDetails || (assignedRole === 'seller' ? { companyName: displayName } : {})
    });

    const token = user.getSignedJwtToken();

    res.status(201).json({
      success: true,
      message: assignedRole === 'seller'
        ? 'Seller account registered with Google SSO! Profile pending admin verification.'
        : 'Account created with Google SSO successfully!',
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone || '',
        role: user.role,
        status: user.status,
        avatar: user.avatar || '',
        ssoProvider: user.ssoProvider,
        companyDetails: user.companyDetails
      }
    });
  } catch (error) {
    next(error);
  }
};

