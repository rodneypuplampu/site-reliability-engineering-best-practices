#!/usr/bin/env python3
"""
Ruby Text Converter: Converts Word documents with ruby annotations to HTML format.

This script processes .docx files that contain ruby annotations (small glosses above or
beside logographic characters) and converts them to HTML using the <ruby> tag.
"""

import argparse
import os
import re
from docx import Document
from docx.oxml.ns import qn
from docx.oxml import OxmlElement
from bs4 import BeautifulSoup
import html

def process_ruby(docx_path, output_path=None):
    """
    Process a docx file with ruby annotations and convert to HTML format.
    
    Args:
        docx_path (str): Path to the input .docx file
        output_path (str, optional): Path for the output HTML file
    
    Returns:
        str: The HTML content with ruby annotations
    """
    # Default output path is the same directory and base name as the input file
    if not output_path:
        base_name = os.path.splitext(docx_path)[0]
        output_path = f"{base_name}.html"
    
    # Read the document
    doc = Document(docx_path)
    
    # Create an HTML document
    html_content = ['<!DOCTYPE html>',
                   '<html>',
                   '<head>',
                   '    <meta charset="UTF-8">',
                   '    <title>Converted Ruby Text</title>',
                   '    <style>',
                   '        ruby {',
                   '            display: inline-flex;',
                   '            flex-direction: column-reverse;',
                   '        }',
                   '        rt {',
                   '            text-align: center;',
                   '            font-size: 0.6em;',
                   '            line-height: 1;',
                   '        }',
                   '        .document {',
                   '            max-width: 800px;',
                   '            margin: 0 auto;',
                   '            padding: 20px;',
                   '            font-family: sans-serif;',
                   '            line-height: 1.6;',
                   '        }',
                   '    </style>',
                   '</head>',
                   '<body>',
                   '    <div class="document">']
    
    # XML namespace for Ruby annotations in OOXML
    ruby_ns = "{http://schemas.openxmlformats.org/wordprocessingml/2006/main}"
    
    # Process each paragraph in the document
    for para in doc.paragraphs:
        para_html = []
        
        # Check if the paragraph has ruby annotations
        para_xml = para._element.xml
        
        # If there are no ruby annotations, just add the paragraph text
        if f"{ruby_ns}ruby" not in para_xml:
            if para.text.strip():
                para_html.append(f"<p>{html.escape(para.text)}</p>")
        else:
            # Convert the paragraph XML to BeautifulSoup object for easier parsing
            soup = BeautifulSoup(para_xml, 'xml')
            
            # Start paragraph
            para_html.append("<p>")
            
            # Find all text elements (runs) in the paragraph
            runs = soup.find_all(f"{ruby_ns}r")
            
            i = 0
            while i < len(runs):
                run = runs[i]
                
                # Check if this run is part of a ruby annotation
                ruby_element = run.find_parent(f"{ruby_ns}ruby")
                
                if ruby_element:
                    # Extract base text (the character being annotated)
                    base_texts = ruby_element.find_all(f"{ruby_ns}rubyBase")
                    base_text = ""
                    for bt in base_texts:
                        text_elements = bt.find_all(f"{ruby_ns}t")
                        for te in text_elements:
                            base_text += te.text
                    
                    # Extract ruby text (the annotation)
                    ruby_texts = ruby_element.find_all(f"{ruby_ns}rt")
                    ruby_text = ""
                    for rt in ruby_texts:
                        text_elements = rt.find_all(f"{ruby_ns}t")
                        for te in text_elements:
                            ruby_text += te.text
                    
                    # Create HTML ruby element
                    ruby_html = f'<ruby>{html.escape(base_text)}<rp>(</rp><rt>{html.escape(ruby_text)}</rt><rp>)</rp></ruby>'
                    para_html.append(ruby_html)
                    
                    # Skip all runs within this ruby element
                    while i < len(runs) and runs[i].find_parent(f"{ruby_ns}ruby") == ruby_element:
                        i += 1
                    continue
                
                # For non-ruby text, just add it to the paragraph
                text_elements = run.find_all(f"{ruby_ns}t")
                for te in text_elements:
                    para_html.append(html.escape(te.text))
                
                i += 1
            
            # End paragraph
            para_html.append("</p>")
        
        html_content.append('        ' + ''.join(para_html))
    
    # Finish the HTML document
    html_content.extend(['    </div>',
                        '</body>',
                        '</html>'])
    
    # Write to output file
    with open(output_path, 'w', encoding='utf-8') as f:
        f.write('\n'.join(html_content))
    
    return output_path

def main():
    """
    Main function to parse command line arguments and execute the conversion.
    """
    parser = argparse.ArgumentParser(description='Convert Word documents with ruby annotations to HTML')
    parser.add_argument('input_file', help='Path to the input .docx file')
    parser.add_argument('-o', '--output', help='Path to the output HTML file (optional)')
    
    args = parser.parse_args()
    
    output_path = process_ruby(args.input_file, args.output)
    print(f"Conversion complete. Output saved to: {output_path}")

if __name__ == "__main__":
    main()
