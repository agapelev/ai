import React, { useState, useEffect } from 'react';
import {
  Container,
  Paper,
  TextInput,
  Button,
  Stack,
  Group,
  Badge,
  Modal,
  Notification,
  ActionIcon,
  Tooltip,
  Menu,
  Select,
  Progress,
  Text,
  Title,
  Divider,
  ScrollArea,
  Box,
  useMantineTheme,
  useMantineColorScheme,
  rem
} from '@mantine/core';
import {
  IconSend,
  IconMoon,
  IconSun,
  IconTrash,
  IconChevronDown,
  IconChevronUp,
  IconRefresh,
  IconSettings,
  IconInfoCircle,
  IconLoader
} from '@tabler/icons-react';
import { shekinahTheme, darkTheme } from '../mantine-theme';

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface ChatInterfaceProps {
  onSendMessage: (message: string) => Promise<void>;
  messages: Message[];
  isLoading: boolean;
  models: string[];
  selectedModel: string;
  onModelChange: (model: string) => void;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  onSendMessage,
  messages,
  isLoading,
  models,
  selectedModel,
  onModelChange
}) => {
  const [inputValue, setInputValue] = useState('');
  const [showClearModal, setShowClearModal] = useState(false);
  const [showNotification, setShowNotification] = useState(false);
  const [progressValue, setProgressValue] = useState(0);
  const theme = useMantineTheme();
  const { colorScheme, setColorScheme } = useMantineColorScheme();

  useEffect(() => {
    if (isLoading) {
      const interval = setInterval(() => {
        setProgressValue((prev) => (prev >= 95 ? 95 : prev + 5));
      }, 500);
      return () => clearInterval(interval);
    } else {
      setProgressValue(100);
      setTimeout(() => setProgressValue(0), 500);
    }
  }, [isLoading]);

  const handleSendMessage = async () => {
    if (!inputValue.trim() || isLoading) return;
    
    const message = inputValue.trim();
    setInputValue('');
    await onSendMessage(message);
  };

  const handleKeyPress = (event: React.KeyboardEvent) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  };

  const clearHistory = () => {
    // Очистка истории
    setShowClearModal(false);
    setShowNotification(true);
    setTimeout(() => setShowNotification(false), 3000);
  };

  return (
    <Container size="lg" px="xs" py="md">
      <Paper shadow="lg" p="md" withBorder radius="lg">
        {/* Header */}
        <Group justify="space-between" mb="md">
          <Group>
            <Title order={3} c="shekinah.6">
              Shekinah Mission AI Chat
            </Title>
            <Badge variant="light" color="shekinah">
              Powered by Web Arystan
            </Badge>
          </Group>
          
          <Group>
            <Select
              value={selectedModel}
              onChange={onModelChange}
              data={models}
              w={200}
              size="sm"
            />
            
            <Menu shadow="md" width={200}>
              <Menu.Target>
                <Button variant="light" size="sm" rightSection={<IconChevronDown size={14} />}>
                  О моделях
                </Button>
              </Menu.Target>
              <Menu.Dropdown>
                <Menu.Item 
                  component="a" 
                  href="/templates/inspiration" 
                  target="_blank"
                  leftSection={<IconInfoCircle size={14} />}
                >
                  📄 HTML версия
                </Menu.Item>
                <Menu.Item 
                  component="a" 
                  href="/templates/inspiration.md" 
                  target="_blank"
                  leftSection={<IconInfoCircle size={14} />}
                >
                  📝 Markdown версия
                </Menu.Item>
              </Menu.Dropdown>
            </Menu>
            
            <Tooltip label="Переключить тему">
              <ActionIcon
                variant="light"
                size="sm"
                onClick={() => setColorScheme(colorScheme === 'light' ? 'dark' : 'light')}
              >
                {colorScheme === 'light' ? <IconMoon size={14} /> : <IconSun size={14} />}
              </ActionIcon>
            </Tooltip>
            
            <Tooltip label="Очистить историю">
              <ActionIcon
                variant="light"
                color="red"
                size="sm"
                onClick={() => setShowClearModal(true)}
              >
                <IconTrash size={14} />
              </ActionIcon>
            </Tooltip>
          </Group>
        </Group>

        <Divider mb="md" />

        {/* Progress Bar */}
        {isLoading && (
          <Box mb="md">
            <Progress
              value={progressValue}
              color="shekinah"
              size="sm"
              animate
            />
            <Text size="xs" c="dimmed" mt={4}>
              {progressValue < 20 ? 'Отправка запроса...' :
               progressValue < 50 ? 'Обработка...' :
               progressValue < 80 ? 'Генерация ответа...' :
               'Почти готово...'}
            </Text>
          </Box>
        )}

        {/* Messages */}
        <ScrollArea h={400} mb="md" offsetScrollbars scrollbarSize={4}>
          <Stack gap="md">
            {messages.map((message, index) => (
              <Paper
                key={index}
                p="md"
                withBorder
                radius="md"
                bg={message.role === 'user' ? 'shekinah.0' : 'gray.0'}
                style={{
                  alignSelf: message.role === 'user' ? 'flex-end' : 'flex-start',
                  maxWidth: '80%'
                }}
              >
                <Text size="sm" c="dimmed" mb={4}>
                  {message.role === 'user' ? 'Вы' : 'AI'}
                </Text>
                <Text>{message.content}</Text>
                <Text size="xs" c="dimmed" mt={4}>
                  {message.timestamp.toLocaleTimeString()}
                </Text>
              </Paper>
            ))}
          </Stack>
        </ScrollArea>

        {/* Input */}
        <Group>
          <TextInput
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Введите сообщение..."
            flex={1}
            size="md"
            onKeyDown={handleKeyPress}
            disabled={isLoading}
            rightSection={
              isLoading && <IconLoader size={16} className="animate-spin" />
            }
          />
          <Button
            onClick={handleSendMessage}
            disabled={!inputValue.trim() || isLoading}
            loading={isLoading}
            gradient={{ from: 'shekinah', to: 'cyan' }}
          >
            <IconSend size={16} />
          </Button>
        </Group>
      </Paper>

      {/* Clear History Modal */}
      <Modal
        opened={showClearModal}
        onClose={() => setShowClearModal(false)}
        title="Очистить историю чата"
        centered
      >
        <Text mb="md">
          Вы уверены, что хотите очистить всю историю чата? Это действие нельзя отменить.
        </Text>
        <Group justify="flex-end">
          <Button
            variant="light"
            onClick={() => setShowClearModal(false)}
          >
            Отмена
          </Button>
          <Button color="red" onClick={clearHistory}>
            Очистить
          </Button>
        </Group>
      </Modal>

      {/* Success Notification */}
      {showNotification && (
        <Notification
          withCloseButton={false}
          color="green"
          title="История очищена"
          mt="md"
        >
          История чата успешно очищена
        </Notification>
      )}
    </Container>
  );
};
