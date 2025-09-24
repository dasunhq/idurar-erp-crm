const mongoose = require('mongoose');

const Model = mongoose.model('Payment');
const Invoice = mongoose.model('Invoice');
const custom = require('@/controllers/pdfController');

const { calculate } = require('@/helpers');

const update = async (req, res) => {
  if (req.body.amount === 0) {
    return res.status(202).json({
      success: false,
      result: null,
      message: `The Minimum Amount couldn't be 0`,
    });
  }

  // Validate that payment ID is a valid MongoDB ObjectId
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({
      success: false,
      result: null,
      message: 'Invalid payment ID format',
    });
  }

  const validatedId = new mongoose.Types.ObjectId(req.params.id);

  // Find document by id and updates with the required fields
  const previousPayment = await Model.findOne({
    _id: validatedId,
    removed: false,
  });

  const { amount: previousAmount } = previousPayment;
  const { id: invoiceId, total, discount, credit: previousCredit } = previousPayment.invoice;

  const { amount: currentAmount } = req.body;

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
  
  // Sanitize and validate update fields to prevent NoSQL injection
  const sanitizeValue = (value) => {
    if (value === null || value === undefined) return value;
    if (typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
      // Prevent object injection - only allow primitive values
      return null;
    }
    return value;
  };

  // Validate amount is a number
  const sanitizedAmount = Number(req.body.amount);
  if (isNaN(sanitizedAmount) || sanitizedAmount < 0) {
    return res.status(400).json({
      success: false,
      result: null,
      message: 'Invalid amount value',
    });
  }

  // Create sanitized updates object with explicit field mapping to prevent NoSQL injection
  const sanitizedUpdates = {};
  
  // Whitelist allowed fields and sanitize each one explicitly
  const allowedFields = {
    number: sanitizeValue(req.body.number),
    date: sanitizeValue(req.body.date),
    amount: sanitizedAmount,
    paymentMode: sanitizeValue(req.body.paymentMode),
    ref: sanitizeValue(req.body.ref),
    description: sanitizeValue(req.body.description),
    updated: updatedDate,
  };

  // Only include non-null values and ensure no MongoDB operators
  for (const [key, value] of Object.entries(allowedFields)) {
    if (value !== null && value !== undefined && !key.startsWith('$') && !key.includes('.')) {
      sanitizedUpdates[key] = value;
    }
  }

  const result = await Model.findOneAndUpdate(
    { _id: validatedId, removed: false },
    { $set: sanitizedUpdates },
    {
      new: true, // return the new result instead of the old one
    }
  ).exec();

  // Sanitize values for Invoice update to prevent NoSQL injection
  const sanitizedChangedAmount = Number(changedAmount);
  const sanitizedPaymentStatus = ['paid', 'partially', 'unpaid'].includes(paymentStatus) 
    ? paymentStatus 
    : 'unpaid';

  // Validate changed amount is a valid number
  if (isNaN(sanitizedChangedAmount)) {
    return res.status(400).json({
      success: false,
      result: null,
      message: 'Invalid payment amount calculation',
    });
  }

  const updateInvoice = await Invoice.findOneAndUpdate(
    { _id: result.invoice._id.toString() },
    {
      $inc: { credit: sanitizedChangedAmount },
      $set: {
        paymentStatus: sanitizedPaymentStatus,
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
