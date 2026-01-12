command for generate sprite image from generated thumbnails.
ffmpeg -i thumbnails/img%03d.jpg -vf tile=5x5 sprites/sprite.jpg
ffmpeg -i thumbnails/thumb-%03d.jpg -vf tile=5x5 sprites/sprite.jpg
