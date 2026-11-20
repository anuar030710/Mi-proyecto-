---
name: upscale-images
description: Upscale (enlarge and sharpen) images with AI using the Upscayl engine (upscayl-bin, Real-ESRGAN on ncnn/Vulkan) and its bundled models — upscayl-standard, upscayl-lite, high-fidelity, remacri, ultramix-balanced, ultrasharp, digital-art. Works on one image or a whole folder (jpg/png/webp), at 2x/3x/4x or to a target width, with output format and compression control. Needs a GPU with Vulkan. Use when the user asks to upscale, enlarge, increase the resolution of, sharpen, or "make HD" an image or a folder of images (ampliar, escalar, mejorar la resolución de imágenes).
license: The skill text and scripts are free to use. The engine and models it downloads keep their own licenses (Upscayl is AGPL-3.0); they are fetched at run time, never committed.
---

# Upscale images with Upscayl

This skill drives the command-line engine behind the Upscayl desktop app
(<https://github.com/upscayl/upscayl>). The engine is `upscayl-bin`, a fork of
Real-ESRGAN-ncnn-vulkan. It runs on the GPU through **Vulkan**; without a Vulkan
device it does not run.

## 1. Check that the machine can run it

Before anything else:

- **GPU with Vulkan.** On Linux check `ls /dev/dri` or `vulkaninfo --summary`.
  A cloud container or CI runner without a GPU usually has none — in that case
  stop and tell the user to run this skill on their own computer (Windows,
  macOS or Linux with a normal graphics card / Apple Silicon). Do not try to
  emulate or install a software Vulkan driver unless the user asks.
- **macOS:** Apple Silicon or a Mac with Metal works (MoltenVK is linked in).
- **Windows:** use Git Bash or WSL to run the scripts below, or follow
  "Manual use" at the end.

## 2. Install the engine and models (once)

```bash
bash .claude/skills/upscale-images/scripts/setup.sh
```

It downloads only the `resources/` folder of the Upscayl repository (binary for
this OS + models, about 350 MB) into `~/.cache/upscayl-skill` (override with
`UPSCAYL_HOME=/some/path`). Nothing is written to the project. Re-running it
updates to the latest version. Never commit the binary or the models.

## 3. Upscale

```bash
bash .claude/skills/upscale-images/scripts/upscale.sh INPUT OUTPUT [options]
```

- `INPUT`: an image (`.jpg`, `.jpeg`, `.png`, `.webp`) or a folder of them.
- `OUTPUT`: a file path (single image) or a folder (batch). Never overwrite the
  original: write to a new name or a new folder (e.g. `foto@4x.png`,
  `assets/upscaled/`) unless the user explicitly asks to replace.

Options (all optional):

| Option | Meaning | Default |
| --- | --- | --- |
| `-n MODEL` | model name (table below) | `upscayl-standard-4x` |
| `-s 2\|3\|4` | output scale | `4` |
| `-w WIDTH` | resize result to this width in px (overrides `-s`) | — |
| `-f png\|jpg\|webp` | output format | input's extension |
| `-c 0-100` | compression (0 = best quality) | `0` |
| `-t SIZE` | tile size; lower it (e.g. `200`, `100`) if you get out-of-memory errors | auto |
| `-g ID` | GPU id when there are several | auto |
| `-x` | TTA mode: slightly better, ~8x slower | off |

Examples:

```bash
# One photo, 4x, default model
bash .claude/skills/upscale-images/scripts/upscale.sh ropa/share.jpg ropa/share@4x.jpg

# A folder of product shots to 2x webp
bash .claude/skills/upscale-images/scripts/upscale.sh ropa/assets ropa/assets-2x -s 2 -f webp -c 10

# An illustration to exactly 1920 px wide
bash .claude/skills/upscale-images/scripts/upscale.sh logo.png logo-1920.png -n digital-art-4x -w 1920
```

## Choosing a model

All bundled models are 4x models; `-s 2`/`-s 3` downscales their 4x result.

| Model | Best for |
| --- | --- |
| `upscayl-standard-4x` | general photos — the safe default |
| `upscayl-lite-4x` | fast, low-memory; good for big batches or weak GPUs |
| `high-fidelity-4x` | photos where faithful detail matters (faces, textures, products) |
| `remacri-4x` | natural photos, slightly sharper look |
| `ultramix-balanced-4x` | mixed content, balanced sharpness/smoothness |
| `ultrasharp-4x` | maximum sharpness; can over-sharpen noisy images |
| `digital-art-4x` | illustrations, anime, drawings, logos, flat-colour art |

If the user doesn't specify, pick from the content: photos → `upscayl-standard-4x`
(or `high-fidelity-4x` for product/clothing shots where detail matters);
drawings/logos → `digital-art-4x`. Say which model you used.

Custom models: any Real-ESRGAN ncnn model (`name.param` + `name.bin`) dropped in
`~/.cache/upscayl-skill/resources/models` works with `-n name`.

## After upscaling

- Report the output path(s) and the new dimensions (`file` or `identify` shows them).
- AI upscaling invents detail. For product photos, mention that small text,
  logos and fabric patterns should be checked by eye.
- 4x outputs are large. For the web, suggest `-s 2` plus `-f webp -c 10-20`,
  or `-w` to the size actually displayed.

## Troubleshooting

- `vkCreateInstance failed` / `invalid gpu device` → no Vulkan GPU. Run it on a
  machine with a GPU (see step 1).
- Crash or black/garbled output → lower tile size: `-t 200`, then `-t 100`.
- Very slow → use `upscayl-lite-4x`, drop `-x`, or a smaller `-s`.
- `Permission denied` on macOS → `xattr -dr com.apple.quarantine ~/.cache/upscayl-skill`.

## Manual use (any OS, including plain Windows)

The binary takes these flags directly:

```
upscayl-bin -i INPUT -o OUTPUT -m MODELS_DIR -n MODEL [-s 2|3|4] [-w WIDTH]
            [-f png|jpg|webp] [-c 0-100] [-t TILE] [-g GPU] [-x] [-v]
```

On Windows the binary is `resources\win\bin\upscayl-bin.exe` (keep the `vcomp140*.dll`
files next to it) and the models are in `resources\models`. Alternatively the
user can just install the Upscayl desktop app from <https://upscayl.org>.
