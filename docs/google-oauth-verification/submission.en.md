# Google OAuth verification submission copy

Prepared: 2026-10-18.

Internal use: replace bracketed fields and copy only the relevant answer into the corresponding Console field. Policies and lifecycle changes were deployed on 2026-10-18 with remote migration `0002`. The current exact name **Playlist Expoter** and original E logo are deployed at 100% production traffic in version `3897fcb2-322a-4cc5-bf18-b7271e12327f`, released at `2026-10-18T14:56:46Z`. Google Console saved, verified and published this brand separately from the historical Playlist Backup / PB brand. Audience is External / In production; sensitive-scope verification was submitted at approximately 2026-10-19 02:58 UTC and is under review, not yet approved. The main and supplemental recordings are saved and their media parameters confirmed. The final 8:36 video passed local QA and was uploaded as Unlisted after the user confirmed YouTube terms and the upload at the time of the action: https://youtu.be/lFRCukfn3cg. A signed-out Chrome Incognito visit confirmed the correct title, Stepan channel, Unlisted badge and description. Studio completed both SD and HD processing. In signed-out Chrome Incognito, the actual video played at 0:02 and was paused at 0:09 of 8:36, visibly showing the recorded website; public playability is confirmed. The 869-character scope justification and video URL have been saved successfully in Google Data access. All four private source types have returned real, nonempty results. The user-approved disconnect and deletion of four test backups completed at approximately `2026-10-19 02:38 UTC`; a reloaded page showed no connection and only the original public collection with 70 items. This cleanup was observed in the UI, but the supplemental recording's final segment is obscured by Codex and is not usable cleanup footage. No new production D1 aggregate check or independent Google-side revocation verification was performed for this run. External revocation detection, account deletion, production expiry cleanup and email delivery still require separate acceptance evidence. A separate reviewer-access arrangement and independent Search Console ownership evidence remain outstanding; see [readiness.md](readiness.md).

Submission state: **submitted and under review, not yet approved**, at approximately **2026-10-19 02:58 UTC** (October 18, 19:58 PDT). The submitted materials include the **869-character scope justification**, **https://youtu.be/lFRCukfn3cg**, and **966-character reviewer instructions** asking Google for a reviewer email so free access can be configured without sharing a personal Google password. After the Prepare confirmation, all four questionnaire exclusions (personal use, internal use, development/testing only, and WordPress) were answered No. The guide acknowledgement and conditional CASA acknowledgement were checked, then **Submit for verification** was clicked. No restricted scope is requested; the conditional acknowledgement does not mean a CASA assessment was required or completed. The final Verification Center displayed **“您的应用的数据访问权限正在审核中。”** (the application's data access is under review) and a View verification progress button. Branding remained verified and published. The earlier missing-video/save blocker is resolved. Google has not yet approved the sensitive scope or supplied a reviewer email for a separate free-access grant.

## Application description

Playlist Expoter is a web application that helps users organize and export metadata from their video collections. Its public tools read publicly available YouTube metadata. A separate, optional Connect YouTube flow lets a signed-in user access their own private playlists, liked videos, and channel subscriptions through the YouTube Data API.

Users choose which collections to save, view metadata snapshots in their account, manually check the selected sources again, and export the results. Automatic collection checks are not enabled in the demonstrated deployment. Email delivery depends on separate configuration and has not been demonstrated. The application reads metadata; it does not download audio or video files or modify content on YouTube. Signing in to the website does not by itself connect a YouTube account.

## Requested scopes

| Scope                                              | Purpose                                                                                  |
| -------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| `openid`                                           | Identify the user during ordinary Google sign-in to the website.                         |
| `https://www.googleapis.com/auth/userinfo.email`   | Obtain the email address used for the website account.                                   |
| `https://www.googleapis.com/auth/userinfo.profile` | Obtain basic profile information for the website account.                                |
| `https://www.googleapis.com/auth/youtube.readonly` | Read the connected channel and the private collections selected by its authorizing user. |

Implementation note for the operator: the installed sign-in library uses the equivalent `email profile openid` request spellings. Confirm the exact production request and the Console's listed scope names. YouTube connect separately requests only `youtube.readonly`; this table describes the application as a whole. Do not add Gmail, Drive, YouTube write, upload, Analytics, or partner scopes for features the application does not implement.

## Sensitive scope justification

The following 869-character answer was saved and submitted in the scope explanation field:

> Playlist Expoter requests youtube.readonly only when a signed-in user chooses Connect YouTube. It reads the connected channel identity, a private playlist specified by the user, liked videos (including a locally filtered Music-category view), and channel subscriptions. Users view and export metadata snapshots of the collections they choose. A public API key and basic sign-in scopes cannot read these private resources. Read-only access is sufficient: the app does not upload, edit, delete, rate, or subscribe on YouTube, and downloads no audio or video. Offline access renews the same read-only authorization when the user returns to run another manual check; automatic collection checks are currently disabled. Users can disconnect to remove associated saved private collections and request revocation. Basic identity scopes are used separately for website sign-in.

## API usage details

Use these details if the reviewer requests a method-level explanation. They are supported by the current implementation in [scan.ts](../../src/lib/youtube-connections/scan.ts) and [the connection service](../../src/modules/youtube-connections/service.ts).

| User action             | API request                                                                                                                          | Data used                                                                      |
| ----------------------- | ------------------------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------ |
| Connect a channel       | `channels.list(part=snippet, mine=true)`                                                                                             | Channel ID, title and thumbnail URL for account selection                      |
| Read a private playlist | `playlistItems.list(part=contentDetails, playlistId=...)`, followed by `videos.list(part=snippet,contentDetails,statistics, id=...)` | Selected playlist's available video IDs and metadata                           |
| Read liked videos       | `videos.list(part=snippet,contentDetails,statistics, myRating=like)`                                                                 | User's liked videos and available metadata                                     |
| Read liked music        | Same liked-video request, with a local `categoryId === '10'` filter                                                                  | Music-category entries within liked videos, not the full YouTube Music library |
| Read subscriptions      | `subscriptions.list(part=snippet, mine=true)`                                                                                        | Subscribed channel IDs, names and thumbnail URLs                               |

Video snapshots include IDs, titles, channel names, links, thumbnail URLs, durations, playlist positions, and available view counts. Subscription snapshots contain channel metadata. Partial or failed reads are not treated as proof that a user's entire collection disappeared. Unavailable data is not bypassed or recovered from video files.

## Why offline access is requested

> The connection requests offline access when the user chooses Connect YouTube. The server stores an encrypted refresh token to renew the same read-only authorization for later user-initiated checks, so the user does not need to repeat Google consent whenever a short-lived access token expires. It does not grant additional permissions. Automatic collection checks are disabled in this deployment. Email delivery is conditional and has not been verified in this demonstration. Future activation of these services must be reflected in the interface and supported by separate execution evidence. Users can disconnect the account to stop further reads and delete its associated saved private collections.

Current deployment: automatic collection scans are not enabled, and the UI explicitly presents manual checks. Demonstrate background collection checks only after scheduling is actually enabled and a scheduled collection scan has completed. The maintenance Cron result alone does not prove a collection was scanned. The connection requests offline access at initial consent, even before a collection or schedule is chosen; do not imply that refresh-token access is requested only after scheduling is enabled, or that it is an additional scope. The English and Chinese Connect account panels now explicitly explain offline/background access. Show this pre-consent disclosure during the real recording; the disclosure does not itself prove that a scheduled scan has run. Test disconnect and cleanup independently of paid entitlements or scheduling status.

## Data flow and safeguards

The current implementation supports this technical explanation:

> OAuth authorization is initiated by the signed-in user and returns to the application's registered HTTPS callback. The YouTube connection uses state validation and PKCE. YouTube access and refresh tokens are encrypted with AES-256-GCM before being stored in the application database; the encryption key is held separately in server configuration. These tokens are used by the server and are not returned by the account-list API. Saved collection metadata is stored separately and is scoped to the website account that created it.
>
> Export files are generated in the browser. If a user enables email notifications or email backups and the service is configured, the configured email provider processes the delivery to the user's verified account email. An email backup can include the latest snapshot as JSON. Hosting and database processing use the application's infrastructure providers.

Do not expand this to “all data is encrypted at application level” or “all Google tokens are encrypted.” The collection metadata and the separate website sign-in token storage have different behavior. Production settings and actual provider access must be verified before describing them as tested safeguards.

## Data use commitments for the completed release

The published privacy policy contains these commitments. Before submitting them as an operational attestation, confirm human access practices and complete the remaining lifecycle acceptance checks:

> We use Google user data only to provide the user-requested account and collection features described in our privacy policy. We do not sell it, use it for advertising targeting, or use it to train generalized AI models. Transfers are limited to service providers necessary for these features, user-directed exports or email delivery, and permitted security or legal needs. Our handling of Google user data follows the Google API Services User Data Policy, including its Limited Use requirements. Users can revoke access and request deletion as described in our privacy policy.

Use the published policy and [privacy implementation record](privacy-disclosures.md) for retention and deletion statements. The deployed implementation deletes associated active application data and attempts Google revocation with a bounded encrypted retry queue. The migration and maintenance run are confirmed; real grant revocation, external revocation detection and actual expired-data deletion still need acceptance evidence. An empty revocation queue is not proof of successful Google revocation.

## Reviewer navigation

Complete the bracketed access details before sending:

1. Open `https://exportyoutubeplaylist.com/sign-in` and sign in using [REVIEWER_ACCESS_METHOD]. Review access to the required features is [REVIEWER_FEATURE_ACCESS]. No production administrator privileges are needed.
2. Open `https://exportyoutubeplaylist.com/settings/collections` or `https://exportyoutubeplaylist.com/youtube-playlist-backup`.
3. Under YouTube accounts, select Connect account and use a Google account with a YouTube channel and harmless test data. This is a separate consent step from website sign-in.
4. Review and grant the read-only YouTube permission. After redirect, verify the displayed channel and choose it for the collection.
5. Select Private playlist, enter the URL of a private playlist accessible to the authorizing reviewer account, and complete the save/backup action. A private URL belonging only to the developer's different account will not be sufficient.
6. Open the saved collection and inspect its metadata. Use Export to generate a file locally. Repeat for liked videos, liked music and subscriptions. Liked music is the Music-category subset of liked videos. If the access arrangement provides two collection slots, keep the private playlist and remove each other test collection before creating the next source type.
7. Use Check now to read the selected source again. Automatic collection checks are disabled in this deployment; saved frequency preferences and the maintenance Cron are not evidence of a scheduled collection scan. Email delivery has not been demonstrated.
8. Remove a test collection before disconnecting its YouTube connection. Disconnect then removes the remaining associated private collections. Account deletion and revocation from Google settings are separate acceptance cases: reconnect and create fresh test data before each case, using a disposable website account for account deletion. Refer to [LIFECYCLE_ACCEPTANCE_EVIDENCE] for the observed results; the controls are deployed, but their complete real-Google lifecycle has not yet been verified.

Temporary review access is deployed, the designated test account's quota is confirmed, and the four source types have been tested with nonempty results. The submitted reviewer instructions ask Google for the reviewer email so a separate free-access grant can be arranged when provided. Ordinary free accounts have zero collection slots. The user approved temporary access limited to designated verified email addresses, with 10 collection slots and expiry at `2026-11-17T23:59:59Z`, without changing Stripe subscriptions. This mechanism is implemented and deployed. The Worker version when its server-only secret was configured was `33cf0e4c-6362-455d-8471-eefce06dec58` (2026-10-18 14:05:10 UTC). The current grant is only for verified `stepan101dev@gmail.com`; earlier browser readback showed `2/10`, `Your plan Lite`, `Free review allowance 10`, and `Review access ends Nov 17, 2026, 3:59 PM` (Pacific), retaining the existing Lite plan display. The full allowlist is not exposed in public configuration or UI; a user can see only their own review limit. A Google reviewer needs a separately arranged, verified email grant; do not claim all reviewers already have access. Two available slots are sufficient for the sequential route above; four allow all source types to remain saved together. If Google supplies a reviewer account, arrange the necessary access for that account without requiring the reviewer to purchase a plan or use administrator privileges. If a dedicated application login is required, deliver its credentials through the review team's designated secure channel. Do not share a personal Google account password or place any credentials in this repository. If the production app is already verified and a new scope is being tested, follow Google's separate-project instructions for review testing.

## Submission links

| Field                                  | Value to verify                                                                                                           |
| -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------- |
| Homepage                               | `https://exportyoutubeplaylist.com/`                                                                                      |
| Feature overview                       | `https://exportyoutubeplaylist.com/youtube-playlist-backup`                                                               |
| Privacy policy                         | `https://exportyoutubeplaylist.com/privacy-policy` — 2026-10-18 policy deployed and read back                             |
| Terms                                  | `https://exportyoutubeplaylist.com/terms-of-service` — 2026-10-18 terms deployed and read back                            |
| Public website support                 | `support@exportyoutubeplaylist.com` — confirmed website contact                                                           |
| OAuth user support / developer contact | `stepan101dev@gmail.com` — user confirmed retaining this address for both Console fields                                  |
| Demonstration                          | [OAuth demonstration](https://youtu.be/lFRCukfn3cg) — uploaded as Unlisted; signed-out actual playback confirmed          |
| Project                                | `exportyoutubeplaylist-503312` — production client ownership confirmed in Console                                         |
| Production web client                  | `350041351799-o5ren2q6ffugha6v1qec9ua3bokm3ir6.apps.googleusercontent.com` — confirmed by production public configuration |

The project's Clients page contains the Web client named `export-youtube-playlist`, with the exact client ID returned by production public configuration. The client's association with this project is confirmed; this does not assert independent Search Console ownership verification. The project number has not been independently checked in the project overview; do not infer it solely from the client-ID prefix.

Historical Console brand record before the latest change: **Playlist Backup**, the PB logo, and the homepage, privacy-policy and terms links have been saved and read back. Verification and publication applied to that former brand only. The later **Playlist Expoter** / original E identity has now separately been saved, verified and published; the final Console UI confirms the verified brand is being shown to users. The authorized domain remains `exportyoutubeplaylist.com`; no independent Search Console ownership record has been captured. Audience is External / In production; the recorded count was 1/100, with unverified-sensitive-scope warnings still applicable. Data access shows `openid`, `userinfo.email` and `userinfo.profile` as non-sensitive, `youtube.readonly` as the only sensitive scope, and no restricted scopes. The user confirmed retaining `stepan101dev@gmail.com` for both OAuth support and developer contact; the public website mailbox remains `support@exportyoutubeplaylist.com`.

The user authorized `stepan101dev@gmail.com` as the recording/test Google account. This is not a shared reviewer credential or permission to distribute its password. The temporary quota for this verified test address is configured and earlier browser readback confirmed `2/10`, the existing Lite plan display, a free review allowance of 10, and the November 17, 2026, 3:59 PM Pacific expiry. A Google reviewer still needs a separate verified arrangement. See the server-secret maintenance instructions in [readiness.md](readiness.md#限时审核访问的服务端维护).

## Observed real-flow evidence under the former brand

The English Google consent screen showed **Playlist Backup** and one existing service permission, **View YouTube account**. After Continue, the browser returned to `/settings/collections?youtube=connected`; the page displayed **YouTube account connected** and **Stepan Connected**. This reused an existing read-only grant and added no scope. It is not a recording of first-time consent and does not prove a private read, export, deletion or revocation.

The user-provided Watch Later (`WL`) source is unsupported. After confirming `stepan101dev@gmail.com` in the native YouTube UI, the user-authorized private playlist `Playlist Backup OAuth Review` was created with one public video, `Me at the zoo` (`jNQXAC9IVRw`). The YouTube UI showed Private and 1 video. Test playlist: <https://www.youtube.com/playlist?list=PLA73ZS4HfS3c>. The website successfully created a Private playlist backup and saved its first read. Latest version 1 showed `Me at the zoo`, `jawed`, `0:19`, and the `jNQXAC9IVRw` video link. Export Excel downloaded a 2,971-byte XLSX file; its internal XML matched the video ID, title and channel. An immediate Check now request hit the expected 60-second rate limit; this is not a failed scan and no successful second read was observed.

The user then approved disconnecting the YouTube connection and permanently deleting the earlier subscriptions test backup and the new private-playlist backup. After Disconnect and delete backups, the page showed No YouTube accounts connected yet and `1/10`; only a public channel collection with 70 items remained. Read-only production D1 aggregates confirmed `credential_rows=0`, `collection_rows=1`, `private_collection_rows=0`, `delivery_rows=0`, and `revocation_rows=0`. A search for Playlist Backup at Google My Account connections returned no results, but the account email on that page was not independently confirmed. This is supporting context, not conclusive Google-side revocation evidence. External revocation detection, account deletion and production expiry cleanup remain separate, untested cases. The sample YouTube playlist was not deleted by the application.

Historical first attempt: Screenshot app failed with NSPOSIXError 162, and QuickTime / Cmd-Shift-5 did not show a recording panel. The user subsequently saved the main and supplemental recordings described below; the final 8:36 edit passed local QA and was uploaded as Unlisted, with signed-out actual playback confirmed. The sensitive-scope request is now submitted and under review, not yet approved. Review-quota implementation passed 43 related tests, TypeScript checking and the production build; it changed neither Stripe nor database migrations. Do not include passwords, authorization codes or tokens in this material.

## Current demonstration evidence and saved recordings

The main file `/Users/stepan/Desktop/录屏2026-10-18 18.41.41.mov` (31:02.983) and supplemental file `/Users/stepan/Desktop/录屏2026-10-18 19.30.52.mov` (609 seconds) are preserved; both are 2560×1440 H.264 with no audio track. The final video `/Users/stepan/Desktop/Playlist-Expoter-OAuth-Review/Playlist-Expoter-OAuth-Review.mp4` is **516.000 seconds (8:36)**, **2196×1256**, **30 fps**, and **12,138,663 bytes**. It supersedes the 6:07 main draft. Local QA passed: chapter boundaries and new transitions showed no unwanted windows, the complete client ID was readable, and a full ffmpeg decode passed. After the user confirmed YouTube terms and Unlisted upload, the video was uploaded at **https://youtu.be/lFRCukfn3cg**. Studio and a signed-out Incognito page confirmed Unlisted visibility, the title, Stepan channel and description. Studio SD/HD processing completed; a signed-out Incognito window played the actual video at 0:02 and paused at 0:09 / 8:36, showing the recorded website. The 869-character justification, URL and 966-character reviewer instructions were submitted at approximately 2026-10-19 02:58 UTC; Verification Center confirms data access is under review, not approved.

The main recording includes English ordinary Google sign-in and the separate new YouTube read-only request under **Playlist Expoter**. The first grant's Continue and successful callback were not continuously recorded in the foreground. A separate existing-grant review in the main draft shows Continue and the return to the connected application. Supplemental footage shows the actual English permission details and complete client ID `350041351799-o5ren2q6ffugha6v1qec9ua3bokm3ir6.apps.googleusercontent.com`. These are real screens, but the later flow reuses the same existing grant. Clearly label the edited sequence; do not present it as a continuous first-time grant.

The private playlist `PLA73ZS4HfS3c` was read into a new collection with one Me at the zoo item. An actual 2,972-byte Excel export was shown in Quick Look with its title, jawed channel, URL and duration. Check now succeeded at 18:51 Pacific, with Total runs 2. The supplemental footage also confirms the original YouTube playlist is private and contains one video; its historical fixture title remains Playlist Backup OAuth Review. The Chinese label 私享 means Private.

With explicit user approval, the operator manually liked **Beethoven - Für Elise** by Rousseau (`wfF0zHeU3Zs`) and subscribed to Rousseau in the native YouTube website. The application performed no YouTube write and still requests only `youtube.readonly`. In the supplemental recording, Liked videos completed run 3 at 19:33 Pacific and Liked music and YouTube subscriptions completed run 3 at 19:34; each Latest version contained one real result. The first two show that music video and the subscription result shows Rousseau. These nonempty reads supersede the initially empty test results. One music sample does not by itself demonstrate a comparison in which a non-Music item is filtered out.

After explicit user confirmation, **Disconnect and delete backups** completed at approximately **2026-10-19 02:38 UTC**. A reloaded application page showed **No YouTube accounts connected yet**, **1/10** collections and **70** saved items, retaining only the original public channel collection. The four test backups were removed; the original YouTube playlist, like and subscription were retained. The supplemental recording from approximately 425 to 609 seconds is obscured by Codex, so it does not provide usable disconnect or post-cleanup footage. These cleanup findings come from live UI observation, not that footage. No fresh production D1 aggregate or independent Google-side revocation check was performed in this run; earlier counts must remain labeled as historical.

## Optional reviewer cover note

Use only once all listed evidence exists:

> Hello Google OAuth Verification Team,
>
> We are submitting Playlist Expoter for review of its YouTube read-only integration. The integration allows users to read and export metadata from their own selected private collections. Ordinary website sign-in and YouTube authorization are separate flows.
>
> Project: exportyoutubeplaylist-503312  
> Production OAuth client: 350041351799-o5ren2q6ffugha6v1qec9ua3bokm3ir6.apps.googleusercontent.com  
> Homepage: https://exportyoutubeplaylist.com/  
> Privacy policy: https://exportyoutubeplaylist.com/privacy-policy  
> Demonstration: https://youtu.be/lFRCukfn3cg
>
> Review access instructions: [REVIEWER_ACCESS_METHOD_AND_FEATURE_ACCESS]. The edited video shows English sign-in and YouTube consent screens, a separately identified existing-grant review, and the real features that use the requested scope. The initial grant's Continue and callback were not continuously captured; the existing-grant review is not presented as a new first-time grant. Please contact support@exportyoutubeplaylist.com with any questions about the application or its data practices.

This is a draft note only; no email has been sent.

## Official references

- [Google sensitive scope verification](https://developers.google.com/identity/protocols/oauth2/production-readiness/sensitive-scope-verification)
- [YouTube server-side OAuth](https://developers.google.com/youtube/data/guides/auth/server-side-web-apps)
- [Google API Services User Data Policy](https://developers.google.com/terms/api-services-user-data-policy)
- [Google in-app verification testing](https://support.google.com/cloud/answer/13807382?hl=en)
