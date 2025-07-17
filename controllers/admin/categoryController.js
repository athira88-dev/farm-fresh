const Category = require('../../models/categorySchema')




// Render categories list page
const categoryInfo = async (req, res) => {
  try {
    const searchQuery = req.query.search ? req.query.search.trim() : '';
    const page = parseInt(req.query.page) || 1;
    const limit = 5;

    const filter = {
      isDeleted: false,
      $or: [
        { name: { $regex: searchQuery, $options: 'i' } },
        { description: { $regex: searchQuery, $options: 'i' } }
      ]
    };

    const totalCategories = await Category.countDocuments(filter);
    const totalPages = Math.ceil(totalCategories / limit);

    const categories = await Category.find(filter)
      .sort({ createdAt: -1 }) // latest first
      .skip((page - 1) * limit)
      .limit(limit);

    res.render('category', {
      categories,
      currentPage: page,
      totalPages,
      search: searchQuery
    });

  } catch (error) {
    console.error('Error in categoryInfo:', error);
    res.status(500).send('Internal Server Error');
  }
};

const getAddCategory = async (req, res) => {
  res.render('category-form', {
    isEdit: false,
    category: {},
    oldInput: {},
    errors: {}
  });
};

// Add new category
const addCategory = async (req, res) => {
  let { name, description } = req.body;
  const errors = {};

  // Trim inputs
  name = name?.trim();
  description = description?.trim();

  // Validation
  if (!name) errors.name = "Category name is required";
  if (!description) errors.description = "Description is required";

  if (Object.keys(errors).length > 0) {
    return res.render('category-form', {
      isEdit: false,
      category: {},
      oldInput: req.body,
      errors
    });
  }

  try {
    // Case-insensitive check using collation
    const existingCategory = await Category.findOne({ name: name })
      .collation({ locale: 'en', strength: 2 });

    if (existingCategory) {
      errors.name = "Category name already exists (case-insensitive), please choose a different name";
      return res.render('category-form', {
        isEdit: false,
        category: {},
        oldInput: req.body,
        errors
      });
    }

    // Capitalize first letter before saving
    const formattedName = name.charAt(0).toUpperCase() + name.slice(1).toLowerCase();

    const newCategory = new Category({ name: formattedName, description });
    await newCategory.save();

    res.redirect('/admin/category');

  } catch (err) {
    if (err.code === 11000 && err.keyPattern?.name) {
      errors.name = "Category name already exists, please choose a different name";
      return res.render('category-form', {
        isEdit: false,
        category: {},
        oldInput: req.body,
        errors
      });
    }
    console.error(err);
    res.status(500).send("Server error");
  }
};



// Get category data for edit
const getEditCategory = async (req, res) => {
  try {
    const category = await Category.findById(req.params.id);
    console.log(category)
    console.log('Category ID:', req.params.id);
    if (!category) return res.status(404).send("Category not found");

    res.render('category-form', {
      isEdit: true,
      category,
      oldInput: {},
      errors: {}
    });
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
};

// Update category
const editCategory = async (req, res) => {
   const { name, description } = req.body;
  const errors = {};

  if (!name || name.trim() === '') errors.name = "Category name is required";
  if (!description || description.trim() === '') errors.description = "Description is required";

  if (Object.keys(errors).length > 0) {
    return res.render('category-form', {
      isEdit: true,
      category: { _id: req.params.id }, // keep id to build form action
      oldInput: req.body,
      errors
    });
  }

  try {
    const category = await Category.findById(req.params.id);
    if (!category) return res.status(404).send("Category not found");

    category.name = name;
    category.description = description;
    await category.save();

    res.redirect('/admin/category'); // Adjust redirect as needed
  } catch (err) {
    console.error(err);
    res.status(500).send("Server error");
  }
};

// Soft delete category
const softDeleteCategory = async (req, res) => {
  try {
    const categoryId = req.params.id;
    await Category.findByIdAndUpdate(categoryId, { isDeleted: true });
    res.redirect('/admin/category');
  } catch (error) {
    console.error('Error in softDeleteCategory:', error);
    res.status(500).send('Internal Server Error');
  }
};



// Mark category as listed (visible)
const listCategory = async (req, res) => {
  try {
    const categoryId = req.params.id;
    await Category.findByIdAndUpdate(categoryId, { isListed: true });
    res.redirect('/admin/category');
  } catch (error) {
    console.error('Error listing category:', error);
    res.status(500).send('Internal Server Error');
  }
};


// Mark category as unlisted (hidden)
const unlistCategory = async (req, res) => {
  try {
    const categoryId = req.params.id;
    await Category.findByIdAndUpdate(categoryId, { isListed: false });
    res.redirect('/admin/category');
  } catch (error) {
    console.error('Error unlisting category:', error);
    res.status(500).send('Internal Server Error');
  }
};


// Block a category
const blockCategory = async (req, res) => {
  try {
    const categoryId = req.params.id;
    await Category.findByIdAndUpdate(categoryId, { isBlocked: true });
    res.redirect('/admin/category');
  } catch (error) {
    console.error('Error blocking category:', error);
    res.status(500).send('Internal Server Error');
  }
};


// Unblock a category
const unblockCategory = async (req, res) => {
  try {
    const categoryId = req.params.id;
    await Category.findByIdAndUpdate(categoryId, { isBlocked: false });
    res.redirect('/admin/category');
  } catch (error) {
    console.error('Error unblocking category:', error);
    res.status(500).send('Internal Server Error');
  }
};



module.exports={categoryInfo,getAddCategory,addCategory,getEditCategory,editCategory,softDeleteCategory,listCategory,unlistCategory,blockCategory,unblockCategory}