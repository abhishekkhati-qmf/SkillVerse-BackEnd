import axios from "axios";
import { Course } from "../models/course.model.js";
import { User } from "../models/user.model.js";
import { CoursePurchase } from "../models/coursePurchase.model.js";
import { Lecture } from "../models/lecture.model.js";

const APPID = process.env.APP_ID;
const SECRET_KEY = process.env.CASHFREE_SECRET_KEY;
const CASHFREE_BASE_URL = "https://sandbox.cashfree.com/pg/orders";

export const createCheckoutSession = async (req, res) => {
  try {
    const userId = req.id;
    const { courseId } = req.body;

    const course = await Course.findById(courseId);
    if (!course) return res.status(404).json({ message: "Course not found!" });

    const user = await User.findById(userId);
    if (!user) return res.status(404).json({ message: "User not found!" });

    const newPurchase = new CoursePurchase({
      courseId,
      userId,
      creator: course.creator,
      amount: course.coursePrice,
      status: "pending",
    });

    // Create order payload for Cashfree
    const orderId = `order_${Date.now()}`; // Unique order ID

    const orderData = {
      order_id: orderId,
      order_amount: course.coursePrice,
      order_currency: "INR",
      customer_details: {
        customer_id: userId,
        customer_email: user.email,
        customer_phone: "9999999999",
      },
      order_meta: {
        return_url: `http://localhost:5173/course-progress/${courseId}`, // redirect after payment
        notify_url:
          "https://97a4-49-43-6-76.ngrok-free.app/api/v1/purchase/cashfree-webhook",
      },
    };

    // Make request to Cashfree to create order
    const response = await axios.post(CASHFREE_BASE_URL, orderData, {
      headers: {
        "x-api-version": "2022-09-01",
        "Content-Type": "application/json",
        "x-client-id": APPID,
        "x-client-secret": SECRET_KEY,
      },
    });

    const sessionId = response.data.payment_session_id;

    if (!sessionId) {
      return res.status(400).json({
        success: false,
        message: "Error generating payment session",
      });
    }

    newPurchase.paymentId = orderId;
    await newPurchase.save();

    return res.status(200).json({
      success: true,
      sessionId: sessionId,
    });
  } catch (error) {
    // console.error("Cashfree error:", error.response?.data || error.message);
    // return res.status(500).json({
    //   success: false,
    //   message: "Something went wrong while creating Cashfree session",
    // });
    console.error("Error in createCheckoutSession:", error); // This should print the actual error details
    res.status(500).json({
      success: false,
      message: "Internal server error",
      error: error.message, // useful for debugging
    });
  }
};

export const cashfreeWebhook = async (req, res) => {
  try {
    const eventData = req.body;

    // Destructure nested data safely from webhook payload
    const {
      order: { order_id, order_amount } = {},
      payment: { payment_status, cf_payment_id } = {},
      customer_details,
    } = eventData.data || {};

    if (!order_id || !cf_payment_id || !payment_status) {
      return res.status(400).json({ message: "Invalid webhook payload" });
    }

    // Find purchase by paymentId, because your document uses 'paymentId' field
    const purchase = await CoursePurchase.findOne({
      paymentId: order_id,
    }).populate("courseId").populate("userId");
 

    if (!purchase) {
      return res.status(404).json({ message: "Purchase not found" });
    }

    if (payment_status === "SUCCESS") {
      purchase.status = "completed";
      purchase.amount = order_amount;

      // Optional: make all lectures visible if applicable
      if (
        purchase.courseId &&
        purchase.courseId.lectures &&
        purchase.courseId.lectures.length > 0
      ) {
        await Lecture.updateMany(
          { _id: { $in: purchase.courseId.lectures } },
          { $set: { isPreviewFree: true } }
        );
      }

      await purchase.save();

      // Update user's enrolledCourses
      await User.findByIdAndUpdate(
         purchase.userId._id || purchase.userId,
        { $addToSet: { enrolledCourse: purchase.courseId._id } },
        { new: true }
      );

      // Update course's enrolledStudents
      await Course.findByIdAndUpdate(
        purchase.courseId._id,
        { $addToSet: { enrolledStudents:purchase.userId._id || purchase.userId} },
        { new: true }
      );
    } else if (payment_status === "FAILED" || payment_status === "EXPIRED") {
      purchase.status = "failed";
      await purchase.save();
    }

    res.status(200).json({ success: true, message: "Webhook received" });
  } catch (error) {
    console.error("Cashfree Webhook Error:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const getCourseDetailWithPurchaseStatus = async (req, res) => {
  try {
    const { courseId } = req.params;
    const userId = req.id;

    const course = await Course.findById(courseId)
      .populate({ path: "creator" })
      .populate({ path: "lectures" });

    const purchased = await CoursePurchase.findOne({ userId, courseId });

    if (!course) {
      return res.status(404).json({
        message: "course not found!",
      });
    }

    return res.status(200).json({
      course,
      purchased: !!purchased, //true if purchased , false otherwise
    });
  } catch (error) {
    console.error("Error in getCourseDetailWithPurchaseStatus:", error);
    res.status(500).json({ message: "Internal Server Error" });
  }
};

export const getAllPurchasedCourse = async (req, res) => {
  try {
    const userId = req.id;
    const purchasedCourse = await CoursePurchase.find({
      status: "completed",
      creator: userId,
    }).populate("courseId");
    if (!purchasedCourse) {
      return res.status(404).json({
        purchasedCourse: [],
      });
    }
    return res.status(200).json({
      purchasedCourse,
    });
  } catch (error) {
    console.error("Error in getAllPurchasedCourse:", error);
    return res.status(500).json({
      message: "Internal Server Error",
      error: error.message,
    });
  }
};
