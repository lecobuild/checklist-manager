const Checklist = require('../models/Checklist');

// Генерация уникального ID
const generateRandomId = () => {
  const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
  let result = '';
  for (let i = 0; i < 12; i++) {
    result += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return result;
};

// Создание нового чек-листа
exports.createChecklist = async (req, res) => {
  try {
    const { tasks, accessSettings, title } = req.body;
    
    // Валидация
    if (!tasks || !Array.isArray(tasks) || tasks.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Необходимо добавить хотя бы одну задачу'
      });
    }

    // Генерация уникального ID
    let customId;
    let isUnique = false;
    while (!isUnique) {
      customId = generateRandomId();
      const existing = await Checklist.findByCustomId(customId);
      if (!existing) isUnique = true;
    }

    // Подготовка задач с уникальными ID
    const formattedTasks = tasks.map((task, index) => ({
      id: `${Date.now()}_${index}`,
      text: task.text || task,
      completed: task.completed || false
    }));

    const checklist = new Checklist({
      id: customId,
      title: title || 'Мой чек-лист',
      tasks: formattedTasks,
      accessSettings: accessSettings || {
        viewAccess: 'link',
        editAccess: 'link',
        password: ''
      },
      createdBy: req.ip || 'anonymous'
    });

    await checklist.save();

    res.status(201).json({
      success: true,
      data: {
        id: checklist.id,
        title: checklist.title,
        tasks: checklist.tasks,
        accessSettings: checklist.accessSettings,
        progress: checklist.getProgress(),
        createdAt: checklist.createdAt
      }
    });

  } catch (error) {
    console.error('Ошибка создания чек-листа:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка сервера при создании чек-листа'
    });
  }
};

// Получение чек-листа по ID
exports.getChecklist = async (req, res) => {
  try {
    const { id } = req.params;
    
    const checklist = await Checklist.findByCustomId(id);
    
    if (!checklist) {
      return res.status(404).json({
        success: false,
        message: 'Чек-лист не найден'
      });
    }

    // Увеличиваем счетчик просмотров
    checklist.views += 1;
    await checklist.save();

    res.json({
      success: true,
      data: {
        id: checklist.id,
        title: checklist.title,
        tasks: checklist.tasks,
        accessSettings: {
          viewAccess: checklist.accessSettings.viewAccess,
          editAccess: checklist.accessSettings.editAccess,
          // Не возвращаем пароль в ответе
        },
        progress: checklist.getProgress(),
        createdAt: checklist.createdAt,
        updatedAt: checklist.updatedAt,
        views: checklist.views
      }
    });

  } catch (error) {
    console.error('Ошибка получения чек-листа:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка сервера при получении чек-листа'
    });
  }
};

// Обновление чек-листа
exports.updateChecklist = async (req, res) => {
  try {
    const { id } = req.params;
    const { tasks, accessSettings, title } = req.body;
    
    const checklist = await Checklist.findByCustomId(id);
    
    if (!checklist) {
      return res.status(404).json({
        success: false,
        message: 'Чек-лист не найден'
      });
    }

    // Обновляем поля если они переданы
    if (title) checklist.title = title;
    
    if (tasks) {
      checklist.tasks = tasks.map((task, index) => ({
        id: task.id || `${Date.now()}_${index}`,
        text: task.text,
        completed: task.completed || false
      }));
    }

    if (accessSettings) {
      checklist.accessSettings = {
        ...checklist.accessSettings,
        ...accessSettings
      };
    }

    await checklist.save();

    res.json({
      success: true,
      data: {
        id: checklist.id,
        title: checklist.title,
        tasks: checklist.tasks,
        accessSettings: {
          viewAccess: checklist.accessSettings.viewAccess,
          editAccess: checklist.accessSettings.editAccess,
        },
        progress: checklist.getProgress(),
        updatedAt: checklist.updatedAt
      }
    });

  } catch (error) {
    console.error('Ошибка обновления чек-листа:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка сервера при обновлении чек-листа'
    });
  }
};

// Обновление статуса задачи (обновленная версия)
exports.updateTaskStatus = async (req, res) => {
  try {
    const { id } = req.params;
    const { taskId, completed } = req.body; // taskId теперь в body
    
    const checklist = await Checklist.findByCustomId(id);
    
    if (!checklist) {
      return res.status(404).json({
        success: false,
        message: 'Чек-лист не найден'
      });
    }

    const task = checklist.tasks.find(t => t.id === taskId);
    
    if (!task) {
      return res.status(404).json({
        success: false,
        message: 'Задача не найдена'
      });
    }

    task.completed = completed;
    await checklist.save();

    res.json({
      success: true,
      data: {
        taskId: task.id,
        completed: task.completed,
        progress: checklist.getProgress()
      }
    });

  } catch (error) {
    console.error('Ошибка обновления задачи:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка сервера при обновлении задачи'
    });
  }
};

// Проверка пароля
exports.verifyPassword = async (req, res) => {
  try {
    const { id } = req.params;
    const { password } = req.body;
    
    const checklist = await Checklist.findByCustomId(id);
    
    if (!checklist) {
      return res.status(404).json({
        success: false,
        message: 'Чек-лист не найден'
      });
    }

    const isPasswordValid = checklist.accessSettings.password === password;

    res.json({
      success: true,
      data: {
        isValid: isPasswordValid
      }
    });

  } catch (error) {
    console.error('Ошибка проверки пароля:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка сервера при проверке пароля'
    });
  }
};

// Удаление чек-листа
exports.deleteChecklist = async (req, res) => {
  try {
    const { id } = req.params;
    
    const checklist = await Checklist.findByCustomId(id);
    
    if (!checklist) {
      return res.status(404).json({
        success: false,
        message: 'Чек-лист не найден'
      });
    }

    await Checklist.deleteOne({ id });

    res.json({
      success: true,
      message: 'Чек-лист успешно удален'
    });

  } catch (error) {
    console.error('Ошибка удаления чек-листа:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка сервера при удалении чек-листа'
    });
  }
};