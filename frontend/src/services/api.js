import axios from 'axios';

// Базовая конфигурация API
const API_BASE_URL = process.env.REACT_APP_API_URL || 'http://localhost:3000/api';

const api = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 10000, // 10 секунд таймаут
});

// Интерсептор для логирования запросов (в development)
if (process.env.NODE_ENV === 'development') {
  api.interceptors.request.use(
    (config) => {
      console.log(`🚀 API Request: ${config.method?.toUpperCase()} ${config.url}`);
      if (config.data) {
        console.log('📝 Request Data:', config.data);
      }
      return config;
    },
    (error) => {
      console.error('❌ API Request Error:', error);
      return Promise.reject(error);
    }
  );

  api.interceptors.response.use(
    (response) => {
      console.log(`✅ API Response: ${response.status} ${response.config.url}`);
      return response;
    },
    (error) => {
      console.error('❌ API Response Error:', error.response?.status, error.message);
      return Promise.reject(error);
    }
  );
}

// API методы для чек-листов
export const checklistAPI = {
  // Создание нового чек-листа с поддержкой трех типов паролей
  create: async (checklistData) => {
    try {
      console.log('📤 Создание чек-листа:', checklistData);
      
      // Подготавливаем данные для отправки
      const requestData = {
        tasks: checklistData.tasks,
        title: checklistData.title || 'Мой чек-лист',
        accessSettings: {
          viewAccess: checklistData.accessSettings.viewAccess || 'link',
          checkAccess: checklistData.accessSettings.checkAccess || 'link',
          editAccess: checklistData.accessSettings.editAccess || 'link',
          viewPassword: checklistData.accessSettings.viewPassword || '',
          checkPassword: checklistData.accessSettings.checkPassword || '',
          editPassword: checklistData.accessSettings.editPassword || ''
        }
      };
      
      console.log('📋 Отправляем данные:', requestData);
      
      const response = await api.post('/checklists', requestData);
      return response.data;
    } catch (error) {
      console.error('❌ Ошибка создания чек-листа:', error);
      throw new Error(
        error.response?.data?.message || 'Ошибка при создании чек-листа'
      );
    }
  },

  // Получение чек-листа по ID
  getById: async (id) => {
    try {
      console.log(`📥 Получение чек-листа: ${id}`);
      const response = await api.get(`/checklists/${id}`);
      console.log('📋 Получены данные чек-листа:', response.data.data);
      return response.data;
    } catch (error) {
      console.error(`❌ Ошибка получения чек-листа ${id}:`, error);
      if (error.response?.status === 404) {
        throw new Error('Чек-лист не найден');
      }
      throw new Error(
        error.response?.data?.message || 'Ошибка при загрузке чек-листа'
      );
    }
  },

  // Обновление чек-листа
  update: async (id, checklistData) => {
    try {
      console.log(`📤 Обновление чек-листа ${id}:`, checklistData);
      
      // Подготавливаем данные для обновления
      const requestData = {
        tasks: checklistData.tasks,
        title: checklistData.title,
        accessSettings: {
          viewAccess: checklistData.accessSettings.viewAccess,
          checkAccess: checklistData.accessSettings.checkAccess,
          editAccess: checklistData.accessSettings.editAccess,
          viewPassword: checklistData.accessSettings.viewPassword || '',
          checkPassword: checklistData.accessSettings.checkPassword || '',
          editPassword: checklistData.accessSettings.editPassword || ''
        }
      };
      
      const response = await api.put(`/checklists/${id}`, requestData);
      return response.data;
    } catch (error) {
      console.error(`❌ Ошибка обновления чек-листа ${id}:`, error);
      throw new Error(
        error.response?.data?.message || 'Ошибка при обновлении чек-листа'
      );
    }
  },

  // Обновление статуса задачи
  updateTaskStatus: async (id, taskId, completed) => {
    try {
      console.log(`🔄 Обновление задачи ${taskId} в чек-листе ${id}: ${completed}`);
      
      const response = await api.put(`/checklists/${id}/task`, {
        taskId,
        completed
      });
      
      console.log('✅ Задача обновлена:', response.data.data);
      return response.data;
    } catch (error) {
      console.error(`❌ Ошибка обновления задачи ${taskId}:`, error);
      throw new Error(
        error.response?.data?.message || 'Ошибка при обновлении задачи'
      );
    }
  },

  // Проверка пароля с поддержкой трех типов доступа
  verifyPassword: async (id, password, purpose = 'view') => {
    try {
      console.log(`🔐 Проверка пароля для чек-листа ${id}:`);
      console.log(`   Тип доступа: ${purpose}`);
      console.log(`   Пароль: ${'*'.repeat(password.length)}`);
      
      const response = await api.post(`/checklists/${id}/verify`, {
        password,
        purpose // 'view', 'check', 'edit'
      });
      
      console.log(`🔓 Результат проверки пароля: ${response.data.data.isValid}`);
      return response.data;
    } catch (error) {
      console.error(`❌ Ошибка проверки пароля для ${purpose}:`, error);
      throw new Error(
        error.response?.data?.message || 'Ошибка при проверке пароля'
      );
    }
  },

  // Удаление чек-листа
  delete: async (id) => {
    try {
      console.log(`🗑️ Удаление чек-листа: ${id}`);
      const response = await api.delete(`/checklists/${id}`);
      console.log('✅ Чек-лист удален');
      return response.data;
    } catch (error) {
      console.error(`❌ Ошибка удаления чек-листа ${id}:`, error);
      throw new Error(
        error.response?.data?.message || 'Ошибка при удалении чек-листа'
      );
    }
  }
};

// Утилиты для работы с API
export const apiUtils = {
  // Проверка доступности API
  healthCheck: async () => {
    try {
      console.log('🏥 Проверка здоровья API...');
      const response = await api.get('/test');
      console.log('✅ API работает нормально');
      return response.data;
    } catch (error) {
      console.error('❌ API недоступно:', error);
      throw new Error('API недоступно');
    }
  },

  // Обработка ошибок сети
  isNetworkError: (error) => {
    return !error.response && error.request;
  },

  // Получение сообщения об ошибке
  getErrorMessage: (error) => {
    if (apiUtils.isNetworkError(error)) {
      return 'Проблемы с интернет соединением';
    }
    return error.message || 'Неизвестная ошибка';
  },

  // Валидация настроек доступа
  validateAccessSettings: (accessSettings) => {
    const errors = [];
    
    // Проверяем что если выбран доступ по паролю, то пароль указан
    if (accessSettings.viewAccess === 'password' && !accessSettings.viewPassword?.trim()) {
      errors.push('Необходимо указать пароль для просмотра');
    }
    
    if (accessSettings.checkAccess === 'password' && !accessSettings.checkPassword?.trim()) {
      errors.push('Необходимо указать пароль для отметки задач');
    }
    
    if (accessSettings.editAccess === 'password' && !accessSettings.editPassword?.trim()) {
      errors.push('Необходимо указать пароль для редактирования');
    }
    
    return {
      isValid: errors.length === 0,
      errors
    };
  },

  // Форматирование настроек доступа для отображения
  formatAccessSettings: (accessSettings) => {
    const types = [];
    
    if (accessSettings.viewAccess === 'password') {
      types.push('Просмотр');
    }
    if (accessSettings.checkAccess === 'password') {
      types.push('Галочки');
    }
    if (accessSettings.editAccess === 'password') {
      types.push('Редактирование');
    }
    
    if (types.length === 0) {
      return 'Без пароля';
    }
    
    return `Пароль для: ${types.join(', ')}`;
  }
};

export default api;