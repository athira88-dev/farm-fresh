const User = require('../../models/userSchema')
const Order = require('../../models/orderSchema'); 
const Product = require('../../models/productSchema'); 
const Category = require('../../models/categorySchema'); 
const PDFDocument = require('pdfkit');
const ExcelJS = require('exceljs');


const qs = require('qs'); // make sure to install if not
const mongoose = require('mongoose')
const bcrypt = require('bcrypt')

const pageerror = (req, res) => {
 
    return res.render('admin-error')

}


const loadLogin = (req, res) => {

    if (req.session.admin) {
        return res.redirect('/admin/dashboard')

    }
    return res.render('admin-login', { message: null })

}

// const login = async (req, res) => {
//     try {

//         const { email, password } = req.body
//         const admin = await User.findOne({ isAdmin: true, email })
//         if (admin) {
//             const passwordMatch = bcrypt.compare(password, admin.password)

        
//         if (passwordMatch) {
//             req.session.admin = true
//             return res.redirect('/admin')

//         } else {
//             return res.redirect('/login')
//         }}else{
//             return res.redirect('/login')
//         }

//     }
//     catch (error) {
//         console.error('login error', error)
//         return res.redirect('/pageerror')

//     }
// }
const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        const admin = await User.findOne({ isAdmin: true, email });

        if (!admin) {
            return res.redirect('/login'); //  Admin not found
        }

        const passwordMatch = await bcrypt.compare(password, admin.password); //  Add await

        if (passwordMatch) {
            req.session.admin = admin._id; // Store ObjectId in session
            return res.redirect('/admin'); // Success
        } else {
            return res.redirect('/login'); //  Wrong password
        }
    } catch (error) {
        console.error('Login error', error);
        return res.redirect('/pageerror'); //  Something went wrong
    }
};






const loadDashboard = async (req, res) => {
  try {
    if (!req.session.admin) {
      return res.redirect('/admin/login');
    }

    const { startDate, endDate, groupBy } = req.query;

    let reportData = [];
    let chartLabels = [];
    let chartData = [];
    let queryString = '';
    let topProducts = [];
    let topCategories = [];

    if (startDate && endDate && groupBy && startDate !== '' && endDate !== '') {
      const match = {
        status: { $in: ['Delivered', 'Shipped'] },
        createdOn: {
          $gte: new Date(startDate),
          $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999)),
        },
      };

      // Grouping logic
      let groupId;
      switch (groupBy) {
        case 'day':
          groupId = {
            year: { $year: '$createdOn' },
            month: { $month: '$createdOn' },
            day: { $dayOfMonth: '$createdOn' },
          };
          break;
        case 'week':
          groupId = {
            year: { $year: '$createdOn' },
            week: { $week: '$createdOn' },
          };
          break;
        case 'month':
          groupId = {
            year: { $year: '$createdOn' },
            month: { $month: '$createdOn' },
          };
          break;
        case 'year':
          groupId = {
            year: { $year: '$createdOn' },
          };
          break;
        default:
          groupId = null;
      }

      const pipeline = [
        { $match: match },
        { $unwind: '$orderedItems' },
        {
          $group: {
            _id: groupId,
            uniqueOrders: { $addToSet: '$_id' },
            totalPrice: {
              $sum: {
                $multiply: ['$orderedItems.originalPrice', '$orderedItems.quantity'],
              },
            },
            totalFinalAmount: {
              $sum: {
                $multiply: ['$orderedItems.price', '$orderedItems.quantity'],
              },
            },
          },
        },
        {
          $project: {
            totalOrders: { $size: '$uniqueOrders' },
            totalPrice: 1,
            totalFinalAmount: 1,
            totalDiscount: { $subtract: ['$totalPrice', '$totalFinalAmount'] },
          },
        },
        { $sort: { "_id.year": 1, "_id.month": 1, "_id.day": 1 } }
      ];

      reportData = await Order.aggregate(pipeline);
      queryString = qs.stringify(req.query);

      // Prepare chart labels and data
      chartLabels = reportData.map(r => {
        if (r._id.day) return `${r._id.day}/${r._id.month}/${r._id.year}`;
        if (r._id.week) return `Week ${r._id.week}, ${r._id.year}`;
        if (r._id.month) return `${r._id.month}/${r._id.year}`;
        if (r._id.year) return `${r._id.year}`;
        return "Total";
      });
      chartData = reportData.map(r => r.totalFinalAmount);

      // ====== Top 10 Products ======
      topProducts = await Order.aggregate([
        { $match: match },
        { $unwind: "$orderedItems" },
        {
          $group: {
            _id: "$orderedItems.productId",
            totalSold: { $sum: "$orderedItems.quantity" }
          }
        },
        { $sort: { totalSold: -1 } },
        { $limit: 10 },
        {
          $lookup: {
            from: "products",
            localField: "_id",
            foreignField: "_id",
            as: "product"
          }
        },
        { $unwind: "$product" },
        {
          $project: {
            name: "$product.name",
            totalSold: 1
          }
        }
      ]);

      // ====== Top 10 Categories ======
      topCategories = await Order.aggregate([
        { $match: match },
        { $unwind: "$orderedItems" },
        {
          $lookup: {
            from: "products",
            localField: "orderedItems.productId",
            foreignField: "_id",
            as: "product"
          }
        },
        { $unwind: "$product" },
        {
          $group: {
            _id: "$product.category",
            totalSold: { $sum: "$orderedItems.quantity" }
          }
        },
        { $sort: { totalSold: -1 } },
        { $limit: 10 },
        {
          $lookup: {
            from: "categories",
            localField: "_id",
            foreignField: "_id",
            as: "category"
          }
        },
        { $unwind: "$category" },
        {
          $project: {
            name: "$category.name",
            totalSold: 1
          }
        }
      ]);
    }

    // Render EJS
    res.render('dashboard', {
      reportData,
      chartLabels,
      chartData,
      topProducts,
      topCategories,
      queryString,
      startDate: startDate || '',
      endDate: endDate || '',
      groupBy: groupBy || '',
    });
  } catch (error) {
    console.error('Dashboard Error:', error);
    res.render('dashboard', {
      reportData: [],
      chartLabels: [],
      chartData: [],
      topProducts: [],
      topCategories: [],
      queryString: '',
      startDate: '',
      endDate: '',
      groupBy: '',
    });
  }
};






const logout = async (req, res) => {
    try {
       req.session.destroy(err=> {
        if(err){
            console.log("Error destroying session",err)
            return res.redirect('/pageerror')}
           
        })
        res.redirect('/admin/login')
    }
    catch (error) {
         console.log("Unexpected error during logout",error)  
        return res.redirect('/pageerror')

    }
}



const downloadSalesReportPDF = async (req, res) => {
  try {
    if (!req.session.admin) return res.redirect('/admin/login');

    const { startDate, endDate, groupBy } = req.query;

    if (!startDate || !endDate || !groupBy || startDate === '' || endDate === '') {
      return res.status(400).send('Missing or invalid query parameters');
    }

    const match = {
      status: { $in: ['Delivered', 'Shipped'] },
      createdOn: {
        $gte: new Date(startDate),
        $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999))
      }
    };

    let groupId;
    switch (groupBy) {
      case 'day':
        groupId = {
          year: { $year: '$createdOn' },
          month: { $month: '$createdOn' },
          day: { $dayOfMonth: '$createdOn' }
        };
        break;
      case 'week':
        groupId = {
          year: { $year: '$createdOn' },
          week: { $week: '$createdOn' }
        };
        break;
      case 'month':
        groupId = {
          year: { $year: '$createdOn' },
          month: { $month: '$createdOn' }
        };
        break;
      case 'year':
        groupId = {
          year: { $year: '$createdOn' }
        };
        break;
      default:
        groupId = null;
    }

    const pipeline = [
      { $match: match },
      { $unwind: "$orderedItems" },
      {
        $group: {
          _id: "$_id",
          createdOn: { $first: "$createdOn" },
          totalPrice: {
            $sum: {
              $multiply: ["$orderedItems.originalPrice", "$orderedItems.quantity"]
            }
          },
          finalAmount: {
            $sum: {
              $multiply: ["$orderedItems.price", "$orderedItems.quantity"]
            }
          },
          totalDiscount: {
            $sum: {
              $subtract: [
                { $multiply: ["$orderedItems.originalPrice", "$orderedItems.quantity"] },
                { $multiply: ["$orderedItems.price", "$orderedItems.quantity"] }
              ]
            }
          }
        }
      },
      {
        $group: {
          _id: groupId,
          totalOrders: { $sum: 1 },
          totalPrice: { $sum: "$totalPrice" },
          totalDiscount: { $sum: "$totalDiscount" },
          totalFinalAmount: { $sum: "$finalAmount" }
        }
      },
      {
        $project: {
          _id: 1,
          totalOrders: 1,
          totalPrice: { $round: ["$totalPrice", 2] },
          totalDiscount: { $round: ["$totalDiscount", 2] },
          totalFinalAmount: { $round: ["$totalFinalAmount", 2] }
        }
      }
    ];

    const reportData = await Order.aggregate(pipeline);

    const doc = new PDFDocument();
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', 'attachment; filename=sales_report.pdf');
    doc.pipe(res);

    doc.fontSize(16).text('Sales Report', { align: 'center' }).moveDown();

    reportData.forEach((entry, index) => {
      doc
        .fontSize(12)
        .text(`${groupBy.toUpperCase()} ${index + 1}`)
        .text(`Group: ${JSON.stringify(entry._id)}`)
        .text(`Total Orders: ${entry.totalOrders}`)
        .text(`Total Price: £ ${entry.totalPrice.toFixed(2)}`)
        .text(`Total Discount: £ ${entry.totalDiscount.toFixed(2)}`)
        .text(`Final Amount: £ ${entry.totalFinalAmount.toFixed(2)}`)
        .moveDown();
    });

    doc.end();
  } catch (error) {
    console.error('PDF download error:', error);
    res.status(500).send('Error generating PDF');
  }
};




const downloadSalesReportExcel = async (req, res) => {
  try {
    if (!req.session.admin) return res.redirect('/admin/login');

    const { startDate, endDate, groupBy } = req.query;

    if (!startDate || !endDate || !groupBy || startDate === '' || endDate === '') {
      return res.status(400).send('Missing or invalid query parameters');
    }

    const match = {
      status: { $in: ['Delivered', 'Shipped'] },
      createdOn: {
        $gte: new Date(startDate),
        $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999))
      }
    };

    let groupId;
    switch (groupBy) {
      case 'day':
        groupId = {
          year: { $year: '$createdOn' },
          month: { $month: '$createdOn' },
          day: { $dayOfMonth: '$createdOn' }
        };
        break;
      case 'week':
        groupId = {
          year: { $year: '$createdOn' },
          week: { $week: '$createdOn' }
        };
        break;
      case 'month':
        groupId = {
          year: { $year: '$createdOn' },
          month: { $month: '$createdOn' }
        };
        break;
      case 'year':
        groupId = {
          year: { $year: '$createdOn' }
        };
        break;
      default:
        return res.status(400).send('Invalid groupBy value');
    }

    const pipeline = [
      { $match: match },
      { $unwind: "$orderedItems" },
      {
        $group: {
          _id: "$_id",
          createdOn: { $first: "$createdOn" },
          totalPrice: {
            $sum: {
              $multiply: ["$orderedItems.originalPrice", "$orderedItems.quantity"]
            }
          },
          finalAmount: {
            $sum: {
              $multiply: ["$orderedItems.price", "$orderedItems.quantity"]
            }
          },
          totalDiscount: {
            $sum: {
              $subtract: [
                { $multiply: ["$orderedItems.originalPrice", "$orderedItems.quantity"] },
                { $multiply: ["$orderedItems.price", "$orderedItems.quantity"] }
              ]
            }
          }
        }
      },
      {
        $group: {
          _id: groupId,
          totalOrders: { $sum: 1 },
          totalPrice: { $sum: "$totalPrice" },
          totalDiscount: { $sum: "$totalDiscount" },
          totalFinalAmount: { $sum: "$finalAmount" }
        }
      },
      {
        $project: {
          _id: 1,
          totalOrders: 1,
          totalPrice: { $round: ["$totalPrice", 2] },
          totalDiscount: { $round: ["$totalDiscount", 2] },
          totalFinalAmount: { $round: ["$totalFinalAmount", 2] }
        }
      }
    ];

    const reportData = await Order.aggregate(pipeline);

    // Create Excel workbook
    const workbook = new ExcelJS.Workbook();
    const worksheet = workbook.addWorksheet('Sales Report');

    worksheet.columns = [
      { header: 'Group', key: 'group', width: 30 },
      { header: 'Total Orders', key: 'totalOrders', width: 15 },
      { header: 'Total Sales (£)', key: 'totalPrice', width: 18 },
      { header: 'Total Discount (£)', key: 'totalDiscount', width: 20 },
      { header: 'Final Amount (£)', key: 'finalAmount', width: 18 }
    ];

    reportData.forEach((entry) => {
      worksheet.addRow({
        group: JSON.stringify(entry._id),
        totalOrders: entry.totalOrders,
        totalPrice: entry.totalPrice.toFixed(2),
        totalDiscount: entry.totalDiscount.toFixed(2),
        finalAmount: entry.totalFinalAmount.toFixed(2)
      });
    });

    res.setHeader(
      'Content-Disposition',
      'attachment; filename="sales_report.xlsx"'
    );
    res.setHeader(
      'Content-Type',
      'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet'
    );

    await workbook.xlsx.write(res);
    res.end();
  } catch (error) {
    console.error('Excel download error:', error);
    res.status(500).send('Error generating Excel report');
  }
};


const getSalesChartData = async (req, res) => {
  const filter = req.query.filter;
  const now = new Date();
  let matchStage = {};
  let groupStage = {};

  if (filter === 'yearly') {
    groupStage = {
      _id: { year: { $year: "$createdAt" } },
      total: { $sum: "$totalFinalAmount" }
    };
  } else if (filter === 'monthly') {
    groupStage = {
      _id: {
        year: { $year: "$createdAt" },
        month: { $month: "$createdAt" }
      },
      total: { $sum: "$totalFinalAmount" }
    };
  } else if (filter === 'weekly') {
    const weekAgo = new Date();
    weekAgo.setDate(weekAgo.getDate() - 7);
    matchStage = { createdAt: { $gte: weekAgo } };

    groupStage = {
      _id: { day: { $dayOfWeek: "$createdAt" } },
      total: { $sum: "$totalFinalAmount" }
    };
  }

  const result = await Order.aggregate([
    { $match: matchStage },
    { $group: groupStage },
    { $sort: { '_id': 1 } }
  ]);
const labels = [];
const values = [];

result.forEach(item => {
  const id = item._id || {};

  if (filter === 'yearly') {
    if (id.year != null) {
      labels.push(id.year.toString());
    } else {
      labels.push("Unknown");
    }

  } else if (filter === 'monthly') {
    if (id.month != null && id.year != null) {
      labels.push(`${id.month}-${id.year}`);
    } else {
      labels.push("Unknown");
    }

  } else if (filter === 'weekly') {
    const days = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    if (id.day != null) {
      labels.push(days[id.day - 1]);
    } else {
      labels.push("Unknown");
    }
  }

  values.push(item.total ?? 0); // fallback to 0 if total is null
});


  res.json({ labels, values });
};











module.exports = { loadLogin,login,loadDashboard,logout,pageerror,downloadSalesReportPDF,downloadSalesReportExcel,getSalesChartData}


