import { GoogleLogin } from "@react-oauth/google";
import PropType from "prop-types";
import React from "react";
import { useDispatch } from "react-redux";
import { signInWithGoogle } from "@/redux/actions/authActions";
import { setAuthStatus } from "@/redux/actions/miscActions";

const SocialLogin = ({ isLoading }) => {
  const dispatch = useDispatch();

  const handleGoogleSuccess = (credentialResponse) => {
    try {
      const base64Url = credentialResponse.credential.split(".")[1];
      const base64 = base64Url.replace(/-/g, "+").replace(/_/g, "/");
      const payload = JSON.parse(atob(base64));
      dispatch(
        signInWithGoogle({
          email: payload.email,
          fullname: payload.name,
          avatar: payload.picture,
          googleId: payload.sub,
        }),
      );
    } catch {
      dispatch(
        setAuthStatus({
          success: false,
          type: "auth",
          isError: true,
          message: "Failed to process Google sign in. Please try again.",
        }),
      );
    }
  };

  const handleGoogleError = () => {
    dispatch(
      setAuthStatus({
        success: false,
        type: "auth",
        isError: true,
        message: "Google sign in was cancelled or failed.",
      }),
    );
  };

  return (
    <div className="auth-provider">
      <div
        className="auth-provider-button provider-google"
        style={{ display: "flex", justifyContent: "center" }}
      >
        <GoogleLogin
          onSuccess={handleGoogleSuccess}
          onError={handleGoogleError}
          text="continue_with"
          shape="rectangular"
          size="large"
          width="280"
        />
      </div>
    </div>
  );
};

SocialLogin.propTypes = {
  isLoading: PropType.bool.isRequired,
};

export default SocialLogin;
