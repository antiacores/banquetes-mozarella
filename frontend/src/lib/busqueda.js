/**
 * Normaliza un texto: quita acentos, pasa a minúsculas, quita caracteres especiales.
 * Así "sillón" == "sillon" y "copa martini" encuentra "Martini Copa".
 */
export function normalizar(texto) {
  return texto
    .toLowerCase()
    .normalize("NFD")                    // descompone caracteres con acento
    .replace(/[\u0300-\u036f]/g, "")    // quita los diacríticos (acentos)
    .replace(/[^a-z0-9\s]/g, "")        // quita caracteres especiales
    .trim();
}

/**
 * Búsqueda flexible: todas las palabras del query deben aparecer
 * en el texto, en cualquier orden, sin importar acentos.
 */
export function coincideFlexible(texto, query) {
  if (!query.trim()) return true;
  const textoNorm = normalizar(texto);
  const palabras = normalizar(query).split(/\s+/).filter(Boolean);
  return palabras.every(p => textoNorm.includes(p));
}