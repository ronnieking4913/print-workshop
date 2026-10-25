# Print Workshop

Tools that turn a picture into something to 3D print. Everything runs in the browser on your own computer: nothing to install, works offline, and pictures never leave the machine.

| Page | Makes |
|---|---|
| `Cookie Cutter Maker.html` | A cookie cutter, with an optional stamp for the inside details |
| `Lithophane Maker.html` | A lithophane: a photo that glows on a night light |

Double-click either page to open it in Edge or Chrome. The menu at the top right of each page switches between them.

## Cookie Cutter Maker

Turns a picture into a 3D-printable cookie cutter (STL), with an optional stamp that presses the picture's inside details into the dough.

It replaces a manual workflow of tracing the outline in GIMP (alpha to selection, grow, fill, export) and then extruding and hollowing it in MatterControl. Everything runs in the browser on your own computer: nothing to install, works offline, and pictures never leave the machine.

### Using it

Double-click `Cookie Cutter Maker.html` to open it in Edge or Chrome.

1. **Picture.** Choose or drag in a picture (PNG, JPG, WEBP or AVIF). The background is removed automatically and the preview shows what was kept over a checkerboard. Click leftover background to remove it, or click and drag across several pieces (like writing) to remove them in one go. The buttons above the picture: **Undo** the last click or drag (also right-click, or Ctrl+Z), **Redo** what you undid (also Ctrl+Y), **Reset background** to start over, and **Save picture** to keep the cleaned-up picture as a PNG with a transparent background; load it again later to get the same outline without redoing the cleanup.
2. **Size.** Set the longest side of the cookie and the cutter's height, wall and rim.
3. **Stamp** (optional). Adds a plate with raised lines that prints the picture's inside details into the dough.
4. **Save.** **Download STL** saves `<name>-cutter.stl`, or `<name>-cutter-and-stamp.stl` with the stamp as a second object beside the cutter.

#### Printing

- Print the cutter **rim-side down** and the stamp **flat side down** (lines facing up).
- Both objects are **mirrored** on purpose. You flip them over to use them, so the cookie comes out matching the picture.
- To move or print the two objects separately, use your slicer's **Split to objects** (Cura, PrusaSlicer, Bambu Studio).
- To use the stamp: cut the cookie, leave the cutter in place, press the stamp down inside it, then lift both off.

#### Pictures that work best

- A character with a **dark outline all the way around** (most cartoon and coloring-page art).
- A background in a **different color from the character**, ideally plain white or one solid color.
- The **whole character in the frame**, not cut off by the edge.
- A downloaded picture or screenshot rather than a photo of a print, since photos add texture and shadows.

Background removal works by color, like GIMP's magic wand. Where part of the character matches the background with no outline between them, that part is removed too.

### Settings

| Setting | Default | What it does |
|---|---|---|
| Background | Automatic | Uses the picture's transparency if it has any, otherwise removes the background by color |
| Color tolerance | 40 | How different a color can be and still count as background (5–120) |
| One outline around everything | On | When the picture has separate pieces (like a paw's toes and pad), fills the gaps between them, up to 6 mm wide, so the cutter follows the outside of the whole shape without making it bigger. With the stamp on, the filled gaps are pressed into the dough. Pictures that are already one piece are left alone. Turn off for separate cookies, like letters |
| Fill gaps inside the shape | On | Treats anything enclosed by the outline as part of the cookie |
| Ignore small specks | On | Drops stray bits smaller than 1% of the main shape |
| Edge smoothing | 2 | Rounds off jagged edges (0–8) |
| Longest side | 80 mm | Size of the cookie itself, not including wall and rim |
| Height | 15 mm | Height of the cutting wall |
| Wall | 1.2 mm | Thickness of the cutting wall |
| Grow outline | 0 mm | Expands the shape before adding the wall; joins pieces that are close together |
| Rim to push on | On, 4 mm wide, 1.6 mm thick | A wider, flat edge around the top of the cutter, so it's comfortable to press down on (called the "flange" in the code) |
| Detail | Normal (0.25 mm) | Grid size: Fine 0.15 mm, Normal 0.25 mm, Draft 0.4 mm |
| Stamp: detail sensitivity | 50 | Higher picks up fainter lines (1–100) |
| Stamp: line width / height | 1.2 mm / 2 mm | Size of the raised lines on the stamp |

Fixed stamp values (in `js/stamp.js`): 3 mm plate, 0.6 mm gap to the cutter wall, lines kept 1 mm in from the plate edge, and raised specks smaller than 4 mm² flattened. The two objects sit 5 mm apart in the STL (in `js/stl.js`).

### How it works

```
picture → background.js → shape.js → cutter.js ─┬→ stl.js → .stl file
                                     stamp.js ──┘
```

1. **Background** (`js/background.js`). Floods inward from the picture's edges, removing pixels close in color to the edge. While what's left is still a solid rectangle (for example a colored backdrop inside a white frame), it removes the next layer too. It stops if a layer would remove almost everything, which means that layer is the cookie itself.
2. **Shape** (`js/shape.js`). Removes thin halos and specks, crops to the shape, and scales it onto a millimeter grid.
3. **Cutter** (`js/cutter.js`). Measures every grid cell's distance from the shape (exact Euclidean distance transform). Cells within the wall distance become wall; cells within the rim distance become rim (flange).
4. **Stamp** (`js/stamp.js`). Finds detail lines where the color changes sharply inside the shape (Sobel edge detection) and thickens them to the line width. It also raises the gaps that were filled in to make one outline (like the spaces between a paw's toes and pad), so the cookie keeps those details. Everything sits on a plate inset from the cutter wall.
5. **STL** (`js/stl.js`). Turns each raised cell into a block, keeps only the outside faces, mirrors left to right, and writes a binary STL. The mesh is closed, and every face points outwards.

### Project layout

| File | Purpose |
|---|---|
| `Cookie Cutter Maker.html` | The page and its controls (open this to use the app) |
| `styles.css` | The look, with light and dark themes |
| `js/background.js` | Reads the picture and removes the background |
| `js/history.js` | Undo and redo for clicks and drags on the picture |
| `js/shape.js` | Cleans up the shape and puts it on the millimeter grid |
| `js/cutter.js` | Works out the cutting wall and rim |
| `js/stamp.js` | Builds the optional stamp plate and detail lines |
| `js/stl.js` | Writes the 3D file |
| `js/preview.js` | Draws the picture and cutter previews |
| `js/app.js` | Connects the page's controls to the steps above |
| `tests/` | Test runner and tests |

The scripts are plain `<script>` files that share one global object, `CC`, and load in order in `Cookie Cutter Maker.html`. Browsers block JavaScript modules in a page opened by double-clicking, so this keeps the app working without a web server or build step.

### Tests

Double-click `tests/index.html`. Each test shows ✓ or ✗, with a total at the top.

| File | Covers |
|---|---|
| `tests/runner.js` | A small test runner (`test`, `expect(...).toBe`, `toBeCloseTo`, …) plus shared helpers |
| `tests/background.test.js` | Frame and backdrop removal, rectangular cookies kept, transparency, click to remove |
| `tests/editing.test.js` | Drag to remove several pieces, quick drags, undo, redo, replaying edits, saved picture loads back the same |
| `tests/cutter.test.js` | Size, wall and rim thickness and height, rim off, grow outline, one outline around everything, closed mesh, mirroring, empty pictures |
| `tests/stamp.test.js` | Detail lines found, gaps pressed in, no tiny specks, plate fits inside the cutter, plate and line heights, alignment after mirroring, both objects in one STL |
| `tests/layout.test.js` | Long file names, hidden settings, tall/wide/small pictures fitting their panel, picture buttons fitting, toggle switches (builds pieces of the page with the real stylesheet) |

The tests draw their own pictures. Chrome and Edge won't let a page opened from disk read the pixels of image files beside it, so real photos are checked by hand in the app.

When fixing a bug, first add a test that shows the bug (it should fail), then fix the code until it passes.

### Known limitations

- **Webbed gaps.** With One outline around everything on, deep notches between pieces (like between toes) are smoothed over.
- **Stair-stepped edges.** The model is built from grid cells (0.25 mm by default), so edges have tiny steps. They're too small to show up in a print.
- **Large files.** A detailed cutter with a stamp can reach about 17 MB. Slicers handle that fine; Draft detail makes it about 2.5 times smaller.
- **Single-color backgrounds only.** Busy or photographed backgrounds may need clicking to clean up, or editing the picture first.

### Ideas for later

- Build the geometry from traced outlines instead of grid cells (marching squares, then Clipper2 offsets, then extrusion), for smooth edges, exact wall thickness and much smaller files.
- Define every setting in one `settings.js` that builds the controls, instead of in the page, `app.js` and the tests.
- Add JSDoc type comments so VS Code flags mistakes as you type.
- A brush to paint areas to keep or remove when color-based removal isn't enough.
- A "print nested" option that places the stamp inside the cutter in the STL.
- A 3D preview.

## Lithophane Maker

Turns a photo into a lithophane for a night light: a thin, curved plastic picture. Thin parts let the light through and thick parts block it, so the photo appears when the light is on.

### Using it

Double-click `Lithophane Maker.html` to open it in Edge or Chrome, or click **Lithophane** in the menu on the Cookie Cutter Maker.

1. **Picture.** Choose or drag in a photo. The **Picture** preview shows the whole photo; drag the bright box to choose the part that's printed, and scroll (or use **Zoom**) to zoom in or out. **On the night light** shows the result, curved and glowing. **Brightness** and **Contrast** change how much light gets through. **Turn picture** rotates it a quarter turn.
2. **Size.** Width and height of the picture panel, the frame around it, and how thin (brightest) and thick (darkest) the plastic gets.
3. **Night light fit.** How far the picture sits from the light, how much it curves, and the slot that slides onto the night light.
4. **Save.** **Download STL** saves `<name>-lithophane.stl`.

Print it **standing up, mount side down, in white PLA with 100% infill**. The front is smooth and the bumps face the light.

**The night light measurements are placeholders.** Measure the real night light and change the default `value="…"` numbers in `Lithophane Maker.html` (Size and Night light fit), so every print fits without retyping them.

### Settings

| Setting | Default | What it does |
|---|---|---|
| Zoom | 1.0× | Shows less of the picture, bigger (1–4×) |
| Brightness / Contrast | 0 / 100 | Lighten or darken the picture, and spread light and dark apart |
| Width / Height | 76 / 100 mm | Size of the picture panel, frame included (width is measured along the curve) |
| Frame | 3 mm | Solid border around the picture, at full thickness |
| Thinnest / Thickest | 0.6 / 3 mm | Plastic thickness for white and black |
| Detail | Normal (0.2 mm) | Grid size: Fine 0.15 mm, Normal 0.2 mm, Draft 0.3 mm |
| Light to picture | 20 mm | From the middle of the light to the front of the picture |
| Curved, Curve radius | On, 60 mm | Bends the picture around the light; smaller bends more |
| Mount with slot | On | A strip along the bottom with a slot that slides onto the night light |
| Slot width / depth | 2.2 / 6 mm | Size of the slot |
| Slot walls / Above slot | 1.6 / 3 mm | Plastic beside and above the slot |

### How it works

```
photo → picture.js → thickness.js → mesh.js → stl.js → .stl file
```

1. **Picture** (`js/lithophane/picture.js`). Reads the photo as brightness (see-through parts count as white), and works out which part shows from the zoom and where it was dragged.
2. **Thickness** (`js/lithophane/thickness.js`). Gives every grid point a thickness between Thinnest (white) and Thickest (black), with the frame at full thickness.
3. **Mesh** (`js/lithophane/mesh.js`). Bends the panel around the light, builds the front, back and edges as one closed solid, and adds the mount's three blocks (two slot walls and the top). The parts overlap by 0.3 mm so slicers merge them.
4. **STL** (`js/lithophane/stl.js`). Writes a binary STL.

The **Picture** preview shows the whole photo with the printed part boxed. **On the night light** estimates the glow from the thickness (light fades exponentially through plastic) and wraps it around the curve, on its mount, as seen from the front.

Files: `Lithophane Maker.html` (the page), `lithophane.css` (its colors, on top of `styles.css`), `menu.css` (the menu shared by both pages), `js/lithophane/` (the code, sharing the global object `LM`), and `js/lithophane/app.js` (connects the controls to the steps).

### Tests

Double-click `tests/lithophane.html`. It uses the same `tests/runner.js` as the cookie cutter tests.

| File | Covers |
|---|---|
| `tests/lithophane/picture.test.js` | White thin and black thick, frame, picture the right way up, brightness and contrast, cropping, dragging stays inside the picture, turning, reading pixels |
| `tests/lithophane/mesh.test.js` | Closed mesh with outward faces (curved, flat, with and without mount), amount of plastic, distance from the light, width along the curve, mount under the picture, size readout, clear messages for impossible settings |
| `tests/lithophane/layout.test.js` | Menu fits and highlights the open maker, previews fit their panel, Picture preview marks the printed part, turning turns the color photo, night light preview changes with the picture |

### Known limitations

- **Large files.** At Normal detail the STL is about 38 MB (Fine: about 68 MB). Slicers handle that fine; Draft makes it about half the size.
- **The mount is a best guess** at how the panel attaches: a full-width strip with a slot that opens downward. If the night light attaches differently, the mount in `js/lithophane/mesh.js` needs changing to match.
