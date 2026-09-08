export default function Avatar({ url, name, size = 40 }: { url?: string | null; name?: string | null; size?: number }) {
  const inicial = (name ?? '?').trim().charAt(0).toUpperCase() || '?';
  const estilo: React.CSSProperties = {
    width: size, height: size, borderRadius: '50%', flexShrink: 0,
    objectFit: 'cover', border: '1px solid var(--line)', background: 'var(--track)',
  };
  if (url) return <img src={url} alt="" style={estilo} />;
  return (
    <div style={{ ...estilo, display: 'grid', placeItems: 'center', color: 'var(--flare-ink)', fontWeight: 800, fontSize: size * 0.42 }}>
      {inicial}
    </div>
  );
}
