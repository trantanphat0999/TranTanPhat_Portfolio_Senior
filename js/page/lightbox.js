    /* ===== Universal Lightbox — runs immediately (script at end of body, DOM is ready) ===== */
    var _lb = (function () {
      var overlay = document.getElementById('lightbox-overlay');
      var lbImg = document.getElementById('lightbox-img');
      var lbCaption = document.getElementById('lightbox-caption');

      function openLightbox(src, caption, alt) {
        lbImg.src = src;
        lbImg.alt = alt || caption || '';
        lbCaption.textContent = caption || '';
        overlay.classList.add('lb-open');
        document.body.style.overflow = 'hidden';
      }

      function closeLightbox() {
        overlay.classList.remove('lb-open');
        document.body.style.overflow = '';
        setTimeout(function () { lbImg.src = ''; }, 300);
      }

      // NOTE: .lb-trigger click is handled via event delegation in #project-modal-script
      //       (supports both static cards in HTML and dynamic cards injected by Firebase).
      // Apply cursor style to existing static triggers on load only.
      document.querySelectorAll('.lb-trigger').forEach(function (el) {
        el.style.cursor = 'zoom-in';
      });

      // Close on overlay background click
      overlay.addEventListener('click', function (e) {
        if (e.target === overlay) closeLightbox();
      });

      // Stop clicks on the img-wrap from closing
      document.getElementById('lightbox-img-wrap').addEventListener('click', function (e) {
        e.stopPropagation();
      });

      // Escape key
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && overlay.classList.contains('lb-open')) closeLightbox();
      });

      // Zalo button (QR code)
      var zaloBtn = document.getElementById('zalo-btn');
      if (zaloBtn) {
        zaloBtn.addEventListener('click', function () {
          openLightbox('image/qrzalo.jpg', 'Quét mã QR để kết bạn Zalo 📱', 'Zalo QR Code');
        });
      }

      return { open: openLightbox, close: closeLightbox };
    }());
