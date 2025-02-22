import pdfToText from "react-pdftotext";

export const extractPDFContent = async (
    file: File,
): Promise<{ text: string; pageCount: number }> => {
    try {
        const text = await pdfToText(file);

        // The page count can be derived from the text or can be set based on the PDF metadata if available
        const pageCount = text.split(/\n\s*\n/).length; // Assuming each page is separated by two new lines

        return {
            text,
            pageCount,
        };
    } catch (error) {
        console.error("Failed to extract text from PDF:", error);
        throw error;
    }
};
