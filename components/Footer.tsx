export default function Footer() {
  return (
    <footer style={{ marginTop: 32, paddingTop: 18, borderTop: '1px solid var(--line)', textAlign: 'center' }}>
      <p style={{ fontWeight: 700, fontSize: 14, margin: 0 }}>CoachRun · By JVasquez</p>
      <div style={{ display: 'flex', gap: 14, justifyContent: 'center', margin: '10px 0 12px', fontSize: 13, fontWeight: 700 }}>
        <a href="https://www.strava.com/athletes/145304552" target="_blank" rel="noopener noreferrer" style={{ color: '#FC4C02' }}>Strava</a>
        <a href="https://instagram.com/jvasquez324" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--ink-2)' }}>Instagram</a>
      </div>
      <a href="https://paypal.me/JoseV2403" target="_blank" rel="noopener noreferrer"
        className="btn ghost" style={{ padding: '7px 18px', fontSize: 13 }}>Apoyar el proyecto</a>
    </footer>
  );
}
