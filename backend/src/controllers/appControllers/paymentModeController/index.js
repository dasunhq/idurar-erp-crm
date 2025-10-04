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
  
  const paymentMode = await Model.findOne({
    _id: new mongoose.Types.ObjectId(id),
    removed: false,
  }).exec();
  const { isDefault = paymentMode.isDefault, enabled = paymentMode.enabled } = req.body;

  // Create a validated ObjectId from the ID
  const objectId = new mongoose.Types.ObjectId(id);
  
  // if isDefault:false , we update first - isDefault:true
  // if enabled:false and isDefault:true , we update first - isDefault:true
  if (!isDefault || (!enabled && isDefault)) {
    await Model.findOneAndUpdate(
      { _id: { $ne: objectId }, enabled: true },
      { isDefault: true },
      { runValidators: true }
    );
  }

  // if isDefault:true and enabled:true, we update other paymentMode and make is isDefault:false
  if (isDefault && enabled) {
    await Model.updateMany(
      { _id: { $ne: objectId } },
      { isDefault: false },
      { runValidators: true }
    );
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

  // Create a sanitized body object with only allowed fields
  const allowedFields = ['name', 'description', 'enabled', 'isDefault'];
  const sanitizedBody = {};
  
  // Only copy allowed fields from req.body to sanitizedBody
  allowedFields.forEach(field => {
    if (req.body[field] !== undefined) {
      sanitizedBody[field] = req.body[field];
    }
  });
  
  // Use the validated objectId in the final update with sanitized body
  const result = await Model.findOneAndUpdate(
    { _id: objectId },
    sanitizedBody,
    {
      new: true,
      runValidators: true,
    }
  );

  return res.status(200).json({
    success: true,
    message: 'paymentMode updated successfully',
    result,
  });
};

module.exports = methods;
