import { FormEvent, useState } from "react";
import { useNavigate } from "react-router-dom";
import { LogIn, UserPlus } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/hooks/use-toast";
import { login, signUp } from "@/utils/authStorage";

const APP_LOGO_SRC = "/quotegen-logo.svg";

export default function Auth() {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [activeTab, setActiveTab] = useState<"login" | "signup">("login");

  const [loginForm, setLoginForm] = useState({
    email: "",
    password: "",
  });

  const [signUpForm, setSignUpForm] = useState({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
  });

  const handleLogin = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);

    const result = login(loginForm);
    if (!result.ok) {
      toast({ title: "Login failed", description: result.error, variant: "destructive" });
      setIsSubmitting(false);
      return;
    }

    toast({ title: "Welcome back", description: `Logged in as ${result.user.email}.` });
    navigate("/", { replace: true });
  };

  const handleSignUp = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setIsSubmitting(true);

    if (signUpForm.password !== signUpForm.confirmPassword) {
      toast({
        title: "Password mismatch",
        description: "Password and confirm password must match.",
        variant: "destructive",
      });
      setIsSubmitting(false);
      return;
    }

    const result = signUp({
      name: signUpForm.name,
      email: signUpForm.email,
      password: signUpForm.password,
    });

    if (!result.ok) {
      toast({ title: "Sign up failed", description: result.error, variant: "destructive" });
      setIsSubmitting(false);
      return;
    }

    toast({ title: "Account created", description: `Welcome, ${result.user.name}.` });
    navigate("/", { replace: true });
  };

  return (
    <div className="min-h-screen bg-background">
      <header className="sticky top-0 z-50 border-b border-border bg-card px-4 py-3 shadow-sm">
        <div className="mx-auto flex w-full max-w-5xl items-center gap-3">
          <img src={APP_LOGO_SRC} alt="QuoteGen logo" className="h-8 w-8 object-contain" />
          <div>
            <h1 className="text-lg font-bold text-foreground">QuoteGen</h1>
            <p className="text-xs text-muted-foreground">Professional Quotation Generator</p>
          </div>
        </div>
      </header>

      <main className="mx-auto flex min-h-[calc(100vh-57px)] w-full max-w-5xl items-center justify-center p-4 lg:p-6">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="text-xl">Account Access</CardTitle>
            <CardDescription>Sign up or log in to continue using QuoteGen.</CardDescription>
          </CardHeader>

          <CardContent>
            <Tabs value={activeTab} onValueChange={value => setActiveTab(value as "login" | "signup")}>
              <TabsList className="grid w-full grid-cols-2">
                <TabsTrigger value="login">Log in</TabsTrigger>
                <TabsTrigger value="signup">Sign up</TabsTrigger>
              </TabsList>

              <TabsContent value="login" className="mt-4">
                <form onSubmit={handleLogin} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="login-email">Email</Label>
                    <Input
                      id="login-email"
                      type="email"
                      placeholder="you@company.com"
                      value={loginForm.email}
                      onChange={event => setLoginForm(prev => ({ ...prev, email: event.target.value }))}
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="login-password">Password</Label>
                    <Input
                      id="login-password"
                      type="password"
                      placeholder="Enter your password"
                      value={loginForm.password}
                      onChange={event => setLoginForm(prev => ({ ...prev, password: event.target.value }))}
                      required
                    />
                  </div>

                  <Button type="submit" className="w-full" disabled={isSubmitting}>
                    <LogIn className="h-4 w-4" />
                    Log in
                  </Button>
                </form>
              </TabsContent>

              <TabsContent value="signup" className="mt-4">
                <form onSubmit={handleSignUp} className="space-y-4">
                  <div className="space-y-1.5">
                    <Label htmlFor="signup-name">Full name</Label>
                    <Input
                      id="signup-name"
                      type="text"
                      placeholder="Your name"
                      value={signUpForm.name}
                      onChange={event => setSignUpForm(prev => ({ ...prev, name: event.target.value }))}
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="signup-email">Email</Label>
                    <Input
                      id="signup-email"
                      type="email"
                      placeholder="you@company.com"
                      value={signUpForm.email}
                      onChange={event => setSignUpForm(prev => ({ ...prev, email: event.target.value }))}
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="signup-password">Password</Label>
                    <Input
                      id="signup-password"
                      type="password"
                      placeholder="Create a password"
                      value={signUpForm.password}
                      onChange={event => setSignUpForm(prev => ({ ...prev, password: event.target.value }))}
                      required
                    />
                  </div>

                  <div className="space-y-1.5">
                    <Label htmlFor="signup-confirm-password">Confirm password</Label>
                    <Input
                      id="signup-confirm-password"
                      type="password"
                      placeholder="Confirm password"
                      value={signUpForm.confirmPassword}
                      onChange={event => setSignUpForm(prev => ({ ...prev, confirmPassword: event.target.value }))}
                      required
                    />
                  </div>

                  <Button type="submit" className="w-full" disabled={isSubmitting}>
                    <UserPlus className="h-4 w-4" />
                    Sign up
                  </Button>
                </form>
              </TabsContent>
            </Tabs>
          </CardContent>
        </Card>
      </main>
    </div>
  );
}
