const express=require('express')
const router=express.Router();// Create a router instance
const adminController=require('../controllers/admin/adminController');
const customerController=require('../controllers/admin/customerController');
const categoryController=require('../controllers/admin/categoryController');
// const brandController=require('../controllers/admin/brandController');
const productController=require('../controllers/admin/productController');
const orderController=require('../controllers/admin/orderController');
const {userAuth,adminAuth}=require('../middlewares/auth')
const multer=require('multer')
const upload = require('../config/multer')



router.get('/pageerror',adminController.pageerror)
router.get('/login',adminController.loadLogin)
router.post('/login',adminController.login)
router.get('/',adminAuth,adminController.loadDashboard)
router.get('/logout',adminController.logout)

//Customer Management
router.get('/users',adminAuth,customerController.customerInfo)
router.get('/blockCustomer',adminAuth,customerController.customerBlocked)
router.get('/unblockCustomer',adminAuth,customerController.customerunBlocked)

//Category Management
router.get('/category',adminAuth,categoryController.categoryInfo)
router.post('/addCategory',adminAuth,categoryController.addCategory)
router.get('/editCategory',adminAuth,categoryController.getEditCategory)
router.post('/editCategory/:id',adminAuth,categoryController.editCategory)
router.post('/category/delete/:id', adminAuth, categoryController.softDeleteCategory);

//Brand Management
// router.get('/addProducts',adminAuth,productController.getBrandPage)


//Product Management
router.get('/addProducts',adminAuth,productController.getProductAddPage);
router.post('/addProducts',adminAuth,upload.array('images'),productController.addProducts);
router.get('/products',adminAuth,productController.displayProducts)
router.post('/product-edit/:id', adminAuth, upload.array('newImages', 5), productController.editProduct);
router.post('/product-delete/:id',adminAuth,productController.deleteProduct)

//Order Management
router.get('/orders',adminAuth,orderController.orderListing);





module.exports=router