---
title: 'Three.js’te Kimsenin İstemediği Kareleri Çizmeyi Bırakın'
seoTitle: 'Three.js’te İsteğe Bağlı Çizim: Yalnızca Bir Şey Değişince Çiz'
slug: 'three-js-istege-bagli-cizim'
description: 'Yerinde duran bir ürün görüntüleyici yine de saniyede 60 kare çiziyordu. Üç küçük değişiklik (isteğe bağlı çizim, bir kez hesaplanan gölge ve sınırlandırılmış piksel oranı) boşta kalma maliyetini sıfıra indirdi.'
pubDate: '2026-11-20'
updatedDate: '2026-11-20'
tags: ['Three.js', 'WebGL', 'Performance', 'React']
coverImage: '5.jpg'
lang: 'tr'
translationKey: 'threejs-render-on-demand'
---

Geçenlerde bir masaüstü uygulamasına 3D ürün görüntüleyici ekledim: bir ürünü açıyorsunuz, bir pencerede GLB modeli çıkıyor; etrafında dönebiliyor, yakınlaşabiliyor, ekran görüntüsü kaydedebiliyorsunuz. Güzel görünüyordu. Ama model öylece dururken bile dizüstünün fanı dönmeye başlıyordu.

Sebebi, neredeyse her Three.js örneğinin başladığı şu satırlar:

```ts
renderer.setAnimationLoop(() => {
  controls.update();
  renderer.render(scene, camera);
});
```

Bu döngü, bir şey değişsin ya da değişmesin, ekranın her yenilenmesinde tam bir kare çizer: saniyede 60 kez, ProMotion ekranda 120 kez. Yumuşak gölgeler ve kenar yumuşatma açıkken, yüksek çözünürlüklü bir ekranda bu karelerin her biri ucuz değildir. Bir oyun için sorun yok. Ama ömrünün çoğunu kıpırdamadan geçiren bir görüntüleyici için tamamen boşa harcanan iş.

Üç değişiklik sorunu çözdü.

---

## 1. Yalnızca Bir Şey Değişince Çiz

Fikir basit: döngü kalsın, ama çizmek için bir sebep yoksa `renderer.render()` atlansın.

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

Bir karenin bir öncekinden farklı görünmesinin yalnızca birkaç sebebi var:

- **Kamera hareket etti.** `OrbitControls.update()` kamerayı değiştirdiyse `true` döner. `enableDamping` açıkken, kamera süzülerek dururken de `true` dönmeye devam eder. Böylece atalet yine akıcı görünür ve döngü ancak hareket gerçekten bitince susar.
- **Tuval yeniden boyutlandı.** `ResizeObserver` içinde `dirty = true` yapın.
- **Sahne değişti.** Model yüklendiğinde ya da sahnede bir şey eklendiğinde, taşındığında, rengi değiştiğinde `dirty = true` yapın.
- **Bir animasyon sürüyor.** Bende kamerayı yarım saniyede yumuşakça bir görünüme götüren bir "bu açıya git" düğmesi var. Bu animasyon sürerken koşula o da eklenir:

```ts
if (moved || flight || dirty) { ... }
```

Olay dinleyicilerinden doğrudan çizmek yerine neden `setAnimationLoop` hâlâ duruyor? Çünkü çizimin yapıldığı tek bir yer olur, ekranla da eş zamanlı çalışır. Saniyede 60 kez iki boolean kontrol etmenin maliyeti yok denecek kadar azdır. Pahalı olan hiçbir zaman döngü değildi, çizimdi.

---

## 2. Gölge Haritasını Bir Kez Hesapla

Bu sahnenin en pahalı kısmı yumuşak gölgeler. Three.js gölgeleri çizebilmek için önce bütün sahneyi ışığın bakış açısından bir gölge haritasına (burada 2048 × 2048) çizer ve varsayılan olarak bunu **her karede** yapar.

Ama bir gölgenin neye bağlı olduğuna bakın: ışığa ve nesnelere. Bir ürün görüntüleyicide ikisi de hareket etmez, yalnızca kamera hareket eder. Kameranın hareket etmesi de gölgenin düştüğü yeri değiştirmez. Yani gölge haritasının yalnızca bir kez hesaplanması yeterli:

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

`autoUpdate = false` her karedeki gölge geçişini kapatır. `needsUpdate = true` ise bir sonraki çizimde tam olarak bir tane ister. Işık ya da bir nesne her hareket ettiğinde bunu yeniden ayarlayın. Bende yalnızca model yüklendiğinde ve "parçalara ayır" görünümü parçaları birbirinden uzaklaştırdığında gerekiyor.

Bu madde isteğe bağlı çizimi kullanamasanız bile geçerli. Işığın ve gölge düşüren nesnelerin sabit olduğu her sahnede, her karedeki gölge geçişi tekrarlanan boş bir iştir.

---

## 3. Piksel Oranını Sınırla

Genelde verilen tavsiye şu:

```ts
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
```

Retina ekranda bu, iki kat genişlik ve iki kat yükseklikte, yani dört kat pikselle çizmek demek. Sınırı 1,5'e indirmek:

```ts
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5));
```

her CSS pikseli başına 4 yerine 1,5² = 2,25 piksel verir. Yani her karede boyanacak piksel sayısı **%44 azalır**. Kenar yumuşatma açıkken, bir penceredeki modelde farkı gerçekten göremiyorum. Sahnenizde ince çizgiler ya da küçük yazılar varsa deneyerek karar verin; düz yüzeyli ürünler için 1,5 iyi bir denge.

---

## Ekran Görüntüsü Tuzağı

Görüntüleyicide tuvali okuyan bir "görseli kaydet" düğmesi var. Eski kod bunu şöyle çalıştırıyordu:

```ts
new THREE.WebGLRenderer({ preserveDrawingBuffer: true });
```

`preserveDrawingBuffer`, tarayıcıya son kareyi ekranda gösterdikten sonra da saklamasını söyler; bu da bazı GPU'larda performansa mal olabilir. Üstelik isteğe bağlı çizimde ince bir sorun daha var: son kare eskimiş olabilir.

Daha temiz çözüm, bu bayrağı kaldırıp tuvali okumadan hemen önce, aynı iş adımında çizmek:

```ts
function snapshot(): Promise<Blob | null> {
  renderer.render(scene, camera);
  return new Promise((resolve) =>
    renderer.domElement.toBlob(resolve, 'image/png'),
  );
}
```

Çizim arabelleği tarayıcı kareyi ekrana basana kadar geçerli kalır. Bu yüzden `render()`'dan hemen sonra okumak her zaman taze ve eksiksiz bir görüntü verir.

---

## Sonuç

Değişikliğin tamamı on beş satır kadardı:

| Değişiklik | Neyi kazandırıyor |
|---|---|
| Yalnızca `controls.update()`, yeniden boyutlandırma, sahne değişikliği ya da animasyon isteyince çiz | Model dururken çizilen her kareyi |
| `shadowMap.autoUpdate = false` + değişince `needsUpdate` | Dönerken bile her karedeki gölge geçişini |
| Piksel oranı 2 yerine 1,5 ile sınırlı | Yüksek çözünürlüklü ekranlarda piksellerin %44'ünü |
| `preserveDrawingBuffer` yok, ekran görüntüsünden hemen önce çiz | Fazladan bir arabellek kopyasını ve eskimiş ekran görüntülerini |

Bunların hiçbiri zekice değil. Asıl mesele, varsayılan Three.js döngüsünün oyunlar için kurulduğunu, bir ürün görüntüleyicinin ise oyun olmadığını fark etmek. Sahneniz çoğu zaman yerinde duruyorsa, çoğu zaman hiçbir maliyeti olmamalı.
