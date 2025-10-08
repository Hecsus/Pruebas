const express = require('express');
const router = express.Router();
const controller = require('../controllers/panel.controller');

router.get('/', controller.index);                    // Resumen de contadores

module.exports = router;
