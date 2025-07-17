const Coupon = require('../../models/couponSchema');


const getCoupon = async (req, res) => {
  try {
    const coupons = await Coupon.find().sort({ createdAt: -1 });

  res.render('admin-coupons', {
  coupons
});
  } catch (error) {
    console.error("Get coupon error:", error);
    res.status(500).send("Something went wrong");
  }
};


// Create Coupon controller
const createCoupon = async (req, res) => {
  try {
    const { name, expiredOn, offerPrice, minimumPrice, isList } = req.body;

    // Validate required fields
    if (!name || !expiredOn || offerPrice == null || minimumPrice == null) {
      return res.status(400).json({ error: "All fields except isList are required" });
    }

    // Validate unique coupon name
    const existing = await Coupon.findOne({ name: name.trim().toUpperCase() });
    if (existing) {
      return res.status(400).json({ error: "Coupon name already exists" });
    }

    // Validate dates
    const expiryDate = new Date(expiredOn);
    if (isNaN(expiryDate.getTime())) {
      return res.status(400).json({ error: "Invalid expiry date" });
    }
    if (expiryDate < new Date()) {
      return res.status(400).json({ error: "Expiry date must be in the future" });
    }

    // Validate offerPrice and minimumPrice are positive numbers
    if (offerPrice <= 0 || minimumPrice <= 0) {
      return res.status(400).json({ error: "Offer price and minimum price must be positive" });
    }

    // Create new coupon document
    const coupon = new Coupon({
      name: name.trim().toUpperCase(),
      expiredOn: expiryDate,
      offerPrice,
      minimumPrice,
      isList: isList !== undefined ? isList : true,
    });

    await coupon.save();

    return res.status(201).json({ message: "Coupon created successfully", coupon });

  } catch (error) {
    console.error("Create coupon error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};

const deleteCoupon = async (req, res) => {
  try {
    const { couponId } = req.params;

    if (!couponId) {
      return res.status(400).json({ error: "Coupon ID required" });
    }

    const coupon = await Coupon.findById(couponId);

    if (!coupon) {
      return res.status(404).json({ error: "Coupon not found" });
    }

    await coupon.deleteOne();

    return res.status(200).json({ message: "Coupon deleted successfully" });

  } catch (error) {
    console.error("Delete coupon error:", error);
    return res.status(500).json({ error: "Internal Server Error" });
  }
};


module.exports={getCoupon,createCoupon,deleteCoupon}