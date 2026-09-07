/**
 * Codificador mínimo de archivos .FIT de tipo "workout" (entrenamiento estructurado).
 * Garmin Connect los importa desde Entrenamientos → Importar, y de ahí van al reloj.
 */

const FIT_EPOCH = 631065600; // 1989-12-31T00:00:00Z en segundos unix

const CRC_TABLE = [0x0000, 0xcc01, 0xd801, 0x1400, 0xf001, 0x3c00, 0x2800, 0xe401,
  0xa001, 0x6c00, 0x7800, 0xb401, 0x5000, 0x9c01, 0x8801, 0x4400];

function crc16(bytes: Uint8Array, start = 0, end = bytes.length) {
  let crc = 0;
  for (let i = start; i < end; i++) {
    let tmp = CRC_TABLE[crc & 0xf];
    crc = (crc >> 4) & 0x0fff;
    crc = crc ^ tmp ^ CRC_TABLE[bytes[i] & 0xf];
    tmp = CRC_TABLE[crc & 0xf];
    crc = (crc >> 4) & 0x0fff;
    crc = crc ^ tmp ^ CRC_TABLE[(bytes[i] >> 4) & 0xf];
  }
  return crc & 0xffff;
}

// Tipos base FIT
const T = { ENUM: 0x00, UINT8: 0x02, UINT16: 0x84, UINT32: 0x86, UINT32Z: 0x8c, STRING: 0x07 } as const;
const SIZE: Record<number, number> = { [T.ENUM]: 1, [T.UINT8]: 1, [T.UINT16]: 2, [T.UINT32]: 4, [T.UINT32Z]: 4 };

type Field = { num: number; type: number; value: number | string; size?: number };

class Writer {
  private buf: number[] = [];
  u8(v: number) { this.buf.push(v & 0xff); }
  u16(v: number) { this.u8(v); this.u8(v >> 8); }
  u32(v: number) { this.u16(v); this.u16(v >>> 16); }
  str(s: string, size: number) {
    const b = new TextEncoder().encode(s).slice(0, size - 1);
    for (let i = 0; i < size; i++) this.u8(i < b.length ? b[i] : 0);
  }
  bytes() { return new Uint8Array(this.buf); }
}

function writeMessage(w: Writer, localNum: number, globalNum: number, fields: Field[], defineFirst: boolean) {
  if (defineFirst) {
    w.u8(0x40 | localNum);          // cabecera de definición
    w.u8(0); w.u8(0);               // reservado, little endian
    w.u16(globalNum);
    w.u8(fields.length);
    for (const f of fields) {
      const size = f.type === T.STRING ? (f.size ?? 16) : SIZE[f.type];
      w.u8(f.num); w.u8(size); w.u8(f.type);
    }
  }
  w.u8(localNum);                   // cabecera de datos
  for (const f of fields) {
    if (f.type === T.STRING) w.str(String(f.value), f.size ?? 16);
    else if (f.type === T.UINT32 || f.type === T.UINT32Z) w.u32(Number(f.value));
    else if (f.type === T.UINT16) w.u16(Number(f.value));
    else w.u8(Number(f.value));
  }
}

export type FitStep = {
  name: string;
  /** 'distance' en metros, 'time' en segundos, 'open' = hasta que el atleta pulse vuelta */
  duration: { type: 'distance'; meters: number } | { type: 'time'; seconds: number } | { type: 'open' };
  /** Ritmo objetivo en segundos por km (rango). Sin esto, el paso no tiene alerta de ritmo. */
  paceLow?: number;
  paceHigh?: number;
  intensity: 'warmup' | 'active' | 'rest' | 'cooldown';
  /** Repite desde este índice de paso, este número de veces (solo en pasos de repetición). */
  repeat?: { fromStep: number; times: number };
};

const INTENSITY = { active: 0, rest: 1, warmup: 2, cooldown: 3 };

export function buildWorkoutFit(name: string, steps: FitStep[]): Uint8Array {
  const w = new Writer();

  // file_id
  writeMessage(w, 0, 0, [
    { num: 0, type: T.ENUM, value: 5 },                                    // type = workout
    { num: 1, type: T.UINT16, value: 255 },                                // manufacturer = development
    { num: 2, type: T.UINT16, value: 0 },                                  // product
    { num: 3, type: T.UINT32Z, value: 1 },                                 // serial
    { num: 4, type: T.UINT32, value: Math.floor(Date.now() / 1000) - FIT_EPOCH },
  ], true);

  // workout
  writeMessage(w, 1, 26, [
    { num: 4, type: T.ENUM, value: 1 },                                    // sport = running
    { num: 6, type: T.UINT16, value: steps.length },                       // num_valid_steps
    { num: 8, type: T.STRING, value: name, size: 32 },                     // wkt_name
  ], true);

  // workout_step
  steps.forEach((s, i) => {
    let durationType = 5, durationValue = 0;                               // 5 = open
    if (s.repeat) { durationType = 6; durationValue = s.repeat.fromStep; } // 6 = repeat_until_steps_cmplt
    else if (s.duration.type === 'distance') { durationType = 1; durationValue = Math.round(s.duration.meters * 100); }
    else if (s.duration.type === 'time') { durationType = 0; durationValue = Math.round(s.duration.seconds * 1000); }

    let targetType = 2, targetValue = 0, lo = 0, hi = 0;                   // 2 = open
    if (s.repeat) { targetType = 2; targetValue = s.repeat.times; }
    else if (s.paceLow && s.paceHigh) {
      targetType = 0; targetValue = 0;                                     // 0 = speed, con rango personalizado
      lo = Math.round((1000 / s.paceHigh) * 1000);                         // m/s × 1000 (el ritmo lento da la velocidad baja)
      hi = Math.round((1000 / s.paceLow) * 1000);
    }

    writeMessage(w, 2, 27, [
      { num: 254, type: T.UINT16, value: i },                              // message_index
      { num: 0, type: T.STRING, value: s.name, size: 24 },                 // wkt_step_name
      { num: 1, type: T.ENUM, value: durationType },
      { num: 2, type: T.UINT32, value: durationValue },
      { num: 3, type: T.ENUM, value: targetType },
      { num: 4, type: T.UINT32, value: targetValue },
      { num: 5, type: T.UINT32, value: lo },
      { num: 6, type: T.UINT32, value: hi },
      { num: 7, type: T.ENUM, value: INTENSITY[s.intensity] },
    ], i === 0);
  });

  const data = w.bytes();

  // Cabecera de 14 bytes
  const head = new Writer();
  head.u8(14); head.u8(0x20); head.u16(2140); head.u32(data.length);
  head.u8(0x2e); head.u8(0x46); head.u8(0x49); head.u8(0x54);             // ".FIT"
  const headBytes = head.bytes();
  const headCrc = crc16(headBytes, 0, 12);

  const out = new Uint8Array(14 + data.length + 2);
  out.set(headBytes.slice(0, 12), 0);
  out[12] = headCrc & 0xff; out[13] = (headCrc >> 8) & 0xff;
  out.set(data, 14);
  const fileCrc = crc16(out, 0, 14 + data.length);
  out[14 + data.length] = fileCrc & 0xff;
  out[15 + data.length] = (fileCrc >> 8) & 0xff;
  return out;
}
