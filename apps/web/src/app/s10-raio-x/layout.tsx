// S10 Raio-X standalone layout — bypass MUI [lang] wrapper
// S10RaioXPage renders its own <html> tag (full document)
export default function S10Layout({ children }: { children: React.ReactNode }) {
  return <>{children}</>
}
