const mongoose = require('mongoose');
const Model = mongoose.model('PaymentMode');
const createCRUDController = require('@/controllers/middlewaresControllers/createCRUDController');
const methods = createCRUDController('PaymentMode');

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
    message: 'payment mode created successfully',
  });
};

methods.delete = async (req, res) => {
  return res.status(403).json({
    success: false,
    result: null,
    message: "you can't delete payment mode after it has been created",
  });
};

methods.update = async (req, res) => {
  const { id } = req.params;
  
  // Validate that payment mode ID is a valid MongoDB ObjectId
  if (!mongoose.Types.ObjectId.isValid(id)) {
    return res.status(400).json({
      success: false,
      result: null,
      message: 'Invalid payment mode ID format',
    });
  }

  const validatedId = new mongoose.Types.ObjectId(id);
  const paymentMode = await Model.findOne({
    _id: validatedId,
    removed: false,
  }).exec();
  const { isDefault = paymentMode.isDefault, enabled = paymentMode.enabled } = req.body;

  // if isDefault:false , we update first - isDefault:true
  // if enabled:false and isDefault:true , we update first - isDefault:true
  if (!isDefault || (!enabled && isDefault)) {
    await Model.findOneAndUpdate({ _id: { $ne: validatedId }, enabled: true }, { isDefault: true });
  }

  // if isDefault:true and enabled:true, we update other paymentMode and make is isDefault:false
  if (isDefault && enabled) {
    await Model.updateMany({ _id: { $ne: validatedId } }, { isDefault: false });
  }

  const paymentModeCount = await Model.countDocuments({});

  // if enabled:false and it's only one exist, we can't disable
  if ((!enabled || !isDefault) && paymentModeCount <= 1) {
    return res.status(422).json({
      success: false,
      result: null,
      message: 'You cannot disable the paymentMode because it is the only existing one',
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
    message: 'paymentMode updated successfully',
    result,
  });
};

module.exports = methods;
