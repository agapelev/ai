import React, { useState, useEffect, useCallback } from 'react';
import { createRoot } from 'react-dom/client';
import { MantineProvider } from '@mantine/core';
import '@mantine/core/styles.css';
import { shekinahTheme } from './mantine-theme';
import { ChatInterface } from './components/ChatInterface';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

const App = () => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [models, setModels] = useState<string[]>([]);
  const [selectedModel, setSelectedModel] = useState('Llama-3.3-70b');

  // Load models from API with local cache
  useEffect(() => {
    const fetchModels = async () => {
      try {
        const cached = localStorage.getItem('cachedModels');
        const cacheTime = localStorage.getItem('modelsCacheTime');
        const now = Date.now();
        if (cached && cacheTime && now - parseInt(cacheTime) < 24 * 60 * 60 * 1000) {
          const data = JSON.parse(cached);
          if (data.models) {
            setModels(data.models.map((m: any) => m.key));
            if (data.default) setSelectedModel(data.default);
            return;
          }
        }

        const res = await fetch('/api/models');
        if (res.ok) {
          const data = await res.json();
          localStorage.setItem('cachedModels', JSON.stringify(data));
          localStorage.setItem('modelsCacheTime', now.toString());
          setModels(data.models.map((m: any) => m.key));
          if (data.default) setSelectedModel(data.default);
        }
      } catch (err) {
        console.error('Error fetching models:', err);
        setModels(['Llama-3.3-70b', 'Llama-3-8b', 'Qwen2.5-coder', 'gemini-2.5-flash']);
      }
    };
    fetchModels();
  }, []);

  // Load chat history from localStorage
  useEffect(() => {
    try {
      const stored = localStorage.getItem('chatHistory');
      if (stored) {
        const parsed = JSON.parse(stored);
        if (Array.isArray(parsed)) {
          setMessages(
            parsed.map((msg: any) => ({
              ...msg,
              timestamp: new Date(msg.timestamp || Date.now()),
            }))
          );
        }
      } else {
        setMessages([
          {
            role: 'assistant',
            content: 'Привет! 👋 Я твой AI-ассистент. Чем могу помочь?',
            timestamp: new Date(),
          },
        ]);
      }
    } catch (err) {
      console.error('Error loading history:', err);
    }
  }, []);

  // Sync selected model from localStorage
  useEffect(() => {
    const savedModel = localStorage.getItem('model');
    if (savedModel) {
      setSelectedModel(savedModel);
    }
  }, []);

  const handleModelChange = useCallback((model: string) => {
    setSelectedModel(model);
    localStorage.setItem('model', model);
  }, []);

  const handleSendMessage = useCallback(async (text: string) => {
    if (!text.trim() || isLoading) return;

    const userMessage: Message = {
      role: 'user',
      content: text,
      timestamp: new Date(),
    };

    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    localStorage.setItem('chatHistory', JSON.stringify(updatedMessages));
    setIsLoading(true);

    try {
      // Prepare payload stripping React components/Dates
      const payloadMessages = updatedMessages.map(m => ({
        role: m.role,
        content: m.content
      }));

      const res = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          messages: payloadMessages,
          model: selectedModel,
        }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        const errMsg = errorData.error || await res.text();
        throw new Error(errMsg);
      }

      const data = await res.json();
      let assistantText = data.response || 'Извините, не удалось получить ответ.';

      if (data.fallback) {
        assistantText = `⚠️ Использована резервная модель "${data.model}" вместо "${data.originalModel}". Причина: ${data.error}\n\n${assistantText}`;
      }

      const assistantMessage: Message = {
        role: 'assistant',
        content: assistantText,
        timestamp: new Date(),
      };

      const finalMessages = [...updatedMessages, assistantMessage];
      setMessages(finalMessages);
      localStorage.setItem('chatHistory', JSON.stringify(finalMessages));
    } catch (err: any) {
      console.error('Error sending message:', err);
      const errorMessage: Message = {
        role: 'assistant',
        content: `❌ Ошибка: ${err.message || 'Что-то пошло не так.'}`,
        timestamp: new Date(),
      };
      const finalMessages = [...updatedMessages, errorMessage];
      setMessages(finalMessages);
      localStorage.setItem('chatHistory', JSON.stringify(finalMessages));
    } finally {
      setIsLoading(false);
    }
  }, [messages, selectedModel, isLoading]);

  return (
    <MantineProvider theme={shekinahTheme} defaultColorScheme="dark">
      <ChatInterface
        onSendMessage={handleSendMessage}
        messages={messages}
        isLoading={isLoading}
        models={models}
        selectedModel={selectedModel}
        onModelChange={handleModelChange}
      />
    </MantineProvider>
  );
};

const container = document.getElementById('root');
if (container) {
  const root = createRoot(container);
  root.render(<App />);
}
