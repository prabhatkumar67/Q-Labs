# Q Labs recording guide

Target length: two minutes. Record the local studio at http://localhost:3000/studio.

## Before recording

1. Open the studio in a fresh tab. Use **Start over** to clear the working draft if needed. Select **Demo store, broken build**.
2. Turn on **Show browser** if you want the Chromium actions visible. Arrange the studio and Chromium so both fit in the recording.
3. Test one sentence with your actual microphone. Confirm that the final words survive pressing Stop and that a follow-up is submitted once.
4. Verify Wispr Flow inserts text into the focused instruction box. Submit with Ctrl/Cmd+Enter. The built-in microphone is a separate Deepgram input; describe the input you actually show.
5. Close windows containing credentials before capturing the screen. Keep the API, demo store and UI running.

## 0:00 to 0:12: explain the product

**On screen:** The studio, with the target and instruction box visible.

**Say:**

"This is Q Labs. Rechecking the same forms after every change is repetitive. It turns the behavior I describe into reusable browser tests, with explicit checks and evidence of what actually happened."

## 0:12 to 0:40: create and refine a test

**On screen:** Focus the composer and activate your Wispr Flow shortcut. Dictate, then submit:

"Leave the email empty and click Place order. Check that the message says Email is required."

Once the steps appear, dictate the follow-up and submit:

"Also enter SAVE10 in the promo code field, click Apply, and check the total becomes twenty one dollars sixty. Keep the email validation check."

**Say while pointing at the steps:**

"These are editable steps with explicit expectations. Q Labs reads the target page to help choose real controls. I can review the selectors and correct anything before running."

## 0:40 to 1:05: show a real failure

**On screen:** Run the reviewed test against the broken build. Let Chromium finish. Open the failed step and its screenshot.

**Say:**

"The broken build confirms the order without an email. The test expected Email is required, so it fails. Later steps are marked blocked. An unavailable browser would be reported as an execution error, not a pass."

The fixture has deliberate bugs; it is not a real payment system.

## 1:05 to 1:28: verify the fix

**On screen:** Change only the target to **Demo store, fixed build**, then run again. You can dictate "run it on the fixed build" and submit it through Flow.

**Say:**

"Now I am running the same saved test against the fixed build. I have kept the assertions unchanged. Both checks pass, and I can inspect the observed values and screenshots."

Do not change the test between the failing and passing runs when describing this as the same saved contract.

## 1:28 to 1:48: show continued usefulness

**On screen:** Export the Playwright test. Briefly show History, then Dashboard if time permits.

**Say:**

"I can reuse this test after another change, inspect previous runs, or export it into a Playwright project. The dashboard summarizes recorded results and shows failures that still need attention."

## 1:48 to 2:00: close

**Say:**

"Q Labs is for developers who want their acceptance criteria to become repeatable checks. Describe the behavior, review the test, and verify the result."

## Recording limits

- Physical microphone accuracy still needs your own rehearsal; simulated speech tests do not establish real-world recognition quality.
- Exact wording and model output can vary. Review the generated steps before starting the timed recording.
- This is the local demo. Do not describe it as a hosted multi-user service. Public deployment needs the work listed in RELEASE-READINESS.md.
- Keep the main recording focused on one complete failure-to-fix workflow. Container sandboxes require Docker and were not verified in this audit because the daemon was unavailable.
