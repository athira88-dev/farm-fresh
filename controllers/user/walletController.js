
const Wallet = require('../../models/walletSchema');


const showWallet = async (req, res) => {
  try {
    const userId = req.session.user;
    console.log(userId)

    // Fetch all wallet transactions for this user
    const transactions = await Wallet.find({ userId }).sort({ date: -1 });
    console.log("wallettrans:",transactions)

    // Calculate balance
    let balance = 0;
    transactions.forEach(txn => {
      balance += txn.type === 'Credit' ? txn.amount : -txn.amount;
    });

    res.render('user-wallet', {
      balance,
      transactions
    });
  } catch (error) {
    console.error('Error fetching wallet:', error);
    res.status(500).send('Internal Server Error');
  }
};

module.exports={showWallet}