const express=require('express')
const router=express.Router();// Create a router instance
const userController=require('../controllers/user/userController')
const logRequest = require('../middlewares/logger');
const passport = require('passport');
const {userAuth,adminAuth}=require('../middlewares/auth')
const upload = require('../config/multer'); 

const productController=require('../controllers/user/productController')
const addressController=require('../controllers/user/addressController')

const cartController=require('../controllers/user/cartController')
const wishlistController = require('../controllers/user/wishlistController');
const checkoutController = require('../controllers/user/checkoutController');
const orderController = require('../controllers/user/orderController');
const walletController = require('../controllers/user/walletController');

// Apply logging only for POST requests (or any you want)
// router.post('/', logRequest);


router.get('/pageNotFound',userController.pageNotFound)
// router.get('/',userController.loadHomepage)
router.get('/signup',userController.loadSignup)
// router.post('/signup',userController.signup)
router.post('/signup', logRequest, userController.signup);
//Add logging middleware inside the route for signup POST
// router.post('/signup', (req, res, next) => {
//   console.log('POST /signup hit');
//   next();
// }, userController.signup);
router.post('/verify-otp',userController.verifyOtp)
router.post('/resend-otp',userController.resendOtp)

router.get('/auth/google', passport.authenticate('google', {
  scope: ['profile', 'email']
}));// Initiates Google OAuth login

router.get('/auth/google/callback',
  passport.authenticate('google', {failureRedirect: '/signup'}),
  (req,res)=>{res.redirect('/')
});// Callback route after Google has authenticated the user

// router.get('/login',  (req, res, next) => {console.log("GET /login hit");
//     next();},userController.loadLogin)
router.get('/login',userController.loadLogin)
router.post('/login', userController.login);
router.get('/logout',userController.logout)
router.get('/forgot-password', userController.getForgotPasswordPage);
router.post('/forgot-password', userController.handleForgotPassword);
router.get("/reset-password", userController.loadResetPasswordPage);
router.post("/reset-password", userController.handlePasswordReset);
router.post('/resend-otp', userController.resendOtp);

router.get('/',userController.loadHomepage);
router.get('/shop', userAuth,userController.loadShop);
router.get('/user-profile', userAuth,userController.getProfile);
router.get('/edit-profile',userAuth,userController.getEditProfile);
// Handle edit profile form submission with image upload
router.post('/edit-profile',userAuth, upload.single('profileImage'), userController.postEditProfile);

router.post('/set-default-address/:id',userAuth,userController.setDefaultAddress);
// router.get('/set-default-address/:id', userAuth,userController.setDefaultAddress);


//Product Management
router.get('/product-details',userAuth,productController.productDetails);

//Address Management
router.get('/manage-address', userAuth, addressController.getManageAddresses);

router.get('/add-address', userAuth, addressController.getAddAddressForm);
router.post('/add-address', userAuth, addressController.postAddAddress);

router.get('/edit-address/:addressId', userAuth, addressController.getEditAddressForm);
router.post('/edit-address/:addressId', userAuth, addressController.postEditAddress);

router.post('/delete-address/:addressId', userAuth, addressController.postDeleteAddress);




//Cart Management
router.post('/add-to-cart',userAuth,cartController.addToCart);
router.get('/cart', userAuth, cartController.viewCart);
router.post('/cart/increase',userAuth,cartController.increaseQuantity);
router.post('/cart/update-quantity',userAuth, cartController.updateCartQuantity);
router.post('/cart/remove', userAuth, cartController.removeFromCart);

//Wishlist Management
// Add product to wishlist
router.post('/add-to-wishlist',userAuth, wishlistController.addToWishlist);
router.get('/wishlist',userAuth, wishlistController.viewWishlist);
router.post('/wishlist/remove', wishlistController.removeFromWishlist);

//Checkout Management
router.get('/checkout',userAuth, checkoutController.viewCheckout);
// router.get(['/checkout', '/checkout/:orderId'], userAuth, checkoutController.viewCheckout);
router.get('/retry-checkout/:orderId', userAuth, checkoutController.viewRetryCheckout);

router.post('/apply-coupon', userAuth,checkoutController.applyCoupon);
router.post('/remove-coupon', userAuth,checkoutController.removeCoupon);



//Order Management
router.post('/place-order',userAuth, orderController.placeOrder);
router.post('/place-paypal-order',userAuth, orderController.placePaypalOrder );

router.get('/order/success',userAuth, orderController.viewOrder);
router.get('/order-failure', userAuth, orderController.orderFailed);
router.get('/retry-payment/:orderId', userAuth,orderController.paymentRetryController);
router.get('/orders', userAuth, orderController.getUserOrders);
router.get('/orders/search', userAuth, orderController.searchOrders);
router.get('/orders/:orderId', userAuth, orderController.getOrderDetails);

router.post('/orders/:id/cancel',userAuth,orderController.cancelOrder);
router.post('/orders/:orderId/cancel-item',userAuth,orderController.cancelItem);
router.post('/orders/:orderId/return',userAuth,orderController.returnOrder);
router.get('/orders/:orderId/invoice', userAuth, orderController.downloadInvoice);


//Wallet Management
router.get('/wallet', userAuth, walletController.showWallet);



module.exports=router