const User = require('../models/userSchema');



const userAuth = (req, res, next) => {
    if (req.session.user) {
        User.findById(req.session.user)
            .then(user => {
                if (user && !user.isBlocked) {
                    res.locals.user = user;
                    req.user = user;
                    next();
                } else {
                    // Set message in cookie before destroying session
                    res.cookie('blockMessage', 'You have been blocked by admin.', {
                        maxAge: 5000, // 5 seconds
                        httpOnly: true
                    });

                    req.session.destroy(err => {
                        if (err) {
                            console.log("Error destroying session:", err);
                        }
                        res.redirect('/login');
                    });
                }
            })
            .catch(error => {
                console.log("Error in user auth middleware:", error);
                res.status(500).send('Internal Server Error');
            });
    } else {
        res.redirect('/login');
    }
};





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