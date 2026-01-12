command for generate sprite image from generated thumbnails.
ffmpeg -i thumbnails/thumb-%03d.jpg -vf tile=5x5 sprites/sprite.jpg

Install ffmpeg from (https://www.gyan.dev/ffmpeg/builds/)
ffmpeg-release-essentials.zip