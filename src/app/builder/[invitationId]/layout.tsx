export default function BuilderLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="flex h-screen flex-col overflow-hidden">{children}</div>;
}
