interface Props {
  title: string;
  subtitle?: string;
}

export default function PageHeader({ title, subtitle }: Props) {
  return (
    <div className="mb-6">
      <h1 className="text-3xl font-bold">{title}</h1>

      {subtitle && <p className="mt-1 text-slate-500">{subtitle}</p>}
    </div>
  );
}
