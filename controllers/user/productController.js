const User = require('../../models/userSchema')
const Category = require('../../models/categorySchema')
const Product = require('../../models/productSchema')


const productDetails = async (req, res) => {
  const productId = req.query.id;

  if (!productId) {
    return res.status(400).send('Product ID missing');
  }

  try {
    // Fetch product by ID including reviews (if stored as subdocuments)
    // const product = await Product.findById(productId).lean(); 
    const product = await Product.findById(productId).populate('category').lean();
    // Using .lean() to get plain JS object, easier for EJS manipulation

        //  Redirect if product not found or not available
    if (!product || product.isBlocked || !product.isListed || product.isDeleted) {
      return res.redirect('/shop');  // Adjust this path as per your product listing route
    } `1`
    // Optional: Add computed properties to product object for ease in the view

    // Calculate discount percent if originalPrice exists and is > price
    if (product.originalPrice && product.originalPrice > product.price) {
      product.discountPercent = Math.round(100 - (product.price / product.originalPrice) * 100);
    } else {
      product.discountPercent = 0;
    }

    // Ensure product.reviews exists and is an array
    if (!product.reviews) {
      product.reviews = [];
    }

    // Optionally, calculate average rating if you want to store it dynamically
    if (product.reviews.length > 0) {
      const totalRating = product.reviews.reduce((sum, r) => sum + r.rating, 0);
      product.rating = (totalRating / product.reviews.length).toFixed(1);
      product.ratingCount = product.reviews.length;
    } else {
      product.rating = 0;
      product.ratingCount = 0;
    }

     // **Add related products fetch here**
    const relatedProducts = await Product.find({
      category: product.category._id,
      _id: { $ne: product._id },
      isListed: true,
      isBlocked: false,
      isDeleted: false
    })
    .limit(10)
    .lean();

    // Pass both product and relatedProducts to the view
    res.render('product-details', { product, relatedProducts });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
};


module.exports = {productDetails} 