const mongoose = require('mongoose');
const { Schema } = mongoose;

const cartItemSchema = new Schema({
  productId: {
    type: Schema.Types.ObjectId,
    ref: 'Product',
    required: true
  },
  quantity: {
    type: Number,
    default: 1,
    min: 1
  },
  originalPrice: {
    type: Number,
    required: true
  },
  discount: {
    type: Number, // Percentage discount (optional)
    default: 0
  },
  finalPrice: {
    type: Number, // Price after discount per unit
    required: true
  },
  totalPrice: {
    type: Number, // finalPrice × quantity
    required: true
  },
  addedAt: {
    type: Date,
    default: Date.now
  }
});


const cartSchema = new Schema({
  userId: {
    type: Schema.Types.ObjectId,
    ref: 'User',
    required: true,
    unique: true
  },
  items: [cartItemSchema]
}, { timestamps: true });

const Cart = mongoose.model('Cart', cartSchema);
module.exports = Cart;
