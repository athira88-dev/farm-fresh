const User = require('../../models/userSchema')
const Category = require('../../models/categorySchema')
const Product = require('../../models/productSchema')
const { applyBestOffer } = require('../../helpers/offerCalculator');


const productDetails = async (req, res) => {
  const productId = req.query.id;

  if (!productId) {
    return res.status(400).send('Product ID missing');
  }

  try {
    const product = await Product.findById(productId).populate('category').lean();

    if (!product || product.isBlocked || !product.isListed || product.isDeleted) {
      return res.redirect('/shop');
    }

    // ✅ Apply the best offer logic here
    applyBestOffer(product); // modifies product in-place

    // ✅ Add rating logic
    if (!product.reviews) {
      product.reviews = [];
    }

    if (product.reviews.length > 0) {
      const totalRating = product.reviews.reduce((sum, r) => sum + r.rating, 0);
      product.rating = (totalRating / product.reviews.length).toFixed(1);
      product.ratingCount = product.reviews.length;
    } else {
      product.rating = 0;
      product.ratingCount = 0;
    }

    // ✅ Related products
    const relatedProducts = await Product.find({
      category: product.category._id,
      _id: { $ne: product._id },
      isListed: true,
      isBlocked: false,
      isDeleted: false
    }).limit(10).lean();

    res.render('product-details', { product, relatedProducts });
  } catch (err) {
    console.error(err);
    res.status(500).send('Server error');
  }
};


module.exports = {productDetails} 