const mongoose = require('mongoose');

const Model = mongoose.model('Quote');

const custom = require('@/controllers/pdfController');

const { calculate } = require('@/helpers');

const update = async (req, res) => {
  // Validate that quote ID is a valid MongoDB ObjectId
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({
      success: false,
      result: null,
      message: 'Invalid quote ID format',
    });
  }

  const validatedId = new mongoose.Types.ObjectId(req.params.id);

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
  // let credit = 0;

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

  // Sanitize request body to prevent NoSQL injection
  const sanitizeObject = (obj) => {
    const sanitized = {};
    for (const [key, value] of Object.entries(obj)) {
      // Skip keys that start with $ (MongoDB operators) or contain dots (path traversal)
      if (!key.startsWith('$') && !key.includes('.')) {
        if (value && typeof value === 'object' && !Array.isArray(value) && !(value instanceof Date)) {
          sanitized[key] = sanitizeObject(value);
        } else {
          sanitized[key] = value;
        }
      }
    }
    return sanitized;
  };

  const sanitizedBody = sanitizeObject(req.body);

  // Build the update data with sanitized input and calculated values
  const body = {
    ...sanitizedBody,
    subTotal: subTotal,
    taxTotal: taxTotal,
    total: total,
    items: items,
    pdf: 'quote-' + validatedId.toString() + '.pdf',
  };

  if (body.hasOwnProperty('currency')) {
    delete body.currency;
  }
  // Find document by id and updates with the required fields

  const result = await Model.findOneAndUpdate({ _id: validatedId, removed: false }, body, {
    new: true, // return the new result instead of the old one
  }).exec();

  // Returning successfull response

  return res.status(200).json({
    success: true,
    result,
    message: 'we update this document ',
  });
};
module.exports = update;
