const Order = require('../../models/orderSchema'); // your Order model

const orderListing = async (req, res) => {
  try {
    const perPage = 10; // number of orders per page
    const page = parseInt(req.query.page) || 1;
    const search = req.query.search ? req.query.search.trim() : '';

    // Build search filter
    let filter = {};
    if (search) {
      // Search by Order ID or customer name (case-insensitive)
      filter = {
        $or: [
          { _id: search }, // exact match for Order ID
          { customerName: { $regex: search, $options: 'i' } }
        ]
      };
    }

    // Count total documents for pagination
    const totalOrders = await Order.countDocuments(filter);

    // Fetch orders for current page
    const orders = await Order.find(filter)
      .sort({ createdAt: -1 }) // newest orders first
      .skip(perPage * (page - 1))
      .limit(perPage)
      .lean();

    const totalPages = Math.ceil(totalOrders / perPage);

    res.render('orderlist', {
      orders,
      search,
      currentPage: page,
      totalPages,
    });
  } catch (err) {
    console.error('Error fetching orders:', err);
    res.status(500).send('Server error');
  }
};


module.exports={orderListing}