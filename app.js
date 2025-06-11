const express=require('express')
const app=express()
const env=require('dotenv').config();// Loads environment variables
const db=require('./config/db')  // Connects to MongoDB
db() // Call the DB connection function




app.listen(process.env.PORT,()=>{
    console.log('Server running')
})

module.exports=app