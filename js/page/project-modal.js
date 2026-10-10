    // ── Scroll to top on every page load/reload ──────────────────────────
    if ('scrollRestoration' in history) {
      history.scrollRestoration = 'manual';
    }
    window.addEventListener('load', function () {
      window.scrollTo({ top: 0, behavior: 'instant' });
    });

    // ── Helper: open a project modal by id ───────────────────────────────
    function _openProjectModal(projectId) {
      var modal = document.getElementById(projectId + '-modal');
      if (modal) {
        modal.style.display = 'block';
        document.body.style.overflow = 'hidden';
      } else {
        console.warn('[Portfolio] Modal not found:', projectId + '-modal');
      }
    }

    // ── Helper: close all open modals ────────────────────────────────────
    function _closeAllModals() {
      document.querySelectorAll('.modal').forEach(function (m) {
        m.style.display = 'none';
      });
      document.body.style.overflow = '';
    }

    // Expose for portfolio-loader.js openProjectModal calls
    window.openProjectModal = _openProjectModal;

    document.addEventListener('DOMContentLoaded', function () {

      // ── Event delegation: View Details button (works for static + dynamic cards) ──
      document.body.addEventListener('click', function (e) {
        // View Details button
        var btn = e.target.closest('.view-project-btn');
        if (btn) {
          e.stopPropagation();
          var projectId = btn.getAttribute('data-project');
          if (projectId) _openProjectModal(projectId);
          return;
        }

        // Project card click (whole card is clickable if data-project on card)
        var card = e.target.closest('[data-modal-id]');
        if (card) {
          _openProjectModal(card.getAttribute('data-modal-id'));
          return;
        }

        // Close modal when clicking overlay background
        if (e.target.classList.contains('modal')) {
          _closeAllModals();
          return;
        }

        // Close button inside modal
        var closeBtn = e.target.closest('.close-modal, .modal-close-btn');
        if (closeBtn) {
          _closeAllModals();
          return;
        }

        // Lightbox: .lb-trigger images (handles dynamically injected cards too)
        var lbImg = e.target.closest('.lb-trigger');
        if (lbImg && typeof _lb !== 'undefined') {
          e.stopPropagation();
          var src = lbImg.getAttribute('data-src') || lbImg.src || '';
          var caption = lbImg.getAttribute('data-caption') || lbImg.alt || '';
          var alt = lbImg.alt || caption;
          if (src) _lb.open(src, caption, alt);
          return;
        }
      });

      // ── Escape key: close any open modal ─────────────────────────────────
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape') {
          var hasOpenModal = Array.from(document.querySelectorAll('.modal')).some(function (m) {
            return m.style.display === 'block';
          });
          if (hasOpenModal) _closeAllModals();
        }
      });
    });
