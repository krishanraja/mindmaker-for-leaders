/**
 * TEMPORARY SHIM. Delete this file with the rest of the Kit in phase 2.
 *
 * The primitives moved to components/capture/capturePrimitives.tsx because the
 * only surviving consumer is the public /download page, which is still live
 * (Vercel sets VITE_FF_CAPTURE=true in production) and must not break when
 * components/kit/ is deleted.
 *
 * Four kit files still import the old names. Rewriting them would be churn in
 * files that are about to be removed, so they keep importing from here and this
 * one file dies with them.
 */
export {
  CAPTURE_SCOPE_VARS as KIT_SCOPE_VARS,
  CaptureCard as KitCard,
  CaptureEyebrow as KitEyebrow,
  CaptureHeadline as KitHeadline,
  CaptureSub as KitSub,
  CapturePrimaryButton as KitPrimaryButton,
  CaptureGhostButton as KitGhostButton,
  CaptureLinkish as KitLinkish,
  CaptureBack as KitBack,
} from '@/components/capture/capturePrimitives';
