# Video slot

Drop your video file here as:

```
assets/video.mp4
```

- File name must be exactly `video.mp4` (lowercase)
- The extension references `assets/video.mp4` from both `index.html` and `script.js`
- After dropping, reload the extension on `chrome://extensions` (↻) and open a new tab
- File should be ~32s, muted autoplay works; audio will only play from the corner frame after you click play (Chrome autoplay policy)

Tip: You said your file is `Video_Project.mp4` — just rename/copy it to `video.mp4` in this folder.

Expected structure:
```
BUMBELBEE/
  manifest.json
  index.html
  style.css
  script.js
  assets/
    video.mp4   <-- put it here
    README.md
  icons/
    icon16.png
    icon48.png
    icon128.png
```
