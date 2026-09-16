document.addEventListener("DOMContentLoaded", function () {
  loadCurrentCase();
  initializeUsers();
  hydrateCurrentUser();

  var revealItems = document.querySelectorAll(".reveal-up");

  if ("IntersectionObserver" in window) {
    var observer = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.2
      }
    );

    revealItems.forEach(function (item) {
      observer.observe(item);
    });
  } else {
    revealItems.forEach(function (item) {
      item.classList.add("is-visible");
    });
  }

  var forms = document.querySelectorAll(".needs-validation");

  forms.forEach(function (form) {
    form.addEventListener("submit", function (event) {
      var status = form.querySelector("[data-form-status]");
      var successMessage = form.getAttribute("data-success-message") || "Demo only: form submission is not connected yet.";
      var formType = form.getAttribute("data-form-type");
      var shouldApplyValidationState = true;

      if (!form.checkValidity()) {
        event.preventDefault();
        event.stopPropagation();
        if (status) {
          status.textContent = "";
        }
      } else if (formType === "login") {
        event.preventDefault();
        shouldApplyValidationState = handleLogin(form, status);
      } else {
        event.preventDefault();

        if (status) {
          status.textContent = successMessage;
        }

        form.reset();
      }

      if (shouldApplyValidationState) {
        form.classList.add("was-validated");
      }
    });
  });
});

function loadCurrentCase() {
  fetch("model/cases.json")
    .then(function (response) {
      if (!response.ok) {
        throw new Error("Failed to load case model.");
      }

      return response.json();
    })
    .then(function (data) {
      if (!data || !data.currentCase) {
        return;
      }

      setText("[data-case-title]", data.currentCase.title);
      setText("[data-case-summary]", data.currentCase.summary);
      setText("[data-case-id]", data.currentCase.id);
      setText("[data-case-preview-title]", data.currentCase.title);
      setText("[data-case-preview-summary]", data.currentCase.summary);
      setText("[data-case-goal]", data.currentCase.goal);
      setText("[data-case-goal-summary]", data.currentCase.goalSummary);
      setText("[data-case-evidence-count]", data.currentCase.evidenceCount);
      setText("[data-case-suspect-count]", data.currentCase.suspectCount);
      setText("[data-case-report-count]", data.currentCase.reportCount);
      setText("[data-case-accusation-count]", data.currentCase.accusationCount);
    })
    .catch(function () {
      setText("[data-case-title]", "Current case unavailable");
      setText("[data-case-summary]", "Start a local server or publish the site so the JSON case model can be loaded.");
      setText("[data-case-preview-title]", "Current case unavailable");
      setText("[data-case-preview-summary]", "The page could not read model/cases.json.");
      setText("[data-case-goal]", "Case objective unavailable");
      setText("[data-case-goal-summary]", "Check that the site is being served over HTTP.");
    });
}

var barkvaultUsers = [];

function initializeUsers() {
  fetch("model/users.json")
    .then(function (response) {
      if (!response.ok) {
        throw new Error("Failed to load users model.");
      }

      return response.json();
    })
    .then(function (data) {
      barkvaultUsers = data && Array.isArray(data.users) ? data.users : [];
    })
    .catch(function () {
      barkvaultUsers = [];
    });
}

function handleLogin(form, status) {
  var usernameField = form.querySelector("input[type='text']");
  var passwordField = form.querySelector("input[type='password']");
  var username = usernameField ? usernameField.value.trim() : "";
  var password = passwordField ? passwordField.value : "";
  var matchedUser = barkvaultUsers.find(function (user) {
    return user.username === username && user.password === password;
  });

  if (status) {
    if (matchedUser) {
      status.textContent = "Login successful. Welcome, " + (matchedUser.displayName || matchedUser.username) + ".";
    } else {
      status.textContent = "Invalid username or password.";
    }
  }

  if (matchedUser) {
    sessionStorage.setItem(
      "barkvaultCurrentUser",
      JSON.stringify({
        username: matchedUser.username,
        displayName: matchedUser.displayName || matchedUser.username,
        role: matchedUser.role || "user"
      })
    );
    form.reset();
    form.classList.remove("was-validated");
    window.setTimeout(function () {
      window.location.href = "landing.html";
    }, 300);
    return false;
  }

  return true;
}

function setText(selector, value) {
  var element = document.querySelector(selector);

  if (element) {
    element.textContent = value;
  }
}

function hydrateCurrentUser() {
  var storedUser = sessionStorage.getItem("barkvaultCurrentUser");

  if (!storedUser) {
    return;
  }

  try {
    var parsedUser = JSON.parse(storedUser);
    var displayName = parsedUser.displayName || parsedUser.username || "Investigator";

    setText("[data-current-user-name]", displayName);
    setText("[data-current-user-nav]", "User: " + displayName);
  } catch (error) {
    sessionStorage.removeItem("barkvaultCurrentUser");
  }
}
