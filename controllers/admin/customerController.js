const User = require('../../models/userSchema')

const customerInfo = async (req, res) => {
  try {
    const search = req.query.search || '';
    const page = parseInt(req.query.page) || 1;
    const limit = 3;

    const searchCriteria = {
      isAdmin: false,
      $or: [
        { name: { $regex: search, $options: "i" } },
        { email: { $regex: search, $options: "i" } }
      ]
    };

    // Fetch paginated user data
    const userData = await User.find(searchCriteria)
      .sort({ createdAt: -1 }) 
      .limit(limit)
      .skip((page - 1) * limit)
      .exec();

    // Count total matching documents for pagination
    const count = await User.countDocuments(searchCriteria);
    const totalPages = Math.ceil(count / limit);

    // Render view
    res.render('customers', {
      data: userData,
      search,
      currentPage: page,
      totalPages
    });

  } catch (error) {
    console.error('Error in customerInfo:', error);
    res.redirect('/pageerror');
  }
};


const customerBlocked=async (req,res)=>{
    try{
        let id=req.query.id
        await User.updateOne({_id:id},{$set:{isBlocked:true}})
        res.redirect('/admin/users')

    }
    catch(error){
          res.redirect('/pageerror')

    }
}

const customerunBlocked=async (req,res)=>{
    try{
        let id=req.query.id
        await User.updateOne({_id:id},{$set:{isBlocked:false}})
        res.redirect('/admin/users')

    }
    catch(error){
          res.redirect('/pageerror')

    }
}

module.exports={customerInfo,customerBlocked,customerunBlocked}