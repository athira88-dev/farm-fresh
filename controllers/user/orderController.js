const Order = require('../../models/orderSchema');
const Cart = require('../../models/cartSchema');
const Address = require('../../models/addressSchema');
const Product = require('../../models/productSchema');
const Coupon = require('../../models/couponSchema');  // your coupon model
const Wallet = require('../../models/walletSchema');
const mongoose = require('mongoose');
const PDFDocument = require('pdfkit');
const fetch = require('node-fetch').default;
const { calculateOrderItems } = require('../../utils/orderUtils');


const clientId = process.env.PAYPAL_CLIENT_ID;
const secret = process.env.PAYPAL_SECRET;

// const PAYPAL_CLIENT = 'YAS6jTbViQm4oXSHQqT7q7i5kBXVev28yI0DvXDJtGQLfDF09_EtL91mtKbNB7y8dZBAFt59OlDIKhbb3';
// const PAYPAL_SECRET = 'EDnmFI6eJfv1NvwKcNpG0ZGDRPQ2YoJp1_TdvIrHhdlp27dJACTb6dRgDmOeES7RxfMIb70UgsWAC3JK';
// const base = 'https://api-m.sandbox.paypal.com';



async function getAccessToken() {
  const clientId = process.env.PAYPAL_CLIENT_ID;
  const secret = process.env.PAYPAL_SECRET;

  const auth = Buffer.from(`${clientId}:${secret}`).toString('base64');

  console.log('➡️ Starting getAccessToken...');

  try {
    console.log('🔄 Sending token request to PayPal...');

    const res = await fetch(`${process.env.PAYPAL_BASE_URL}/v1/oauth2/token`, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: 'grant_type=client_credentials'
    });

    console.log('✅ Received response from PayPal token request');

    const text = await res.text();

    console.log('📦 PayPal access token response status:', res.status);
    console.log('📦 PayPal access token raw response:', text);

    if (!res.ok) {
      throw new Error(`PayPal token fetch failed with status ${res.status}`);
    }

    const data = JSON.parse(text);
    return data.access_token;

  } catch (err) {
    console.error('❌ Error fetching PayPal access token:', err);
    return null;
  }
}


const placeOrder = async (req, res) => {
  try {
    const { orderID, selectedAddressId } = req.body;
    const userId = req.user._id;

    console.log('✅ COD Order Start:', { userId, selectedAddressId });

    // Fetch user's address
    const addressDoc = await Address.findOne({ userId });
    if (!addressDoc || addressDoc.address.length === 0) {
      return res.status(400).send('No address found for user');
    }

    const selectedAddress = addressDoc.address.find(
      addr => addr._id.toString() === selectedAddressId
    );

    const addr = selectedAddress?.toObject ? selectedAddress.toObject() : selectedAddress;
    if (!addr) {
      return res.status(400).send('Invalid address selected');
    }

    // Fetch user's cart
    const cart = await Cart.findOne({ userId }).populate('items.productId');
    if (!cart || cart.items.length === 0) {
      console.log('❌ Empty cart');
      return res.render('order-failure', { orderId: orderID });
    }

    console.log('✅ Cart loaded:', cart.items.length);

    // Check for out-of-stock items before placing order
for (const cartItem of cart.items) {
  const product = cartItem.productId;

  if (!product) {
    return res.status(400).render('order-failure', {
      orderId: orderID,
      errorMessage: `Product not found in database.`,
    });
  }

  if (product.stock === 0) {
    return res.status(400).render('order-failure', {
      orderId: orderID,
      errorMessage: `Sorry, ${product.productName} is currently out of stock.`,
    });
  }

  if (product.stock < cartItem.quantity) {
    return res.status(400).render('order-failure', {
      orderId: orderID,
      errorMessage: `Only ${product.stock} left for ${product.productName}. Please update your cart.`,
    });
  }
}


    // Prepare ordered items
    // 3. Prepare ordered items and calculate subtotal
const orderedItems = calculateOrderItems(cart.items);
const cartSubtotal = orderedItems.reduce((sum, item) => sum + item.price * item.quantity, 0);
const subtotal = +cartSubtotal.toFixed(2);

// 4. Use coupon session if available
const sessionCoupon = req.session.appliedCoupon || {};
const discountValue = sessionCoupon.discount !== undefined ? +parseFloat(sessionCoupon.discount).toFixed(2) : 0;

// ✅ NEW: Apply tax after discount
const finalAmount = +(subtotal - discountValue).toFixed(2);
const taxAmount = sessionCoupon.taxAmount !== undefined
  ? +parseFloat(sessionCoupon.taxAmount).toFixed(2)
  : +(finalAmount * 0.05).toFixed(2);

const shippingCost = sessionCoupon.shippingCost !== undefined
  ? +parseFloat(sessionCoupon.shippingCost).toFixed(2)
  : 4.99;

// ✅ Recalculate grand total
const grandTotal = sessionCoupon.finalTotal !== undefined
  ? +parseFloat(sessionCoupon.finalTotal).toFixed(2)
  : +(finalAmount + taxAmount + shippingCost).toFixed(2);

console.log('✅ Order calculation (tax after discount):', {
  subtotal,
  discountValue,
  finalAmount,
  taxAmount,
  shippingCost,
  grandTotal,
});


    // Create and save the order with exact session amounts
    const newOrder = new Order({
      user: userId,
      orderedItems,
      totalPrice: subtotal,
      discount: discountValue,
      finalAmount,
      taxAmount,
      shippingCost,
      grandTotal,
      address: {
        street: selectedAddress.street,
        city: selectedAddress.city,
        state: selectedAddress.state,
        zip: selectedAddress.zip,
        country: selectedAddress.country,
        phone: selectedAddress.phone,
      },
      paymentMethod: 'COD',
      invoiceDate: new Date(),
      status: 'Pending',
      couponApplied: !!sessionCoupon.code,
      createdOn: new Date(),
    });

    await newOrder.save();

    // Remove coupon from session after order and mark coupon as used
    if (req.session.appliedCoupon) {
      await Coupon.updateOne(
        { name: req.session.appliedCoupon.code },
        { $addToSet: { usedBy: req.session.user } }
      );

      delete req.session.appliedCoupon;
    }

    console.log('✅ Order saved:', newOrder._id);

    // Decrease stock
    for (const item of orderedItems) {
      const product = await Product.findById(item.product);
      if (!product) {
        console.log('⚠️ Product not found for stock update:', item.product);
        continue;
      }

      product.stock -= item.quantity;
      if (product.stock <= 0) {
        product.stock = 0;
        product.isOutOfStock = true;
      }

      await product.save();
    }

    // Clear cart
    cart.items = [];
    await cart.save();

    console.log('✅ COD order completed successfully');
    return res.render('order-success', { orderId: newOrder._id });

  } catch (error) {
    console.error('❌ COD order error:', error);
    return res.status(500).render('order-failure', {
      errorStatus: error.status || 500,
      errorMessage: error.message || 'Something went wrong during order placement.',
      orderId: orderID
    });
  }
};



//paypal

let orderID = 'Unavailable';
const placePaypalOrder = async (req, res) => {
  let newOrder;

  try {
    const { orderID: incomingOrderId, addressId } = req.body;
    const paypalOrderId = incomingOrderId;
    const userId = req.user._id;

    // Step 1: Get PayPal access token
    const PAYPAL_CLIENT_ID = process.env.PAYPAL_CLIENT_ID;
    const PAYPAL_SECRET = process.env.PAYPAL_SECRET;
    const basicAuth = Buffer.from(`${PAYPAL_CLIENT_ID}:${PAYPAL_SECRET}`).toString('base64');

    const tokenRes = await fetch('https://api-m.sandbox.paypal.com/v1/oauth2/token', {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basicAuth}`,
        'Content-Type': 'application/x-www-form-urlencoded'
      },
      body: 'grant_type=client_credentials'
    });

    const tokenData = await tokenRes.json();
    const accessToken = tokenData.access_token;

    if (!accessToken) {
      return res.status(500).render('order-failure', {
        errorStatus: tokenRes.status,
        errorMessage: tokenData?.error_description || 'Unable to retrieve PayPal access token.',
        orderId: newOrder?.orderId || 'Unavailable'
      });
    }

    // Step 2: Address & Cart validation
    const addressDoc = await Address.findOne({ userId });
    const selectedAddress = addressDoc?.address.find(addr => addr._id.toString() === addressId);
    const cart = await Cart.findOne({ userId }).populate('items.productId');

    if (!selectedAddress || !cart || cart.items.length === 0) {
      return res.render('order-failure', {
        orderId: newOrder?.orderId || 'Unavailable',
        errorStatus: 400,
        errorMessage: 'Invalid address or empty cart.'
      });
    }

    // ✅ ADD THIS BLOCK HERE 👇
const outOfStockItems = cart.items.filter(item => item.productId.stock < item.quantity);
if (outOfStockItems.length > 0) {
  const outOfStockNames = outOfStockItems.map(i => i.productId.name).join(', ');
  return res.render('order-failure', {
    orderId: 'Unavailable',
    errorStatus: 400,
    errorMessage: `The following items are out of stock or insufficient quantity: ${outOfStockNames}`
  });
}

    // Step 3: Process cart items
    const orderedItems = cart.items.map(item => {
      const product = item.productId;
      const quantity = item.quantity;

      const originalPrice = product.price;
      const discount = product.discount || 0;
      const discountedPrice = +(originalPrice * (1 - discount / 100)).toFixed(2);

      return {
        product: product._id,
        quantity,
        originalPrice,
        discountApplied: discount,
        price: discountedPrice
      };
    });

    // Step 4: Calculate totals
    let totalPrice = 0;
    let discount = 0;

    orderedItems.forEach(item => {
      totalPrice += item.originalPrice * item.quantity;
      discount += (item.originalPrice - item.price) * item.quantity;
    });

    totalPrice = +totalPrice.toFixed(2);
    discount = +discount.toFixed(2);
let finalAmount = totalPrice - discount;

if (req.session.appliedCoupon && req.session.appliedCoupon.discount) {
  const couponDiscount = Number(req.session.appliedCoupon.discount);
  finalAmount -= couponDiscount;
  discount += couponDiscount;
}

finalAmount = +finalAmount.toFixed(2);
discount = +discount.toFixed(2);


    const taxRate = 0.05;
    const taxAmount = +(finalAmount * taxRate).toFixed(2);
    const shippingCost = 4.99;
    const grandTotal = +(finalAmount + taxAmount + shippingCost).toFixed(2);

    // Step 5: Create Order with status 'Failed'
    newOrder = new Order({
      user: userId,
      orderedItems,
      totalPrice,
      discount,
      finalAmount,
      taxAmount,
      shippingCost,
      grandTotal,
      address: {
        street: selectedAddress.street,
        city: selectedAddress.city,
        state: selectedAddress.state,
        zip: selectedAddress.zip,
        country: selectedAddress.country,
        phone: selectedAddress.phone
      },
      paymentMethod: 'PayPal',
      invoiceDate: new Date(),
      status: 'Failed',
      couponApplied: !!req.session.appliedCoupon,
      createdOn: new Date()
    });

    console.log('Coupon session:', req.session.appliedCoupon);
console.log('Product discount:', discount - (req.session.appliedCoupon?.discountAmount || 0));
console.log('Coupon discount:', req.session.appliedCoupon?.discountAmount || 0);
console.log('Final discount total:', discount);
console.log('Final amount:', finalAmount);


    await newOrder.save();

    // Step 6: Verify PayPal payment
    const orderRes = await fetch(`https://api-m.sandbox.paypal.com/v2/checkout/orders/${paypalOrderId}`, {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${accessToken}`
      }
    });

    const orderData = await orderRes.json();

    if (orderData.status !== 'COMPLETED') {
      return res.render('order-failure', {
        orderId: newOrder.orderId,
        errorStatus: orderData.status,
        errorMessage: 'PayPal payment not completed.'
      });
    }

    // Step 7: Update order status
    newOrder.status = 'Processing';
    await newOrder.save();

    // Step 8: Update stock
    for (const item of orderedItems) {
      const product = await Product.findById(item.product);
      if (!product) continue;
      product.stock -= item.quantity;
      if (product.stock <= 0) {
        product.stock = 0;
        product.isOutOfStock = true;
      }
      await product.save();
    }

    // Step 9: Clear cart
    cart.items = [];
    await cart.save();

    // Step 10: Handle coupon session
    if (req.session.appliedCoupon) {
      await Coupon.updateOne(
        { name: req.session.appliedCoupon.code },
        { $addToSet: { usedBy: req.session.user } }
      );
      delete req.session.appliedCoupon;
    }

    // ✅ Success
    return res.render('order-success', { orderId: newOrder._id });

  } catch (error) {
    console.error('❌ PayPal error:', error);
    return res.status(500).render('order-failure', {
      errorStatus: error.status || 500,
      errorMessage: error.message || 'Something went wrong during PayPal payment.',
      orderId: newOrder?.orderId || 'Unavailable'
    });
  }
};







const viewOrder = (req, res) => {
  // You can render an order success page
  res.render('order-success'); // or whatever view you use
};

const orderFailed = (req, res) => {
   const { orderID } = req.query; 
  res.render('order-failure', {
    errorStatus: null,
    errorMessage: 'Order could not be completed.',
    orderId: orderID

  });
};


const getUserOrders = async (req, res) => {
  try {
    const user = res.locals.user;
    if (!user) return res.redirect('/login');

    const page = parseInt(req.query.page) || 1;
    const limit = 5;
    const skip = (page - 1) * limit;

    const totalOrders = await Order.countDocuments({ user: user._id });

    const orders = await Order.find({ user: user._id })
      .sort({ createdOn: -1 })
      .skip(skip)
      .limit(limit)
      .populate('orderedItems.product')
      .exec();

 

 orders.forEach(order => {
  const totalPrice = order.totalPrice || 0;
  const discount = order.discount || 0;
  const finalAmount = order.finalAmount !== undefined ? order.finalAmount : totalPrice - discount;

  const taxRate =  0.05
  const shipping = typeof order.shippingCost === 'number' ? order.shippingCost : 4.99;
  const taxAmount = typeof order.taxAmount === 'number' ? order.taxAmount : +(finalAmount * taxRate).toFixed(2);

  const grandTotal = +(finalAmount + taxAmount + shipping).toFixed(2);

  order.display = {
    originalTotal: totalPrice.toFixed(2),
    discountAmount: discount.toFixed(2),
    finalTotal: finalAmount.toFixed(2),
    taxAmount: taxAmount.toFixed(2),
    shippingCost: shipping.toFixed(2),   // <== use shipping variable here
    grandTotal: grandTotal.toFixed(2)
  };
});


    const totalPages = Math.ceil(totalOrders / limit);

    res.render('user-orders', {
      orders,
      currentPage: page,
      totalPages
    });

  } catch (error) {
    console.error("❌ Error fetching user orders:", error);
    res.status(500).send("Something went wrong");
  }
};



const getOrderDetails = async (req, res) => {
  try {
    const userId = res.locals.user._id;
    const { orderId: orderMongoId } = req.params;

    if (!mongoose.Types.ObjectId.isValid(orderMongoId)) {
      return res.status(400).send('Invalid order ID');
    }

    const order = await Order.findOne({ _id: orderMongoId, user: userId })
      .populate('orderedItems.product');

    if (!order) {
      return res.status(404).send("Order not found or you don't have access to it.");
    }

    // Use saved values instead of recalculating
const orderWithTotals = {
  ...order.toObject(),
  totalOriginalAmount: order.totalPrice?.toFixed(2),
  couponDiscount: order.discount?.toFixed(2),
  totalFinalAmount: order.finalAmount?.toFixed(2),
  taxAmount: order.taxAmount?.toFixed(2),
  shippingCost: order.shippingCost?.toFixed(2),
  grandTotal: order.grandTotal?.toFixed(2),
};
    res.render('order-details', { order: orderWithTotals });

  } catch (error) {
    console.error('Error fetching order details:', error);
    res.status(500).send('Something went wrong');
  }
};



// Cancel entire order controller
const cancelOrder = async (req, res) => {
  try {
    const orderId = req.params.id;

    const order = await Order.findOne({ _id: orderId, user: req.user._id }).populate('orderedItems.product').populate('user');
    if (!order) return res.status(404).send("Order not found");

    if (!['Pending', 'Processing'].includes(order.status)) {
      return res.status(400).send("Order cannot be cancelled now");
    }

    // Refund amount (assuming you want to refund the finalAmount)
    const refundAmount = order.finalAmount;
    const user = order.user;

    // Update product stock
    for (const item of order.orderedItems) {
      if (item.product) {
        item.product.stock += item.quantity;
        if (item.product.isOutOfStock && item.product.stock > 0) {
          item.product.isOutOfStock = false;
        }
        await item.product.save();
      }
    }

    // Only process wallet refund if order status is 'Processing'
    if (order.status === 'Processing') {
      if (!refundAmount || refundAmount <= 0) {
        return res.status(400).send("Invalid refund amount.");
      }

      // Check if refund already issued for this cancellation
      const existingTransaction = await Wallet.findOne({
        userId: user._id,
        description: `Refund for cancelled order ${order.orderId}`,
      });

      if (existingTransaction) {
        return res.status(400).send("Refund already issued for this order.");
      }

      // Wallet refund transaction
      const walletTransaction = new Wallet({
        userId: user._id,
        type: "Credit",
        amount: refundAmount,
        description: `Refund for cancelled order ${order.orderId}`,
      });

      await walletTransaction.save();
      user.wallet.push(walletTransaction._id);
      await user.save();
    }

    // Update order status
    order.status = 'Cancelled';
    order.shippingCost = 0;
    order.taxAmount = 0;
    order.grandTotal = 0;
    order.finalAmount = 0;

    await order.save();

    res.redirect('/orders'); // or send success response
  } catch (error) {
    console.error(error);
    res.status(500).send("Server error");
  }
};



const cancelItem = async (req, res) => {
  try {
    const { orderId } = req.params;
    const { itemIndex } = req.body;

    console.log('CancelItem called');
    console.log('Received orderId param:', orderId);
    console.log('User ID:', req.user._id);

    const isObjectId = mongoose.Types.ObjectId.isValid(orderId);
    console.log('Is orderId a valid ObjectId?', isObjectId);

    const query = isObjectId
      ? { _id: orderId, user: req.user._id }
      : { orderId: orderId, user: req.user._id };

    console.log('Querying Order with:', query);

    const order = await Order.findOne(query).populate('orderedItems.product').populate('user');
    if (!order) {
      console.log('Order not found with query');
      return res.status(404).send("Order not found or you don't have access to it.");
    }

    console.log('Order found:', {
      _id: order._id,
      orderId: order.orderId,
      status: order.status,
      orderedItemsLength: order.orderedItems.length
    });

    if (!['Pending', 'Processing'].includes(order.status)) {
      return res.status(400).send('Cannot cancel items in current order status');
    }

    if (itemIndex < 0 || itemIndex >= order.orderedItems.length) {
      return res.status(400).send('Invalid item');
    }

    const itemToCancel = order.orderedItems[itemIndex];
    if (!itemToCancel.product) {
      return res.status(400).send('Product not found for this item');
    }

    // Calculate refund amount for this item
    const itemSubtotal = itemToCancel.price * itemToCancel.quantity;
    const itemOriginalSubtotal = (itemToCancel.originalPrice || itemToCancel.price) * itemToCancel.quantity;

    // Remove item from orderedItems
    order.orderedItems.splice(itemIndex, 1);

    // Adjust prices
    order.totalPrice -= itemSubtotal;
    order.totalOriginalAmount -= itemOriginalSubtotal;
    order.finalAmount -= itemSubtotal;
    
    // Calculate the new grand total (subtotal + shipping + tax)
    order.grandTotal = order.finalAmount + order.shippingCost + order.taxAmount;

    // If all items are cancelled, mark order cancelled
    if (order.orderedItems.length === 0) {
      order.status = 'Cancelled';
      order.shippingCost = 0;
      order.taxAmount = 0;
      order.grandTotal = 0;
      order.finalAmount = 0;
    }

    // Update product stock
    const product = await Product.findById(itemToCancel.product._id);
    if (product) {
      product.stock += itemToCancel.quantity;
      if (product.isOutOfStock && product.stock > 0) {
        product.isOutOfStock = false;
      }
      await product.save();
    }

    // Only process wallet refund if order status is 'Processing'
    if (order.status === 'Processing') {
      if (!itemSubtotal || itemSubtotal <= 0) {
        return res.status(400).send("Invalid refund amount.");
      }

      // Check if refund already issued for this cancelled item
      const refundDescription = `Refund for cancelled item ${itemToCancel.product.productName || 'Unknown product'} in order ${order.orderId}`;
      const existingTransaction = await Wallet.findOne({
        userId: order.user._id,
        description: refundDescription,
      });

      if (existingTransaction) {
        return res.status(400).send("Refund already issued for this cancelled item.");
      }

      // Create wallet refund transaction
      const walletTransaction = new Wallet({
        userId: order.user._id,
        type: "Credit",
        amount: itemSubtotal,
        description: refundDescription,
      });

      await walletTransaction.save();
      order.user.wallet.push(walletTransaction._id);
      await order.user.save();
    }

    await order.save();

    res.redirect('/orders');
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
};

const returnOrder = async (req, res) => {
  try {
    console.log("retun called")
    const { orderId } = req.params;
    const { returnReason } = req.body;

    if (!returnReason || returnReason.trim().length === 0) {
      return res.status(400).send('Return reason is required');
    }

    const order = await Order.findById(orderId);

    if (!order) return res.status(404).send('Order not found');

    // Only allow return if order delivered and no existing return request
    // if (order.status && order.status.toLowerCase() !== 'delivered') {
     if (order.status !== 'Delivered') {
      return res.status(400).send('Order is not delivered yet');
    }

    if (order.returnStatus === 'Return Requested' || order.returnStatus === 'Returned') {
      return res.status(400).send('Return already requested or processed');
    }

    // Save return reason and update returnStatus
    order.returnReason = returnReason.trim();
    order.returnStatus = 'Return Requested';

    await order.save();
    console.log('Order after return request:', order);

    res.redirect(`/orders/${orderId}`);

  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
};


const downloadInvoice = async (req, res) => {
  try {
    const { orderId } = req.params;
    const order = await Order.findById(orderId).populate('orderedItems.product');

    if (!order) return res.status(404).send('Order not found');

    // Extract stored values (as calculated during order placement)
    const totalOriginalAmount = order.orderedItems.reduce((sum, item) => {
      const originalPrice = item.originalPrice ?? item.price;
      return sum + originalPrice * item.quantity;
    }, 0);

    const totalFinalAmount = order.totalPrice; // This is the discounted subtotal
    const discount = order.discount || 0;
    const subtotal = +(totalFinalAmount - discount).toFixed(2);
    const taxAmount = order.taxAmount ?? +(subtotal * 0.05).toFixed(2);
    const shippingCost = order.shippingCost ?? 4.99;
    const grandTotal = order.grandTotal ?? +(subtotal + taxAmount + shippingCost).toFixed(2);

    // Create PDF
    const doc = new PDFDocument();
    const filename = `Invoice_${order._id}.pdf`;

    res.setHeader('Content-Disposition', `attachment; filename="${filename}"`);
    res.setHeader('Content-Type', 'application/pdf');
    doc.pipe(res);

    // Header
    doc.fontSize(20).text('Farm Fresh - Invoice', { align: 'center' }).moveDown();

    // Order Info
    doc.fontSize(12)
      .text(`Invoice Date: ${order.invoiceDate.toDateString()}`)
      .text(`Order ID: ${order._id}`)
      .text(`Payment Method: ${order.paymentMethod}`)
      .text(`Order Status: ${order.status}`).moveDown();

    // Address
    const { address } = order;
    doc.fontSize(14).text('Delivery Address:', { underline: true });
    doc.fontSize(12)
      .text(`${address.street}, ${address.city}`)
      .text(`${address.state}, ${address.country}`)
      .text(`Phone: ${address.phone}`).moveDown();

    // Items
    doc.fontSize(14).text('Ordered Items:', { underline: true }).moveDown(0.5);
    order.orderedItems.forEach(item => {
      const originalPrice = item.originalPrice ?? item.price;
      const line = `${item.product.productName} - ${item.quantity} x £${item.price.toFixed(2)} (was £${originalPrice.toFixed(2)})`;
      doc.fontSize(12).text(line);
    });

    doc.moveDown();

    // Pricing Summary
    doc.fontSize(14).text('Pricing Summary:', { underline: true });
    doc.fontSize(12)
      .text(`Original Total: £${totalOriginalAmount.toFixed(2)}`)
      .text(`Discount: -£${discount.toFixed(2)}`)
      .text(`Subtotal (after discount): £${subtotal.toFixed(2)}`)
      .text(`Tax (5%): £${taxAmount.toFixed(2)}`)
      .text(`Shipping: £${shippingCost.toFixed(2)}`).moveDown(0.3);

    doc.fontSize(13).text(`Grand Total: £${grandTotal.toFixed(2)}`, { bold: true });

    doc.end();
  } catch (err) {
    console.error('Error generating invoice PDF:', err);
    res.status(500).send('Error generating invoice');
  }
};


const searchOrders = async (req, res) => {
  try {
    const userId = res.locals.user._id;
    const query = req.query.query?.trim();
    const page = parseInt(req.query.page) || 1;   // handle pagination page number
    const limit = 10;                             // for example

    if (!query) {
      return res.redirect('/orders');
    }

    const orders = await Order.find({
      user: userId,
      orderId: { $regex: query, $options: 'i' },
    })
    .sort({ createdOn: -1 })
    .skip((page - 1) * limit)
    .limit(limit);

    // total count for pagination
    const totalOrders = await Order.countDocuments({
      user: userId,
      orderId: { $regex: query, $options: 'i' },
    });

    const totalPages = Math.ceil(totalOrders / limit);

    res.render('user-orders-search', {
      orders,
      currentPage: page,
      totalPages,
      query,  // if you want to keep search query in UI
    });

  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
};



const paymentRetryController = async (req, res) => {
  try {
    if (!req.user) {
      return res.status(401).send('Unauthorized: Please login first');
    }
    const userId = req.user._id;
    const orderId = req.params.orderId;

    console.log('User ID:', userId);
    console.log('Order ID:', orderId);

    const order = await Order.findOne({ orderId: orderId, user: userId });

    if (!order) {
      return res.status(404).send('Order not found');
    }

    if (order.status === 'Processing') {
      return res.redirect('/orders'); // Already paid
    }

    if (order.status !== 'Failed') {
      return res.status(400).send('Payment retry allowed only for failed orders.');
    }

    res.redirect(`/retry-checkout/${orderId}`);


  } catch (error) {
    console.error('Error during payment retry:', error);
    res.status(500).send('Something went wrong during payment retry.');
  }
};





module.exports={placeOrder,placePaypalOrder,viewOrder,orderFailed,getUserOrders,getOrderDetails,cancelOrder,cancelItem,returnOrder,downloadInvoice,searchOrders,paymentRetryController}
