import { create } from "zustand";
import { devtools, persist } from "zustand/middleware";
import { immer } from "zustand/middleware/immer";
import type { AppStore } from "./types";
import { createUiSlice } from "./ui.slice";
import { createToastSlice } from "./toast.slice";
import { createMapSlice } from "../../features/map/model/map.slice";
import { createSessionSlice } from "../../features/auth/model/session.slice.js";
import { createReportDraftSlice } from "../../features/report/model/report-draft.slice.js";

export const useAppStore = create<AppStore>()(
  devtools(
    persist(
      immer((...a) => ({
        ...createUiSlice(...a),
        ...createToastSlice(...a),
        ...createMapSlice(...a),
        ...createSessionSlice(...a),
        ...createReportDraftSlice(...a),
      })),
      {
        name: "aonde-tem",
        // Session token/user and the in-progress report draft are persisted too — a
        // reload on a low-end/patchy-connectivity device must not silently log the
        // user out or discard a half-typed report. See docs/audits/AUDIT-web-2026-07-03.md.
        partialize: (s) => ({
          theme: s.theme,
          mapRadius: s.mapRadius,
          accessToken: s.accessToken,
          sessionUser: s.sessionUser,
          reportDraft: s.reportDraft,
        }),
      },
    ),
    { name: "AondeTemStore" },
  ),
);
