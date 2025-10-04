const mongoose = require('mongoose');

const Model = mongoose.model('Payment');
const Invoice = mongoose.model('Invoice');
const custom = require('@/controllers/pdfController');

const { calculate } = require('@/helpers');

const create = async (req, res) => {
  // Creating a new document in the collection
  if (req.body.amount === 0) {
    return res.status(202).json({
      success: false,
      result: null,
      message: `The Minimum Amount couldn't be 0`,
    });
  }

  // Validate that invoice ID is a valid MongoDB ObjectId before querying
  if (!mongoose.Types.ObjectId.isValid(req.body.invoice)) {
    return res.status(400).json({
      success: false,
      result: null,
      message: 'Invalid invoice ID format',
    });
  }

  const currentInvoice = await Invoice.findOne({
    _id: new mongoose.Types.ObjectId(req.body.invoice),
    removed: false,
  });

  const {
    total: previousTotal,
    discount: previousDiscount,
    credit: previousCredit,
  } = currentInvoice;

  const maxAmount = calculate.sub(calculate.sub(previousTotal, previousDiscount), previousCredit);

  if (req.body.amount > maxAmount) {
    return res.status(202).json({
      success: false,
      result: null,
      message: `The Max Amount you can add is ${maxAmount}`,
    });
  }
  req.body['createdBy'] = req.admin._id;

  const result = await Model.create(req.body);

  const fileId = 'payment-' + result._id + '.pdf';
  const updatePath = await Model.findOneAndUpdate(
    {
      _id: result._id.toString(),
      removed: false,
    },
    { pdf: fileId },
    {
      new: true,
    }
  ).exec();
  // Returning successfull response

  // Extract and validate payment ID
  const paymentId = result._id;
  if (!mongoose.Types.ObjectId.isValid(paymentId)) {
    return res.status(400).json({
      success: false,
      result: null,
      message: 'Invalid payment ID format',
    });
  }

  // Extract and validate amount
  const amount = parseFloat(result.amount) || 0;
  
  // Safely extract invoice data
  const { id: invoiceId, total, discount, credit } = currentInvoice;

  let paymentStatus =
    calculate.sub(total, discount) === calculate.add(credit, amount)
      ? 'paid'
      : calculate.add(credit, amount) > 0
      ? 'partially'
      : 'unpaid';

  // Validate that invoice ID is a valid MongoDB ObjectId
  if (!mongoose.Types.ObjectId.isValid(req.body.invoice)) {
    return res.status(400).json({
      success: false,
      result: null,
      message: 'Invalid invoice ID format',
    });
  }

  // Create a sanitized version of the payment ID for the push operation
  const sanitizedPaymentId = new mongoose.Types.ObjectId(paymentId).toString();
  
  const invoiceUpdate = await Invoice.findOneAndUpdate(
    { _id: new mongoose.Types.ObjectId(req.body.invoice) },
    {
      $push: { payment: sanitizedPaymentId },
      $inc: { credit: amount },
      $set: { paymentStatus: paymentStatus },
    },
    {
      new: true, // return the new result instead of the old one
      runValidators: true,
    }
  ).exec();

  return res.status(200).json({
    success: true,
    result: updatePath,
    message: 'Payment Invoice created successfully',
  });
};

module.exports = create;
