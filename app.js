const express=require('express')
const app=express()
const path=require('path')
const env=require('dotenv').config();// Loads environment variables
const db=require('./config/db')  // Connects to MongoDB
// This file will contain all the route handlers related to user-facing pages or APIs.
const userRouter=require('./routes/userRouter')
db() // Call the DB connection function
app.use(express.json())// Parse incoming JSON data in request bodies
app.use(express.urlencoded({extended:true}))// Parse URL-encoded data (e.g., from HTML form submissions)

app.set('view engine','ejs')
// Set multiple directories for views — one for user views and one for admin views
app.set('views',[path.join(__dirname,'views/user'),path.join(__dirname,'views/admin')])
// Serve static files (CSS, JS, images, etc.) from the 'public' folder
app.use(express.static(path.join(__dirname, 'public')));
// Use userRouter to handle routes for user
app.use('/',userRouter)



app.listen(process.env.PORT,()=>{
    console.log('Server running')
})

module.exports=app