const mongoose = require('mongoose');

const Model = mongoose.model('Quote');

const custom = require('@/controllers/pdfController');
const { increaseBySettingKey } = require('@/middlewares/settings');
const { calculate } = require('@/helpers');

const create = async (req, res) => {
  const { items = [], taxRate = 0, discount = 0 } = req.body;

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

  // Build the quote data with sanitized input and calculated values
  const body = {
    ...sanitizedBody,
    subTotal: subTotal,
    taxTotal: taxTotal,
    total: total,
    items: items,
    createdBy: req.admin._id,
  };

  // Creating a new document in the collection
  const result = await new Model(body).save();
  
  // Validate the created document's ObjectId
  if (!mongoose.Types.ObjectId.isValid(result._id)) {
    return res.status(500).json({
      success: false,
      result: null,
      message: 'Invalid document ID generated',
    });
  }

  const validatedId = new mongoose.Types.ObjectId(result._id);
  const fileId = 'quote-' + validatedId.toString() + '.pdf';
  
  const updateResult = await Model.findOneAndUpdate(
    { _id: validatedId },
    { pdf: fileId },
    {
      new: true,
    }
  ).exec();
  // Returning successfull response

  increaseBySettingKey({
    settingKey: 'last_quote_number',
  });

  // Returning successfull response
  return res.status(200).json({
    success: true,
    result: updateResult,
    message: 'Quote created successfully',
  });
};
module.exports = create;
