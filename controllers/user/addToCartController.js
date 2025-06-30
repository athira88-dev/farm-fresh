const Cart = require('../../models/cartSchema');
const Product = require('../../models/productSchema')
const User = require('../../models/userSchema')

const addToCart = async (req, res) => {
  try {
    const userId = req.session?.user?._id;
    const productId = req.body.productId;

    if (!userId) {
      return res.redirect('/login'); // redirect to login if user not logged in
    }

    const product = await Product.findOne({
      _id: productId,
      isBlocked: false,
      isListed: true,
      isDeleted: false
    });

    if (!product) {
      return res.redirect('/products'); // redirect to listing if product is not available
    }

    let cart = await Cart.findOne({ userId });

    const productIndex = cart?.items.findIndex(item => item.productId.toString() === productId);

    if (cart && productIndex > -1) {
      // Product exists in cart - update quantity and price
      cart.items[productIndex].quantity += 1;
      cart.items[productIndex].totalPrice = cart.items[productIndex].quantity * product.price;
    } else if (cart) {
      // Add new product to existing cart
      cart.items.push({
        productId,
        quantity: 1,
        price: product.price,
        totalPrice: product.price
      });
    } else {
      // No cart yet - create new one
      cart = new Cart({
        userId,
        items: [{
          productId,
          quantity: 1,
          price: product.price,
          totalPrice: product.price
        }]
      });
    }

    await cart.save();
    res.redirect('/cart'); // or wherever you want to send the user after adding
  } catch (err) {
    console.error(err);
    res.status(500).send('Internal Server Error');
  }
};

module.exports = { addToCart };
