const mongoose = require('mongoose');

const Model = mongoose.model('Quote');

const read = async (req, res) => {
  // Validate that quote ID is a valid MongoDB ObjectId
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    return res.status(400).json({
      success: false,
      result: null,
      message: 'Invalid quote ID format',
    });
  }

  const validatedId = new mongoose.Types.ObjectId(req.params.id);

  // Find document by id
  const result = await Model.findOne({
    _id: validatedId,
    removed: false,
  })
    .populate('createdBy', 'name')
    .exec();
  // If no results found, return document not found
  if (!result) {
    return res.status(404).json({
      success: false,
      result: null,
      message: 'No document found ',
    });
  } else {
    // Return success resposne
    return res.status(200).json({
      success: true,
      result,
      message: 'we found this document ',
    });
  }
};

module.exports = read;
