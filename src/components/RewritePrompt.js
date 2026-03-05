import { escapeHtml } from '../utils.js';

// Shows the correct answer at low opacity and a textarea to retype it.
// user-select: none on the answer prevents copy-paste.
// bind(root, onSubmit) — onSubmit(typedString)
export function RewritePrompt({ correctAnswer, feedback }) {
  const fbHtml = feedback
    ? `<div class="feedback feedback--incorrect">${feedback.msg}</div>`
    : '';

  return {
    html: `
      <div class="card rewrite-prompt fade-in">
        <p class="rewrite-prompt__label">Read the correct answer, then rewrite it:</p>
        <div class="rewrite-prompt__answer">${escapeHtml(correctAnswer)}</div>
        <textarea
          class="rewrite-ta"
          placeholder="Retype the answer exactly…"
          rows="5"
          spellcheck="false"
          autocomplete="off"
        ></textarea>
        ${fbHtml}
        <div class="answer-input__actions">
          <button class="btn btn--primary rewrite-btn" disabled>Submit (5)</button>
        </div>
      </div>
    `,
    bind(root, onSubmit) {
      const ta = root.querySelector('.rewrite-ta');
      const btn = root.querySelector('.rewrite-btn');
      const answerEl = root.querySelector('.rewrite-prompt__answer');
      ta.focus();

      // Answer is fully visible during the countdown, then fades once the user can type
      let secs = 5;
      const timer = setInterval(() => {
        if (!btn.isConnected) { clearInterval(timer); return; }
        secs--;
        if (secs > 0) {
          btn.textContent = `Submit (${secs})`;
        } else {
          clearInterval(timer);
          btn.disabled = false;
          btn.textContent = 'Submit';
          // Fade the answer so the user types from memory, not just copies
          answerEl.classList.add('rewrite-prompt__answer--dim');
        }
      }, 1000);

      function submit() {
        if (btn.disabled) return;
        onSubmit(ta.value);
      }

      btn.addEventListener('click', submit);
      ta.addEventListener('keydown', e => {
        if (e.key === 'Enter' && e.ctrlKey) { e.preventDefault(); submit(); }
      });
    },
  };
}
