import { Outlet } from 'react-router-dom';

import { Navbar } from './Navbar.js';

export function Layout() {
  return (
    <div className="layout">
      <Navbar />
      <main className="layout__main">
        <Outlet />
      </main>
      <footer className="layout__footer">© 2026 Vehicle Rental System</footer>
    </div>
  );
}
