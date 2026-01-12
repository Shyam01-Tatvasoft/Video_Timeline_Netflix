export declare type SpriteMeta = {
  url: string;
  startIndex: number;
  columns: number;
}

export declare type PreviewMeta = {
  duration: number;
  interval: number;
  thumbWidth: number;
  thumbHeight: number;
  thumbsPerSprite: number;
  sprites: SpriteMeta[];
}
