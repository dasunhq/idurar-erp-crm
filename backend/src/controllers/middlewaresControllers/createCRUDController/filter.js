const filter = async (Model, req, res) => {
  // Extract and validate parameters using destructuring
  const { filter: filterParam, equal: equalParam } = req.query || {};
  
  if (filterParam === undefined || equalParam === undefined) {
    return res.status(403).json({
      success: false,
      result: null,
      message: 'filter not provided correctly',
    });
  }
  
  // Type validation for security
  if (typeof filterParam !== 'string' || typeof equalParam !== 'string') {
    return res.status(400).json({
      success: false,
      result: null,
      message: 'filter and equal parameters must be strings',
    });
  }
  
  // Whitelist of allowed filter fields to prevent injection
  const allowedFields = ['name', 'email', 'enabled', 'removed', 'createdAt', 'updatedAt', 'status'];
  if (!allowedFields.includes(filterParam)) {
    return res.status(400).json({
      success: false,
      result: null,
      message: 'Invalid filter field',
    });
  }

  const result = await Model.find({
    removed: false,
    [filterParam]: equalParam,
  }).exec();
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
      message: 'Successfully found all documents  ',
    });
  }
};

module.exports = filter;
