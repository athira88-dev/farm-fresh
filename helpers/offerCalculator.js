function applyBestOffer(product) {
  const originalPrice = product.price;

  // Manual Discount
  const manualDiscount = product.discount || 0;

  // Normalize dates
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Product Offer
  const startProduct = new Date(product.productOffer?.startDate || 0);
  const endProduct = new Date(product.productOffer?.endDate || 0);
  startProduct.setHours(0, 0, 0, 0);
  endProduct.setHours(0, 0, 0, 0);

  const hasProductOffer = product.productOffer?.isActive &&
                          startProduct <= today &&
                          endProduct >= today;

  const productOfferDiscount = hasProductOffer
    ? product.productOffer.discountPercentage
    : 0;

  // Category Offer
  const startCategory = new Date(product.category?.categoryOffer?.startDate || 0);
  const endCategory = new Date(product.category?.categoryOffer?.endDate || 0);
  startCategory.setHours(0, 0, 0, 0);
  endCategory.setHours(0, 0, 0, 0);

  const hasCategoryOffer = product.category?.categoryOffer?.isActive &&
                           startCategory <= today &&
                           endCategory >= today;

  const categoryOfferDiscount = hasCategoryOffer
    ? product.category.categoryOffer.discountPercentage
    : 0;

  // Determine maximum discount
  const maxDiscount = Math.max(manualDiscount, productOfferDiscount, categoryOfferDiscount);
  const finalPrice = originalPrice - (originalPrice * maxDiscount) / 100;

  // Determine source
  let discountSource = null;
  if (maxDiscount === manualDiscount) {
    discountSource = 'Manual Discount';
  } else if (maxDiscount === productOfferDiscount) {
    discountSource = 'Product Offer';
  } else if (maxDiscount === categoryOfferDiscount) {
    discountSource = 'Category Offer';
  }

  // Attach computed values
  product.originalPrice = originalPrice;
  product.finalPrice = finalPrice.toFixed(2);
  product.appliedDiscount = maxDiscount;
  product.discountSource = discountSource;

  return product;
}



module.exports = { applyBestOffer };
