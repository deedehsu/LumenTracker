
import os
import re
import datetime
import math
from collections import Counter
import logging

# Function to calculate Shannon entropy (a measure of randomness/chaos)
def calculate_entropy(s):
    if not s:
        return 0
    counts = Counter(s)
    probabilities = [float(count) / len(s) for count in counts.values()]
    entropy = -sum([p * math.log2(p) for p in probabilities])
    return entropy

def is_ignored(filepath, gitignore_patterns):
    for pattern in gitignore_patterns:
        # Basic pattern matching (not full gitignore spec, but covers common cases)
        if pattern.startswith('/') and filepath.startswith(pattern[1:]):
            return True
        elif pattern.startswith('*') and filepath.endswith(pattern[1:]):
            return True
        elif pattern in filepath: # Simple substring match for now
            return True
    return False

def run_security_check(repo_path, log_file="SECURITY_LOG.md", gitignore_file=".gitignore"):
    warnings = []
    sensitive_keywords = ['PRIVATE_KEY', 'SECRET', 'API_KEY', 'TOKEN'] # Broadened keywords
    
    # Regex for high-entropy strings (mix of alphanumeric and special chars, min length 32)
    # This is a heuristic and might produce false positives/negatives.
    high_entropy_regex = re.compile(r'[a-zA-Z0-9]{10,}[!@#$%^&*()_+\-=\[\]{};:\'",.<>/?~`]{1,}[a-zA-Z0-9]{10,}', re.IGNORECASE) # At least 10 alphanumeric, 1 special, 10 alphanumeric. Min length 21. For length > 32, use entropy check.

    log_path = os.path.join(repo_path, log_file)
    with open(log_path, 'w') as f:
        f.write(f"# Security Scan Log - {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\\n\\n")

    gitignore_patterns = []
    gitignore_path = os.path.join(repo_path, gitignore_file)
    if os.path.exists(gitignore_path):
        with open(gitignore_path, 'r') as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith('#'):
                    gitignore_patterns.append(line)

    for root, dirs, files in os.walk(repo_path):
        # Exclude .git and node_modules directories
        dirs[:] = [d for d in dirs if d not in ['.git', 'node_modules']]
        
        for file in files:
            filepath = os.path.join(root, file)
            relative_filepath = os.path.relpath(filepath, repo_path)

            if relative_filepath == log_file or relative_filepath == gitignore_file:
                continue

            # Ensure the file is not ignored by .gitignore
            if is_ignored(relative_filepath, gitignore_patterns):
                continue
            
            try:
                with open(filepath, 'r', encoding='utf-8', errors='ignore') as f_content:
                    for line_num, line in enumerate(f_content, 1):
                        # Check for sensitive keywords
                        for keyword in sensitive_keywords:
                            if re.search(r'\\b' + re.escape(keyword) + r'\\b', line, re.IGNORECASE):
                                warning_msg = f"WARNING: Sensitive keyword '{keyword}' found in '{relative_filepath}' at line {line_num} (not ignored by .gitignore)."
                                warnings.append(warning_msg)
                                logging.warning(warning_msg) # Log to console
                                with open(log_path, 'a') as f_log:
                                    f_log.write(f"- {warning_msg}\\n")

                        # Check for high-entropy strings (potential keys)
                        if len(line.strip()) > 32: # Consider lines longer than 32 chars
                            match_entropy = calculate_entropy(line.strip())
                            # A simple heuristic: entropy > 4.0 for long strings
                            if match_entropy > 4.0:
                                warning_msg = f"WARNING: High-entropy string detected in '{relative_filepath}' at line {line_num} (Entropy: {match_entropy:.2f}). Possible key/secret."
                                warnings.append(warning_msg)
                                logging.warning(warning_msg)
                                with open(log_path, 'a') as f_log:
                                    f_log.write(f"- {warning_msg}\\n")
                            
                            # Additional regex check for "chaotic characters" within long strings
                            if high_entropy_regex.search(line.strip()):
                                warning_msg = f"WARNING: Complex character pattern detected in '{relative_filepath}' at line {line_num}. Possible key/secret."
                                warnings.append(warning_msg)
                                logging.warning(warning_msg)
                                with open(log_path, 'a') as f_log:
                                    f_log.write(f"- {warning_msg}\\n")

            except Exception as e:
                error_msg = f"ERROR: Could not read file '{relative_filepath}': {e}"
                logging.error(error_msg)
                with open(log_path, 'a') as f_log:
                    f_log.write(f"- {error_msg}\\n")

    if not warnings:
        no_warning_msg = "INFO: No sensitive strings or high-entropy patterns found in tracked files."
        logging.info(no_warning_msg)
        with open(log_path, 'a') as f_log:
            f_log.write(f"- {no_warning_msg}\\n")
    print(f"Security scan completed. Check {log_file} for details.")

if __name__ == "__main__":
    repo_root = os.path.join(os.getcwd(), "LumenTracker_repo")
    logging.basicConfig(level=logging.INFO, format='%(levelname)s: %(message)s')
    run_security_check(repo_root)
