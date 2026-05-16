# Tran Tan Phat - Senior QA Portfolio

Portfolio website ca nhan cho Tran Tan Phat, Senior Quality Assurance Engineer. Project duoc xay dung bang HTML, Tailwind CSS CDN va Vanilla JavaScript, co Firebase Firestore de quan ly data dong, Admin Mode de chinh sua noi dung truc tiep, va local fallback/cache de UI van hien thi du lieu khi mat ket noi Firebase.

## Tinh Nang Chinh

- Portfolio mot trang: hero, summary, experience, skills, projects, achievements, education, contact.
- Render du lieu dong tu Firebase Firestore.
- Local fallback/cache:
  - Khi Firebase connect thanh cong, data moi nhat duoc dong bo vao local cache.
  - Khi Firebase fail/offline, UI dung local cache hoac seed data tu `js/db-seed.js`.
  - Khi online lai, app tu keo data moi nhat tu Firebase va refresh UI.
- Admin Mode:
  - Dang nhap admin de edit/add/delete/reorder noi dung.
  - Save khi offline se luu local va queue de sync lai len Firebase khi reconnect.
  - Config panel co dot trang thai Firebase: xanh la connected, do la disconnected, vang la syncing.
- Export CV va AI content assistant trong Admin Mode.

## Tech Stack

- HTML5
- Tailwind CSS qua CDN
- Vanilla JavaScript ES Modules
- Firebase Firestore
- Remix Icon
- AOS animation
- SortableJS cho reorder trong Admin Mode
- `html2pdf.js` cho export CV
- Node.js local server cho development

## Cau Truc Thu Muc

```text
.
|-- index.html                  # Main portfolio page
|-- seed.html                   # UI de seed/check data Firebase
|-- package.json                # npm scripts va dependencies
|-- tools/
|   `-- local-server.cjs        # Local static server
|-- js/
|   |-- firebase-config.js      # Firebase API + sync local cache
|   |-- db-seed.js              # Seed data mac dinh va seed functions
|   |-- local-portfolio-cache.js# LocalStorage cache + pending sync queue
|   |-- portfolio-loader.js     # Public loader entrypoint
|   |-- loader/app.js           # Render UI tu data
|   |-- admin-mode.js           # Public admin entrypoint
|   `-- admin/app.js            # Admin Mode implementation
|-- image/                      # Static images/assets
|-- cv/                         # CV export/output files
`-- ai/                         # AI project context/knowledge
```

## Chay Local

Yeu cau Node.js da duoc cai tren may.

```bash
npm install
npm start
```

Mo browser tai:

```text
http://127.0.0.1:5173/
```

Neu port `5173` dang duoc dung, co the doi port trong script `start` cua `package.json` hoac chay truc tiep:

```bash
node tools/local-server.cjs 5174 127.0.0.1
```

## Firebase

Firebase config nam trong:

```text
js/firebase-config.js
```

Firestore collection chinh:

```text
portfolio
```

Moi document dai dien cho mot section:

```text
header
summary
experience
skills
projects
achievements
education
contact
metadata
ai-config
```

## Seed Data Len Firebase

Cach de seed data mac dinh:

1. Chay local server bang `npm start`.
2. Mo:

```text
http://127.0.0.1:5173/seed.html
```

3. Dung nut seed tren UI, hoac mo DevTools Console va chay:

```js
import('/js/db-seed.js').then(m => m.seedAll())
```

`js/db-seed.js` cung la bundled fallback data. Khi Firebase khong ket noi duoc va local cache chua co data, app se lay data tu file nay de UI van hien thi du noi dung va hinh anh local.

## Luong Sync Data

1. Page load goi `readAllPortfolioDocs()` tu `js/firebase-config.js`.
2. Neu Firebase connected:
   - Lay data moi nhat tu Firestore.
   - Luu vao local cache.
   - Render UI.
3. Neu Firebase disconnected:
   - Dung local cache trong `localStorage`.
   - Neu chua co cache, dung bundled seed trong `js/db-seed.js`.
4. Admin save khi offline:
   - Luu data vao local cache.
   - Them vao pending write queue.
   - Khi Firebase reconnect, queue duoc flush len Firestore.

## Admin Mode

Cach mo Admin Mode:

- Click `Admin Login` o footer.
- Hoac dung phim tat `Ctrl + Shift + A`.
- Hoac triple-click footer.

Mat khau hien tai nam trong `js/admin/app.js`:

```js
const ADMIN_PASSWORD = 'admin1909';
```

Trong Admin toolbar, nut Config co Firebase signal dot:

- Xanh: Firebase connected.
- Do: Firebase disconnected.
- Vang: dang sync pending writes.

## Ghi Chu Khi Phat Trien

- Khong doi tuy tien cac `data-pl="..."` selector trong `index.html`, vi loader render dua vao cac anchor nay.
- Neu them section moi, can cap nhat ca data seed, loader render va admin form.
- Anh local nen dat trong `image/` va dung path tuong doi nhu `image/example.png`.
- `localStorage` chi la fallback/client cache, khong thay the Firestore lam source of truth khi online.
