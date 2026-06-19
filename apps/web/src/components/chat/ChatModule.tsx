/* 对话模块主入口 */
import { useApp } from '@/contexts/AppContext';
import ChatContainer from './ChatContainer';

export default function ChatModule() {
  const { chatMode, currentConversation, setCurrentConversation, setChatMode, refreshConversations } = useApp();

  return (
    <ChatContainer
      chatMode={chatMode}
      currentConversation={currentConversation}
      setCurrentConversation={setCurrentConversation}
      setChatMode={setChatMode}
      refreshConversations={refreshConversations}
    />
  );
}
