import React, { useState, useRef, useEffect, useMemo } from 'react';
import type { QueryResponse } from '../services/api';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
  contextKey: string;
}

interface ChatPanelProps {
  queryResult: QueryResponse | null;
  onSendMessage: (message: string, context: QueryResponse) => Promise<string>;
}

const ChatPanel: React.FC<ChatPanelProps> = ({ queryResult, onSendMessage }) => {
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const contextKey = useMemo(() => {
    if (!queryResult || !queryResult.data || queryResult.data.length === 0) return 'empty';
    return [
      queryResult.sql ?? '',
      queryResult.data.length,
      queryResult.execution_time ?? '',
      queryResult.error ?? '',
    ].join('|');
  }, [queryResult]);

  const contextMessages = messages.filter((message) => message.contextKey === contextKey);

  const introMessage = useMemo<Message | null>(() => {
    if (!queryResult || !queryResult.data || queryResult.data.length === 0) return null;

    return {
      id: `intro-${contextKey}`,
      role: 'assistant',
      content: `已为您查询到 ${queryResult.data.length} 条数据。您可以基于这些数据向我提问，例如：\n• 这些数据的最大值/最小值是多少？\n• 数据有什么趋势或规律？\n• 请帮我分析一下这些数据`,
      timestamp: new Date(),
      contextKey,
    };
  }, [contextKey, queryResult]);

  const displayMessages = introMessage ? [introMessage, ...contextMessages] : contextMessages;

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, contextKey]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputValue.trim() || !queryResult || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputValue.trim(),
      timestamp: new Date(),
      contextKey,
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputValue('');
    setIsLoading(true);

    try {
      const response = await onSendMessage(inputValue.trim(), queryResult);

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        timestamp: new Date(),
        contextKey,
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch {
      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '抱歉，处理您的问题时出现错误，请稍后重试。',
        timestamp: new Date(),
        contextKey,
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const suggestedQuestions = [
    '这些数据的最大值是多少？',
    '数据的平均值是多少？',
    '请总结一下这些数据',
    '有什么异常值吗？',
  ];

  const handleSuggestedQuestion = (question: string) => {
    setInputValue(question);
  };

  if (!queryResult || !queryResult.data || queryResult.data.length === 0) {
    return (
      <div className="card-surface rounded-lg p-5">
        <div className="mb-4">
          <p className="panel-eyebrow">Assistant</p>
          <h3 className="panel-title mt-1">数据问答</h3>
        </div>
        <div className="flex h-36 items-center justify-center rounded-lg border border-dashed border-slate-200 bg-slate-50/70 px-4 text-center">
          <p className="text-sm font-medium text-slate-500">
            查询结果生成后，可继续追问数据洞察
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="card-surface flex h-[500px] flex-col overflow-hidden rounded-lg">
      <div className="border-b border-slate-200 px-5 py-4">
        <p className="panel-eyebrow">Assistant</p>
        <div className="mt-1 flex items-center justify-between gap-3">
          <h3 className="panel-title">数据问答</h3>
          <span className="rounded-full bg-teal-50 px-2.5 py-1 text-xs font-bold text-teal-700">
            {queryResult.data.length} 行上下文
          </span>
        </div>
      </div>

      <div className="subtle-scrollbar flex-1 space-y-4 overflow-y-auto bg-slate-50/50 p-5">
        {displayMessages.map((message) => (
          <div
            key={message.id}
            className={`flex ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`max-w-[82%] rounded-lg px-4 py-3 shadow-sm ${
                message.role === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'border border-slate-200 bg-white text-slate-800'
              }`}
            >
              <div className="whitespace-pre-wrap text-sm leading-6">{message.content}</div>
              <div
                className={`mt-2 text-xs font-medium ${
                  message.role === 'user' ? 'text-blue-100' : 'text-slate-400'
                }`}
              >
                {message.timestamp.toLocaleTimeString('zh-CN', {
                  hour: '2-digit',
                  minute: '2-digit',
                })}
              </div>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="rounded-lg border border-slate-200 bg-white px-4 py-3 shadow-sm">
              <div className="flex items-center space-x-2">
                <div className="h-2 w-2 animate-bounce rounded-full bg-slate-400" />
                <div
                  className="h-2 w-2 animate-bounce rounded-full bg-slate-400"
                  style={{ animationDelay: '0.1s' }}
                />
                <div
                  className="h-2 w-2 animate-bounce rounded-full bg-slate-400"
                  style={{ animationDelay: '0.2s' }}
                />
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {contextMessages.length === 0 && (
        <div className="border-t border-slate-100 bg-white px-5 py-3">
          <div className="flex flex-wrap gap-2">
            {suggestedQuestions.map((question) => (
              <button
                key={question}
                onClick={() => handleSuggestedQuestion(question)}
                className="rounded-md border border-blue-100 bg-blue-50 px-2.5 py-1.5 text-left text-xs font-semibold text-blue-700 transition hover:bg-blue-100"
              >
                {question}
              </button>
            ))}
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="border-t border-slate-200 bg-white p-4">
        <div className="flex gap-2">
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="输入您的问题..."
            className="min-w-0 flex-1 rounded-lg border border-slate-200 bg-slate-50 px-4 py-2.5 text-sm text-slate-900 outline-none transition focus:border-blue-500 focus:bg-white focus:ring-4 focus:ring-blue-100 disabled:cursor-not-allowed disabled:opacity-70"
            disabled={isLoading}
          />
          <button
            type="submit"
            disabled={!inputValue.trim() || isLoading}
            className={`flex h-10 w-11 shrink-0 items-center justify-center rounded-lg transition ${
              !inputValue.trim() || isLoading
                ? 'cursor-not-allowed bg-slate-200 text-slate-500'
                : 'bg-slate-950 text-white hover:bg-blue-700'
            }`}
            title="发送"
          >
            <svg
              className="w-5 h-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
              />
            </svg>
          </button>
        </div>
      </form>
    </div>
  );
};

export default ChatPanel;
