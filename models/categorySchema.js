const mongoose = require('mongoose');
const { Schema } = mongoose;

const categorySchema = new Schema({
  name: {
    type: String,
    required: true,
    trim: true,
    unique: true
  },
  description: {
    type: String,
    required: true
  },
  isListed: {
    type: Boolean,
    default: true
  },
  isDeleted: {
    type: Boolean,
    default: false
  },
  isBlocked: {
    type: Boolean,
    default: false
  },

  categoryOffer: {
    discountPercentage: {
      type: Number,
      default: 0
    },
    isActive: {
      type: Boolean,
      default: false
    },
    startDate: {
      type: Date
    },
    endDate: {
      type: Date
    }
  },

  createdAt: {
    type: Date,
    default: Date.now
  }
});

const Category = mongoose.model("Category", categorySchema);
module.exports = Category;
