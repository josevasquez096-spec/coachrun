/** Lo que se ve mientras la pantalla trae sus datos. */
export default function Esqueleto() {
  return (
    <>
      <div className="hueso" style={{ height: 30, width: '45%', marginBottom: 16 }} />
      <div className="hueso" style={{ height: 88, marginBottom: 10 }} />
      <div className="hueso" style={{ height: 88, marginBottom: 10 }} />
      <div className="hueso" style={{ height: 88, opacity: .6 }} />
    </>
  );
}
