"use client";

import { useRef } from "react";
import { Provider } from "react-redux";
import { makeStore } from "../store/store";
import { setCredentials } from "../store/features/auth/authSlice";

export default function StoreProvider({ user, children }) {
  const storeRef = useRef();
  if (!storeRef.current) {
    // Create the store instance the first time this renders
    storeRef.current = makeStore();

    // Set initial state from server session if available
    if (user) {
      storeRef.current.dispatch(setCredentials({ user }));
    }
  }

  return <Provider store={storeRef.current}>{children}</Provider>;
}
