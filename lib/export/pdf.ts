import jsPDF from "jspdf";
import html2canvas from "html2canvas";

// Captures the actual on-screen Cost Breakdown card (totals header,
// allocation bar, pie chart and detailed table, exactly as rendered) as an
// image and lays it into a PDF, so the PDF always matches what's on screen.

export const PDF_MIME_TYPE = "application/pdf";

// Elements marked data-print="hide" (export buttons, toggles, the result-tab
// switcher) are skipped from the capture, so the PDF shows only report content.
function shouldIgnoreElement(element: Element): boolean {
  return element.getAttribute?.("data-print") === "hide";
}

async function buildPdfFromElement(element: HTMLElement): Promise<jsPDF> {
  const canvas = await html2canvas(element, {
    scale: 1.5, // was 2: keeps text and the chart readable at a much smaller size
    backgroundColor: "#ffffff",
    useCORS: true,
    ignoreElements: shouldIgnoreElement,
  });

  // JPEG at 0.85 quality is far smaller than PNG for a screenshot like this
  const imgData = canvas.toDataURL("image/jpeg", 0.85);

  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "pt",
    format: "a4",
    compress: true,
  });

  const pageWidth = pdf.internal.pageSize.getWidth();
  const pageHeight = pdf.internal.pageSize.getHeight();

  const imgWidth = pageWidth;
  const imgHeight = (canvas.height * imgWidth) / canvas.width;

  let heightLeft = imgHeight;
  let position = 0;

  pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
  heightLeft -= pageHeight;

  // If the captured content is taller than one A4 page, spill onto more
  // pages by re-drawing the same image shifted further up each time.
  while (heightLeft > 0) {
    position -= pageHeight;
    pdf.addPage();
    pdf.addImage(imgData, "JPEG", 0, position, imgWidth, imgHeight);
    heightLeft -= pageHeight;
  }

  return pdf;
}

export async function downloadReportPdf(element: HTMLElement): Promise<void> {
  const pdf = await buildPdfFromElement(element);
  pdf.save("PriceMyTrip.pdf");
}

// Same report, returned as an in-memory File for the email-attachment flow.
export async function getReportPdfFile(element: HTMLElement): Promise<File> {
  const pdf = await buildPdfFromElement(element);
  const blob = pdf.output("blob");
  return new File([blob], "PriceMyTrip.pdf", { type: PDF_MIME_TYPE });
}