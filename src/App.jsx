/* eslint-disable react/forbid-prop-types */
import { Preloader } from "@/components/common";
import PropType from "prop-types";
import React, { StrictMode } from "react";
import { Provider } from "react-redux";
import { PersistGate } from "redux-persist/integration/react";
import { GoogleOAuthProvider } from "@react-oauth/google";
import AppRouter from "@/routers/AppRouter";

const GOOGLE_CLIENT_ID =
  "768078258871-d7fjove2ci9hc8g6fk3s5lh1scqa6u8a.apps.googleusercontent.com";

const App = ({ store, persistor }) => (
  <StrictMode>
    <GoogleOAuthProvider clientId={GOOGLE_CLIENT_ID}>
      <Provider store={store}>
        <PersistGate loading={<Preloader />} persistor={persistor}>
          <AppRouter />
        </PersistGate>
      </Provider>
    </GoogleOAuthProvider>
  </StrictMode>
);

App.propTypes = {
  store: PropType.any.isRequired,
  persistor: PropType.any.isRequired,
};

export default App;
