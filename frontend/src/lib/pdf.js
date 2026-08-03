import { api } from "./api";

export async function abrirPdf(url) {
  try {
    const response = await api.get(url, { responseType: "blob" });
    const blob = new Blob([response.data], { type: "application/pdf" });
    const objectUrl = URL.createObjectURL(blob);
    window.open(objectUrl, "_blank");
    // Liberar memoria después de un momento
    setTimeout(() => URL.revokeObjectURL(objectUrl), 10000);
  } catch (err) {
    alert("No se pudo generar el PDF. Verifica tu conexión.");
    console.error(err);
  }
}