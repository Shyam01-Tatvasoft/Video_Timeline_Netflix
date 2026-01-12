import { useEffect, useRef, useState } from "react";
import type { PreviewMeta } from "../types/common";
// import { PreviewMeta } from "../types/common";

export default function VideoPreview() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [meta, setMeta] = useState<PreviewMeta | null>(null);
  const [style, setStyle] = useState<React.CSSProperties>({});
  const [position, setPosition] = useState({ x: 0, y: 0 });

  useEffect(() => {
    fetch("http://localhost:4000/metadata/preview.json")
      .then((res) => res.json())
      .then(setMeta);
  }, []);

  // const onHover = (e: React.MouseEvent<HTMLDivElement>) => {
  //   if (!meta || !videoRef.current) return;

  //   const rect = e.currentTarget.getBoundingClientRect();
  //   const percent = (e.clientX - rect.left) / rect.width;
  //   const time = percent * meta.duration;

  //   const index = Math.floor(time / meta.interval);
  //   const spriteIndex = Math.floor(index / meta.thumbsPerSprite);
  //   const sprite = meta.sprites[spriteIndex];

  //   if (!sprite) return;

  //   const localIndex = index - sprite.startIndex;
  //   const x = (localIndex % sprite.columns) * meta.thumbWidth;
  //   const y =
  //     Math.floor(localIndex / sprite.columns) * meta.thumbHeight;

  //   setStyle({
  //     backgroundImage: `url(http://localhost:4000${sprite.url})`,
  //     backgroundPosition: `-${x}px -${y}px`,
  //     width: meta.thumbWidth,
  //     height: meta.thumbHeight,
  //     border: "1px solid #333"
  //   });
  // };
  const onHover = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!meta) return;

    const rect = e.currentTarget.getBoundingClientRect();
    const percent = (e.clientX - rect.left) / rect.width;
    const time = percent * meta.duration;

    const index = Math.floor(time / meta.interval);
    const spriteIndex = Math.floor(index / meta.thumbsPerSprite);
    const sprite = meta.sprites[spriteIndex];
    if (!sprite) return;

    const localIndex = index - sprite.startIndex;
    const x = (localIndex % sprite.columns) * meta.thumbWidth;
    const y = Math.floor(localIndex / sprite.columns) * meta.thumbHeight;

    setStyle({
      backgroundImage: `url(http://localhost:4000${sprite.url})`,
      backgroundPosition: `-${x}px -${y}px`,
      width: meta.thumbWidth,
      height: meta.thumbHeight,
      border: "1px solid #333",
      position: "absolute",
      pointerEvents: "none",
    });

    setPosition({
      x: e.pageX - meta.thumbWidth / 2,
      y: e.pageY - meta.thumbHeight - 12,
    });
  };

  const onLeave = () => setStyle({});

  return (
    <div style={{ padding: 20 }}>
      <video ref={videoRef} src="/sample.mp4" controls width={600} />

      <div
        onMouseMove={onHover}
        onMouseLeave={onLeave}
        style={{
          height: 10,
          background: "#555",
          marginTop: 8,
          cursor: "pointer",
          position: "relative",
        }}
      />

      <div
        style={{
          ...style,
          left: position.x,
          top: position.y,
        }}
      />
    </div>
  );
}
