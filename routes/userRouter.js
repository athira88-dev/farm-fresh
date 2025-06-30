const express=require('express')
const router=express.Router();// Create a router instance
const userController=require('../controllers/user/userController')
const logRequest = require('../middlewares/logger');
const passport = require('passport');
const {userAuth,adminAuth}=require('../middlewares/auth')
const upload = require('../config/multer'); 

const productController=require('../controllers/user/productController')
const addressController=require('../controllers/user/addressController')

const addToCartController=require('../controllers/user/addToCartController')

// Apply logging only for POST requests (or any you want)
// router.post('/', logRequest);

router.get('/pageNotFound',userController.pageNotFound)
router.get('/',userController.loadHomepage)
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

router.get('/login',userController.loadLogin)
router.post('/login', userController.login);
router.get('/logout',userController.logout)
router.get('/forgot-password', userController.getForgotPasswordPage);
router.post('/forgot-password', userController.handleForgotPassword);
router.get("/reset-password", userController.loadResetPasswordPage);
router.post("/reset-password", userController.handlePasswordReset);

router.get('/', userController.loadHomepage);
router.get('/shop', userAuth,userController.loadShop);
router.get('/user-profile', userAuth,userController.getProfile);
router.get('/edit-profile',userAuth,userController.getEditProfile);
// Handle edit profile form submission with image upload
router.post('/edit-profile',userAuth, upload.single('profileImage'), userController.postEditProfile);


//Product Management
router.get('/product-details',userAuth,productController.productDetails);

//Address Management
router.get('/manage-address', userAuth, addressController.getManageAddresses);

router.get('/add-address', userAuth, addressController.getAddAddressForm);
router.post('/add-address', userAuth, addressController.postAddAddress);

router.get('/edit-address/:addressId', userAuth, addressController.getEditAddressForm);
router.post('/edit-address/:addressId', userAuth, addressController.postEditAddress);

router.post('/delete-address/:addressId', userAuth, addressController.postDeleteAddress);





router.post('/add-to-cart',userAuth,addToCartController.addToCart);

module.exports=router