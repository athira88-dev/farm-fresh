const Address = require('../../models/addressSchema');
const Cart = require('../../models/cartSchema');
const Product = require('../../models/productSchema')
const User = require('../../models/userSchema')
const Wishlist = require('../../models/wishlistSchema'); 
const { applyBestOffer } = require('../../helpers/offerCalculator');

const addToCart = async (req, res) => {
  console.log('Add to Cart called');
  try {
    const userId = req.session?.user;
    const productId = req.body.productId;
    let quantityToAdd = parseInt(req.body.quantity) || 1;

    if (!userId) {
      console.log('User not logged in');
      return res.redirect('/login');
    }

    // Fetch product and populate category
    const product = await Product.findOne({
      _id: productId,
      isDeleted: false,
      isBlocked: false,
      isListed: true
    }).populate('category');

    if (!product) {
      console.log('Product not found or unavailable');
      return res.status(400).send('Product or category is not available');
      
    }

    // Validate product & category status
    if (
      !product.category ||
      product.category.isBlocked ||
      !product.category.isListed
    ) {
      console.log('Product or category is not available or blocked');
      return res.status(400).send('Product or category is not available');
    }

    // Check if product is out of stock
    if (product.stock <= 0) {
      console.log('Product out of stock');
      return res.status(400).send('Product is out of stock');
    }

    // Ensure quantityToAdd is at least 1
    if (quantityToAdd < 1) quantityToAdd = 1;

    // Calculate pricing and discount
   const originalPrice = product.originalPrice || product.price;
    const finalPrice = product.price;
    const discount =
      originalPrice > finalPrice
        ? Math.round(((originalPrice - finalPrice) / originalPrice) * 100)
        : 0;

    let cart = await Cart.findOne({ userId });
    console.log('Cart fetched:', cart);

    if (cart) {
      const productIndex = cart.items.findIndex(
        (item) => item.productId.toString() === productId
      );
      console.log('Product index in cart:', productIndex);

      if (productIndex > -1) {
        // Product already in cart
        const currentQty = cart.items[productIndex].quantity;
        const newQty = currentQty + quantityToAdd;

        if (newQty > product.stock || newQty > product.maxQuantity) {
          console.log('Max quantity or stock limit reached');
          return res
            .status(400)
            .send('Reached max quantity or stock limit for this product');
        }


     
    

        cart.items[productIndex].quantity = newQty;
cart.items[productIndex].originalPrice = originalPrice;
cart.items[productIndex].discount = discount;
cart.items[productIndex].finalPrice = finalPrice;
cart.items[productIndex].totalPrice = newQty * finalPrice;


      } else {
        // New product to add
        if (quantityToAdd > product.stock || quantityToAdd > product.maxQuantity) {
          console.log('Requested quantity exceeds stock or max limit');
          return res
            .status(400)
            .send('Requested quantity exceeds stock or max quantity for this product');
        }

        cart.items.push({
          productId,
          quantity: quantityToAdd,
          originalPrice,
          discount,
          finalPrice,
          totalPrice: finalPrice * quantityToAdd,
        });
      }
    } else {
      // No cart found. Create new cart
      if (quantityToAdd > product.stock || quantityToAdd > product.maxQuantity) {
        console.log('Requested quantity exceeds stock or max limit');
        return res
          .status(400)
          .send('Requested quantity exceeds stock or max quantity for this product');
      }

      cart = new Cart({
        userId,
        items: [
          {
            productId,
            quantity: quantityToAdd,
            originalPrice,
            discount,
            finalPrice,
            totalPrice: finalPrice * quantityToAdd,
          },
        ],
      });
    }

    await cart.save();

    // Remove from wishlist if exists
    const wishlist = await Wishlist.findOne({ userId });
    if (wishlist) {
      const index = wishlist.items.findIndex(
        (item) => item.productId.toString() === productId
      );
      if (index > -1) {
        wishlist.items.splice(index, 1);
        await wishlist.save();
        console.log('Removed product from wishlist');
      }
    }

    res.redirect('/cart');
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
  }
};


const viewCart = async (req, res) => {
  try {
    const userId = req.session?.user;
    if (!userId) return res.redirect('/login');

    const cart = await Cart.findOne({ userId }).populate({
      path: 'items.productId',
      populate: {
        path: 'category',
      },
    });

    let cartHasStockIssues = false;

    if (cart) {
      for (const item of cart.items) {
        const product = applyBestOffer(item.productId);
        item.totalPrice = product.finalPrice * item.quantity;

        // Check stock for each item
        if (!product.stock || item.quantity > product.stock) {
          cartHasStockIssues = true;
        }
      }
    }

    res.render('viewcart', { 
      cart,
      cartHasStockIssues,
      errorMessage: cartHasStockIssues ? "Some items are out of stock or have insufficient quantity." : null
    });
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
  }
};


const updateCartQuantity = async (req, res) => {
  try {
    const userId = req.session?.user;
    if (!userId) return res.redirect('/login');

    const { productId, quantity } = req.body;
    let newQty = parseInt(quantity);

    if (isNaN(newQty) || newQty < 1) newQty = 1;

    const product = await Product.findById(productId);
    if (!product) return res.status(404).send('Product not found');

    // ✅ MAIN FIX: BLOCK if stock is 0
    if (product.stock === 0) {
      req.session.errorMessage = `${product.productName} is out of stock`;
      return res.redirect('/cart'); // ❌ DO NOT update anything
    }

    const cart = await Cart.findOne({ userId });
    if (!cart) return res.status(404).send('Cart not found');

    const itemIndex = cart.items.findIndex(
      item => item.productId.toString() === productId
    );

    if (itemIndex === -1) return res.status(404).send('Product not in cart');

    // ✅ limit quantity properly
    if (newQty > product.stock) {
      newQty = product.stock;
    }

    if (newQty > product.maxQuantity) {
      newQty = product.maxQuantity;
    }

    cart.items[itemIndex].quantity = newQty;

    const price = product.finalPrice || product.price || 0;
    cart.items[itemIndex].totalPrice = newQty * price;

    await cart.save();

    res.redirect('/cart');
  } catch (err) {
    console.error("🔥 UPDATE CART ERROR:", err);
    res.status(500).send('Internal Server Error');
  }
};
const removeFromCart = async (req, res) => {
  try {
    const userId = req.session?.user;
    const productId = req.body.productId;

    if (!userId) return res.redirect('/login');

    const cart = await Cart.findOne({ userId });
    if (!cart) return res.status(404).send('Cart not found');

    // Filter out the product to remove
    cart.items = cart.items.filter(item => item.productId.toString() !== productId);

    await cart.save();

    res.redirect('/cart');
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
  }
};
const proceedToCheckout = async (req, res) => {
  try {
    const userId = req.session?.user;
    if (!userId) return res.redirect('/login');

    const cart = await Cart.findOne({ userId }).populate({
      path: 'items.productId',
      populate: { path: 'category', select: 'categoryOffer' }
    });

    if (!cart || cart.items.length === 0) {
      req.session.errorMessage = "Your cart is empty.";
      return res.redirect('/cart');
    }

    // Check stock
    const outOfStockItems = cart.items.filter(item => {
      const product = item.productId;
      return !product || product.stock === 0 || item.quantity > product.stock;
    });

    if (outOfStockItems.length > 0) {
      const outOfStockNames = outOfStockItems.map(i =>
        i.productId?.productName
          ? `${i.productId.productName} (available: ${i.productId.stock})`
          : 'Unknown Product'
      ).join(', ');

      req.session.errorMessage = `The following items are unavailable or exceed stock: ${outOfStockNames}`;
      return res.redirect('/cart');
    }

    // Prepare cartItems for checkout
  cartItems = cart.items.map(item => {
  const product = item.productId || {};
  const bestOfferProduct = applyBestOffer(product);

  return {
    ...item.toObject(),
    productName: bestOfferProduct.productName,
    productImage: bestOfferProduct.productImage,
    originalPrice: parseFloat(bestOfferProduct.originalPrice) || 0,
    finalPrice: parseFloat(bestOfferProduct.finalPrice) || 0,
    appliedDiscount: bestOfferProduct.appliedDiscount || 0,
    discountSource: bestOfferProduct.discountSource || ''
  };
});

    const subtotal = cartItems.reduce((sum, item) => sum + item.finalPrice * item.quantity, 0);
    const totalOfferDiscount = cartItems.reduce((sum, item) => sum + ((item.originalPrice - item.finalPrice) * item.quantity), 0);
    const couponDiscount = req.session.discountAmount || 0;
    const finalAmount = subtotal - couponDiscount;
    const taxRate = 0.05;
    const shippingCost = 4.99;
    const taxAmount = +(finalAmount * taxRate).toFixed(2);
    const grandTotal = +(finalAmount + taxAmount + shippingCost).toFixed(2);

    // Fetch addresses
    const addressDoc = await Address.findOne({ userId });
    const addresses = addressDoc?.address || [];
    const selectedAddressId = addresses.length > 0 ? addresses[0]._id.toString() : null;
    const selectedAddress = addresses.find(addr => addr._id.toString() === selectedAddressId) || null;

    // Render checkout
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
      discount: totalOfferDiscount + couponDiscount,
      discountAmount: totalOfferDiscount + couponDiscount,
      couponApplied: couponDiscount > 0
    });

  } catch (err) {
    console.error('Proceed to checkout error:', err);
    res.status(500).send('Internal Server Error');
  }
};


module.exports = { addToCart,viewCart,updateCartQuantity,removeFromCart,proceedToCheckout};
