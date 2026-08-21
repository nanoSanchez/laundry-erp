import { useState } from "react";
import { useNavigate } from "react-router-dom";

import { useAuth } from "@/hooks/useAuth";
import { useBranch } from "@/hooks/useBranch";

export default function LoginPage() {
  const { signIn, signOut, user } = useAuth();
  const { branches, loading: branchesLoading, error: branchesError, selectBranch } = useBranch();
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("Admin123456!");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();

    setLoading(true);
    setError("");

    try {
      await signIn(username, password);
    } catch (err) {
      console.error(err);
      setError("Nombre de usuario o contraseña incorrectos.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-100 p-4">
      <section className="w-full max-w-md rounded-xl bg-white p-8 shadow-lg">
        <h1 className="mb-2 text-center text-3xl font-bold">Laundry ERP</h1>

        {!user ? <>
        <p className="mb-8 text-center text-slate-500">Iniciar sesión</p>

        <form onSubmit={handleSubmit}>
        <label className="mb-2 block text-sm font-medium">Nombre de usuario</label>

        <input
          className="mb-4 w-full rounded-lg border p-3"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          autoComplete="username"
        />

        <label className="mb-2 block text-sm font-medium">Contraseña</label>

        <input
          className="mb-6 w-full rounded-lg border p-3"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
          autoComplete="current-password"
        />

        {error && <div className="mb-4 rounded-lg bg-red-100 p-3 text-red-700">{error}</div>}

        <button
          disabled={loading}
          className="w-full rounded-lg bg-blue-600 py-3 font-semibold text-white hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Validando..." : "Continuar"}
        </button>
        </form>
        </> : <>
          <p className="mb-6 text-center text-slate-500">Selecciona la sucursal con la que trabajarás en esta sesión.</p>
          {branchesLoading ? <p className="rounded-lg bg-slate-50 p-4 text-center text-slate-500">Cargando sucursales...</p> : branchesError ? <div className="rounded-lg bg-red-50 p-4 text-red-700"><p className="font-semibold">No se pudo verificar el acceso a sucursales.</p><p className="mt-1 text-sm">{branchesError}</p></div> : branches.length === 0 ? <p className="rounded-lg bg-amber-50 p-4 text-amber-800">No tienes sucursales asignadas. Solicita acceso a un administrador general.</p> : <div className="space-y-3">{branches.map((branch) => <button key={branch.id} onClick={() => { selectBranch(branch); navigate("/", { replace: true }); }} className="w-full rounded-lg border p-4 text-left hover:border-blue-500 hover:bg-blue-50"><p className="font-semibold">{branch.name}</p><p className="text-sm text-slate-500">Código: {branch.code}</p></button>)}</div>}
          <button onClick={() => void signOut()} className="mt-6 text-sm text-slate-600 underline">Usar otra cuenta</button>
        </>}
      </section>
    </div>
  );
}
