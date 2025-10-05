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
  
  // Create a validated ObjectId from the ID
  const objectId = new mongoose.Types.ObjectId(id);
  
  const tax = await Model.findOne({
    _id: objectId,
    removed: false,
  }).exec();
  
  if (!tax) {
    return res.status(404).json({
      success: false,
      result: null,
      message: 'Tax not found',
    });
  }
  
  const { isDefault = tax.isDefault, enabled = tax.enabled } = req.body;

  // if isDefault:false , we update first - isDefault:true
  // if enabled:false and isDefault:true , we update first - isDefault:true
  if (!isDefault || (!enabled && isDefault)) {
    await Model.findOneAndUpdate(
      { _id: { $ne: objectId }, enabled: true },
      { isDefault: true },
      { runValidators: true }
    );
  }

  // if isDefault:true and enabled:true, we update other taxes and make is isDefault:false
  if (isDefault && enabled) {
    await Model.updateMany(
      { _id: { $ne: objectId } },
      { isDefault: false },
      { runValidators: true }
    );
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

  // Create a sanitized body object with only allowed fields
  const allowedFields = ['name', 'description', 'value', 'enabled', 'isDefault'];
  const sanitizedBody = {};
  
  // Only copy allowed fields from req.body to sanitizedBody
  allowedFields.forEach(field => {
    if (req.body[field] !== undefined) {
      sanitizedBody[field] = req.body[field];
    }
  });

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
    message: 'Tax updated successfully',
    result,
  });
};

module.exports = methods;
