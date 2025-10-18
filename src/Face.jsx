import { h } from 'preact';

export function Face({ name, url, download, position }) {
  const style = {
    position: 'absolute',
    left: `${position.x * 200}px`,
    top: `${position.y * 200}px`,
  };

  return (
    <a href={url} download={download} style={style} title={name}>
      <img src={url} style={{ filter: download ? '' : 'blur(4px)' }} />
    </a>
  );
}