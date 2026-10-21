# Sprite spec (PixelLab)

Drop generated art here. Until a sprite exists, the game falls back to emoji.

## Characters

Four classes: `knight`, `archer`, `mage`, `assassin`.
Generate them **neutral (no team color)**. The game draws a colored base under each one so the same class can be used by several players.

- **Canvas:** 48×48 per frame (64×64 is fine too, but use the same size for everything)
- **Background:** transparent PNG
- **Facing:** right (east). The game flips horizontally for left. Other directions are optional.
- **Style:** side or 3/4 top-down view, consistent across all four classes

| Animation | Frames | Notes |
|---|---|---|
| `idle`   | 2–4 | loops while standing |
| `walk`   | 4–6 | loops while moving tile to tile |
| `attack` | 4–6 | sword swing / bow shot / spell cast / dagger stab |
| `hurt`   | 1–3 | taking a hit |
| `death`  | 3–6 | collapses, last frame can be empty |

## PixelLab prompts

Style prefix for every character:

> 16-bit fantasy RPG pixel art, chibi proportions, clean dark outline, muted neutral palette, no red/blue/yellow/green team colors, side view facing right, transparent background

| Class | Prompt |
|---|---|
| knight | armored knight in silver steel plate armor, round helmet with visor, kite shield on left arm, longsword in right hand, short grey cape |
| archer | elf archer with brown leather hood and tunic, pointed ears, wooden longbow, quiver of arrows on back |
| mage | old wizard in long purple robe and tall pointed hat, long white beard, wooden staff topped with a glowing orb |
| assassin | agile ninja assassin in charcoal black hooded outfit with face mask, two short daggers, crouched ready stance |

| Animation | Prompt |
|---|---|
| idle | idle breathing, subtle up and down bob |
| walk | walk cycle |
| attack (knight) | swings longsword in a wide horizontal slash |
| attack (archer) | draws the bow and releases an arrow |
| attack (mage) | raises staff and casts a fireball, orb flashes |
| attack (assassin) | lunges forward with a quick double dagger stab |
| hurt | flinches backward from being hit |
| death | collapses to the ground |

Projectiles: `wooden arrow flying right`, `small fireball with orange flame trail`, `spinning steel throwing dagger`, `four-pointed steel shuriken`.

## Projectiles (optional, 16×16 or 24×24, pointing right)

`arrow.png`, `fireball.png`, `dagger.png`, `shuriken.png`

## Board tiles (optional, 16×16 or 32×32)

`floor`, `safe` (star), `buff_heal`, `buff_attack`, `buff_range`, `throne` (center/finish)

## File layout

Preferred, one horizontal strip per animation (frames left to right, equal width):

```
public/sprites/knight/idle.png
public/sprites/knight/walk.png
public/sprites/knight/attack.png
...
```

If PixelLab exports something else (separate frames, zip, sprite sheet grid), upload it as-is under
`public/sprites/raw/` and it will be converted.
