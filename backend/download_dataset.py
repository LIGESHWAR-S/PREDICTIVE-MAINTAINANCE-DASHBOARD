import os
import urllib.request

url = "https://archive.ics.uci.edu/ml/machine-learning-databases/00601/ai4i2020.csv"
target_dir = "uploads"
target_path = os.path.join(target_dir, "ai4i2020.csv")

print(f"Downloading dataset from UCI Machine Learning Repository...")
print(f"URL: {url}")

try:
    os.makedirs(target_dir, exist_ok=True)
    urllib.request.urlretrieve(url, target_path)
    print(f"Success! Dataset downloaded and saved to: {target_path}")
except Exception as e:
    print(f"Failed to download: {e}")
    # Try alternative URL if primary UCI URL changes
    fallback_url = "https://raw.githubusercontent.com/rdisipio/ai4i2020/master/ai4i2020.csv"
    print(f"Attempting fallback download from: {fallback_url}")
    try:
        urllib.request.urlretrieve(fallback_url, target_path)
        print(f"Success! Dataset downloaded from fallback to: {target_path}")
    except Exception as ex:
        print(f"Fallback download also failed: {ex}")
