// src/__create/fetch.ts
// Versión simplificada sin el wrapper de Create.xyz
// Guardamos referencia al fetch nativo ANTES de que polyfills.ts
// lo reemplace, para evitar recursión infinita.

const nativeFetch = globalThis.fetch.bind(globalThis);

const fetchToWeb = async function fetchWithHeaders(
  input: Parameters<typeof fetch>[0],
  init?: Parameters<typeof fetch>[1]
) {
  return nativeFetch(input, init);
};

export default fetchToWeb;
