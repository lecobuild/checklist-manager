const express = require("express");
const mongoose = require("mongoose");
const cors = require("cors");
require("dotenv").config();

const app = express();

// Расширенное логирование
app.use((req, res, next) => {
  console.log(`\n🔍 ${new Date().toISOString()} - ${req.method} ${req.path}`);
  if (req.body && Object.keys(req.body).length > 0) {
    console.log('📝 Body:', JSON.stringify(req.body, null, 2));
  }
  if (req.params && Object.keys(req.params).length > 0) {
    console.log('📋 Params:', req.params);
  }
  next();
});

// Базовый middleware
app.use(cors({
  origin: ['http://localhost:3001', 'http://localhost:3000'],
  methods: ['GET', 'POST', 'PUT', 'DELETE'],
  allowedHeaders: ['Content-Type', 'Authorization']
}));
app.use(express.json());

// Простой тестовый роут
app.get("/", (req, res) => {
  res.json({
    success: true,
    message: "API работает!",
    timestamp: new Date().toISOString()
  });
});

// Тестовый API роут
app.get("/api/test", (req, res) => {
  res.json({
    success: true,
    message: "API тест прошел успешно!"
  });
});

// Создание чек-листа с поддержкой трех типов паролей
app.post("/api/checklists", async (req, res) => {
  try {
    const Checklist = require('./models/Checklist');
    
    const { tasks, accessSettings, title } = req.body;
    
    console.log(`\n📝 СОЗДАНИЕ ЧЕК-ЛИСТА:`);
    console.log(`   Название: ${title}`);
    console.log(`   Задач: ${tasks ? tasks.length : 0}`);
    console.log(`   Настройки доступа:`, accessSettings);
    
    if (accessSettings) {
      if (accessSettings.viewPassword) {
        console.log(`🔐 Пароль просмотра: "${accessSettings.viewPassword}"`);
      }
      if (accessSettings.checkPassword) {
        console.log(`🔐 Пароль галочек: "${accessSettings.checkPassword}"`);
      }
      if (accessSettings.editPassword) {
        console.log(`🔐 Пароль редактирования: "${accessSettings.editPassword}"`);
      }
    }
    
    if (!tasks || !Array.isArray(tasks) || tasks.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Необходимо добавить хотя бы одну задачу'
      });
    }

    // Генерация простого ID
    const generateId = () => {
      const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz';
      let result = '';
      for (let i = 0; i < 12; i++) {
        result += chars.charAt(Math.floor(Math.random() * chars.length));
      }
      return result;
    };

    const customId = generateId();
    
    const formattedTasks = tasks.map((task, index) => ({
      id: `${Date.now()}_${index}`,
      text: task.text || task,
      completed: task.completed || false
    }));

    // Подготавливаем настройки доступа с поддержкой новой системы
    const finalAccessSettings = {
      viewAccess: accessSettings?.viewAccess || 'link',
      checkAccess: accessSettings?.checkAccess || 'link',
      editAccess: accessSettings?.editAccess || 'link',
      viewPassword: accessSettings?.viewPassword || '',
      checkPassword: accessSettings?.checkPassword || '',
      editPassword: accessSettings?.editPassword || '',
      // Для обратной совместимости
      password: accessSettings?.password || accessSettings?.viewPassword || ''
    };

    const checklist = new Checklist({
      id: customId,
      title: title || 'Мой чек-лист',
      tasks: formattedTasks,
      accessSettings: finalAccessSettings
    });

    await checklist.save();
    console.log('✅ Чек-лист создан:', customId);
    
    // Проверим что сохранилось
    const savedChecklist = await Checklist.findOne({ id: customId });
    if (savedChecklist) {
      console.log(`🔍 Сохранено в БД:`, savedChecklist.accessSettings);
    }

    res.status(201).json({
      success: true,
      data: {
        id: checklist.id,
        title: checklist.title,
        tasks: checklist.tasks,
        accessSettings: checklist.accessSettings
      }
    });

  } catch (error) {
    console.error('❌ Ошибка создания чек-листа:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка сервера'
    });
  }
});

// Получение чек-листа с возвратом всех паролей
app.get("/api/checklists/:id", async (req, res) => {
  try {
    const Checklist = require('./models/Checklist');
    const { id } = req.params;
    
    console.log(`🔍 Поиск чек-листа с ID: ${id}`);
    
    const checklist = await Checklist.findOne({ id: id });
    
    if (!checklist) {
      console.log(`❌ Чек-лист не найден: ${id}`);
      return res.status(404).json({
        success: false,
        message: 'Чек-лист не найден'
      });
    }

    // Выполняем миграцию паролей если нужно
    if (checklist.migratePasswords) {
      checklist.migratePasswords();
      await checklist.save();
    }

    console.log(`✅ Чек-лист найден: ${id}, задач: ${checklist.tasks.length}`);

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
          checkAccess: checklist.accessSettings.checkAccess || 'link',
          editAccess: checklist.accessSettings.editAccess,
          viewPassword: checklist.accessSettings.viewPassword || '',
          checkPassword: checklist.accessSettings.checkPassword || '',
          editPassword: checklist.accessSettings.editPassword || '',
          // Для обратной совместимости
          password: checklist.accessSettings.password || ''
        },
        progress: checklist.getProgress(),
        createdAt: checklist.createdAt,
        updatedAt: checklist.updatedAt,
        views: checklist.views
      }
    });

  } catch (error) {
    console.error('❌ Ошибка получения чек-листа:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка сервера'
    });
  }
});

// Обновление задачи
app.put("/api/checklists/:id/task", async (req, res) => {
  try {
    const Checklist = require('./models/Checklist');
    const { id } = req.params;
    const { taskId, completed } = req.body;
    
    console.log(`🔄 Обновление задачи:`);
    console.log(`   Чек-лист ID: ${id}`);
    console.log(`   Задача ID: ${taskId}`);
    console.log(`   Новый статус: ${completed}`);
    
    const checklist = await Checklist.findOne({ id: id });
    
    if (!checklist) {
      console.log(`❌ Чек-лист не найден: ${id}`);
      return res.status(404).json({
        success: false,
        message: 'Чек-лист не найден'
      });
    }

    const task = checklist.tasks.find(t => t.id === taskId);
    
    if (!task) {
      console.log(`❌ Задача не найдена: ${taskId}`);
      return res.status(404).json({
        success: false,
        message: 'Задача не найдена'
      });
    }

    console.log(`✅ Задача найдена: "${task.text}"`);
    console.log(`🔄 Меняем статус с ${task.completed} на ${completed}`);

    task.completed = completed;
    await checklist.save();

    console.log(`✅ Задача обновлена успешно`);

    const completedCount = checklist.tasks.filter(t => t.completed).length;
    const progress = Math.round((completedCount / checklist.tasks.length) * 100);

    res.json({
      success: true,
      data: {
        taskId: task.id,
        completed: task.completed,
        progress: progress
      }
    });

  } catch (error) {
    console.error('❌ Ошибка обновления задачи:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка сервера при обновлении задачи'
    });
  }
});

// Проверка пароля с поддержкой трех типов доступа
app.post("/api/checklists/:id/verify", async (req, res) => {
  try {
    const Checklist = require('./models/Checklist');
    const { id } = req.params;
    const { password, purpose = 'view' } = req.body;
    
    console.log(`\n🔐 ПРОВЕРКА ПАРОЛЯ:`);
    console.log(`   Чек-лист ID: ${id}`);
    console.log(`   Тип доступа: ${purpose}`);
    console.log(`   Введенный пароль: "${password}"`);
    
    if (!password) {
      console.log('❌ Пароль не передан');
      return res.status(400).json({
        success: false,
        message: 'Пароль обязателен'
      });
    }
    
    const checklist = await Checklist.findOne({ id: id });
    
    if (!checklist) {
      console.log(`❌ Чек-лист не найден: ${id}`);
      return res.status(404).json({
        success: false,
        message: 'Чек-лист не найден'
      });
    }

    // Выполняем миграцию паролей если нужно
    if (checklist.migratePasswords) {
      checklist.migratePasswords();
      await checklist.save();
    }

    console.log(`📋 Чек-лист найден: "${checklist.title}"`);
    
    // Определяем какой пароль проверять в зависимости от purpose
    let correctPassword;
    switch (purpose) {
      case 'view':
        correctPassword = checklist.accessSettings.viewPassword;
        console.log(`🔍 Проверяем пароль для просмотра: "${correctPassword}"`);
        break;
      case 'check':
        correctPassword = checklist.accessSettings.checkPassword;
        console.log(`🔍 Проверяем пароль для галочек: "${correctPassword}"`);
        break;
      case 'edit':
        correctPassword = checklist.accessSettings.editPassword;
        console.log(`🔍 Проверяем пароль для редактирования: "${correctPassword}"`);
        break;
      default:
        // Fallback к старому паролю для обратной совместимости
        correctPassword = checklist.accessSettings.viewPassword || checklist.accessSettings.password;
        console.log(`🔍 Fallback к основному паролю: "${correctPassword}"`);
    }
    
    const isPasswordValid = correctPassword === password;
    
    console.log(`✅ Результат проверки: ${isPasswordValid}`);

    res.json({
      success: true,
      data: {
        isValid: isPasswordValid
      }
    });

  } catch (error) {
    console.error('❌ Ошибка проверки пароля:', error);
    res.status(500).json({
      success: false,
      message: 'Ошибка сервера при проверке пароля'
    });
  }
});

// Обработка ошибок
app.use((err, req, res, next) => {
  console.error('🚨 Необработанная ошибка:', err);
  res.status(500).json({
    success: false,
    message: 'Внутренняя ошибка сервера'
  });
});

// Подключение к MongoDB
mongoose
  .connect(process.env.MONGO_URI, {
    useNewUrlParser: true,
    useUnifiedTopology: true,
  })
  .then(() => {
    console.log("✅ MongoDB успешно подключена");
    console.log(`📂 База данных: ${mongoose.connection.name}`);
  })
  .catch((err) => {
    console.error("❌ Ошибка подключения к MongoDB:", err.message);
    process.exit(1);
  });

// Обработка событий MongoDB
mongoose.connection.on('error', (err) => {
  console.error('❌ Ошибка MongoDB:', err);
});

mongoose.connection.on('disconnected', () => {
  console.log('⚠️ MongoDB отключена');
});

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Получен сигнал SIGINT. Завершение работы...');
  try {
    await mongoose.connection.close();
    console.log('✅ MongoDB соединение закрыто');
    process.exit(0);
  } catch (err) {
    console.error('❌ Ошибка при закрытии соединения:', err);
    process.exit(1);
  }
});

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`🚀 Сервер запущен на порту ${PORT}`);
  console.log(`🌐 API доступно по адресу: http://localhost:${PORT}/api`);
  console.log(`📋 Документация API: http://localhost:${PORT}/api`);
  console.log(`⚙️ Режим: ${process.env.NODE_ENV || 'development'}`);
});

module.exports = app;