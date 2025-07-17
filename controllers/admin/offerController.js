const Product = require('../../models/productSchema');
const Category = require('../../models/categorySchema'); 




// POST: Create or update offer for a product
const addProductOffer = async (req, res) => {
  try {
    const { productId, isActive, discountPercentage, startDate, endDate } = req.body;

    const product = await Product.findById(productId); // 👈 use from body
    if (!product) {
      return res.status(404).json({ success: false, message: 'Product not found' });
    }

    product.productOffer = {
      isActive,
      discountPercentage,
      startDate,
      endDate
    };

    await product.save();
    res.status(200).json({ success: true, data: product.productOffer });
  } catch (error) {
    console.error('Offer creation error:', error.message);
    res.status(400).json({ success: false, message: error.message });
  }
};

const editProductOffer = async (req, res) => {
  try {
    const { discountPercentage, startDate, endDate } = req.body;
    const productId = req.params.productId;

    const product = await Product.findById(productId);
    if (!product || !product.productOffer || !product.productOffer.isActive) {
      return res.status(404).json({ success: false, message: 'Active offer not found' });
    }

    product.productOffer.discountPercentage = discountPercentage;
    product.productOffer.startDate = startDate;
    product.productOffer.endDate = endDate;

    await product.save();
    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to update offer' });
  }
};

const deleteProductOffer = async (req, res) => {
  try {
    const productId = req.params.productId;
    const product = await Product.findById(productId);

    if (!product || !product.productOffer || !product.productOffer.isActive) {
      return res.status(404).json({ success: false, message: 'Active offer not found' });
    }

    product.productOffer.isActive = false;
    await product.save();

    res.json({ success: true });
  } catch (err) {
    console.error(err);
    res.status(500).json({ success: false, message: 'Failed to delete offer' });
  }
};

const addCategoryOffer = async (req, res) => {
  try {
    const { categoryId, categoryOffer, startDate, endDate } = req.body;

    if (!categoryId || !categoryOffer || !startDate || !endDate) {
      return res.status(400).send('All fields are required');
    }

    // Save the offer in the category document
    await Category.findByIdAndUpdate(categoryId, {
      categoryOffer: {
        discountPercentage: Number(categoryOffer),
        isActive: true,
        startDate: new Date(startDate),
        endDate: new Date(endDate)
      }
    });

    res.redirect('/admin/category');
  } catch (error) {
    console.error(error);
    res.status(500).send('Server error');
  }
};

const editCategoryOffer = async (req, res) => {
  try {
    const { categoryId, discountPercentage, startDate, endDate } = req.body;

    if (!categoryId || discountPercentage === undefined) {
      return res.status(400).send('Category ID and discount percentage are required');
    }

    await Category.findByIdAndUpdate(categoryId, {
      categoryOffer: {
        discountPercentage: Number(discountPercentage),
        startDate: startDate || null,
        endDate: endDate || null,
        isActive: true,
      }
    });

    res.redirect('/admin/category');
  } catch (error) {
    console.error(error);
    res.status(500).send('Server error');
  }
};






const deleteCategoryOffer = async (req, res) => {
  try {
    const { categoryId } = req.params;

    const category = await Category.findById(categoryId);
    if (!category) return res.status(404).json({ success: false, message: "Category not found" });

    category.categoryOffer = 0; // Reset offer
    await category.save();

    res.status(200).json({ success: true, message: "Category offer deleted successfully", data: category });
  } catch (error) {
    res.status(500).json({ success: false, message: error.message });
  }
};





module.exports = {addProductOffer,editProductOffer,deleteProductOffer,addCategoryOffer,editCategoryOffer,deleteCategoryOffer};
