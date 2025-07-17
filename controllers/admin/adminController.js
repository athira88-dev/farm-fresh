const User = require('../../models/userSchema')
const Order = require('../../models/orderSchema'); 
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
    let queryString = '';

    if (startDate && endDate && groupBy && startDate !== '' && endDate !== '') {
      const match = {
        status: { $in: ['Delivered', 'Shipped'] },
        createdOn: {
          $gte: new Date(startDate),
          $lte: new Date(new Date(endDate).setHours(23, 59, 59, 999)),
        },
      };

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

      // Aggregation pipeline with actual discount calculation
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
      ];

      reportData = await Order.aggregate(pipeline);
      queryString = qs.stringify(req.query);
    }

    res.render('dashboard', {
      reportData,
      queryString,
      startDate: startDate || '',
      endDate: endDate || '',
      groupBy: groupBy || '',
    });
  } catch (error) {
    console.error('Dashboard Error:', error);
    res.render('dashboard', {
      reportData: [],
      queryString: '',
      startDate: startDate || '',
      endDate: endDate || '',
      groupBy: groupBy || '',
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











module.exports = { loadLogin,login,loadDashboard,logout,pageerror,downloadSalesReportPDF,downloadSalesReportExcel}


