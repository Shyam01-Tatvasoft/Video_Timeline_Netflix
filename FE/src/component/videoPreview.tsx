import { useRef, useState } from "react";

const PREVIEW = {
  sprite: "http://localhost:4000/sprites/sprite.jpg",
  thumbWidth: 160,
  thumbHeight: 90,
  interval: 2,
  columns: 5,
};

export default function VideoPlayer() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [style, setStyle] = useState({});

  const onHover = (e: React.MouseEvent<HTMLDivElement>) => {
    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    const duration = videoRef.current?.duration || 0;
    const time = percent * duration;

    const index = Math.floor(time / PREVIEW.interval);
    const x = (index % PREVIEW.columns) * PREVIEW.thumbWidth;
    const y = Math.floor(index / PREVIEW.columns) * PREVIEW.thumbHeight;

    setStyle({
      backgroundImage: `url(${PREVIEW.sprite})`,
      backgroundPosition: `-${x}px -${y}px`,
      width: PREVIEW.thumbWidth,
      height: PREVIEW.thumbHeight,
    });
  };

  return (
    <div>
      <video ref={videoRef} src="/sample.mp4" controls width="600" />
      <div
        onMouseMove={onHover}
        style={{ height: 10, background: "#444", marginTop: 10 }}
      />
      <div style={style} />
    </div>
  );
}
