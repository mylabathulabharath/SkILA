#!/usr/bin/env python3
"""
Test script to create sample .xhtml files and demonstrate the renaming functionality.
"""

import os
import tempfile
import shutil
from rename_xhtml_files import rename_xhtml_files

def create_sample_files():
    """Create sample .xhtml files for testing."""
    
    # Create a temporary directory for testing
    test_dir = tempfile.mkdtemp(prefix="xhtml_test_")
    print(f"Created test directory: {test_dir}")
    
    # Sample file names that would be renamed
    sample_files = [
        "main.xhtml",
        "main-5.xhtml", 
        "chapter1.xhtml",
        "chapter2.xhtml",
        "chapter3.xhtml",
        "backmatter.xhtml"
    ]
    
    # Create the sample files
    for filename in sample_files:
        file_path = os.path.join(test_dir, filename)
        with open(file_path, 'w') as f:
            f.write(f"<!-- Sample content for {filename} -->\n")
            f.write("<html><body><h1>Sample Content</h1></body></html>")
        print(f"Created: {filename}")
    
    return test_dir

def main():
    """Main test function."""
    print("Creating sample .xhtml files for testing...")
    
    # Create sample files
    test_dir = create_sample_files()
    
    print(f"\nSample files created in: {test_dir}")
    print("Files before renaming:")
    for file in sorted(os.listdir(test_dir)):
        if file.endswith('.xhtml'):
            print(f"  {file}")
    
    print(f"\nRunning renaming script on: {test_dir}")
    print("=" * 50)
    
    # Run the renaming script
    rename_xhtml_files(test_dir)
    
    print("\n" + "=" * 50)
    print("Files after renaming:")
    for file in sorted(os.listdir(test_dir)):
        if file.endswith('.xhtml'):
            print(f"  {file}")
    
    # Clean up
    print(f"\nCleaning up test directory: {test_dir}")
    shutil.rmtree(test_dir)
    print("Test completed!")

if __name__ == "__main__":
    main()
