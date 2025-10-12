import React, { useState } from "react";
import { Link } from "react-router-dom";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase";
import Button from "../components/Button";
import Input from "../components/Input";
import Card, { CardHeader, CardTitle, CardContent } from "../components/Card";
import { FadeIn } from "../components/Animations";
import { Text } from "../components/Typography";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // User will be automatically redirected by App.jsx
    } catch (error) {
      setLoading(false);
      
      // Provide user-friendly error messages
      switch (error.code) {
        case 'auth/user-not-found':
          setError("No account found with this email address. Please sign up first.");
          break;
        case 'auth/wrong-password':
          setError("Incorrect password. Please try again.");
          break;
        case 'auth/invalid-email':
          setError("Invalid email address format.");
          break;
        case 'auth/user-disabled':
          setError("This account has been disabled. Please contact support.");
          break;
        case 'auth/too-many-requests':
          setError("Too many failed login attempts. Please try again later.");
          break;
        case 'auth/invalid-credential':
          setError("Invalid email or password. If you don't have an account, please sign up first.");
          break;
        default:
          setError(error.message);
      }
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 flex flex-col justify-center items-center p-4">
      <FadeIn duration={400}>
        <Card variant="elevated" className="w-full max-w-lg p-2 bg-gradient-to-br from-slate-800/80 to-slate-900/80 border border-slate-700/50 backdrop-blur-xl shadow-2xl">
          <CardHeader className="pb-4">
            <div className="flex justify-center mb-4">
              <div className="w-16 h-16 bg-gradient-to-br from-violet-600 to-indigo-600 rounded-2xl flex items-center justify-center shadow-lg">
                <span className="text-3xl">🔐</span>
              </div>
            </div>
            <CardTitle className="text-center text-3xl text-slate-100">Welcome Back</CardTitle>
            <Text size="base" className="text-center mt-3 text-slate-300">
              Sign in to your Daily Ledger account
            </Text>
          </CardHeader>
          
          <CardContent className="pt-2">
            <form onSubmit={handleLogin} className="space-y-6">
              <Input
                type="email"
                label="Email"
                placeholder="Enter your email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={loading}
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 12a4 4 0 10-8 0 4 4 0 008 0zm0 0v1.5a2.5 2.5 0 005 0V12a9 9 0 10-9 9m4.5-1.206a8.959 8.959 0 01-4.5 1.207" />
                  </svg>
                }
              />
              
              <Input
                type="password"
                label="Password"
                placeholder="Enter your password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={loading}
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                }
              />
              
              {error && (
                <div className="bg-gradient-to-br from-rose-900/40 to-red-900/40 border border-rose-700/50 rounded-xl p-4 flex items-start gap-3 shadow-lg animate-slideInDown">
                  <svg className="w-6 h-6 text-rose-400 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <div className="flex-1">
                    <Text size="sm" className="text-rose-200 font-medium">{error}</Text>
                    {(error.includes("No account found") || error.includes("don't have an account")) && (
                      <Link 
                        to="/signup" 
                        className="inline-block mt-2 text-sm text-rose-300 hover:text-rose-200 font-semibold underline transition-colors"
                      >
                        Create an account now →
                      </Link>
                    )}
                  </div>
                </div>
              )}
              
              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                loading={loading}
                disabled={loading}
              >
                {loading ? "Logging in..." : "Log In"}
              </Button>
              
              <div className="pt-4 border-t border-slate-700/50">
                <Text size="sm" className="text-center text-slate-400">
                  Don't have an account?{" "}
                  <Link to="/signup" className="text-violet-400 hover:text-violet-300 font-semibold hover:underline transition-colors">
                    Sign Up
                  </Link>
                </Text>
              </div>
            </form>
          </CardContent>
        </Card>
      </FadeIn>
    </div>
  );
}
