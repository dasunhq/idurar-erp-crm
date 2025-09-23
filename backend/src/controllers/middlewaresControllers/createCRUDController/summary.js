const summary = async (Model, req, res) => {
  //  Query the database for a list of all results
  const countPromise = Model.countDocuments({
    removed: false,
  });

  // Extract parameters with type validation using destructuring
  const { filter: filterParam, equal: equalParam } = req.query || {};

  let resultsPromise;
  if (filterParam && equalParam) {
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
    
    resultsPromise = await Model.countDocuments({
      removed: false,
      [filterParam]: equalParam
    }).exec();
  } else {
    resultsPromise = await Model.countDocuments({
      removed: false,
    }).exec();
  }
  // Resolving both promises
  const [countFilter, countAllDocs] = await Promise.all([resultsPromise, countPromise]);

  if (countAllDocs.length > 0) {
    return res.status(200).json({
      success: true,
      result: { countFilter, countAllDocs },
      message: 'Successfully count all documents',
    });
  } else {
    return res.status(203).json({
      success: false,
      result: [],
      message: 'Collection is Empty',
    });
  }
};

module.exports = summary;
