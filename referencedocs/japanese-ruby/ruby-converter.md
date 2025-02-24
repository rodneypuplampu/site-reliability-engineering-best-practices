# Ruby Text Converter

This tool converts Word documents containing Ruby annotations (small glosses above or beside characters) to HTML format using the standard `<ruby>` tag.

## What are Ruby Annotations?

Ruby annotations (also called ruby characters or rubi) are small annotations placed above or beside logographic characters in East Asian writing systems to indicate pronunciation. They're commonly used in:

- Japanese (furigana)
- Chinese (pinyin or zhuyin)
- Korean (for hanja characters)

In Word documents, these are typically implemented using the "phonetic guide" feature.

## Features

- Extracts both base text and ruby annotations from Word documents
- Preserves document structure and formatting
- Generates HTML with proper `<ruby>`, `<rt>`, and `<rp>` tags
- Ensures fallback rendering for browsers without ruby support
- Includes basic CSS styling for proper ruby display

## Requirements

- Python 3.6+
- python-docx
- beautifulsoup4
- lxml

## Installation

1. Clone or download this repository
2. Install the required dependencies:

```bash
pip install python-docx beautifulsoup4 lxml
```

## Usage

### Command Line

```bash
python ruby_converter.py input_file.docx [-o output_file.html]
```

If no output file is specified, the tool will create an HTML file with the same base name as the input file.

### As a Module

```python
from ruby_converter import process_ruby

# Convert a document
output_path = process_ruby("input_file.docx", "output_file.html")
```

## HTML Output Format

The generated HTML uses the standard ruby markup format:

```html
<ruby>東京<rp>(</rp><rt>とうきょう</rt><rp>)</rp></ruby>
```

This includes fallback parentheses for browsers that don't support ruby annotations.

## Limitations

- This tool assumes that ruby annotations in the Word document are implemented using Word's built-in "phonetic guide" feature.
- Complex ruby annotations (where multiple ruby text elements correspond to different parts of the base text) might not be preserved perfectly.
- Some advanced formatting like coloring of ruby annotations might be lost.

## Example

Given a Word document with the Japanese word "東京" (Tokyo) with furigana "とうきょう", the converter will generate:

```html
<ruby>東京<rp>(</rp><rt>とうきょう</rt><rp>)</rp></ruby>
```

Which renders as:

東京(とうきょう) in browsers without ruby support
東京 with とうきょう above it in browsers with ruby support
