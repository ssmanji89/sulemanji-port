(function () {
  window.onWorkWithMeTurnstile = function (token) {
    const field = document.querySelector('[name="turnstileToken"]');
    if (field) field.value = token;
  };

  window.onWorkWithMeTurnstileExpired = function () {
    const field = document.querySelector('[name="turnstileToken"]');
    if (field) field.value = "";
  };

  function splitLinks(value) {
    return String(value || "")
      .split(/\r?\n/)
      .map(function (line) { return line.trim(); })
      .filter(Boolean);
  }

  function serializeIntake(formData) {
    return {
      name: String(formData.get("name") || "").trim(),
      email: String(formData.get("email") || "").trim(),
      contextType: String(formData.get("contextType") || ""),
      problem: String(formData.get("problem") || "").trim(),
      desiredOutcome: String(formData.get("desiredOutcome") || "").trim(),
      priorAttempts: String(formData.get("priorAttempts") || "").trim(),
      sanitizedLinks: splitLinks(formData.get("sanitizedLinks")),
      path: String(formData.get("path") || ""),
      termsAccepted: formData.get("termsAccepted") === "on",
      website: String(formData.get("website") || ""),
      turnstileToken: String(formData.get("turnstileToken") || formData.get("cf-turnstile-response") || "")
    };
  }

  function caseTokenFromLocation() {
    return new URLSearchParams(window.location.search).get("case") || "";
  }

  document.addEventListener("DOMContentLoaded", function () {
    const form = document.getElementById("work-with-me-intake");
    if (form) {
      form.addEventListener("submit", async (event) => {
        event.preventDefault();
        const submit = form.querySelector('[type="submit"]');
        const status = document.getElementById("intake-status");
        const payload = serializeIntake(new FormData(form));
        if (!payload.turnstileToken) {
          status.textContent = "Complete the verification check before submitting.";
          return;
        }
        submit.disabled = true; status.textContent = "Submitting...";
        try {
          const response = await fetch(form.dataset.endpoint, {
            method: "POST", headers: { "content-type": "application/json" },
            body: JSON.stringify(payload)
          });
          const result = await response.json();
          if (!response.ok) throw new Error(result.error || "submission_failed");
          window.location.assign(result.next === 'checkout' ? `/work-with-me/priority?case=${encodeURIComponent(result.caseToken)}` : `/work-with-me/thanks?case=${encodeURIComponent(result.caseToken)}`);
        } catch (_) { status.textContent = "Submission failed. Your text remains here; try again or email ssmanji89@gmail.com."; }
        finally { submit.disabled = false; }
      });
    }

    const checkout = document.getElementById("priority-checkout");
    if (!checkout) return;

    const status = document.getElementById("priority-status");
    checkout.addEventListener("click", async function () {
      const caseToken = caseTokenFromLocation();
      if (!caseToken) {
        status.textContent = "Open this page from a submitted Priority Discovery intake.";
        return;
      }
      if (checkout.dataset.checkoutReady !== "true") {
        status.textContent = "Deposit checkout is unavailable until legal/tax review is recorded.";
        return;
      }

      checkout.disabled = true;
      status.textContent = "Preparing checkout...";
      try {
        const response = await fetch(`${checkout.dataset.endpointBase}/${encodeURIComponent(caseToken)}/deposit-checkout`, {
          method: "POST",
          headers: { "content-type": "application/json" }
        });
        const result = await response.json();
        if (!response.ok) throw new Error(result.error || "checkout_failed");
        window.location.assign(result.checkoutUrl);
      } catch (_) {
        status.textContent = "Checkout could not start. Try again later or email ssmanji89@gmail.com.";
      } finally {
        checkout.disabled = false;
      }
    });
  });

  window.serializeIntake = serializeIntake;
})();
