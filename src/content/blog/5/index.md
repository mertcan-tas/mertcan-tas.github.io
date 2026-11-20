---
title: 'Stop Rendering Frames Nobody Asked For in Three.js'
seoTitle: 'Three.js Render on Demand: Only Draw When Something Changes'
slug: 'three-js-render-on-demand'
description: 'A product viewer that sits still was still drawing 60 frames a second. Three small changes — render on demand, a shadow map computed once, and a capped pixel ratio — took the idle cost to zero.'
pubDate: '2026-11-20'
updatedDate: '2026-11-20'
tags: ['Three.js', 'WebGL', 'Performance', 'React']
coverImage: '5.jpg'
translationKey: 'threejs-render-on-demand'
---

I recently added a 3D product viewer to a desktop app: open a product, a dialog shows its GLB model, you can orbit around it, zoom, and save a screenshot. It looked great. It also made the laptop fan spin up while the model was just sitting there.

The reason is the line almost every Three.js example starts with:

```ts
renderer.setAnimationLoop(() => {
  controls.update();
  renderer.render(scene, camera);
});
```

This draws a full frame on every display refresh — 60 times a second, or 120 on a ProMotion screen — whether anything changed or not. With soft shadows and antialiasing on a high-DPI display, each of those frames is not cheap. For a game that is fine. For a viewer that spends most of its life sitting still, it's pure waste.

Three changes fixed it.

---

## 1. Render Only When Something Changed

The idea is simple: keep the loop, but skip `renderer.render()` unless there's a reason to draw.

```ts
let dirty = true;

renderer.setAnimationLoop(() => {
  const moved = controls.update();
  if (moved || dirty) {
    renderer.render(scene, camera);
    dirty = false;
  }
});
```

There are only a few reasons a frame can look different from the last one:

- **The camera moved.** `OrbitControls.update()` returns `true` when it changed the camera. With `enableDamping` on, it keeps returning `true` while the camera glides to a stop, so the inertia still looks smooth and the loop goes quiet only once the motion has actually ended.
- **The canvas was resized.** Set `dirty = true` in the `ResizeObserver` callback.
- **The scene changed.** When the model finishes loading, or anything in the scene is added, moved or recolored, set `dirty = true`.
- **An animation is running.** I have a "fly to this view" button that eases the camera over half a second. While that animation is active, the condition includes it:

```ts
if (moved || flight || dirty) { ... }
```

Why keep `setAnimationLoop` at all instead of rendering from event handlers? Because it gives you one place where drawing happens, synced to the display, and checking two booleans 60 times a second costs nothing. The expensive part was never the loop, it was the draw.

---

## 2. Compute the Shadow Map Once

Soft shadows are the most expensive part of this scene. To draw them, Three.js first renders the whole scene from the light's point of view into a shadow map (here 2048 × 2048), and by default it does this **on every frame**.

But look at what a shadow depends on: the light and the objects. In a product viewer, neither of them moves. Only the camera does, and moving the camera doesn't change where a shadow falls. So the shadow map only needs to be computed once:

```ts
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.shadowMap.autoUpdate = false;

loader.load(url, (gltf) => {
  scene.add(gltf.scene);
  renderer.shadowMap.needsUpdate = true;
  dirty = true;
});
```

`autoUpdate = false` turns off the per-frame shadow pass; `needsUpdate = true` asks for exactly one, on the next render. Set it again whenever the light or an object moves — in my case only when the model loads, and when the "exploded view" pulls the parts apart.

This one applies even if you can't use render-on-demand: in any scene where the light and the shadow-casting objects are static, every per-frame shadow pass is repeated work.

---

## 3. Cap the Pixel Ratio

The usual advice is:

```ts
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
```

On a Retina screen that means rendering at twice the width and twice the height — four times the pixels. Dropping the cap to 1.5:

```ts
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
```

gives 1.5² = 2.25 pixels per CSS pixel instead of 4, so **44% fewer pixels** to shade on every frame. With antialiasing on, I honestly can't see the difference on a model in a dialog. If your scene has thin lines or small text, test it; for smooth product surfaces, 1.5 is a good trade.

---

## The Screenshot Gotcha

The viewer has a "save image" button that reads the canvas. The old code made this work with:

```ts
new THREE.WebGLRenderer({ preserveDrawingBuffer: true });
```

`preserveDrawingBuffer` tells the browser to keep the last frame around after it's been shown, which can cost performance on some GPUs. And with render-on-demand you have a subtle problem anyway: the last frame might be stale.

The cleaner fix is to drop the flag and render right before you read the canvas, in the same task:

```ts
function snapshot(): Promise<Blob | null> {
  renderer.render(scene, camera);
  return new Promise((resolve) =>
    renderer.domElement.toBlob(resolve, 'image/png'),
  );
}
```

The drawing buffer is still valid until the browser composites the frame, so reading it immediately after `render()` always gets a fresh, complete image.

---

## Wrapping Up

The whole change was about fifteen lines:

| Change | What it saves |
|---|---|
| Render only when `controls.update()`, a resize, a scene change or an animation asks for it | Every frame while the model sits still |
| `shadowMap.autoUpdate = false` + `needsUpdate` on change | The shadow pass on every frame, even while orbiting |
| Pixel ratio capped at 1.5 instead of 2 | 44% of the pixels on high-DPI screens |
| No `preserveDrawingBuffer`, render right before a screenshot | An extra buffer copy, and stale screenshots |

None of this is clever. It's mostly noticing that the default Three.js loop is built for games, and a product viewer is not a game. If your scene sits still most of the time, it should cost nothing most of the time.
