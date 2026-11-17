# Bloom Behind the Curtain

Trang quà tặng hoa 3D tương tác, ưu tiên màn hình dọc (9:16). Rèm mở ra, hoa mọc và nở, giấy gói bay vào gói lại, ruy băng thắt nơ, rồi phong bì mở ra một lá thư.

Stack: React (JSX, không TypeScript), Three.js, React Three Fiber, drei, GSAP, Tailwind CSS, Vite.

## Chạy

```bash
npm install
npm run dev        # phát triển
npm run build      # build production vào dist/
npm run preview
```

## Đổi nội dung

- Nội dung thư và chữ trên nút: `src/config/letter.js` (`LETTER_TEXT`, `CTA_TEXT`).
- Màu hoa: `PEONY_TINTS`, `ROSE_TINTS` trong `src/components/Flowers/FlowerBouquet.jsx`.
- Màu rèm, giấy, ruy băng: `Curtain.jsx`, `WrappingPaper.jsx` (mảng `SHEETS`), `Ribbon.jsx`.
- Nhịp animation: `src/animations/mainTimeline.js` (mỗi giai đoạn là một timeline riêng, có khoảng nghỉ giữa các giai đoạn).

## Cấu trúc

- `src/components/Flowers`: cánh hoa procedural (`Petal.jsx`), mẫu đơn, hồng, bố cục bó hoa, shader nở trên GPU (`bloomMaterial.js`), texture cánh vẽ bằng canvas (`petalTextures.js`).
- `src/components/Wrapping`: giấy gói (4 tấm biến dạng từ "đang bay" sang "đã gói") và ruy băng (dải quanh cuống, hai vòng nơ, nút thắt, hai đuôi).
- `src/components/Curtain`, `Environment`, `Letter`, `Loader`.
- `src/scene/FlowerScene.jsx`: canvas, camera responsive, ánh sáng, bước biên dịch shader trước khi vào trang.
- `src/animations`: registry dùng chung và các timeline GSAP.

## Hiệu năng

`src/utils/quality.js` chia thiết bị thành 3 mức (desktop, điện thoại, máy yếu): độ phân giải lưới cánh, độ dày cánh, số hạt bụi, số cánh hoa bay, giới hạn pixel ratio. Có `PerformanceMonitor` tự hạ pixel ratio nếu FPS thấp. Mỗi bông hoa là một mesh, hình học dùng chung giữa các bông cùng loại.

Tôn trọng `prefers-reduced-motion`: bó hoa hoàn chỉnh nằm sau rèm, rèm mở nhanh, thư hiện bằng mờ dần.

## Ghi chú

- Font Cormorant Garamond tải từ Google Fonts; khi offline sẽ dùng font serif dự phòng. Loader chờ font tối đa 2,5 giây.
- Mở trang với `?debug` để dùng `window.__bloom` (registry và timeline) khi chỉnh bố cục. Có thể xoá đoạn này trong `src/App.jsx`.
