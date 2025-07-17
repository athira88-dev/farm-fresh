const mongoose = require('mongoose')
const { Schema } = mongoose

const userSchema = new Schema({
    name: {
        type: String,
        required: true
    },
    email: {
        type: String,
        required: true,
        unique: true
    },
    phone: {
        type: String,
        required: false,
        unique: false,
        sparse: true,
        default: null
    },
    googleId: {
        type: String,
        unique: true,
        sparse: true
    },
    password: {
        type: String,
        required: false
    },
    profileImage: {
        type: String,
        default: ''
    },
    isBlocked: {
        type: Boolean,
        default: false
    },
    isAdmin: {
        type: Boolean,
        default: false
    },
    cart: [{
        product: {
            type: Schema.Types.ObjectId,
            ref: 'Product',
            required: true
        },
        quantity: {
            type: Number,
            default: 1,
            min: 1
        }
    }],
    wishlist: [{
        type: Schema.Types.ObjectId,
        ref: 'Product'
    }],
    wallet: [{
        type: Schema.Types.ObjectId,
        ref: "wallet"
    }],
    orderHistory: [{
        type: Schema.Types.ObjectId,
        ref: "Order"
    }],
referralCode: {
    type: String,
    unique: true,
    uppercase: true,
    trim: true,
   
  },
  referredBy: {
    type: String,
    uppercase: true,
    trim: true,
    default: null
  },
  redeemedUsers: [{
    type: Schema.Types.ObjectId,
    ref: 'User'
  }],
    // Stores user's past searches with category, brand, and timestamp
    searchHistory: [{
        category: {
            type: Schema.Types.ObjectId,
            ref: "Category"
        },
        brand: {
            type: String,
        },
        searchOn: {
            type: Date,
            default: Date.now
        }
    }],
    otp: {
        type: String,
        required: false
    },
    otpExpires: {
        type: Date,
        required: false
    }
}, { timestamps: true })

// Generate unique referral code before saving user
function generateReferralCode(length = 6) {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
    let code = '';
    for (let i = 0; i < length; i++) {
        code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return code;
}

userSchema.pre('save', async function (next) {
    if (!this.referralCode) {
        let code;
        let existing;
        do {
            code = generateReferralCode();
            existing = await mongoose.models.User.findOne({ referralCode: code });
        } while (existing);
        this.referralCode = code;
    }
    next();
})

const User = mongoose.model("User", userSchema)

module.exports = User
