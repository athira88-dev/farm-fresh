const Category = require('../../models/categorySchema')


const categoryInfo = async (req, res) => {
  try {
    const search = req.query.search || '';
    const page = parseInt(req.query.page);
    const validPage = (isNaN(page) || page < 1) ? 1 : page;
    const limit = 4;
    const skip = (validPage - 1) * limit;
       const query = {
      isDeleted: false,
      name: { $regex: search, $options: 'i' } // case-insensitive search
    };

    // Find categories where isDeleted is false
    const categoryData = await Category.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    // Count only categories where isDeleted is false
    const totalCategories = await Category.countDocuments(query);
    const totalPages = Math.ceil(totalCategories / limit);

    res.render("category", {
      cat: categoryData,
      currentPage: validPage,
      totalPages: totalPages,
      totalCategories: totalCategories,
      search:search
    });

  } catch (error) {
    console.error(error);
    res.redirect('/pageerror');
  }
};


 const addCategory=async(req,res)=>{
    const {name,description}=req.body
    try{
      //  console.log("POST /admin/addCategory hit"); 
        console.log("Received category data:", name, description);
        const existingCategory= await Category.findOne({name});
        if(existingCategory){
            return res.status(400).json({error:"Category already exists"})
        }
        const newCategory=new Category({name,description})
        await newCategory.save()
       return res.json({message:"Category added successfully"})

    }
    catch(error){
        return res.status(500).json({error:"Internal server error"})


    }
}

const getEditCategory=async(req,res)=>{
  try{
    const id=req.query.id;
    const category=await Category.findOne({_id:id})
    res.render('edit-category',{category:category})

  }
  catch(error){
    res.redirect('/pageerror')

  }
}

const editCategory=async(req,res)=>{
  try{
    const id=req.params.id;
    const {categoryName,description}=req.body
    const existingCategory=await Category.findOne({name:categoryName})
    if(existingCategory){
      return res.status(400).json({error:'Category exists,please choose another name'})
}
   const updateCategory=await Category.findByIdAndUpdate(id,{name:categoryName,description:description},{new:true})
   //Without new: true, you get the original document before the update
    if(updateCategory)
      {
        res.redirect('/admin/category')
      }else
       res.status(404).json({error:'Category not found'})

    
  }
  catch(error){ 
     res.status(500).json({error:'Internal server error'})

  }
}
const softDeleteCategory = async (req, res) => {
  try {
    const id = req.params.id;
    const category = await Category.findByIdAndUpdate(id, { isDeleted: true }, { new: true });
    if (category) {
      res.redirect('/admin/category'); // redirect back to category page
    } else {
      res.status(404).send('Category not found');
    }
  } catch (error) {
    res.status(500).send('Internal server error');
  }
};



module.exports={categoryInfo,addCategory,getEditCategory,editCategory,softDeleteCategory}