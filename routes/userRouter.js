const express=require('express')
const router=express.Router();// Create a router instance
const userController=require('../controllers/user/userController')




router.get('/pageNotFound',userController.pageNotFound)
router.get('/',userController.loadHomepage)

module.exports=router