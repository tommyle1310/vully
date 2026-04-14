'use client';

import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircle, X, Send, Loader2, Sparkles, ExternalLink, Trash2 } from 'lucide-react';
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

interface ApiError {
  response?: {
    data?: {
      message?: string;
    };
  };
}

const CHAT_STORAGE_KEY = 'vully-chat-messages';

// Helper to serialize/deserialize chat messages with Date objects
function saveChatToStorage(messages: ChatMessage[]) {
  try {
    const serializable = messages.map(m => ({
      ...m,
      timestamp: m.timestamp.toISOString(),
    }));
    sessionStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(serializable));
  } catch {
    // Ignore storage errors (e.g., quota exceeded)
  }
}

function loadChatFromStorage(): ChatMessage[] {
  try {
    const stored = sessionStorage.getItem(CHAT_STORAGE_KEY);
    if (!stored) return [];
    const parsed = JSON.parse(stored);
    return parsed.map((m: any) => ({
      ...m,
      timestamp: new Date(m.timestamp),
    }));
  } catch {
    return [];
  }
}

export function FloatingChatWidget() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);
  const isInitialized = useRef(false);

  const { mutate: sendMessage, isPending } = useAiChat();
  const { data: quota } = useQueryQuota();

  // Load messages from sessionStorage on mount
  useEffect(() => {
    if (!isInitialized.current) {
      const stored = loadChatFromStorage();
      if (stored.length > 0) {
        setMessages(stored);
      }
      isInitialized.current = true;
    }
  }, []);

  // Save messages to sessionStorage whenever they change
  useEffect(() => {
    if (isInitialized.current && messages.length > 0) {
      saveChatToStorage(messages);
    }
  }, [messages]);

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
        onError: (error: unknown) => {
          const apiError = error as ApiError;
          const errorMessage: ChatMessage = {
            role: 'assistant',
            content: apiError.response?.data?.message || 'Sorry, I encountered an error. Please try again.',
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

  const handleClearChat = () => {
    setMessages([]);
    sessionStorage.removeItem(CHAT_STORAGE_KEY);
  };

  const remainingQueries = typeof quota?.remaining === 'number' 
    ? quota.remaining 
    : quota?.remaining;
  const isLimited = typeof remainingQueries === 'number';
  const hasLowQuota = isLimited && remainingQueries <= 5 && remainingQueries > 0;

  return (
    <>
      <AnimatePresence>
        {!isOpen && (
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            className="fixed bottom-5 right-5 z-50"
          >
            <Button
              size="lg"
              className="group relative h-14 w-14 rounded-2xl border border-primary/35 bg-primary/90 shadow-[0_18px_45px_hsl(var(--primary)/0.35)] backdrop-blur-lg hover:bg-primary"
              onClick={() => setIsOpen(true)}
            >
              <MessageCircle className="h-6 w-6 text-primary-foreground transition-transform group-hover:scale-105" />
              <span className="pointer-events-none absolute -inset-1 rounded-2xl border border-primary/20 opacity-0 transition-opacity duration-300 group-hover:opacity-100" />
            </Button>
            {hasLowQuota && (
              <Badge 
                variant="destructive" 
                className="absolute -top-2 -right-2 h-6 min-w-6 rounded-full px-1 text-[10px]"
              >
                {remainingQueries}
              </Badge>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ duration: 0.22 }}
            className="fixed bottom-5 right-5 z-50 h-[min(76vh,680px)] w-[calc(100vw-1.5rem)] max-w-[440px]"
          >
            <Card className="flex h-full flex-col overflow-hidden rounded-3xl border border-border/70 bg-card/80 shadow-[0_24px_80px_rgba(0,0,0,0.45)] backdrop-blur-xl">
              <div className="relative border-b border-border/60 bg-gradient-to-r from-primary/20 via-primary/5 to-transparent px-4 pb-4 pt-3">
                <div className="absolute right-4 top-3 flex items-center gap-1">
                  {messages.length > 0 && (
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-8 w-8 rounded-xl text-muted-foreground hover:text-foreground"
                      onClick={handleClearChat}
                      title="Clear conversation"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  )}
                  <Button
                    size="icon"
                    variant="ghost"
                    className="h-8 w-8 rounded-xl"
                    onClick={() => setIsOpen(false)}
                  >
                    <X className="h-4 w-4" />
                  </Button>
                </div>

                <div className="pr-20">
                  <div className="flex items-center gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/20 text-primary">
                      <Sparkles className="h-4.5 w-4.5" />
                    </div>
                    <div>
                      <h3 className="text-sm font-semibold tracking-wide">Vully Concierge</h3>
                      <p className="text-xs text-muted-foreground">Building support, billing, policies</p>
                    </div>
                  </div>

                  {quota && (
                    <Badge variant="outline" className="mt-3 rounded-md border-border/60 bg-background/40 text-[11px]">
                      {isLimited ? `${remainingQueries}/${quota.limit} queries left` : 'Unlimited access'}
                    </Badge>
                  )}
                </div>
              </div>

              <ScrollArea className="flex-1 p-4">
                <div className="space-y-4">
                  {messages.length === 0 && (
                    <div className="rounded-2xl border border-border/70 bg-muted/25 p-4">
                      <div className="mb-3 flex items-center gap-2 text-primary">
                        <Sparkles className="h-4 w-4" />
                        <span className="text-xs font-semibold uppercase tracking-[0.12em]">Ask anything</span>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        Ask about dues, lease terms, incident process, building policy, and resident services.
                      </p>
                      <div className="mt-3 grid grid-cols-2 gap-2">
                        {['How to pay invoices?', 'Lease expiry date?', 'Parking policy?', 'Report an issue'].map((quickPrompt) => (
                          <Button
                            key={quickPrompt}
                            variant="outline"
                            size="sm"
                            className="h-8 justify-start rounded-lg border-border/60 bg-background/40 text-xs"
                            onClick={() => setInput(quickPrompt)}
                          >
                            {quickPrompt}
                          </Button>
                        ))}
                      </div>
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
                          'max-w-[88%] overflow-hidden rounded-2xl px-4 py-2.5',
                          message.role === 'user'
                            ? 'bg-primary text-primary-foreground shadow-[0_10px_25px_hsl(var(--primary)/0.28)]'
                            : 'border border-border/60 bg-muted/50'
                        )}
                      >
                        {message.role === 'assistant' ? (
                          <div className="prose prose-sm max-w-none text-sm dark:prose-invert prose-p:my-1.5 prose-headings:mb-1.5 prose-headings:mt-3 prose-headings:font-semibold prose-ul:my-1.5 prose-ol:my-1.5 prose-li:my-0.5 prose-strong:font-semibold prose-hr:my-2 [&_*]:break-words [&_*]:overflow-wrap-anywhere">
                            <ReactMarkdown 
                              remarkPlugins={[remarkGfm]}
                              components={{
                                p: ({ children }) => <p className="break-words whitespace-pre-wrap">{children}</p>,
                                li: ({ children }) => <li className="break-words">{children}</li>,
                                strong: ({ children }) => <strong className="break-words">{children}</strong>,
                                a: ({ href, children }) => {
                                  // Internal links (starting with /) open in same tab
                                  const isInternal = href?.startsWith('/');
                                  return (
                                    <a
                                      href={href}
                                      className="text-primary underline underline-offset-2 hover:text-primary/80"
                                      target={isInternal ? '_self' : '_blank'}
                                      rel={isInternal ? undefined : 'noopener noreferrer'}
                                    >
                                      {children}
                                    </a>
                                  );
                                },
                              }}
                            >
                              {message.content}
                            </ReactMarkdown>
                          </div>
                        ) : (
                          <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                        )}
                        
                        {message.sources && message.sources.length > 0 && (
                          <div className="mt-2 border-t border-border/50 pt-2">
                            <p className="mb-1 text-xs font-medium">Sources</p>
                            <div className="space-y-1">
                              {message.sources.map((source, idx) => (
                                <div key={idx} className="flex items-center gap-1.5 rounded-md border border-border/50 bg-background/45 px-2 py-1 text-xs">
                                  <ExternalLink className="h-3 w-3 shrink-0" />
                                  <span className="line-clamp-1">{source.title}</span>
                                  <Badge variant="outline" className="ml-auto text-[10px]">
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
                      <div className="rounded-xl border border-border/60 bg-muted/50 px-3 py-2">
                        <Loader2 className="h-4 w-4 animate-spin text-primary" />
                      </div>
                    </motion.div>
                  )}
                  <div ref={bottomRef} />
                </div>
              </ScrollArea>

              <div className="border-t border-border/60 bg-background/40 p-4">
                <div className="flex gap-2">
                  <Input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Ask policy, payment, contract..."
                    disabled={isPending || (isLimited && remainingQueries === 0)}
                    className="h-10 flex-1 rounded-xl border-border/70 bg-card/70"
                  />
                  <Button
                    size="icon"
                    onClick={handleSend}
                    disabled={!input.trim() || isPending || (isLimited && remainingQueries === 0)}
                    className="h-10 w-10 rounded-xl"
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
