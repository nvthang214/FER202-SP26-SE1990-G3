import { CHECKOUT_STEP_1 } from "@/constants/routes";
import { Form, Formik } from "formik";
import { displayActionMessage } from "@/helpers/utils";
import { useDocumentTitle, useScrollTop } from "@/hooks";
import PropType from "prop-types";
import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { Redirect } from "react-router-dom";
import { useHistory } from "react-router-dom";
import { clearBasket } from "@/redux/actions/basketActions";
import { resetCheckout } from "@/redux/actions/checkoutActions";
import { setProfile } from "@/redux/actions/profileActions";
import { ACCOUNT } from "@/constants/routes";
import firebase from "@/services/firebase";
import * as Yup from "yup";
import { StepTracker } from "../components";
import withCheckout from "../hoc/withCheckout";
import CreditPayment from "./CreditPayment";
import PayPalPayment from "./PayPalPayment";
import Total from "./Total";

const FormSchema = Yup.object().shape({
  name: Yup.string().when("type", {
    is: "credit",
    then: (schema) =>
      schema
        .min(4, "Name should be at least 4 characters.")
        .required("Name is required"),
    otherwise: (schema) => schema.notRequired(),
  }),
  cardnumber: Yup.string().when("type", {
    is: "credit",
    then: (schema) =>
      schema
        .min(13, "Card number should be 13-19 digits long")
        .max(19, "Card number should only be 13-19 digits long")
        .required("Card number is required."),
    otherwise: (schema) => schema.notRequired(),
  }),
  expiry: Yup.string().when("type", {
    is: "credit",
    then: (schema) => schema.required("Credit card expiry is required."),
    otherwise: (schema) => schema.notRequired(),
  }),
  ccv: Yup.string().when("type", {
    is: "credit",
    then: (schema) =>
      schema
        .min(3, "CCV length should be 3-4 digit")
        .max(4, "CCV length should only be 3-4 digit")
        .required("CCV is required."),
    otherwise: (schema) => schema.notRequired(),
  }),
  type: Yup.string().required("Please select paymend mode"),
});

const Payment = ({ basket, shipping, payment, profile, subtotal }) => {
  useDocumentTitle("Check Out Final Step | Salinaka");
  useScrollTop();
  const dispatch = useDispatch();
  const history = useHistory();
  const auth = useSelector((state) => state.auth);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const initFormikValues = {
    name: payment.name || "",
    cardnumber: payment.cardnumber || "",
    expiry: payment.expiry || "",
    ccv: payment.ccv || "",
    type: payment.type || "paypal",
  };

  const onConfirm = async (form) => {
    if (!auth?.id) {
      return;
    }

    try {
      setIsSubmitting(true);

      const shippingFee = shipping.isInternational ? 50 : 0;
      const productSubtotal = basket.reduce(
        (sum, product) =>
          sum + Number(product.price || 0) * Number(product.quantity || 1),
        0,
      );

      const order = {
        id: firebase.generateKey(),
        createdAt: new Date().toISOString(),
        status: "PLACED",
        paymentType: form.type === "credit" ? "CREDIT_CARD" : "PAYPAL",
        subtotal: productSubtotal,
        shippingFee,
        total: productSubtotal + shippingFee,
        customer: {
          id: auth.id,
          name: shipping.fullname || profile.fullname || "User",
          email: shipping.email || profile.email || "",
          mobile: shipping.mobile || profile.mobile || {},
          address: shipping.address || profile.address || "",
        },
        shipping: {
          fullname: shipping.fullname,
          email: shipping.email,
          mobile: shipping.mobile,
          address: shipping.address,
          isInternational: !!shipping.isInternational,
        },
        items: basket.map((product) => ({
          id: product.id,
          name: product.name,
          image: product.image,
          brand: product.brand,
          price: Number(product.price || 0),
          quantity: Number(product.quantity || 1),
          selectedColor: product.selectedColor || "",
          selectedSize: product.selectedSize || "",
        })),
      };

      const snapshot = await firebase.getUser(auth.id);
      const user = snapshot.data() || {};
      const currentOrders = Array.isArray(user.orders) ? user.orders : [];
      const nextOrders = [order, ...currentOrders];

      await firebase.updateUser(auth.id, {
        orders: nextOrders,
        basket: [],
      });

      dispatch(clearBasket());
      dispatch(resetCheckout());
      dispatch(
        setProfile({
          ...profile,
          ...user,
          orders: nextOrders,
          basket: [],
        }),
      );

      displayActionMessage("Order placed successfully!", "success");
      history.push(ACCOUNT);
    } catch (e) {
      displayActionMessage(
        `Failed to place order. ${e.message || ""}`,
        "error",
      );
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!shipping || !shipping.isDone) {
    return <Redirect to={CHECKOUT_STEP_1} />;
  }
  return (
    <div className="checkout">
      <StepTracker current={3} />
      <Formik
        initialValues={initFormikValues}
        validateOnChange
        validationSchema={FormSchema}
        onSubmit={onConfirm}
      >
        {() => (
          <Form className="checkout-step-3">
            <CreditPayment />
            <PayPalPayment />
            <Total
              isSubmitting={isSubmitting}
              isInternational={shipping.isInternational}
              subtotal={subtotal}
            />
          </Form>
        )}
      </Formik>
    </div>
  );
};

Payment.propTypes = {
  basket: PropType.arrayOf(PropType.object).isRequired,
  shipping: PropType.shape({
    isDone: PropType.bool,
    isInternational: PropType.bool,
  }).isRequired,
  payment: PropType.shape({
    name: PropType.string,
    cardnumber: PropType.string,
    expiry: PropType.string,
    ccv: PropType.string,
    type: PropType.string,
  }).isRequired,
  profile: PropType.shape({
    fullname: PropType.string,
    email: PropType.string,
    mobile: PropType.object,
    address: PropType.string,
  }).isRequired,
  subtotal: PropType.number.isRequired,
};

export default withCheckout(Payment);
