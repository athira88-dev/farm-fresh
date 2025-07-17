const mongoose = require('mongoose')
const { Schema } = mongoose
const { v4: uuidv4 } = require('uuid')// Import uuid function to create unique IDs


const orderSchema = new Schema({
  orderId: {
    type: String,
    default: () => uuidv4(), //an arrow function that runs uuidv4() to generate a unique ID.
    unique: true
  },


orderedItems: [{
  product: {
    type: Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  quantity: {
    type: Number,
    required: true
  },
  originalPrice: {        // <-- Add this
    type: Number,
    required: true
  },
  discountApplied: {      // <-- Add this (percentage)
    type: Number,
    default: 0
  },
  price: {                // Final per unit price after discount
    type: Number,
    default: 0
  }
}],


  totalPrice: {
    type: Number,
    required: true
  },
  discount: {
    type: Number,
    required: true
  },
  finalAmount: {
    type: Number,
    default: 0
  },
    taxAmount: {
    type: Number,
    default: 0
  },
  shippingCost: {
    type: Number,
    default: 0
  },
  grandTotal: {
    type: Number,
    default: 0
  },

    user: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true
  },
  address: {
    street: String,
    city: String,
    state: String,
    zip: String,
    country: String,
    phone: String
  },
  invoiceDate: {
    type: Date

  },
 status: {
  type: String,
  enum: ['Pending', 'Paid','Processing', 'Failed','Shipped', 'Delivered', 'Cancelled', 'Returned', 'Out for delivery'], // Add 'Paid'
  default: 'Pending'
},

    returnReason: {
    type: String,
    default: null
  },
  returnStatus: {
    type: String,
    enum: ['None', 'Return Requested', 'Returned'],
    default: 'None'
  },
  createdOn: {
    type: Date,
    default: Date.now,
    required: true
  },
  couponApplied: {
    type: Boolean,
    default: false
  },
paymentMethod: {
  type: String,
  enum: ['COD', 'Online', 'PayPal'], // Add 'PayPal'
  default: 'COD'
}




});

const Order = mongoose.model("Order", orderSchema)
module.exports = Order