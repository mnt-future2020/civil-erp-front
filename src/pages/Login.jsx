import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { toast } from 'sonner';

export default function Login() {
  const navigate = useNavigate();
  const { login } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);

    const result = await login(email, password);

    if (result.success) {
      toast.success('Welcome back!');
      navigate('/dashboard');
    } else {
      toast.error(result.error);
    }

    setLoading(false);
  };

  return (
    <div className="min-h-screen flex">
      {/* Left side - Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 bg-background">
        <div className="w-full max-w-md space-y-8 animate-slide-up">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-sm bg-amber-500 flex items-center justify-center">
              <Building2 className="w-7 h-7 text-slate-900" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight">CIVIL ERP</h1>
              <p className="text-xs text-muted-foreground uppercase tracking-wider">Construction Management System</p>
            </div>
          </div>

          <div>
            <h2 className="text-3xl font-bold tracking-tight">Welcome</h2>
            <p className="text-muted-foreground mt-1">Manage your construction projects efficiently</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                placeholder="admin@civilcorp.com"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                className="rounded-sm"
                data-testid="login-email"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="password">Password</Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? 'text' : 'password'}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="rounded-sm pr-10"
                  data-testid="login-password"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
                >
                  {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <Button
              type="submit"
              className="w-full rounded-sm bg-primary hover:bg-primary/90 font-semibold uppercase tracking-wide"
              disabled={loading}
              data-testid="login-submit"
            >
              {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Sign In'}
            </Button>
          </form>

          <div className="text-center text-sm text-muted-foreground">
            <p>Demo credentials:</p>
            <p className="font-mono text-xs mt-1">admin@civilcorp.com / admin123</p>
          </div>
        </div>
      </div>

      {/* Right side - Hero image */}
      <div 
        className="hidden lg:block lg:w-1/2 bg-cover bg-center relative"
        style={{ 
          backgroundImage: 'url(https://images.unsplash.com/photo-1504307651254-35680f356dfd?auto=format&fit=crop&w=1920&q=80)'
        }}
      >
        <div className="absolute inset-0 bg-gradient-to-br from-slate-900/90 via-slate-900/70 to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 p-12 text-white">
          <blockquote className="text-2xl font-light leading-relaxed mb-4">
            "Building tomorrow's infrastructure with precision and innovation."
          </blockquote>
          <div className="flex items-center gap-4">
            <div className="w-12 h-12 rounded-sm bg-amber-500/20 backdrop-blur-sm flex items-center justify-center">
              <Building2 className="w-6 h-6 text-amber-400" />
            </div>
            <div>
              <p className="font-semibold">Tamil Nadu Construction Corp</p>
              <p className="text-sm text-slate-300">Since 1985 • Chennai, India</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
