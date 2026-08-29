import { Outlet } from "react-router-dom";
import { BottomNav } from "./BottomNav.js";

// Layout route for the tabbed part of the app. Routes nested under it get the bottom
// bar; routes outside it (onboarding, auth, the report flow) do not — so "has a tab bar"
// is a structural fact about the route tree rather than a pathname check every new route
// has to remember to update.
export function AppShell() {
  return (
    <>
      <Outlet />
      <BottomNav />
    </>
  );
}
