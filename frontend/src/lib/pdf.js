import { api } from "./api";

export async function abrirPdf(url, nombreArchivo = "documento.pdf") {
  try {
    const response = await api.get(url, { responseType: "blob" });
    const blob = new Blob([response.data], { type: "application/pdf" });
    const objectUrl = URL.createObjectURL(blob);

    // Crear un enlace invisible y hacer click — funciona en móvil y desktop
    const link = document.createElement("a");
    link.href = objectUrl;
    link.download = nombreArchivo;  // fuerza descarga en móvil
    link.target = "_blank";         // abre en nueva pestaña en desktop si el browser lo permite
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    setTimeout(() => URL.revokeObjectURL(objectUrl), 10000);
  } catch (err) {
    alert("No se pudo generar el PDF. Verifica tu conexión.");
    console.error(err);
  }
}