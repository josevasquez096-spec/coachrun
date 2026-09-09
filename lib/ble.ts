/** Cinturón de pulso por Bluetooth (perfil estándar Heart Rate 0x180D). */
export type HrHandle = { stop: () => void; nombre: string };

export const bleDisponible = () => typeof navigator !== 'undefined' && 'bluetooth' in navigator;

export async function conectarPulso(onHr: (bpm: number) => void): Promise<HrHandle> {
  const dev = await (navigator as any).bluetooth.requestDevice({ filters: [{ services: ['heart_rate'] }] });
  const server = await dev.gatt.connect();
  const svc = await server.getPrimaryService('heart_rate');
  const car = await svc.getCharacteristic('heart_rate_measurement');
  const escucha = (e: any) => {
    const v: DataView = e.target.value;
    const flags = v.getUint8(0);
    const bpm = flags & 0x01 ? v.getUint16(1, true) : v.getUint8(1);
    if (bpm > 25 && bpm < 240) onHr(bpm);
  };
  car.addEventListener('characteristicvaluechanged', escucha);
  await car.startNotifications();
  return {
    nombre: dev.name ?? 'Sensor',
    stop: () => { try { car.removeEventListener('characteristicvaluechanged', escucha); server.disconnect(); } catch {} },
  };
}
