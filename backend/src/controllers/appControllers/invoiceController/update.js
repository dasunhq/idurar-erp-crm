const mongoose = require('mongoose');

const Model = mongoose.model('Invoice');

const custom = require('@/controllers/pdfController');

const { calculate } = require('@/helpers');
const schema = require('./schemaValidate');

const update = async (req, res) => {
  // Create a copy of req.body to avoid direct modification
  let body = { ...req.body };

  const { error, value } = schema.validate(body);
  if (error) {
    const { details } = error;
    return res.status(400).json({
      success: false,
      result: null,
      message: details[0]?.message,
    });
  }

  // Validate that invoice ID is a valid MongoDB ObjectId
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({
      success: false,
      result: null,
      message: 'Invalid invoice ID format',
    });
  }

  const previousInvoice = await Model.findOne({
    _id: new mongoose.Types.ObjectId(req.params.id),
    removed: false,
  });

  const { credit } = previousInvoice;

  const { items = [], taxRate = 0, discount = 0 } = req.body;

  if (items.length === 0) {
    return res.status(400).json({
      success: false,
      result: null,
      message: 'Items cannot be empty',
    });
  }

  // default
  let subTotal = 0;
  let taxTotal = 0;
  let total = 0;

  //Calculate the items array with subTotal, total, taxTotal
  items.map((item) => {
    let total = calculate.multiply(item['quantity'], item['price']);
    //sub total
    subTotal = calculate.add(subTotal, total);
    //item total
    item['total'] = total;
  });
  taxTotal = calculate.multiply(subTotal, taxRate / 100);
  total = calculate.add(subTotal, taxTotal);

  // Create a sanitized update object with only allowed fields
  const sanitizedBody = {
    // Use calculated numeric values
    subTotal: subTotal,
    taxTotal: taxTotal,
    total: total,
    items: items,
    // Safely create PDF filename
    pdf: 'invoice-' + mongoose.Types.ObjectId(req.params.id).toString() + '.pdf',
    // Include other fields from the validated body after schema.validate
    client: body.client,
    number: body.number ? String(body.number).trim() : '',
    year: body.year,
    date: body.date,
    expiredDate: body.expiredDate,
    taxRate: parseFloat(taxRate) || 0,
    discount: parseFloat(discount) || 0,
    note: body.note ? String(body.note).trim() : '',
  };

  // Remove currency if it exists
  if (body.hasOwnProperty('currency')) {
    delete body.currency;
  }

  // Find document by id and updates with the required fields
  let paymentStatus =
    calculate.sub(total, discount) === credit ? 'paid' : credit > 0 ? 'partially' : 'unpaid';
  sanitizedBody['paymentStatus'] = paymentStatus;

  const result = await Model.findOneAndUpdate(
    { _id: new mongoose.Types.ObjectId(req.params.id), removed: false },
    sanitizedBody, // Use our sanitized body instead of direct req.body
    {
      new: true, // return the new result instead of the old one
      runValidators: true, // Run model validators on update
    }
  ).exec();

  // Returning successfull response

  return res.status(200).json({
    success: true,
    result,
    message: 'we update this document ',
  });
};

module.exports = update;
