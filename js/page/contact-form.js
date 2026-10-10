    document.addEventListener('DOMContentLoaded', function () {
      // Initialize EmailJS
      if(window.emailjs)emailjs.init("f03v99pX6r2qWKK_r");

      const contactForm = document.getElementById('contact-form');
      const nameInput = document.getElementById('name');
      const emailInput = document.getElementById('email');
      const subjectInput = document.getElementById('subject');
      const messageInput = document.getElementById('message');
      const privacyCheckbox = document.getElementById('privacy');

      const formStatus=document.createElement('p');formStatus.setAttribute('role','status');formStatus.setAttribute('aria-live','polite');contactForm.appendChild(formStatus);
      document.getElementById('privacy-policy-trigger')?.addEventListener('click',event=>{event.preventDefault();document.getElementById('privacy-policy-modal').style.display='block';});
      function showError(input, message) {
        input.setAttribute('aria-invalid','true');
        const errorDiv = input.parentElement.querySelector('.error-message');
        if (!errorDiv) {
          const div = document.createElement('div');
          div.className = 'error-message text-amber-600 text-sm mt-1';
          div.textContent = message;
          input.parentElement.appendChild(div);
        }
        input.classList.add('border-amber-500');
      }

      function removeError(input) {
        input.removeAttribute('aria-invalid');
        const errorDiv = input.parentElement.querySelector('.error-message');
        if (errorDiv) {
          errorDiv.remove();
        }
        input.classList.remove('border-amber-500');
      }

      function validateEmail(email) {
        const re = /^(([^<>()\[\]\\.,;:\s@"]+(\.[^<>()\[\]\\.,;:\s@"]+)*)|(".+"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
        return re.test(String(email).toLowerCase());
      }

      function validateForm() {
        let isValid = true;

        // Name validation
        if (nameInput.value.trim() === '') {
          showError(nameInput, 'Name is required');
          isValid = false;
        } else if (nameInput.value.trim().length < 2) {
          showError(nameInput, 'Name must be at least 2 characters');
          isValid = false;
        } else {
          removeError(nameInput);
        }

        // Email validation
        if (emailInput.value.trim() === '') {
          showError(emailInput, 'Email is required');
          isValid = false;
        } else if (!validateEmail(emailInput.value.trim())) {
          showError(emailInput, 'Please enter a valid email address');
          isValid = false;
        } else {
          removeError(emailInput);
        }

        // Subject validation
        if (subjectInput.value.trim() === '') {
          showError(subjectInput, 'Subject is required');
          isValid = false;
        } else if (subjectInput.value.trim().length < 5) {
          showError(subjectInput, 'Subject must be at least 5 characters');
          isValid = false;
        } else {
          removeError(subjectInput);
        }

        // Message validation
        if (messageInput.value.trim() === '') {
          showError(messageInput, 'Message is required');
          isValid = false;
        } else if (messageInput.value.trim().length < 20) {
          showError(messageInput, 'Message must be at least 20 characters');
          isValid = false;
        } else if (messageInput.value.trim().length > 500) {
          showError(messageInput, 'Message cannot exceed 500 characters');
          isValid = false;
        } else {
          removeError(messageInput);
        }

        // Privacy checkbox validation
        if (!privacyCheckbox.checked) {
          showError(privacyCheckbox, 'You must agree to the privacy policy');
          isValid = false;
        } else {
          removeError(privacyCheckbox);
        }

        return isValid;
      }

      // Real-time validation
      [nameInput, emailInput, subjectInput, messageInput].forEach(input => {
        input.addEventListener('input', function () {
          if (input.value.trim() !== '') {
            removeError(input);
          }
        });
      });

      privacyCheckbox.addEventListener('change', function () {
        if (this.checked) {
          removeError(this);
        }
      });

      // Character counter for message
      const maxLength = 500;
      messageInput.addEventListener('input', function () {
        const remaining = maxLength - this.value.length;
        let counterDiv = this.parentElement.querySelector('.char-counter');
        if (!counterDiv) {
          counterDiv = document.createElement('div');
          counterDiv.className = 'char-counter text-sm text-gray-500 mt-1';
          this.parentElement.appendChild(counterDiv);
        }
        counterDiv.textContent = `${remaining} characters remaining`;
        if (remaining < 0) {
          counterDiv.classList.add('text-amber-600');
        } else {
          counterDiv.classList.remove('text-amber-600');
        }
      });

      if (contactForm) {
        contactForm.addEventListener('submit', function (event) {
          event.preventDefault();

          if (validateForm()) {
            const submitButton = contactForm.querySelector('button[type="submit"]');
            const originalText = submitButton.innerHTML;

            // Disable button and show loading
            submitButton.disabled = true;
            submitButton.innerHTML = '<i class="ri-loader-4-line animate-spin mr-2"></i>Sending...';

            // Prepare email template parameters
            const templateParams = {
              name: nameInput.value.trim(),
              email: emailInput.value.trim(),
              subject: subjectInput.value.trim(),
              message: messageInput.value.trim(),
              to_email: 'trantanphat190999@gmail.com'
            };

            // Send email using EmailJS
            formStatus.textContent='Sending your message…';
            const request=window.emailjs ? emailjs.send('service_33zedjl','template_c60zhqd',templateParams) : Promise.reject(new Error('Email service unavailable'));
            let sendTimer;
            Promise.race([request,new Promise((_,reject)=>{sendTimer=setTimeout(()=>reject(new Error('Delivery timeout')),30000);})]).finally(()=>clearTimeout(sendTimer))
              .then(function (response) {
                formStatus.textContent='Message sent successfully.';

                // Show success message
                const successMessage = document.createElement('div');
                successMessage.className = 'fixed top-4 right-4 bg-green-500 text-white px-6 py-3 rounded shadow-lg z-50 animate-fade-in-out';
                successMessage.innerHTML = '<i class="ri-check-line mr-2"></i>Message sent successfully!';
                document.body.appendChild(successMessage);

                // Reset form
                contactForm.reset();

                // Remove character counter
                const counterDiv = messageInput.parentElement.querySelector('.char-counter');
                if (counterDiv) {
                  counterDiv.remove();
                }

                // Update button text
                submitButton.innerHTML = '<i class="ri-check-line mr-2"></i>Message Sent!';

                // Remove success message after delay
                setTimeout(() => successMessage.remove(), 5000);

                // Reset button after delay
                setTimeout(function () {
                  submitButton.innerHTML = originalText;
                  submitButton.disabled = false;
                }, 3000);
              })
              .catch(function (error) {
                formStatus.textContent='Message could not be sent. Your input is preserved; retry or contact the email address directly.';

                // Show error message
                const errorMessage = document.createElement('div');
                errorMessage.className = 'fixed top-4 right-4 bg-amber-500 text-white px-6 py-3 rounded shadow-lg z-50 animate-fade-in-out';
                errorMessage.innerHTML = '<i class="ri-error-warning-line mr-2"></i>Failed to send message. Please try again.';
                document.body.appendChild(errorMessage);

                // Reset button
                submitButton.innerHTML = originalText;
                submitButton.disabled = false;

                // Remove error message after delay
                setTimeout(() => errorMessage.remove(), 5000);
              });
          }
        });
      }
    });
