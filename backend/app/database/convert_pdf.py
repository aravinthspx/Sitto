import fitz # PyMuPDF
import os

pdf_path = "../reference_docs/ktr_campu_layout.pdf"
out_path = "../public/campus_map.png"

doc = fitz.open(pdf_path)
page = doc.load_page(0)
pix = page.get_pixmap(dpi=150) # High quality image
pix.save(out_path)
print(f"Saved campus map to {out_path}")
