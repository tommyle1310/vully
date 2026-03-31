'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send, Loader2, Sparkles, ExternalLink } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { 
  useAiChat, 
  useQueryQuota, 
  type ChatMessage 
} from '@/hooks/use-ai-assistant';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { cn } from '@/lib/utils';

export function FloatingChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  const { mutate: sendMessage, isPending } = useAiChat();
  const { data: quota } = useQueryQuota();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isPending]);

  const handleSend = () => {
    if (!input.trim() || isPending) return;

    const userMessage: ChatMessage = {
      role: 'user',
      content: input.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInput('');

    sendMessage(
      { query: userMessage.content },
      {
        onSuccess: (data) => {
          const assistantMessage: ChatMessage = {
            role: 'assistant',
            content: data.response,
            timestamp: new Date(),
            sources: data.sources,
          };
          setMessages((prev) => [...prev, assistantMessage]);
        },
        onError: (error: any) => {
          const errorMessage: ChatMessage = {
            role: 'assistant',
            content: error.response?.data?.message || 'Sorry, I encountered an error. Please try again.',
            timestamp: new Date(),
          };
          setMessages((prev) => [...prev, errorMessage]);
        },
      }
    );
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const remainingQueries = typeof quota?.remaining === 'number' 
    ? quota.remaining 
    : quota?.remaining;
  const isLimited = typeof remainingQueries === 'number';

  return (
    <>
      {/* Floating Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="fixed bottom-6 right-6 z-50"
          >
            <Button
              size="lg"
              className="h-14 w-14 rounded-full shadow-lg"
              onClick={() => setIsOpen(true)}
            >
              <MessageCircle className="h-6 w-6" />
            </Button>
            {isLimited && remainingQueries <= 5 && remainingQueries > 0 && (
              <Badge 
                variant="destructive" 
                className="absolute -top-1 -right-1 h-6 w-6 rounded-full p-0 flex items-center justify-center"
              >
                {remainingQueries}
              </Badge>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.2 }}
            className="fixed bottom-6 right-6 z-50 w-96 h-[600px]"
          >
            <Card className="flex flex-col h-full shadow-2xl">
              {/* Header */}
              <div className="flex items-center justify-between p-4 border-b bg-primary text-primary-foreground rounded-t-lg">
                <div className="flex items-center gap-2">
                  <Sparkles className="h-5 w-5" />
                  <h3 className="font-semibold">AI Assistant</h3>
                </div>
                <div className="flex items-center gap-2">
                  {quota && (
                    <Badge variant="secondary" className="text-xs">
                      {isLimited ? `${remainingQueries}/${quota.limit} left` : 'Unlimited'}
                    </Badge>
                  )}
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 text-primary-foreground hover:bg-primary-foreground/20"
                    onClick={() => setIsOpen(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>
              </div>

              {/* Messages */}
              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  {messages.length === 0 && (
                    <div className="text-center text-muted-foreground py-8">
                      <Sparkles className="h-12 w-12 mx-auto mb-3 text-primary" />
                      <p className="text-sm">
                        Hi! I'm your AI assistant. Ask me about:
                      </p>
                      <ul className="text-xs mt-2 space-y-1">
                        <li>• Building rules & regulations</li>
                        <li>• Payment policies & invoices</li>
                        <li>• Maintenance procedures</li>
                        <li>• Apartment information</li>
                      </ul>
                    </div>
                  )}

                  {messages.map((message, index) => (
                    <motion.div
                      key={index}
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={cn(
                        'flex',
                        message.role === 'user' ? 'justify-end' : 'justify-start'
                      )}
                    >
                      <div
                        className={cn(
                          'rounded-lg px-4 py-2 max-w-[80%]',
                          message.role === 'user'
                            ? 'bg-primary text-primary-foreground'
                            : 'bg-muted'
                        )}
                      >
                        {message.role === 'assistant' ? (
                          <div className="text-sm prose prose-sm dark:prose-invert max-w-none prose-p:my-1.5 prose-headings:mt-3 prose-headings:mb-1.5 prose-headings:font-semibold prose-ul:my-1.5 prose-ol:my-1.5 prose-li:my-0.5 prose-strong:font-semibold prose-hr:my-2">
                            <ReactMarkdown remarkPlugins={[remarkGfm]}>
                              {message.content}
                            </ReactMarkdown>
                          </div>
                        ) : (
                          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                        )}
                        
                        {message.sources && message.sources.length > 0 && (
                          <div className="mt-2 pt-2 border-t border-border/50">
                            <p className="text-xs font-medium mb-1">Sources:</p>
                            <div className="space-y-1">
                              {message.sources.map((source, idx) => (
                                <div key={idx} className="flex items-center gap-1 text-xs">
                                  <ExternalLink className="h-3 w-3" />
                                  <span>{source.title}</span>
                                  <Badge variant="outline" className="text-[10px] ml-auto">
                                    {Math.round(source.relevance * 100)}%
                                  </Badge>
                                </div>
                              ))}
                            </div>
                          </div>
                        )}
                        
                        <p className="text-[10px] mt-1 opacity-70">
                          {message.timestamp.toLocaleTimeString()}
                        </p>
                      </div>
                    </motion.div>
                  ))}

                  {isPending && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex justify-start"
                    >
                      <div className="bg-muted rounded-lg px-4 py-2">
                        <Loader2 className="h-4 w-4 animate-spin" />
                      </div>
                    </motion.div>
                  )}
                  <div ref={bottomRef} />
                </div>
              </ScrollArea>

              {/* Input */}
              <div className="p-4 border-t">
                <div className="flex gap-2">
                  <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Ask me anything..."
                    disabled={isPending || (isLimited && remainingQueries === 0)}
                    className="flex-1"
                  />
                  <Button
                    size="icon"
                    onClick={handleSend}
                    disabled={!input.trim() || isPending || (isLimited && remainingQueries === 0)}
                  >
                    <Send className="h-4 w-4" />
                  </Button>
                </div>
                {isLimited && remainingQueries === 0 && (
                  <p className="text-xs text-destructive mt-2">
                    Daily query limit reached. Try again tomorrow!
                  </p>
                )}
              </div>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
