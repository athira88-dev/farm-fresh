const mongoose = require('mongoose')
const {Schema} = mongoose;

const productSchema = new Schema({
    productName:{
        type:String,
        required:true,
        unique:true
    },
    description:{
        type:String,
        required:true
    },
    productImage:{
        type:[String],
        required:true
    },
    price:{
        type:Number,
        required:true
    },
       originalPrice:{
        type:Number,
        required:false
    },
    productQuantity:{
        type:Number,
        default:null
    },
    maxQuantity: {
  type: Number,
  default: 5, // Set your default max quantity here
  min: 1
},

    unit:{
        type:String,
        default:null
    },
    category:{
        type: Schema.Types.ObjectId,
        ref:'Category',
        // required:true
    },
    effectiveDiscount:{
        type:Number
    },
    // brand:{
    //     type: Schema.Types.ObjectId,
    //     ref:'Brand',
    // },
    discount:{
        type:Number,
        default:0
    },
    stock:{
        type:Number,
        default:null
    },
      isOutOfStock: {
    type: Boolean,
    default: false
  },
  lowStockWarning: {
    type: Number,
    default: 5 // optional threshold for alerts
  },
    isBlocked:{
        type:Boolean,
        default:false
    },
       isListed:{
        type:Boolean,
        default:true
    },
    isDeleted: {
  type: Boolean,
  default: false
},
    status:{
        type: String,
        enum:['available','out of stock','Discontinued'],
        required: true,
        default: 'available'
    },
    coupon: {
    code: String,
    description: String
  },
    reviews: [
    {
      rating: Number,
      comment: String,
      author: String,
      date: { type: Date, default: Date.now }
    }
  ]
  ,highlights: {
  type: [String],
  default: []
},
specs: {
  type: Map,
  of: String,
  default: {}
},

  productOffer: {
    isActive: {
      type: Boolean,
      default: false
    },
    discountPercentage: {
      type: Number,
      min: 0,
      max: 100
    },
    startDate: {
      type: Date
    },
    endDate: {
      type: Date
    }
  },


},{
    timestamps:true
})

const Product = mongoose.model("Product", productSchema)
module.exports = Product