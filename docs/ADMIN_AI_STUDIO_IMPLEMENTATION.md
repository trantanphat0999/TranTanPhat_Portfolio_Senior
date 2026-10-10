# Admin AI Studio — triển khai hoàn tất

Ngày kiểm tra: 10/10/2026. Phạm vi: mã nguồn local; chưa publish website, deploy Firestore rules hoặc thay dữ liệu Firebase thật.

## Các phần đã triển khai

| Phần của plan | Kết quả |
|---|---|
| Admin workspace / CV | Trang CV toàn vùng main pane, PDF thật có zoom, sidebar và Back/Forward giữ draft; `#admin/cv`, `#admin/content`, `#admin/ai`, `#admin/settings` có auth guard |
| Một CV chính thức | Snapshot v4 chứa text/style đã duyệt; preview/download Admin và public cùng renderer; portfolio/context/JD mới không tự thay bản chính thức |
| Page target | Fit có diff và Apply; chọn 2 trang tạo candidate <=2 hoặc báo không fit; chặn lưu/export bản vượt target |
| AI dùng chung | OpenAI API, Claude CLI, Custom API; chọn model, load catalog, probe và inference test riêng; fingerprint làm test/gợi ý cũ stale khi cấu hình đổi |
| AI backend | Firebase ID-token owner auth, local pairing, secret vault ngoài static root, queue giới hạn, timeout/cancel, JSON schema theo task, OpenAI Responses API |
| Claude CLI | Native executable, cwd tạm, stdin, restricted/safe mode, tắt tools và MCP, không giữ session; hủy process tree và xóa cwd sau khi process đóng |
| Content Builder | Text, bullets, links, key/value, cards; public preview và CV source preview; UUID, rename/reorder, hide/restore, undo, private draft, explicit publish có revision |
| Context library | Plain text/tags/purpose/reference URL, enable/disable, revision, AI writer, device draft recovery, lưu private; context picker trong Chat/Content/CV và defaults toàn hệ thống |
| AI hỗ trợ nội dung | Viết từ facts, rewrite, concise, bullets, translate; tone/language/length, before/after, Apply vào draft; icon search/reset và AI chỉ chọn icon trong registry |
| AI CV/JD | Review, wording proposals, JD evidence matrix; kiểm tra CV keys và context/config/JD trước khi Apply |
| Backup / privacy | `custom-blocks` có public read allowlist, loader/cache/seed/CV mapping; seed generator xử lý tên document có dấu `-`; private context, private blocks và credentials không vào public backup |

## Chạy local

Cài dependencies bằng `npm ci`, sau đó:

```powershell
npm run admin:local
```

Hoặc mở `start-admin-workspace.bat`. Truy cập `http://127.0.0.1:5180/`, đăng nhập Admin như bình thường. Mở Settings → AI providers, nhập pairing code hiển thị trong terminal. Mã pair sống 24 giờ; browser pair token sống 30 phút. Khi hết hạn, pair lại. Logout xóa pair token và hủy AI requests trong browser.

Có thể tiếp tục chạy portfolio bằng `npm start` ở port 5173; AI service local ở port 5180. Settings cho phép nhập backend URL riêng.

### OpenAI

Chọn OpenAI API, nhập key và **Save key to backend** (hoặc cấu hình `OPENAI_API_KEY` trên server), Load model catalog, chọn ID, **Test real connection**, rồi **Save & use across system**. Test tạo một request AI ngắn. Catalog chỉ liệt kê model; test mới xác nhận model có thể xử lý text/JSON trong ứng dụng.

Key mới không được lưu vào Firestore hay JavaScript public. Vault mặc định trên Windows: `%LOCALAPPDATA%/PortfolioStudio/ai-providers.json`. Backend trả `hasKey/secretVersion`, không trả key. Cấu hình Custom API cũ vẫn được đọc để giữ tương thích; muốn chuyển secret cũ sang backend, lưu lại key trong Settings và test lại.

### Claude

Cài Claude Code trên máy, chạy `claude auth login` nếu chưa đăng nhập. Trong Settings chọn Claude CLI → Check installation → chọn alias hoặc model ID → Test real connection → Save. CLI chỉ chạy qua local service. Có thể đặt `PORTFOLIO_CLAUDE_EXE` ở server để trỏ tới native executable; browser không được gửi executable, cwd hoặc shell command.

### Content / context

- Content → Portfolio sections giữ các form cũ. Custom blocks cho phép tạo block mới, đặt vị trí, visibility, icon và CV mapping. Save private draft giữ mọi block trong admin collection; Publish chỉ ghi block public vào `portfolio/custom-blocks`.
- Settings → Context library chứa tài liệu riêng cho AI. URL là metadata tham chiếu, không tự crawl. Context picker cho biết tài liệu nào được gửi tới provider.
- AI chỉ tạo gợi ý. Apply thay draft; Save/Publish mới thay dữ liệu. Undo và draft recovery giữ quyền kiểm soát của owner.
- Thay Content không tự thay CV chính thức. Trong CV Studio, Review current source/Reset hoặc chọn field mới, xem PDF và Save official CV.

## Hosted backend

Static hosting phục vụ portfolio/CV và nội dung public được. OpenAI/Custom API mới cần backend HTTPS. `Dockerfile.ai` cung cấp API-only service, không phục vụ repo và không chạy Claude CLI.

Cấu hình deployment:

- `PORTFOLIO_ALLOWED_ORIGINS`: origin HTTPS chính xác của portfolio; có thể phân tách bằng dấu phẩy.
- `PORTFOLIO_FIREBASE_PROJECT`: mặc định `portfolio-project-9770e`.
- `PORTFOLIO_OWNER_EMAIL`: mặc định email owner trong Firebase config/rules.
- `OPENAI_API_KEY` / `PORTFOLIO_CUSTOM_API_KEY`: secret do nền tảng deployment cấp.
- `PORT`: mặc định local 5180; Docker 8080.

Khởi động trực tiếp: `node tools/admin-server.cjs --api-only`. Service hosted xác minh Firebase ID token, không cần local pairing. Không mount secrets vào thư mục website. Với container không có persistent vault, dùng secrets từ env; mỗi lần key đổi cần test lại cấu hình.

Deploy `firestore.rules` có `custom-blocks` trong public allowlist cùng website release. Collection `admin/*` vẫn owner-only. Chưa chạy deployment trong lượt làm việc này. Trên website HTTPS, browser có thể hạn chế gọi loopback HTTP; dùng Admin local cho Claude thay vì coi bridge đã kết nối.

## Kiểm chứng

- `npm test`: 38 tests pass, bao gồm adapters, JSON/schema failures, migration/fingerprint, JWT owner/expired/tampered, vault rotation, process timeout/cancel, private persistence và block/CV mapping.
- `npm run test:browser`: regression CRUD/offline/conflict, CV pagination/Unicode/media/icons, workspace fullscreen/mobile và AI Studio qua HTTP bridge thật với Firebase/provider giả lập.
- AI Studio browser suite kiểm tra cùng model ở Chat/Content/CV, actual connection-test protocol, private context selection, context-revision stale, Apply/Undo, icon whitelist, publish/hide/restore, privacy và syntax của seed export.
- `npm run test:pdf`: kiểm tra artifacts mới, số trang, text/link/Unicode/A4 và cặp PDF official Admin/public theo text, link vị trí và raster layout.
- `npm run build`: cập nhật Tailwind/PDF.js/fonts/vendor.
- Claude CLI thật **2.1.261**, model **sonnet**, đã trả JSON `{ok:true}` qua adapter với restricted/safe mode và tools/MCP tắt. Đây là smoke inference thật, không phải chỉ kiểm tra executable.
- OpenAI inference thật chưa chạy vì máy chưa có API key. Protocol được kiểm tra bằng mock Responses API; UI không đánh dấu Ready thay người dùng.

Browser/backend tests không ghi Firebase thật. Container chưa được build/deploy trên nền tảng hosting. Các screenshots trong `test-results/` là artifacts local, không commit.
