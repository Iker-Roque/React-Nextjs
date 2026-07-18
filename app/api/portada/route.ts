import { createClient } from '@supabase/supabase-js';
 
const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);
 
// Caché en memoria del servidor, compartida entre TODOS los usuarios que visiten
// el sitio. Sirve sobre todo para el caso "sin portada": eso NO se guarda en la
// base de datos (para poder reintentarlo más adelante), así que sin esta caché
// cada visita volvería a preguntarle a Google Books por libros sin portada.
const cache = new Map<string, { url: string | null; ts: number }>();
const TTL_MS = 1000 * 60 * 60 * 24 * 30; // 30 días
 
async function guardarPortadaEnBD(id: number, url: string) {
  const { error } = await supabaseAdmin
    .from('libros')
    .update({ img: url })
    // Solo si sigue vacío: evita pisar una portada puesta a mano mientras
    // esta petición estaba en curso.
    .eq('id', id)
    .or('img.is.null,img.eq.');
 
  if (error) {
    console.error(`No se pudo guardar la portada del libro ${id} en la BD:`, error.message);
  }
}
 
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const titulo = searchParams.get('titulo');
  const idParam = searchParams.get('id');
  const id = idParam ? parseInt(idParam, 10) : null;
 
  if (!titulo || titulo.trim() === '') {
    return Response.json({ error: 'Falta el parámetro "titulo"' }, { status: 400 });
  }
 
  const claveCache = titulo.trim().toLowerCase();
  const cacheado = cache.get(claveCache);
 
  if (cacheado && Date.now() - cacheado.ts < TTL_MS) {
    return Response.json({ url: cacheado.url, cache: 'hit' });
  }
 
  try {
    const apiKey = process.env.GOOGLE_BOOKS_API_KEY;
    const url = `https://www.googleapis.com/books/v1/volumes?q=${encodeURIComponent(titulo)}&maxResults=1&key=${apiKey}`;
 
    const res = await fetch(url);
 
    if (res.status === 429 || res.status === 503) {
      // No cacheamos los fallos transitorios: que el próximo request lo reintente
      return Response.json({ url: null, cache: 'miss', reintentar: true }, { status: 200 });
    }
 
    if (!res.ok) {
      throw new Error(`Google Books respondió ${res.status}`);
    }
 
    const data = await res.json();
    const thumb = data.items?.[0]?.volumeInfo?.imageLinks?.thumbnail;
    const urlFinal = thumb
      ? thumb.replace('http:', 'https:').replace('&zoom=5', '&zoom=1')
      : null;
 
    // "sin portada" solo se cachea en memoria (temporal), nunca en la BD, para
    // poder reintentarlo más adelante sin quedar atascado para siempre.
    cache.set(claveCache, { url: urlFinal, ts: Date.now() });
 
    if (urlFinal && id) {
      // No bloqueamos la respuesta al usuario esperando el guardado en BD:
      // se hace en segundo plano, el navegador ya recibe su portada al toque.
      guardarPortadaEnBD(id, urlFinal);
    }
 
    return Response.json({ url: urlFinal, cache: 'miss' });
  } catch (error) {
    console.error(`Error buscando portada de "${titulo}":`, error);
    return Response.json({ url: null, error: 'No se pudo obtener la portada' }, { status: 200 });
  }
}