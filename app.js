const express=require('express')
const app=express()
const path=require('path')
const env=require('dotenv').config();// Loads environment variables
const session=require('express-session')//Importing the express-session middleware to manage user sessions in the app
const passport=require('./config/passport')
const cookieParser = require('cookie-parser');

const db=require('./config/db')  // Connects to MongoDB
// This file will contain all the route handlers related to user-facing pages or APIs.
const userRouter=require('./routes/userRouter')

const adminRouter=require('./routes/adminRouter')
db() // Call the DB connection function
app.use(express.json())// Parse incoming JSON data in request bodies
app.use(express.urlencoded({extended:true}))// Parse URL-encoded data (e.g., from HTML form submissions)
app.use(cookieParser());//populate req.cookies 
app.use(session({
    secret: process.env.SESSION_SECRET,
    resave: false,
    saveUninitialized: true,
    cookie: {
        secure: false, // use true if on HTTPS
        httpOnly: true,
        sameSite: 'lax', // 👈 REQUIRED for OAuth redirect to preserve session
        maxAge: 72 * 60 * 60 * 1000
    }
}));


app.use(passport.initialize())// sets up Passport.
app.use(passport.session()) //integrates Passport with express-session for persistent login.

 //Makes the logged-in user available to all EJS views via `locals.user`
 //for google loginunless you explicitly pass user to res.render() or set it in res.locals, the template won’t know about it.
app.use((req, res, next) => {
  res.locals.user = req.user;
  next();
});

app.use((req,res,next)=>{
    res.set('cache-control','no-store')
    next()
})

app.use((req, res, next) => {
  res.locals.success = req.session.success;
  delete req.session.success;
  next();
});


app.set('view engine','ejs')
// Set multiple directories for views — one for user views and one for admin views
app.set('views',[path.join(__dirname,'views/user'),path.join(__dirname,'views/admin')])


app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
// Serve static files (CSS, JS, images, etc.) from the 'public' folder
app.use(express.static(path.join(__dirname, 'public')));
// Use userRouter to handle routes for user
app.use('/',userRouter)
app.use('/admin',adminRouter)

// app.get('/test-order-details', (req, res) => {
//   res.render('order-details', {
//     order: {
//       orderId: '1234',
//       status: 'Pending',
//       createdOn: new Date(),
//       paymentMethod: 'COD',
//       couponApplied: false,
//       orderedItems: [],
//       totalPrice: 10,
//       discount: 1,
//       finalAmount: 9,
//       address: {
//         street: '123 St',
//         city: 'City',
//         state: 'State',
//         zip: '12345',
//         country: 'Country',
//         phone: '000-0000'
//       }
//     }
//   });
// });

app.listen(process.env.PORT,()=>{
    console.log('Server running')
})

module.exports=app