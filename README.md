# WaniKani Wrap-up Button Enhancement (jpj fork)

Userscript that lets you start wrap-up with a custom number of items. Type a
number in the box beside the wrap-up button and hit Enter to start the wrap-up.
Changing the number during a wrap-up resizes it.

[Install it](https://raw.githubusercontent.com/jpjonte/wanikani-wrap-up/main/wanikani-wrap-up.user.js)
with your userscript manager (Violentmonkey, Tampermonkey, Greasemonkey, ...).

## How it differs from the original

This fork uses the `quiz-queue` Stimulus controller and WaniKani's wrap-up observer API.

- Half-answered items are kept even if that exceeds the number you asked for, because a
  wrap-up only submits what is in the active queue.
- Cancelling a wrap-up restores the normal queue of 10.

## Tests

```sh
node --test
```

Covers the queue arithmetic. Everything below `page adapter` in the script needs a real
review session.

## Credits

Rewrite of [yndajas's Tofurky fork](https://greasyfork.org/scripts/435324) of the
Wrap-up Button Enhancement by Mempo and
[Inserio](https://greasyfork.org/scripts/389387) (MIT).
