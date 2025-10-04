import React, { useState } from "react";
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

export default function LoginPage({ switchToSignup }) {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");

  const handleLogin = async (e) => {
    e.preventDefault();
    setError("");
    try {
      await signInWithEmailAndPassword(auth, email, password);
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <AuthForm title="Login" buttonText="Log In" onSubmit={handleLogin}>
      <input
        type="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        placeholder="Email"
        required
        className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500"
      />
      <input
        type="password"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
        placeholder="Password"
        required
        className="w-full px-4 py-3 bg-gray-50 border border-gray-300 rounded-md focus:outline-none focus:ring-blue-500"
      />
      {error && <p className="text-red-500 text-sm text-center">{error}</p>}
      <p className="text-center text-sm">
        Don't have an account?{" "}
        <button
          type="button"
          onClick={switchToSignup}
          className="text-blue-600 hover:underline"
        >
          Sign Up
        </button>
      </p>
    </AuthForm>
  );
}
