const express=require('express')
const router=express.Router();// Create a router instance
const adminController=require('../controllers/admin/adminController');
const customerController=require('../controllers/admin/customerController');
const categoryController=require('../controllers/admin/categoryController');
// const brandController=require('../controllers/admin/brandController');
const productController=require('../controllers/admin/productController');
const orderController=require('../controllers/admin/orderController');
const offerController=require('../controllers/admin/offerController');
const couponController = require('../controllers/admin/couponController');

const {userAuth,adminAuth}=require('../middlewares/auth')
const multer=require('multer')
const upload = require('../config/multer')



router.get('/pageerror',adminController.pageerror)
router.get('/login',adminController.loadLogin)
router.post('/login',adminController.login)
router.get('/',adminAuth,adminController.loadDashboard)
router.get('/logout',adminController.logout)

router.get('/sales-report/download-pdf', adminAuth,adminController.downloadSalesReportPDF);
router.get('/sales-report/download-excel', adminAuth,adminController.downloadSalesReportExcel);


//Customer Management
router.get('/users',adminAuth,customerController.customerInfo)
router.get('/blockCustomer',adminAuth,customerController.customerBlocked)
router.get('/unblockCustomer',adminAuth,customerController.customerunBlocked)

//Category Management
router.get('/category',adminAuth,categoryController.categoryInfo)
router.get('/addCategory',adminAuth,categoryController.getAddCategory)
router.post('/addCategory',adminAuth,categoryController.addCategory)
router.get('/editCategory/:id',adminAuth,categoryController.getEditCategory)
router.post('/editCategory/:id',adminAuth,categoryController.editCategory)
router.post('/category/delete/:id', adminAuth, categoryController.softDeleteCategory);
router.post('/category/list/:id', adminAuth, categoryController.listCategory)// Mark category as listed (visible)
router.post('/category/unlist/:id', adminAuth, categoryController.unlistCategory)// Mark category as unlisted (hidden)
router.post('/category/block/:id', adminAuth, categoryController.blockCategory)// Block a category
router.post('/category/unblock/:id', adminAuth, categoryController.unblockCategory)// Unblock a category


//Brand Management
// router.get('/addProducts',adminAuth,productController.getBrandPage)


//Product Management
router.get('/addProducts',adminAuth,productController.getProductAddPage);
router.post('/addProducts',adminAuth,upload.array('images'),productController.addProducts);
router.get('/products',adminAuth,productController.displayProducts)
router.post('/product-edit/:id', adminAuth, upload.array('newImages', 5), productController.editProduct);
router.post('/product-delete/:id',adminAuth,productController.deleteProduct)
router.patch('/product-isBlocked/:id', adminAuth, productController.toggleBlockStatus);
router.patch('/product-isListed/:id', adminAuth, productController.toggleListStatus);



//Order Management
router.get('/orders', adminAuth, orderController.listOrders);
router.get('/orders/:orderId', adminAuth, orderController.getOrderDetails);
router.post('/orders/:orderId/status', adminAuth, orderController.updateOrderStatus);
router.post('/orders/:id/verify-return', orderController.verifyReturnRequest);


//Offer Managemnt

router.post('/product-offers', adminAuth, offerController.addProductOffer);        // Create new offer
router.patch('/product-offers/:productId', adminAuth, offerController.editProductOffer);
router.delete('/product-offers/:productId', adminAuth, offerController.deleteProductOffer);

// Category offer routes
router.post('/category/offer/add', adminAuth, offerController.addCategoryOffer);          // Create new category offer
router.post('/category/offer/edit', adminAuth, offerController.editCategoryOffer);  // Edit category offer by ID
router.delete('/category/offer/delete/:categoryId', adminAuth, offerController.deleteCategoryOffer); // Delete category offer by ID



//Coupon Management
router.get('/coupon', adminAuth,couponController.getCoupon);
router.post('/coupons', adminAuth,couponController.createCoupon);
router.delete('/coupons/:couponId', adminAuth,couponController.deleteCoupon);



module.exports=router