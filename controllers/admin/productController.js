const Category = require('../../models/categorySchema');
// const brandModel = require("../../models/brandSchema");
const Product = require('../../models/productSchema');
const User = require("../../models/userSchema");
const fs = require('fs');
const path = require('path');
const sharp = require('sharp')


const getProductAddPage = async (req, res) => {
    try {

        const categories = await Category.find({ isListed: true });
        // const brands = await brandModel.find({});

        res.render('addProduct', {
            categories
            // brands
        });
    } catch (error) {
        return res.redirect('/pageerror');
    }
}

const addProducts = async (req, res) => {
    try {

        const products = req.body;

        const productExists = await Product.findOne({
            productName: products.productName
        });

        if (!productExists) {

            const imageFilenames = [];

            for (let i = 0; i < req.files.length; i++) {

                const originalImagePath = req.files[i].path;


                const resizedImagePath = path.join('public', 'uploads', 'products', req.files[i].filename);
                await sharp(originalImagePath).resize({ width: 440, height: 440 }).toFile(resizedImagePath);

                const imagePath = path.join('/', 'uploads', 'products', req.files[i].filename)

                imageFilenames.push(imagePath);
            }

            const categoryId = await Category.findOne({ name: products.category });
            // const brandId = await brandModel.findOne({name:products.brand})

            if (!categoryId) {
                return res.status(400).json({ success: false, message: "Category not found" });
            }

            const newProduct = new Product({
                productName: products.productName,
                description: products.description,
                // brand: brandId._id,
                category: categoryId._id,
                discount: products.discount,
                price: products.price,
                stock: products.stock,
                productQuantity: products.quantity,
                unit:products.unit,
                productImage: imageFilenames,
                status: 'available'
            })

            await newProduct.save();

            return res.status(200).json({ success: true, message: "Product added successfully" });
        } else {
            return res.status(400).json({ success: false, message: "product already exist, please try with another name" })
        }


    } catch (error) {
        console.error('error saving product', error);
        return res.status(500).json({ success: false, message: "Error saving product" });
    }
}

const displayProducts = async (req, res) => {
    try {
        const search = req.query.search || '';
        const page = parseInt(req.query.page) || 1;
        const limit = 4;

        const filter = {
            productName: { $regex: new RegExp(search, 'i') },
            isDeleted: false,
            isListed: true, // optional: include if you only want listed products
        };

       const productData = await Product.find(filter)
    .sort({ createdAt: -1, _id: 1 })  // add _id for stable sorting
    .skip((page - 1) * limit)
    .limit(limit)
    .populate('category')
    .exec();


        const count = await Product.countDocuments(filter);

        const categories = await Category.find({ isListed: true, isDeleted: false });

        res.render('product', {
            products: productData,
            currentPage: page,
            totalPages: Math.ceil(count / limit),
            categories
        });

    } catch (error) {
        console.error("Error loading product list:", error);
        res.status(500).send("Something went wrong");
    }
};

const editProduct = async (req, res) => {
    try {
        const productId = req.params.id;

        const {
            productName,
            price,
            stock,
            discount,
            // brandId,
            quantity,
            unit,
            description,
            categoryId,
            existingImages // This is a JSON string
        } = req.body;

        // Parse existingImages string to array
        let existingImagesArray = [];
        try {
            existingImagesArray = JSON.parse(existingImages);
        } catch (err) {
            return res.status(400).json({
                success: false,
                message: "Invalid existingImages format"
            });
        }

        // New images (uploaded files)
        // const newImages = req.files?.map(file => `/uploads/${file.filename}`) || [];

        const newImages = [];
        if(req.files){

            for (let i = 0; i < req.files.length; i++) {

                const newImagePath = req.files[i].path;
    
                const resizedImagePath = path.join('public', 'uploads', 'products', req.files[i].filename);
                await sharp(newImagePath).resize({ width: 440, height: 440 }).toFile(resizedImagePath);
    
                const imagePath = path.join('/', 'uploads', 'products', req.files[i].filename);
    
                newImages.push(imagePath);
            }
        }
        

        // Combine existing + new
        const allImages = [...existingImagesArray, ...newImages];

        const existingProduct = await Product.findOne({
            _id: { $ne: productId },
            productName: productName
        });

        if (existingProduct) {
            return res.status(400).json({
                success: false,
                message: "Product with this name already exists. Please try another name."
            });
        }

        const product = await Product.findOne({ _id: productId });

        if (
            product.productName == productName &&
            product.price == price &&
            product.stock == stock &&
            product.discount == discount &&
            // product.brand == brandId &&
            product.productQuantity == quantity &&
            product.unit == unit &&
            product.description == description &&
            product.category.toString() == categoryId &&
            JSON.stringify(product.productImage) == JSON.stringify(allImages)
        ) {
            return res.json({
                success: false,
                message: 'No changes detected. Please modify at least one field before saving.'
            });
        }

        const updatedProduct = await Product.findByIdAndUpdate(
            productId,
            {
                productName,
                price,
                stock,
                discount,
                // brand:brandId,
                description,
                productQuantity:quantity,
                unit,
                category:categoryId,
                productImage: allImages
            },
            { new: true }
        );

        if (!updatedProduct) {
            return res.status(404).json({
                success: false,
                message: "Product not found."
            });
        }

        return res.status(200).json({
            success: true,
            message: "Product updated successfully.",
            product: updatedProduct
        });

    } catch (error) {
        console.error("Error updating product:", error);
        return res.status(500).json({
            success: false,
            message: "An error occurred while updating the product."
        });
    }
};

const deleteProduct = async (req, res) => {
  try {
    const productId = req.params.id;

    await Product.findByIdAndUpdate(productId, {
      $set: { isDeleted: true }
    });

    return res.json({
      success: true,
      message: "Product soft deleted successfully"
    });
  } catch (error) {
    console.error("Error soft deleting product:", error);
    return res.status(500).json({
      success: false,
      message: "An error occurred while soft deleting the product."
    });
  }
};



module.exports = {
    getProductAddPage,
    addProducts,
    displayProducts,
    editProduct,
    deleteProduct

}