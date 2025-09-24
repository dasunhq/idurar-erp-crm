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

  const validatedId = new mongoose.Types.ObjectId(req.params.id);
  const deletedInvoice = await Model.findOneAndUpdate(
    {
      _id: validatedId,
      removed: false,
    },
    {
      $set: {
        removed: true,
      },
    }
  ).exec();

  if (!deletedInvoice) {
    return res.status(404).json({
      success: false,
      result: null,
      message: 'Invoice not found',
    });
  }
  const paymentsInvoices = await ModelPayment.updateMany(
    { invoice: deletedInvoice._id },
    { $set: { removed: true } }
  );
  return res.status(200).json({
    success: true,
    result: deletedInvoice,
    message: 'Invoice deleted successfully',
  });
};

module.exports = remove;
