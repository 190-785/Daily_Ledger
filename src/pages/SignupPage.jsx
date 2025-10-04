import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { createUserWithEmailAndPassword, updateProfile } from "firebase/auth";
import { 
  auth, 
  validateUsernameFormat, 
  checkUsernameAvailability, 
  createUsernameMapping,
  createUserProfile 
} from "../firebase";
import Button from "../components/Button";
import Input from "../components/Input";
import Card, { CardHeader, CardTitle, CardContent } from "../components/Card";
import { FadeIn } from "../components/Animations";
import { Text } from "../components/Typography";

export default function SignupPage() {
  const [name, setName] = useState("");
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [usernameError, setUsernameError] = useState("");
  const [usernameChecking, setUsernameChecking] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState(false);
  const [loading, setLoading] = useState(false);

  // Real-time username validation
  useEffect(() => {
    const checkUsername = async () => {
      if (!username) {
        setUsernameError("");
        setUsernameAvailable(false);
        return;
      }

      // Convert to lowercase
      const normalizedUsername = username.toLowerCase();
      
      // Check format
      if (!validateUsernameFormat(normalizedUsername)) {
        setUsernameError("3-20 characters, lowercase letters, numbers, and underscores only");
        setUsernameAvailable(false);
        return;
      }

      // Check availability
      setUsernameChecking(true);
      try {
        const available = await checkUsernameAvailability(normalizedUsername);
        if (available) {
          setUsernameError("");
          setUsernameAvailable(true);
        } else {
          setUsernameError("Username already taken");
          setUsernameAvailable(false);
        }
      } catch (error) {
        console.error("Error checking username:", error);
        setUsernameError("Error checking username");
        setUsernameAvailable(false);
      } finally {
        setUsernameChecking(false);
      }
    };

    const timeoutId = setTimeout(checkUsername, 500); // Debounce
    return () => clearTimeout(timeoutId);
  }, [username]);

  const handleSignup = async (e) => {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      // Validate inputs
      if (!name.trim()) {
        throw new Error("Please enter your name");
      }
      if (!usernameAvailable) {
        throw new Error("Please choose a valid username");
      }

      const normalizedUsername = username.toLowerCase();

      // Create Firebase Auth account
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Update display name
      await updateProfile(user, { displayName: name });

      // Create username mapping
      await createUsernameMapping(normalizedUsername, user.uid);

      // Create user profile
      await createUserProfile(user.uid, normalizedUsername, name, email);

      // Success - user will be automatically logged in
    } catch (error) {
      setError(error.message);
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-50 via-white to-blue-50 flex flex-col justify-center items-center p-4">
      <FadeIn duration={400}>
        <Card variant="elevated" className="w-full max-w-lg p-2">
          <CardHeader className="pb-4">
            <CardTitle className="text-center text-3xl">Create Your Account</CardTitle>
            <Text size="base" variant="muted" className="text-center mt-3">
              Join Daily Ledger to track your finances
            </Text>
          </CardHeader>
          
          <CardContent className="pt-2">
            <form onSubmit={handleSignup} className="space-y-6">
              <Input
                type="text"
                label="Full Name"
                placeholder="Enter your full name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
                disabled={loading}
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                }
              />
              
              <Input
                type="text"
                label="Username"
                placeholder="Choose a unique username"
                value={username}
                onChange={(e) => setUsername(e.target.value.toLowerCase())}
                error={usernameError}
                helperText={username && usernameAvailable && !usernameError ? "Username available!" : "3-20 characters, lowercase letters, numbers, and underscores"}
                required
                disabled={loading}
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                  </svg>
                }
                rightIcon={
                  usernameChecking ? (
                    <svg className="w-5 h-5 animate-spin text-blue-600" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                  ) : username && usernameAvailable ? (
                    <svg className="w-5 h-5 text-green-600" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                    </svg>
                  ) : null
                }
              />
              
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
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                }
              />
              
              <Input
                type="password"
                label="Password"
                placeholder="Create a strong password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                helperText="Minimum 6 characters"
                required
                minLength={6}
                disabled={loading}
                icon={
                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                  </svg>
                }
              />
              
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-3 flex items-start gap-2">
                  <svg className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                  <Text size="sm" variant="error">{error}</Text>
                </div>
              )}
              
              <Button
                type="submit"
                variant="primary"
                size="lg"
                fullWidth
                loading={loading}
                disabled={loading || !usernameAvailable}
              >
                {loading ? "Creating Account..." : "Sign Up"}
              </Button>
              
              <Text size="sm" variant="muted" className="text-center">
                Already have an account?{" "}
                <Link to="/login" className="text-blue-600 hover:text-blue-700 font-medium hover:underline transition-colors">
                  Log In
                </Link>
              </Text>
            </form>
          </CardContent>
        </Card>
      </FadeIn>
    </div>
  );
}
