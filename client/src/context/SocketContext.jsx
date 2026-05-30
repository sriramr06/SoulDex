import React, { createContext, useContext } from 'react';

// Minimal SocketContext so `useSocket()` resolves. If an app-level
// provider exists elsewhere it can override this context; otherwise
// components will receive `null` and handle absence gracefully.
export const SocketContext = createContext(null);

export const SocketProvider = ({ children, socket = null }) => {
  return (
    <SocketContext.Provider value={socket}>{children}</SocketContext.Provider>
  );
};

export const useSocket = () => useContext(SocketContext);

export default SocketContext;
