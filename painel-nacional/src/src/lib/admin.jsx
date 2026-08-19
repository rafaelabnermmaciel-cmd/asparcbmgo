import { createContext, useContext, useEffect, useState } from 'react';

const ADMIN_KEY = 'painel-nacional-admin';
const AdminContext = createContext({ admin: false, setAdmin: () => {} });

export function AdminProvider({ children }) {
  const [admin, setAdminState] = useState(() => localStorage.getItem(ADMIN_KEY) === 'true');

  useEffect(() => {
    localStorage.setItem(ADMIN_KEY, admin ? 'true' : 'false');
  }, [admin]);

  const setAdmin = (value) => setAdminState(value);

  return <AdminContext.Provider value={{ admin, setAdmin }}>{children}</AdminContext.Provider>;
}

export function useAdmin() {
  return useContext(AdminContext);
}
