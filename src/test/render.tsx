import { render } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactElement } from "react";
import { MemoryRouter, Route, Routes, useLocation } from "react-router-dom";
import { AuthProvider } from "../lib/auth";

/** Shows the current path so tests can assert on navigation. */
function LocationProbe() {
  const location = useLocation();
  return <div data-testid="location">{location.pathname + location.search}</div>;
}

/**
 * Renders a page inside the auth provider and a router at `route`. Mock `fetchCurrentUser`
 * in the test to choose whether someone is logged in.
 */
export function renderPage(ui: ReactElement, { route = "/", path = "*" } = {}) {
  const user = userEvent.setup();
  const result = render(
    <AuthProvider>
      <MemoryRouter initialEntries={[route]}>
        <Routes>
          <Route path={path} element={ui} />
          <Route path="*" element={null} />
        </Routes>
        <LocationProbe />
      </MemoryRouter>
    </AuthProvider>,
  );
  return { user, ...result };
}
