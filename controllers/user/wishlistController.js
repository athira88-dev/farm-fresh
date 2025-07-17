const Cart = require('../../models/cartSchema');
const Product = require('../../models/productSchema')
const Wishlist = require('../../models/wishlistSchema'); 

const addToWishlist = async (req, res) => {
  try {
    const userId = req.session?.user;
    const productId = req.body.productId;

    if (!userId) {
      return res.redirect('/login');
    }

    // Check if product exists and is available
    const product = await Product.findOne({
      _id: productId,
      isDeleted: false,
      isBlocked: false,
      isListed: true,
    });

    if (!product) {
      return res.status(400).send('Product not available');
    }

    // Find or create wishlist
    let wishlist = await Wishlist.findOne({ userId });
    if (!wishlist) {
      wishlist = new Wishlist({
        userId,
        items: [],
      });
    }

    // Check if product already in wishlist
    const index = wishlist.items.findIndex(
      (item) => item.productId.toString() === productId
    );

    if (index === -1) {
      // Add product to wishlist
      wishlist.items.push({ productId });
    } else {
      // Product already in wishlist, optionally respond accordingly
      return res.status(400).send('Product already in wishlist');
    }

    await wishlist.save();

    // Remove from cart if present
    const cart = await Cart.findOne({ userId });
    if (cart) {
      const cartIndex = cart.items.findIndex(
        (item) => item.productId.toString() === productId
      );
      if (cartIndex > -1) {
        cart.items.splice(cartIndex, 1);
        await cart.save();
        console.log('Removed product from cart');
      }
    }

    res.redirect('/wishlist'); // or wherever you want to redirect
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
};

const viewWishlist = async (req, res) => {
  try {
    const userId = req.session.user;

    const wishlist = await Wishlist.findOne({ userId }).populate({
      path: 'items.productId',
      model: Product,
      match: { isDeleted: false, isBlocked: false, isListed: true }
    });

    res.render('viewwishlist', {
      wishlistItems: wishlist ? wishlist.items : []
    });
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
};

const removeFromWishlist = async (req, res) => {
  try {
    const userId = req.session?.user;
    const productId = req.body.productId;

    if (!userId) {
      return res.redirect('/login');
    }

    const wishlist = await Wishlist.findOne({ userId });

    if (wishlist) {
      wishlist.items = wishlist.items.filter(
        (item) => item.productId.toString() !== productId
      );
      await wishlist.save();
    }

    res.redirect('/wishlist');
  } catch (error) {
    console.error(error);
    res.status(500).send('Internal Server Error');
  }
};

module.exports = {
  addToWishlist,viewWishlist,removeFromWishlist
};
