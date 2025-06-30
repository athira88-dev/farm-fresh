const mongoose = require('mongoose')
const { Schema } = mongoose

const cartSchema = new Schema({

  items: [{
    productId: {
      type: Schema.Types.ObjectId,
      ref: 'Product',
      required: true
    },
    userId: {
  type: mongoose.Schema.Types.ObjectId,
  ref: 'User',
  required: true
},

    quantity: {
      type: Number,
      default: 1
    },
    price: {
      type: Number,
      default: 1
    },

    totalPrice: {
      type: Number,
      default: 1
    },
    status: {
      type: String,
      default: 'placed'
    },
    cancellationReason: {
      type: String,
      default: 'none'
    }
  }]


});

const Cart = mongoose.model("Cart", cartSchema)
module.exports = Cart