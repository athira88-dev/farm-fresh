const Address = require('../../models/addressSchema')


// Helper: find or create address doc for user
async function findOrCreateAddressDoc(userId) {
  let addressDoc = await Address.findOne({ userId });
  if (!addressDoc) {
    addressDoc = new Address({ userId, address: [] });
    await addressDoc.save();
  }
  return addressDoc;
}

// Show all addresses page
const getManageAddresses = async (req, res) => {
  try {
     const returnTo = req.query.returnTo;
  if (returnTo) {
    req.session.returnTo = returnTo;  // save in session
  }
    const msg = req.query.msg || null;
    const userId = res.locals.user._id;
    const addressDoc = await Address.findOne({ userId });
    const addresses = addressDoc ? addressDoc.address : [];
    res.render('manage-address', { addresses,msg });
  } catch (err) {
    console.error(err);
    res.status(500).send('Something went wrong');
  }
};

// Show add address form
const getAddAddressForm = (req, res) => {
  res.render('add-edit-address', { address: null, action: '/add-address', buttonText: 'Add Address' });
};

// Handle add address POST
const postAddAddress = async (req, res) => {
  try {
    const userId = res.locals.user._id;  // fix here
    const { addressType, name, street, city, state, postcode, country, phone, altPhone } = req.body;

    const addressDoc = await findOrCreateAddressDoc(userId);

    addressDoc.address.push({
      addressType,
      name,
      street,
      city,
      state,
      postcode,
      country,
      phone,
      altPhone,
    });

    await addressDoc.save();
       const redirectTo = req.session.returnTo || '/manage-address';
         delete req.session.returnTo;  // clear it after use
    res.redirect(redirectTo);  // redirect back based on query param
    // res.redirect('/manage-address');
  } catch (err) {
    console.error(err);
    res.status(500).send('Failed to add address');
  }
};


// Show edit address form
const getEditAddressForm = async (req, res) => {
  try {
    const userId = res.locals.user._id;
    const addressId = req.params.addressId;

    const addressDoc = await Address.findOne({ userId });
    if (!addressDoc) return res.redirect('/manage-address');

    const address = addressDoc.address.id(addressId);
    if (!address) return res.redirect('/manage-address');

    res.render('add-edit-address', { address, action: `/edit-address/${addressId}`, buttonText: 'Update Address' });
  } catch (err) {
    console.error(err);
    res.status(500).send('Something went wrong');
  }
};

// Handle edit address POST
const postEditAddress = async (req, res) => {
  try {
    const userId = res.locals.user._id;
    const addressId = req.params.addressId;
    const { addressType, name, street, city, state, postcode, country, phone, altPhone } = req.body;
  

    const addressDoc = await Address.findOne({ userId });
    if (!addressDoc) return res.redirect('/manage-address');

    const address = addressDoc.address.id(addressId);
    if (!address) return res.redirect('/manage-address');

    // Update fields
    address.addressType = addressType;
    address.name = name;
    address.street = street;
    address.city = city;
    address.state = state;
    address.postcode = postcode;
    address.country = country;
    address.phone = phone;
    address.altPhone = altPhone;

    await addressDoc.save();
     const redirectTo = req.session.returnTo || '/manage-address';
         delete req.session.returnTo;  // clear it after use
    res.redirect(redirectTo);  // redirect back based on query param
  } catch (err) {
    console.error(err);
    res.status(500).send('Failed to update address');
  }
};

// Handle delete address POST
const postDeleteAddress = async (req, res) => {
  try {
    const userId = res.locals.user._id;
    const addressId = req.params.addressId;

    const addressDoc = await Address.findOne({ userId });
    if (!addressDoc) return res.redirect('/manage-address');

    addressDoc.address = addressDoc.address.filter(addr => addr._id.toString() !== addressId);
    await addressDoc.save();
    const returnTo = req.query.returnTo || '/manage-address';
    res.redirect(returnTo);

    //  res.redirect('/manage-address?msg=Address deleted successfully');
  } catch (err) {
    console.error(err);
    res.status(500).send('Failed to delete address');
  }
};


module.exports={getManageAddresses,getAddAddressForm,postAddAddress,getEditAddressForm,postEditAddress,postDeleteAddress}