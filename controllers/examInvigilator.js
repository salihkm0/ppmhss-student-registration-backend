// const Invigilator = require('../models/ExamInvigilator');

// // @desc    Get all invigilators
// // @route   GET /api/invigilators
// exports.getAllInvigilators = async (req, res) => {
//     try {
//         const { page = 1, limit = 50, search, active } = req.query;
//         const query = {};

//         if (search) {
//             query.$or = [
//                 { name: { $regex: search, $options: 'i' } },
//                 { shortName: { $regex: search, $options: 'i' } },
//                 { mobileNo: { $regex: search, $options: 'i' } }
//             ];
//         }

//         if (active !== undefined) {
//             query.isActive = active === 'true';
//         }

//         const invigilators = await Invigilator.find(query)
//             .limit(limit * 1)
//             .skip((page - 1) * limit)
//             .sort({ shortName: 1 });

//         const total = await Invigilator.countDocuments(query);

//         res.json({
//             success: true,
//             data: invigilators,
//             pagination: {
//                 page: parseInt(page),
//                 limit: parseInt(limit),
//                 total,
//                 pages: Math.ceil(total / limit)
//             }
//         });
//     } catch (error) {
//         console.error('Error fetching invigilators:', error);
//         res.status(500).json({
//             success: false,
//             error: 'Failed to fetch invigilators'
//         });
//     }
// };

// // @desc    Get single invigilator
// // @route   GET /api/invigilators/:id
// exports.getInvigilatorById = async (req, res) => {
//     try {
//         const invigilator = await Invigilator.findById(req.params.id);
        
//         if (!invigilator) {
//             return res.status(404).json({
//                 success: false,
//                 error: 'Invigilator not found'
//             });
//         }

//         res.json({
//             success: true,
//             data: invigilator
//         });
//     } catch (error) {
//         console.error('Error fetching invigilator:', error);
//         res.status(500).json({
//             success: false,
//             error: 'Failed to fetch invigilator'
//         });
//     }
// };

// // @desc    Create new invigilator
// // @route   POST /api/invigilators
// exports.createInvigilator = async (req, res) => {
//     try {
//         const { shortName, name, mobileNo } = req.body;

//         // Validate required fields
//         if (!shortName || !name || !mobileNo) {
//             return res.status(400).json({
//                 success: false,
//                 error: 'Please provide shortName, name, and mobileNo'
//             });
//         }

//         // Check if short name already exists
//         const existingShortName = await Invigilator.findOne({ 
//             shortName: shortName.toUpperCase() 
//         });
        
//         if (existingShortName) {
//             return res.status(400).json({
//                 success: false,
//                 error: 'Short name already exists'
//             });
//         }

//         // Check if mobile number already exists
//         const existingMobile = await Invigilator.findOne({ mobileNo });
//         if (existingMobile) {
//             return res.status(400).json({
//                 success: false,
//                 error: 'Mobile number already registered'
//             });
//         }

//         const invigilator = await Invigilator.create({
//             shortName: shortName.toUpperCase(),
//             name,
//             mobileNo
//         });

//         res.status(201).json({
//             success: true,
//             message: 'Invigilator created successfully',
//             data: invigilator
//         });
//     } catch (error) {
//         console.error('Error creating invigilator:', error);
//         res.status(500).json({
//             success: false,
//             error: error.message || 'Failed to create invigilator'
//         });
//     }
// };

// // @desc    Bulk create invigilators
// // @route   POST /api/invigilators/bulk
// exports.bulkCreateInvigilators = async (req, res) => {
//     try {
//         const { invigilators } = req.body;

//         if (!Array.isArray(invigilators) || invigilators.length === 0) {
//             return res.status(400).json({
//                 success: false,
//                 error: 'Please provide an array of invigilators'
//             });
//         }

//         const results = {
//             successful: [],
//             failed: []
//         };

//         for (const inv of invigilators) {
//             try {
//                 // Validate required fields
//                 if (!inv.shortName || !inv.name || !inv.mobileNo) {
//                     results.failed.push({
//                         data: inv,
//                         error: 'Missing required fields (shortName, name, mobileNo)'
//                     });
//                     continue;
//                 }

//                 // Check duplicates
//                 const existingShortName = await Invigilator.findOne({ 
//                     shortName: inv.shortName.toUpperCase() 
//                 });
                
//                 if (existingShortName) {
//                     results.failed.push({
//                         data: inv,
//                         error: `Short name ${inv.shortName} already exists`
//                     });
//                     continue;
//                 }

//                 const existingMobile = await Invigilator.findOne({ 
//                     mobileNo: inv.mobileNo 
//                 });
                
//                 if (existingMobile) {
//                     results.failed.push({
//                         data: inv,
//                         error: `Mobile number ${inv.mobileNo} already exists`
//                     });
//                     continue;
//                 }

//                 const newInvigilator = await Invigilator.create({
//                     shortName: inv.shortName.toUpperCase(),
//                     name: inv.name,
//                     mobileNo: inv.mobileNo
//                 });

//                 results.successful.push(newInvigilator);
//             } catch (error) {
//                 results.failed.push({
//                     data: inv,
//                     error: error.message
//                 });
//             }
//         }

//         res.status(201).json({
//             success: true,
//             message: `Successfully created ${results.successful.length} invigilators`,
//             results
//         });
//     } catch (error) {
//         console.error('Error bulk creating invigilators:', error);
//         res.status(500).json({
//             success: false,
//             error: 'Failed to bulk create invigilators'
//         });
//     }
// };

// // @desc    Update invigilator
// // @route   PUT /api/invigilators/:id
// exports.updateInvigilator = async (req, res) => {
//     try {
//         const { shortName, mobileNo } = req.body;

//         // Check for duplicate short name if being updated
//         if (shortName) {
//             const existing = await Invigilator.findOne({
//                 shortName: shortName.toUpperCase(),
//                 _id: { $ne: req.params.id }
//             });
//             if (existing) {
//                 return res.status(400).json({
//                     success: false,
//                     error: 'Short name already exists'
//                 });
//             }
//         }

//         // Check for duplicate mobile if being updated
//         if (mobileNo) {
//             const existing = await Invigilator.findOne({
//                 mobileNo,
//                 _id: { $ne: req.params.id }
//             });
//             if (existing) {
//                 return res.status(400).json({
//                     success: false,
//                     error: 'Mobile number already exists'
//                 });
//             }
//         }

//         const invigilator = await Invigilator.findByIdAndUpdate(
//             req.params.id,
//             { 
//                 ...req.body, 
//                 shortName: shortName?.toUpperCase() 
//             },
//             { new: true, runValidators: true }
//         );

//         if (!invigilator) {
//             return res.status(404).json({
//                 success: false,
//                 error: 'Invigilator not found'
//             });
//         }

//         res.json({
//             success: true,
//             message: 'Invigilator updated successfully',
//             data: invigilator
//         });
//     } catch (error) {
//         console.error('Error updating invigilator:', error);
//         res.status(500).json({
//             success: false,
//             error: error.message || 'Failed to update invigilator'
//         });
//     }
// };

// // @desc    Toggle invigilator active status
// // @route   PATCH /api/invigilators/:id/toggle-status
// exports.toggleInvigilatorStatus = async (req, res) => {
//     try {
//         const invigilator = await Invigilator.findById(req.params.id);
        
//         if (!invigilator) {
//             return res.status(404).json({
//                 success: false,
//                 error: 'Invigilator not found'
//             });
//         }

//         invigilator.isActive = !invigilator.isActive;
//         await invigilator.save();

//         res.json({
//             success: true,
//             message: `Invigilator ${invigilator.isActive ? 'activated' : 'deactivated'} successfully`,
//             data: invigilator
//         });
//     } catch (error) {
//         console.error('Error toggling invigilator status:', error);
//         res.status(500).json({
//             success: false,
//             error: 'Failed to toggle invigilator status'
//         });
//     }
// };

// // @desc    Delete invigilator (soft delete)
// // @route   DELETE /api/invigilators/:id
// exports.deleteInvigilator = async (req, res) => {
//     try {
//         const invigilator = await Invigilator.softDelete(req.params.id, req.user?.id);

//         if (!invigilator) {
//             return res.status(404).json({
//                 success: false,
//                 error: 'Invigilator not found'
//             });
//         }

//         res.json({
//             success: true,
//             message: 'Invigilator deleted successfully'
//         });
//     } catch (error) {
//         console.error('Error deleting invigilator:', error);
//         res.status(500).json({
//             success: false,
//             error: 'Failed to delete invigilator'
//         });
//     }
// };

// // @desc    Restore deleted invigilator
// // @route   POST /api/invigilators/:id/restore
// exports.restoreInvigilator = async (req, res) => {
//     try {
//         const invigilator = await Invigilator.restore(req.params.id);

//         if (!invigilator) {
//             return res.status(404).json({
//                 success: false,
//                 error: 'Invigilator not found'
//             });
//         }

//         res.json({
//             success: true,
//             message: 'Invigilator restored successfully',
//             data: invigilator
//         });
//     } catch (error) {
//         console.error('Error restoring invigilator:', error);
//         res.status(500).json({
//             success: false,
//             error: 'Failed to restore invigilator'
//         });
//     }
// };

// // @desc    Get deleted invigilators
// // @route   GET /api/invigilators/deleted/all
// exports.getDeletedInvigilators = async (req, res) => {
//     try {
//         const deleted = await Invigilator.find({ isDeleted: true })
//             .setOptions({ includeDeleted: true })
//             .populate('deletedBy', 'name email')
//             .sort({ deletedAt: -1 });

//         res.json({
//             success: true,
//             data: deleted
//         });
//     } catch (error) {
//         console.error('Error fetching deleted invigilators:', error);
//         res.status(500).json({
//             success: false,
//             error: 'Failed to fetch deleted invigilators'
//         });
//     }
// };

// // @desc    Get invigilator stats
// // @route   GET /api/invigilators/stats/summary
// exports.getInvigilatorStats = async (req, res) => {
//     try {
//         const total = await Invigilator.countDocuments();
//         const active = await Invigilator.countDocuments({ isActive: true });
//         const inactive = await Invigilator.countDocuments({ isActive: false });
//         const deleted = await Invigilator.countDocuments({ isDeleted: true })
//             .setOptions({ includeDeleted: true });

//         res.json({
//             success: true,
//             stats: {
//                 total,
//                 active,
//                 inactive,
//                 deleted
//             }
//         });
//     } catch (error) {
//         console.error('Error fetching invigilator stats:', error);
//         res.status(500).json({
//             success: false,
//             error: 'Failed to fetch invigilator stats'
//         });
//     }
// };

// // @desc    Search invigilators by name or short name
// // @route   GET /api/invigilators/search/:query
// exports.searchInvigilators = async (req, res) => {
//     try {
//         const searchQuery = req.params.query;
        
//         const invigilators = await Invigilator.find({
//             $or: [
//                 { name: { $regex: searchQuery, $options: 'i' } },
//                 { shortName: { $regex: searchQuery, $options: 'i' } },
//                 { mobileNo: { $regex: searchQuery, $options: 'i' } }
//             ],
//             isActive: true
//         })
//         .limit(20)
//         .sort({ shortName: 1 });

//         res.json({
//             success: true,
//             data: invigilators
//         });
//     } catch (error) {
//         console.error('Error searching invigilators:', error);
//         res.status(500).json({
//             success: false,
//             error: 'Failed to search invigilators'
//         });
//     }
// };