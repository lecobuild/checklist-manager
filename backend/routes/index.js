const express = require('express');
const router = express.Router();

// Импорт роутов
const checklistsRoutes = require('./checklists');

// Подключение роутов
router.use('/checklists', checklistsRoutes);

// Базовый роут для проверки API
router.get('/', (req, res) => {
  res.json({
    success: true,
    message: 'Checklist Manager API v1.0',
    endpoints: {
      'POST /api/checklists': 'Создать чек-лист',
      'GET /api/checklists/:id': 'Получить чек-лист',
      'PUT /api/checklists/:id': 'Обновить чек-лист',
      'DELETE /api/checklists/:id': 'Удалить чек-лист',
      'PUT /api/checklists/:id/tasks/:taskId': 'Обновить задачу',
      'POST /api/checklists/:id/verify': 'Проверить пароль'
    }
  });
});

// 404 для несуществующих API роутов
router.use('*', (req, res) => {
  res.status(404).json({
    success: false,
    message: 'API endpoint не найден'
  });
});

module.exports = router;