const mongoose = require('mongoose');

const Model = mongoose.model('Payment');
const Invoice = mongoose.model('Invoice');
const custom = require('@/controllers/pdfController');

const { calculate } = require('@/helpers');

const update = async (req, res) => {
  // Validate amount type and value
  const paymentAmount = parseFloat(req.body.amount);
  if (isNaN(paymentAmount) || paymentAmount === 0) {
    return res.status(202).json({
      success: false,
      result: null,
      message: `The Minimum Amount couldn't be 0 or invalid`,
    });
  }
  
  // Ensure we use the sanitized amount in all calculations
  req.body.amount = paymentAmount;
  // Validate that payment ID is a valid MongoDB ObjectId
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({
      success: false,
      result: null,
      message: 'Invalid payment ID format',
    });
  }

  // Find document by id and updates with the required fields
  const previousPayment = await Model.findOne({
    _id: new mongoose.Types.ObjectId(req.params.id),
    removed: false,
  });

  // Extract values from previous payment and ensure they're the correct type
  const previousAmount = parseFloat(previousPayment.amount) || 0;
  
  // Safely extract invoice data
  const invoiceId = previousPayment.invoice._id;
  const total = parseFloat(previousPayment.invoice.total) || 0;
  const discount = parseFloat(previousPayment.invoice.discount) || 0;
  const previousCredit = parseFloat(previousPayment.invoice.credit) || 0;

  // Use our validated amount from earlier
  const currentAmount = paymentAmount;

  const changedAmount = calculate.sub(currentAmount, previousAmount);
  const maxAmount = calculate.sub(total, calculate.add(discount, previousCredit));

  if (changedAmount > maxAmount) {
    return res.status(202).json({
      success: false,
      result: null,
      message: `The Max Amount you can add is ${maxAmount + previousAmount}`,
      error: `The Max Amount you can add is ${maxAmount + previousAmount}`,
    });
  }

  let paymentStatus =
    calculate.sub(total, discount) === calculate.add(previousCredit, changedAmount)
      ? 'paid'
      : calculate.add(previousCredit, changedAmount) > 0
      ? 'partially'
      : 'unpaid';

  const updatedDate = new Date();
  
  // Sanitize and validate inputs from req.body
  const safeNumber = req.body.number ? String(req.body.number).trim() : '';
  const safeDate = req.body.date ? new Date(req.body.date) : null;
  const safeAmount = typeof req.body.amount === 'number' ? req.body.amount : 0;
  const safePaymentMode = req.body.paymentMode ? String(req.body.paymentMode).trim() : '';
  const safeRef = req.body.ref ? String(req.body.ref).trim() : '';
  const safeDescription = req.body.description ? String(req.body.description).trim() : '';
  
  // Create sanitized updates object
  const updates = {
    number: safeNumber,
    date: safeDate,
    amount: safeAmount,
    paymentMode: safePaymentMode,
    ref: safeRef,
    description: safeDescription,
    updated: updatedDate,
  };

  // Validate that payment ID is a valid MongoDB ObjectId
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({
      success: false,
      result: null,
      message: 'Invalid payment ID format',
    });
  }

  const result = await Model.findOneAndUpdate(
    { _id: new mongoose.Types.ObjectId(req.params.id), removed: false },
    { $set: updates },
    {
      new: true, // return the new result instead of the old one
    }
  ).exec();

  // Extract invoice ID and validate it
  const resultInvoiceId = result.invoice._id.toString();
  if (!mongoose.Types.ObjectId.isValid(resultInvoiceId)) {
    return res.status(400).json({
      success: false,
      result: null,
      message: 'Invalid invoice ID format',
    });
  }

  const updateInvoice = await Invoice.findOneAndUpdate(
    { _id: new mongoose.Types.ObjectId(resultInvoiceId) },
    {
      $inc: { credit: changedAmount },
      $set: {
        paymentStatus: paymentStatus,
      },
    },
    {
      new: true, // return the new result instead of the old one
    }
  ).exec();

  return res.status(200).json({
    success: true,
    result,
    message: 'Successfully updated the Payment ',
  });
};

module.exports = update;
