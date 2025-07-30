const express = require('express');
const router = express.Router();
const checklistController = require('../controllers/checklistController');

// Тестовый роут
router.get('/test', (req, res) => {
  res.json({
    success: true,
    message: 'Роуты работают!',
    timestamp: new Date().toISOString()
  });
});

// Базовые роуты без вложенных параметров
router.post('/', checklistController.createChecklist);
router.get('/:id', checklistController.getChecklist);
router.put('/:id', checklistController.updateChecklist);
router.delete('/:id', checklistController.deleteChecklist);

// Роут для проверки пароля
router.post('/:id/verify', checklistController.verifyPassword);

// Роут для обновления задачи (упрощенный)
router.put('/:id/task', checklistController.updateTaskStatus);

module.exports = router;