import { CheckOutlined, LoadingOutlined } from "@ant-design/icons";
import { useDocumentTitle, useScrollTop } from "@/hooks";
import React, { useEffect, useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { confirmResetPassword, resetPassword } from "@/redux/actions/authActions";
import { setAuthenticating, setAuthStatus } from "@/redux/actions/miscActions";

const ForgotPassword = () => {
  const { authStatus, isAuthenticating } = useSelector((state) => ({
    isAuthenticating: state.app.isAuthenticating,
    authStatus: state.app.authStatus,
  }));

  const dispatch = useDispatch();
  const [step, setStep] = useState("request");
  const [email, setEmail] = useState("");
  const [emailError, setEmailError] = useState("");
  const [code, setCode] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [formError, setFormError] = useState("");

  useScrollTop();
  useDocumentTitle("Forgot Password | Salinaka");

  useEffect(() => {
    return () => {
      dispatch(setAuthStatus(null));
      dispatch(setAuthenticating(false));
    };
  }, [dispatch]);

  useEffect(() => {
    if (authStatus?.success && authStatus?.type === "reset-request") {
      setStep("confirm");
      setFormError("");
    }
  }, [authStatus]);

  const validateEmail = (value) => {
    const normalized = value.trim();

    if (!normalized) {
      return "Email is required.";
    }

    if (!/^\S+@\S+\.\S+$/.test(normalized)) {
      return "Email is not valid.";
    }

    return "";
  };

  const onEmailChange = (e) => {
    const value = e.target.value;
    setEmail(value);
    setEmailError(validateEmail(value));
  };

  const onCodeChange = (e) => {
    setCode(e.target.value.replace(/\D/g, "").slice(0, 6));
  };

  const validateConfirmForm = () => {
    if (!code.trim() || code.trim().length !== 6) {
      return "Verification code must be 6 digits.";
    }

    if (!newPassword.trim()) {
      return "New password is required.";
    }

    if (
      newPassword.trim().length < 8
      || !/[A-Z\W]/g.test(newPassword.trim())
    ) {
      return "Password must be at least 8 characters and include uppercase/special character.";
    }

    if (confirmPassword.trim() !== newPassword.trim()) {
      return "Password confirmation does not match.";
    }

    return "";
  };

  const onSubmitEmail = () => {
    const error = validateEmail(email);
    setEmailError(error);

    if (!error) {
      dispatch(resetPassword(email.trim().toLowerCase()));
    }
  };

  const onConfirmReset = () => {
    const error = validateConfirmForm();
    setFormError(error);

    if (error) {
      return;
    }

    dispatch(
      confirmResetPassword({
        email: email.trim().toLowerCase(),
        code: code.trim(),
        newPassword: newPassword.trim(),
      }),
    );
  };

  const onResendCode = () => {
    dispatch(resetPassword(email.trim().toLowerCase()));
  };

  const isCompleted = authStatus?.success && authStatus?.type === "reset-complete";
  const isRequestDisabled = isAuthenticating || isCompleted;
  const isConfirmDisabled = isAuthenticating || isCompleted;

  return (
    <div className="forgot_password">
      {authStatus?.message && (
        <h5 className={`text-center ${authStatus?.success ? "toast-success" : "toast-error"}`}>
          {authStatus.message}
        </h5>
      )}

      <h2>Forgot Your Password?</h2>
      <p>
        {step === "request"
          ? "Enter your email and we will send a verification code."
          : "Enter the 6-digit verification code from email and set your new password."}
      </p>

      <br />
      <input
        value={email}
        required
        className="input-form"
        maxLength={60}
        onChange={onEmailChange}
        placeholder="Enter your email"
        readOnly={step === "confirm" || isRequestDisabled}
        type="email"
        style={{ width: "100%" }}
      />
      {!!emailError && <h6 className="text-center toast-error">{emailError}</h6>}

      {step === "request" ? (
        <>
          <br />
          <br />
          <button
            className="button w-100-mobile"
            disabled={isRequestDisabled || !!emailError || !email.trim()}
            onClick={onSubmitEmail}
            type="button"
          >
            {isAuthenticating ? <LoadingOutlined /> : <CheckOutlined />}
            &nbsp;
            {isAuthenticating ? "Sending Verification Code" : "Send Verification Code"}
          </button>
        </>
      ) : (
        <>
          <br />
          <input
            value={code}
            required
            className="input-form"
            maxLength={6}
            onChange={onCodeChange}
            placeholder="Enter 6-digit code"
            readOnly={isConfirmDisabled}
            type="text"
            style={{ width: "100%" }}
          />
          <br />
          <input
            value={newPassword}
            required
            className="input-form"
            maxLength={40}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Enter new password"
            readOnly={isConfirmDisabled}
            type="password"
            style={{ width: "100%" }}
          />
          <br />
          <input
            value={confirmPassword}
            required
            className="input-form"
            maxLength={40}
            onChange={(e) => setConfirmPassword(e.target.value)}
            placeholder="Confirm new password"
            readOnly={isConfirmDisabled}
            type="password"
            style={{ width: "100%" }}
          />
          {!!formError && <h6 className="text-center toast-error">{formError}</h6>}
          <br />
          <button
            className="button w-100-mobile"
            disabled={isConfirmDisabled}
            onClick={onConfirmReset}
            type="button"
          >
            {isAuthenticating ? <LoadingOutlined /> : <CheckOutlined />}
            &nbsp;
            {isAuthenticating ? "Updating Password" : "Update Password"}
          </button>
          <br />
          <br />
          <button
            className="button button-small button-border"
            disabled={isAuthenticating || isCompleted}
            onClick={onResendCode}
            type="button"
          >
            Resend Code
          </button>
        </>
      )}
    </div>
  );
};

export default ForgotPassword;
