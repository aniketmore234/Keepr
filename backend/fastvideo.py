from moviepy import VideoFileClip, concatenate_videoclips, vfx

def parse_timestamps(timestamp_list):
    """Convert ['00:00-00:15', '00:20-00:30'] to [(0,15), (20,30)] in seconds."""
    def to_seconds(t):
        mins, secs = map(int, t.split(":"))
        return mins * 60 + secs

    ranges = []
    for item in timestamp_list:
        start, end = item.split("-")
        ranges.append((to_seconds(start), to_seconds(end)))
    return ranges

def speed_up_segments(video_path, timestamps, speed_factor, output_path):
    clip = VideoFileClip(video_path)
    ranges = parse_timestamps(timestamps)

    segments = []
    current_time = 0

    for start, end in ranges:
        # Normal speed part before this segment
        if current_time < start:
            segments.append(clip.subclipped(current_time, start))

        # Sped-up segment
        sped_up = clip.subclipped(start, end).with_effects([vfx.MultiplySpeed(speed_factor)])
        segments.append(sped_up)

        current_time = end

    # Remainder of the video
    if current_time < clip.duration:
        segments.append(clip.subclipped(current_time, clip.duration))

    final = concatenate_videoclips(segments)
    final.write_videofile(output_path, codec="libx264")

# Example usage
video_path = "1.mp4"
output_path = "output_spedup.mp4"
timestamps = ["00:02-00:54"]
speed_factor = 2  # 2x speed

speed_up_segments(video_path, timestamps, speed_factor, output_path)
