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
  
  // Create a validated ObjectId from the ID parameter
  const objectId = new mongoose.Types.ObjectId(req.params.id);
  
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

  // Create a sanitized update object with only allowed fields
  const sanitizedBody = {};
  
  // Define allowed fields
  const allowedFields = [
    'client', 'number', 'year', 'status', 
    'dateQuote', 'expiredDate', 'note', 'items',
    'subTotal', 'taxTotal', 'total', 'discount',
    'taxRate', 'credit', 'header', 'footer'
  ];
  
  // Only copy allowed fields from req.body to sanitizedBody
  allowedFields.forEach(field => {
    if (req.body[field] !== undefined) {
      sanitizedBody[field] = req.body[field];
    }
  });

  // Add calculated fields
  sanitizedBody.subTotal = subTotal;
  sanitizedBody.taxTotal = taxTotal;
  sanitizedBody.total = total;
  sanitizedBody.items = items;
  sanitizedBody.pdf = 'quote-' + objectId.toString() + '.pdf';

  // Find document by id and updates with the required fields using validated objectId
  const result = await Model.findOneAndUpdate(
    { _id: objectId, removed: false },
    sanitizedBody,
    {
    new: true, // return the new result instead of the old one
    runValidators: true,  // Add validation for the update operation
  }).exec();

  // If no result found, return error
  if (!result) {
    return res.status(404).json({
      success: false,
      result: null,
      message: 'No document found with the provided ID: ' + objectId,
    });
  }

  // Returning successfull response
  return res.status(200).json({
    success: true,
    result,
    message: 'Document updated successfully',
  });
};
module.exports = update;
