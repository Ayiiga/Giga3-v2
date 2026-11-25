# GigaLearn and GigaSocial mobile release audit

Baseline: main at `b30563926e8c3dce3f7e6a0f9c84456ff3012654` on 25 November 2026.

| PR | Verified scope | Final PR CI |
|---|---|---|
| [#812](https://github.com/Ayiiga/Giga3-v2/pull/812) | GigaSocial camera, inbox and uploads. Merged. | [Passed](https://github.com/Ayiiga/Giga3-v2/actions/runs/45367890352). [Main deployment passed](https://github.com/Ayiiga/Giga3-v2/actions/runs/45369088738). |
| [#813](https://github.com/Ayiiga/Giga3-v2/pull/813) | GigaSocial video isolation and review. Merged. | [Passed](https://github.com/Ayiiga/Giga3-v2/actions/runs/45377150645) |
| [#814](https://github.com/Ayiiga/Giga3-v2/pull/814) | Personalised reminders. Merged. | [Passed](https://github.com/Ayiiga/Giga3-v2/actions/runs/45447535909) |
| [#817](https://github.com/Ayiiga/Giga3-v2/pull/817) | GigaLearn learning controls. Merged. | [Passed](https://github.com/Ayiiga/Giga3-v2/actions/runs/45553185616) |
| [#818](https://github.com/Ayiiga/Giga3-v2/pull/818) | GigaLearn play-based activities. Merged. | [Passed](https://github.com/Ayiiga/Giga3-v2/actions/runs/45556392628) |
| [#819](https://github.com/Ayiiga/Giga3-v2/pull/819) | Picture-first Discovery learning. Merged. | [Passed](https://github.com/Ayiiga/Giga3-v2/actions/runs/45570964759) |
| [#820](https://github.com/Ayiiga/Giga3-v2/pull/820) | Discovery expansion to 90 cards and 20 fruit rounds. Merged. | [Passed](https://github.com/Ayiiga/Giga3-v2/actions/runs/45573429507) |

## Confirmed defects and changes

- [Production browser run 45440701094](https://github.com/Ayiiga/Giga3-v2/actions/runs/45440701094) recorded failures in authenticated GigaLearn and exam checks before it was cancelled during Playwright. The cancelled run does not establish their cause. An empty result could also make the summary process exit successfully. Empty, wholly skipped, interrupted and timed-out results now fail. Scheduled runs exercise bounded mobile browser flows without sending paid chat prompts or making authenticated posts. The full production suite remains a manual selection.
- Discovery audio bypassed static caching, and a browser may initially request only part of an MP3. The service worker now caches the complete Discovery clip after loading it and serves byte ranges from that copy. This does not preload all 112 clips on metered connections.
- A multi-episode upload did not retain confirmed progress or stable publish IDs. The composer now releases confirmed files, resumes at the unconfirmed episode, and reuses that episode's uploaded media and publish ID when acknowledgement is lost. Resume is held in the open composer.

## Verification still required on the physical Android device

Test the same live release on the Tecno Spark 10 Pro under Wi-Fi and throttled/mobile data. Record the release commit, app and OS version, timestamp, network and a screen recording where feasible.

- Play a Discovery pronunciation, enable airplane mode and replay it in the open installed app. Confirm that an uncached sound shows the audio fallback.
- Select a video from Gallery, replace it, play and pause review, interrupt an episode upload, and resume. Verify each episode appears once in the right profile and check for horizontal corruption or a layout jump.
- Check camera framing, inbox contrast, notification links and opt-out with an authorised account. Avoid live broadcasts or paid actions in this test.
- Confirm selection, feedback, final score and retry in authenticated BECE, WASSCE and Teacher Promotion. [PR #763](https://github.com/Ayiiga/Giga3-v2/pull/763) remains separate from this release.

[Discovery educational impact pilot](discovery-impact-pilot.md)
