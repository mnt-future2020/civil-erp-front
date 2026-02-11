import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Building2, Eye, EyeOff, Loader2 } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Label } from '../components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../components/ui/tabs';
import { toast } from 'sonner';

export default function Login() {
  const navigate = useNavigate();
  const { login, register } = useAuth();
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  
  // Login form
  const [loginEmail, setLoginEmail] = useState('');
  const [loginPassword, setLoginPassword] = useState('');
  
  // Register form
  const [registerData, setRegisterData] = useState({
    name: '',
    email: '',
    password: '',
    phone: '',
    role: 'site_engineer',
    department: ''
  });

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    const result = await login(loginEmail, loginPassword);
    
    if (result.success) {
      toast.success('Welcome back!');
      navigate('/dashboard');
    } else {
      toast.error(result.error);
    }
    
    setLoading(false);
  };

  const handleRegister = async (e) => {
    e.preventDefault();
    setLoading(true);
    
    const result = await register(registerData);
    
    if (result.success) {
      toast.success('Account created successfully!');
      navigate('/dashboard');
    } else {
      toast.error(result.error);
    }
    
    setLoading(false);
  };

  const updateRegisterData = (field, value) => {
    setRegisterData(prev => ({ ...prev, [field]: value }));
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

          <Tabs defaultValue="login" className="w-full">
            <TabsList className="grid w-full grid-cols-2 rounded-sm">
              <TabsTrigger value="login" className="rounded-sm" data-testid="login-tab">Sign In</TabsTrigger>
              <TabsTrigger value="register" className="rounded-sm" data-testid="register-tab">Register</TabsTrigger>
            </TabsList>

            <TabsContent value="login" className="space-y-6 mt-6">
              <form onSubmit={handleLogin} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="login-email">Email</Label>
                  <Input
                    id="login-email"
                    type="email"
                    placeholder="admin@civilcorp.com"
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    required
                    className="rounded-sm"
                    data-testid="login-email"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="login-password">Password</Label>
                  <div className="relative">
                    <Input
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      placeholder="••••••••"
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
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
            </TabsContent>

            <TabsContent value="register" className="space-y-6 mt-6">
              <form onSubmit={handleRegister} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="reg-name">Full Name</Label>
                    <Input
                      id="reg-name"
                      placeholder="John Doe"
                      value={registerData.name}
                      onChange={(e) => updateRegisterData('name', e.target.value)}
                      required
                      className="rounded-sm"
                      data-testid="register-name"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reg-phone">Phone</Label>
                    <Input
                      id="reg-phone"
                      placeholder="+91 98765 43210"
                      value={registerData.phone}
                      onChange={(e) => updateRegisterData('phone', e.target.value)}
                      className="rounded-sm"
                      data-testid="register-phone"
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reg-email">Email</Label>
                  <Input
                    id="reg-email"
                    type="email"
                    placeholder="you@company.com"
                    value={registerData.email}
                    onChange={(e) => updateRegisterData('email', e.target.value)}
                    required
                    className="rounded-sm"
                    data-testid="register-email"
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="reg-password">Password</Label>
                  <Input
                    id="reg-password"
                    type="password"
                    placeholder="Min. 6 characters"
                    value={registerData.password}
                    onChange={(e) => updateRegisterData('password', e.target.value)}
                    required
                    minLength={6}
                    className="rounded-sm"
                    data-testid="register-password"
                  />
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="reg-role">Role</Label>
                    <Select
                      value={registerData.role}
                      onValueChange={(value) => updateRegisterData('role', value)}
                    >
                      <SelectTrigger className="rounded-sm" data-testid="register-role">
                        <SelectValue placeholder="Select role" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="admin" data-testid="role-admin">Administrator</SelectItem>
                        <SelectItem value="site_engineer" data-testid="role-site-engineer">Site Engineer</SelectItem>
                        <SelectItem value="finance" data-testid="role-finance">Finance Manager</SelectItem>
                        <SelectItem value="procurement" data-testid="role-procurement">Procurement Officer</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="reg-dept">Department</Label>
                    <Input
                      id="reg-dept"
                      placeholder="Engineering"
                      value={registerData.department}
                      onChange={(e) => updateRegisterData('department', e.target.value)}
                      className="rounded-sm"
                      data-testid="register-department"
                    />
                  </div>
                </div>

                <Button
                  type="submit"
                  className="w-full rounded-sm bg-accent hover:bg-accent/90 font-semibold uppercase tracking-wide"
                  disabled={loading}
                  data-testid="register-submit"
                >
                  {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Create Account'}
                </Button>
              </form>
            </TabsContent>
          </Tabs>
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
