    /* ===== Profile Modal — Typewriter Engine ===== */
    (function () {
      var pmOverlay = document.getElementById('profile-modal-overlay');
      var pmBox = document.getElementById('profile-modal-box');
      var pmClose = document.getElementById('pm-close-btn');
      var avatarEl = document.getElementById('avatar-click-area');

      // ── Personal info data ──────────────────────────────────────────────
      // Edit the values below to your liking
      var profileData = [
        { fieldId: 'pmf-name', valueId: 'pmv-name', text: 'Tran Tan Phat' },
        { fieldId: 'pmf-gender', valueId: 'pmv-gender', text: 'Male' },
        { fieldId: 'pmf-dob', valueId: 'pmv-dob', text: 'January 19, 1999' },
        { fieldId: 'pmf-hometown', valueId: 'pmv-hometown', text: 'Binh Tan, Ho Chi Minh City, Vietnam' },
        { fieldId: 'pmf-hobbies', valueId: 'pmv-hobbies', text: 'Exploring new technologies, reading tech blogs, gaming, photography' },
        { fieldId: 'pmf-strengths', valueId: 'pmv-strengths', text: 'Detail-oriented, fast learner, analytical mindset, strong collaborator' },
        { fieldId: 'pmf-weaknesses', valueId: 'pmv-weaknesses', text: 'Perfectionist — sometimes spends too long perfecting edge cases' }
      ];
      // ─────────────────────────────────────────────────────────────────────

      var defaultProfileTexts = profileData.map(function(row) { return row.text; });
      var typingTimeout = null;
      var fieldQueue = [];
      var currentField = 0;
      var currentChar = 0;
      var cursor = null;
      var isRunning = false;

      /* Reset all fields to empty & hidden */
      function resetFields() {
        profileData.forEach(function (d) {
          var field = document.getElementById(d.fieldId);
          var value = document.getElementById(d.valueId);
          if (field) field.classList.remove('pm-visible');
          if (value) {
            value.innerHTML = '';

            var ghost = document.createElement('span');
            ghost.className = 'pm-value-ghost';
            ghost.textContent = d.text;
            value.appendChild(ghost);

            var text = document.createElement('span');
            text.className = 'pm-value-text';
            value.appendChild(text);
          }
        });
      }

      /* Typewrite a single field, then call next() when done */
      function typeField(fieldIdx, next) {
        if (fieldIdx >= profileData.length) { isRunning = false; return; }
        var data = profileData[fieldIdx];
        var fieldEl = document.getElementById(data.fieldId);
        var valueEl = document.getElementById(data.valueId);
        if (!fieldEl || !valueEl) { next && next(); return; }
        var textEl = valueEl.querySelector('.pm-value-text');
        if (!textEl) { next && next(); return; }

        // Make the row visible (slide in)
        fieldEl.classList.add('pm-visible');

        // Add blinking cursor
        cursor = document.createElement('span');
        cursor.className = 'pm-cursor';
        textEl.appendChild(cursor);

        var chars = data.text.split('');
        var charIdx = 0;

        function typeNext() {
          if (charIdx < chars.length) {
            // Insert character before cursor
            var textNode = document.createTextNode(chars[charIdx]);
            textEl.insertBefore(textNode, cursor);
            charIdx++;
            typingTimeout = setTimeout(typeNext, 30);
          } else {
            // Done — remove cursor blink, show static cursor briefly, then move on
            if (cursor && cursor.parentNode) cursor.parentNode.removeChild(cursor);
            cursor = null;
            typingTimeout = setTimeout(function () {
              next && next();
            }, 200);
          }
        }

        typingTimeout = setTimeout(typeNext, 60);
      }

      /* Kick off sequential typing of all fields */
      function startTyping() {
        isRunning = true;
        currentField = 0;

        function runNext(idx) {
          if (idx >= profileData.length) { isRunning = false; return; }
          typeField(idx, function () { runNext(idx + 1); });
        }
        // Small initial delay so the modal animation settles first
        typingTimeout = setTimeout(function () { runNext(0); }, 350);
      }

      /* Open */
      function openProfile() {
        const values=window._profileDetails||{};
        profileData.forEach((row,index)=>{const key=row.valueId.replace('pmv-','');row.text=values[key]!==undefined?values[key]:defaultProfileTexts[index];});
        resetFields();
        pmOverlay.classList.add('pm-open');
        document.body.style.overflow = 'hidden';
        if(window.matchMedia('(prefers-reduced-motion: reduce)').matches){profileData.forEach(row=>{document.getElementById(row.fieldId)?.classList.add('pm-visible');const value=document.querySelector('#'+row.valueId+' .pm-value-text');if(value)value.textContent=row.text;});}else startTyping();
      }

      /* Close */
      function closeProfile() {
        pmOverlay.classList.remove('pm-open');
        document.body.style.overflow = '';
        // Cancel any in-flight typing
        if (typingTimeout) clearTimeout(typingTimeout);
        typingTimeout = null;
        isRunning = false;
        if (cursor && cursor.parentNode) cursor.parentNode.removeChild(cursor);
        cursor = null;
      }

      // Avatar click → open profile modal
      if (avatarEl) {
        avatarEl.addEventListener('click', openProfile);
        avatarEl.addEventListener('keydown',event=>{if(event.key==='Enter'||event.key===' '){event.preventDefault();openProfile();}});
      }

      // Close button
      if (pmClose) {
        pmClose.addEventListener('click', closeProfile);
      }

      // Click on overlay background → close
      pmOverlay.addEventListener('click', function (e) {
        if (e.target === pmOverlay) closeProfile();
      });

      // Escape key
      document.addEventListener('keydown', function (e) {
        if (e.key === 'Escape' && pmOverlay.classList.contains('pm-open')) closeProfile();
      });
    }());
