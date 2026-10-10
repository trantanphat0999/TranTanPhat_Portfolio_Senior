# Plan mở rộng Admin: CV toàn màn hình, AI providers và Content/Context Builder

Ngày: 10/10/2026, Asia/Saigon.

This document records the approved fullscreen CV, shared AI and content/context design. Implementation and current validation are documented in ADMIN_AI_STUDIO_IMPLEMENTATION.md. The official CV remains the approved Admin snapshot used by public download.

## Implementation status

Phases 1-6 are implemented in the local source. See [implementation, setup and verification](ADMIN_AI_STUDIO_IMPLEMENTATION.md). Claude passed a real sonnet inference smoke test. OpenAI protocol uses mocks until an API key is configured. Website/backend/rules deployment has not been performed. The requirements below remain the design reference.

## 1. Hiểu yêu cầu

- CV Studio phải là một trang trong Admin workspace, dùng toàn bộ vùng làm việc; không backdrop, không dialog hẹp, không modal chồng lên trang public.
- AI có lựa chọn OpenAI và Claude CLI, cấu hình model và test connection; một cấu hình active dùng cho toàn bộ tính năng AI.
- Phần Content có thể thêm nội dung mới, không chỉ sửa các record đã cố định. AI hỗ trợ viết từ thông tin thật và đề xuất icon có thể dùng ngay.
- “Context” được hỗ trợ ở cả hai nghĩa: nội dung/block trong Content, và tài liệu/bối cảnh riêng để AI tham khảo. Hai loại có visibility và lifecycle rõ ràng, không tự biến ghi chú riêng thành nội dung public.
- Giữ Add/Edit/Hide/Restore/Arrange/Undo, CV theo JD, draft recovery, offline/conflict và nguồn dữ liệu hiện có.

## 2. Phát hiện và giới hạn thực tế

| Thành phần | Hiện trạng | Hướng xử lý |
|---|---|---|
| CV UI | Ban đầu là overlay trên public, bị giới hạn chiều rộng/chiều cao | Host CV trực tiếp trong main pane, giữ sidebar/topbar và trạng thái draft khi đổi trang |
| AI calls | Chat, content suggestions và CV tự gọi endpoint riêng | Một AI service và provider adapter dùng chung |
| Model/config | Base URL/key/model theo schema cũ | Versioned settings, active provider/model, trạng thái test theo fingerprint |
| Static server | Chỉ đọc và phục vụ file | Không thể thực thi CLI từ browser; cần bridge backend |
| Content | Tám section, form và mapping public/CV cố định | Thêm block registry, schema validation và renderer chung |
| Icons | Có `js/icons.js` và assets local | Dùng icon ID hợp lệ trong registry; không nhận SVG/HTML tùy ý từ AI |
| Public CV | Đang chuyển sang snapshot chính thức v4 | Builder phải mapping vào draft CV, không thay snapshot đã lưu |

Đã kiểm tra metadata trên máy: có lệnh `claude`, `codex`, `openai`; Claude Code trả version **2.1.261**. Chưa gọi inference hoặc kiểm tra credential. Có executable không đồng nghĩa đã authenticated, có model access hoặc test connection thành công.

“OpenAI” trong scope mới được hiểu là **OpenAI API**, tách khỏi Codex CLI và thread chat hiện tại. Có thể bổ sung Codex adapter sau nếu muốn dùng phiên đăng nhập Codex, nhưng không thay OpenAI API bằng Codex một cách ngầm định.

## 3. Thiết kế trang và điều hướng

Trang chính: Overview, Content, CV Studio, AI Assistant, Settings. Settings có AI Providers, Context Library, Data & Sync; Content có Sections và Custom Blocks.

### CV Studio

- Main pane phủ toàn bộ vùng còn lại sau sidebar/topbar; không `role=dialog`, `aria-modal` hoặc scroll lock của modal.
- Desktop: PDF/editor khoảng 70%, inspector khoảng 30%, kéo/thu inspector nếu cần thêm diện tích đọc. Toolbar có zoom, fit width, open PDF và target/actual page count.
- Inspector có tab Content, Format, AI/JD. PDF có chế độ fit theo chiều rộng và xem chi tiết. Khi chỉnh text có thể chuyển Editor/Preview hoặc dùng split view khi đủ rộng.
- Footer Save draft / Save official / Save & download cố định trong trang; không che PDF hoặc input.
- Mobile: một pane tại một thời điểm, tab Preview/Content/AI, inspector có thể mở theo tab; footer luôn truy cập được. Không đặt ba cột nhỏ cạnh nhau.
- Đổi sidebar giữ draft và JD. Nút Back chỉ đổi trang; thao tác thực sự bỏ draft hoặc exit mới cảnh báo.
- Hash route `#admin/cv`, `#admin/content`, `#admin/ai`, `#admin/settings` để tương thích static hosting. Guard auth trước render dữ liệu riêng; browser Back/Forward không mất draft. Public anchor section được giữ nguyên.
- Loading, empty, failed và chưa đạt page target là trạng thái trong trang, không phải popup riêng.

### Số trang

Giữ workflow fit có diff và duyệt. Chọn 2 trang phải tạo preview hợp lệ <=2 trang hoặc báo chưa fit được; không tiếp tục hiển thị PDF 6 trang như bản hoàn tất. Nếu giữ custom text quá dài làm fit không khả thi, hướng dẫn chỉnh text/selection và không cho lưu chính thức. Không crop nội dung hoặc hạ font dưới mức đọc được.

## 4. AI Providers: một cấu hình dùng toàn hệ thống

| Provider | Kết nối | Model picker | Test thực tế |
|---|---|---|---|
| OpenAI API | Backend/proxy giữ API key | Load catalog theo key/project, chọn model phù hợp text/schema | Gọi phản hồi ngắn và xác nhận schema/capabilities |
| Claude CLI | Local bridge gọi Claude Code đã cài | Alias/model ID được version hiện tại hỗ trợ; cho nhập ID và validate | Print mode tạo một phản hồi ngắn với đúng model |
| Custom API | Adapter tương thích cấu hình đang dùng | Catalog nếu endpoint hỗ trợ; nhập ID khi không có | Gọi đúng protocol đã chọn |

OpenAI hỗ trợ lấy catalog bằng `GET /v1/models`; dữ liệu catalog cơ bản không tự chứng minh mọi model hỗ trợ task text/schema. Model chọn phải được xác nhận qua capability mapping và test inference. [OpenAI Models API](https://developers.openai.com/api/reference/resources/models/methods/list).

OpenAI adapter đề xuất Responses API và Structured Outputs cho content proposals/CV review; adapter đọc output theo protocol này, không giả định response luôn là `choices[0]`. [OpenAI text generation](https://developers.openai.com/api/docs/guides/text), [Structured Outputs](https://developers.openai.com/api/docs/guides/structured-outputs).

Claude hỗ trợ print mode, JSON/schema; structured response nằm trong `structured_output`, và model có thể chọn bằng `--model`. Bridge parse output riêng thay vì giả lập Chat Completions ở browser. [Claude programmatic usage](https://code.claude.com/docs/en/headless), [CLI reference](https://code.claude.com/docs/en/cli-reference).

### UI cấu hình

Mỗi provider có card riêng: enabled, connection mode, endpoint hoặc bridge URL, secret status, model, timeout, capabilities và last test. Active provider/model nằm ở header của AI Assistant và CV Studio; Add/Edit AI suggestion hiển thị cùng lựa chọn.

Ba thao tác riêng:

1. **Check installation/service:** kiểm tra backend/bridge và CLI version; không suy diễn thành model hoạt động.
2. **Load models:** tải/dò lựa chọn phù hợp provider. Không hardcode một model “latest” rồi coi mọi tài khoản dùng được.
3. **Test connection:** request inference tối thiểu, kết quả gồm provider/model, latency, auth/capability và lỗi rõ ràng. Nút test thể hiện đây là một AI request.

Thay model/key/endpoint/binary/transport làm test cũ stale. `Set as system default` chỉ dùng config đã test với fingerprint hiện tại. Không tự fallback sang provider khác khi lỗi.

Schema settings đề xuất: `version:2`, `_revision`, `activeProvider`, `providers`, `timeoutMs`, `updatedAt`; mỗi provider giữ `model`, secret reference, transport, capabilities và `testFingerprint/testedAt/status`. Không lưu raw CLI token vào Firestore.

### Shared service

`ai.run({task, input, contextRefs, responseSchema, sourceFingerprint, signal})` resolve active settings tại thời điểm bắt đầu request. Task gồm chat, content-write, content-rewrite, icon-suggest, cv-review, jd-analysis, cv-optimize.

Mọi chức năng dùng adapter chung. Request snapshot gồm provider/model/config revision, context revision, draft/CV style/JD và session. Kết quả cũ không được Apply khi một thành phần liên quan đổi. Chat history giới hạn dung lượng; có cancel, retry chủ động và error phân biệt.

Model options như temperature, max output hoặc reasoning phải mapping theo capability; không gửi tham số không được model hỗ trợ theo một body cố định cho mọi provider.

## 5. Local bridge cho Claude và server cho OpenAI

Luồng local baseline: `npm run admin:local` khởi động Node server phục vụ Admin và `/api/admin-ai/*` cùng origin. Server static hiện tại tiếp tục dùng cho xem portfolio.

- Bridge phát hiện executable, probe version/help và validate argument allowlist. Dùng native executable hoặc Node entrypoint đã xác minh trên Windows; không xây shell command từ text/JD.
- Prompt truyền qua stdin; job có cwd riêng. CLI task chỉ tạo văn bản/proposal, không cần quyền chạy shell, sửa repo hoặc dùng MCP khác.
- Theo capabilities thực tế, Claude dùng restricted/safe mode, tắt built-in tools và deny MCP; probe các flag trước khi bật. Không dùng bypass permissions. Không dùng chế độ làm mất subscription authentication khi mục tiêu là dùng login hiện có.
- Bridge bind loopback, xác minh Host/Origin, pairing token và admin identity. Token/secret đặt ngoài static root. Không trả key/token cho browser hoặc ghi toàn bộ JD vào log.
- Với website hosted, OpenAI dùng backend được bảo vệ bằng Firebase admin authentication; không đưa API key mới vào JavaScript public. Static hosting không tự trở thành backend.
- Hosted HTTPS gọi local CLI có thể gặp browser network restrictions; phải kiểm thử deployment/browser cụ thể. Khi không kết nối được, UI hướng dẫn mở Admin local. Không báo Claude Ready trên website hosted chỉ vì máy có CLI.
- Timeout, input/output limits, concurrency, cancel process tree và cleanup job được kiểm thử riêng. Không retry inference tự động nhiều lần.

OpenAI hướng dẫn giữ API key trên server, không expose trong client code. [OpenAI API authentication](https://developers.openai.com/api/reference/overview).

## 6. Content Builder và Context Library

### A. Thêm nội dung public

Ở Content có **Add content** với các lựa chọn:

- Record trong section hiện có: Experience, Project, Skill category, Achievement, Education/Certification, Contact.
- Custom block mới: Text, Bullet list, Links, Key/value hoặc Card group. Chỉ preset có renderer mới được chọn.

Builder gồm title, type, section placement, body/items, icon, public/private, Include in CV và CV section mapping. Có preview public/CV, Save draft, Publish, Undo và Hide/Restore. Stable UUID cho block/field/item; đổi label không đổi ID.

Với dữ liệu public, đề xuất một document `portfolio/custom-blocks` có version/revision và block payload đầy đủ để publish schema/value atomically. Thêm vào Firestore read allowlist, loader, local cache/seed export và CV source mapper. Private blocks nằm trong `admin/*` riêng.

Không thêm form input nếu public/CV renderer chưa hỗ trợ. Không đổi type gây mất dữ liệu; preview conversion hoặc tạo block mới. Section chuẩn giữ vị trí hiện tại; custom block chọn anchor/preset placement rõ ràng.

### B. Thêm context riêng cho AI

Context Library có **Add context**: title, plain text, tags, purpose, source link tùy chọn, enabled và revision. Có thể dùng làm background facts, writing style hoặc JD reference.

MVP nhận plain text nhập/dán; URL là reference metadata, không hứa tự crawl. Upload PDF/DOCX là giai đoạn sau khi có parser, limits và text preview.

Lưu private tại `admin/context-library`. Picker context trong Chat/Content AI/CV cho biết nguồn nào đang được gửi. Chọn mặc định toàn hệ thống là danh sách refs có thể override theo task, không mặc định gửi tất cả tài liệu riêng.

Context riêng chỉ hỗ trợ viết/phân tích; không tự publish. Nếu dùng context làm bằng chứng mới, người dùng phải duyệt thông tin đó trước khi đưa vào Content/CV. Source refs bị xóa/đổi revision đánh dấu proposal stale.

### C. AI hỗ trợ viết

Flow: nhập dữ kiện → chọn tone/language/length → chọn context → Generate → xem before/after + nguồn → chọn Apply → preview → lưu.

Các action: Draft from notes, Improve clarity, Make concise, Convert to bullets, Translate và Suggest icon. AI không tự thêm employer/date/certification/metric. Trường chưa có bằng chứng được đánh dấu cần bổ sung, không điền bằng số liệu bịa.

AI output theo JSON schema, whitelist action/key, validation type/length/URL và source refs. Apply vào draft duy nhất; không tự save/publish. Nếu form/context thay trong khi request chạy, Apply bị khóa.

### D. Icon phù hợp

Tái sử dụng `js/icons.js`: semantic symbols cho khái niệm, brand assets khi đúng tên công cụ/tổ chức. AI trả `iconId`/`brandId` hợp lệ và lý do, tối đa vài lựa chọn; UI preview để owner chọn.

Không lưu raw SVG/HTML/JS từ AI. Icon picker có tìm kiếm, nhóm, reset và fallback hợp lệ. Icon xuất hiện đúng trong public block; PDF CV mapping chủ yếu một cột văn bản để giữ thứ tự đọc, không bắt buộc mang mọi icon sang PDF.

## 7. Thứ tự triển khai và file dự kiến

| Giai đoạn | Công việc | Nghiệm thu |
|---|---|---|
| 1 — Workspace routes | CV pane toàn màn hình, giữ draft, Back/Forward, responsive preview | Không còn popup CV, đọc được trên desktop/mobile, đổi trang không mất JD |
| 2 — Shared AI service | Provider settings v2, model picker, adapters, fingerprint, migration config cũ | Chat, Add/Edit và CV cùng provider/model; đổi config làm test stale |
| 3 — Backend/CLI | OpenAI proxy, Claude bridge, detection/auth/test/cancel | Phân biệt installed và inference verified; test đúng model, không leak secrets |
| 4 — Content/context | Block registry/renderer, context library, refs picker, draft/visibility/revision | Add/Edit/Publish/Hide/Restore public và private đúng nguồn |
| 5 — AI writer/icons | Typed proposals, diff/source refs, icon registry picker, Undo | Proposal apply đúng draft; icon tồn tại và render được |
| 6 — Regression/deployment | Unit/browser/PDF/bridge, auth/offline/conflict, docs | Chức năng cũ pass; public CV vẫn bằng bản chính thức; không công khai context riêng |

Module dự kiến: `js/admin/workspace.js`, `js/admin/router.js`, `js/admin/config/providers.js`, `js/ai/service.js`, `js/ai/adapters/*`, `tools/admin-server.cjs`, `tools/ai-bridge/*`, `js/admin/content/builder.js`, `js/admin/context/library.js`, `js/custom/model.js`, `js/custom/renderers.js`, `js/custom/cv-mapping.js`, `js/admin/icon-picker.js`.

Migration config cũ sang Custom API adapter giữ endpoint/model; không chuyển sang OpenAI khi owner chưa chọn. Không sao chép secret sang public seed. CV snapshot v4 không bị migration provider thay đổi nội dung.

## 8. Bộ test bắt buộc

- CV pane fill main area, không overlay/dialog; target2 preview<=2 hoặc trạng thái không fit rõ ràng; đổi sidebar giữ draft; PDF Admin/public giống text, links, layout và page count.
- Cấu hình provider A/model X được dùng bởi cả Chat/Add/Edit/CV; model Y không dùng trạng thái test của X; failed/cancelled test không thành Ready.
- OpenAI catalog error/model unsupported/schema refusal/rate limit/timeout được phân biệt; không fallback dịch vụ ngầm.
- Claude missing/not-authenticated/incompatible version/model error/timeout/cancel process tree; browser hosted không kết nối bridge có trạng thái đúng.
- Content mới render public và được chọn trong CV draft; rename/reorder/hide/restore giữ ID; publish conflict không mất dữ liệu.
- Context private không nằm trong public Firestore snapshot, seed, logs hoặc public CV metadata; picker chỉ gửi refs đã chọn.
- AI đề xuất sai key/URL/icon/schema bị từ chối; before/after render text an toàn; đổi form/context/JD khi request chạy làm proposal stale.
- Desktop/mobile keyboard navigation, labels, focus, readable contrast, fixed footer không che nội dung.

Tách rõ test giả lập và test provider thật: mock pass xác nhận luồng ứng dụng, không chứng minh API key/CLI account có thể inference. Chỉ trạng thái sau test connection thật trên cấu hình đã chọn mới được hiển thị Verified.
