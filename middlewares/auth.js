const User=require('../models/userSchema')

//Checks if the user is logged in.

//Checks if they exist and are not blocked.

//Proceeds if valid; redirects otherwise.
const userAuth=(req,res,next)=>{
    // console.log("Session user ID:", req.session.user); // log session user ID
    if(req.session.user){
        User.findById(req.session.user).then(data=>{
            if(data && !data.isBlocked){
                 // Make user data available in EJS
                res.locals.user = data;
                next();
            }else{res.redirect('/login')}
        }).catch(error=>{
            console.log("Error in user auth middleware",error)
            res.status(500).send('Internal Server error')
        })
    }else{
        res.redirect('/login')
    }
}

// const adminAuth=(req,res,next)=>{
//         User.findOne({isAdmin:true}).then(data=>{
//             if(data){
//                 next();
//             }else{res.redirect('/admin/login')}
//         }).catch(error=>{
//             console.log("Error in user adminauth middleware",error)
//             res.status(500).send('Internal Server error')
//         })
   
// }

const adminAuth = (req, res, next) => {
    // 👇 Add this line to debug
    // console.log("Session Admin ID:", req.session.admin);

    if (req.session.admin) {
        User.findById(req.session.admin).then(data => {
            if (data && data.isAdmin) {
                next(); // ✅ Allow access
            } else {
                res.redirect('/admin/login'); //  Not an admin
            }
        }).catch(error => {
            console.error("Error in adminAuth middleware:", error);
            res.status(500).send('Internal Server Error');
        });
    } else {
        res.redirect('/admin/login'); // Not logged in
    }
};


module.exports={userAuth,adminAuth}