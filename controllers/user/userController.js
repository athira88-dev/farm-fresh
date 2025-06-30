const User = require('../../models/userSchema')
const Category = require('../../models/categorySchema')
const Product = require('../../models/productSchema')
const Order = require('../../models/orderSchema');
const Address = require('../../models/addressSchema')

const nodemailer=require('nodemailer')
const env=require('dotenv').config();
const bcrypt=require('bcrypt')

const pageNotFound = async (req, res) => {
    try {
        return res.render('404')
    }
    catch (error) {

        res.redirect('/pageNotFound')

    }

}


const loadHomepage = async (req, res) => {
  try {
    const userId = req.session.user;

    // Fetch categories that are listed
    const categories = await Category.find({ isListed: true });

    // Fetch products which are not blocked, belong to those categories, and have quantity > 0
    let productData = await Product.find({
      isBlocked: false,
      category: { $in: categories.map(category => category._id) },
      productQuantity: { $gt: 0 }
    })
    .sort({ createdAt: -1 })  // Sort by newest first (descending)
    .limit(4);                // Limit to 4 products

    if (userId) {
      const userData = await User.findById(userId);
      return res.render('home', { user: userData, products: productData });
    } else {
      return res.render('home', { products: productData });
    }

  } catch (error) {
    console.error('Home page error:', error);
    res.status(500).send('Server error');
  }
}


const loadSignup = async (req, res) => {
    try {
        return res.render('signup')
    }
    catch (error) {
        console.log('Home page not loading')
        res.status(500).send('Server error')

    }

}
 function generateOtp(){
    return Math.floor(100000 + Math.random()*900000).toString()
 }

 async function sendVerificationEmail(email,otp){
    try{
        const transporter=nodemailer.createTransport({
            service:'gmail',
            port:587,
            secure:false,
            requireTLS:true,
            auth:{
                user:process.env.NODEMAILER_EMAIL,
                pass:process.env.NODEMAILER_PASSWORD
            }
        })
        const info=await transporter.sendMail({
            from:process.env.NODEMAILER_EMAIL,
            to:email,
            subject:'Verify your account',
            text:`Your OTP is ${otp}`,
            html:`<b> Your OTP:${otp}</b>`
        })
        return info.accepted.length >0 //then email was sent (or queued) successfully.

    }
    catch(error){
         console.error('Error sending email', error)
         return false

    }
 }


const signup = async (req, res) => {
    try {
        const { fullname, phone, email, password, confirmPassword } = req.body;

        if (password !== confirmPassword) {
            return res.render('signup', { message: "Passwords do not match" });
        }

        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.render('signup', { message: "User with this email already exists" });
        }

        const hashedPassword = await bcrypt.hash(password, 10);
        const otp = generateOtp();
        console.log(otp);
        const otpExpires = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

        // Create a new user with OTP stored
        const newUser = new User({
            name: fullname,
            phone,
            email,
            password: hashedPassword,
            otp,
            otpExpires
        });

        await newUser.save();
        console.log('User saved with OTP:', newUser.otp);

        const emailSent = await sendVerificationEmail(email, otp);
        if (!emailSent) {
            return res.render('signup', { message: "Failed to send verification email. Please try again." });
        }

        // ✅ Store email in session for OTP verification and resendOtp
        req.session.emailForOtp = email;
        req.session.userData = { email }; // <-- Add this line
        req.session.otpPurpose = "signup";

        return res.render('verify-otp');

    } catch (error) {
        console.log('Signup error:', error);
        return res.redirect('/pageNotFound');
    }
};


const securePassword= async(password)=>{
    try{

          const passwordHash = await bcrypt.hash(password, 10); 
        return passwordHash
  

    }
    catch(error){
        console.error('Error hashing password:', error);
        throw error;

    }
}
const verifyOtp = async (req, res) => {
  try {
    const { otp } = req.body;
    const otpPurpose = req.session.otpPurpose;


    // Get stored email (used for all 3 flows)
    const email = req.session.emailForOtp;

    
      console.log("Verifying OTP for email:", email);
    console.log("OTP received from client:", otp);

    if (!email || !otpPurpose) {
      return res.status(400).json({
        success: false,
        message: "Session expired. Please try again.",
      });
    }

    let user;

    // Fetch user based on flow
    if (otpPurpose === "email-change") {
      const userId = req.session.userIdForEmailChange;
      if (!userId) {
        return res.status(400).json({
          success: false,
          message: "Session expired. Please try again.",
        });
      }
      user = await User.findById(userId);
    } else {
      // signup or forgot-password
      user = await User.findOne({ email });
    }


    if (!user) {
      return res.status(404).json({ success: false, message: "User not found." });
    }

    // Check OTP match and expiry
    if (
      typeof otp !== "string" ||
      user.otp !== otp ||
      !user.otpExpires ||
      user.otpExpires < new Date()
    ) {
      return res.status(400).json({
        success: false,
        message: "Invalid or expired OTP. Please try again.",
      });
    }

    // Handle based on purpose
    if (otpPurpose === "signup") {
      user.isVerified = true;
    } else if (otpPurpose === "email-change") {
      user.email = email;
    } else if (otpPurpose === "forgot-password") {
      req.session.passwordResetEmail = email;
    }

    // Clear OTP fields
    user.otp = undefined;
    user.otpExpires = undefined;
    await user.save();

    // Prepare redirect URL
    let redirectUrl = "/login";
    if (otpPurpose === "forgot-password") {
      redirectUrl = "/reset-password";
    } else if (otpPurpose === "email-change") {
      redirectUrl = "/user-profile?message=Email updated successfully";
    }

    // Clear sessions
    req.session.emailForOtp = null;

    // Only clear otpPurpose for signup/email-change
    if (otpPurpose !== "forgot-password") {
      req.session.otpPurpose = null;
    }

    // Optional: clear userIdForEmailChange if used
    if (otpPurpose === "email-change") {
      req.session.userIdForEmailChange = null;
    }

    console.log("✅ OTP verified for:", email);
    console.log("🧭 Purpose:", otpPurpose);
    console.log("➡️ Redirecting to:", redirectUrl);

    return res.json({ success: true, redirectUrl });

  } catch (error) {
    console.error("Error verifying OTP:", error);
    return res.status(500).json({ success: false, message: "An error occurred." });
  }
};



const resendOtp = async (req, res) => {
    try {
        if (!req.session.userData) {
            return res.status(400).json({ success: false, message: "Session expired. Please start again." });
        }

        const { email } = req.session.userData;

        if (!email) {
            return res.status(400).json({ success: false, message: "Email not found in the session" });
        }

        const otp = generateOtp();
        const otpExpires = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes from now

        // Update the OTP and expiration in the database
        const user = await User.findOneAndUpdate(
            { email },
            { otp, otpExpires },
            { new: true }
        );

        if (!user) {
            return res.status(404).json({ success: false, message: "User not found" });
        }

        const emailSent = await sendVerificationEmail(email, otp);
        if (emailSent) {
            console.log("Resend OTP:", otp);
            return res.status(200).json({ success: true, message: "OTP resent successfully" });
        } else {
            return res.status(500).json({ success: false, message: "Failed to resend OTP, please try again" });
        }

    } catch (error) {
        console.error("Error resending OTP:", error);
        return res.status(500).json({ success: false, message: "Internal server error, please try again" });
    }
};



const loadLogin=async (req,res)=>{
    try{

        if(!req.session.user){
            const message = req.session.successMessage;
            req.session.successMessage = null
             return  res.render('login', { message });
        }else{
            res.redirect('/')
        }
    }
    catch(error){
        res.redirect('/pageNotFound')
        }

}

const login=async(req,res)=>{
    try{

        const{email,password}=req.body
        const findUser=await User.findOne({isAdmin:0,email:email})
        if(!findUser){
            return res.render('login',{message:'User not found'})
        }
        if(findUser.isBlocked){
            return res.render('login',{message:'User is blocked by admin'})

        }
        const passwordMatch=await bcrypt.compare(password,findUser.password)
        if(!passwordMatch){
            return res.render('login',{message:'Incorrect Password'})
        }
        req.session.user=findUser._id;
        res.redirect('/')
    }
    catch(error){
        console.error('login error',error)
        res.render('login',{message:'Login failed,Please try again later'})

    }
}

const logout=async(req,res)=>{
    try{
        req.session.destroy((err)=>{
            if(err){
                console.log("Session destruction error",err.message)
                return res.redirect('/pageNotFound')
            }
            return res.redirect('/login')
        })

    }
    catch(error){
        console.log('Logout error',error)
        res.redirect('/pageNotFound')
    }
}

const getForgotPasswordPage = (req, res) => {
  res.render('forgot-password'); // Adjust path to match your views folder
};

const handleForgotPassword = async (req, res) => {
  try {
    const { email } = req.body;

    const user = await User.findOne({ email });

    if (!user) {
      return res.render('forgot-password', {
        message: "No account found with this email.",
      });
    }

    const otp = generateOtp(); // Your 6-digit OTP
    const expiry = new Date(Date.now() + 10 * 60 * 1000); // 10 mins from now

    user.otp = otp;
    user.otpExpires = expiry;
    await user.save();

    // Store email in session to track user across OTP steps
    req.session.emailForOtp = email;
    req.session.otpPurpose = "forgot-password"; //  Store purpose here

    console.log("OTP for password reset:", otp); // Replace with sendEmail() in production

    // res.redirect('/verify-otp'); // Go to OTP verification page
      // Render the OTP form immediately
    return res.render('verify-otp', {
      email,                // so the form knows which email to verify
      message: "OTP sent! Please check your inbox."
    });
  } catch (error) {
    console.error("Error in forgot password:", error);
    res.status(500).render('forgot-password', {
      message: "Something went wrong. Please try again.",
    });
  }
};


const loadShop = async (req, res) => {
  try {
    // Get query params for search, page, sort, filters
    const searchQuery = req.query.search || '';
    const page = parseInt(req.query.page) || 1;
    const limit = 6; // products per page, adjust as needed
    const sortBy = req.query.sortBy || ''; // 'priceLow', 'priceHigh', 'nameAsc', 'nameDesc'
    const category = req.query.category || '';
    const minPrice = parseFloat(req.query.minPrice) || 0;
    const maxPrice = parseFloat(req.query.maxPrice) || Number.MAX_SAFE_INTEGER;

    // Build filter object with isListed and isBlocked filter
    const filter = {
      isDeleted:false,
      isListed: true,
      isBlocked: false,
      price: { $gte: minPrice, $lte: maxPrice },
    };

    // Add category filter if selected

        if (req.query.category) {
      const selectedCategory = await Category.findOne({ name: req.query.category });

        if (selectedCategory) {
        filter.category = selectedCategory._id;
      } else {
        console.warn("Invalid category name:", req.query.category);
      }
    }

    // Add search filter if present
    if (searchQuery) {
      filter.$or = [
        { productName: { $regex: searchQuery, $options: 'i' } },
        { description: { $regex: searchQuery, $options: 'i' } },
      ];
    }

    // Determine sort option
    let sortOption = {};
    switch (sortBy) {
      case 'priceLow':
        sortOption.price = 1;
        break;
      case 'priceHigh':
        sortOption.price = -1;
        break;
      case 'nameAsc':
        sortOption.productName = 1;
        break;
      case 'nameDesc':
        sortOption.productName = -1;
        break;
      default:
        sortOption.createdAt = -1; // default sort newest first
    }

    // Count total matching products for pagination
    const totalProducts = await Product.countDocuments(filter);

    // Calculate total pages
    const totalPages = Math.ceil(totalProducts / limit);

    // Fetch products with filter, sort, pagination
    const products = await Product.find(filter)
      .sort(sortOption)
      .skip((page - 1) * limit)
      .limit(limit);

    // Render shop page with products and pagination info
    res.render('shop', {
      products,
      currentPage: page,
      totalPages,
      searchQuery,
      sortBy,
      category,
      minPrice,
      maxPrice,
    });
  } catch (error) {
    console.error('Error loading shop:', error);
    res.status(500).send('Server Error');
  }
};

const loadResetPasswordPage = async (req, res) => {
  try {
    if (
      req.session.otpPurpose !== "forgot-password" ||
      !req.session.passwordResetEmail
    ) {
      return res.redirect("/login");
    }

    res.render("reset-password", { message: null });
  } catch (error) {
    console.error("Error loading reset password page:", error);
    res.redirect("/login");
  }
};
const handlePasswordReset = async (req, res) => {
  try {
    const email = req.session.passwordResetEmail;
    const { newPassword, confirmPassword } = req.body;

    if (!email) {
      return res.redirect("/login");
    }

    if (!newPassword || newPassword.length < 6) {
      return res.render('reset-password', { message: "Password must be at least 6 characters long." });
    }

    if (newPassword !== confirmPassword) {
      return res.render('reset-password', { message: "Passwords do not match." });
    }

    const user = await User.findOne({ email });

    if (!user) {
      return res.render('reset-password', { message: "User not found." });
    }

    user.password = await bcrypt.hash(newPassword, 10);
    await user.save();

    // Clear session data after successful password reset
    req.session.passwordResetEmail = null;
    req.session.otpPurpose = null;
    req.session.successMessage = "Password reset successfully. Please log in.";
    res.redirect("/login");
  } catch (error) {
    console.error("Error resetting password:", error);
    res.render('reset-password', { message: "Something went wrong. Please try again." });
  }
};



const getProfile = async (req, res) => {
  try {
    const user = res.locals.user; // from middleware

    if (!user) {
      return res.redirect('/login');
    }

    // Fetch fresh user with populated order history and cart
    const freshUser = await User.findById(user._id)
      .populate('orderHistory')
      .populate('cart');

    // Fetch user's address document (if exists)
    const userAddressesDoc = await Address.findOne({ userId: user._id });
    const addresses = userAddressesDoc ? userAddressesDoc.address : [];

    res.render('user-profile', {
      user: freshUser,
      orders: freshUser.orderHistory || [],
      addresses // pass addresses array to template
    });
  } catch (error) {
    console.error("Error fetching user profile:", error);
    res.status(500).send("Something went wrong");
  }
};

const getEditProfile = async (req, res) => {
  const user = res.locals.user;
  const message = req.query.message || null; // optional message from query
  res.render('edit-profile', { user, message });
};


const postEditProfile = async (req, res) => {
  try {
    const userId = res.locals.user._id;
    const { name, email, phone, address } = req.body;
    const profileImage = req.file ? req.file.filename : undefined;

    // Find user
    const user = await User.findById(userId);

    user.name = name || user.name;
    user.phone = phone || user.phone;
    user.address = user.address || {};
    if (address?.street) user.address.street = address.street;
    if (address?.city) user.address.city = address.city;
    if (address?.state) user.address.state = address.state;
    if (address?.postcode) user.address.postcode = address.postcode;
    if (address?.country) user.address.country = address.country;

    if (profileImage) {
      user.profileImage = `/uploads/${profileImage}`;
    }

    // Handle email change with OTP verification
    if (email && email !== user.email) {
      // Generate 6-digit OTP
      const otp = (Math.floor(100000 + Math.random() * 900000)).toString();
      console.log(` OTP for email change (${email}): ${otp}`);
     

      user.otp = otp;
      user.otpExpires = new Date(Date.now() + 15 * 60 * 1000); // 15 minutes expiry

      // Don't update email yet, save new email in session for verification
      req.session.emailForOtp = email;
      req.session.otpPurpose = "email-change";
       req.session.userIdForEmailChange = user._id.toString();  // <--- ADD THIS

      console.log("Storing OTP for email change:", otp);
      console.log("Session emailForOtp:", req.session.emailForOtp);


      await user.save();

      // Send OTP email to the new email address (make sure you have this helper)
      await sendVerificationEmail (email, otp);

      // return res.redirect('/verify-otp?message=Please verify your new email by entering the OTP sent to it.');
      return res.render('verify-otp')
  
    }

    // If email not changed, save normally
    await user.save();

    res.redirect('/user-profile?message=Profile updated successfully');
  } catch (error) {
    console.error(error);
    res.status(500).send('Something went wrong');
  }
};



module.exports = { loadHomepage, pageNotFound, loadSignup, signup,verifyOtp,resendOtp,loadLogin,login,logout,loadShop,getForgotPasswordPage,handleForgotPassword ,loadResetPasswordPage,handlePasswordReset,getProfile,getEditProfile,postEditProfile}