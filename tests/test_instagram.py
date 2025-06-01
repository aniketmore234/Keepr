#!/usr/bin/env python3
"""
Test script for Instagram processing
"""

import sys
import json
from instagram_processor import extract_instagram_metadata

def test_instagram_urls():
    """Test with some sample Instagram URLs"""
    
    test_urls = [
        "https://www.instagram.com/p/SAMPLE123/",  # This will likely fail but shows the process
        "https://www.instagram.com/reel/SAMPLE456/",  # This will likely fail but shows the process
    ]
    
    print("🧪 Testing Instagram URL processing...")
    print("=" * 50)
    
    for i, url in enumerate(test_urls, 1):
        print(f"\n{i}. Testing URL: {url}")
        print("-" * 30)
        
        try:
            result = extract_instagram_metadata(url)
            print("✅ Result:")
            print(json.dumps(result, indent=2))
        except Exception as e:
            print(f"❌ Error: {e}")
    
    print("\n" + "=" * 50)
    print("🏁 Test completed!")
    print("\nNote: The sample URLs above are fake and will use fallback processing.")
    print("To test with real Instagram URLs, replace the URLs in this script.")

if __name__ == "__main__":
    test_instagram_urls() 