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

    const categoryData = await Category.find(query)
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

    const totalCategories = await Category.countDocuments(query);
    const totalPages = Math.ceil(totalCategories / limit);

    res.render("category", {
      cat: categoryData,
      currentPage: validPage,
      totalPages: totalPages,
      totalCategories: totalCategories,
      search: search,
      errors: {},           // ✅ ADD THIS
      oldInput: {}          // ✅ AND THIS
    });

  } catch (error) {
    console.error(error);
    res.redirect('/pageerror');
  }
};

const addCategory = async (req, res) => {
  // console.log('🔥 POST /admin/addCategory hit');
  const { name, description } = req.body;
  const errors = {};

  try {
    // Validate fields
    if (!name || name.trim() === '') {
      errors.name = 'Category name is required.';
    }

    if (!description || description.trim() === '') {
      errors.description = 'Description is required.';
    }

    // Check if category already exists
   const existingCategory = await Category.findOne({
  name: { $regex: new RegExp(`^${name.trim()}$`, 'i') }
});

    if (existingCategory) {
      errors.name = 'Category already exists.';
    }

    // If errors exist, re-render the form with errors and old input
    if (Object.keys(errors).length > 0) {
      const totalCategories = await Category.countDocuments({ isDeleted: false });
      const limit = 4;
      const totalPages = Math.ceil(totalCategories / limit);
      const currentPage = 1;

      const cat = await Category.find({ isDeleted: false })
        .sort({ createdAt: -1 })
        .limit(limit);

      return res.render('category', {
        cat,
        search: '',
        errors,
        oldInput: { name, description },
        currentPage,
        totalPages,
        totalCategories
      });
    }

    // If no errors, save the new category
    const newCategory = new Category({
      name: name.trim(),
      description: description.trim(),
      isDeleted: false,
      createdAt: new Date()
    });

    await newCategory.save();

    // Redirect to the category listing page (or wherever you want)
    // return res.redirect('/admin/category'); // Adjust this route as per your routing setup
    return res.redirect('/admin/category?success=1');

  } catch (error) {
    console.error('Error in addCategory:', error);
    return res.status(500).render('category', { 
      cat: [],
      search: '',
      errors: { general: 'Internal server error. Please try again later.' },
      oldInput: { name, description }
    });
  }
};




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




// Mark category as listed (visible)
const listCategory = async (req, res) => {
  try {
    const categoryId = req.params.id;
    await Category.findByIdAndUpdate(categoryId, { isListed: true });
    res.status(200).json({ message: 'Category listed successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error listing category', error: error.message });
  }
};

// Mark category as unlisted (hidden)
const unlistCategory = async (req, res) => {
  try {
    const categoryId = req.params.id;
    await Category.findByIdAndUpdate(categoryId, { isListed: false });
    res.status(200).json({ message: 'Category unlisted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error unlisting category', error: error.message });
  }
};

// Block a category
const blockCategory = async (req, res) => {
  try {
    const categoryId = req.params.id;
    await Category.findByIdAndUpdate(categoryId, { isBlocked: true });
    res.status(200).json({ message: 'Category blocked successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error blocking category', error: error.message });
  }
};

// Unblock a category
const unblockCategory = async (req, res) => {
  try {
    const categoryId = req.params.id;
    await Category.findByIdAndUpdate(categoryId, { isBlocked: false });
    res.status(200).json({ message: 'Category unblocked successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error unblocking category', error: error.message });
  }
};



module.exports={categoryInfo,addCategory,getEditCategory,editCategory,softDeleteCategory,listCategory,unlistCategory,blockCategory,unblockCategory}