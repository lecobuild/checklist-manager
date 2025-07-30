const mongoose = require('mongoose');

const TaskSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true
  },
  text: {
    type: String,
    required: true,
    trim: true,
    maxlength: 500
  },
  completed: {
    type: Boolean,
    default: false
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const ChecklistSchema = new mongoose.Schema({
  id: {
    type: String,
    required: true,
    unique: true,
    index: true
  },
  title: {
    type: String,
    default: 'Мой чек-лист',
    trim: true,
    maxlength: 200
  },
  tasks: [TaskSchema],
  accessSettings: {
    viewAccess: {
      type: String,
      enum: ['link', 'password'],
      default: 'link'
    },
    checkAccess: {
      type: String,
      enum: ['link', 'password'],
      default: 'link'
    },
    editAccess: {
      type: String,
      enum: ['link', 'password'],
      default: 'link'
    },
    viewPassword: {
      type: String,
      default: ''
    },
    checkPassword: {
      type: String,
      default: ''
    },
    editPassword: {
      type: String,
      default: ''
    },
    // Старое поле для обратной совместимости
    password: {
      type: String,
      default: ''
    }
  },
  createdAt: {
    type: Date,
    default: Date.now
  },
  updatedAt: {
    type: Date,
    default: Date.now
  },
  createdBy: {
    type: String,
    default: 'anonymous'
  },
  isPublic: {
    type: Boolean,
    default: true
  },
  views: {
    type: Number,
    default: 0
  }
}, {
  timestamps: true
});

// Индексы для оптимизации поиска
ChecklistSchema.index({ createdAt: -1 });
ChecklistSchema.index({ 'accessSettings.viewAccess': 1 });
ChecklistSchema.index({ 'accessSettings.checkAccess': 1 });
ChecklistSchema.index({ 'accessSettings.editAccess': 1 });

// Middleware для обновления updatedAt
ChecklistSchema.pre('save', function(next) {
  this.updatedAt = Date.now();
  next();
});

// Метод для подсчета прогресса
ChecklistSchema.methods.getProgress = function() {
  if (this.tasks.length === 0) return 0;
  const completedTasks = this.tasks.filter(task => task.completed).length;
  return Math.round((completedTasks / this.tasks.length) * 100);
};

// Статический метод для поиска по ID
ChecklistSchema.statics.findByCustomId = function(customId) {
  return this.findOne({ id: customId });
};

// Метод для миграции старых данных
ChecklistSchema.methods.migratePasswords = function() {
  // Если есть старый пароль но нет новых, мигрируем
  if (this.accessSettings.password && 
      !this.accessSettings.viewPassword && 
      !this.accessSettings.checkPassword && 
      !this.accessSettings.editPassword) {
    
    // Устанавливаем старый пароль для всех типов доступа
    if (this.accessSettings.viewAccess === 'password') {
      this.accessSettings.viewPassword = this.accessSettings.password;
    }
    if (this.accessSettings.editAccess === 'password') {
      this.accessSettings.editPassword = this.accessSettings.password;
    }
    // checkAccess по умолчанию 'link', но если нужно можно добавить логику
  }
};

module.exports = mongoose.model('Checklist', ChecklistSchema);