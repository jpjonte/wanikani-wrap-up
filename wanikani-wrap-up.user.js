// ==UserScript==
// @name         Wanikani Wrap-up Button Enhancement (jpj fork)
// @namespace    github.com/jpjonte/wanikani-wrap-up
// @version      2.0.2
// @description  Choose how many items a wrap-up leaves you with. Enter in the box starts it.
// @author       jpj
// @license      MIT
// @match        https://www.wanikani.com/*
// @grant        none
// @inject-into  page
// @run-at       document-idle
// @downloadURL  https://raw.githubusercontent.com/jpjonte/wanikani-wrap-up/main/wanikani-wrap-up.user.js
// @updateURL    https://raw.githubusercontent.com/jpjonte/wanikani-wrap-up/main/wanikani-wrap-up.user.js
// ==/UserScript==
/* global Stimulus */

(() => {
  'use strict';

  const INPUT_ID = 'wrap-up-length';
  const ITEM_ID = 'wrap-up-length-item';

  const DEFAULT_ACTIVE_SIZE = 10;
  const FIND_QUEUE_TIMEOUT_MS = 10000;
  const FIND_QUEUE_INTERVAL_MS = 50;

  // --- queue arithmetic ------------------------------------------------------
  function resizeQueue(active, backlog, size, isStarted) {
    const target = Math.max(1, Math.min(size, active.length + backlog.length));

    if (target >= active.length) {
      const take = target - active.length;

      return { active: active.concat(backlog.slice(0, take)), backlog: backlog.slice(take) };
    }

    // keep item 0 (the one on screen) and started items
    const mustKeep = (item, index) => index === 0 || isStarted(item);

    let room = target - active.filter(mustKeep).length;

    const kept = [];
    const returned = [];

    active.forEach((item, index) => {
      if (mustKeep(item, index)) {
        kept.push(item);
      } else if (room > 0) {
        room -= 1;

        kept.push(item);
      } else {
        returned.push(item);
      }
    });

    return { active: kept, backlog: returned.concat(backlog) };
  }

  if (typeof module !== 'undefined') {
    module.exports = { resizeQueue };

    return;
  }

  // --- page adapter ----------------------------------------------------------
  function setQueueSize(queue, size, isStarted) {
    const { active, backlog } = resizeQueue(queue.activeQueue, queue.backlogQueue, size, isStarted);

    queue.activeQueue = active;
    queue.backlogQueue = backlog;
    queue.maxActiveQueueSize = Math.max(DEFAULT_ACTIVE_SIZE, active.length);
    queue.fetchMoreItems();
    queue.wrapUpManager.updateQueueSize(active.length);
  }

  function currentQueue() {
    const el = document.querySelector('[data-controller~="quiz-queue"]');

    if (!el || !window.Stimulus) {
      return null;
    }

    const controller = Stimulus.getControllerForElementAndIdentifier(el, 'quiz-queue');

    return controller ? controller.quizQueue : null;
  }

  function installStyle() {
    if (document.getElementById(`${ITEM_ID}-style`)) {
      return;
    }

    const style = document.createElement('style');

    style.id = `${ITEM_ID}-style`;
    style.textContent = `
      #${INPUT_ID} { width: 100%; text-align: center; -moz-appearance: textfield; appearance: textfield; }
      #${INPUT_ID}::-webkit-inner-spin-button { -webkit-appearance: none; }
    `;

    document.head.appendChild(style);
  }

  function attach(queue, wrapUpButton, input) {
    const isStarted = (item) => queue.stats.data.has(item.id);

    const readSize = () => {
      const size = parseInt(input.value, 10);

      if (Number.isNaN(size) || size < 1) {
        input.value = input.dataset.lastSize;

        return Number(input.dataset.lastSize);
      }

      input.dataset.lastSize = size;

      return size;
    };

    const apply = () => {
      const size = readSize();

      if (queue.wrapUpManager.wrappingUp) {
        setQueueSize(queue, size, isStarted);
      }
    };

    window.dispatchEvent(new CustomEvent('registerWrapUpObserver', {
      detail: {
        observer: {
          onRegistration() {},
          onUpdateCount() {},
          onWrapUp({ isWrappingUp }) {
            if (isWrappingUp) {
              apply();
            } else {
              setQueueSize(queue, DEFAULT_ACTIVE_SIZE, () => false);
            }
          },
        },
      },
    }));

    input.addEventListener('change', apply);
    input.addEventListener('keydown', (event) => {
      if (event.key !== 'Enter') {
        return;
      }

      event.preventDefault();

      if (queue.wrapUpManager.wrappingUp) {
        apply();
      } else {
        wrapUpButton.click();
      }

      const answer = document.querySelector('[data-quiz-input-target="input"]');

      if (answer) {
        answer.focus();
      }
    });
  }

  function init() {
    const wrapUpButton = document.querySelector('.additional-content__item--wrap-up');

    if (!wrapUpButton || document.getElementById(ITEM_ID)) {
      return;
    }

    installStyle();

    const item = document.createElement('li');

    item.id = ITEM_ID;
    item.className = wrapUpButton.closest('li').className;
    item.innerHTML =
      `<input class="additional-content__item" id="${INPUT_ID}" type="number" inputmode="numeric"` +
      ` min="1" step="1" value="${DEFAULT_ACTIVE_SIZE}" title="Items to finish when wrapping up"` +
      ` aria-label="Wrap-up length" data-last-size="${DEFAULT_ACTIVE_SIZE}">`;

    wrapUpButton.closest('li').after(item);

    const input = item.querySelector('input');

    const deadline = Date.now() + FIND_QUEUE_TIMEOUT_MS;

    const poll = () => {
      if (!item.isConnected) {
        return;
      }

      const queue = currentQueue();

      if (queue) {
        attach(queue, wrapUpButton, input);
      } else if (Date.now() < deadline) {
        setTimeout(poll, FIND_QUEUE_INTERVAL_MS);
      } else {
        console.warn('[wrap-up-length] quiz-queue controller not found');
      }
    };

    poll();
  }

  document.documentElement.addEventListener('turbo:load', () => setTimeout(init, 0));
  init();
})();
