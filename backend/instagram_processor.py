#!/usr/bin/env python3
"""
Instagram URL processor for Keepr app
Extracts metadata from Instagram posts/reels using instaloader
"""

import sys
import json
import instaloader
import re
from urllib.parse import urlparse

# Initialize Instaloader (exact copy from MemoryApp)
insta_loader = instaloader.Instaloader(
    download_videos=False,
    download_pictures=False,
    download_video_thumbnails=False,
    save_metadata=False,
    quiet=True  # Reduce console output
)

def extract_instagram_metadata(url: str) -> dict:
    """Extract metadata from Instagram URL using instaloader - exact copy from MemoryApp"""
    try:
        print(f"🔍 Extracting Instagram metadata from: {url}", file=sys.stderr)
        
        # Remove query parameters first (e.g., ?igsh=...)
        clean_url = url.split('?')[0]
        print(f"🧹 Cleaned URL: {clean_url}", file=sys.stderr)
        
        # Extract shortcode from URL (exact same logic as MemoryApp)
        shortcode = clean_url.strip('/').split("/")[-1]
        if not shortcode:
            raise ValueError("Could not extract shortcode from URL")
        
        print(f"📱 Extracted shortcode: {shortcode}", file=sys.stderr)
        
        # Load post using instaloader (exact same as MemoryApp)
        try:
            post = instaloader.Post.from_shortcode(insta_loader.context, shortcode)
        except Exception as e:
            print(f"⚠️ Instaloader failed: {e}", file=sys.stderr)
            # Fallback to basic extraction if instaloader fails
            return extract_instagram_fallback(url)
        
        # Extract all available data (exact same as MemoryApp)
        username = post.owner_username if hasattr(post, 'owner_username') else "unknown_user"
        caption = post.caption if hasattr(post, 'caption') and post.caption else ""
        
        # Extract hashtags (exact same as MemoryApp)
        hashtags = []
        if hasattr(post, 'caption_hashtags'):
            hashtags = list(post.caption_hashtags)
        
        # Determine post type from URL (exact same as MemoryApp)
        post_type = "post"
        if "/reel/" in url:
            post_type = "reel"
        elif "/stories/" in url:
            post_type = "story"
        elif "/p/" in url:
            post_type = "post"
        
        # Create title (exact same as MemoryApp)
        if caption and len(caption) > 0:
            # Use first line of caption or first 50 chars for title
            title_text = caption.split('\n')[0] if '\n' in caption else caption
            title = f"{title_text[:50]}..." if len(title_text) > 50 else title_text
        else:
            title = f"Instagram {post_type.title()} by @{username}"
        
        # Clean up caption (exact same as MemoryApp)
        if caption:
            caption = ' '.join(caption.split())  # Normalize whitespace
            # Limit caption length for processing
            if len(caption) > 1000:
                caption = caption[:1000] + "..."
        
        # Result structure - exact copy from MemoryApp
        result = {
            "success": True,
            "platform": "instagram",
            "url": url,
            "title": title,
            "caption": caption,
            "description": caption if caption else f"Instagram {post_type} by @{username}",
            "username": username,
            "hashtags": hashtags,
            "type": post_type,
            "domain": "instagram.com",
            "content_type": "social_media",
            "category": "social_media",
            "estimated_read_time": "1-2 minutes",
            "target_audience": "general",
            "relevance_score": 7.0,
            "tags": ["instagram", post_type] + hashtags[:5]  # Limit hashtags
        }
        
        print(f"✅ Successfully extracted Instagram data:", file=sys.stderr)
        print(f"   Username: @{username}", file=sys.stderr)
        print(f"   Caption: {caption[:100]}..." if len(caption) > 100 else f"   Caption: {caption}", file=sys.stderr)
        print(f"   Hashtags: {hashtags}", file=sys.stderr)
        print(f"   Type: {post_type}", file=sys.stderr)
        
        return result
        
    except Exception as e:
        print(f"❌ Error extracting Instagram metadata: {e}", file=sys.stderr)
        return extract_instagram_fallback(url)

def extract_instagram_fallback(url: str) -> dict:
    """Fallback Instagram extraction using basic URL parsing - exact copy from MemoryApp"""
    print("🔄 Using fallback Instagram extraction method", file=sys.stderr)
    
    # Try to extract username from URL pattern (exact same as MemoryApp)
    username = "unknown_user"
    try:
        # Pattern: https://www.instagram.com/username/p/shortcode/
        url_parts = url.split('/')
        if len(url_parts) >= 4:
            for i, part in enumerate(url_parts):
                if part in ["p", "reel", "stories"] and i > 0:
                    potential_username = url_parts[i-1]
                    if potential_username and potential_username != "www.instagram.com":
                        username = potential_username
                        break
    except:
        pass
    
    # Determine post type (exact same as MemoryApp)
    post_type = "post"
    if "/reel/" in url:
        post_type = "reel"
    elif "/stories/" in url:
        post_type = "story"
    
    # Return exact same structure as MemoryApp fallback
    return {
        "success": False,
        "platform": "instagram",
        "url": url,  # Use the actual URL passed in
        "title": f"Instagram {post_type.title()} by @{username}",
        "caption": "",
        "description": f"Instagram {post_type} by @{username} (limited data available)",
        "username": username,
        "hashtags": [],
        "type": post_type,
        "domain": "instagram.com",
        "content_type": "social_media",
        "category": "social_media",
        "estimated_read_time": "1-2 minutes",
        "target_audience": "general",
        "relevance_score": 5.0,
        "tags": ["instagram", post_type],
        "note": "Extracted using fallback method - limited data available"
    }

def main():
    """Main function to process command line arguments"""
    if len(sys.argv) != 2:
        print(json.dumps({"error": "Usage: python instagram_processor.py <instagram_url>"}))
        sys.exit(1)
    
    url = sys.argv[1]
    
    # Validate Instagram URL
    if "instagram.com" not in url:
        print(json.dumps({"error": "Not a valid Instagram URL"}))
        sys.exit(1)
    
    try:
        result = extract_instagram_metadata(url)
        print(json.dumps(result, indent=2))
    except Exception as e:
        error_result = {
            "error": str(e),
            "success": False,
            "platform": "instagram",
            "url": url
        }
        print(json.dumps(error_result, indent=2))
        sys.exit(1)

if __name__ == "__main__":
    main() 