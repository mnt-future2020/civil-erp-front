import React, { useState, useRef, useEffect } from 'react';
import { 
  Bot, 
  Send, 
  Loader2, 
  User,
  Sparkles,
  TrendingUp,
  AlertTriangle,
  FileText,
  IndianRupee
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Button } from '../components/ui/button';
import { Textarea } from '../components/ui/textarea';
import { ScrollArea } from '../components/ui/scroll-area';
import { toast } from 'sonner';

const suggestedQueries = [
  {
    icon: TrendingUp,
    title: 'Cost Prediction',
    query: 'Predict the cost variance for our ongoing projects based on current spending trends'
  },
  {
    icon: AlertTriangle,
    title: 'Risk Analysis',
    query: 'What are the potential risks for construction projects in Chennai during monsoon season?'
  },
  {
    icon: FileText,
    title: 'GST Compliance',
    query: 'What are the GST compliance requirements for construction services in Tamil Nadu?'
  },
  {
    icon: IndianRupee,
    title: 'Budget Forecast',
    query: 'Help me forecast the budget requirements for a 50-unit residential project'
  }
];

export default function AIAssistant() {
  const { api, user } = useAuth();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages]);

  const sendMessage = async (query) => {
    const userMessage = query || input.trim();
    if (!userMessage) return;

    const newUserMessage = {
      id: Date.now(),
      role: 'user',
      content: userMessage,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, newUserMessage]);
    setInput('');
    setLoading(true);

    try {
      const response = await api.post('/ai/predict', {
        query: userMessage,
        context: {
          user_role: user?.role,
          user_name: user?.name
        }
      });

      const aiMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: response.data.response,
        model: response.data.model,
        timestamp: new Date().toISOString()
      };

      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error('AI request failed:', error);
      toast.error('Failed to get AI response. Please try again.');
      
      const errorMessage = {
        id: Date.now() + 1,
        role: 'assistant',
        content: 'I apologize, but I encountered an error processing your request. Please try again or rephrase your question.',
        isError: true,
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="space-y-6" data-testid="ai-assistant-page">
      {/* Header */}
      <div className="page-header">
        <div>
          <h1 className="page-title flex items-center gap-2">
            <Sparkles className="w-8 h-8 text-accent" />
            AI Assistant
          </h1>
          <p className="page-subtitle">Powered by GPT-5.2 - Construction Intelligence</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Chat Area */}
        <Card className="lg:col-span-3 rounded-sm flex flex-col h-[600px]">
          <CardHeader className="border-b py-3">
            <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
              <Bot className="w-4 h-4" />
              Construction ERP Assistant
            </CardTitle>
          </CardHeader>
          
          <ScrollArea className="flex-1 p-4" ref={scrollRef}>
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-center py-12">
                <div className="w-16 h-16 rounded-full bg-accent/10 flex items-center justify-center mb-4">
                  <Bot className="w-8 h-8 text-accent" />
                </div>
                <h3 className="text-lg font-semibold mb-2">How can I help you today?</h3>
                <p className="text-muted-foreground text-sm max-w-md">
                  I can help with cost predictions, risk analysis, GST compliance, 
                  schedule optimization, and material requirements for your construction projects.
                </p>
              </div>
            ) : (
              <div className="space-y-4">
                {messages.map((message) => (
                  <div
                    key={message.id}
                    className={`flex gap-3 ${message.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    {message.role === 'assistant' && (
                      <div className="w-8 h-8 rounded-sm bg-accent/10 flex items-center justify-center flex-shrink-0">
                        <Bot className="w-4 h-4 text-accent" />
                      </div>
                    )}
                    <div
                      className={`max-w-[80%] rounded-sm p-4 ${
                        message.role === 'user'
                          ? 'bg-accent text-accent-foreground'
                          : message.isError
                          ? 'bg-destructive/10 text-destructive border border-destructive/20'
                          : 'bg-muted'
                      }`}
                    >
                      <p className="text-sm whitespace-pre-wrap">{message.content}</p>
                      {message.model && (
                        <p className="text-xs text-muted-foreground mt-2 opacity-70">
                          via {message.model}
                        </p>
                      )}
                    </div>
                    {message.role === 'user' && (
                      <div className="w-8 h-8 rounded-sm bg-primary flex items-center justify-center flex-shrink-0">
                        <User className="w-4 h-4 text-primary-foreground" />
                      </div>
                    )}
                  </div>
                ))}
                {loading && (
                  <div className="flex gap-3">
                    <div className="w-8 h-8 rounded-sm bg-accent/10 flex items-center justify-center">
                      <Bot className="w-4 h-4 text-accent" />
                    </div>
                    <div className="bg-muted rounded-sm p-4">
                      <div className="flex items-center gap-2 text-sm text-muted-foreground">
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Analyzing your query...
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}
          </ScrollArea>

          {/* Input Area */}
          <div className="border-t p-4">
            <div className="flex gap-2">
              <Textarea
                placeholder="Ask about cost predictions, risk analysis, GST compliance..."
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                className="min-h-[60px] max-h-[120px] rounded-sm resize-none"
                disabled={loading}
                data-testid="ai-input"
              />
              <Button
                onClick={() => sendMessage()}
                disabled={loading || !input.trim()}
                className="action-btn-accent h-auto px-4"
                data-testid="ai-send-btn"
              >
                {loading ? (
                  <Loader2 className="w-5 h-5 animate-spin" />
                ) : (
                  <Send className="w-5 h-5" />
                )}
              </Button>
            </div>
            <p className="text-xs text-muted-foreground mt-2">
              Press Enter to send, Shift+Enter for new line
            </p>
          </div>
        </Card>

        {/* Suggested Queries */}
        <div className="space-y-4">
          <h3 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
            Quick Actions
          </h3>
          <div className="space-y-2">
            {suggestedQueries.map((item, index) => {
              const Icon = item.icon;
              return (
                <Card
                  key={index}
                  className="rounded-sm cursor-pointer card-hover"
                  onClick={() => sendMessage(item.query)}
                  data-testid={`suggested-query-${index}`}
                >
                  <CardContent className="p-4">
                    <div className="flex items-start gap-3">
                      <div className="p-2 rounded-sm bg-accent/10">
                        <Icon className="w-4 h-4 text-accent" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">{item.title}</p>
                        <p className="text-xs text-muted-foreground mt-1 line-clamp-2">
                          {item.query}
                        </p>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          {/* Info Card */}
          <Card className="rounded-sm bg-accent/5 border-accent/20">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <Sparkles className="w-5 h-5 text-accent mt-0.5" />
                <div>
                  <p className="font-medium text-sm">AI Capabilities</p>
                  <ul className="text-xs text-muted-foreground mt-2 space-y-1">
                    <li>• Cost prediction & forecasting</li>
                    <li>• Risk analysis for projects</li>
                    <li>• Schedule optimization</li>
                    <li>• GST/RERA compliance guidance</li>
                    <li>• Material requirement planning</li>
                  </ul>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
