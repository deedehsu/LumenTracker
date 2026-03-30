import sys
import json
import requests
import re
from pathlib import Path

def upload_to_drive(file_path, folder_url):
    print("Google Drive uploads without an API key or OAuth token are not supported for security reasons.")
    print("Please use the file on your Desktop.")
    sys.exit(1)

if __name__ == "__main__":
    upload_to_drive(sys.argv[1], sys.argv[2])
