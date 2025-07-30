import React, { useState, useEffect, useCallback, DragEvent } from 'react';
import { Plus, Edit, Trash2, GripVertical, Save, Home, Eye, EyeOff, Lock, Unlock, Check } from 'lucide-react';
import { checklistAPI, apiUtils } from './services/api';

// Типы данных
interface Task {
  id: string;
  text: string;
  completed: boolean;
  createdAt?: string;
}

interface AccessSettings {
  viewAccess: 'link' | 'password';
  checkAccess: 'link' | 'password';
  editAccess: 'link' | 'password';
  viewPassword: string;
  checkPassword: string;
  editPassword: string;
}

interface ChecklistData {
  id: string;
  title: string;
  tasks: Task[];
  accessSettings: AccessSettings;
  progress?: number;
  createdAt?: string;
  updatedAt?: string;
  views?: number;
}

type Screen = 'main' | 'create' | 'view' | 'password';

const ChecklistApp: React.FC = () => {
  const [currentScreen, setCurrentScreen] = useState<Screen>('main');
  const [currentChecklistId, setCurrentChecklistId] = useState<string | null>(null);
  const [draggedItemIndex, setDraggedItemIndex] = useState<number | null>(null);
  
  // Состояние для создания чек-листа
  const [taskInput, setTaskInput] = useState<string>('');
  const [tasks, setTasks] = useState<Task[]>([]);
  const [accessSettings, setAccessSettings] = useState<AccessSettings>({
    viewAccess: 'link',
    checkAccess: 'link',
    editAccess: 'link',
    viewPassword: '',
    checkPassword: '',
    editPassword: ''
  });
  const [editingTaskIndex, setEditingTaskIndex] = useState<number | null>(null);
  const [editingTaskText, setEditingTaskText] = useState<string>('');
  
  // Состояние для просмотра чек-листа
  const [currentChecklist, setCurrentChecklist] = useState<ChecklistData | null>(null);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>('');
  
  // Состояние для проверки пароля (только для просмотра и редактирования)
  const [passwordInput, setPasswordInput] = useState<string>('');
  const [passwordError, setPasswordError] = useState<string>('');
  const [passwordPurpose, setPasswordPurpose] = useState<'view' | 'edit'>('view');
  
  // НОВОЕ: Состояние для разблокировки галочек
  const [checkboxesUnlocked, setCheckboxesUnlocked] = useState<boolean>(false);
  const [checkPasswordInput, setCheckPasswordInput] = useState<string>('');
  const [checkPasswordError, setCheckPasswordError] = useState<string>('');
  const [showCheckPasswordField, setShowCheckPasswordField] = useState<boolean>(false);
  
  // Состояние для управления показом паролей
  const [showPasswordInput, setShowPasswordInput] = useState<boolean>(false);
  const [showViewPassword, setShowViewPassword] = useState<boolean>(false);
  const [showCheckPassword, setShowCheckPassword] = useState<boolean>(false);
  const [showEditPassword, setShowEditPassword] = useState<boolean>(false);
  const [showPasswordSection, setShowPasswordSection] = useState<boolean>(false);
  const [showCheckPasswordInputField, setShowCheckPasswordInputField] = useState<boolean>(false);

  // НОВАЯ функция: Сброс состояния чекбоксов
  const resetCheckboxState = useCallback(() => {
    setCheckboxesUnlocked(false);
    setCheckPasswordInput('');
    setCheckPasswordError('');
    setShowCheckPasswordField(false);
    setShowCheckPasswordInputField(false);
  }, []);

  // Загрузка чек-листа с сервера
  const loadChecklist = useCallback(async (id: string) => {
    setLoading(true);
    setError('');
    setPasswordError('');
    resetCheckboxState(); // Сбрасываем состояние при загрузке нового чек-листа
    
    try {
      const response = await checklistAPI.getById(id);
      
      // Проверяем нужен ли пароль для просмотра
      if (response.data.accessSettings.viewAccess === 'password') {
        setPasswordPurpose('view');
        setCurrentChecklist(response.data);
        setCurrentScreen('password');
      } else {
        setCurrentChecklist(response.data);
        setCurrentScreen('view');
        
        // Если галочки не защищены паролем, сразу разблокируем их
        if (response.data.accessSettings.checkAccess !== 'password') {
          setCheckboxesUnlocked(true);
        }
      }
    } catch (err: any) {
      setError(apiUtils.getErrorMessage(err));
      setCurrentScreen('main');
    } finally {
      setLoading(false);
    }
  }, [resetCheckboxState]);

  // Обработка URL при загрузке
  useEffect(() => {
    const hash = window.location.hash.slice(1);
    if (hash && hash.length === 12) {
      setCurrentChecklistId(hash);
      loadChecklist(hash);
    }

    const handleHashChange = () => {
      const newHash = window.location.hash.slice(1);
      if (newHash && newHash.length === 12) {
        setCurrentChecklistId(newHash);
        loadChecklist(newHash);
      } else {
        setCurrentScreen('main');
        setCurrentChecklistId(null);
        setCurrentChecklist(null);
        resetCheckboxState();
      }
    };

    window.addEventListener('hashchange', handleHashChange);
    return () => window.removeEventListener('hashchange', handleHashChange);
  }, [loadChecklist, resetCheckboxState]);

  // Проверка пароля для просмотра/редактирования
  const verifyPassword = async () => {
    if (!currentChecklistId || !passwordInput.trim()) {
      setPasswordError('Введите пароль');
      return;
    }

    setLoading(true);
    setPasswordError('');
    
    try {
      const response = await checklistAPI.verifyPassword(currentChecklistId, passwordInput, passwordPurpose);
      
      if (response.data.isValid) {
        if (passwordPurpose === 'view') {
          setCurrentScreen('view');
          
          // Если галочки не защищены паролем, сразу разблокируем их
          if (currentChecklist && currentChecklist.accessSettings.checkAccess !== 'password') {
            setCheckboxesUnlocked(true);
          }
        } else if (passwordPurpose === 'edit') {
          proceedToEdit();
        }
        
        setPasswordInput('');
        setShowPasswordInput(false);
      } else {
        setPasswordError('Неверный пароль');
      }
    } catch (err: any) {
      setPasswordError('Ошибка при проверке пароля');
    } finally {
      setLoading(false);
    }
  };

  // НОВАЯ функция: Проверка пароля для галочек
  const verifyCheckPassword = async () => {
    if (!currentChecklistId || !checkPasswordInput.trim()) {
      setCheckPasswordError('Введите пароль');
      return;
    }

    setLoading(true);
    setCheckPasswordError('');
    
    try {
      const response = await checklistAPI.verifyPassword(currentChecklistId, checkPasswordInput, 'check');
      
      if (response.data.isValid) {
        setCheckboxesUnlocked(true);
        setCheckPasswordInput('');
        setCheckPasswordError('');
        setShowCheckPasswordField(false);
        setShowCheckPasswordInputField(false);
      } else {
        setCheckPasswordError('Неверный пароль');
      }
    } catch (err: any) {
      setCheckPasswordError('Ошибка при проверке пароля');
    } finally {
      setLoading(false);
    }
  };

  // Добавление одной задачи
  const addSingleTask = () => {
    if (taskInput.trim()) {
      const newTask: Task = {
        id: `${Date.now()}`,
        text: taskInput.trim(),
        completed: false
      };
      setTasks([...tasks, newTask]);
      setTaskInput('');
    }
  };

  // Добавление нескольких задач
  const addMultipleTasks = () => {
    if (taskInput.trim()) {
      const newTasks: Task[] = taskInput
        .split('\n')
        .filter(line => line.trim())
        .map(line => ({
          id: `${Date.now()}_${Math.random()}`,
          text: line.trim(),
          completed: false
        }));
      setTasks([...tasks, ...newTasks]);
      setTaskInput('');
    }
  };

  // Удаление задачи
  const removeTask = (index: number) => {
    setTasks(tasks.filter((_, i) => i !== index));
  };

  // Начало редактирования задачи
  const startEditingTask = (index: number) => {
    setEditingTaskIndex(index);
    setEditingTaskText(tasks[index].text);
  };

  // Сохранение отредактированной задачи
  const saveEditedTask = () => {
    if (editingTaskText.trim() && editingTaskIndex !== null) {
      const updatedTasks = [...tasks];
      updatedTasks[editingTaskIndex].text = editingTaskText.trim();
      setTasks(updatedTasks);
    }
    setEditingTaskIndex(null);
    setEditingTaskText('');
  };

  // Drag and drop функции
  const handleDragStart = (e: DragEvent<HTMLDivElement>, index: number) => {
    setDraggedItemIndex(index);
  };

  const handleDragOver = (e: DragEvent<HTMLDivElement>) => {
    e.preventDefault();
  };

  const handleDrop = (e: DragEvent<HTMLDivElement>, dropIndex: number) => {
    e.preventDefault();
    if (draggedItemIndex !== null && draggedItemIndex !== dropIndex) {
      const newTasks = [...tasks];
      const draggedItem = newTasks[draggedItemIndex];
      newTasks.splice(draggedItemIndex, 1);
      newTasks.splice(dropIndex, 0, draggedItem);
      setTasks(newTasks);
    }
    setDraggedItemIndex(null);
  };

  // Проверка валидности настроек пароля
  const isPasswordValid = () => {
    if (accessSettings.viewAccess === 'password' && !accessSettings.viewPassword.trim()) return false;
    if (accessSettings.checkAccess === 'password' && !accessSettings.checkPassword.trim()) return false;
    if (accessSettings.editAccess === 'password' && !accessSettings.editPassword.trim()) return false;
    return true;
  };

  // Завершение создания чек-листа
  const finishChecklist = async () => {
    if (tasks.length === 0) return;
    
    // Валидация пароля
    if (!isPasswordValid()) {
      setError('Введите пароли для всех выбранных типов доступа');
      setShowPasswordSection(true);
      return;
    }
    
    setLoading(true);
    setError('');
    
    try {
      const response = await checklistAPI.create({
        tasks: tasks.map(task => ({ text: task.text, completed: task.completed })),
        accessSettings: {
          viewAccess: accessSettings.viewAccess,
          checkAccess: accessSettings.checkAccess,
          editAccess: accessSettings.editAccess,
          viewPassword: accessSettings.viewPassword,
          checkPassword: accessSettings.checkPassword,
          editPassword: accessSettings.editPassword
        },
        title: 'Мой чек-лист'
      });
      
      const newId = response.data.id;
      setCurrentChecklistId(newId);
      setCurrentChecklist(response.data);
      window.location.hash = newId;
      setCurrentScreen('view');
      
      // Если галочки не защищены паролем, сразу разблокируем их
      if (response.data.accessSettings.checkAccess !== 'password') {
        setCheckboxesUnlocked(true);
      }
      
      // Очистка формы
      resetForm();
      
    } catch (err: any) {
      setError(apiUtils.getErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  // Сброс формы
  const resetForm = () => {
    setTasks([]);
    setTaskInput('');
    setAccessSettings({
      viewAccess: 'link',
      checkAccess: 'link',
      editAccess: 'link',
      viewPassword: '',
      checkPassword: '',
      editPassword: ''
    });
    setShowViewPassword(false);
    setShowCheckPassword(false);
    setShowEditPassword(false);
    setShowPasswordSection(false);
  };

  // ОБНОВЛЕННАЯ функция: Переключение выполнения задачи
  const toggleTaskCompletion = async (taskId: string) => {
    if (!currentChecklist || !currentChecklistId) return;
    
    // Проверяем, разблокированы ли чекбоксы
    if (!checkboxesUnlocked) {
      return; // Если не разблокированы, ничего не делаем
    }
    
    await executeTaskToggle(taskId);
  };

  // Выполнение переключения задачи
  const executeTaskToggle = async (taskId: string) => {
    if (!currentChecklist || !currentChecklistId) return;
    
    try {
      const task = currentChecklist.tasks.find(t => t.id === taskId);
      if (!task) return;
      
      const newCompleted = !task.completed;
      
      await checklistAPI.updateTaskStatus(currentChecklistId, taskId, newCompleted);
      
      const updatedTasks = currentChecklist.tasks.map(t =>
        t.id === taskId ? { ...t, completed: newCompleted } : t
      );
      
      setCurrentChecklist({
        ...currentChecklist,
        tasks: updatedTasks
      });
      
    } catch (err: any) {
      setError(apiUtils.getErrorMessage(err));
    }
  };

  // Начало редактирования чек-листа
  const startEditingChecklist = async () => {
    if (!currentChecklist || !currentChecklistId) return;
    
    // Проверяем нужен ли пароль для редактирования
    if (currentChecklist.accessSettings.editAccess === 'password') {
      setPasswordPurpose('edit');
      setCurrentScreen('password');
    } else {
      proceedToEdit();
    }
  };

  // Функция для перехода к редактированию после проверки пароля
  const proceedToEdit = () => {
    if (!currentChecklist) return;
    
    setTasks([...currentChecklist.tasks]);
    setAccessSettings({
      viewAccess: currentChecklist.accessSettings.viewAccess,
      checkAccess: currentChecklist.accessSettings.checkAccess || 'link',
      editAccess: currentChecklist.accessSettings.editAccess,
      viewPassword: currentChecklist.accessSettings.viewPassword || '',
      checkPassword: currentChecklist.accessSettings.checkPassword || '',
      editPassword: currentChecklist.accessSettings.editPassword || ''
    });
    setCurrentScreen('create');
    
    // Показываем секцию пароля если какой-либо пароль установлен
    const hasAnyPassword = currentChecklist.accessSettings.viewAccess === 'password' || 
                          currentChecklist.accessSettings.checkAccess === 'password' ||
                          currentChecklist.accessSettings.editAccess === 'password';
    setShowPasswordSection(hasAnyPassword);
  };

  // Переход на главную страницу
  const goToHome = () => {
    window.location.hash = '';
    setCurrentScreen('main');
    setCurrentChecklistId(null);
    setCurrentChecklist(null);
    setError('');
    setPasswordInput('');
    setPasswordError('');
    setPasswordPurpose('view');
    setShowPasswordInput(false);
    setShowViewPassword(false);
    setShowCheckPassword(false);
    setShowEditPassword(false);
    setShowPasswordSection(false);
    resetCheckboxState();
  };

  // Копирование ссылки в буфер обмена
  const copyLinkToClipboard = () => {
    if (!currentChecklistId) return;
    
    const link = `${window.location.origin}${window.location.pathname}#${currentChecklistId}`;
    navigator.clipboard.writeText(link).then(() => {
      alert('Ссылка скопирована в буфер обмена!');
    }).catch(() => {
      prompt('Скопируйте ссылку:', link);
    });
  };

  // Рендеринг экрана ввода пароля (только для просмотра и редактирования)
  const renderPasswordScreen = () => (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-lg p-8 w-full max-w-md">
        <div className="text-center mb-6">
          <h2 className="text-2xl font-bold text-gray-800 mb-2">Доступ по паролю</h2>
          <p className="text-gray-600">
            {passwordPurpose === 'view' 
              ? 'Для просмотра этого чек-листа требуется пароль'
              : 'Для редактирования требуется пароль'
            }
          </p>
        </div>

        {passwordError && (
          <div className="mb-4 p-3 bg-red-100 border border-red-400 text-red-700 rounded">
            {passwordError}
          </div>
        )}

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Введите пароль:
            </label>
            <div className="relative">
              <input
                type={showPasswordInput ? "text" : "password"}
                value={passwordInput}
                onChange={(e) => setPasswordInput(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && verifyPassword()}
                className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                placeholder="Пароль"
                autoFocus
              />
              <button
                type="button"
                onClick={() => setShowPasswordInput(!showPasswordInput)}
                className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 p-1"
                title={showPasswordInput ? "Скрыть пароль" : "Показать пароль"}
              >
                {showPasswordInput ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <div className="flex gap-3">
            <button
              onClick={verifyPassword}
              disabled={loading || !passwordInput.trim()}
              className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg font-medium"
            >
              {loading ? 'Проверка...' : 'Войти'}
            </button>
            <button
              onClick={() => {
                if (passwordPurpose === 'edit') {
                  setCurrentScreen('view');
                  setPasswordInput('');
                  setPasswordError('');
                  setShowPasswordInput(false);
                } else {
                  goToHome();
                }
              }}
              className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
            >
              Отмена
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  // Рендеринг главного экрана
  const renderMainScreen = () => (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="text-center">
        <h1 className="text-4xl font-bold text-gray-800 mb-8">Менеджер чек-листов</h1>
        {error && (
          <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}
        <button
          onClick={() => {
            window.location.hash = '';
            setCurrentScreen('create');
          }}
          className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-lg text-xl font-semibold shadow-lg transform hover:scale-105 transition-all duration-200 flex items-center gap-2 mx-auto"
        >
          <Plus size={24} />
          Создать чек-лист
        </button>
      </div>
    </div>
  );

  // Рендеринг экрана создания чек-листа
  const renderCreateScreen = () => (
    <div className="min-h-screen bg-gray-50 p-4">
      <div className="max-w-6xl mx-auto">
        <div className="flex items-center gap-4 mb-6">
          <button
            onClick={goToHome}
            className="text-gray-600 hover:text-gray-800 flex items-center gap-2"
          >
            <Home size={20} />
            На главную
          </button>
          <h1 className="text-3xl font-bold text-gray-800">
            {currentChecklistId ? 'Редактирование чек-листа' : 'Создание чек-листа'}
          </h1>
        </div>

        {error && (
          <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
            {error}
          </div>
        )}

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Левая панель - добавление задач */}
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h2 className="text-xl font-semibold mb-4">Добавить задачи</h2>
            
            <textarea
              value={taskInput}
              onChange={(e) => setTaskInput(e.target.value)}
              placeholder="Введите задачу или несколько задач (по одной на строку)"
              className="w-full h-32 border border-gray-300 rounded-lg p-3 resize-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
            />
            
            <div className="flex gap-3 mt-4">
              <button
                onClick={addSingleTask}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
              >
                <Plus size={16} />
                Добавить задачу
              </button>
              <button
                onClick={addMultipleTasks}
                className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
              >
                <Plus size={16} />
                Добавить несколько задач
              </button>
            </div>

            {/* Настройки доступа */}
            <div className="mt-6 border-t pt-6">
              <h3 className="text-lg font-semibold mb-4">Настройки доступа</h3>
              
              {/* Кнопка управления паролем */}
              <div className="mb-4">
                {!showPasswordSection ? (
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-600">
                      {accessSettings.viewPassword || accessSettings.checkPassword || accessSettings.editPassword ? (
                        <span className="flex items-center gap-2">
                          🔒 Установлены пароли: 
                          {accessSettings.viewPassword && <span className="bg-blue-100 px-2 py-1 rounded text-xs">Просмотр</span>}
                          {accessSettings.checkPassword && <span className="bg-green-100 px-2 py-1 rounded text-xs">Галочки</span>}
                          {accessSettings.editPassword && <span className="bg-orange-100 px-2 py-1 rounded text-xs">Редактирование</span>}
                        </span>
                      ) : (
                        '🔓 Пароли не установлены'
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => setShowPasswordSection(true)}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm flex items-center gap-1"
                    >
                      {accessSettings.viewPassword || accessSettings.checkPassword || accessSettings.editPassword ? '⚙️ Настроить пароли' : '🔒 Установить пароли'}
                    </button>
                  </div>
                ) : (
                  // Развернутая секция настроек пароля
                  <div className="border border-gray-200 rounded-lg p-4 bg-gray-50">
                    <div className="flex items-center justify-between mb-4">
                      <h4 className="text-md font-medium text-gray-800">Настройки доступа</h4>
                      <button
                        type="button"
                        onClick={() => {
                          setShowPasswordSection(false);
                          setShowViewPassword(false);
                          setShowCheckPassword(false);
                          setShowEditPassword(false);
                        }}
                        className="text-gray-500 hover:text-gray-700 text-sm"
                      >
                        ✕ Свернуть
                      </button>
                    </div>
                    
                    <div className="space-y-6">
                      {/* Просмотр */}
                      <div className="bg-white p-3 rounded border">
                        <label className="block text-sm font-medium mb-2 text-blue-700">👁️ Просмотр чек-листа:</label>
                        <div className="flex gap-4 mb-3">
                          <label className="flex items-center">
                            <input
                              type="radio"
                              value="link"
                              checked={accessSettings.viewAccess === 'link'}
                              onChange={(e) => setAccessSettings({...accessSettings, viewAccess: e.target.value as 'link'})}
                              className="mr-2"
                            />
                            По ссылке
                          </label>
                          <label className="flex items-center">
                            <input
                              type="radio"
                              value="password"
                              checked={accessSettings.viewAccess === 'password'}
                              onChange={(e) => setAccessSettings({...accessSettings, viewAccess: e.target.value as 'password'})}
                              className="mr-2"
                            />
                            По паролю
                          </label>
                        </div>
                        
                        {accessSettings.viewAccess === 'password' && (
                          <div className="mt-2">
                            {accessSettings.viewPassword && (
                              <div className="mb-2 flex items-center gap-2">
                                <span className="text-xs text-gray-600">Пароль:</span>
                                {showViewPassword ? (
                                  <>
                                    <span className="font-mono text-green-600 text-sm">{accessSettings.viewPassword}</span>
                                    <button type="button" onClick={() => setShowViewPassword(false)} className="text-blue-600 hover:text-blue-800">
                                      <EyeOff size={14} />
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <span className="font-mono text-blue-600 text-sm">{'★'.repeat(6)}</span>
                                    <button type="button" onClick={() => setShowViewPassword(true)} className="text-blue-600 hover:text-blue-800">
                                      <Eye size={14} />
                                    </button>
                                  </>
                                )}
                              </div>
                            )}
                            <input
                              type="password"
                              value={accessSettings.viewPassword}
                              onChange={(e) => setAccessSettings({...accessSettings, viewPassword: e.target.value})}
                              className="w-full border rounded p-2 text-sm"
                              placeholder="Пароль для просмотра"
                            />
                          </div>
                        )}
                      </div>

                      {/* Проставление галочек */}
                      <div className="bg-white p-3 rounded border">
                        <label className="block text-sm font-medium mb-2 text-green-700">✅ Отметка задач (галочки):</label>
                        <div className="flex gap-4 mb-3">
                          <label className="flex items-center">
                            <input
                              type="radio"
                              value="link"
                              checked={accessSettings.checkAccess === 'link'}
                              onChange={(e) => setAccessSettings({...accessSettings, checkAccess: e.target.value as 'link'})}
                              className="mr-2"
                            />
                            Свободно
                          </label>
                          <label className="flex items-center">
                            <input
                              type="radio"
                              value="password"
                              checked={accessSettings.checkAccess === 'password'}
                              onChange={(e) => setAccessSettings({...accessSettings, checkAccess: e.target.value as 'password'})}
                              className="mr-2"
                            />
                            По паролю
                          </label>
                        </div>
                        
                        {accessSettings.checkAccess === 'password' && (
                          <div className="mt-2">
                            {accessSettings.checkPassword && (
                              <div className="mb-2 flex items-center gap-2">
                                <span className="text-xs text-gray-600">Пароль:</span>
                                {showCheckPassword ? (
                                  <>
                                    <span className="font-mono text-green-600 text-sm">{accessSettings.checkPassword}</span>
                                    <button type="button" onClick={() => setShowCheckPassword(false)} className="text-blue-600 hover:text-blue-800">
                                      <EyeOff size={14} />
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <span className="font-mono text-blue-600 text-sm">{'★'.repeat(6)}</span>
                                    <button type="button" onClick={() => setShowCheckPassword(true)} className="text-blue-600 hover:text-blue-800">
                                      <Eye size={14} />
                                    </button>
                                  </>
                                )}
                              </div>
                            )}
                            <input
                              type="password"
                              value={accessSettings.checkPassword}
                              onChange={(e) => setAccessSettings({...accessSettings, checkPassword: e.target.value})}
                              className="w-full border rounded p-2 text-sm"
                              placeholder="Пароль для отметки задач"
                            />
                          </div>
                        )}
                      </div>

                      {/* Редактирование */}
                      <div className="bg-white p-3 rounded border">
                        <label className="block text-sm font-medium mb-2 text-orange-700">✏️ Редактирование чек-листа:</label>
                        <div className="flex gap-4 mb-3">
                          <label className="flex items-center">
                            <input
                              type="radio"
                              value="link"
                              checked={accessSettings.editAccess === 'link'}
                              onChange={(e) => setAccessSettings({...accessSettings, editAccess: e.target.value as 'link'})}
                              className="mr-2"
                            />
                            По ссылке
                          </label>
                          <label className="flex items-center">
                            <input
                              type="radio"
                              value="password"
                              checked={accessSettings.editAccess === 'password'}
                              onChange={(e) => setAccessSettings({...accessSettings, editAccess: e.target.value as 'password'})}
                              className="mr-2"
                            />
                            По паролю
                          </label>
                        </div>
                        
                        {accessSettings.editAccess === 'password' && (
                          <div className="mt-2">
                            {accessSettings.editPassword && (
                              <div className="mb-2 flex items-center gap-2">
                                <span className="text-xs text-gray-600">Пароль:</span>
                                {showEditPassword ? (
                                  <>
                                    <span className="font-mono text-green-600 text-sm">{accessSettings.editPassword}</span>
                                    <button type="button" onClick={() => setShowEditPassword(false)} className="text-blue-600 hover:text-blue-800">
                                      <EyeOff size={14} />
                                    </button>
                                  </>
                                ) : (
                                  <>
                                    <span className="font-mono text-blue-600 text-sm">{'★'.repeat(6)}</span>
                                    <button type="button" onClick={() => setShowEditPassword(true)} className="text-blue-600 hover:text-blue-800">
                                      <Eye size={14} />
                                    </button>
                                  </>
                                )}
                              </div>
                            )}
                            <input
                              type="password"
                              value={accessSettings.editPassword}
                              onChange={(e) => setAccessSettings({...accessSettings, editPassword: e.target.value})}
                              className="w-full border rounded p-2 text-sm"
                              placeholder="Пароль для редактирования"
                            />
                          </div>
                        )}
                      </div>
                      
                      {/* Проверка валидности */}
                      {!isPasswordValid() && (
                        <div className="bg-red-50 border border-red-200 rounded p-3">
                          <p className="text-sm text-red-600">
                            ⚠️ Введите пароли для всех выбранных типов доступа
                          </p>
                        </div>
                      )}
                      
                      {/* Кнопки управления */}
                      <div className="flex gap-3 pt-2">
                        <button
                          type="button"
                          onClick={() => {
                            setAccessSettings({
                              viewAccess: 'link', 
                              checkAccess: 'link', 
                              editAccess: 'link', 
                              viewPassword: '', 
                              checkPassword: '', 
                              editPassword: ''
                            });
                            setShowPasswordSection(false);
                            setShowViewPassword(false);
                            setShowCheckPassword(false);
                            setShowEditPassword(false);
                          }}
                          className="text-red-600 hover:text-red-800 text-sm"
                        >
                          🗑️ Убрать все пароли
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowPasswordSection(false);
                            setShowViewPassword(false);
                            setShowCheckPassword(false);
                            setShowEditPassword(false);
                          }}
                          className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded text-sm"
                        >
                          ✅ Готово
                        </button>
                      </div>
                      
                      {/* Подсказка */}
                      <div className="text-xs text-gray-500 italic bg-blue-50 p-2 rounded">
                        💡 <strong>Объяснение:</strong><br/>
                        • <strong>Просмотр</strong> - для открытия и чтения чек-листа<br/>
                        • <strong>Галочки</strong> - для отметки задач как выполненных<br/>
                        • <strong>Редактирование</strong> - для изменения задач и настроек
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </div>

            <button
              onClick={finishChecklist}
              disabled={
                tasks.length === 0 || 
                loading || 
                !isPasswordValid()
              }
              title={
                tasks.length === 0 
                  ? "Добавьте хотя бы одну задачу" 
                  : !isPasswordValid()
                    ? "Настройте пароли для выбранных типов доступа"
                    : ""
              }
              className="w-full mt-6 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white px-4 py-3 rounded-lg flex items-center justify-center gap-2 font-semibold"
            >
              <Save size={20} />
              {loading ? 'Сохранение...' : (currentChecklistId ? 'Обновить чек-лист' : 'Завершить создание')}
            </button>
          </div>

          {/* Правая панель - список задач */}
          <div className="bg-white p-6 rounded-lg shadow-lg">
            <h2 className="text-xl font-semibold mb-4">Список задач ({tasks.length})</h2>
            
            {tasks.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Задачи не добавлены</p>
            ) : (
              <div className="space-y-2">
                {tasks.map((task, index) => (
                  <div
                    key={task.id}
                    draggable
                    onDragStart={(e) => handleDragStart(e, index)}
                    onDragOver={handleDragOver}
                    onDrop={(e) => handleDrop(e, index)}
                    className="bg-gray-50 p-3 rounded-lg flex items-center gap-3 hover:bg-gray-100 cursor-move"
                  >
                    <GripVertical size={16} className="text-gray-400" />
                    
                    {editingTaskIndex === index ? (
                      <div className="flex-1 flex gap-2">
                        <input
                          type="text"
                          value={editingTaskText}
                          onChange={(e) => setEditingTaskText(e.target.value)}
                          onKeyPress={(e) => e.key === 'Enter' && saveEditedTask()}
                          className="flex-1 border border-gray-300 rounded px-2 py-1 focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                          autoFocus
                        />
                        <button
                          onClick={saveEditedTask}
                          className="text-green-600 hover:text-green-800"
                        >
                          <Save size={16} />
                        </button>
                      </div>
                    ) : (
                      <>
                        <span className="flex-1">{task.text}</span>
                        <button
                          onClick={() => startEditingTask(index)}
                          className="text-blue-600 hover:text-blue-800"
                        >
                          <Edit size={16} />
                        </button>
                      </>
                    )}
                    
                    <button
                      onClick={() => removeTask(index)}
                      className="text-red-600 hover:text-red-800"
                    >
                      <Trash2 size={16} />
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );

  // ОБНОВЛЕННЫЙ рендеринг экрана просмотра чек-листа
  const renderViewScreen = () => {
    if (!currentChecklist) {
      return (
        <div className="min-h-screen bg-gray-50 flex items-center justify-center">
          <div className="text-center">
            {loading ? (
              <p className="text-lg">Загрузка чек-листа...</p>
            ) : (
              <p className="text-lg text-red-600">Чек-лист не найден</p>
            )}
          </div>
        </div>
      );
    }

    const completedTasks = currentChecklist.tasks.filter(task => task.completed).length;
    const totalTasks = currentChecklist.tasks.length;
    const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;
    
    // Определяем, нужен ли пароль для галочек
    const checkPasswordRequired = currentChecklist.accessSettings.checkAccess === 'password';

    return (
      <div className="min-h-screen bg-gray-50">
        {/* Полоса прогресса */}
        <div className="bg-white shadow-sm border-b">
          <div className="max-w-4xl mx-auto p-4">
            <div className="flex items-center justify-between mb-2">
              <h1 className="text-2xl font-bold text-gray-800">{currentChecklist.title}</h1>
              <span className="text-lg font-semibold text-blue-600">{progressPercent}%</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3">
              <div 
                className="bg-blue-600 h-3 rounded-full transition-all duration-300"
                style={{ width: `${progressPercent}%` }}
              ></div>
            </div>
            <p className="text-sm text-gray-600 mt-2">
              Выполнено {completedTasks} из {totalTasks} задач
            </p>
          </div>
        </div>

        <div className="max-w-4xl mx-auto p-4">
          <div className="flex gap-4 mb-6">
            <button
              onClick={goToHome}
              className="text-gray-600 hover:text-gray-800 flex items-center gap-2"
            >
              <Home size={20} />
              На главную
            </button>
            <button
              onClick={startEditingChecklist}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
            >
              <Edit size={16} />
              Редактировать
            </button>
          </div>

          {error && (
            <div className="mb-4 p-4 bg-red-100 border border-red-400 text-red-700 rounded">
              {error}
            </div>
          )}

          {/* НОВАЯ СЕКЦИЯ: Панель разблокировки галочек */}
          {checkPasswordRequired && (
            <div className="bg-white rounded-lg shadow-lg p-4 mb-6 border-l-4 border-yellow-400">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {checkboxesUnlocked ? (
                    <>
                      <Unlock className="text-green-600" size={20} />
                      <span className="text-green-700 font-medium">Галочки разблокированы</span>
                    </>
                  ) : (
                    <>
                      <Lock className="text-orange-600" size={20} />
                      <span className="text-orange-700 font-medium">Для отметки задач требуется пароль</span>
                    </>
                  )}
                </div>

                {!checkboxesUnlocked && (
                  <button
                    onClick={() => setShowCheckPasswordField(!showCheckPasswordField)}
                    className="bg-orange-600 hover:bg-orange-700 text-white px-3 py-1 rounded text-sm flex items-center gap-1"
                  >
                    <Lock size={14} />
                    Разблокировать
                  </button>
                )}

                {checkboxesUnlocked && (
                  <button
                    onClick={() => {
                      setCheckboxesUnlocked(false);
                      setCheckPasswordInput('');
                      setCheckPasswordError('');
                    }}
                    className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1 rounded text-sm flex items-center gap-1"
                  >
                    <Lock size={14} />
                    Заблокировать
                  </button>
                )}
              </div>

              {/* Поле ввода пароля для галочек */}
              {showCheckPasswordField && !checkboxesUnlocked && (
                <div className="mt-4 pt-4 border-t border-gray-200">
                  {checkPasswordError && (
                    <div className="mb-3 p-2 bg-red-100 border border-red-400 text-red-700 rounded text-sm">
                      {checkPasswordError}
                    </div>
                  )}

                  <div className="flex gap-3">
                    <div className="flex-1 relative">
                      <input
                        type={showCheckPasswordInputField ? "text" : "password"}
                        value={checkPasswordInput}
                        onChange={(e) => setCheckPasswordInput(e.target.value)}
                        onKeyPress={(e) => e.key === 'Enter' && verifyCheckPassword()}
                        className="w-full px-3 py-2 pr-10 border border-gray-300 rounded-lg focus:ring-2 focus:ring-orange-500 focus:border-orange-500"
                        placeholder="Введите пароль для отметки задач"
                        autoFocus
                      />
                      <button
                        type="button"
                        onClick={() => setShowCheckPasswordInputField(!showCheckPasswordInputField)}
                        className="absolute right-2 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 p-1"
                        title={showCheckPasswordInputField ? "Скрыть пароль" : "Показать пароль"}
                      >
                        {showCheckPasswordInputField ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                    
                    <button
                      onClick={verifyCheckPassword}
                      disabled={loading || !checkPasswordInput.trim()}
                      className="bg-orange-600 hover:bg-orange-700 disabled:bg-gray-400 text-white px-4 py-2 rounded-lg flex items-center gap-1"
                    >
                      {loading ? (
                        'Проверка...'
                      ) : (
                        <>
                          <Check size={16} />
                          Разблокировать
                        </>
                      )}
                    </button>
                    
                    <button
                      onClick={() => {
                        setShowCheckPasswordField(false);
                        setCheckPasswordInput('');
                        setCheckPasswordError('');
                        setShowCheckPasswordInputField(false);
                      }}
                      className="px-3 py-2 text-gray-600 hover:text-gray-800"
                    >
                      Отмена
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}

          <div className="bg-white rounded-lg shadow-lg p-6">
            <div className="space-y-3">
              {currentChecklist.tasks.map((task) => (
                <label
                  key={task.id}
                  className={`flex items-center gap-3 p-3 rounded-lg hover:bg-gray-50 ${
                    checkboxesUnlocked ? 'cursor-pointer' : checkPasswordRequired ? 'cursor-not-allowed opacity-60' : 'cursor-pointer'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={task.completed}
                    onChange={() => toggleTaskCompletion(task.id)}
                    disabled={checkPasswordRequired && !checkboxesUnlocked}
                    className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  />
                  <span 
                    className={`flex-1 ${task.completed ? 'line-through text-gray-500' : 'text-gray-800'}`}
                  >
                    {task.text}
                  </span>
                  {checkPasswordRequired && !checkboxesUnlocked && (
                    <Lock size={16} className="text-orange-400" />
                  )}
                </label>
              ))}
            </div>

            {currentChecklist.tasks.length === 0 && (
              <p className="text-gray-500 text-center py-8">Задачи отсутствуют</p>
            )}
          </div>

          <div className="mt-6 flex items-center justify-center gap-4">
            <div className="text-sm text-gray-500">
              Ссылка: {window.location.origin}#{currentChecklistId}
            </div>
            <button
              onClick={copyLinkToClipboard}
              className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1 rounded text-sm flex items-center gap-1"
            >
              📋 Копировать ссылку
            </button>
          </div>
        </div>
      </div>
    );
  };

  // Рендеринг в зависимости от текущего экрана
  return (
    <div>
      {currentScreen === 'main' && renderMainScreen()}
      {currentScreen === 'create' && renderCreateScreen()}
      {currentScreen === 'view' && renderViewScreen()}
      {currentScreen === 'password' && renderPasswordScreen()}
    </div>
  );
};

export default ChecklistApp;