/* Moteur de quiz interactif — Français ab initio
   Vanilla JS, sans dépendances externes. Prend en charge trois
   types de question : "choice" (choix multiple), "translate"
   (traduire) et "order" (remettre dans l'ordre). Les données de
   chaque chapitre sont intégrées à la page en JSON (voir
   layouts/_shortcodes/quiz.html). Chaque question peut être
   vérifiée indépendamment avec son propre bouton "Vérifier", et
   le tableau de score se met à jour en direct. */

(function () {
  "use strict";

  function normalize(str) {
    return String(str || "")
      .trim()
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[.,!?¡¿]/g, "")
      .replace(/\s+/g, " ");
  }

  function el(tag, attrs, children) {
    var node = document.createElement(tag);
    attrs = attrs || {};
    Object.keys(attrs).forEach(function (key) {
      if (key === "class") node.className = attrs[key];
      else if (key === "text") node.textContent = attrs[key];
      else node.setAttribute(key, attrs[key]);
    });
    (children || []).forEach(function (child) {
      if (child) node.appendChild(child);
    });
    return node;
  }

  function shuffle(arr) {
    var a = arr.slice();
    for (var i = a.length - 1; i > 0; i--) {
      var j = Math.floor(Math.random() * (i + 1));
      var tmp = a[i];
      a[i] = a[j];
      a[j] = tmp;
    }
    return a;
  }

  function typeLabel(type) {
    if (type === "choice") return "Choisis la bonne réponse";
    if (type === "translate") return "Traduis";
    if (type === "order") return "Remets les mots dans l'ordre";
    return type;
  }

  function buildChoiceBody(question, qId) {
    var options = el("div", { class: "quiz-options" });
    question.options.forEach(function (opt, i) {
      var inputId = qId + "-opt-" + i;
      var label = el("label", { class: "quiz-option", for: inputId });
      var input = el("input", {
        type: "radio",
        name: qId,
        id: inputId,
        value: opt,
      });
      label.appendChild(input);
      label.appendChild(el("span", { text: opt }));
      options.appendChild(label);
    });
    return {
      node: options,
      getAnswer: function () {
        var checked = options.querySelector("input:checked");
        return checked ? checked.value : null;
      },
      isCorrect: function (value) {
        if (value === null) return false;
        var accepted = Array.isArray(question.answer) ? question.answer : [question.answer];
        var norm = normalize(value);
        return accepted.some(function (a) {
          return normalize(a) === norm;
        });
      },
      hasAnswer: function () {
        return options.querySelector("input:checked") !== null;
      },
    };
  }

  function buildTranslateBody(question, qId) {
    var input = el("input", {
      class: "quiz-translate-input",
      type: "text",
      id: qId + "-input",
      autocomplete: "off",
      placeholder: "Écris ta réponse…",
    });
    var wrap = el("div", {}, [input]);
    return {
      node: wrap,
      getAnswer: function () {
        return input.value;
      },
      isCorrect: function (value) {
        var accepted = Array.isArray(question.answer) ? question.answer : [question.answer];
        var norm = normalize(value);
        return accepted.some(function (a) {
          return normalize(a) === norm;
        });
      },
      hasAnswer: function () {
        return input.value.trim().length > 0;
      },
    };
  }

  function buildOrderBody(question, qId) {
    var bank = el("div", { class: "quiz-order-bank" });
    var answerArea = el("div", { class: "quiz-order-answer" });
    var words = shuffle(question.words);

    function makeToken(word, location) {
      var token = el("span", { class: "quiz-word-token", text: word });
      token.addEventListener("click", function () {
        if (location === "bank") {
          bank.removeChild(token);
          answerArea.appendChild(makeToken(word, "answer"));
        } else {
          answerArea.removeChild(token);
          bank.appendChild(makeToken(word, "bank"));
        }
      });
      return token;
    }

    words.forEach(function (w) {
      bank.appendChild(makeToken(w, "bank"));
    });

    var wrap = el("div", {}, [bank, answerArea]);

    return {
      node: wrap,
      getAnswer: function () {
        return Array.prototype.map
          .call(answerArea.children, function (t) {
            return t.textContent;
          })
          .join(" ");
      },
      isCorrect: function (value) {
        return normalize(value) === normalize(question.answer);
      },
      hasAnswer: function () {
        return answerArea.children.length > 0;
      },
    };
  }

  function buildQuestion(question, index, onStatusChange) {
    var qId = "q" + index;
    var card = el("div", { class: "quiz-question", "data-qid": qId });
    var header = el("div", { class: "quiz-question-header" }, [
      el("span", { class: "quiz-q-number", text: String(index + 1) }),
      el("span", { class: "quiz-q-type type-" + question.type, text: typeLabel(question.type) }),
    ]);
    var prompt = el("div", { class: "quiz-prompt", text: question.prompt });

    var body;
    if (question.type === "choice") body = buildChoiceBody(question, qId);
    else if (question.type === "translate") body = buildTranslateBody(question, qId);
    else body = buildOrderBody(question, qId);

    var feedback = el("span", { class: "quiz-q-feedback" });
    var checkBtn = el("button", {
      class: "quiz-btn quiz-btn-check",
      type: "button",
      text: "Vérifier",
    });
    var qActions = el("div", { class: "quiz-q-actions" }, [checkBtn, feedback]);

    var explanation = el("div", { class: "quiz-explanation" });
    var correctAnswerText = Array.isArray(question.answer) ? question.answer[0] : question.answer;
    explanation.appendChild(el("strong", { text: "Réponse correcte : " }));
    explanation.appendChild(document.createTextNode(correctAnswerText + ". "));
    if (question.explanation) {
      explanation.appendChild(document.createTextNode(question.explanation));
    }

    card.appendChild(header);
    card.appendChild(prompt);
    card.appendChild(body.node);
    card.appendChild(qActions);
    card.appendChild(explanation);

    var state = { checked: false, correct: false };

    function runCheck() {
      if (!body.hasAnswer()) {
        feedback.textContent = "Réponds avant de vérifier.";
        feedback.className = "quiz-q-feedback is-warning";
        return;
      }
      var value = body.getAnswer();
      var correct = body.isCorrect(value);
      card.classList.remove("is-correct", "is-incorrect");
      card.classList.add("is-checked", correct ? "is-correct" : "is-incorrect");
      feedback.textContent = correct ? "Correct ! ✓" : "Incorrect ✗";
      feedback.className = "quiz-q-feedback " + (correct ? "is-correct-text" : "is-incorrect-text");
      state.checked = true;
      state.correct = correct;
      if (onStatusChange) onStatusChange();
    }

    checkBtn.addEventListener("click", runCheck);

    return {
      card: card,
      state: state,
      check: runCheck,
      reset: function () {
        state.checked = false;
        state.correct = false;
        card.classList.remove("is-checked", "is-correct", "is-incorrect");
        feedback.textContent = "";
        feedback.className = "quiz-q-feedback";
      },
    };
  }

  function initQuiz(container) {
    var dataId = container.getAttribute("data-quiz-source");
    var dataScript = document.getElementById(dataId);
    if (!dataScript) return;

    var questions;
    try {
      questions = JSON.parse(dataScript.textContent);
    } catch (e) {
      return;
    }

    var banner = el("div", { class: "quiz-score-banner is-visible" });

    var list = el("div", {});

    function updateBanner() {
      var checkedCount = 0;
      var correctCount = 0;
      built.forEach(function (q) {
        if (q.state.checked) {
          checkedCount++;
          if (q.state.correct) correctCount++;
        }
      });
      banner.innerHTML = "";
      if (checkedCount === 0) {
        banner.appendChild(
          el("span", { text: "Vérifie chaque question avec son bouton pour voir ta progression ici." })
        );
        return;
      }
      banner.appendChild(
        el("span", {
          text:
            "Résultat : " +
            correctCount +
            " / " +
            checkedCount +
            " correctes (" +
            checkedCount +
            " / " +
            built.length +
            " vérifiées)",
        })
      );
      if (checkedCount === built.length) {
        var pct = Math.round((correctCount / built.length) * 100);
        var msg = pct === 100 ? "Parfait ! 🎉" : pct >= 70 ? "Très bien ! 👍" : "Continue à t'entraîner 💪";
        banner.appendChild(el("span", { text: msg }));
      }
    }

    var built = questions.map(function (q, i) {
      return buildQuestion(q, i, updateBanner);
    });
    built.forEach(function (q) {
      list.appendChild(q.card);
    });

    var checkAllBtn = el("button", {
      class: "quiz-btn",
      type: "button",
      text: "Vérifier toutes les réponses",
    });
    var resetBtn = el("button", {
      class: "quiz-btn quiz-btn-secondary",
      type: "button",
      text: "Recommencer",
    });
    var actions = el("div", { class: "quiz-actions" }, [checkAllBtn, resetBtn]);

    checkAllBtn.addEventListener("click", function () {
      built.forEach(function (q) {
        q.check();
      });
      updateBanner();
    });

    resetBtn.addEventListener("click", function () {
      built.forEach(function (q) {
        q.reset();
      });
      container.querySelectorAll('input[type="radio"]').forEach(function (i) {
        i.checked = false;
      });
      container.querySelectorAll('input[type="text"]').forEach(function (i) {
        i.value = "";
      });
      container.querySelectorAll(".quiz-order-answer").forEach(function (area) {
        while (area.firstChild) {
          area.firstChild.click();
        }
      });
      updateBanner();
      var firstCard = list.querySelector(".quiz-question");
      if (firstCard) firstCard.scrollIntoView({ behavior: "smooth", block: "nearest" });
    });

    container.appendChild(banner);
    container.appendChild(list);
    container.appendChild(actions);
    updateBanner();
  }

  document.addEventListener("DOMContentLoaded", function () {
    document.querySelectorAll(".quiz-app").forEach(initQuiz);
  });
})();
