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
        unique: false, // must be unique when it exists
        sparse: true,  // ignore null/undefined values in unique check(user may leave it blank as its not required)
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
  default: '' // or a default avatar path like '/images/default-avatar.png'
},

// address: {
 
//   street: { type: String },
//   city: { type: String },
//   postcode: { type: String },
//   state: { type: String },
//   country: { type: String }
// },

    isBlocked: {
        type: Boolean,
        default: false
    },
    isAdmin: {
        type: Boolean,
        default: false
    },
    cart: [{
        type: Schema.Types.ObjectId, //// List of cart item IDs linked to the user
        ref: "Cart"
    }],
    wallet: [{
        type: Schema.Types.ObjectId,
        ref: "wallet"
    }],
    orderHistory: [{
        type: Schema.Types.ObjectId,
        ref: "Order"
    }],
    // createdOn: {
    //     type: Date,
    //     default: Date.now
    // },
    referralCode: {
        type: String
    },
    redeemed: {
        type: Boolean,
        default:false
    },
    redeemedUsers: [{
        type: Schema.Types.ObjectId,
        ref: "User"
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
},{ timestamps: true })

const User = mongoose.model("User", userSchema)
// This creates a model called "User" using the schema you defined (userSchema).
module.exports = User
//You can now use User to create, find, update, or delete user documents.