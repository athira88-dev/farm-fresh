const User = require('../../models/userSchema')
const mongoose = require('mongoose')
const bcrypt = require('bcrypt')

const pageerror = (req, res) => {

    return res.render('admin-error')

}


const loadLogin = (req, res) => {

    if (req.session.admin) {
        return res.redirect('/admin/dashboard')

    }
    return res.render('admin-login', { message: null })

}

// const login = async (req, res) => {
//     try {

//         const { email, password } = req.body
//         const admin = await User.findOne({ isAdmin: true, email })
//         if (admin) {
//             const passwordMatch = bcrypt.compare(password, admin.password)

        
//         if (passwordMatch) {
//             req.session.admin = true
//             return res.redirect('/admin')

//         } else {
//             return res.redirect('/login')
//         }}else{
//             return res.redirect('/login')
//         }

//     }
//     catch (error) {
//         console.error('login error', error)
//         return res.redirect('/pageerror')

//     }
// }
const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const admin = await User.findOne({ isAdmin: true, email });

        if (!admin) {
            return res.redirect('/login'); //  Admin not found
        }

        const passwordMatch = await bcrypt.compare(password, admin.password); //  Add await

        if (passwordMatch) {
            req.session.admin = admin._id; // Store ObjectId in session
            return res.redirect('/admin'); // Success
        } else {
            return res.redirect('/login'); //  Wrong password
        }
    } catch (error) {
        console.error('Login error', error);
        return res.redirect('/pageerror'); //  Something went wrong
    }
};



const loadDashboard = async (req, res) => {
    try {
        if (req.session.admin) {
            res.render('dashboard')
        }
    }
    catch (error) {

        return res.redirect('/pageerror')

    }
}

const logout = async (req, res) => {
    try {
       req.session.destroy(err=> {
        if(err){
            console.log("Error destroying session",err)
            return res.redirect('/pageerror')}
           
        })
        res.redirect('/admin/login')
    }
    catch (error) {
         console.log("Unexpected error during logout",error)  
        return res.redirect('/pageerror')

    }
}
module.exports = { loadLogin,login,loadDashboard,logout,pageerror}


