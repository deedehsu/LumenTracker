import os
import subprocess
import sys

def check_pyinstaller():
    try:
        subprocess.run([sys.executable, "-m", "PyInstaller", "--version"], check=True, capture_output=True)
        return True
    except (subprocess.CalledProcessError, FileNotFoundError):
        return False

if __name__ == "__main__":
    if not check_pyinstaller():
        print("PyInstaller not found. Installing...")
        subprocess.run([sys.executable, "-m", "pip", "install", "pyinstaller"], check=True)
    
    print("Building standalone application...")
    
    # Run PyInstaller
    # --noconfirm: overwrite existing build without asking
    # --onefile: package into a single executable
    # --windowed: no console window (for GUI apps)
    # --name: the name of the executable
    cmd = [
        sys.executable, "-m", "PyInstaller",
        "--noconfirm",
        "--onefile",
        "--windowed",
        "--name", "LumenGatherer",
        "--add-data", "tw_judgment_extractor.py:.",
        "gui_extractor.py"
    ]
    
    try:
        subprocess.run(cmd, check=True)
        print("\n✅ Build successful! The executable is located in the 'dist' folder.")
    except subprocess.CalledProcessError as e:
        print(f"\n❌ Build failed: {e}")
