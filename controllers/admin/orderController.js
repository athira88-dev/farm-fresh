const Order = require('../../models/orderSchema'); // your Order model
const User = require('../../models/userSchema');
const Wallet = require('../../models/walletSchema');
const mongoose = require('mongoose');


const listOrders = async (req, res) => {
  try {
    const search = req.query.search || '';
    const page = parseInt(req.query.page) || 1;
    const limit = 10;

    // Build query object
    let query = {};
    if (search) {
      // If order ID is an exact match, you can search _id directly
      // Or use regex for partial matching if you want:
      // query._id = new RegExp(search, 'i');  <-- This won't work with ObjectId, so better do exact match
      if (mongoose.Types.ObjectId.isValid(search)) {
        query._id = search;
      } else {
        // If search string is not a valid ObjectId, no match
        query._id = null; // No results will be found
      }
    }

    // Count total matching orders
    const totalOrders = await Order.countDocuments(query);

    // Calculate total pages
    const totalPages = Math.ceil(totalOrders / limit);

    // Fetch paginated orders with user info
    const orders = await Order.find(query)
      .populate('user', 'name email')
      .sort({ createdOn: -1 })
      .skip((page - 1) * limit)
      .limit(limit);

    // Render view with variables
    res.render('order-list', {
      orders,
      search,
      currentPage: page,
      totalPages
    });
  } catch (error) {
    console.error('Error fetching orders:', error);
    res.status(500).send('Server error');
  }
};


const getOrderDetails = async (req, res) => {
  try {
    const orderId = req.params.orderId;

      const order = await Order.findById(orderId)
  .populate('user', 'name email phone')
  .populate('orderedItems.product');  // <-- correct path here


    if (!order) {
      return res.status(404).send('Order not found');
    }

    // Make sure order.items exists and is an array before rendering
    if (!order.items || !Array.isArray(order.items)) {
      order.items = []; // fallback to empty array
    }

    res.render('admin-order-details', { order });
  } catch (error) {
    console.error('Error fetching order details:', error);
    res.status(500).send('Server error');
  }
};


const updateOrderStatus = async (req, res) => {
  const { orderId } = req.params;
  const { status } = req.body;
  console.log(status)

  // Validate status
  const validStatuses = ['Pending', 'Shipped', 'Delivered', 'Cancelled', 'Returned','Out for delivery']
 
  if (!validStatuses.includes(status)) {
    return res.status(400).send('Invalid status value');
  }

  try {
    const order = await Order.findById(orderId);
    if (!order) {
      return res.status(404).send('Order not found');
    }

    order.status = status;
    await order.save();

    // Redirect back to order details page after update
    res.redirect(`/admin/orders/${orderId}`);
  } catch (error) {
    console.error('Error updating order status:', error);
    res.status(500).send('Server error');
  }
};


const verifyReturnRequest = async (req, res) => {
  try {
    const orderId = req.params.id;
    const order = await Order.findById(orderId)
      .populate("user")
      .populate("orderedItems.product"); //  populate product for stock update

    if (!order || order.returnStatus !== "Return Requested") {
      return res.status(400).send("Invalid or already processed return.");
    }

    const refundAmount = order.finalAmount;
    const user = order.user;

    if (!refundAmount || refundAmount <= 0) {
      return res.status(400).send("Invalid refund amount.");
    }

    const existingTransaction = await Wallet.findOne({
      userId: user._id,
      description: `Refund for returned order ${order.orderId}`,
    });

    if (existingTransaction) {
      return res.status(400).send("Refund already issued for this order.");
    }

    //  Step 1: Restore product stock
    for (let item of order.orderedItems) {
      const product = item.product;
      if (product) {
        product.stock += item.quantity;

        // Optional: update out-of-stock flag if you're using one
        if (product.isOutOfStock && product.stock > 0) {
          product.isOutOfStock = false;
        }

        await product.save();
      }
    }

    //  Step 2: Wallet refund
    const walletTransaction = new Wallet({
      userId: user._id,
      type: "Credit",
      amount: refundAmount,
      description: `Refund for returned order ${order.orderId}`,
    });

    await walletTransaction.save();
    user.wallet.push(walletTransaction._id);

    //  Step 3: Update order status
    order.returnStatus = "Returned";
    order.status = "Returned";

    await user.save();
    await order.save();

    res.redirect("/admin/orders/" + orderId);
  } catch (err) {
    console.error(err);
    res.status(500).send("Server Error");
  }
};


module.exports = { listOrders, getOrderDetails,updateOrderStatus,verifyReturnRequest };
