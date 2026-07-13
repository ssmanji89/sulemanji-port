(function () {
  var shell = document.querySelector(".quote-shell");
  if (!shell) return;

  var status = document.getElementById("quote-status");
  var details = document.getElementById("quote-details");
  var windows = document.getElementById("quote-windows");
  var endpointBase = shell.getAttribute("data-endpoint-base");
  var token = window.location.hash ? window.location.hash.slice(1) : "";

  function setStatus(message) {
    if (status) status.textContent = message;
  }

  function dollars(cents) {
    return (cents / 100).toLocaleString(undefined, {
      style: "currency",
      currency: "USD",
    });
  }

  function localTime(value) {
    return new Date(value).toLocaleString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short",
    });
  }

  function centralTime(value) {
    return new Date(value).toLocaleString(undefined, {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
      timeZoneName: "short",
      timeZone: "America/Chicago",
    });
  }

  function renderQuote(payload) {
    var quote = payload.quote;
    details.hidden = false;
    details.innerHTML = [
      "<dl>",
      "<div><dt>Session length</dt><dd>" + quote.durationMinutes + " minutes</dd></div>",
      "<div><dt>Session quote</dt><dd>" + dollars(quote.totalCents) + "</dd></div>",
      "<div><dt>Discovery credit</dt><dd>" + dollars(quote.creditCents) + "</dd></div>",
      "<div><dt>Remaining balance</dt><dd>" + dollars(quote.balanceCents) + "</dd></div>",
      "<div><dt>Credit expires</dt><dd>" + localTime(quote.expiresAt) + "</dd></div>",
      "</dl>",
    ].join("");

    windows.hidden = false;
    windows.innerHTML = "";
    payload.windows.forEach(function (slot) {
      var button = document.createElement("button");
      button.type = "button";
      button.className = "btn btn-outline quote-window";
      button.textContent =
        localTime(slot.startsAt) + " / " + centralTime(slot.startsAt);
      button.addEventListener("click", function () {
        holdSlot(slot, button);
      });
      windows.appendChild(button);
    });
  }

  function holdSlot(slot, button) {
    button.disabled = true;
    setStatus("Holding that window...");
    fetch(endpointBase + "/" + encodeURIComponent(token) + "/holds", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ startsAt: slot.startsAt, endsAt: slot.endsAt }),
    })
      .then(function (response) {
        if (!response.ok) throw new Error("hold_failed");
        return response.json();
      })
      .then(function (payload) {
        setStatus("Opening secure checkout...");
        window.location.assign(payload.checkoutUrl);
      })
      .catch(function () {
        button.disabled = false;
        setStatus("That window is no longer available. Refresh for current options.");
      });
  }

  if (!token || !endpointBase || !details || !windows) {
    setStatus("Private quote token is missing.");
    return;
  }

  fetch(endpointBase + "/" + encodeURIComponent(token), {
    headers: { accept: "application/json" },
  })
    .then(function (response) {
      if (!response.ok) throw new Error("quote_unavailable");
      return response.json();
    })
    .then(function (payload) {
      setStatus("Select a priority session window.");
      renderQuote(payload);
    })
    .catch(function () {
      setStatus("This private quote is unavailable or expired.");
    });
})();
