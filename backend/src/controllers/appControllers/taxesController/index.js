const mongoose = require('mongoose');
const Model = mongoose.model('Taxes');
const createCRUDController = require('@/controllers/middlewaresControllers/createCRUDController');
const methods = createCRUDController('Taxes');

delete methods['delete'];

methods.create = async (req, res) => {
  const { isDefault } = req.body;

  if (isDefault) {
    await Model.updateMany({}, { isDefault: false });
  }

  const countDefault = await Model.countDocuments({
    isDefault: true,
  });

  const result = await new Model({
    ...req.body,

    isDefault: countDefault < 1 ? true : false,
  }).save();

  return res.status(200).json({
    success: true,
    result: result,
    message: 'Tax created successfully',
  });
};

methods.delete = async (req, res) => {
  return res.status(403).json({
    success: false,
    result: null,
    message: "you can't delete tax after it has been created",
  });
};

methods.update = async (req, res) => {
  const { id } = req.params;
  
  // Validate that tax ID is a valid MongoDB ObjectId
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
      success: false,
      result: null,
      message: 'Invalid tax ID format',
    });
  }

  const validatedId = new mongoose.Types.ObjectId(id);
  const tax = await Model.findOne({
    _id: validatedId,
    removed: false,
  }).exec();
  const { isDefault = tax.isDefault, enabled = tax.enabled } = req.body;

  // if isDefault:false , we update first - isDefault:true
  // if enabled:false and isDefault:true , we update first - isDefault:true
  if (!isDefault || (!enabled && isDefault)) {
    await Model.findOneAndUpdate({ _id: { $ne: validatedId }, enabled: true }, { isDefault: true });
  }

  // if isDefault:true and enabled:true, we update other taxes and make is isDefault:false
  if (isDefault && enabled) {
    await Model.updateMany({ _id: { $ne: validatedId } }, { isDefault: false });
  }

  const taxesCount = await Model.countDocuments({});

  // if enabled:false and it's only one exist, we can't disable
  if ((!enabled || !isDefault) && taxesCount <= 1) {
    return res.status(422).json({
      success: false,
      result: null,
      message: 'You cannot disable the tax because it is the only existing one',
    });
  }

  // Sanitize body to prevent NoSQL injection by removing MongoDB operators
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

  const result = await Model.findOneAndUpdate({ _id: validatedId }, sanitizedBody, {
    new: true,
  });

  return res.status(200).json({
    success: true,
    message: 'Tax updated successfully',
    result,
  });
};

module.exports = methods;
