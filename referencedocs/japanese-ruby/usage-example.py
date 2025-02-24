# Example of how to use the Ruby Text Converter

from ruby_converter import process_ruby  # Import the main function

# Convert a single document
output_path = process_ruby("japanese_textbook.docx")
print(f"Document converted successfully! Output saved to: {output_path}")

# Process multiple documents in a directory
import os

def batch_convert(directory_path):
    """Convert all .docx files in a directory that may contain ruby annotations"""
    docx_files = [f for f in os.listdir(directory_path) if f.endswith('.docx')]
    
    for docx_file in docx_files:
        input_path = os.path.join(directory_path, docx_file)
        output_path = os.path.join(directory_path, os.path.splitext(docx_file)[0] + '.html')
        
        try:
            process_ruby(input_path, output_path)
            print(f"Converted: {docx_file} → {os.path.basename(output_path)}")
        except Exception as e:
            print(f"Error converting {docx_file}: {str(e)}")
    
    print(f"Batch conversion complete. Processed {len(docx_files)} files.")

# Example usage:
# batch_convert("/path/to/documents")
