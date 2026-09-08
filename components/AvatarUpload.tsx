'use client';
import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import { supabaseBrowser } from '@/lib/supabase-browser';
import Avatar from './Avatar';

/** Recorta al centro y reduce a 512 px para que la subida sea liviana. */
async function reducir(file: File): Promise<Blob> {
  const img = await createImageBitmap(file);
  const lado = Math.min(img.width, img.height);
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 512;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(img, (img.width - lado) / 2, (img.height - lado) / 2, lado, lado, 0, 0, 512, 512);
  return new Promise((res) => canvas.toBlob((b) => res(b!), 'image/jpeg', 0.85));
}

export default function AvatarUpload({ userId, url, name }: { userId: string; url?: string | null; name?: string | null }) {
  const r = useRouter();
  const input = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [preview, setPreview] = useState<string | null>(null);

  async function subir(file: File) {
    setBusy(true); setMsg('');
    try {
      const blob = await reducir(file);
      setPreview(URL.createObjectURL(blob));
      const sb = supabaseBrowser();
      const path = `${userId}/perfil.jpg`;
      const { error } = await sb.storage.from('avatars').upload(path, blob, { upsert: true, contentType: 'image/jpeg' });
      if (error) throw error;
      const { data } = sb.storage.from('avatars').getPublicUrl(path);
      // El sufijo evita que el navegador muestre la foto anterior guardada en caché
      const publicUrl = `${data.publicUrl}?v=${Date.now()}`;
      const { error: e2 } = await sb.from('profiles').update({ avatar_url: publicUrl }).eq('id', userId);
      if (e2) throw e2;
      setMsg('Foto actualizada.');
      r.refresh();
    } catch (e: any) {
      setMsg(e?.message ?? 'No se pudo subir la foto.');
      setPreview(null);
    }
    setBusy(false);
  }

  return (
    <div style={{ display: 'flex', gap: 14, alignItems: 'center', marginBottom: 16 }}>
      <Avatar url={preview ?? url} name={name} size={64} />
      <div style={{ flex: 1 }}>
        <input ref={input} type="file" accept="image/*" style={{ display: 'none' }}
          onChange={(e) => { const f = e.target.files?.[0]; if (f) subir(f); }} />
        <button className="btn ghost" style={{ padding: '7px 14px', fontSize: 13 }} onClick={() => input.current?.click()} disabled={busy}>
          {busy ? 'Subiendo…' : url ? 'Cambiar foto' : 'Subir foto'}
        </button>
        {msg && <div className="muted" style={{ fontSize: 12, marginTop: 4 }}>{msg}</div>}
      </div>
    </div>
  );
}
