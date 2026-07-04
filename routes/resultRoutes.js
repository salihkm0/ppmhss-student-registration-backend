const express = require('express');
const router = express.Router();
const resultController = require('../controllers/resultController');
const auth = require('../middleware/auth');

// Public routes (students can check results)
router.get('/status', resultController.getResultStatus);
router.get('/code/:code', resultController.getResultByCode);
router.get('/phone/:phoneNo', resultController.getResultsByPhone);
router.get('/top', resultController.getTopResults);
router.get('/room/:roomNo', resultController.getResultsByRoom);
router.post('/check-dob', resultController.checkResultWithDob);

// Protected routes (admin only for rank generation)
router.post('/generate-ranks', auth(['admin', 'superadmin']), resultController.generateRankList);

module.exports = router;