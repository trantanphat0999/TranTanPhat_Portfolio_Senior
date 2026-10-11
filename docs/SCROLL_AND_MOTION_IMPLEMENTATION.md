# Scroll và motion: kết quả triển khai

Ngày: 11/10/2026. Ưu tiên: con lăn chuột trên desktop. Baseline và phương pháp phân tích ở [kế hoạch](SCROLL_AND_MOTION_OPTIMIZATION_PLAN.md).

## Hành vi sau thay đổi

- Wheel, trackpad và touch dùng scroll native, không chặn default action hoặc tích lũy đích cuộn bằng JavaScript.
- Menu và nút đầu/cuối trang giữ smooth scroll. Wheel, touch, pointer và các phím cuộn ngắt navigation đang chạy; reduced motion dùng chuyển vị trí tức thời.
- Shine/glow dùng transform/opacity; grid tĩnh, aurora là radial gradient mềm không cần blur lớn. Bỏ glass blur trên banner/tags/stats/status và sticky nav; giữ thiết kế graphite.
- Ambient hero pause khi ra khỏi viewport, tab hidden hoặc đang scroll, rồi tiếp tục ở phase hiện tại. Desktop giảm chữ rơi; mobile giảm thêm số lớp. Không restart entrance sau pause.
- Hai entrance hero dùng IntersectionObserver, bỏ CDN AOS. Nội dung mặc định vẫn hiện nếu JavaScript/IO không chạy.
- Hover card tạm giảm trong lúc cuộn để card đi qua con trỏ đứng yên không tạo chuỗi hiệu ứng nặng. Underline nav dùng scaleX và nav không đổi font weight khi active.
- Navigation cache geometry, chỉ tính lại khi layout/data/ảnh thay đổi; nút đầu/cuối cache chiều cao trang.
- Icon observer chỉ xử lý attribute changes của icon và subtree mới; dialog observer chỉ sync khi dialog thêm/xóa hoặc đổi trạng thái. Giữ Escape, focus trap, focus restore và scroll lock.
- Refresh bỏ qua tab hidden, ngăn request refresh chồng nhau, chỉ render section thay đổi; giữ reading anchor và carousel position.

## Ảnh và media

Avatar giữ tỷ lệ ảnh gốc và vị trí crop. Có WebP 320/640px, JPEG fallback, srcset/sizes và kích thước hiển thị cố định. Khi owner đổi ảnh, loader bỏ cả nguồn WebP/JPEG responsive cũ để hiển thị đúng ảnh mới.

| Asset | Kích thước |
| --- | ---: |
| JPEG gốc | 3.546.664 byte |
| WebP 320px | 5.912 byte |
| WebP 640px | 15.346 byte |
| JPEG fallback 320px | 12.314 byte |
| JPEG fallback 640px | 33.338 byte |

Ảnh gốc được giữ. Facebook raster có bản 96px cho icon nhỏ. Project detail images chỉ gán src khi mở modal; vùng ảnh có tỷ lệ 3:2 và object-fit contain để giữ chỗ, hiển thị đủ hình kể cả khi ảnh mới có tỷ lệ khác.

Tái tạo assets bằng `python tools/optimize-portfolio-images.py` sau khi cài Pillow. Không đổi seed hoặc dữ liệu Firebase để tối ưu ảnh mặc định.

## Kết quả đo

Cùng browser Edge headless, viewport desktop 1440 × 900, dữ liệu seed/mock, fonts CSS và EmailJS bị chặn; wheel 12 bước xuống và 12 bước lên, 120px/bước. Dùng rAF timing và CDP trace. Kết quả sau sửa chạy ba lượt ở CPU bình thường và ba lượt CPU ×4.

| Điều kiện | P95 baseline | P95 sau sửa |
| --- | ---: | ---: |
| Desktop, CPU bình thường, hero | 50,0ms | 17,0–17,1ms; median 17,1ms |
| Desktop, CPU ×4, hero | 83,3–83,4ms | 33,3ms ở cả ba lượt |
| Desktop, CPU bình thường, vùng scrollY ≈4000 | Chưa đo cùng điều kiện | 17,1ms |
| Viewport mobile, wheel, CPU ×4 | 50,1ms | 33,4ms |

Desktop CPU bình thường: không có long task >50ms trong ba lượt; số khoảng rAF >33,4ms lần lượt 1/146, 0/147 và 0/150. CPU ×4: hai lượt không có long task, một lượt có task 56ms; vẫn còn 4–6 khoảng rAF >33,4ms mỗi lượt. Không ghi nhận layout shift trong các lượt cuối.

Đây là cải thiện đo local, không phải cam kết 60 FPS trên mọi máy. CPU ×4 vẫn có outlier. Viewport mobile với wheel không thay thế Android/iPhone và thao tác vuốt thật. Khoảng rAF không phải số frame được màn hình thực sự trình chiếu; cần DevTools Frames/filmstrip và kiểm tra bằng chuột thật để đánh giá cảm giác cuối cùng.

Không so sánh phần trăm từ tổng Paint/JS: độ dài và lịch xử lý input của các lượt có khác nhau. Trace cuối tạm nằm trong `.cache/scroll-final-*-trace.json`, dữ liệu ở `.cache/scroll-audit-final.json`.

## Cách đo lại

Giữ `npm start` chạy, đóng các browser test/process tải nặng khác. Tool dùng mock, không chạm Firebase production:

```bash
node tools/scroll-benchmark.cjs --runs=3
node tools/scroll-benchmark.cjs --cpu=4 --runs=3
node tools/scroll-benchmark.cjs --position=4000 --runs=3
```

`--mobile` dùng viewport mobile với wheel, không giả định đây là đo touch. Có thể đặt `PORTFOLIO_TEST_URL` nếu dùng port khác. JSON được lưu ở `test-results/scroll-benchmark-*.json`. Benchmark timing được tách khỏi test pass/fail để không tạo CI flaky vì ngưỡng thời gian cứng.

## Xác minh

- `npm test`: 63 unit tests passed.
- `npm run build`: thành công; generated CSS được cập nhật.
- `node tests/motion-browser.cjs`: wheel native/đảo chiều/nested scroll, interrupt navigation, pause/resume/reduced motion, responsive owner image, selective refresh và reading anchor.
- `node tests/media-scroll.cjs`: media CRUD, ảnh chi tiết khi mở modal, native wheel, navigation offset, nút đầu/cuối và mobile overflow.
- `node tests/icons-browser.cjs`: local icon assets và dynamic Admin icons.
- `node tests/browser-regression.cjs`: Admin editing, CV export và dialog/lightbox stack.
- `node tests/admin-workspace.cjs`: workspace/CV draft recovery, proposals, Undo, conflicts và official exports.

Motion browser test đã được thêm vào `npm run test:browser`. Assertion wheel cũ đã chuyển từ synthetic-event easing sang native default action và input thật qua browser.

Không thay đổi Firebase rules, schema, CV renderer hoặc provider configuration cho công việc này. Không deploy website trong bước triển khai local.

## Các mục có điều kiện trong plan

Không áp dụng content-visibility/intrinsic-size hoặc đổi kiến trúc lazy mount Admin/modals: phép đo desktop bình thường đã đạt mục tiêu P95 và các thay đổi này có rủi ro anchor/focus lớn hơn. Đã lazy-load phần media modal. Nếu profile trên máy thật vẫn phát hiện vấn đề, các mục này là bước tiếp theo có điều kiện, không phải lời khẳng định đã triển khai.
