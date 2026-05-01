import os
import fitz  # PyMuPDF
from pathlib import Path

def convert_pdf_to_images(pdf_path, output_folder):
    """
    Converts each page of a PDF to a high-res image.
    """
    if not os.path.exists(output_folder):
        os.makedirs(output_folder)
        
    doc = fitz.open(pdf_path)
    base_name = Path(pdf_path).stem
    
    for page_num in range(len(doc)):
        page = doc.load_page(page_num)
        # High resolution (z=2.0)
        pix = page.get_pixmap(matrix=fitz.Matrix(2.0, 2.0))
        output_file = os.path.join(output_folder, f"{base_name}_page_{page_num+1}.jpg")
        pix.save(output_file)
        print(f"Exported: {output_file}")
    
    doc.close()

def main():
    # Get the directory where this script is located
    current_dir = Path(__file__).parent.parent
    
    source_dir = current_dir / "backend" / "acewassce"
    q_dir = current_dir / "data_pipeline" / "raw_questions"
    s_dir = current_dir / "data_pipeline" / "raw_schemes"
    
    print(f"Searching for PDFs in: {source_dir.resolve()}")
    
    # Ensure raw directories exist
    q_dir.mkdir(parents=True, exist_ok=True)
    s_dir.mkdir(parents=True, exist_ok=True)
    
    for pdf_file in source_dir.glob("*.pdf"):
        name = pdf_file.name.upper()
        if "SOLUTION" in name or "MARKING" in name:
            print(f"Processing Scheme PDF: {pdf_file.name}")
            convert_pdf_to_images(str(pdf_file), str(s_dir))
        else:
            print(f"Processing Question PDF: {pdf_file.name}")
            convert_pdf_to_images(str(pdf_file), str(q_dir))

if __name__ == "__main__":
    main()
