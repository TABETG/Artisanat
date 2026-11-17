import { createContext, ReactNode, useContext, useEffect, useState } from 'react';
import { CustomerSession, getCustomerSession, onCustomerChange } from '../lib/customer';

const CustomerContext = createContext<{ customer: CustomerSession | null; ready: boolean }>({ customer: null, ready: false });

export function CustomerProvider({ children }: { children: ReactNode }) {
  const [customer, setCustomer] = useState<CustomerSession | null>(null);
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const refresh = () => getCustomerSession().then((s) => { setCustomer(s); setReady(true); });
    refresh();
    return onCustomerChange(refresh);
  }, []);
  return <CustomerContext.Provider value={{ customer, ready }}>{children}</CustomerContext.Provider>;
}

export const useCustomer = () => useContext(CustomerContext);
