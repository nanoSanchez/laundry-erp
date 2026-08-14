import { useEffect, useState, type ReactNode } from "react";
import { useForm } from "react-hook-form";

import { useCreateBranch, useUpdateBranch, useUploadBranchLogo } from "../hooks/useBranchMutations";
import type { Branch, BranchInput } from "../types/branch";

interface Props { branch?: Branch | null; onSuccess: () => void; }

const defaults: BranchInput = {
  code: "", name: "", company_name: "", nit: "", address: null, phone: null, email: null, currency_code: "BOB",
};

export default function BranchForm({ branch, onSuccess }: Props) {
  const createBranch = useCreateBranch();
  const updateBranch = useUpdateBranch();
  const uploadLogo = useUploadBranchLogo();
  const [logo, setLogo] = useState<File | null>(null);
  const [saveError, setSaveError] = useState<string | null>(null);
  const editing = Boolean(branch);
  const { register, handleSubmit, reset, formState: { errors } } = useForm<BranchInput>({ defaultValues: defaults });

  useEffect(() => {
    if (!branch) { reset(defaults); return; }
    reset({ code: branch.code, name: branch.name, company_name: branch.company_name ?? "", nit: branch.nit ?? "", address: branch.address, phone: branch.phone, email: branch.email, currency_code: branch.currency_code });
  }, [branch, reset]);

  async function submit(values: BranchInput) {
    setSaveError(null);
    const normalized: BranchInput = {
      ...values,
      code: values.code.trim().toUpperCase(),
      name: values.name.trim(),
      company_name: values.company_name?.trim() || null,
      nit: values.nit?.trim() || null,
      address: values.address?.trim() || null,
      phone: values.phone?.trim() || null,
      email: values.email?.trim() || null,
      currency_code: values.currency_code.trim().toUpperCase(),
    };
    try {
      const saved = branch ? (await updateBranch.mutateAsync({ id: branch.id, branch: normalized }), branch) : await createBranch.mutateAsync(normalized);
      if (logo) await uploadLogo.mutateAsync({ branchId: saved.id, file: logo });
      onSuccess();
    } catch (reason) {
      setSaveError(`No se pudo guardar la sucursal: ${reason instanceof Error ? reason.message : "Error desconocido."}`);
    }
  }

  const saving = createBranch.isPending || updateBranch.isPending || uploadLogo.isPending;
  return <form onSubmit={handleSubmit(submit)} className="space-y-4">
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Código" id="branch-code" error={errors.code?.message}><input id="branch-code" {...register("code", { required: "El código es obligatorio", pattern: { value: /^[A-Za-z]{2,5}$/, message: "Usa entre 2 y 5 letras" } })} className="w-full rounded-lg border p-3" placeholder="LPA" /></Field>
      <Field label="Nombre de la sucursal" id="branch-name" error={errors.name?.message}><input id="branch-name" {...register("name", { required: "El nombre es obligatorio" })} className="w-full rounded-lg border p-3" placeholder="Sucursal Central" /></Field>
    </div>
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Nombre de la empresa" id="branch-company-name" error={errors.company_name?.message}><input id="branch-company-name" {...register("company_name", { required: "El nombre de la empresa es obligatorio" })} className="w-full rounded-lg border p-3" placeholder="Lavandería Ejemplo S.R.L." /></Field>
      <Field label="NIT" id="branch-nit" error={errors.nit?.message}><input id="branch-nit" {...register("nit", { required: "El NIT es obligatorio" })} className="w-full rounded-lg border p-3" placeholder="1234567890" /></Field>
    </div>
    <Field label="Dirección" id="branch-address"><input id="branch-address" {...register("address")} className="w-full rounded-lg border p-3" placeholder="Dirección opcional" /></Field>
    <div className="grid gap-4 sm:grid-cols-2">
      <Field label="Teléfono" id="branch-phone"><input id="branch-phone" {...register("phone")} className="w-full rounded-lg border p-3" placeholder="Teléfono opcional" /></Field>
      <Field label="Correo" id="branch-email"><input id="branch-email" type="email" {...register("email")} className="w-full rounded-lg border p-3" placeholder="Correo opcional" /></Field>
    </div>
    <Field label="Moneda" id="branch-currency"><input id="branch-currency" {...register("currency_code", { required: true, pattern: /^[A-Za-z]{3}$/ })} maxLength={3} className="w-full rounded-lg border p-3" /></Field>
    <div><label className="mb-1 block text-sm font-medium" htmlFor="branch-logo">Logo</label><input id="branch-logo" type="file" accept="image/png,image/jpeg,image/webp,image/svg+xml" onChange={(event) => setLogo(event.target.files?.[0] ?? null)} className="block w-full text-sm" /><p className="mt-1 text-xs text-slate-500">PNG, JPG, WebP o SVG; máximo 2 MB.</p></div>
    {saveError && <p className="rounded-lg bg-red-50 p-3 text-sm text-red-700">{saveError}</p>}
    <button type="submit" disabled={saving} className="rounded-lg bg-blue-600 px-5 py-2 font-medium text-white hover:bg-blue-700 disabled:opacity-50">{saving ? "Guardando..." : editing ? "Actualizar sucursal" : "Guardar sucursal"}</button>
  </form>;
}

function Field({ label, id, error, children }: { label: string; id: string; error?: string; children: ReactNode }) {
  return <div><label className="mb-1 block text-sm font-medium" htmlFor={id}>{label}</label>{children}{error && <p className="mt-1 text-sm text-red-600">{error}</p>}</div>;
}
