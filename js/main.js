document.addEventListener("DOMContentLoaded", function () {
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
      var status = document.getElementById("form-status");

      if (!form.checkValidity()) {
        event.preventDefault();
        event.stopPropagation();
      } else {
        event.preventDefault();

        if (status) {
          status.textContent = "Demo only: connect this form to a service before production use.";
        }

        form.reset();
      }

      form.classList.add("was-validated");
    });
  });
});
