import React, { useState } from "react";
import { Link } from "react-router-dom";
import { signInWithEmailAndPassword } from "firebase/auth";
import { auth } from "../firebase";

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
      setError(error.message);
      setLoading(false);
    }
  };

  return (
    <AuthForm title="Login" buttonText={loading ? "Logging in..." : "Log In"} onSubmit={handleLogin}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        required
        disabled={loading}
        className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
        required
        disabled={loading}
        className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:opacity-50"
      />
      {error && (
        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md text-sm">
          {error}
        </div>
      )}
      <p className="text-center text-sm text-gray-600">
        Don't have an account?{" "}
        <Link to="/signup" className="text-blue-600 hover:underline font-medium">
          Sign Up
        </Link>
      </p>
    </AuthForm>
  );
}
