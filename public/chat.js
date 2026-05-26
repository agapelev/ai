/**
 * LLM Chat App Frontend
 */

// DOM elements
const chatMessages = document.getElementById("chat-messages");
const userInput = document.getElementById("user-input");
const sendButton = document.getElementById("send-button");
const typingIndicator = document.getElementById("typing-indicator");
const modelSelect = document.getElementById("model-select");
const modelStatus = document.getElementById("model-status");
const scrollToTopBtn = document.getElementById("scrollToTop");
const scrollToBottomBtn = document.getElementById("scrollToBottom");
const fileUploadBtn = document.getElementById("file-upload-btn");
const imageUploadBtn = document.getElementById("image-upload-btn");
const fileInput = document.getElementById("file-input");
const imageInput = document.getElementById("image-input");
const uploadedFilesPreview = document.getElementById("uploaded-files-container");
const clearHistoryBtn = document.getElementById("clear-history");
const progressContainer = document.getElementById("progress-container");
const progressFill = document.getElementById("progress-fill");
const progressTime = document.getElementById("progress-time");
const progressStatus = document.getElementById("progress-status");
const inputPanelToggle = document.getElementById("input-panel-toggle");

// Chat state
let chatHistory = [
  {
    role: "assistant",
    content: "Привет! 👋 Я твой AI-ассистент. Чем могу помочь?",
  },
];
let isProcessing = false;
let uploadedFiles = [];
let lastRequest = null; // Для повтора последнего запроса
let debounceTimer = null; // Для debouncing ввода
let progressTimer = null; // Для обновления прогресс-бара
let requestStartTime = 0; // Время начала запроса
let isInputPanelExpanded = false; // Состояние мобильной панели

// Auto-resize textarea
userInput.addEventListener("input", function () {
  this.style.height = "auto";
  this.style.height = this.scrollHeight + "px";
});

// Send message on Enter
userInput.addEventListener("keydown", function (e) {
  if (e.key === "Enter" && !e.shiftKey) {
    e.preventDefault();
    sendMessage();
  }
});

// Send button click handler
sendButton.addEventListener("click", function(e) {
  e.preventDefault();
  sendMessage();
});

// File upload buttons
if (fileUploadBtn && fileInput) {
  fileUploadBtn.addEventListener("click", () => {
    fileInput.click();
  });
  
  fileInput.addEventListener("change", (e) => {
    handleFileUpload(e.target.files);
  });
}

if (imageUploadBtn && imageInput) {
  imageUploadBtn.addEventListener("click", () => {
    imageInput.click();
  });
  
  imageInput.addEventListener("change", (e) => {
    handleFileUpload(e.target.files);
  });
}

// Scroll to Top button
if (scrollToTopBtn && chatMessages) {
  scrollToTopBtn.addEventListener("click", function() {
    chatMessages.scrollTo({
      top: 0,
      behavior: "smooth"
    });
  });
}

// Scroll to Bottom button
if (scrollToBottomBtn) {
  scrollToBottomBtn.addEventListener("click", function() {
    if (chatMessages) {
      chatMessages.scrollTo({
        top: chatMessages.scrollHeight,
        behavior: "smooth"
      });
    }
    
    // Also focus on input field for convenience
    if (userInput) {
      setTimeout(() => {
        userInput.focus();
      }, 500);
    }
  });
}

// Show/hide scroll buttons based on chat messages scroll position
function updateScrollButtons() {
  if (!chatMessages) return;

  const isAtTop = chatMessages.scrollTop <= 10;
  const isAtBottom = chatMessages.scrollHeight - chatMessages.scrollTop <= chatMessages.clientHeight + 10;

  if (scrollToTopBtn) {
    if (!isAtTop) {
      scrollToTopBtn.classList.add("show");
    } else {
      scrollToTopBtn.classList.remove("show");
    }
  }

  if (scrollToBottomBtn) {
    if (!isAtBottom && chatMessages.scrollHeight > chatMessages.clientHeight) {
      scrollToBottomBtn.classList.add("show");
    } else {
      scrollToBottomBtn.classList.remove("show");
    }
  }
}

// Add scroll listeners only to chat messages container
if (chatMessages) {
  chatMessages.addEventListener("scroll", updateScrollButtons);
}

// Handle file upload
function handleFileUpload(files) {
  if (!files || files.length === 0) return;
  
  for (let i = 0; i < files.length; i++) {
    const file = files[i];
    const fileId = Date.now() + i;
    
    const fileData = {
      id: fileId,
      file: file,
      name: file.name,
      size: file.size,
      type: file.type
    };
    
    uploadedFiles.push(fileData);
    addFileToPreview(fileData);
  }
  
  // Clear input
  if (fileInput) fileInput.value = '';
  if (imageInput) imageInput.value = '';
}

// Add file to preview
function addFileToPreview(fileData) {
  if (!uploadedFilesPreview) return;
  
  const fileItem = document.createElement("div");
  fileItem.className = "uploaded-file-item";
  fileItem.dataset.fileId = fileData.id;
  
  // File icon or preview
  if (fileData.type.startsWith('image/')) {
    const img = document.createElement("img");
    img.src = URL.createObjectURL(fileData.file);
    img.alt = fileData.name;
    fileItem.appendChild(img);
  } else {
    const icon = document.createElement("span");
    icon.textContent = "📄";
    fileItem.appendChild(icon);
  }
  
  // File info
  const fileInfo = document.createElement("span");
  fileInfo.textContent = fileData.name;
  fileItem.appendChild(fileInfo);
  
  // Remove button
  const removeBtn = document.createElement("button");
  removeBtn.className = "remove-file-btn";
  removeBtn.innerHTML = "×";
  removeBtn.addEventListener("click", () => {
    removeFile(fileData.id);
    fileItem.remove();
  });
  fileItem.appendChild(removeBtn);
  
  uploadedFilesPreview.appendChild(fileItem);
}

// Remove file
function removeFile(fileId) {
  uploadedFiles = uploadedFiles.filter(file => file.id !== fileId);
}

// Load models with caching
async function loadModels() {
  try {
    // Проверяем кэш
    const cachedModels = localStorage.getItem("cachedModels");
    const cacheTimestamp = localStorage.getItem("modelsCacheTime");
    const now = Date.now();
    const CACHE_DURATION = 24 * 60 * 60 * 1000; // 24 часа
    
    // Если кэш валидный, используем его
    if (cachedModels && cacheTimestamp && (now - parseInt(cacheTimestamp)) < CACHE_DURATION) {
      const data = JSON.parse(cachedModels);
      populateModelSelect(data);
      updateModelStatus(true);
      return;
    }
    
    // Иначе загружаем с сервера
    const resp = await fetch("/api/models?available=1");
    if (!resp.ok) {
      console.error("Failed to load models");
      setupFallbackModels();
      return;
    }
    
    const data = await resp.json();
    console.log("Models data:", data);
    
    // Сохраняем в кэш
    localStorage.setItem("cachedModels", JSON.stringify(data));
    localStorage.setItem("modelsCacheTime", now.toString());
    
    populateModelSelect(data);
    updateModelStatus(true);
    
  } catch (error) {
    console.error("Error loading models:", error);
    setupFallbackModels();
  }
}

// Заполнение select моделями
function populateModelSelect(data) {
  const { models = [], default: defaultKey, available = [] } = data;
  
  if (!modelSelect) return;
  
  // Clear and populate select
  modelSelect.innerHTML = "";
  models.forEach((m) => {
    const opt = document.createElement("option");
    opt.value = m.key;
    opt.textContent = m.key;
    modelSelect.appendChild(opt);
  });

  // Set default value
  if (defaultKey) {
    modelSelect.value = defaultKey;
  } else {
    modelSelect.value = "llama-3.3-70b";
    updateModelStatus(true);
  }
}

function setupFallbackModels() {
  if (modelSelect) {
    modelSelect.innerHTML = "";
    const opt1 = document.createElement("option");
    opt1.value = "llama-3.3-70b";
    opt1.textContent = "Llama 3.3 70B";
    modelSelect.appendChild(opt1);
    
    const opt2 = document.createElement("option");
    opt2.value = "gpt-oss-120b";
    opt2.textContent = "GPT OSS 120B";
    modelSelect.appendChild(opt2);
    
    modelSelect.value = "llama-3.3-70b";
    updateModelStatus(true);
  }
}

function updateModelStatus(isAvailable) {
  if (!modelStatus) return;
  
  if (isAvailable) {
    modelStatus.className = "model-status available";
    modelStatus.title = "Модель доступна";
  } else {
    modelStatus.className = "model-status unavailable";
    modelStatus.title = "Модель недоступна";
  }
}

// Local chat history helpers
function saveChatHistory() {
  try {
    // Ограничиваем историю последними 100 сообщениями для экономии места
    const historyToSave = chatHistory.slice(-100);
    localStorage.setItem("chatHistory", JSON.stringify(historyToSave));
  } catch (e) {
    console.error("Failed to save chat history", e);
    
    // Если переполнен localStorage, пробуем очистить старую историю
    if (e.name === 'QuotaExceededError') {
      try {
        // Сохраняем только последние 20 сообщений
        const emergencyHistory = chatHistory.slice(-20);
        localStorage.setItem("chatHistory", JSON.stringify(emergencyHistory));
        
        // Показываем предупреждение
        const notification = document.createElement("div");
        notification.style.cssText = `
          position: fixed;
          top: 20px;
          left: 50%;
          transform: translateX(-50%);
          background: var(--warning);
          color: white;
          padding: 10px 15px;
          border-radius: 6px;
          box-shadow: var(--shadow);
          z-index: 1000;
          max-width: 300px;
          text-align: center;
        `;
        notification.innerHTML = "⚠️ История чата сокращена из-за нехватки места";
        document.body.appendChild(notification);
        
        setTimeout(() => {
          if (notification.parentNode) {
            notification.parentNode.removeChild(notification);
          }
        }, 5000);
      } catch (e2) {
        console.error("Failed emergency save:", e2);
      }
    }
  }
}

function loadChatHistoryFromStorage() {
  try {
    const stored = localStorage.getItem("chatHistory");
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed)) {
        chatHistory = parsed;
      }
    }
  } catch (e) {
    console.error("Failed to load chat history", e);
  }
}

function resetChatHistory() {
  chatHistory = [
    {
      role: "assistant",
      content: "Привет! 👋 Я твой AI-ассистент. Чем могу помочь?",
    },
  ];
  saveChatHistory();
  renderChatHistory();
}

// Очистка истории с подтверждением
function clearChatHistory() {
  if (!confirm("Вы уверены, что хотите очистить всю историю чата? Это действие нельзя отменить.")) {
    return;
  }
  
  try {
    localStorage.removeItem("chatHistory");
    resetChatHistory();
    
    // Показываем уведомление об успешной очистке
    const notification = document.createElement("div");
    notification.className = "clear-history-notification";
    notification.textContent = "🗑️ История чата очищена";
    notification.style.cssText = `
      position: fixed;
      top: 20px;
      right: 20px;
      background: var(--success);
      color: white;
      padding: 10px 15px;
      border-radius: 6px;
      box-shadow: var(--shadow);
      z-index: 1000;
      animation: slideIn 0.3s ease;
    `;
    
    document.body.appendChild(notification);
    
    // Удаляем уведомление через 3 секунды
    setTimeout(() => {
      if (notification.parentNode) {
        notification.parentNode.removeChild(notification);
      }
    }, 3000);
    
  } catch (error) {
    console.error("Failed to clear chat history:", error);
    alert("Не удалось очистить историю чата. Попробуйте ещё раз.");
  }
}

// Initialize on load
document.addEventListener('DOMContentLoaded', () => {
  loadModels();
  loadChatHistoryFromStorage();
  renderChatHistory();
  // Initial check for scroll buttons
  setTimeout(updateScrollButtons, 100);

  // Add change listener for model select
  if (modelSelect) {
    modelSelect.addEventListener("change", () => {
      localStorage.setItem("model", modelSelect.value);
    });
  }
  
  // Add click listener for clear history button
  if (clearHistoryBtn) {
    clearHistoryBtn.addEventListener("click", clearChatHistory);
  }
  
  // Setup mobile panel
  setupMobilePanel();
  
  // Setup models dropdown
  setupModelsDropdown();
});

// Render chat history with virtual scrolling optimization
function renderChatHistory() {
  if (!chatMessages) return;
  
  // Для больших чатов используем virtual scrolling
  const isLargeChat = chatHistory.length > 50;
  
  chatMessages.innerHTML = "";
  
  // Рендерим только последние 30 сообщений для больших чатов
  const messagesToRender = isLargeChat ? chatHistory.slice(-30) : chatHistory;
  
  messagesToRender.forEach((msg) => {
    addMessageToChat(msg.role, msg.content);
  });
  
  // Если чат большой, добавляем кнопку "Загрузить раньше"
  if (isLargeChat) {
    const loadMoreBtn = document.createElement("button");
    loadMoreBtn.className = "load-more-btn";
    loadMoreBtn.textContent = "📜 Загрузить предыдущие сообщения";
    loadMoreBtn.onclick = () => loadEarlierMessages();
    chatMessages.insertBefore(loadMoreBtn, chatMessages.firstChild);
  }
  
  chatMessages.scrollTop = chatMessages.scrollHeight;
  updateScrollButtons();
}

// Загрузка более ранних сообщений
function loadEarlierMessages() {
  const loadMoreBtn = chatMessages.querySelector('.load-more-btn');
  if (!loadMoreBtn) return;
  
  // Находим текущее количество сообщений
  const currentMessages = chatMessages.querySelectorAll('.message').length;
  const startIndex = Math.max(0, chatHistory.length - currentMessages - 20);
  const endIndex = chatHistory.length - currentMessages;
  
  // Вставляем более ранние сообщения
  const fragment = document.createDocumentFragment();
  
  for (let i = startIndex; i < endIndex; i++) {
    const msg = chatHistory[i];
    const messageEl = document.createElement("div");
    messageEl.className = `message ${msg.role}-message`;
    
    // Добавляем специальные классы для ошибок и fallback
    if (msg.content.includes("❌ Ошибка:")) {
      messageEl.classList.add("error");
    }
    if (msg.content.includes("⚠️ Использована резервная модель")) {
      messageEl.classList.add("fallback-warning");
    }
    if (msg.content.includes("⏱️ Слишком много запросов")) {
      messageEl.classList.add("rate-limit");
    }
    
    const contentContainer = document.createElement("div");
    contentContainer.className = "message-content";
    contentContainer.innerHTML = renderMarkdown(msg.content);
    
    messageEl.appendChild(contentContainer);
    fragment.appendChild(messageEl);
  }
  
  // Вставляем перед кнопкой "Загрузить ещё"
  chatMessages.insertBefore(fragment, loadMoreBtn);
  
  // Если загрузили все сообщения, удаляем кнопку
  if (startIndex === 0) {
    loadMoreBtn.remove();
  }
  
  updateScrollButtons();
}

// Выпадающее меню для моделей
function setupModelsDropdown() {
  const modelsContainer = document.querySelector('.models-dropdown-container');
  const modelsLink = document.querySelector('.models-link');
  const modelsDropdown = document.getElementById('models-dropdown');
  
  if (!modelsContainer || !modelsLink || !modelsDropdown) return;
  
  // Добавляем тени через JavaScript для гарантии
  modelsLink.style.boxShadow = '4px 4px 8px rgba(0, 0, 0, 0.3), -2px -2px 4px rgba(255, 255, 255, 0.1)';
  modelsLink.style.display = 'inline-block';
  modelsLink.style.position = 'relative';
  modelsLink.style.zIndex = '10';
  
  modelsDropdown.style.boxShadow = '8px 8px 16px rgba(0, 0, 0, 0.4), -4px -4px 8px rgba(255, 255, 255, 0.1)';
  
  // Добавляем стили для dropdown items
  const dropdownItems = modelsDropdown.querySelectorAll('.dropdown-item');
  dropdownItems.forEach(item => {
    item.style.color = 'var(--text-primary)';
    item.style.transition = 'all 0.2s ease';
    
    item.addEventListener('mouseenter', () => {
      item.style.color = 'var(--warning)';
      item.style.backgroundColor = 'rgba(251, 191, 36, 0.1)';
    });
    
    item.addEventListener('mouseleave', () => {
      item.style.color = 'var(--text-primary)';
      item.style.backgroundColor = 'transparent';
    });
  });
  
  // Hover эффекты через JavaScript
  modelsLink.addEventListener('mouseenter', () => {
    modelsLink.style.boxShadow = '6px 6px 12px rgba(0, 0, 0, 0.4), -3px -3px 6px rgba(255, 255, 255, 0.15)';
    modelsLink.style.transform = 'translateY(-1px)';
  });
  
  modelsLink.addEventListener('mouseleave', () => {
    modelsLink.style.boxShadow = '4px 4px 8px rgba(0, 0, 0, 0.3), -2px -2px 4px rgba(255, 255, 255, 0.1)';
    modelsLink.style.transform = 'translateY(0)';
  });
  
  // Клик по ссылке - показываем/скрываем меню
  modelsLink.addEventListener('click', (e) => {
    e.preventDefault();
    e.stopPropagation();
    
    const isVisible = modelsDropdown.classList.contains('show');
    
    // Закрываем все другие dropdowns
    document.querySelectorAll('.models-dropdown.show').forEach(dropdown => {
      dropdown.classList.remove('show');
    });
    
    if (!isVisible) {
      modelsDropdown.classList.add('show');
    }
  });
  
  // Клик вне меню - закрываем
  document.addEventListener('click', (e) => {
    if (!modelsContainer.contains(e.target)) {
      modelsDropdown.classList.remove('show');
    }
  });
  
  // Мобильная адаптация
  if (window.innerWidth <= 768) {
    modelsDropdown.style.right = 'auto';
    modelsDropdown.style.left = '0';
  }
}

// Мобильная панель ввода
function toggleInputPanel() {
  const inputPanel = document.querySelector('.message-input-panel');
  if (!inputPanel) return;
  
  isInputPanelExpanded = !isInputPanelExpanded;
  
  if (isInputPanelExpanded) {
    inputPanel.classList.add('expanded');
    if (inputPanelToggle) {
      inputPanelToggle.textContent = '✖️';
      inputPanelToggle.title = 'Закрыть панель ввода';
    }
  } else {
    inputPanel.classList.remove('expanded');
    if (inputPanelToggle) {
      inputPanelToggle.textContent = '⌨️';
      inputPanelToggle.title = 'Открыть панель ввода';
    }
  }
}

// Показываем кнопку только на мобильных
function setupMobilePanel() {
  if (!inputPanelToggle) return;
  
  const isMobile = window.innerWidth <= 768;
  
  if (isMobile) {
    inputPanelToggle.style.display = 'block';
    // Обработчик клика
    inputPanelToggle.addEventListener('click', toggleInputPanel);
    
    // Автоматически скрываем панель при скролле
    let scrollTimeout;
    chatMessages?.addEventListener('scroll', () => {
      clearTimeout(scrollTimeout);
      scrollTimeout = setTimeout(() => {
        if (isInputPanelExpanded) {
          toggleInputPanel();
        }
      }, 2000);
    });
  } else {
    inputPanelToggle.style.display = 'none';
  }
}

// Функции для управления прогресс-баром
function showProgressBar() {
  if (progressContainer) {
    progressContainer.style.display = 'block';
    requestStartTime = Date.now();
    updateProgress();
  }
}

function hideProgressBar() {
  if (progressContainer) {
    progressContainer.style.display = 'none';
    if (progressTimer) {
      clearInterval(progressTimer);
      progressTimer = null;
    }
  }
}

function updateProgress() {
  if (!progressFill || !progressTime || !progressStatus) return;
  
  const elapsed = (Date.now() - requestStartTime) / 1000;
  progressTime.textContent = elapsed.toFixed(1);
  
  // Симулируем прогресс на основе времени
  let progress = Math.min((elapsed / 30) * 100, 95); // 95% за 30 секунд
  
  progressFill.style.width = progress + '%';
  
  // Обновляем статус
  if (elapsed < 5) {
    progressStatus.textContent = 'Отправка запроса...';
  } else if (elapsed < 15) {
    progressStatus.textContent = 'Обработка...';
  } else if (elapsed < 25) {
    progressStatus.textContent = 'Генерация ответа...';
  } else {
    progressStatus.textContent = 'Почти готово...';
  }
}

async function sendMessage() {
  if (!userInput || !sendButton || !chatMessages) return;
  
  const message = userInput.value.trim();
  if (message === "" && uploadedFiles.length === 0 || isProcessing) return;

  // Debouncing: отменяем предыдущий таймер
  if (debounceTimer) {
    clearTimeout(debounceTimer);
  }
  
  // Устанавливаем новый таймер для debouncing
  debounceTimer = setTimeout(async () => {

  // Handle local commands without sending to backend
  if (message.toLowerCase() === "/start" || message.toLowerCase() === "@start") {
    addMessageToChat("user", message);
    chatHistory.push({ role: "user", content: message });
    resetChatHistory();
    userInput.value = "";
    userInput.style.height = "auto";
    clearUploadedFiles();
    updateScrollButtons();
    return;
  }

  isProcessing = true;
  userInput.disabled = true;
  sendButton.disabled = true;
  if (typingIndicator) {
    typingIndicator.classList.add("visible");
  }

  // Показываем прогресс-бар для долгих запросов
  showProgressBar();
  progressTimer = setInterval(updateProgress, 100);

  // Add user message (with files if any)
  let messageContent = message;
  if (uploadedFiles.length > 0) {
    messageContent += "\n\n" + getFilesDescription();
  }
  
  addMessageToChat("user", messageContent);
  chatHistory.push({ role: "user", content: messageContent });
  saveChatHistory();

  // Clear input and files
  userInput.value = "";
  userInput.style.height = "auto";
  clearUploadedFiles();

  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        messages: chatHistory,
        model: modelSelect ? modelSelect.value : "llama-3.3-70b",
      }),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error || await response.text();
      throw new Error(`HTTP ${response.status}: ${errorMessage}`);
    }

    const data = await response.json();
    const assistantResponse = data.response || "Извините, не удалось получить ответ.";

    // Проверяем, был ли использован fallback
    if (data.fallback) {
      const fallbackMsg = `⚠️ Использована резервная модель "${data.model}" вместо "${data.originalModel}". Причина: ${data.error}\n\n${assistantResponse}`;
      addAssistantMessageWithTyping(fallbackMsg);
      chatHistory.push({ role: "assistant", content: fallbackMsg });
    } else {
      addAssistantMessageWithTyping(assistantResponse);
      chatHistory.push({ role: "assistant", content: assistantResponse });
    }
    saveChatHistory();

  } catch (error) {
    console.error("Error:", error);
    const errorMessage = error.message;
    const isRetryable = error.retryable !== false; // По умолчанию можно повторить
    
    let errorContent = `❌ Ошибка: ${errorMessage}`;
    
    // Особая обработка для rate limiting
    if (error.rateLimit) {
      const waitTime = error.retryAfter || 60;
      errorContent = `⏱️ Слишком много запросов. Попробуйте через ${waitTime} секунд.`;
      
      // Автоматически показываем кнопку повтора через waitTime секунд
      if (waitTime > 0) {
        setTimeout(() => {
          const retryMsg = `⏱️ Можно повторить запрос. 🔄 [Повторить](javascript:retryLastRequest())`;
          // Обновляем последнее сообщение
          const lastMsg = chatHistory[chatHistory.length - 1];
          if (lastMsg && lastMsg.role === "assistant" && lastMsg.content.includes("Слишком много запросов")) {
            lastMsg.content = retryMsg;
            renderChatHistory();
          }
        }, waitTime * 1000);
      }
    } else if (error.validation) {
      // Ошибки валидации не повторяются
      errorContent = `⚠️ ${errorMessage}`;
    } else if (isRetryable) {
      errorContent += `\n\n🔄 [Повторить запрос](javascript:retryLastRequest())`;
    }
    
    // Сохраняем последний запрос для возможного повтора
    if (isRetryable) {
      lastRequest = {
        messages: [...chatHistory],
        model: modelSelect ? modelSelect.value : "llama-3.3-70b"
      };
    }
    
    addMessageToChat("assistant", errorContent);
  } finally {
    if (typingIndicator) {
      typingIndicator.classList.remove("visible");
    }
    isProcessing = false;
    userInput.disabled = false;
    sendButton.disabled = false;
    userInput.focus();
    updateScrollButtons();
    
    // Автоматически показываем кнопку "вниз" после нового сообщения
    if (scrollToBottomBtn && chatMessages) {
      setTimeout(() => {
        const isAtBottom = chatMessages.scrollHeight - chatMessages.scrollTop <= chatMessages.clientHeight + 100;
        if (!isAtBottom) {
          scrollToBottomBtn.classList.add("show");
        }
      }, 100);
    }
    hideProgressBar(); // Скрываем прогресс-бар
  }
  }, 300); // Debouncing: 300ms
}

// Повтор последнего запроса
async function retryLastRequest() {
  if (!lastRequest || isProcessing) return;
  
  // Удаляем последнее сообщение об ошибке
  const lastMessage = chatHistory[chatHistory.length - 1];
  if (lastMessage && lastMessage.role === "assistant" && lastMessage.content.includes("❌ Ошибка:")) {
    chatHistory.pop();
    renderChatHistory();
  }
  
  // Повторяем запрос с теми же параметрами
  isProcessing = true;
  userInput.disabled = true;
  sendButton.disabled = true;
  if (typingIndicator) {
    typingIndicator.classList.add("visible");
  }
  
  // Показываем прогресс-бар для повтора
  showProgressBar();
  progressTimer = setInterval(updateProgress, 100);
  
  try {
    const response = await fetch("/api/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(lastRequest),
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      const errorMessage = errorData.error || await response.text();
      throw new Error(`HTTP ${response.status}: ${errorMessage}`);
    }

    const data = await response.json();
    const assistantResponse = data.response || "Извините, не удалось получить ответ.";

    if (data.fallback) {
      const fallbackMsg = `⚠️ Использована резервная модель "${data.model}" вместо "${data.originalModel}". Причина: ${data.error}\n\n${assistantResponse}`;
      addAssistantMessageWithTyping(fallbackMsg);
      chatHistory.push({ role: "assistant", content: fallbackMsg });
    } else {
      addAssistantMessageWithTyping(assistantResponse);
      chatHistory.push({ role: "assistant", content: assistantResponse });
    }
    saveChatHistory();

  } catch (error) {
    console.error("Error in retry:", error);
    const errorMessage = error.message;
    const errorContent = `❌ Повторная попытка не удалась: ${errorMessage}\n\n🔄 [Повторить ещё раз](javascript:retryLastRequest())`;
    addMessageToChat("assistant", errorContent);
  } finally {
    if (typingIndicator) {
      typingIndicator.classList.remove("visible");
    }
    hideProgressBar(); // Скрываем прогресс-бар
    isProcessing = false;
    userInput.disabled = false;
    sendButton.disabled = false;
    userInput.focus();
    updateScrollButtons();
  }
}

// Get description of uploaded files
function getFilesDescription() {
  if (uploadedFiles.length === 0) return "";
  
  let description = "Загруженные файлы:\n";
  uploadedFiles.forEach(file => {
    description += `- ${file.name} (${formatFileSize(file.size)})\n`;
  });
  
  return description;
}

// Format file size
function formatFileSize(bytes) {
  if (bytes === 0) return '0 Bytes';
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
}

// Clear uploaded files
function clearUploadedFiles() {
  uploadedFiles = [];
  if (uploadedFilesPreview) {
    uploadedFilesPreview.innerHTML = "";
  }
}

function addMessageToChat(role, content) {
  if (!chatMessages) return;
  
  const messageEl = document.createElement("div");
  messageEl.className = `message ${role}-message`;
  
  // Добавляем специальные классы для ошибок и fallback
  if (content.includes("❌ Ошибка:")) {
    messageEl.classList.add("error");
  }
  if (content.includes("⚠️ Использована резервная модель")) {
    messageEl.classList.add("fallback-warning");
  }
  if (content.includes("⏱️ Слишком много запросов")) {
    messageEl.classList.add("rate-limit");
  }
  
  messageEl.dataset.role = role;
  messageEl.dataset.content = content;
  
  const contentContainer = document.createElement("div");
  contentContainer.className = "message-content";

  if (role === "assistant") {
    const parts = splitReasoning(content);
    if (parts.reasoning && parts.reasoning.trim().length > 80) {
      const reasoningDetails = document.createElement("details");
      reasoningDetails.className = "reasoning-block";

      const summary = document.createElement("summary");
      summary.textContent = "Размышление модели";
      reasoningDetails.appendChild(summary);

      const reasoningContent = document.createElement("div");
      reasoningContent.className = "reasoning-content";
      reasoningContent.innerHTML = renderMarkdown(parts.reasoning);
      reasoningDetails.appendChild(reasoningContent);

      messageEl.appendChild(reasoningDetails);
      contentContainer.innerHTML = renderMarkdown(parts.answer || "");
    } else {
      contentContainer.innerHTML = renderMarkdown(content);
    }
  } else {
    contentContainer.innerHTML = renderMarkdown(content);
  }

  messageEl.appendChild(contentContainer);
  
  // Add file previews if this is a user message with files
  if (role === "user" && uploadedFiles.length > 0) {
    uploadedFiles.forEach(file => {
      addFilePreviewToMessage(messageEl, file);
    });
  }
  
  // Add message controls
  const controlsContainer = document.createElement("div");
  controlsContainer.className = "message-controls";
  
  // Copy button
  const copyBtn = document.createElement("button");
  copyBtn.className = "copy-btn";
  copyBtn.title = "Копировать сообщение";
  copyBtn.innerHTML = "📋";
  copyBtn.addEventListener("click", () => {
    copyMessageContent(content, copyBtn);
  });
  controlsContainer.appendChild(copyBtn);
  
  // Export button for assistant messages
  if (role === "assistant") {
    const exportBtn = document.createElement("button");
    exportBtn.className = "export-btn";
    exportBtn.title = "Экспортировать в Markdown";
    exportBtn.innerHTML = "📄";
    exportBtn.addEventListener("click", () => {
      exportToMarkdown(content, exportBtn);
    });
    controlsContainer.appendChild(exportBtn);
  }
  
  messageEl.appendChild(controlsContainer);
  
  chatMessages.appendChild(messageEl);
  chatMessages.scrollTop = chatMessages.scrollHeight;
  updateScrollButtons();
}

// Special helper for typing effect for assistant messages
function addAssistantMessageWithTyping(content) {
  if (!chatMessages) return;

  const messageEl = document.createElement("div");
  messageEl.className = "message assistant-message";
  messageEl.dataset.role = "assistant";
  messageEl.dataset.content = content;

  const contentContainer = document.createElement("div");
  contentContainer.className = "message-content";
  
  const parts = splitReasoning(content);
  if (parts.reasoning && parts.reasoning.trim().length > 80) {
    const reasoningDetails = document.createElement("details");
    reasoningDetails.className = "reasoning-block";

    const summary = document.createElement("summary");
    summary.textContent = "Размышление модели";
    reasoningDetails.appendChild(summary);

    const reasoningContent = document.createElement("div");
    reasoningContent.className = "reasoning-content";
    reasoningContent.innerHTML = renderMarkdown(parts.reasoning);
    reasoningDetails.appendChild(reasoningContent);

    messageEl.appendChild(reasoningDetails);
  }

  messageEl.appendChild(contentContainer);

  const controlsContainer = document.createElement("div");
  controlsContainer.className = "message-controls";

  const copyBtn = document.createElement("button");
  copyBtn.className = "copy-btn";
  copyBtn.title = "Копировать сообщение";
  copyBtn.innerHTML = "📋";
  copyBtn.addEventListener("click", () => {
    copyMessageContent(content, copyBtn);
  });
  controlsContainer.appendChild(copyBtn);

  const exportBtn = document.createElement("button");
  exportBtn.className = "export-btn";
  exportBtn.title = "Экспортировать в Markdown";
  exportBtn.innerHTML = "📄";
  exportBtn.addEventListener("click", () => {
    exportToMarkdown(content, exportBtn);
  });
  controlsContainer.appendChild(exportBtn);

  messageEl.appendChild(controlsContainer);
  chatMessages.appendChild(messageEl);

  let index = 0;
  const plainText = (parts.answer || content || "");

  const interval = setInterval(() => {
    index += 2;
    const current = plainText.slice(0, index);
    // Показываем то, о чём "думает" ассистент, в виде бегущей строки
    contentContainer.textContent = current;
    chatMessages.scrollTop = chatMessages.scrollHeight;
    updateScrollButtons();

    if (index >= plainText.length) {
      clearInterval(interval);
      // После окончания печати — полноценный Markdown-рендер основной части ответа
      contentContainer.innerHTML = renderMarkdown(plainText);
      chatMessages.scrollTop = chatMessages.scrollHeight;
      updateScrollButtons();
    }
  }, 2);
}

// Add file preview to message
function addFilePreviewToMessage(messageEl, fileData) {
  const filePreview = document.createElement("div");
  filePreview.className = "file-preview";
  
  if (fileData.type.startsWith('image/')) {
    const img = document.createElement("img");
    img.src = URL.createObjectURL(fileData.file);
    img.alt = fileData.name;
    filePreview.appendChild(img);
  }
  
  const fileInfo = document.createElement("div");
  fileInfo.className = "file-info";
  
  const fileName = document.createElement("div");
  fileName.className = "file-name";
  fileName.textContent = fileData.name;
  fileInfo.appendChild(fileName);
  
  const fileSize = document.createElement("div");
  fileSize.className = "file-size";
  fileSize.textContent = formatFileSize(fileData.size);
  fileInfo.appendChild(fileSize);
  
  filePreview.appendChild(fileInfo);
  messageEl.appendChild(filePreview);
}

// Copy message content
async function copyMessageContent(content, button) {
  try {
    await navigator.clipboard.writeText(content);
    const originalText = button.innerHTML;
    button.innerHTML = "✅";
    button.style.backgroundColor = "#4ade80";
    setTimeout(() => {
      button.innerHTML = originalText;
      button.style.backgroundColor = "";
    }, 2000);
  } catch (err) {
    console.error("Failed to copy:", err);
    const originalText = button.innerHTML;
    button.innerHTML = "❌";
    button.style.backgroundColor = "#f87171";
    setTimeout(() => {
      button.innerHTML = originalText;
      button.style.backgroundColor = "";
    }, 2000);
  }
}

// Export to Markdown
function exportToMarkdown(content, button) {
  try {
    const timestamp = new Date().toISOString().slice(0, 19).replace(/:/g, "-");
    const fileName = `ai-response-${timestamp}.md`;
    
    const blob = new Blob([content], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    
    const link = document.createElement("a");
    link.href = url;
    link.download = fileName;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    URL.revokeObjectURL(url);
    
    const originalText = button.innerHTML;
    button.innerHTML = "📥";
    button.style.backgroundColor = "#4ade80";
    setTimeout(() => {
      button.innerHTML = originalText;
      button.style.backgroundColor = "";
    }, 2000);
  } catch (err) {
    console.error("Failed to export:", err);
    const originalText = button.innerHTML;
    button.innerHTML = "❌";
    button.style.backgroundColor = "#f87171";
    setTimeout(() => {
      button.innerHTML = originalText;
      button.style.backgroundColor = "";
    }, 2000);
  }
}

function renderMarkdown(text) {
  if (!text) return "";
  // Безопасное экранирование
  const escapeHtml = (str) => {
    return str
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  };

  let html = escapeHtml(text);

  // Кодовые блоки ```
  html = html.replace(/```([\s\s]*?)```/g, (m, code) => {
    return `<pre><code>${code}</code></pre>`;
  });

  // Инлайн-код `code`
  html = html.replace(/`([^`]+)`/g, "<code>$1</code>");

  // Заголовки с лёгким визуальным акцентом
  html = html.replace(/^###### (.*)$/gm, "<h6>$1</h6>");
  html = html.replace(/^##### (.*)$/gm, "<h5>$1</h5>");
  html = html.replace(/^#### (.*)$/gm, "<h4>✨ $1</h4>");
  html = html.replace(/^### (.*)$/gm, "<h3>✨ $1</h3>");
  html = html.replace(/^## (.*)$/gm, "<h2>💫 $1</h2>");
  html = html.replace(/^# (.*)$/gm, "<h1>🌟 $1</h1>");

  // Жирный / курсив
  html = html.replace(/\*\*\*(.*?)\*\*\*/g, "<strong><em>$1</em></strong>");
  html = html.replace(/\*\*(.*?)\*\*/g, "<strong>$1</strong>");
  html = html.replace(/\*(.*?)\*/g, "<em>$1</em>");

  // Ссылки [text](url)
  html = html.replace(/\[([^\]]+)\]\(([^)]+)\)/g, (match, text, url) => {
    // Особая обработка для javascript: ссылок (кнопки повтора)
    if (url.startsWith('javascript:')) {
      return `<a href="${url}" class="retry-button">${text}</a>`;
    }
    // Lazy loading для изображений
    if (url.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
      return `<img src="${url}" alt="${text}" loading="lazy" style="max-width: 100%; height: auto; border-radius: 8px; margin: 8px 0;">`;
    }
    return `<a href="${url}" target="_blank" rel="noopener">${text}</a>`;
  });

  // Цитаты
  html = html.replace(/^> (.*)$/gm, "<blockquote>$1</blockquote>");

  // Горизонтальная линия
  html = html.replace(/^---$/gm, "<hr>");

  // Списки с маркерами
  html = html.replace(/^\s*\d+\. (.*)$/gm, "<ol><li>$1</li></ol>");
  html = html.replace(/^\s*[-•] (.*)$/gm, "<ul><li>• $1</li></ul>");

  // Переносы строк
  html = html.replace(/\n/g, "<br>");
  // Сжимаем слишком большие вертикальные разрывы: более двух <br> подряд
  html = html.replace(/(<br>\s*){3,}/g, "<br><br>");

  return html;
}

// Разделение ответа ассистента на размышление модели (reasoning) и основную часть
function splitReasoning(text) {
  if (!text) return { reasoning: "", answer: "" };

  // 1) Если есть размышление в теге </tool_call>, всё до него считаем reasoning
  const thinkCloseIndex = text.indexOf("</tool_call>");
  if (thinkCloseIndex !== -1) {
    const splitPos = thinkCloseIndex + "</tool_call>".length;
    const reasoning = text.slice(0, splitPos);
    const answer = text.slice(splitPos).trimStart();
    return { reasoning, answer };
  }

  // 2) Иначе ищем первую строку-заголовок (🌟 ..., # ..., ## ... и т.п.), после которой обычно идёт основная проповедь
  const headingMatch = text.match(/\n(🌟 [^\n]+|#{1,6} [^\n]+)/);
  if (!headingMatch || typeof headingMatch.index !== "number") {
    return { reasoning: "", answer: text };
  }

  const splitPos = headingMatch.index + 1; // позиция перевода строки перед заголовком
  const reasoning = text.slice(0, splitPos);
  const answer = text.slice(splitPos).trimStart();

  return { reasoning, answer };
}
