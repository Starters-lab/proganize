import * as pdfjs from "pdfjs-dist";

// Configure the worker path
// For client-side rendering in Next.js
if (typeof window !== "undefined") {
    pdfjs.GlobalWorkerOptions.workerSrc =
        `//cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjs.version}/pdf.worker.min.js`;
}

export { pdfjs };
