const express=require('express')
const app=express()
const path=require('path')
const env=require('dotenv').config();// Loads environment variables
const session=require('express-session')//Importing the express-session middleware to manage user sessions in the app
const passport=require('./config/passport')
const db=require('./config/db')  // Connects to MongoDB
// This file will contain all the route handlers related to user-facing pages or APIs.
const userRouter=require('./routes/userRouter')
const adminRouter=require('./routes/adminRouter')
db() // Call the DB connection function
app.use(express.json())// Parse incoming JSON data in request bodies
app.use(express.urlencoded({extended:true}))// Parse URL-encoded data (e.g., from HTML form submissions)
app.use(session({
    secret:process.env.SESSION_SECRET,
    resave:false,
    saveUninitialized:true,
    cookie:{
    secure:false,
    httpOnly:true,
    maxAge:72*60*60*1000
    }
}))

app.use(passport.initialize())// sets up Passport.
app.use(passport.session()) //integrates Passport with express-session for persistent login.


app.use((req,res,next)=>{
    res.set('cache-control','no-store')
    next()
})

app.set('view engine','ejs')
// Set multiple directories for views — one for user views and one for admin views
app.set('views',[path.join(__dirname,'views/user'),path.join(__dirname,'views/admin')])
// Serve static files (CSS, JS, images, etc.) from the 'public' folder
app.use(express.static(path.join(__dirname, 'public')));
// Use userRouter to handle routes for user
app.use('/',userRouter)
app.use('/admin',adminRouter)



app.listen(process.env.PORT,()=>{
    console.log('Server running')
})

module.exports=app