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

const increaseQuantity = async (req, res) => {
  try {
    const userId = req.session?.user;
    const productId = req.body.productId; // or req.params.productId

    if (!userId) {
      return res.redirect('/login');
    }

    const product = await Product.findById(productId);
    if (!product || product.stock <= 0) {
      return res.status(400).send('Product not available or out of stock');
    }

    let cart = await Cart.findOne({ userId });
    if (!cart) {
      return res.status(400).send('Cart not found');
    }

    const itemIndex = cart.items.findIndex(item => item.productId.toString() === productId);
    if (itemIndex === -1) {
      return res.status(400).send('Product not in cart');
    }

    const item = cart.items[itemIndex];

    // Check limits before increasing
    if (item.quantity >= product.stock || item.quantity >= product.maxQuantity) {
      return res.status(400).send('Reached max quantity or stock limit');
    }

    item.quantity += 1;
    item.totalPrice = item.quantity * item.price;

    cart.updatedAt = new Date();

    await cart.save();

    res.redirect('/cart'); // or res.json({ success: true, cart });
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
};


const updateCartQuantity = async (req, res) => {
  try {
    const userId = req.session?.user;
    if (!userId) return res.redirect('/login');

    const { productId, quantity } = req.body;
    const newQty = parseInt(quantity);

    if (newQty < 1) {
      return res.status(400).send('Quantity must be at least 1');
    }

    const product = await Product.findById(productId);
    if (!product) return res.status(404).send('Product not found');

    if (newQty > product.stock || newQty > product.maxQuantity) {
      return res.status(400).send('Quantity exceeds stock or max limit');
    }

    const cart = await Cart.findOne({ userId });
    if (!cart) return res.status(404).send('Cart not found');

    const itemIndex = cart.items.findIndex(item => item.productId.toString() === productId);
    if (itemIndex === -1) return res.status(404).send('Product not in cart');

    cart.items[itemIndex].quantity = newQty;
    cart.items[itemIndex].totalPrice = newQty * product.price;

    await cart.save();

    res.redirect('/cart');  // Or send JSON if API
  } catch (err) {
    console.error(err);
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



module.exports = { addToCart,viewCart,increaseQuantity,updateCartQuantity,removeFromCart};
