const Address = require('../../models/addressSchema');
const Cart = require('../../models/cartSchema');
const { applyBestOffer } = require('../../helpers/offerCalculator');
const Order = require('../../models/orderSchema');
const Coupon = require('../../models/couponSchema');  // your coupon model
const mongoose = require('mongoose');





const viewCheckout = async (req, res) => {
  try {
    const shippingCost = 4.99;
    const taxRate = 0.05;
    const userId = req.session.user;
    const orderId = req.params.orderId;

    let cartItems = [];
    let subtotal = 0;
    const couponDiscount = req.session.appliedCoupon?.discount || 0;
    let totalOfferDiscount = 0;
    let order = null;

    // Fetch user address
    const addressDoc = await Address.findOne({ userId });
    const addresses = addressDoc?.address || [];
    const selectedAddressId = addresses.length > 0 ? addresses[0]._id.toString() : null;
    const selectedAddress = addresses.find(addr => addr._id.toString() === selectedAddressId) || null;

    if (orderId) {
      // Retry checkout with existing order
      order = await Order.findOne({ orderId, user: userId }).populate({
        path: 'orderedItems.product',
        select: 'productName productImage price discount productOffer category',
        populate: {
          path: 'category',
          select: 'categoryOffer'
        }
      });

      if (!order) return res.status(404).send('Order not found');

      cartItems = order.orderedItems.map(item => {
        const bestOfferProduct = applyBestOffer(item.product);

        return {
          productId: item.product._id,
          quantity: item.quantity,
          productName: bestOfferProduct.productName,
          productImage: bestOfferProduct.productImage,
          originalPrice: bestOfferProduct.originalPrice,
          finalPrice: parseFloat(bestOfferProduct.finalPrice),
          appliedDiscount: bestOfferProduct.appliedDiscount,
          discountSource: bestOfferProduct.discountSource
        };
      });

      subtotal = cartItems.reduce((sum, item) => sum + item.finalPrice * item.quantity, 0);

      totalOfferDiscount = cartItems.reduce((sum, item) => {
        const itemDiscount = (item.originalPrice - item.finalPrice) * item.quantity;
        return sum + itemDiscount;
      }, 0);

      couponDiscount = order.couponDiscount || 0;

    } else {
      // New checkout from cart
      const cart = await Cart.findOne({ userId }).populate({
        path: 'items.productId',
        select: 'productName productImage price discount productOffer category',
        populate: {
          path: 'category',
          select: 'categoryOffer'
        }
      });

      const items = cart?.items || [];

      // ❗ Stock Validation
const outOfStockItems = items.filter(item => {
  const product = item.productId;
  return !product || product.stock === 0 || item.quantity > product.stock;
});

if (outOfStockItems.length > 0) {
  const outOfStockNames = outOfStockItems.map(i =>
    i.productId?.productName
      ? `${i.productId.productName} (available: ${i.productId.stock})`
      : 'Unknown Product'
  ).join(', ');

  return res.render('cart', {
    cartItems: items,
    errorMessage: `The following items are unavailable or exceed available stock: ${outOfStockNames}`
  });
}


      cartItems = items.map(item => {
        const product = item.productId || {};
        const bestOfferProduct = applyBestOffer(product);

        return {
          ...item.toObject(),
          productName: bestOfferProduct.productName,
          productImage: bestOfferProduct.productImage,
          originalPrice: bestOfferProduct.originalPrice,
          finalPrice: parseFloat(bestOfferProduct.finalPrice),
          appliedDiscount: bestOfferProduct.appliedDiscount,
          discountSource: bestOfferProduct.discountSource
        };
      });

      subtotal = cartItems.reduce((sum, item) => sum + item.finalPrice * item.quantity, 0);

      totalOfferDiscount = cartItems.reduce((sum, item) => {
        const itemDiscount = (item.originalPrice - item.finalPrice) * item.quantity;
        return sum + itemDiscount;
      }, 0);

      // **COUPON LOGIC START**

      const couponCode = req.session.couponCode || '';  // Or get it from req.query or req.body as per your design

      if (couponCode) {
        // Find coupon in DB (admin coupons + referral coupons)
        const coupon = await Coupon.findOne({ name: couponCode, isList: true });

        if (coupon) {
          const now = new Date();

          // Check expiry and minimum purchase
          if (coupon.expiredOn > now && subtotal >= coupon.minimumPrice) {
            // Check if user is allowed (for referral coupons, check userId array)
            let userEligible = true;
            if (coupon.userId && coupon.userId.length > 0) {
              userEligible = coupon.userId.some(id => id.toString() === userId.toString());
            }

            if (userEligible) {
              couponDiscount = coupon.offerPrice;
            }
          }
        }
      }

      // Store couponDiscount and code in session for persistence
      req.session.discountAmount = couponDiscount;
      req.session.couponCode = couponCode;

      // **COUPON LOGIC END**
    }

    const totalDiscount = totalOfferDiscount + couponDiscount;
    // const taxAmount = subtotal * taxRate;
    // const grandTotal = subtotal + taxAmount + shippingCost - couponDiscount;

// const discountedSubtotal = subtotal - couponDiscount;
// const taxAmount = +(discountedSubtotal * taxRate).toFixed(2);  // rounded tax
// const grandTotal = +(discountedSubtotal + taxAmount + shippingCost).toFixed(2); // rounded total

    const finalAmount = subtotal - couponDiscount;
    const taxAmount = +(finalAmount * taxRate).toFixed(2);
    const grandTotal = +(finalAmount + taxAmount + shippingCost).toFixed(2);




    res.render('checkout', {
      cartItems,
      addresses,
      selectedAddress,
      selectedAddressId,
      shippingCost,
      taxAmount: taxAmount.toFixed(2),
      subtotal: subtotal.toFixed(2),
      grandTotal: grandTotal.toFixed(2),
      paymentMethod: '',
      couponCode: req.session.couponCode || '',
      discount: totalDiscount.toFixed(2),
      discountAmount: totalDiscount.toFixed(2),
      couponApplied: couponDiscount > 0
    });
  } catch (err) {
    console.error('Checkout error:', err);
    res.status(500).send('Internal Server Error');
  }
};



const viewRetryCheckout = async (req, res) => {
  try {
    const { orderId } = req.params;
    const userId = req.session.user; // ✅ Extract ObjectId string
    const userObjId = new mongoose.Types.ObjectId(userId); // ✅ Ensure it's ObjectId
    console.log('User ID from session:', req.session.user);
    console.log('UserObj ID :', userObjId);
        console.log('Order ID from params:', orderId);

    const order = await Order.findOne({ orderId: orderId, user: userObjId }).populate({
      path: 'orderedItems.product',
      select: 'productName productImage price discount productOffer category',
      populate: {
        path: 'category',
        select: 'categoryOffer'
      }
    });

      const addressDoc = await Address.findOne({ userId });
    const addresses = addressDoc?.address || [];
    const selectedAddressId = addresses.length > 0 ? addresses[0]._id.toString() : null;
    const selectedAddress = addresses.find(addr => addr._id.toString() === selectedAddressId) || null;


    if (!order) return res.status(404).send('Order not found');

    const cartItems = order.orderedItems.map(item => {
      const bestOfferProduct = applyBestOffer(item.product);
      return {
        productId: item.product._id,
        quantity: item.quantity,
        productName: bestOfferProduct.productName,
        productImage: bestOfferProduct.productImage,
        originalPrice: bestOfferProduct.originalPrice,
        finalPrice: parseFloat(bestOfferProduct.finalPrice),
        appliedDiscount: bestOfferProduct.appliedDiscount,
        discountSource: bestOfferProduct.discountSource
      };
    });

    const subtotal = cartItems.reduce((sum, item) => sum + item.finalPrice * item.quantity, 0);
    const taxRate = 0.05;
    const shippingCost = 4.99;
    const taxAmount = subtotal * taxRate;
    const totalOfferDiscount = cartItems.reduce((sum, item) => {
      return sum + (item.originalPrice - item.finalPrice) * item.quantity;
    }, 0);
    const couponDiscount = order.couponDiscount || 0;
    const grandTotal = subtotal + taxAmount + shippingCost;
        const totalDiscount = totalOfferDiscount + couponDiscount;

    res.render('checkout-retry', {
      cartItems,
      shippingCost,
      taxAmount: taxAmount.toFixed(2),
      subtotal: subtotal.toFixed(2),
      grandTotal: grandTotal.toFixed(2),
       discount: totalDiscount.toFixed(2),
      discountAmount: totalDiscount.toFixed(2),
      couponApplied: couponDiscount > 0,
      paymentMethod: order.paymentMethod || '',
      orderId: order.orderId, // << add this line
      couponCode: '',
      addresses,
      selectedAddress,
      selectedAddressId,


    });
  } catch (err) {
    console.error('Retry Checkout Error:', err);
    res.status(500).send('Internal Server Error');
  }
};




const applyCoupon= async (req, res) =>{
  console.log("🔥 applyCoupon called");
  try {
    const { couponCode } = req.body;
    const userId = req.session.user;



    // Prevent applying a coupon if one is already applied
    if (req.session.appliedCoupon) {
      return res.json({ success: false, message: 'A coupon has already been applied.' });
    }



    // Step 1: Find the valid coupon
    const coupon = await Coupon.findOne({
      name: couponCode,
      isList: true,
      expiredOn: { $gt: new Date() }
    });

     if (!coupon) {
      return res.json({ success: false, message: 'Invalid or expired coupon code.' });
    }

       ///Prevent for the same user if already applied even in another session
    const alreadyUsed = coupon.usedBy?.some(id => id.toString() === userId);
if (alreadyUsed) {
  return res.json({ success: false, message: 'You have already used this coupon.' });
}

   

  console.log("Referral coupon userId list:", coupon.userId);
console.log("Current session userId:", userId);

    // Step 2: Check eligibility for referral coupon
    if (coupon.userId && coupon.userId.length > 0) {
      const isAllowedUser = coupon.userId.some(id => id.toString() === userId);
      if (!isAllowedUser) {
        return res.json({ success: false, message: 'You are not eligible to use this coupon.' });
      }
    }

    // Step 3: Get user's cart and calculate subtotal with best offers
    const cart = await Cart.findOne({ userId }).populate({
      path: 'items.productId',
      select: 'productName price discount productOffer category',
      populate: {
        path: 'category',
        select: 'categoryOffer'
      }
    });

    if (!cart || cart.items.length === 0) {
      return res.json({ success: false, message: 'Your cart is empty.' });
    }

    let subtotal = 0;

    cart.items.forEach(item => {
      const product = item.productId;
      const bestOffer = applyBestOffer(product);
      subtotal += bestOffer.finalPrice * item.quantity;
    });

     subtotal = +subtotal.toFixed(2);

    // Step 4: Check if subtotal meets the coupon's minimum price condition
    if (subtotal < coupon.minimumPrice) {
      return res.json({
        success: false,
        message: `Minimum purchase of £${coupon.minimumPrice} required to use this coupon.`,
      });
    }

    // Step 5: Calculate discount (flat or percentage)
    let discountAmount = 0;

    if (coupon.discountType === 'percentage') {
      discountAmount = Math.floor((subtotal * coupon.offerPrice) / 100);
    } else {
      discountAmount = coupon.offerPrice;
    }

  const taxRate = 0.05;
const shippingCost = 4.99;
// const taxAmount = +(subtotal * taxRate).toFixed(2);
// const finalTotal  = +(subtotal + taxAmount + shippingCost - discountAmount).toFixed(2);

  const amountAfterDiscount = subtotal - discountAmount;
    const taxAmount = +(amountAfterDiscount * taxRate).toFixed(2);

    const finalTotal = +(amountAfterDiscount + taxAmount + shippingCost).toFixed(2);

    // Step 6: Store coupon in session
    // req.session.appliedCoupon = {
    //   code: couponCode,
    //   discount: discountAmount,
    //   type: coupon.discountType,
    // };
    req.session.appliedCoupon = {
  code: couponCode,
  discount: discountAmount,
  type: coupon.discountType,
  subtotal,
  taxAmount,
  shippingCost,
  finalTotal,
};

  

    return res.json({
      success: true,
      discount: discountAmount,
      newTotal: finalTotal ,
      message: `Coupon applied! You saved £${discountAmount}.`,
    });

  } catch (error) {
    console.error('Coupon apply error:', error);
    return res.json({ success: false, message: 'Server error while applying coupon.' });
  }
}


const removeCoupon = async (req, res) => {
  try {
    if (req.session.appliedCoupon) {
      delete req.session.appliedCoupon;
      return res.json({ success: true, message: 'Coupon removed successfully.' });
    } else {
      return res.json({ success: false, message: 'No coupon to remove.' });
    }
  } catch (error) {
    console.error('Error removing coupon:', error);
    return res.json({ success: false, message: 'Server error while removing coupon.' });
  }
};




module.exports = { viewCheckout,viewRetryCheckout,applyCoupon ,removeCoupon};
