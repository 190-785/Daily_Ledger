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

const AuthForm = ({ title, buttonText, onSubmit, children }) => (
  <div className="min-h-screen bg-gray-100 flex flex-col justify-center items-center p-4">
    <div className="w-full max-w-md bg-white rounded-xl shadow-lg p-8">
      <h2 className="text-3xl font-bold text-center text-gray-800 mb-6">
        {title}
      </h2>
      <form onSubmit={onSubmit} className="space-y-4">
        {children}
        <button
          type="submit"
          className="w-full bg-blue-600 text-white font-bold py-3 px-4 rounded-lg hover:bg-blue-700 transition duration-300 shadow-lg"
        >
          {buttonText}
        </button>
      </form>
    </div>
  </div>
);

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
    <AuthForm
      title="Create Account"
      buttonText={loading ? "Creating Account..." : "Sign Up"}
      onSubmit={handleSignup}
    >
      <input
        type="text"
        value={name}
        onChange={(e) => setName(e.target.value)}
        placeholder="Full Name"
        required
        className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      
      <div className="relative">
        <input
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value.toLowerCase())}
          placeholder="Username"
          required
          className={`w-full px-4 py-3 bg-gray-50 border rounded-md focus:outline-none focus:ring-2 ${
            username && usernameAvailable 
              ? "border-green-500 focus:ring-green-500" 
              : username && usernameError 
              ? "border-red-500 focus:ring-red-500"
              : "border-gray-300 focus:ring-blue-500"
          }`}
        />
        {usernameChecking && (
          <span className="absolute right-3 top-3.5 text-gray-400 text-sm">Checking...</span>
        )}
        {username && usernameAvailable && !usernameChecking && (
          <span className="absolute right-3 top-3.5 text-green-600 text-xl">✓</span>
        )}
        {usernameError && (
          <p className="text-red-500 text-xs mt-1">{usernameError}</p>
        )}
        {username && usernameAvailable && !usernameError && (
          <p className="text-green-600 text-xs mt-1">Username available!</p>
        )}
      </div>

      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        required
        className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password (min. 6 characters)"
        required
        minLength={6}
        className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
      />
      
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
          {error}
        </div>
      )}
      
      <p className="text-center text-sm text-gray-600">
        Already have an account?{" "}
        <Link to="/login" className="text-blue-600 hover:underline font-medium">
          Log In
        </Link>
      </p>
    </AuthForm>
  );
}
