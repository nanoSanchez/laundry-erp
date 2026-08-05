import { useState } from "react";
import { Navigate } from "react-router-dom";

import { useAuth } from "@/hooks/useAuth";

export default function LoginPage() {
  const { signIn, user } = useAuth();

  const [email, setEmail] = useState("admin@laundry.com");
  const [password, setPassword] = useState("Admin123456!");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  if (user) {
    return <Navigate to="/" replace />;
  }

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setLoading(true);
    setError("");

    try {
      await signIn(email, password);
    } catch (err) {
      console.error(err);
      setError("Correo o contraseña incorrectos.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100">
      <form onSubmit={handleSubmit} className="w-full max-w-md rounded-xl bg-white p-8 shadow-lg">
        <h1 className="mb-2 text-center text-3xl font-bold">Laundry ERP</h1>

        <p className="mb-8 text-center text-slate-500">Iniciar sesión</p>

        <label className="mb-2 block text-sm font-medium">Correo electrónico</label>

        <input
          className="mb-4 w-full rounded-lg border p-3"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
        />

        <label className="mb-2 block text-sm font-medium">Contraseña</label>

        <input
          className="mb-6 w-full rounded-lg border p-3"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
        />

        {error && <div className="mb-4 rounded-lg bg-red-100 p-3 text-red-700">{error}</div>}

        <button
          disabled={loading}
          className="w-full rounded-lg bg-blue-600 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Ingresando..." : "Ingresar"}
        </button>
      </form>
    </div>
  );
}
