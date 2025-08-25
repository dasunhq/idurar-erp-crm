const mongoose = require('mongoose');

const Model = mongoose.model('Payment');
const Invoice = mongoose.model('Invoice');

const remove = async (req, res) => {
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

  if (!previousPayment) {
    return res.status(404).json({
      success: false,
      result: null,
      message: 'No document found ',
    });
  }

  const { _id: paymentId, amount: previousAmount } = previousPayment;
  // Safely extract the invoice data
  const invoiceData = previousPayment.invoice;
  const invoiceId = invoiceData.id;
  const total = parseFloat(invoiceData.total) || 0;
  const discount = parseFloat(invoiceData.discount) || 0;
  const previousCredit = parseFloat(invoiceData.credit) || 0;
  
  // Validate that invoice ID is a valid MongoDB ObjectId
  if (!mongoose.Types.ObjectId.isValid(invoiceId)) {
    return res.status(400).json({
      success: false,
      result: null,
      message: 'Invalid invoice ID format',
    });
  }

  // Find the document by id and delete it
  let updates = {
    removed: true,
  };
  // Find the document by id and delete it - using validated and sanitized ID
  const result = await Model.findOneAndUpdate(
    { _id: new mongoose.Types.ObjectId(req.params.id), removed: false },
    { $set: updates },
    {
      new: true, // return the new result instead of the old one
    }
  ).exec();
  // If no results found, return document not found

  let paymentStatus =
    total - discount === previousCredit - previousAmount
      ? 'paid'
      : previousCredit - previousAmount > 0
      ? 'partially'
      : 'unpaid';

  const updateInvoice = await Invoice.findOneAndUpdate(
    { _id: new mongoose.Types.ObjectId(invoiceId) },
    {
      $pull: {
        payment: mongoose.Types.ObjectId.isValid(paymentId) ? new mongoose.Types.ObjectId(paymentId) : paymentId,
      },
      $inc: { credit: -previousAmount }, // Using the validated numeric value
      $set: {
        paymentStatus: paymentStatus,
      },
    },
    {
      new: true, // return the new result instead of the old one
      runValidators: true, // Run model validators
    }
  ).exec();

  return res.status(200).json({
    success: true,
    result,
    message: 'Successfully Deleted the document ',
  });
};
module.exports = remove;
