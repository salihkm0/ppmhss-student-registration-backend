// routes/examInvigilatorRoutes.js
const express = require('express');
const router = express.Router();
const invigilatorController = require('../controllers/examInvigilator');
const auth = require('../middleware/auth');

// IMPORTANT: Place specific routes BEFORE dynamic :id routes

// Dashboard/Stats routes (specific)
router.get('/stats/summary', auth(['admin', 'superadmin']), async (req, res) => {
    try {
        await invigilatorController.getInvigilatorStats(req, res);
    } catch (error) {
        console.error('Error in stats/summary:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch invigilator stats'
        });
    }
});

// Search routes (specific)
router.get('/search/:query', auth(['admin', 'superadmin']), async (req, res) => {
    try {
        await invigilatorController.searchInvigilators(req, res);
    } catch (error) {
        console.error('Error in search:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to search invigilators'
        });
    }
});

// Deleted routes (specific)
router.get('/deleted/all', auth(['admin', 'superadmin']), async (req, res) => {
    try {
        await invigilatorController.getDeletedInvigilators(req, res);
    } catch (error) {
        console.error('Error in deleted/all:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch deleted invigilators'
        });
    }
});

// CRUD routes
router.get('/', auth(['admin', 'superadmin']), async (req, res) => {
    try {
        await invigilatorController.getAllInvigilators(req, res);
    } catch (error) {
        console.error('Error in GET /:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch invigilators'
        });
    }
});

router.get('/:id', auth(['admin', 'superadmin']), async (req, res) => {
    try {
        await invigilatorController.getInvigilatorById(req, res);
    } catch (error) {
        console.error('Error in GET /:id:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to fetch invigilator'
        });
    }
});

router.post('/', auth(['admin', 'superadmin']), async (req, res) => {
    try {
        await invigilatorController.createInvigilator(req, res);
    } catch (error) {
        console.error('Error in POST /:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to create invigilator'
        });
    }
});

router.post('/bulk', auth(['admin', 'superadmin']), async (req, res) => {
    try {
        await invigilatorController.bulkCreateInvigilators(req, res);
    } catch (error) {
        console.error('Error in POST /bulk:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to bulk create invigilators'
        });
    }
});

router.put('/:id', auth(['admin', 'superadmin']), async (req, res) => {
    try {
        await invigilatorController.updateInvigilator(req, res);
    } catch (error) {
        console.error('Error in PUT /:id:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to update invigilator'
        });
    }
});

router.patch('/:id/toggle-status', auth(['admin', 'superadmin']), async (req, res) => {
    try {
        await invigilatorController.toggleInvigilatorStatus(req, res);
    } catch (error) {
        console.error('Error in PATCH /toggle-status:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to toggle invigilator status'
        });
    }
});

router.delete('/:id', auth(['admin', 'superadmin']), async (req, res) => {
    try {
        await invigilatorController.deleteInvigilator(req, res);
    } catch (error) {
        console.error('Error in DELETE /:id:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to delete invigilator'
        });
    }
});

router.post('/:id/restore', auth(['admin', 'superadmin']), async (req, res) => {
    try {
        await invigilatorController.restoreInvigilator(req, res);
    } catch (error) {
        console.error('Error in POST /:id/restore:', error);
        res.status(500).json({
            success: false,
            error: 'Failed to restore invigilator'
        });
    }
});

module.exports = router;