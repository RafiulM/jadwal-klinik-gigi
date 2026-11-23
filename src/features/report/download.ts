/** Simpan isi berkas (Blob) lewat tautan sementara di browser. */
export function saveFile(filename: string, content: Blob) {
  const url = URL.createObjectURL(content);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.append(link);
  link.click();
  link.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
