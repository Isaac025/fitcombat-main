import { pdfToPng } from "pdf-to-png-converter";

export const generateTicketPng = async (pdfBuffer) => {
  const [page] = await pdfToPng(pdfBuffer, {
    viewportScale: 2,
    pagesToProcess: [1],
    returnPageContent: true,
  });

  if (page?.kind !== "content" || !page.content) {
    throw new Error("Could not render ticket PDF as PNG.");
  }

  return page.content;
};
