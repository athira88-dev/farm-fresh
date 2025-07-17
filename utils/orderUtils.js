const calculateOrderItems = (cartItems) => {
  const currentDate = new Date();

  return cartItems.map(item => {
    const product = item.productId;
    const quantity = item.quantity;

    let discount = product.discount || 0;

    if (
      product.productOffer?.isActive &&
      new Date(product.productOffer.startDate) <= currentDate &&
      new Date(product.productOffer.endDate) >= currentDate
    ) {
      discount = Math.max(discount, product.productOffer.discountPercentage);
    }

    if (
      product.category?.categoryOffer?.isActive &&
      new Date(product.category.categoryOffer.startDate) <= currentDate &&
      new Date(product.category.categoryOffer.endDate) >= currentDate
    ) {
      discount = Math.max(discount, product.category.categoryOffer.discountPercentage);
    }

    const finalPrice = product.price - (product.price * discount / 100);

    return {
      product: product._id,
      quantity,
      originalPrice: product.price,
      discountApplied: discount,
      price: parseFloat(finalPrice.toFixed(2)),
    };
  });
};

module.exports = { calculateOrderItems };