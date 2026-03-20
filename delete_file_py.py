#!/usr/bin/env python
import os
import sys

file_path = r'C:\Users\drvij\Desktop\MuLearn Scet\IEEE\src\app\events\page_new.tsx'
directory_path = r'C:\Users\drvij\Desktop\MuLearn Scet\IEEE\src\app\events'

try:
    if os.path.exists(file_path):
        os.remove(file_path)
        print("SUCCESS: File deleted -", file_path)
    else:
        print("File does not exist:", file_path)
    
    # List remaining files
    print("\nFiles in events directory:")
    if os.path.exists(directory_path):
        files = os.listdir(directory_path)
        for file in files:
            print(" -", file)
    else:
        print("Directory does not exist:", directory_path)
        
except Exception as error:
    print("ERROR:", str(error))
    sys.exit(1)
