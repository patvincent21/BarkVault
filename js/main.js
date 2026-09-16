document.addEventListener("DOMContentLoaded", function () {
  loadCurrentCase();
  initializeUsers();
  hydrateCurrentUser();
  loadLandingCases();
  loadSelectedCase();

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
        handleLogin(form, status);
        shouldApplyValidationState = false;
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
  getCasesModel()
    .then(function (data) {
      var currentCase = findCurrentCase(data);

      if (!currentCase) {
        return;
      }

      setText("[data-case-title]", currentCase.title);
      setText("[data-case-summary]", currentCase.summary);
      setText("[data-case-id]", currentCase.id);
      setText("[data-case-preview-title]", currentCase.title);
      setText("[data-case-preview-summary]", currentCase.summary);
      setText("[data-case-goal]", currentCase.goal);
      setText("[data-case-goal-summary]", currentCase.goalSummary);
      setText("[data-case-evidence-count]", currentCase.evidenceCount);
      setText("[data-case-suspect-count]", currentCase.suspectCount);
      setText("[data-case-report-count]", currentCase.reportCount);
      setText("[data-case-accusation-count]", currentCase.accusationCount);
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

var casesModelPromise;

var barkvaultUsers = [];
var usersReadyPromise;

function getCasesModel() {
  if (!casesModelPromise) {
    casesModelPromise = fetch("model/cases.json")
      .then(function (response) {
        if (!response.ok) {
          throw new Error("Failed to load case model.");
        }

        return response.json();
      });
  }

  return casesModelPromise;
}

function findCurrentCase(data) {
  if (!data || !Array.isArray(data.cases) || !data.cases.length) {
    return null;
  }

  var currentCase = data.cases.find(function (caseItem) {
    return caseItem.slug === data.currentCaseId;
  });

  return currentCase || data.cases[0];
}

function loadLandingCases() {
  var container = document.querySelector("[data-case-catalog]");

  if (!container) {
    return;
  }

  getCasesModel()
    .then(function (data) {
      var caseItems = data && Array.isArray(data.cases) ? data.cases : [];

      if (!caseItems.length) {
        container.innerHTML =
          '<div class="col-12 reveal-up is-visible"><article class="case-card h-100"><h3>No cases available</h3><p>Add case entries to model/cases.json to populate this catalog.</p></article></div>';
        return;
      }

      container.innerHTML = caseItems
        .map(function (caseItem) {
          return (
            '<div class="col-lg-4 col-md-6 reveal-up is-visible">' +
            '<article class="case-card h-100 d-flex flex-column">' +
            '<p class="case-label">' + escapeHtml(caseItem.id) + '</p>' +
            '<h3>' + escapeHtml(caseItem.title) + '</h3>' +
            '<p>' + escapeHtml(caseItem.summary) + '</p>' +
            '<div class="case-card-meta">' +
            '<span class="case-chip">' + escapeHtml(caseItem.difficulty || 'Unknown difficulty') + '</span>' +
            '<span class="case-chip">' + String(caseItem.suspectCount || 0) + ' suspects</span>' +
            '<span class="case-chip">' + String(caseItem.evidenceCount || 0) + ' evidence items</span>' +
            '</div>' +
            '<div class="case-card-actions">' +
            '<a class="btn btn-signal" href="case.html?case=' + encodeURIComponent(caseItem.slug || '') + '">' +
            escapeHtml(caseItem.startLabel || 'Start case') +
            '</a>' +
            '</div>' +
            '</article>' +
            '</div>'
          );
        })
        .join("");
    })
    .catch(function () {
      container.innerHTML =
        '<div class="col-12 reveal-up is-visible"><article class="case-card h-100"><h3>Case catalog unavailable</h3><p>The landing page could not read model/cases.json.</p></article></div>';
    });
}

function loadSelectedCase() {
  var titleElement = document.querySelector("[data-selected-case-title]");

  if (!titleElement) {
    return;
  }

  var params = new URLSearchParams(window.location.search);
  var selectedSlug = params.get("case");

  getCaseDetailModel(selectedSlug || "case-001")
    .then(function (data) {
      var selectedCase = findCurrentCase(data);

      if (!selectedCase) {
        setText("[data-selected-case-id]", "Case unavailable");
        setText("[data-selected-case-title]", "No case found");
        setText("[data-selected-case-summary]", "The requested case does not exist in the current model.");
        return;
      }

      document.title = "barkvault | " + selectedCase.title;
      setText("[data-selected-case-id]", selectedCase.id);
      setText("[data-selected-case-title]", selectedCase.title);
      setText("[data-selected-case-summary]", selectedCase.summary);
      renderPoliceReport(selectedCase.policeReport);
      renderSuspects(selectedCase.suspects);
      renderWitnessStatements(selectedCase.witnessStatements);
      renderMedicalReport(selectedCase.medicalReport);
      renderEvidences(selectedCase.evidences);
      renderGuessTheCriminal(selectedCase.guessTheCriminal, selectedCase.solution);
    })
    .catch(function () {
      setText("[data-selected-case-id]", "Case unavailable");
      setText("[data-selected-case-title]", "Failed to load case");
      setText("[data-selected-case-summary]", "Check that the site is being served over HTTP and the case model is available.");
      setText("[data-police-report-title]", "Case report unavailable");
      setText("[data-police-report-content]", "The detailed case file could not be loaded.");
    });
}

function getCaseDetailModel(caseSlug) {
  return fetch("model/" + caseSlug + ".json")
    .then(function (response) {
      if (!response.ok) {
        throw new Error("Failed to load case detail model.");
      }

      return response.json();
    });
}

function initializeUsers() {
  if (!usersReadyPromise) {
    usersReadyPromise = fetch("model/users.json")
      .then(function (response) {
        if (!response.ok) {
          throw new Error("Failed to load users model.");
        }

        return response.json();
      })
      .then(function (data) {
        barkvaultUsers = data && Array.isArray(data.users) ? data.users : [];
        return barkvaultUsers;
      })
      .catch(function () {
        barkvaultUsers = [];
        return barkvaultUsers;
      });
  }

  return usersReadyPromise;
}

function handleLogin(form, status) {
  var submitButton = form.querySelector("button[type='submit']");
  var usernameField = form.querySelector("input[type='text']");
  var passwordField = form.querySelector("input[type='password']");

  if (status) {
    status.textContent = "Checking credentials...";
  }

  if (submitButton) {
    submitButton.disabled = true;
  }

  initializeUsers().then(function () {
    completeLogin(form, status, usernameField, passwordField, submitButton);
  });
}

function completeLogin(form, status, usernameField, passwordField, submitButton) {
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
    return;
  }

  form.classList.add("was-validated");

  if (submitButton) {
    submitButton.disabled = false;
  }
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

function renderPoliceReport(policeReport) {
  if (!policeReport) {
    return;
  }

  setText("[data-police-report-title]", policeReport.title || "Police report");
  setText("[data-police-report-content]", policeReport.content || "No incident narrative available.");
}

function renderSuspects(suspects) {
  var container = document.querySelector("[data-suspect-statements]");

  if (!container) {
    return;
  }

  if (!Array.isArray(suspects) || !suspects.length) {
    container.innerHTML = '<div class="col-12"><article class="case-card case-section-card"><h3>No suspect statements available.</h3></article></div>';
    return;
  }

  container.innerHTML = suspects
    .map(function (suspect) {
      return (
        '<div class="col-lg-6 reveal-up is-visible">' +
        '<article class="case-card case-statement-card">' +
        '<div class="case-media"><img src="' + resolveCaseImage(suspect.imagePath, buildGeneratedImage('suspect', suspect.imageLabel || suspect.name, suspect.name)) + '" alt="Portrait for ' + escapeAttribute(suspect.name) + '" /></div>' +
        '<p class="case-label">' + escapeHtml(suspect.name) + '</p>' +
        '<p class="case-person-meta">' + escapeHtml(String(suspect.age)) + ' years old | ' + escapeHtml(suspect.occupation) + '</p>' +
        '<div class="case-statement">' + escapeHtml(suspect.statement) + '</div>' +
        '</article>' +
        '</div>'
      );
    })
    .join("");
}

function renderWitnessStatements(witnessStatements) {
  var container = document.querySelector("[data-witness-statements]");

  if (!container) {
    return;
  }

  if (!Array.isArray(witnessStatements) || !witnessStatements.length) {
    container.innerHTML = '<div class="col-12"><article class="case-card case-section-card"><h3>No witness statements available.</h3></article></div>';
    return;
  }

  container.innerHTML = witnessStatements
    .map(function (witness) {
      return (
        '<div class="col-lg-4 reveal-up is-visible">' +
        '<article class="case-card case-statement-card">' +
        '<p class="case-label">' + escapeHtml(witness.name) + '</p>' +
        '<p class="case-person-meta">' + escapeHtml(witness.occupation) + '</p>' +
        '<div class="case-statement">' + escapeHtml(witness.statement) + '</div>' +
        '</article>' +
        '</div>'
      );
    })
    .join("");
}

function renderMedicalReport(medicalReport) {
  if (!medicalReport) {
    return;
  }

  setText("[data-medical-report-examiner]", medicalReport.examiner || "Medical report");
  setText("[data-medical-cause]", medicalReport.causeOfDeath || "Cause of death unavailable");
  setText("[data-medical-time]", medicalReport.estimatedTimeOfDeath || "Time of death unavailable");

  var detailsList = document.querySelector("[data-medical-details]");

  if (detailsList) {
    detailsList.innerHTML = (medicalReport.details || [])
      .map(function (detail) {
        return '<li>' + escapeHtml(detail) + '</li>';
      })
      .join("");
  }
}

function renderEvidences(evidences) {
  var container = document.querySelector("[data-evidence-list]");

  if (!container) {
    return;
  }

  if (!Array.isArray(evidences) || !evidences.length) {
    container.innerHTML = '<div class="col-12"><article class="case-card case-section-card"><h3>No evidence entries available.</h3></article></div>';
    return;
  }

  container.innerHTML = evidences
    .map(function (evidence) {
      return (
        '<div class="col-lg-4 col-md-6 reveal-up is-visible">' +
        '<article class="case-card evidence-card">' +
        '<div class="case-media"><img src="' + resolveCaseImage(evidence.imagePath, buildGeneratedImage('evidence', evidence.imageLabel || evidence.id, evidence.title)) + '" alt="Evidence image for ' + escapeAttribute(evidence.title) + '" /></div>' +
        '<p class="case-label">' + escapeHtml(evidence.id) + '</p>' +
        '<h3>' + escapeHtml(evidence.title) + '</h3>' +
        '<p class="case-evidence-description">' + escapeHtml(evidence.description) + '</p>' +
        '</article>' +
        '</div>'
      );
    })
    .join("");
}

function renderGuessTheCriminal(guessTheCriminal, solution) {
  if (!guessTheCriminal) {
    return;
  }

  setText("[data-guess-question]", guessTheCriminal.question || "Guess the criminal");
  setText("[data-guess-hint]", guessTheCriminal.hint || "Review the evidence carefully before accusing a suspect.");

  var optionsContainer = document.querySelector("[data-guess-options]");
  var form = document.querySelector("[data-guess-form]");
  var status = document.querySelector("[data-guess-status]");

  if (!optionsContainer || !form) {
    return;
  }

  optionsContainer.innerHTML = (guessTheCriminal.suspects || [])
    .map(function (suspectName, index) {
      var inputId = "guess-suspect-" + index;

      return (
        '<div class="col-lg-4 col-md-6">' +
        '<label class="guess-option" for="' + inputId + '">' +
        '<input type="radio" name="criminalGuess" id="' + inputId + '" value="' + escapeAttribute(suspectName) + '" />' +
        '<span class="guess-option-text">' + escapeHtml(suspectName) + '</span>' +
        '</label>' +
        '</div>'
      );
    })
    .join("");

  form.addEventListener("submit", function (event) {
    event.preventDefault();

    var selectedOption = form.querySelector("input[name='criminalGuess']:checked");

    if (!selectedOption) {
      showGuessResultModal(
        "Choose a suspect first",
        "Select one suspect before submitting your accusation.",
        null
      );
      return;
    }

    if (selectedOption.value === (solution && solution.criminal)) {
      if (status) {
        status.textContent = "";
      }
      showGuessResultModal(
        "Congratulations! Accusation confirmed",
        "You identified the correct suspect. " + (solution.explanation || "Your accusation matches the case evidence."),
        solution && solution.nextCaseCode ? solution.nextCaseCode : null
      );
    } else {
      if (status) {
        status.textContent = "";
      }
      showGuessResultModal(
        "Wrong accusation",
        "That accusation does not fit the evidence. " + (guessTheCriminal.hint || "Review the contradictions and try again."),
        null
      );
    }
  });
}

function showGuessResultModal(title, message, rewardCode) {
  var modalElement = document.getElementById("guessResultModal");
  var titleElement = document.querySelector("[data-guess-modal-title]");
  var messageElement = document.querySelector("[data-guess-modal-message]");
  var rewardContainer = document.querySelector("[data-guess-reward]");
  var rewardCodeElement = document.querySelector("[data-guess-reward-code]");

  if (!modalElement || !window.bootstrap || !window.bootstrap.Modal) {
    return;
  }

  setText("[data-guess-modal-title]", title || "Accusation result");
  setText("[data-guess-modal-message]", message || "No result message available.");

  if (rewardContainer && rewardCodeElement) {
    if (rewardCode) {
      rewardContainer.classList.remove("d-none");
      rewardCodeElement.textContent = rewardCode;
    } else {
      rewardContainer.classList.add("d-none");
      rewardCodeElement.textContent = "LOCKED";
    }
  }

  if (titleElement) {
    titleElement.textContent = title || "Accusation result";
    titleElement.classList.toggle("guess-modal-success", Boolean(rewardCode));
  }

  if (messageElement) {
    messageElement.textContent = message || "No result message available.";
  }

  window.bootstrap.Modal.getOrCreateInstance(modalElement).show();
}

function escapeHtml(value) {
  return String(value)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function escapeAttribute(value) {
  return escapeHtml(value);
}

function buildGeneratedImage(kind, label, title) {
  var palette = kind === 'suspect'
    ? { start: '#2d4f6c', end: '#0d1b2a', accent: '#f4a261' }
    : { start: '#5a3c1f', end: '#1b263b', accent: '#ffd166' };
  var safeLabel = String(label || '').slice(0, 8).toUpperCase();
  var safeTitle = String(title || '').slice(0, 44);
  var svg = '' +
    '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 640 400">' +
    '<defs>' +
    '<linearGradient id="bg" x1="0" y1="0" x2="1" y2="1">' +
    '<stop offset="0%" stop-color="' + palette.start + '" />' +
    '<stop offset="100%" stop-color="' + palette.end + '" />' +
    '</linearGradient>' +
    '</defs>' +
    '<rect width="640" height="400" rx="28" fill="url(#bg)" />' +
    '<circle cx="510" cy="82" r="74" fill="rgba(255,255,255,0.07)" />' +
    '<circle cx="122" cy="330" r="108" fill="rgba(255,255,255,0.05)" />' +
    '<rect x="34" y="34" width="572" height="332" rx="22" fill="none" stroke="rgba(255,255,255,0.12)" />' +
    '<text x="52" y="110" fill="' + palette.accent + '" font-family="Arial, sans-serif" font-size="76" font-weight="700">' + escapeSvgText(safeLabel) + '</text>' +
    '<text x="52" y="160" fill="#f8f9fa" font-family="Arial, sans-serif" font-size="24" letter-spacing="4">' + escapeSvgText(kind.toUpperCase()) + '</text>' +
    '<text x="52" y="316" fill="#f8f9fa" font-family="Arial, sans-serif" font-size="30" font-weight="600">' + escapeSvgText(safeTitle) + '</text>' +
    '</svg>';

  return 'data:image/svg+xml;charset=UTF-8,' + encodeURIComponent(svg);
}

function escapeSvgText(value) {
  return String(value)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;');
}

function resolveCaseImage(imagePath, fallbackSrc) {
  return imagePath || fallbackSrc;
}
