import { CHARACTERS } from '../lib/characters';
import { Facing, SpriteAnim, getSheet } from '../lib/sprites';
import { CharacterClass } from '../types/game';

interface Props {
  cls: CharacterClass;
  anim?: SpriteAnim;
  facing?: Facing;
  emojiSize?: string; // font size used by the emoji fallback
}

// Pixel sprite when art is registered, emoji otherwise
export default function CharacterSprite({ cls, anim = 'idle', facing = 'right', emojiSize }: Props) {
  const sheet = getSheet(cls, anim);
  const flip = facing === 'left' ? 'scaleX(-1)' : undefined;

  if (!sheet) {
    return (
      <span className="inline-block leading-none select-none" style={{ fontSize: emojiSize, transform: flip }}>
        <span className={`inline-block ${anim === 'idle' || anim === 'walk' ? 'anim-idle' : ''}`}>{CHARACTERS[cls].emoji}</span>
      </span>
    );
  }

  const duration = sheet.frames / sheet.fps;
  return (
    <div
      key={`${anim}-${sheet.src}`}
      className="w-full h-full pixelated"
      style={{
        backgroundImage: `url(${sheet.src})`,
        backgroundSize: `${sheet.frames * 100}% 100%`,
        backgroundRepeat: 'no-repeat',
        transform: flip,
        animation: sheet.frames > 1
          ? `sprite-play calc(${duration}s / var(--speed, 1)) steps(${sheet.frames}, jump-none) ${sheet.loop ? 'infinite' : 'forwards'}`
          : undefined,
      }}
    />
  );
}
