# Phân tích scroll và kế hoạch tối ưu chuyển động

Ngày phân tích: 11/10/2026. Phạm vi: public portfolio trong workspace hiện tại. Báo cáo này ghi lại baseline trước khi sửa và kế hoạch được duyệt. Kết quả triển khai được ghi riêng tại [Scroll and motion implementation](SCROLL_AND_MOTION_IMPLEMENTATION.md).

## Kết luận

Nút thắt nổi bật là tổ hợp hiệu ứng hero chạy liên tục, vẽ lại nền/shadow, blur và backdrop blur chồng lớp. Cơ chế wheel smoothing bằng JavaScript làm scroll phụ thuộc thêm vào main thread và có thể gây cảm giác trễ khi đảo chiều. Chỉ thay thời lượng/easing hoặc thêm `will-change` sẽ không giải quyết đầy đủ.

Hướng đề xuất: giảm chi phí vẽ nhưng giữ thiết kế graphite; ưu tiên scroll native cho wheel, trackpad và touch; giữ smooth scrolling cho thao tác bấm điều hướng. Sau đó giảm observer/scroll work và chuẩn hóa chuyển động.

Người dùng xác nhận cảm giác giật rõ nhất với **con lăn chuột trên máy tính**. Thiết bị nghiệm thu ưu tiên là máy tính với chuột thật: cuộn từng nấc, cuộn nhiều nấc liên tục, đảo chiều nhanh và cuộn khi con trỏ nằm trên card/nav. Thử cả ngay tại hero và ở giữa trang. So sánh scroll native với bản hiện tại trên cùng chuột/browser; không coi chuyển sang native là tự động đạt cảm giác mượt. Chỉ cân nhắc smoothing tùy chọn nếu thử thực tế cho thấy cần, sau khi giảm tải render và loại bỏ đích cuộn tồn đọng/xung đột đầu vào. Trackpad và touch vẫn nằm trong kiểm tra hồi quy.

## Phương pháp đo và giới hạn

- Edge Chromium headless trên máy hiện tại, Playwright và Chrome DevTools Protocol.
- Local server port 5175; mock Firebase bằng seed và adapter có sẵn trong browser regression. Không đọc/ghi dữ liệu production.
- AOS thực tế từ CDN được tải; EmailJS và Google Fonts CSS bị chặn để giảm nhiễu mạng. Font và nội dung live có thể tạo kết quả khác.
- Desktop 1440 × 900; viewport mobile 390 × 844. Loạt chính giảm tốc CPU 4 lần để làm rõ vấn đề; có loạt đối chiếu CPU bình thường.
- Wheel: 12 bước xuống và 12 bước lên, mỗi bước 120px, khoảng nghỉ yêu cầu 55ms; thời gian thực tế có thể dài hơn khi browser bận. Đo sau khi render xong và chờ 1,5 giây.
- Đo khoảng cách giữa callback `requestAnimationFrame`, long tasks, layout shifts và trace Paint/Layout/JS. Khoảng cách rAF không phải số frame thực sự được màn hình/GPU trình chiếu.
- Các can thiệp chỉ được inject vào trang kiểm thử: tắt smoothing, tắt nhóm hiệu ứng hero/blur, đổi background attachment. Bản effects-off là đối chứng để xác định tải, không phải thiết kế cuối cùng.
- Trace có overhead; thời gian mỗi lượt và quãng đường cuộn không hoàn toàn giống nhau. Không dùng tổng Paint/JS giữa các lượt để tuyên bố phần trăm cải thiện chính xác.
- Headless, CPU throttling và viewport mobile không thay thế thử trên laptop/điện thoại thật. Không cam kết FPS dựa trên phép đo này.

## Kết quả đối chứng

P95 nghĩa là 95% khoảng thời gian giữa các callback rAF không vượt quá giá trị này; thấp hơn tốt hơn.

| Desktop, CPU ×4 | rAF P50 | rAF P95 | Long tasks >50ms |
| --- | ---: | ---: | ---: |
| Hiện tại | 49,9ms | 83,3ms | 23 |
| Hiện tại, đo lặp lại | 50,0ms | 83,4ms | 22 |
| Chỉ bỏ wheel smoothing | 33,3ms | 83,3ms | 13 |
| Tắt nhóm hiệu ứng hero/blur + nền fixed | 16,7ms | 16,8ms | 0 |
| Native scroll + tắt nhóm trên | 16,7ms | 16,8ms | 0 |
| Chỉ dừng shine/grid/shadow loop | 33,3ms | 66,7ms | 13 |
| Chỉ bỏ hero backdrop blur và blob/halo blur | 50,0ms | 66,7ms | 15 |
| Chỉ bỏ nền fixed | 33,4ms | 83,4ms | 26 |

Viewport mobile với cùng đầu vào wheel: P95 hiện tại 50,1ms; effects-off 16,8ms. Đây là đối chứng responsive, không phải phép đo vuốt tay trên điện thoại thật.

Đối chiếu desktop với CPU bình thường: hiện tại P95 50,0ms, 40 khoảng rAF >33,4ms; effects-off P95 17,3ms, không có khoảng >33,4ms. Cả hai không có long task >50ms. Vì vậy việc chỉ kiểm tra long tasks sẽ bỏ sót cảm giác khựng do tải render/frame scheduling.

Đối chiếu bắt đầu ở scrollY khoảng 4000, CPU ×4: hiện tại P95 50,1ms; effects-off P95 33,4ms và vẫn có một long task 52ms. Hero không phải toàn bộ vấn đề ở giữa trang. Sticky backdrop nav, hover card khi nội dung đi qua con trỏ, observer và công việc scroll còn lại cần profile riêng sau P0.

Tắt riêng một nhóm chưa đủ. Tắt tổng thể tải hero cho kết quả tốt hơn rõ rệt; cần thay cách dựng hiệu ứng, không chỉ giảm một blur hoặc đổi easing. Nền fixed là ứng viên cần tối ưu nhưng chưa được chứng minh là nguyên nhân chính: lượt tắt riêng không cải thiện P95.

Các trace tạm và kết quả JSON nằm trong `.cache/scroll-*-trace.json`, `.cache/scroll-audit*.json`. Script audit nằm ở `.cache/audit-scroll.cjs`; không thêm vào bộ regression chính khi chưa triển khai.

## Nguyên nhân trong code

### 1. Hiệu ứng hero tạo công việc vẽ liên tục — ưu tiên P0

Trong `css/styles.css`:

- `profileBannerShine` và `profileGridDrift` animate `background-position` trên các pseudo-element bao phủ banner lớn. Desktop đo được hero cao khoảng 998px.
- `glow-pulse` và `glow-pulse-delayed` animate `box-shadow`, thay vì chỉ thay opacity/transform của một quầng sáng đã vẽ sẵn.
- Ba aurora blob kích thước 400–520px, blur tới 86px; halo conic-gradient xoay với blur 24px.
- 17 chữ falling và các sparkle chạy liên tục. Không thấy điều khiển pause theo visibility của hero/tab.
- Banner, hero tags, status, stats và sticky nav có backdrop blur. Inventory thấy 15 phần tử có backdrop-filter trong toàn DOM, bao gồm cả overlay đang ẩn; không đồng nghĩa cả 15 đều được vẽ cùng lúc.
- Blur của nội dung đang chuyển động phía sau các mặt kính tạo tổ hợp cần đo và giảm. `transform` không tự đảm bảo một cảnh có blur/mask/backdrop sẽ rẻ.

### 2. Wheel smoothing có độ trễ và xung đột đầu vào — ưu tiên P0

Trong `js/page/smooth-scroll.js`:

- Listener `wheel` dùng `passive:false`, gọi `preventDefault()`, rồi tự gọi `scrollTo(..., behavior:'instant')` từng frame.
- Mỗi wheel event duyệt ancestor, đọc scroll metrics và computed overflow; mỗi frame đọc document height và scroll position.
- Phân loại trackpad bằng ngưỡng 60px/số nguyên là heuristic. Trackpad có thể phát delta nguyên lớn và bị chặn; mouse wheel nhỏ có thể được trả về native.
- Khi chuyển từ event bị chặn sang event được trả về native, vòng animation cũ không được dừng ngay. Hai nguồn có thể điều khiển vị trí cùng lúc.
- `target += delta` tích lũy đích cũ. Ví dụ vị trí 300, đích cũ 600; cuộn ngược -120 vẫn để đích ở 480, khiến trang tiếp tục đi xuống dù người dùng vừa cuộn lên. Đây là rủi ro suy ra trực tiếp từ thuật toán, chưa đo độ trễ đảo chiều trên chuột thật của người dùng.
- Nhánh native trong thử nghiệm giảm số long tasks nhưng không xử lý tải vẽ hero. Cần sửa cả hai.

### 3. AOS và observer toàn trang — ưu tiên P1

- `index.html` hiện chỉ có hai `data-aos`, đều ở hero, nhưng vẫn tải và khởi tạo AOS toàn trang.
- Trace desktop baseline ghi nhận khoảng 209ms cho một hàm AOS và 169ms cho một hàm AOS khác trong lượt CPU ×4. Đây là tổng thời gian có trace/throttling, không phải chi phí của một event.
- `js/page/icons.js` theo dõi class/childList trên toàn body; thay class của nav, AOS hoặc button có thể khiến quét lại subtree dù icon không đổi.
- `js/page/dialogs.js` theo dõi class/style/childList toàn body và quét mọi dialog trong `sync()`. Nó có thể chạy do biến động giao diện không liên quan đến dialog.
- Trace ghi nhận `dialogs.sync` 37 lần (~147ms), `icons.flush` 35 lần (~63ms) ở CPU ×4. Không cộng các thời gian hàm lồng nhau thành tổng CPU độc lập.

### 4. Scroll handlers và chuyển động nhỏ — ưu tiên P1

- `navigation.js` và `back-to-top.js` đã dùng passive scroll listeners và rAF; đây là nền tảng đúng.
- Navigation vẫn đọc geometry của mọi section mỗi frame cuộn; nút đầu/cuối trang đọc document height trong vòng riêng.
- Underline nav animate `width`; nhiều card dùng `transition:all`, hover đổi shadow.
- Các lớp CSS theme/polish được nối tiếp nhau; phải xác định declaration thực sự đang áp dụng trước khi sửa. Không xóa override hàng loạt trong một thay đổi performance.

### 5. Ảnh lớn và render lại dữ liệu — ưu tiên P2

- Avatar `1217VUTP0792.JPG` khoảng 3,55MB, nguồn 3648 × 5472, hiển thị 320 × 320. Pixel RGBA đầy đủ tương đương khoảng 76MiB; bộ nhớ thực tế tùy chiến lược decode của browser, không được đo trực tiếp ở đây.
- Inventory có icon Facebook nguồn 2084 × 2084 cho vị trí hiển thị nhỏ, và ảnh chi tiết dự án tới khoảng 1,5–2MB.
- Loader render cache rồi render dữ liệu mới; refresh có kiểm tra toàn bộ data không đổi, nhưng nếu một phần thay đổi thì `renderAllSections()` thay nhiều subtree bằng `innerHTML`.
- Điều này có thể làm reset card/modal state hoặc đổi chiều cao khi đang đọc. Không ghi nhận layout shift trong cửa sổ scroll đo hiện tại; cần phép đo riêng lúc startup/refresh/ảnh decode trước khi quy đây là nguyên nhân.

## Kế hoạch triển khai

| Bước | Thay đổi cụ thể | File/phạm vi | Điều kiện hoàn thành |
| --- | --- | --- | --- |
| 1 · P0 | Trả wheel/trackpad/touch về native. Smooth chỉ cho nav và nút đầu/cuối trang; hủy chuyển động khi người dùng nhập thao tác mới. Không thêm thư viện scroll hijacking. | `smooth-scroll.js`, `navigation.js`, `back-to-top.js`, HTML script loading | Đảo chiều đáp ứng ngay; zoom, nested scroll, modal, project horizontal scroll và keyboard hoạt động đúng. |
| 2 · P0 | Thay background-position shine bằng lớp gradient riêng chạy transform/opacity; grid ưu tiên tĩnh hoặc lớp transform có vùng clip cố định. Thay shadow pulse bằng quầng sáng cố định thay opacity/scale. | CSS hero/keyframes | Không còn loop animate background-position/box-shadow lớn; vẫn giữ hiệu ứng ánh sáng và chất liệu graphite. |
| 3 · P0 | Giảm blur chồng lớp: ưu tiên surface gần opaque cho tags/status/stats; giữ glass có chọn lọc. Giảm diện tích/blur blob, không gắn will-change đại trà. | CSS hero/nav | Hạ chi phí Paint; không mất độ tương phản, không đổi bố cục desktop/mobile. |
| 4 · P0 | Pause loop hero bằng IntersectionObserver khi hero ra khỏi viewport; pause khi tab hidden; tôn trọng reduced motion ngay khi cài đặt đổi. Mobile dùng ít blob/chữ rơi hơn. | Module motion nhỏ + CSS state | Không có loop hero chạy khi không cần nhìn thấy; resume giữ phase, không khởi động lại hiệu ứng entrance. |
| 5 · P1 | Thay AOS bằng entrance transform/opacity nhỏ cho hai khối hero; dùng IntersectionObserver nếu cần reveal thêm. Chỉ animate một lần; nội dung vẫn hiện nếu JS lỗi. | HTML CDN, `navigation.js`, CSS | Bỏ listener/observer AOS toàn trang; không có flash nội dung ẩn; reduced motion hiển thị ngay. |
| 6 · P1 | Thu hẹp icon observer, bỏ qua class changes không liên quan và SVG đã decorate. Dialog sync chỉ khi thêm/xóa/mở/đóng dialog; batch mutations. | `icons.js`, `dialogs.js` | Scroll/nav update không gây quét dialog/icon toàn trang; focus trap, Escape, focus restore, scroll lock giữ đúng. |
| 7 · P1 | Cache nav height/section positions khi layout thay đổi hoặc dùng IO với xử lý top/bottom rõ ràng; gom read trước write. Underline scaleX; transition properties rõ ràng; hover nặng chỉ cho thiết bị có hover. | Navigation/button/CSS | Active section chính xác sau data load, resize, custom blocks; không layout loop do đọc/ghi xen kẽ. |
| 8 · P2 | Tạo avatar WebP/AVIF + fallback, srcset/sizes, giữ vị trí crop 50% 20%; resize brand raster; lazy-load ảnh modal khi mở; reserve kích thước ảnh. | `image/`, HTML, loader/media | Avatar nét trên màn hình DPR2; giảm payload/decode; modal vẫn có ảnh; không shift khi ảnh tải. |
| 9 · P2 | Render chỉ section thay đổi khi refresh, giữ scroll anchor và project scrollLeft; tránh re-render cùng payload; hoãn background refresh khi hidden. Cân nhắc lazy mount project modal/Admin assets. | Loader/admin entrypoints | Thay một dữ liệu không dựng lại cả trang; không mất trạng thái form/modal và không giật vị trí đọc. |
| 10 · P2 | Thử containment/content-visibility có chọn lọc nếu trace sau P0/P1 vẫn cần; đo intrinsic sizes và anchor navigation trước khi giữ. | Section CSS | Không nhảy chiều cao, không sai section target, không hỏng Admin/editor/print. |

Triển khai theo nhóm nhỏ, đo lại sau P0, rồi quyết định phần P1/P2 theo trace mới. Không rewrite framework hoặc sửa Firebase schema cho mục tiêu scroll.

## Quy chuẩn chuyển động đề xuất

- Hover/control: 160–220ms, easing `cubic-bezier(.2,.8,.2,1)`; chủ yếu transform/opacity.
- Reveal section: 350–500ms, dịch chuyển 12–20px; stagger 40–60ms với số lượng giới hạn, không làm chậm khả năng đọc.
- Modal: 180–260ms, opacity + dịch chuyển 8–12px; không animate overlay background hoặc blur radius từng frame.
- Ambient hero: 12–20 giây, biên độ nhỏ, số layer thấp; dừng ngoài viewport. Chuyển động chậm không đồng nghĩa chi phí render thấp.
- Reduced motion: bỏ ambient/reveal movement, hiển thị nội dung đầy đủ và dùng cuộn tức thời cho navigation.
- Tránh quá nhiều chuyển động độc lập cùng lúc; giữ ánh sáng/aurora chủ đạo và giảm sparkle/chữ rơi trên mobile.

## Tiêu chí nghiệm thu

1. So sánh baseline và bản sửa cùng viewport, DPR, browser, dữ liệu, kiểu input, điều kiện mạng và quãng đường; chạy ít nhất ba lượt, báo median/P95 và khoảng dao động.
2. Trên thiết bị thật 60Hz, mục tiêu rAF P95 khoảng 20ms hoặc thấp hơn trong scroll ổn định; số khoảng >33,4ms dưới 1%. Đây là mục tiêu đo, không cam kết trước triển khai. Màn hình 120Hz dùng ngân sách gần 8,3ms và phải đo riêng.
3. Không có long task >50ms do application scroll/motion handlers trong đoạn cuộn sau startup. CPU ×4 dùng như stress test, mục tiêu P95 dưới 33,4ms; ghi rõ nếu thiết bị không đạt.
4. Dùng Performance Frames/filmstrip trên browser có giao diện để kiểm tra frame thực tế, cùng cảm nhận chuột/trackpad/touch; không dùng rAF một mình để tuyên bố 60 FPS.
5. Cuộn ngược không tiếp tục đi hướng cũ vì target tồn đọng; touch/trackpad không bị double inertia, nested panels không làm trang nền cuộn.
6. Không layout shift không mong muốn do ảnh, refresh, nav active, pause/resume; kiểm tra riêng startup và dữ liệu cập nhật khi đang đọc.
7. Kiểm tra top/bottom button, nav offset, horizontal project gestures, modal/lightbox/profile, Ctrl/Meta+wheel zoom, keyboard, reduced motion và Admin editing.
8. Thiết bị: Windows Edge/Chrome với chuột, laptop trackpad, Android Chrome, iPhone Safari; ít nhất một máy yếu. Giả lập mobile chỉ bổ trợ.

## Kiểm thử cần điều chỉnh khi thực hiện

- `tests/media-scroll.cjs` hiện khẳng định wheel event tổng hợp phải được JS ease. Khi chọn native scroll, thay assertion này bằng kiểm tra wheel thật bằng browser input, đảo chiều và không chặn các vùng nested; event tổng hợp không tự tạo default native scroll.
- Giữ các kiểm tra navigation offset, nút đầu/cuối trang, reduced motion và mobile overflow.
- Thêm kiểm tra pause ngoài viewport/tab hidden và resume không chạy lại entrance.
- Chạy browser regression phù hợp phần đã sửa; `npm run build` nếu đổi Tailwind/HTML classes. Không cần chạy toàn bộ AI/CV/PDF suite cho một thay đổi motion độc lập, trừ khi chạm shared dialogs/Admin/rendering.
- Đặt benchmark định kỳ riêng: timing không nên làm test CI thất bại vì một ngưỡng ms cứng trên máy không kiểm soát.

## Nguồn kỹ thuật

- [Chrome: Making wheel scrolling fast by default](https://developer.chrome.com/blog/scrolling-intervention-2/) — lý do listener wheel chặn có thể làm scroll chờ main thread.
- [web.dev: How to create high-performance CSS animations](https://web.dev/articles/animations-guide) — ưu tiên transform/opacity, đo layout/paint và sử dụng layer promotion có chọn lọc.

Các nguồn giải thích cơ chế browser; thứ tự ưu tiên của kế hoạch dựa trên code và phép đo local ở trên.
