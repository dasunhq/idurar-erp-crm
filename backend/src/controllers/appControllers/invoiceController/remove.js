const mongoose = require('mongoose');

const Model = mongoose.model('Invoice');
const ModelPayment = mongoose.model('Payment');

const remove = async (req, res) => {
  // Validate that invoice ID is a valid MongoDB ObjectId
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({
      success: false,
      result: null,
      message: 'Invalid invoice ID format',
    });
  }

  const deletedInvoice = await Model.findOneAndUpdate(
    {
      _id: new mongoose.Types.ObjectId(req.params.id),
      removed: false,
    },
    {
      $set: {
        removed: true,
      },
    },
    {
      new: true, // Return updated document
      runValidators: true // Run schema validators
    }
  ).exec();

  if (!deletedInvoice) {
    return res.status(404).json({
      success: false,
      result: null,
      message: 'Invoice not found',
    });
  }
  // Ensure we have a valid ObjectId for the invoice
  const invoiceId = mongoose.Types.ObjectId.isValid(deletedInvoice._id)
    ? new mongoose.Types.ObjectId(deletedInvoice._id)
    : deletedInvoice._id;
    
  const paymentsInvoices = await ModelPayment.updateMany(
    { invoice: invoiceId },
    { $set: { removed: true } },
    { runValidators: true } // Enable schema validators
  );
  return res.status(200).json({
    success: true,
    result: deletedInvoice,
    message: 'Invoice deleted successfully',
  });
};

module.exports = remove;
