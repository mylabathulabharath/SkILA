# XHTML File Renaming Script

This Python script renames .xhtml files according to a specific pattern for document organization.

## Renaming Pattern

The script follows this renaming convention:

- **Main files** (`main.xhtml`, `main-5.xhtml`, etc.) → `01_857AR_fm1.xhtml`
- **Middle files** (chapters, content files) → `02_857AR_ch1.xhtml`, `03_857AR_ch2.xhtml`, etc.
- **Last file** (backmatter, appendix) → `06_857AR_bm1.xhtml`

## Usage

### Basic Usage
```bash
python rename_xhtml_files.py
```
This will scan the current directory for .xhtml files and rename them.

### Specify Directory
```bash
python rename_xhtml_files.py /path/to/your/xhtml/files
```

### Test the Script
```bash
python test_rename_script.py
```
This creates sample files and demonstrates the renaming process.

## How It Works

1. **File Detection**: Scans the specified directory for all `.xhtml` files
2. **Categorization**: 
   - Identifies main files (files matching `main*.xhtml` pattern)
   - Identifies the last file (alphabetically last non-main file)
   - Categorizes remaining files as middle files
3. **Renaming Plan**: Creates a plan showing what each file will be renamed to
4. **Confirmation**: Asks for user confirmation before proceeding
5. **Execution**: Performs the renaming with error handling

## Example

**Before:**
```
main.xhtml
main-5.xhtml
chapter1.xhtml
chapter2.xhtml
chapter3.xhtml
backmatter.xhtml
```

**After:**
```
01_857AR_fm1.xhtml
02_857AR_ch1.xhtml
03_857AR_ch2.xhtml
04_857AR_ch3.xhtml
05_857AR_ch4.xhtml
06_857AR_bm1.xhtml
```

## Features

- **Safe**: Shows renaming plan before execution
- **Flexible**: Handles various file naming patterns
- **Error Handling**: Skips files that can't be renamed
- **Conflict Prevention**: Checks for existing target files
- **Interactive**: Asks for confirmation before proceeding

## Requirements

- Python 3.6 or higher
- No external dependencies (uses only standard library)

## Notes

- The script sorts files alphabetically to ensure consistent ordering
- If multiple main files exist, only the first one becomes `01_857AR_fm1.xhtml`
- Remaining main files are treated as middle files
- The script will skip renaming if a target filename already exists
